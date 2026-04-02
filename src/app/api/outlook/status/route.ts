import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const OUTLOOK_ACCESS_COOKIE = "outlook_access_token";

export async function GET() {
  const cookieStore = cookies();
  const connected = Boolean(cookieStore.get(OUTLOOK_ACCESS_COOKIE)?.value);

  return NextResponse.json({ connected });
}
