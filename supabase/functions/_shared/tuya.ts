// Minimal Tuya Cloud client (signing + token) shared by edge functions.
const encoder = new TextEncoder();

const TUYA_ACCESS_ID = Deno.env.get("TUYA_ACCESS_ID")!;
const TUYA_ACCESS_SECRET = Deno.env.get("TUYA_ACCESS_SECRET")!;
const TUYA_API_BASE_URL = (
  Deno.env.get("TUYA_API_BASE_URL") || "https://openapi-sg.iotbing.com"
).replace(/\/+$/, "");

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export class TuyaApiError extends Error {
  code: number | string | null;
  tuyaMessage: string | null;
  path: string;

  constructor(code: number | string | null, tuyaMessage: string | null, path: string) {
    super(`Tuya API request failed (code ${code}).`);
    this.name = "TuyaApiError";
    this.code = code;
    this.tuyaMessage = tuyaMessage;
    this.path = path;
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function tuyaRequest(
  method: HttpMethod,
  pathAndQuery: string,
  accessToken?: string,
  body?: unknown,
) {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const bodyText = body === undefined ? "" : JSON.stringify(body);
  const stringToSign = [method, await sha256(bodyText), "", pathAndQuery].join("\n");

  const signContent = accessToken
    ? TUYA_ACCESS_ID + accessToken + timestamp + nonce + stringToSign
    : TUYA_ACCESS_ID + timestamp + nonce + stringToSign;

  const headers: Record<string, string> = {
    client_id: TUYA_ACCESS_ID,
    sign: await hmacSha256(TUYA_ACCESS_SECRET, signContent),
    sign_method: "HMAC-SHA256",
    t: timestamp,
    nonce,
  };

  if (accessToken) headers.access_token = accessToken;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${TUYA_API_BASE_URL}${pathAndQuery}`, {
    method,
    headers,
    ...(body !== undefined ? { body: bodyText } : {}),
  });

  const text = await response.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Tuya returned an invalid response.");
  }

  if (!response.ok || data.success === false) {
    throw new TuyaApiError(data.code ?? null, data.msg ?? data.message ?? null, pathAndQuery);
  }

  return data;
}

export async function getTuyaAccessToken(): Promise<string> {
  const data = await tuyaRequest("GET", "/v1.0/token?grant_type=1");
  const token = data.result?.access_token;

  if (typeof token !== "string" || !token) {
    throw new Error("Tuya did not return an access token.");
  }

  return token;
}
