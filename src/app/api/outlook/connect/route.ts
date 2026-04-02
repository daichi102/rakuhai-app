import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const OUTLOOK_STATE_COOKIE = "outlook_oauth_state";

const getRequiredEnv = (key: "MICROSOFT_TENANT_ID" | "MICROSOFT_CLIENT_ID") => {
  const value = (process.env[key] ?? "").trim();
  return value;
};

export async function GET(request: NextRequest) {
  const tenantId = getRequiredEnv("MICROSOFT_TENANT_ID");
  const clientId = getRequiredEnv("MICROSOFT_CLIENT_ID");

  if (!tenantId || !clientId) {
    return NextResponse.json(
      { error: "MICROSOFT_TENANT_ID または MICROSOFT_CLIENT_ID が未設定です。" },
      { status: 500 }
    );
  }

  const state = randomUUID();
  const redirectUri = `${request.nextUrl.origin}/api/outlook/callback`;

  const authorizeUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_mode", "query");
  authorizeUrl.searchParams.set("scope", "openid profile offline_access User.Read Mail.Read");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OUTLOOK_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/"
  });

  return response;
}
