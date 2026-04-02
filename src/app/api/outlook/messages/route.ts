import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type GraphMessage = {
  id?: string;
  subject?: string;
  receivedDateTime?: string;
  hasAttachments?: boolean;
  bodyPreview?: string;
  from?: {
    emailAddress?: {
      name?: string;
      address?: string;
    };
  };
};

type GraphMessagesResponse = {
  value?: GraphMessage[];
};

const OUTLOOK_ACCESS_COOKIE = "outlook_access_token";

export async function GET() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(OUTLOOK_ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Outlook未接続です。先にOutlook連携を実行してください。" },
      { status: 401 }
    );
  }

  const graphResponse = await fetch(
    "https://graph.microsoft.com/v1.0/me/messages?$top=10&$orderby=receivedDateTime%20desc&$select=id,subject,from,receivedDateTime,hasAttachments,bodyPreview",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    }
  );

  if (graphResponse.status === 401) {
    const response = NextResponse.json(
      { error: "Outlookトークンの有効期限が切れました。再連携してください。" },
      { status: 401 }
    );
    response.cookies.delete(OUTLOOK_ACCESS_COOKIE);
    return response;
  }

  if (!graphResponse.ok) {
    const details = await graphResponse.text();
    return NextResponse.json(
      {
        error: "Outlookメールの取得に失敗しました。",
        status: graphResponse.status,
        details
      },
      { status: graphResponse.status }
    );
  }

  const payload = (await graphResponse.json()) as GraphMessagesResponse;
  const messages = (payload.value ?? []).map((message) => ({
    id: message.id ?? "",
    subject: message.subject ?? "(件名なし)",
    senderName: message.from?.emailAddress?.name ?? "",
    senderAddress: message.from?.emailAddress?.address ?? "",
    receivedAt: message.receivedDateTime ?? "",
    preview: message.bodyPreview ?? "",
    hasAttachments: Boolean(message.hasAttachments)
  }));

  return NextResponse.json({ messages });
}
