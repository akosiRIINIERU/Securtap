import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const encoder = new TextEncoder();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const TUYA_ACCESS_ID = Deno.env.get("TUYA_ACCESS_ID")!;
const TUYA_ACCESS_SECRET = Deno.env.get("TUYA_ACCESS_SECRET")!;

const TUYA_API_BASE_URL = (
  Deno.env.get("TUYA_API_BASE_URL") ||
  "https://openapi-sg.iotbing.com"
).replace(/\/+$/, "");

type DeviceApiAttempt = {
  name: string;
  method: "GET" | "POST";
  path: string;
  body?: unknown;
};

class TuyaApiError extends Error {
  code: number | string | null;
  tuyaMessage: string | null;
  httpStatus: number;
  path: string;

  constructor({
    code,
    tuyaMessage,
    httpStatus,
    path,
  }: {
    code: number | string | null;
    tuyaMessage: string | null;
    httpStatus: number;
    path: string;
  }) {
    super(
      `Tuya API request failed (code ${code ?? httpStatus}).`,
    );
    this.name = "TuyaApiError";
    this.code = code;
    this.tuyaMessage = tuyaMessage;
    this.httpStatus = httpStatus;
    this.path = path;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function numericTuyaCode(code: number | string | null): number | null {
  if (typeof code === "number" && Number.isFinite(code)) {
    return code;
  }

  if (typeof code === "string" && /^\d+$/.test(code)) {
    return Number(code);
  }

  return null;
}

function describeTuyaError(error: TuyaApiError): string {
  const code = numericTuyaCode(error.code);

  if (code === 1114) {
    return "Tuya blocked this server IP. Disable Cloud authorization IP allowlist on the Tuya cloud project, or allowlist the current Edge Function IP.";
  }

  if (code === 1106) {
    return "Tuya denied access to this lock. In Cloud > Development > your project > Devices, confirm the lock is listed. If it is not, use Link Tuya App Account with the Smart Life/Tuya account that paired it. Also authorize IoT Core on this same project, use Tuya device_id not UUID, and match TUYA_API_BASE_URL to the lock's data center.";
  }

  if (code === 2010) {
    return "Tuya could not find this device ID in the configured data center.";
  }

  if (error.tuyaMessage) {
    return `Tuya rejected the lock request: ${error.tuyaMessage}.`;
  }

  return "Smart lock operation failed. Check function logs.";
}

function shouldTryNextDeviceApi(error: unknown): boolean {
  if (!(error instanceof TuyaApiError)) {
    return false;
  }

  const code = numericTuyaCode(error.code);
  return code === 1106 || code === 2010 || code === 28841105;
}

function encodeDeviceId(deviceId: string): string {
  return encodeURIComponent(deviceId);
}

function normalizeDeviceStatus(data: any): unknown {
  const result = data?.result;

  if (Array.isArray(result)) {
    if (result[0]?.status && Array.isArray(result[0].status)) {
      return result[0].status;
    }

    return result;
  }

  if (Array.isArray(result?.properties)) {
    return result.properties.map((item: any) => ({
      code: item.code,
      value: item.value,
    }));
  }

  return result;
}

// Tuya Content-SHA256 uses lowercase hexadecimal.
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(value),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// The final HMAC signature is uppercase.
async function hmacSha256(
  secret: string,
  message: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );

  return toHex(signature);
}

async function tuyaRequest(
  method: "GET" | "POST",
  pathAndQuery: string,
  accessToken?: string,
  body?: unknown,
) {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();

  // Sign exactly the body string that will be sent.
  const bodyText = body === undefined ? "" : JSON.stringify(body);
  const contentHash = await sha256(bodyText);

  // No custom Signature-Headers are used, so this line is blank.
  const stringToSign = [
    method,
    contentHash,
    "",
    pathAndQuery,
  ].join("\n");

  const signContent = accessToken
    ? TUYA_ACCESS_ID +
      accessToken +
      timestamp +
      nonce +
      stringToSign
    : TUYA_ACCESS_ID +
      timestamp +
      nonce +
      stringToSign;

  const sign = await hmacSha256(
    TUYA_ACCESS_SECRET,
    signContent,
  );

  const headers: Record<string, string> = {
    client_id: TUYA_ACCESS_ID,
    sign,
    sign_method: "HMAC-SHA256",
    t: timestamp,
    nonce,
  };

  if (accessToken) {
    headers.access_token = accessToken;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(
    `${TUYA_API_BASE_URL}${pathAndQuery}`,
    {
      method,
      headers,
      ...(body !== undefined ? { body: bodyText } : {}),
    },
  );

  const responseText = await response.text();

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    console.error("Tuya returned a non-JSON response:", {
      httpStatus: response.status,
      path: pathAndQuery,
    });

    throw new Error("Tuya returned an invalid response.");
  }

  if (!response.ok || data.success === false) {
    console.error("Tuya API request failed:", {
      httpStatus: response.status,
      path: pathAndQuery,
      code: data.code ?? null,
      message: data.msg ?? data.message ?? null,
    });

    throw new TuyaApiError({
      code: data.code ?? null,
      tuyaMessage: data.msg ?? data.message ?? null,
      httpStatus: response.status,
      path: pathAndQuery,
    });
  }

  return data;
}

async function tryTuyaAttempts(
  attempts: DeviceApiAttempt[],
  accessToken: string,
) {
  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      const result = await tuyaRequest(
        attempt.method,
        attempt.path,
        accessToken,
        attempt.body,
      );

      console.log("Tuya device API succeeded:", {
        name: attempt.name,
      });

      return result;
    } catch (error) {
      lastError = error;

      if (!shouldTryNextDeviceApi(error)) {
        throw error;
      }

      console.warn("Tuya device API failed; trying fallback path:", {
        name: attempt.name,
        code: error instanceof TuyaApiError ? error.code : null,
        message:
          error instanceof TuyaApiError ? error.tuyaMessage : null,
      });
    }
  }

  throw lastError;
}

