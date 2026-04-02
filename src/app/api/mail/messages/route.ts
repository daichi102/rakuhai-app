import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type MailMessage = {
  id: string;
  subject: string;
  senderName: string;
  senderAddress: string;
  receivedAt: string;
  body: string;
  preview: string;
  hasAttachments: boolean;
};

const getEnv = (key: string) => (process.env[key] ?? "").trim();

const getKeywordFilters = () => {
  const raw = getEnv("IMAP_FILTER_KEYWORDS");
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
};

const toPreview = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 200);

const DAYS_TO_FETCH = 5;
const FETCH_UID_CHUNK_SIZE = 25;

const getSinceDate = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (DAYS_TO_FETCH - 1));
  return date;
};

const shouldIncludeMessage = (message: MailMessage, keywords: string[]) => {
  if (keywords.length === 0) {
    return true;
  }

  const target = `${message.subject} ${message.body} ${message.preview}`.toLowerCase();
  return keywords.some((keyword) => target.includes(keyword));
};

const toIsoString = (value: string | Date | undefined) => {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
};

export async function GET() {
  const host = getEnv("IMAP_HOST");
  const portRaw = getEnv("IMAP_PORT");
  const user = getEnv("IMAP_USER");
  const password = getEnv("IMAP_PASSWORD");
  const secureRaw = getEnv("IMAP_SECURE").toLowerCase();

  if (!host || !portRaw || !user || !password) {
    return NextResponse.json(
      {
        error: "IMAP環境変数が不足しています。IMAP_HOST / IMAP_PORT / IMAP_USER / IMAP_PASSWORD を設定してください。"
      },
      { status: 500 }
    );
  }

  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0) {
    return NextResponse.json({ error: "IMAP_PORT の値が不正です。" }, { status: 500 });
  }

  const secure = secureRaw ? secureRaw === "true" : true;
  const keywords = getKeywordFilters();

  const client = new ImapFlow({
    host,
    port,
    secure,
    disableAutoIdle: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user,
      pass: password
    }
  });

  try {
    await client.connect();
    const mailbox = await client.mailboxOpen("INBOX");

    if (!mailbox.exists) {
      return NextResponse.json({ messages: [] });
    }

    const sinceDate = getSinceDate();
    const searchResult = await client.search({ since: sinceDate }, { uid: true });
    const matchedUids = Array.isArray(searchResult) ? searchResult : [];

    if (matchedUids.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    const uids = [...matchedUids].sort((a, b) => b - a);

    const messages: MailMessage[] = [];

    for (let index = 0; index < uids.length; index += FETCH_UID_CHUNK_SIZE) {
      const uidChunk = uids.slice(index, index + FETCH_UID_CHUNK_SIZE);

      for await (const item of client.fetch(uidChunk, {
        uid: true,
        envelope: true,
        internalDate: true,
        source: true
      })) {
        const source = item.source ? Buffer.from(item.source) : Buffer.alloc(0);
        const parsed = source.length > 0 ? await simpleParser(source) : null;
        const from = item.envelope?.from?.[0];
        const body = (parsed?.text || parsed?.html?.toString() || "").replace(/\s+/g, " ").trim();

        const message: MailMessage = {
          id: String(item.uid ?? `${item.seq}`),
          subject: item.envelope?.subject ?? "(件名なし)",
          senderName: from?.name ?? "",
          senderAddress: from?.address ?? "",
          receivedAt: toIsoString(item.internalDate),
          body,
          preview: toPreview(body),
          hasAttachments: Boolean(parsed?.attachments && parsed.attachments.length > 0)
        };

        if (shouldIncludeMessage(message, keywords)) {
          messages.push(message);
        }
      }
    }

    messages.sort((a, b) => {
      const aTime = new Date(a.receivedAt).getTime();
      const bTime = new Date(b.receivedAt).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({ messages });
  } catch (error) {
    const details =
      error instanceof Error
        ? {
            message: error.message,
            name: error.name
          }
        : {
            message: "unknown error"
          };

    return NextResponse.json(
      {
        error: "IMAPメールの取得に失敗しました。接続情報またはメールサーバー設定を確認してください。",
        details
      },
      { status: 500 }
    );
  } finally {
    try {
      await client.logout();
    } catch {}
  }
}
