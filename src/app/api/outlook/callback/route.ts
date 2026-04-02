import { NextRequest, NextResponse } from "next/server";

const OUTLOOK_STATE_COOKIE = "outlook_oauth_state";
const OUTLOOK_ACCESS_COOKIE = "outlook_access_token";
const OUTLOOK_REFRESH_COOKIE = "outlook_refresh_token";

const redirectWithError = (request: NextRequest, message: string) => {
  const url = new URL("/dashboard", request.url);
  url.searchParams.set("outlook", "error");
  url.searchParams.set("reason", message);
  return NextResponse.redirect(url);
};

export async function GET(request: NextRequest) {
  const tenantId = (process.env.MICROSOFT_TENANT_ID ?? "").trim();
  const clientId = (process.env.MICROSOFT_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.MICROSOFT_CLIENT_SECRET ?? "").trim();

  if (!tenantId || !clientId || !clientSecret) {
    return redirectWithError(request, "Microsoft環境変数が不足しています");
  }

  const state = request.nextUrl.searchParams.get("state") ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return redirectWithError(request, "Outlook認証がキャンセルされました");
  }

  const expectedState = request.cookies.get(OUTLOOK_STATE_COOKIE)?.value ?? "";
  if (!state || !expectedState || state !== expectedState) {
    return redirectWithError(request, "state検証に失敗しました");
  }

  if (!code) {
    return redirectWithError(request, "認可コードを受け取れませんでした");
  }

  const redirectUri = `${request.nextUrl.origin}/api/outlook/callback`;
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const tokenResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      scope: "offline_access User.Read Mail.Read"
    }),
    cache: "no-store"
  });

  if (!tokenResponse.ok) {
    return redirectWithError(request, "アクセストークン取得に失敗しました");
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };

  if (!tokenData.access_token) {
    return redirectWithError(request, "access_token が取得できませんでした");
  }

  const successUrl = new URL("/dashboard", request.url);
  successUrl.searchParams.set("outlook", "connected");

  const response = NextResponse.redirect(successUrl);
  response.cookies.set(OUTLOOK_ACCESS_COOKIE, tokenData.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.max(60, (tokenData.expires_in ?? 3600) - 60),
    path: "/"
  });

  if (tokenData.refresh_token) {
    response.cookies.set(OUTLOOK_REFRESH_COOKIE, tokenData.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/"
    });
  }

  response.cookies.delete(OUTLOOK_STATE_COOKIE);

  return response;
}
