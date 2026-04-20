import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AizaInfo = {
  orderName?: string;
  orderPhone?: string;
  orderAddress?: string;
  customerKana?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  productName?: string;
  productCode?: string;
  productColor?: string;
  productQty?: number;
  inquiryNo?: string;
  visitDate?: string;
  hasAttendant?: string;
  existingRemoval?: string;
  warranty?: string;
  notes?: string;
  staff?: string;
  caution?: string;
};

type MailMessage = {
  id: string;
  subject: string;
  senderName: string;
  senderAddress: string;
  receivedAt: string;
  body: string;
  preview: string;
  hasAttachments: boolean;
  attachments: {
    filename: string;
    size: number;
    contentType: string;
    isExcel: boolean;
    contentBase64?: string;
  }[];
  hasExcelAttachment: boolean;
  aizaInfo?: AizaInfo;
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

const isExcelAttachment = (filename: string, contentType: string) => {
  const lowerFilename = filename.toLowerCase();
  const lowerContentType = contentType.toLowerCase();

  return (
    lowerFilename.endsWith(".xlsx") ||
    lowerFilename.endsWith(".xls") ||
    lowerFilename.endsWith(".xlsm") ||
    lowerContentType.includes("spreadsheet") ||
    lowerContentType.includes("excel")
  );
};

const getCellValue = (sheet: XLSX.Sheet, cellAddr: string): string => {
  const cell = sheet[cellAddr];
  if (!cell) return "";
  return String(cell.v ?? cell.w ?? "").trim();
};

const findAizaSheet = (workbook: XLSX.WorkBook): XLSX.Sheet | undefined => {
  const sheetNames = workbook.SheetNames.map((name) => name.toLowerCase());
  const targetNames = ["アイザ", "アイザシート", "aiza"];

  for (const target of targetNames) {
    const idx = sheetNames.findIndex((name) => name.includes(target.toLowerCase()));
    if (idx !== -1) {
      return workbook.Sheets[workbook.SheetNames[idx]];
    }
  }

  return undefined;
};

const extractAizaInfo = (contentBase64: string): AizaInfo | undefined => {
  try {
    const bytes = Buffer.from(contentBase64, "base64");
    const workbook = XLSX.read(bytes, { type: "buffer" });
    const sheet = findAizaSheet(workbook);

    if (!sheet) {
      console.warn("[Aiza Extract] No sheet named 'アイザ' found. Available sheets:", workbook.SheetNames);
      return undefined;
    }

    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });

    const extractValue = (row: number, col: number): string | undefined => {
      const value = String(data[row]?.[col] ?? "").trim();
      return value || undefined;
    };

    const result: AizaInfo = {
      orderName: extractValue(8, 8),
      orderPhone: extractValue(9, 8),
      orderAddress: extractValue(10, 8),
      customerKana: extractValue(13, 8),
      customerName: extractValue(14, 8),
      customerAddress: extractValue(15, 8),
      customerPhone: extractValue(16, 8),
      productName: extractValue(19, 2),
      productCode: extractValue(19, 8),
      productColor: extractValue(19, 18),
      productQty: data[19]?.[21] ? Number(data[19]?.[21]) : undefined,
      inquiryNo: extractValue(25, 9),
      visitDate: extractValue(26, 9),
      hasAttendant: extractValue(28, 9),
      existingRemoval: extractValue(30, 9),
      warranty: extractValue(32, 9),
      notes: extractValue(34, 9),
      staff: extractValue(37, 9),
      caution: extractValue(39, 1)
    };

    return Object.values(result).some((v) => v !== undefined) ? result : undefined;
  } catch (error) {
    console.error("[Aiza Extract] Failed to extract aiza info:", error instanceof Error ? error.message : "unknown error");
    return undefined;
  }
};

