import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export const runtime = "nodejs";

type MailMessage = {
  id: string;
  subject: string;
  senderName: string;
  senderAddress: string;
  receivedAt: string;
  preview: string;
  hasAttachments: boolean;
};

const getEnv = (key: string) => (process.env[key] ?? "").trim();

const getKeywordFilters = () => {
  const raw = getEnv("IMAP_FILTER_KEYWORDS");
  if (!raw) {
    return ["交換", "差し替え", "交換希望", "回収"];
  }

  return raw
    .split(",")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
};

const toPreview = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 200);

const shouldIncludeMessage = (message: MailMessage, keywords: string[]) => {
  if (keywords.length === 0) {
    return true;
  }

  const target = `${message.subject} ${message.preview}`.toLowerCase();
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
  const fetchLimitRaw = getEnv("IMAP_FETCH_LIMIT");

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
  const parsedLimit = Number(fetchLimitRaw || "30");
  const fetchLimit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 30;
  const keywords = getKeywordFilters();

  const client = new ImapFlow({
    host,
    port,
    secure,
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

    const start = Math.max(1, mailbox.exists - fetchLimit + 1);
    const range = `${start}:${mailbox.exists}`;

    const messages: MailMessage[] = [];

    for await (const item of client.fetch(range, {
      uid: true,
      envelope: true,
      internalDate: true,
      bodyStructure: true,
      source: true
    })) {
      const source = item.source ? Buffer.from(item.source) : Buffer.alloc(0);
      const parsed = source.length > 0 ? await simpleParser(source) : null;
      const from = item.envelope?.from?.[0];

      const message: MailMessage = {
        id: String(item.uid ?? `${item.seq}`),
        subject: item.envelope?.subject ?? "(件名なし)",
        senderName: from?.name ?? "",
        senderAddress: from?.address ?? "",
        receivedAt: toIsoString(item.internalDate),
        preview: toPreview(parsed?.text || parsed?.html?.toString() || ""),
        hasAttachments: Boolean(parsed?.attachments && parsed.attachments.length > 0)
      };

      if (shouldIncludeMessage(message, keywords)) {
        messages.push(message);
      }
    }

    messages.sort((a, b) => {
      const aTime = new Date(a.receivedAt).getTime();
      const bTime = new Date(b.receivedAt).getTime();
      return bTime - aTime;
    });

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json(
      { error: "IMAPメールの取得に失敗しました。接続情報またはメールサーバー設定を確認してください。" },
      { status: 500 }
    );
  } finally {
    try {
      await client.logout();
    } catch {}
  }
}
