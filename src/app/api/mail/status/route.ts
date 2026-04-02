import { NextResponse } from "next/server";

const hasValue = (key: string) => Boolean((process.env[key] ?? "").trim());

export async function GET() {
  const configured = hasValue("IMAP_HOST") && hasValue("IMAP_PORT") && hasValue("IMAP_USER") && hasValue("IMAP_PASSWORD");

  return NextResponse.json({ configured });
}
