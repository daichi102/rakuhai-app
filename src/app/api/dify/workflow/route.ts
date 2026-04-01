import { NextResponse } from "next/server";

type WorkflowRequestBody = {
  excelJson?: unknown;
  useSupportInput?: "use" | "ignore";
  subject?: string;
  body?: string;
  sender?: string;
  receivedAt?: string;
  user?: string;
};

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "");

const toExcelJsonString = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value ?? {});
};

const extractOutputs = (response: Record<string, unknown>) => {
  const data = response.data as Record<string, unknown> | undefined;

  if (data && typeof data === "object" && data.outputs && typeof data.outputs === "object") {
    return data.outputs;
  }

  if (response.outputs && typeof response.outputs === "object") {
    return response.outputs;
  }

  return null;
};

export async function POST(request: Request) {
  const apiKey = process.env.DIFY_API_KEY?.trim();
  const baseUrl = normalizeBaseUrl((process.env.DIFY_BASE_URL ?? "https://api.dify.ai/v1").trim());

  if (!apiKey) {
    return NextResponse.json(
      { error: "DIFY_API_KEY が未設定です。サーバー環境変数を確認してください。" },
      { status: 500 }
    );
  }

  let body: WorkflowRequestBody;
  try {
    body = (await request.json()) as WorkflowRequestBody;
  } catch {
    return NextResponse.json({ error: "JSONボディの解析に失敗しました。" }, { status: 400 });
  }

  if (typeof body.excelJson === "undefined") {
    return NextResponse.json(
      { error: "excelJson は必須です。" },
      { status: 400 }
    );
  }

  const payload = {
    inputs: {
      excel_json: toExcelJsonString(body.excelJson),
      use_support_input: body.useSupportInput ?? "ignore",
      subject: body.subject ?? "",
      body: body.body ?? "",
      sender: body.sender ?? "",
      receivedAt: body.receivedAt ?? ""
    },
    response_mode: "blocking",
    user: body.user ?? "rakuhai-app-user"
  };

  const response = await fetch(`${baseUrl}/workflows/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    const details = await response.text();
    return NextResponse.json(
      {
        error: "Dify API呼び出しに失敗しました。",
        status: response.status,
        details
      },
      { status: response.status }
    );
  }

  const data = (await response.json()) as Record<string, unknown>;

  return NextResponse.json({
    outputs: extractOutputs(data),
    raw: data
  });
}