async function getDeviceStatus(
  deviceId: string,
  accessToken: string,
) {
  const id = encodeDeviceId(deviceId);

  const data = await tryTuyaAttempts(
    [
      {
        name: "iot-core-v2-properties",
        method: "GET",
        path: `/v2.0/cloud/thing/${id}/shadow/properties`,
      },
      {
        name: "iot-03-status",
        method: "GET",
        path: `/v1.0/iot-03/devices/${id}/status`,
      },
      {
        name: "smart-home-status",
        method: "GET",
        path: `/v1.0/devices/${id}/status`,
      },
      {
        name: "iot-03-multi-status",
        method: "GET",
        path: `/v1.0/iot-03/devices/status?device_ids=${id}`,
      },
    ],
    accessToken,
  );

  return normalizeDeviceStatus(data);
}

async function sendDeviceCommand(
  deviceId: string,
  accessToken: string,
  commandCode: string,
  commandValue: unknown,
) {
  const id = encodeDeviceId(deviceId);
  const commandsBody = {
    commands: [
      {
        code: commandCode,
        value: commandValue,
      },
    ],
  };

  const data = await tryTuyaAttempts(
    [
      {
        name: "iot-core-v2-issue",
        method: "POST",
        path: `/v2.0/cloud/thing/${id}/shadow/properties/issue`,
        body: {
          properties: JSON.stringify({
            [commandCode]: commandValue,
          }),
        },
      },
      {
        name: "iot-03-commands",
        method: "POST",
        path: `/v1.0/iot-03/devices/${id}/commands`,
        body: commandsBody,
      },
      {
        name: "smart-home-commands",
        method: "POST",
        path: `/v1.0/devices/${id}/commands`,
        body: commandsBody,
      },
    ],
    accessToken,
  );

  return data.result;
}

async function logDeviceVisibility(
  deviceId: string,
  accessToken: string,
) {
  try {
    await tuyaRequest(
      "GET",
      `/v2.0/cloud/thing/${encodeDeviceId(deviceId)}`,
      accessToken,
    );

    console.log("Tuya IoT Core v2 can load this device details.");
  } catch (error) {
    console.warn("Tuya IoT Core v2 cannot load this device details:", {
      code: error instanceof TuyaApiError ? error.code : null,
      message: error instanceof TuyaApiError ? error.tuyaMessage : null,
    });
  }
}

async function getTuyaAccessToken(): Promise<string> {
  const data = await tuyaRequest(
    "GET",
    "/v1.0/token?grant_type=1",
  );

  const token = data.result?.access_token;

  if (typeof token !== "string" || token.length === 0) {
    throw new Error("Tuya did not return an access token.");
  }

  return token;
}

function readJsonSecret(name: string): unknown {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing Edge Function secret: ${name}`);
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${name} must contain a valid JSON value.`);
  }
}