const DAYS_TO_FETCH = 5;
const FETCH_UID_CHUNK_SIZE = 10;
const FALLBACK_SCAN_LIMIT = 500;

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeBase64 = url.searchParams.get("includeBase64") === "true";

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
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
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
    const sinceTimestamp = sinceDate.getTime();

    let matchedUids: number[] = [];

    try {
      const searchResult = await client.search({ since: sinceDate }, { uid: true });
      matchedUids = Array.isArray(searchResult) ? searchResult : [];
    } catch {
      const fallbackStart = Math.max(1, mailbox.exists - FALLBACK_SCAN_LIMIT + 1);
      const fallbackRange = `${fallbackStart}:${mailbox.exists}`;
      const fallbackUids: number[] = [];

      for await (const item of client.fetch(fallbackRange, {
        uid: true,
        internalDate: true
      })) {
        const receivedAt = item.internalDate instanceof Date ? item.internalDate.getTime() : NaN;
        if (item.uid && Number.isFinite(receivedAt) && receivedAt >= sinceTimestamp) {
          fallbackUids.push(item.uid);
        }
      }

      matchedUids = fallbackUids;
    }

    if (matchedUids.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    const uids = [...new Set(matchedUids)].sort((a, b) => b - a);

    const messagesById = new Map<string, MailMessage>();

    const readSingleMessage = async (uid: number): Promise<MailMessage | null> => {
      const item = await client.fetchOne(
        uid,
        {
          uid: true,
          envelope: true,
          internalDate: true,
          source: true
        },
        { uid: true }
      );

      if (!item) {
        return null;
      }

      const source = item.source ? Buffer.from(item.source) : Buffer.alloc(0);
      let parsed: Awaited<ReturnType<typeof simpleParser>> | null = null;

      if (source.length > 0) {
        try {
          parsed = await simpleParser(source);
        } catch {
          parsed = null;
        }
      }

      const from = item.envelope?.from?.[0];
      const body = (parsed?.text || parsed?.html?.toString() || "").replace(/\s+/g, " ").trim();
      const attachments = (parsed?.attachments ?? []).map((attachment) => {
        const filename = attachment.filename ?? "(名称なし)";
        const contentType = attachment.contentType ?? "application/octet-stream";
        let contentBase64: string | undefined;

        const content = attachment.content;
        if (Buffer.isBuffer(content)) {
          contentBase64 = content.toString("base64");
        } else if (typeof content === "string") {
          contentBase64 = content;
        } else if (content && typeof content === "object" && "length" in content) {
          try {
            contentBase64 = Buffer.from(content as Uint8Array).toString("base64");
          } catch {
            contentBase64 = undefined;
          }
        }

        if (isExcelAttachment(filename, contentType) && !contentBase64) {
          console.warn(`[Mail Parser] Excel attachment without base64: ${filename} (size: ${attachment.size}, type: ${typeof content})`);
        }

        return {
          filename,
          size: attachment.size ?? 0,
          contentType,
          isExcel: isExcelAttachment(filename, contentType),
          contentBase64
        };
      });
      const hasExcelAttachment = attachments.some((attachment) => attachment.isExcel);

      let aizaInfo: AizaInfo | undefined;
      const excelWithContent = attachments.find((a) => a.isExcel && a.contentBase64);
      if (excelWithContent && excelWithContent.contentBase64) {
        aizaInfo = extractAizaInfo(excelWithContent.contentBase64);
      }

      const message: MailMessage = {
        id: String(item.uid ?? `${uid}`),
        subject: item.envelope?.subject ?? "(件名なし)",
        senderName: from?.name ?? "",
        senderAddress: from?.address ?? "",
        receivedAt: toIsoString(item.internalDate),
        body,
        preview: toPreview(body),
        hasAttachments: attachments.length > 0,
        attachments,
        hasExcelAttachment,
        aizaInfo
      };

      return message;
    };

    for (let index = 0; index < uids.length; index += FETCH_UID_CHUNK_SIZE) {
      const uidChunk = uids.slice(index, index + FETCH_UID_CHUNK_SIZE);

      const results = await Promise.allSettled(uidChunk.map((uid) => readSingleMessage(uid)));

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          if (shouldIncludeMessage(result.value, keywords)) {
            messagesById.set(result.value.id, result.value);
          }
        }
      }
    }

    const messages = [...messagesById.values()];

    messages.sort((a, b) => {
      const aTime = new Date(a.receivedAt).getTime();
      const bTime = new Date(b.receivedAt).getTime();
      return bTime - aTime;
    });

    // Conditionally include contentBase64 based on query parameter
    const processedMessages = includeBase64
      ? messages
      : messages.map((msg) => ({
          ...msg,
          attachments: msg.attachments.map((att) => ({
            filename: att.filename,
            size: att.size,
            contentType: att.contentType,
            isExcel: att.isExcel
          }))
        }));

    return NextResponse.json({ messages: processedMessages });
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
