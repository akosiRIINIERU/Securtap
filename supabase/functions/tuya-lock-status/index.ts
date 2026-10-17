
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(
  secret: string,
  message: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function getStringToSign(
  method: string,
  contentHash: string,
  urlPathAndQuery: string,
): string {
  return `${method}\n${contentHash}\n\n${urlPathAndQuery}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Require a valid Supabase user session.
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    const accessId = Deno.env.get("TUYA_ACCESS_ID");
    const accessSecret = Deno.env.get("TUYA_ACCESS_SECRET");
    const deviceId = Deno.env.get("TUYA_DEVICE_ID");
    const baseUrl = Deno.env.get("TUYA_API_BASE_URL");

    if (!accessId || !accessSecret || !deviceId || !baseUrl) {
      return jsonResponse({ error: "Tuya configuration is incomplete" }, 500);
    }

    const base = baseUrl.replace(/\/+$/, "");
    const nonce = "";
    const timestamp = Date.now().toString();
    const emptyHash = await sha256Hex("");

    // 1. Obtain a Tuya access token.
    const tokenPath = "/v1.0/token?grant_type=1";
    const tokenStringToSign = getStringToSign(
      "GET",
      emptyHash,
      tokenPath,
    );

    const tokenSign = await hmacSha256(
      accessSecret,
      accessId + timestamp + nonce + tokenStringToSign,
    );

    const tokenResponse = await fetch(base + tokenPath, {
      method: "GET",
      headers: {
        client_id: accessId,
        t: timestamp,
        sign: tokenSign,
        sign_method: "HMAC-SHA256",
        nonce,
      },
    });

    const tokenResult = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenResult.success ||
        !tokenResult.result?.access_token) {
      console.error("Tuya token request failed:", {
        httpStatus: tokenResponse.status,
        code: tokenResult.code,
        message: tokenResult.msg,
      });

      return jsonResponse({
        error: "Tuya authorization failed",
        tuyaCode: tokenResult.code ?? null,
      }, 502);
    }

    const accessToken = tokenResult.result.access_token;

    // 2. Read the lock's status. This endpoint does not unlock the door.
    const statusPath =
      `/v1.0/iot-03/devices/${encodeURIComponent(deviceId)}/status`;

    const statusTimestamp = Date.now().toString();
    const statusStringToSign = getStringToSign(
      "GET",
      emptyHash,
      statusPath,
    );

    const statusSign = await hmacSha256(
      accessSecret,
      accessId + accessToken + statusTimestamp +
        nonce + statusStringToSign,
    );

    const statusResponse = await fetch(base + statusPath, {
      method: "GET",
      headers: {
        client_id: accessId,
        access_token: accessToken,
        t: statusTimestamp,
        sign: statusSign,
        sign_method: "HMAC-SHA256",
        nonce,
      },
    });

    const statusResult = await statusResponse.json();

    if (!statusResponse.ok || !statusResult.success) {
      console.error("Tuya status request failed:", {
        httpStatus: statusResponse.status,
        code: statusResult.code,
        message: statusResult.msg,
      });

      return jsonResponse({
        error: "Unable to read lock status",
        tuyaCode: statusResult.code ?? null,
      }, 502);
    }

    return jsonResponse({
      success: true,
      deviceId,
      status: statusResult.result,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "tuya-lock-status error:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