function tuyaFailureResponse(error: unknown) {
  if (error instanceof TuyaApiError) {
    return jsonResponse(
      {
        error: describeTuyaError(error),
        tuyaCode: error.code,
        tuyaMessage: error.tuyaMessage,
      },
      502,
    );
  }

  return jsonResponse(
    { error: "Smart lock operation failed. Check function logs." },
    502,
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_ANON_KEY ||
      !TUYA_ACCESS_ID ||
      !TUYA_ACCESS_SECRET
    ) {
      console.error("Required Supabase or Tuya secrets are missing.");
      return jsonResponse(
        { error: "Server configuration is incomplete." },
        500,
      );
    }

    // Authenticate the caller using their Supabase access token.
    const authorization = req.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication required." }, 401);
    }

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Invalid or expired session." }, 401);
    }

    let requestBody: any;

    try {
      requestBody = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const action =
      typeof requestBody.action === "string"
        ? requestBody.action
        : "status";

    const deviceId =
      typeof requestBody.deviceId === "string"
        ? requestBody.deviceId.trim()
        : "";

    if (!deviceId || deviceId.length > 200) {
      return jsonResponse({ error: "Invalid device ID." }, 400);
    }

    if (!["status", "lock", "unlock"].includes(action)) {
      return jsonResponse({ error: "Unsupported action." }, 400);
    }

    // Find the lock using the actual device_id column in your schema.
    const { data: locks, error: lockError } = await supabase
      .from("smart_locks")
      .select("id, property_id, device_id")
      .eq("device_id", deviceId);

    if (lockError) {
      console.error("Smart lock lookup failed:", {
        code: lockError.code,
        message: lockError.message,
      });

      return jsonResponse(
        { error: "Could not verify smart lock ownership." },
        500,
      );
    }

    if (!locks || locks.length === 0) {
      return jsonResponse({ error: "Smart lock not found." }, 404);
    }

    const propertyIds = [
      ...new Set(
        locks
          .map((lock) => lock.property_id)
          .filter(
            (id): id is string =>
              typeof id === "string" && id.length > 0,
          ),
      ),
    ];

    if (propertyIds.length === 0) {
      return jsonResponse(
        { error: "Smart lock has no associated property." },
        403,
      );
    }

    const { data: properties, error: propertyError } = await supabase
      .from("properties")
      .select("id, created_by, admin_id")
      .in("id", propertyIds);

    if (propertyError) {
      console.error("Property ownership lookup failed:", {
        code: propertyError.code,
        message: propertyError.message,
      });

      return jsonResponse(
        { error: "Could not verify property ownership." },
        500,
      );
    }

    // Log diagnostic booleans only, not credentials or access tokens.
    console.log("Lock authorization diagnostic:", {
      authenticatedUserId: user.id,
      foundLockCount: locks.length,
      returnedPropertyCount: properties?.length ?? 0,
      returnedProperties: (properties ?? []).map((property) => ({
        id: property.id,
        createdByMatches: property.created_by === user.id,
        adminMatches: property.admin_id === user.id,
      })),
    });

    const authorizedPropertyIds = new Set(
      (properties ?? [])
        .filter(
          (property) =>
            property.created_by === user.id ||
            property.admin_id === user.id,
        )
        .map((property) => property.id),
    );

    const authorizedLock = locks.find(
      (lock) =>
        lock.property_id &&
        authorizedPropertyIds.has(lock.property_id),
    );

    if (!authorizedLock) {
      return jsonResponse(
        { error: "You do not have access to this smart lock." },
        403,
      );
    }

    // Only use the device ID from the verified database record.
    const verifiedDeviceId = authorizedLock.device_id;
    const accessToken = await getTuyaAccessToken();

    if (action === "status") {
      try {
        const status = await getDeviceStatus(
          verifiedDeviceId,
          accessToken,
        );

        return jsonResponse({
          success: true,
          action: "status",
          deviceId: verifiedDeviceId,
          status,
        });
      } catch (error) {
        await logDeviceVisibility(verifiedDeviceId, accessToken);
        throw error;
      }
    }

    // Lock/unlock require command codes and JSON values configured
    // specifically for your Tuya lock product.
    const commandCodeSecret =
      action === "lock"
        ? "TUYA_LOCK_COMMAND_CODE"
        : "TUYA_UNLOCK_COMMAND_CODE";

    const commandValueSecret =
      action === "lock"
        ? "TUYA_LOCK_COMMAND_VALUE"
        : "TUYA_UNLOCK_COMMAND_VALUE";

    const commandCode = Deno.env.get(commandCodeSecret);

    if (!commandCode) {
      return jsonResponse(
        {
          error: `Lock command is not configured (${commandCodeSecret}).`,
        },
        501,
      );
    }

    const commandValue = readJsonSecret(commandValueSecret);

    try {
      const result = await sendDeviceCommand(
        verifiedDeviceId,
        accessToken,
        commandCode,
        commandValue,
      );

      return jsonResponse({
        success: true,
        action,
        deviceId: verifiedDeviceId,
        result,
      });
    } catch (error) {
      await logDeviceVisibility(verifiedDeviceId, accessToken);
      throw error;
    }
  } catch (error) {
    console.error("Tuya lock operation failed:", {
      message:
        error instanceof Error ? error.message : "Unknown server error",
      tuyaCode: error instanceof TuyaApiError ? error.code : null,
      tuyaPath: error instanceof TuyaApiError ? error.path : null,
    });

    return tuyaFailureResponse(error);
  }
});
