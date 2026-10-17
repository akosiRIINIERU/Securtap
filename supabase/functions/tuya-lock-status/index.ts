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

async function hmacSha256(secret: string, message: string): Promise<string> {
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

async function tuyaFetch(options: {
  method: string;
  path: string;
  body?: unknown;
  accessId: string;
  accessSecret: string;
  accessToken?: string;
  base: string;
}) {
  const { method, path, body, accessId, accessSecret, accessToken, base } =
    options;
  const timestamp = Date.now().toString();
  const nonce = "";
  const bodyStr = body === undefined ? "" : JSON.stringify(body);
  const contentHash = await sha256Hex(bodyStr);
  const stringToSign = `${method}\n${contentHash}\n\n${path}`;
  const signSource = accessToken
    ? accessId + accessToken + timestamp + nonce + stringToSign
    : accessId + timestamp + nonce + stringToSign;
  const sign = await hmacSha256(accessSecret, signSource);

  const headers: Record<string, string> = {
    client_id: accessId,
    t: timestamp,
    sign,
    sign_method: "HMAC-SHA256",
    nonce,
  };

  if (accessToken) {
    headers.access_token = accessToken;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : bodyStr,
  });

  const result = await response.json();
  return { response, result };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
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

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    const accessId = Deno.env.get("TUYA_ACCESS_ID");
    const accessSecret = Deno.env.get("TUYA_ACCESS_SECRET");
    const envDeviceId = Deno.env.get("TUYA_DEVICE_ID");
    const baseUrl = Deno.env.get("TUYA_API_BASE_URL");

    if (!accessId || !accessSecret || !baseUrl) {
      return jsonResponse({ error: "Tuya configuration is incomplete" }, 500);
    }

    let action = "status";
    let requestedDeviceId = "";

    if (req.method === "GET") {
      const url = new URL(req.url);
      action = url.searchParams.get("action") || "status";
      requestedDeviceId = url.searchParams.get("deviceId") || "";
    } else {
      const payload = await req.json().catch(() => ({}));
      action = payload?.action || "status";
      requestedDeviceId = payload?.deviceId || "";
    }

    const deviceId = requestedDeviceId || envDeviceId;

    if (!deviceId) {
      return jsonResponse({ error: "No Tuya device ID provided" }, 400);
    }

    const { data: ownedLock, error: lockError } = await supabase
      .from("smart_locks")
      .select("id, device_id")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (lockError) {
      console.error("smart_locks lookup error:", lockError);
    }

    const isConfiguredDevice = envDeviceId && deviceId === envDeviceId;

    if (!ownedLock && !isConfiguredDevice) {
      return jsonResponse(
        { error: "This lock is not connected to your Securtap account." },
        403,
      );
    }

    const base = baseUrl.replace(/\/+$/, "");

    const tokenCall = await tuyaFetch({
      method: "GET",
      path: "/v1.0/token?grant_type=1",
      accessId,
      accessSecret,
      base,
    });

    if (
      !tokenCall.response.ok ||
      !tokenCall.result.success ||
      !tokenCall.result.result?.access_token
    ) {
      console.error("Tuya token request failed:", tokenCall.result);
      return jsonResponse({
        error: "Tuya authorization failed",
        tuyaCode: tokenCall.result.code ?? null,
      }, 502);
    }

    const accessToken = tokenCall.result.result.access_token;
    const encodedId = encodeURIComponent(deviceId);

    if (action === "lock" || action === "unlock") {
      const commands = action === "unlock"
        ? [{ code: "unlock", value: true }]
        : [{ code: "lock", value: true }];

      const commandCall = await tuyaFetch({
        method: "POST",
        path: `/v1.0/iot-03/devices/${encodedId}/commands`,
        body: { commands },
        accessId,
        accessSecret,
        accessToken,
        base,
      });

      if (!commandCall.response.ok || !commandCall.result.success) {
        console.error("Tuya command failed:", commandCall.result);
        return jsonResponse({
          error: action === "unlock"
            ? "Unable to unlock the device"
            : "Unable to lock the device",
          tuyaCode: commandCall.result.code ?? null,
        }, 502);
      }
    }

    const statusCall = await tuyaFetch({
      method: "GET",
      path: `/v1.0/iot-03/devices/${encodedId}/status`,
      accessId,
      accessSecret,
      accessToken,
      base,
    });

    if (!statusCall.response.ok || !statusCall.result.success) {
      console.error("Tuya status request failed:", statusCall.result);
      return jsonResponse({
        error: "Unable to read lock status",
        tuyaCode: statusCall.result.code ?? null,
      }, 502);
    }

    const infoCall = await tuyaFetch({
      method: "GET",
      path: `/v1.0/iot-03/devices/${encodedId}`,
      accessId,
      accessSecret,
      accessToken,
      base,
    });

    return jsonResponse({
      success: true,
      deviceId,
      action,
      online: infoCall.result?.result?.online ?? null,
      device: infoCall.result?.result ?? null,
      status: statusCall.result.result,
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
