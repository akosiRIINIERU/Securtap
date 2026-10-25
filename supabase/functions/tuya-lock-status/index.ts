import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomInt } from "node:crypto";

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

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

type DeviceApiAttempt = {
  name: string;
  method: HttpMethod;
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

  if (code === 40001900) {
    return "Tuya IoT Core has no space permission for this lock. In Cloud > Development > your project > Devices, transfer the lock into a space that belongs to this project, then retry. Linked Smart Life devices still need that space assignment for v2 APIs.";
  }

  if (code === 2328) {
    return "The lock is still busy with an earlier enrollment. Wait about a minute, touch the lock to wake it, and try again.";
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
  return (
    code === 1106 ||
    code === 2010 ||
    code === 28841105 ||
    code === 40001900
  );
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
  method: HttpMethod,
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
        name: "smart-home-status",
        method: "GET",
        path: `/v1.0/devices/${id}/status`,
      },
      {
        name: "iot-03-status",
        method: "GET",
        path: `/v1.0/iot-03/devices/${id}/status`,
      },
      {
        name: "iot-03-multi-status",
        method: "GET",
        path: `/v1.0/iot-03/devices/status?device_ids=${id}`,
      },
      {
        name: "iot-core-v2-properties",
        method: "GET",
        path: `/v2.0/cloud/thing/${id}/shadow/properties`,
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
        name: "smart-home-commands",
        method: "POST",
        path: `/v1.0/devices/${id}/commands`,
        body: commandsBody,
      },
      {
        name: "iot-03-commands",
        method: "POST",
        path: `/v1.0/iot-03/devices/${id}/commands`,
        body: commandsBody,
      },
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

  try {
    const spaces = await tuyaRequest(
      "GET",
      "/v2.0/cloud/space/child?page_no=1&page_size=20",
      accessToken,
    );

    const list =
      spaces.result?.list ??
      spaces.result?.data ??
      spaces.result;

    console.log("Tuya space diagnostic:", {
      spaceCount: Array.isArray(list) ? list.length : null,
    });
  } catch (error) {
    console.warn("Could not list Tuya spaces:", {
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

// ---------------------------------------------------------------------------
// PIN management (Tuya Smart Lock Open Service: temporary passwords)
// ---------------------------------------------------------------------------

const PIN_ACTIONS = [
  "pin_create",
  "pin_modify",
  "pin_revoke",
  "pin_regenerate",
  "pin_reset_all",
];

// Tuya: Wi-Fi locks use 7-digit passwords, Zigbee/Bluetooth locks use 6.
// Set the TUYA_PIN_LENGTH secret to 7 if your lock is Wi-Fi.
const PIN_LENGTH = (() => {
  const n = Number(Deno.env.get("TUYA_PIN_LENGTH") || "6");
  return Number.isInteger(n) && n >= 6 && n <= 8 ? n : 6;
})();

class PinSaveError extends Error {}

function generatePin(): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    let pin = "";
    for (let i = 0; i < PIN_LENGTH; i++) {
      pin += randomInt(0, 10).toString();
    }

    const digits = pin.split("").map(Number);
    const allSame = digits.every((d) => d === digits[0]);
    const ascending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
    const descending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);

    if (!allSame && !ascending && !descending) {
      return pin;
    }
  }

  throw new Error("Could not generate a PIN.");
}

function aesAlgorithm(key: Buffer): string {
  if (key.length === 16) return "aes-128-ecb";
  if (key.length === 24) return "aes-192-ecb";
  if (key.length === 32) return "aes-256-ecb";
  throw new Error(`Unsupported AES key length (${key.length}).`);
}

// Tuya requires: decrypt ticket_key with the project's access secret (AES/ECB),
// then AES/ECB-encrypt the PIN with the resulting key, output as hex.
function encryptPinWithTicket(pin: string, ticketKeyHex: string): string {
  const secretKey = Buffer.from(TUYA_ACCESS_SECRET, "utf8");
  const decipher = createDecipheriv(aesAlgorithm(secretKey), secretKey, Buffer.alloc(0));
  const rawKey = Buffer.concat([
    decipher.update(Buffer.from(ticketKeyHex, "hex")),
    decipher.final(),
  ]);

  const cipher = createCipheriv(aesAlgorithm(rawKey), rawKey, Buffer.alloc(0));
  return Buffer.concat([
    cipher.update(pin, "utf8"),
    cipher.final(),
  ]).toString("hex").toUpperCase();
}

async function getPasswordTicket(deviceId: string, accessToken: string) {
  const id = encodeDeviceId(deviceId);

  const data = await tryTuyaAttempts(
    [
      {
        name: "door-lock-password-ticket",
        method: "POST",
        path: `/v1.0/devices/${id}/door-lock/password-ticket`,
        body: {},
      },
      {
        name: "smart-lock-password-ticket",
        method: "POST",
        path: `/v1.0/smart-lock/devices/${id}/password-ticket`,
        body: {},
      },
    ],
    accessToken,
  );

  const ticketId = data.result?.ticket_id;
  const ticketKey = data.result?.ticket_key;

  if (typeof ticketId !== "string" || typeof ticketKey !== "string") {
    throw new Error("Tuya did not return a password ticket.");
  }

  return { ticketId, ticketKey };
}

async function createTuyaPin(
  deviceId: string,
  accessToken: string,
  pin: string,
  name: string,
  effective: number,
  invalid: number,
): Promise<string> {
  const { ticketId, ticketKey } = await getPasswordTicket(deviceId, accessToken);

  const data = await tuyaRequest(
    "POST",
    `/v1.0/devices/${encodeDeviceId(deviceId)}/door-lock/temp-password`,
    accessToken,
    {
      name: name.slice(0, 30),
      password: encryptPinWithTicket(pin, ticketKey),
      password_type: "ticket",
      ticket_id: ticketId,
      effective_time: effective,
      invalid_time: invalid,
    },
  );

  const passwordId = data.result?.id ?? data.result?.pwd_id;

  if (passwordId === undefined || passwordId === null) {
    throw new Error("Tuya did not return a password ID.");
  }

  return String(passwordId);
}

async function modifyTuyaPin(
  deviceId: string,
  accessToken: string,
  passwordId: string,
  pin: string,
  name: string,
  effective: number,
  invalid: number,
) {
  const { ticketId, ticketKey } = await getPasswordTicket(deviceId, accessToken);

  await tuyaRequest(
    "PUT",
    `/v1.0/devices/${encodeDeviceId(deviceId)}/door-lock/temp-passwords/${encodeURIComponent(passwordId)}/modify-password`,
    accessToken,
    {
      name: name.slice(0, 30),
      password: encryptPinWithTicket(pin, ticketKey),
      password_type: "ticket",
      ticket_id: ticketId,
      effective_time: effective,
      invalid_time: invalid,
    },
  );
}

async function deleteTuyaPin(
  deviceId: string,
  accessToken: string,
  passwordId: string,
) {
  await tuyaRequest(
    "DELETE",
    `/v1.0/devices/${encodeDeviceId(deviceId)}/door-lock/temp-passwords/${encodeURIComponent(passwordId)}`,
    accessToken,
  );
}

async function clearTuyaPins(deviceId: string, accessToken: string) {
  await tuyaRequest(
    "POST",
    `/v1.0/devices/${encodeDeviceId(deviceId)}/door-lock/temp-passwords/rest-password`,
    accessToken,
    {},
  );
}

function resolveWindow(validFrom: unknown, validUntil: unknown) {
  const nowSec = Math.floor(Date.now() / 1000);
  let effective = nowSec;

  if (typeof validFrom === "string" && validFrom) {
    const t = Date.parse(validFrom);
    if (!Number.isNaN(t)) {
      effective = Math.max(nowSec, Math.floor(t / 1000));
    }
  }

  let invalid = effective + 24 * 3600;

  if (typeof validUntil === "string" && validUntil) {
    const t = Date.parse(validUntil);
    if (Number.isNaN(t)) return null;
    invalid = Math.floor(t / 1000);
  }

  if (invalid <= effective + 60) return null;
  if (invalid - effective > 365 * 24 * 3600) return null;

  return { effective, invalid };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanLabel(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, 60);
  return trimmed || fallback;
}

type PinContext = {
  action: string;
  body: any;
  supabase: any;
  lock: { id: string; property_id: string | null; unit_id?: string | null };
  deviceId: string;
  accessToken: string;
};

async function createPinFlow(
  ctx: PinContext,
  label: string,
  guestId: string | null,
  window: { effective: number; invalid: number },
) {
  const pin = generatePin();

  const tuyaPasswordId = await createTuyaPin(
    ctx.deviceId,
    ctx.accessToken,
    pin,
    label,
    window.effective,
    window.invalid,
  );

  const now = new Date().toISOString();

  const { data, error } = await ctx.supabase
    .from("lock_passcodes")
    .insert({
      lock_id: ctx.lock.id,
      property_id: ctx.lock.property_id,
      guest_id: guestId,
      label,
      passcode: pin,
      status: "active",
      valid_from: new Date(window.effective * 1000).toISOString(),
      valid_until: new Date(window.invalid * 1000).toISOString(),
      tuya_password_id: tuyaPasswordId,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Saving PIN record failed:", {
      code: error.code,
      message: error.message,
    });

    // Do not leave an unknown working PIN on the lock.
    try {
      await deleteTuyaPin(ctx.deviceId, ctx.accessToken, tuyaPasswordId);
    } catch (cleanupError) {
      console.error("Could not remove unsaved PIN from lock:", cleanupError);
    }

    throw new PinSaveError(
      "The PIN could not be saved, so it was removed from the lock. Check the lock_passcodes table and its permissions.",
    );
  }

  return {
    pin,
    tuyaPasswordId,
    passcodeId: data.id as string,
    validFrom: new Date(window.effective * 1000).toISOString(),
    validUntil: new Date(window.invalid * 1000).toISOString(),
  };
}

async function loadPinRow(ctx: PinContext, passcodeId: unknown) {
  if (typeof passcodeId !== "string" || !UUID_PATTERN.test(passcodeId)) {
    return { error: jsonResponse({ error: "Invalid PIN ID." }, 400) };
  }

  const { data, error } = await ctx.supabase
    .from("lock_passcodes")
    .select(
      "id, label, passcode, status, guest_id, valid_from, valid_until, tuya_password_id",
    )
    .eq("id", passcodeId)
    .eq("lock_id", ctx.lock.id)
    .maybeSingle();

  if (error) {
    console.error("PIN lookup failed:", { code: error.code, message: error.message });
    return { error: jsonResponse({ error: "Could not load the PIN record." }, 500) };
  }

  if (!data) {
    return { error: jsonResponse({ error: "PIN not found for this lock." }, 404) };
  }

  if (data.status !== "active") {
    return { error: jsonResponse({ error: "This PIN is no longer active." }, 400) };
  }

  return { row: data };
}

async function markPinsRevoked(ctx: PinContext, ids: string[] | null) {
  let query = ctx.supabase
    .from("lock_passcodes")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("lock_id", ctx.lock.id)
    .eq("status", "active");

  if (ids) query = query.in("id", ids);

  const { error } = await query;

  if (error) {
    console.error("Marking PINs revoked failed:", {
      code: error.code,
      message: error.message,
    });
    throw new PinSaveError(
      "The lock was updated but the PIN records could not be marked revoked. Check permissions on lock_passcodes.",
    );
  }
}

async function listTuyaPins(deviceId: string, accessToken: string) {
  const data = await tuyaRequest(
    "GET",
    `/v1.0/devices/${encodeDeviceId(deviceId)}/door-lock/temp-passwords`,
    accessToken,
  );

  const result = data.result;
  const list: any[] = Array.isArray(result)
    ? result
    : Array.isArray(result?.records)
      ? result.records
      : [];

  return list;
}

// Wi-Fi lock phases: 0 deleted, 1 to be sent, 2 sent, 3 to be deleted.
// (Zigbee uses 4 = deleted and 5 = failed, so treat those as gone too.)
const PHASE_GONE = [0, 4, 5];
const PHASE_PENDING_DELETE = 3;

// Lists the PINs that really exist on the lock and deletes every one except
// `keepTuyaId`, then lists again to verify. This also removes PINs this app
// has no record of.
async function purgeLockPins(ctx: PinContext, keepTuyaId: string | null) {
  let pins: any[] = [];
  let listFailed = false;

  try {
    pins = await listTuyaPins(ctx.deviceId, ctx.accessToken);
  } catch (error) {
    listFailed = true;
    console.error("Listing PINs on the lock failed:", {
      code: error instanceof TuyaApiError ? error.code : null,
      message: error instanceof TuyaApiError ? error.tuyaMessage : null,
    });
  }

  // Safety: if the PIN we want to keep is not in the list, the ids do not
  // line up, so refuse to delete by list rather than risk removing it.
  if (
    !listFailed &&
    keepTuyaId &&
    !pins.some((pin) => String(pin.id) === keepTuyaId)
  ) {
    console.warn("New PIN missing from lock list; not deleting by list.");
    listFailed = true;
  }

  if (listFailed) {
    return {
      deleted: 0,
      remainingIds: [] as string[],
      pending: 0,
      listFailed: true,
      verifyFailed: true,
    };
  }

  let deleted = 0;

  for (const pin of pins) {
    const phase = Number(pin.phase);

    if (
      String(pin.id) === keepTuyaId ||
      PHASE_GONE.includes(phase) ||
      phase === PHASE_PENDING_DELETE
    ) {
      continue;
    }

    try {
      await deleteTuyaPin(ctx.deviceId, ctx.accessToken, String(pin.id));
      deleted++;
    } catch (error) {
      console.error("Could not delete PIN from lock:", {
        id: pin.id,
        code: error instanceof TuyaApiError ? error.code : null,
        message: error instanceof TuyaApiError ? error.tuyaMessage : null,
      });
    }
  }

  let remainingIds: string[] = [];
  let pending = 0;
  let verifyFailed = false;

  try {
    const after = await listTuyaPins(ctx.deviceId, ctx.accessToken);

    pending = after.filter(
      (pin) => Number(pin.phase) === PHASE_PENDING_DELETE,
    ).length;

    remainingIds = after
      .filter(
        (pin) =>
          String(pin.id) !== keepTuyaId &&
          !PHASE_GONE.includes(Number(pin.phase)) &&
          Number(pin.phase) !== PHASE_PENDING_DELETE,
      )
      .map((pin) => String(pin.id));
  } catch {
    verifyFailed = true;
  }

  return { deleted, remainingIds, pending, listFailed: false, verifyFailed };
}

// Marks PINs revoked in the database, except ones the lock still holds.
async function markRevokedExcept(ctx: PinContext, remainingIds: string[]) {
  const { data: rows } = await ctx.supabase
    .from("lock_passcodes")
    .select("id, tuya_password_id")
    .eq("lock_id", ctx.lock.id)
    .eq("status", "active");

  const ids = (rows ?? [])
    .filter(
      (row: any) =>
        !row.tuya_password_id ||
        !remainingIds.includes(String(row.tuya_password_id)),
    )
    .map((row: any) => row.id);

  if (ids.length > 0) {
    await markPinsRevoked(ctx, ids);
  }
}

// Fallback used when the lock's PIN list can not be read: delete the PINs
// this app knows about, one by one.
async function revokeKnownOtherPins(ctx: PinContext, keepId: string) {
  const { data: rows, error } = await ctx.supabase
    .from("lock_passcodes")
    .select("id, tuya_password_id")
    .eq("lock_id", ctx.lock.id)
    .eq("status", "active")
    .neq("id", keepId);

  if (error) {
    console.error("Looking up older PINs failed:", {
      code: error.code,
      message: error.message,
    });
    return { replaced: 0, failed: 0, lookupFailed: true };
  }

  const removed: string[] = [];
  let failed = 0;

  for (const row of rows ?? []) {
    try {
      if (row.tuya_password_id) {
        await deleteTuyaPin(ctx.deviceId, ctx.accessToken, row.tuya_password_id);
      }
      removed.push(row.id);
    } catch (deleteError) {
      failed++;
      console.error("Could not delete older PIN from lock:", {
        code: deleteError instanceof TuyaApiError ? deleteError.code : null,
        message:
          deleteError instanceof TuyaApiError ? deleteError.tuyaMessage : null,
      });
    }
  }

  if (removed.length > 0) {
    await markPinsRevoked(ctx, removed);
  }

  return { replaced: removed.length, failed, pending: 0, lookupFailed: false };
}

// Deletes every other PIN from the lock so only the new one still works.
async function revokeOtherPins(
  ctx: PinContext,
  keepId: string,
  keepTuyaId: string,
) {
  const purge = await purgeLockPins(ctx, keepTuyaId);

  if (purge.listFailed) {
    return await revokeKnownOtherPins(ctx, keepId);
  }

  const { data: rows } = await ctx.supabase
    .from("lock_passcodes")
    .select("id, tuya_password_id")
    .eq("lock_id", ctx.lock.id)
    .eq("status", "active")
    .neq("id", keepId);

  const ids = (rows ?? [])
    .filter(
      (row: any) =>
        !row.tuya_password_id ||
        !purge.remainingIds.includes(String(row.tuya_password_id)),
    )
    .map((row: any) => row.id);

  if (ids.length > 0) {
    await markPinsRevoked(ctx, ids);
  }

  return {
    replaced: purge.deleted,
    failed: purge.remainingIds.length,
    pending: purge.pending,
    lookupFailed: false,
  };
}

async function handlePinAction(ctx: PinContext): Promise<Response> {
  try {
    const { action, body } = ctx;

    if (action === "pin_create") {
      const window = resolveWindow(body.validFrom, body.validUntil);

      if (!window) {
        return jsonResponse(
          { error: "Choose a valid time window (at least 1 minute, at most 1 year)." },
          400,
        );
      }

      const guestId =
        typeof body.guestId === "string" && UUID_PATTERN.test(body.guestId)
          ? body.guestId
          : null;

      const created = await createPinFlow(
        ctx,
        cleanLabel(body.label, "Guest PIN"),
        guestId,
        window,
      );

      // Create the new PIN first so access is never lost, then remove the rest.
      const cleanup =
        body.replaceOthers === true
          ? await revokeOtherPins(ctx, created.passcodeId, created.tuyaPasswordId)
          : { replaced: 0, failed: 0, pending: 0, lookupFailed: false };

      return jsonResponse({
        success: true,
        action,
        deviceId: ctx.deviceId,
        ...created,
        ...cleanup,
      });
    }

    if (action === "pin_modify") {
      const { row, error } = await loadPinRow(ctx, body.passcodeId);
      if (error) return error;

      if (!row.tuya_password_id) {
        return jsonResponse(
          { error: "This PIN was never sent to the lock. Revoke it and create a new one." },
          400,
        );
      }

      const window = resolveWindow(
        body.validFrom ?? row.valid_from,
        body.validUntil ?? row.valid_until,
      );

      if (!window) {
        return jsonResponse(
          { error: "Choose a valid time window (at least 1 minute, at most 1 year)." },
          400,
        );
      }

      const label = cleanLabel(body.label, row.label || "Guest PIN");

      await modifyTuyaPin(
        ctx.deviceId,
        ctx.accessToken,
        row.tuya_password_id,
        row.passcode,
        label,
        window.effective,
        window.invalid,
      );

      const { error: updateError } = await ctx.supabase
        .from("lock_passcodes")
        .update({
          label,
          valid_from: new Date(window.effective * 1000).toISOString(),
          valid_until: new Date(window.invalid * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (updateError) {
        throw new PinSaveError(
          "The lock was updated but the PIN record could not be saved.",
        );
      }

      return jsonResponse({ success: true, action, deviceId: ctx.deviceId });
    }

    if (action === "pin_revoke") {
      const { row, error } = await loadPinRow(ctx, body.passcodeId);
      if (error) return error;

      if (row.tuya_password_id) {
        await deleteTuyaPin(ctx.deviceId, ctx.accessToken, row.tuya_password_id);
      }

      await markPinsRevoked(ctx, [row.id]);

      return jsonResponse({ success: true, action, deviceId: ctx.deviceId });
    }

    if (action === "pin_regenerate") {
      const { row, error } = await loadPinRow(ctx, body.passcodeId);
      if (error) return error;

      const window = resolveWindow(null, row.valid_until);

      if (!window) {
        return jsonResponse(
          { error: "This PIN is about to expire or has expired. Create a new PIN instead." },
          400,
        );
      }

      // Create the replacement first so the guest is never left without access.
      const created = await createPinFlow(
        ctx,
        row.label || "Guest PIN",
        row.guest_id ?? null,
        window,
      );

      const cleanup = await revokeOtherPins(
        ctx,
        created.passcodeId,
        created.tuyaPasswordId,
      );

      return jsonResponse({
        success: true,
        action,
        deviceId: ctx.deviceId,
        ...created,
        ...cleanup,
      });
    }

    if (action === "pin_reset_all") {
      let clearError: unknown = null;

      try {
        await clearTuyaPins(ctx.deviceId, ctx.accessToken);
      } catch (error) {
        clearError = error;
      }

      // "Clear all" is not always reliable, so list what is really on the
      // lock, delete every remaining PIN one by one, then check again.
      const purge = await purgeLockPins(ctx, null);

      if (!purge.listFailed) {
        await markRevokedExcept(ctx, purge.remainingIds);

        return jsonResponse({
          success: true,
          action,
          deviceId: ctx.deviceId,
          deleted: purge.deleted,
          remaining: purge.remainingIds.length,
          pending: purge.pending,
          verified: !purge.verifyFailed,
        });
      }

      if (!clearError) {
        await markPinsRevoked(ctx, null);

        return jsonResponse({
          success: true,
          action,
          deviceId: ctx.deviceId,
          deleted: 0,
          remaining: 0,
          pending: 0,
          verified: false,
        });
      }

      // Both the list and clear-all failed: delete each PIN the app knows.
      console.warn("Clear-all and list failed; deleting known PINs one by one.");

      const { data: rows } = await ctx.supabase
        .from("lock_passcodes")
        .select("id, tuya_password_id")
        .eq("lock_id", ctx.lock.id)
        .eq("status", "active")
        .not("tuya_password_id", "is", null);

      const removed: string[] = [];
      let failedCount = 0;

      for (const row of rows ?? []) {
        try {
          await deleteTuyaPin(ctx.deviceId, ctx.accessToken, row.tuya_password_id);
          removed.push(row.id);
        } catch {
          failedCount++;
        }
      }

      if (removed.length > 0) {
        await markPinsRevoked(ctx, removed);
      }

      if (removed.length === 0 || failedCount > 0) {
        throw clearError;
      }

      return jsonResponse({
        success: true,
        action,
        deviceId: ctx.deviceId,
        deleted: removed.length,
        remaining: 0,
        pending: 0,
        verified: false,
      });
    }

    return jsonResponse({ error: "Unsupported action." }, 400);
  } catch (error) {
    if (error instanceof PinSaveError) {
      return jsonResponse({ error: error.message }, 500);
    }

    throw error;
  }
}

// ---------------------------------------------------------------------------
// NFC card and fingerprint enrollment (Tuya "unlocking method" APIs)
//
// Flow: create a Tuya device user -> put the lock into enrollment mode for
// that user -> the person taps the card / scans the finger ON THE LOCK ->
// the app polls credential_check, which saves the record only after Tuya
// reports the new credential on the lock.
// ---------------------------------------------------------------------------

const CREDENTIAL_ACTIONS = [
  "credential_start",
  "credential_check",
  "credential_cancel",
  "credential_revoke",
];

const CREDENTIAL_TYPES: Record<
  string,
  { table: string; nameColumn: string; defaultName: string }
> = {
  card: {
    table: "nfc_cards",
    nameColumn: "card_name",
    defaultName: "NFC card",
  },
  fingerprint: {
    table: "fingerprints",
    nameColumn: "fingerprint_name",
    defaultName: "Fingerprint",
  },
};

const TUYA_USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

class CredentialSaveError extends Error {}

function lockUserPath(deviceId: string, tuyaUserId: string): string {
  // user_type 2 = not a home user (what Tuya specifies for Wi-Fi locks).
  return `/v1.0/devices/${encodeDeviceId(deviceId)}/door-lock/user-types/2/users/${encodeURIComponent(tuyaUserId)}`;
}

async function deleteTuyaUser(
  deviceId: string,
  accessToken: string,
  tuyaUserId: string,
) {
  try {
    await tuyaRequest(
      "DELETE",
      `/v1.0/devices/${encodeDeviceId(deviceId)}/users/${encodeURIComponent(tuyaUserId)}`,
      accessToken,
    );
  } catch (error) {
    console.warn("Could not delete Tuya lock user:", {
      code: error instanceof TuyaApiError ? error.code : null,
      message: error instanceof TuyaApiError ? error.tuyaMessage : null,
    });
  }
}

async function deleteTuyaKey(
  deviceId: string,
  accessToken: string,
  tuyaUserId: string,
  unlockType: string,
  unlockNo: number,
) {
  await tuyaRequest(
    "DELETE",
    `${lockUserPath(deviceId, tuyaUserId)}/unlock-types/${unlockType}/keys/${unlockNo}`,
    accessToken,
  );
}

async function handleCredentialAction(ctx: PinContext): Promise<Response> {
  try {
    const { action, body } = ctx;

    const type = typeof body.type === "string" ? body.type : "";
    const config = CREDENTIAL_TYPES[type];

    if (!config && action !== "credential_revoke") {
      return jsonResponse({ error: "Unsupported credential type." }, 400);
    }

    if (action === "credential_start") {
      const name = cleanLabel(body.name, config.defaultName);

      // Tuya rejects duplicate user names on one device, so make each unique.
      const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 4);
      const nickName = `${name.slice(0, 13)}-${suffix}`;

      const created = await tuyaRequest(
        "POST",
        `/v1.0/devices/${encodeDeviceId(ctx.deviceId)}/user`,
        ctx.accessToken,
        { nick_name: nickName, sex: 1 },
      );

      // Tuya's reply shape varies by lock type, so accept the common forms.
      const result = created.result;
      const rawUserId =
        typeof result === "string" || typeof result === "number"
          ? result
          : result?.user_id ?? result?.userId ?? result?.id;

      const tuyaUserId = String(rawUserId ?? "");

      if (!TUYA_USER_ID_PATTERN.test(tuyaUserId)) {
        console.error("Unexpected create-user response:", JSON.stringify(result));
        throw new Error(
          `Tuya did not return a lock user ID (reply: ${JSON.stringify(result)?.slice(0, 150)}).`,
        );
      }

      const enterEnrollment = () =>
        tuyaRequest(
          "PUT",
          `/v1.0/devices/${encodeDeviceId(ctx.deviceId)}/door-lock/actions/entry`,
          ctx.accessToken,
          {
            user_id: tuyaUserId,
            user_type: 2,
            unlock_type: type,
          },
        );

      try {
        try {
          await enterEnrollment();
        } catch (error) {
          // 2328 = an earlier enrollment is still pending on the lock.
          // Cancel it, give the lock a moment, then retry once.
          if (
            error instanceof TuyaApiError &&
            numericTuyaCode(error.code) === 2328
          ) {
            for (const staleType of ["card", "fingerprint"]) {
              try {
                await tuyaRequest(
                  "PUT",
                  `/v1.0/devices/${encodeDeviceId(ctx.deviceId)}/door-lock/unlock-types/${staleType}/actions/cancel`,
                  ctx.accessToken,
                  {},
                );
              } catch (cancelError) {
                console.warn("Cancel stale enrollment failed:", {
                  type: staleType,
                  code:
                    cancelError instanceof TuyaApiError
                      ? cancelError.code
                      : null,
                });
              }
            }

            await new Promise((resolve) => setTimeout(resolve, 3000));
            await enterEnrollment();
          } else {
            throw error;
          }
        }
      } catch (error) {
        await deleteTuyaUser(ctx.deviceId, ctx.accessToken, tuyaUserId);
        throw error;
      }

      return jsonResponse({
        success: true,
        action,
        deviceId: ctx.deviceId,
        tuyaUserId,
      });
    }

    if (action === "credential_check") {
      const tuyaUserId =
        typeof body.tuyaUserId === "string" ? body.tuyaUserId : "";

      if (!TUYA_USER_ID_PATTERN.test(tuyaUserId)) {
        return jsonResponse({ error: "Invalid enrollment ID." }, 400);
      }

      // Already saved by an earlier check.
      const { data: existing } = await ctx.supabase
        .from(config.table)
        .select("id")
        .eq("lock_id", ctx.lock.id)
        .eq("tuya_user_id", tuyaUserId)
        .maybeSingle();

      if (existing) {
        return jsonResponse({
          success: true,
          action,
          enrolled: true,
          credentialId: existing.id,
        });
      }

      const keys = await tuyaRequest(
        "GET",
        `${lockUserPath(ctx.deviceId, tuyaUserId)}/assigned-keys?unlock_type=${type}`,
        ctx.accessToken,
      );

      const list: any[] = Array.isArray(keys.result?.unlock_keys)
        ? keys.result.unlock_keys
        : [];

      const key =
        list.find((item) => item?.unlock_type === type) ?? list[0];

      if (!key || key.unlock_no === undefined || key.unlock_no === null) {
        return jsonResponse({ success: true, action, enrolled: false });
      }

      const unlockNo = Number(key.unlock_no);
      const name = cleanLabel(body.name, config.defaultName);
      const guestId =
        typeof body.guestId === "string" && UUID_PATTERN.test(body.guestId)
          ? body.guestId
          : null;

      const { data: saved, error } = await ctx.supabase
        .from(config.table)
        .insert({
          property_id: ctx.lock.property_id,
          unit_id: ctx.lock.unit_id ?? null,
          lock_id: ctx.lock.id,
          guest_id: guestId,
          [config.nameColumn]: name,
          status: "active",
          registered_at: new Date().toISOString(),
          tuya_user_id: tuyaUserId,
          tuya_unlock_no: unlockNo,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Saving credential failed:", {
          code: error.code,
          message: error.message,
        });

        // Do not leave a working credential the app does not know about.
        try {
          await deleteTuyaKey(
            ctx.deviceId,
            ctx.accessToken,
            tuyaUserId,
            type,
            unlockNo,
          );
        } catch (cleanupError) {
          console.error("Could not remove unsaved credential:", cleanupError);
        }
        await deleteTuyaUser(ctx.deviceId, ctx.accessToken, tuyaUserId);

        throw new CredentialSaveError(
          `It was enrolled but could not be saved, so it was removed from the lock (${error.message}).`,
        );
      }

      return jsonResponse({
        success: true,
        action,
        enrolled: true,
        credentialId: saved.id,
      });
    }

    if (action === "credential_cancel") {
      const tuyaUserId =
        typeof body.tuyaUserId === "string" ? body.tuyaUserId : "";

      if (!TUYA_USER_ID_PATTERN.test(tuyaUserId)) {
        return jsonResponse({ error: "Invalid enrollment ID." }, 400);
      }

      try {
        await tuyaRequest(
          "PUT",
          `/v1.0/devices/${encodeDeviceId(ctx.deviceId)}/door-lock/unlock-types/${type}/actions/cancel`,
          ctx.accessToken,
          {},
        );
      } catch (error) {
        console.warn("Cancel enrollment failed:", {
          code: error instanceof TuyaApiError ? error.code : null,
          message: error instanceof TuyaApiError ? error.tuyaMessage : null,
        });
      }

      await deleteTuyaUser(ctx.deviceId, ctx.accessToken, tuyaUserId);

      return jsonResponse({ success: true, action, deviceId: ctx.deviceId });
    }

    if (action === "credential_revoke") {
      const credentialType = CREDENTIAL_TYPES[type];

      if (!credentialType) {
        return jsonResponse({ error: "Unsupported credential type." }, 400);
      }

      const credentialId = body.credentialId;

      if (typeof credentialId !== "string" || !UUID_PATTERN.test(credentialId)) {
        return jsonResponse({ error: "Invalid credential ID." }, 400);
      }

      const { data: row, error: loadError } = await ctx.supabase
        .from(credentialType.table)
        .select("id, status, tuya_user_id, tuya_unlock_no")
        .eq("id", credentialId)
        .eq("lock_id", ctx.lock.id)
        .maybeSingle();

      if (loadError) {
        return jsonResponse({ error: "Could not load the record." }, 500);
      }

      if (!row) {
        return jsonResponse({ error: "Record not found for this lock." }, 404);
      }

      if (row.status === "revoked") {
        return jsonResponse({ error: "Already revoked." }, 400);
      }

      if (row.tuya_user_id && row.tuya_unlock_no !== null) {
        await deleteTuyaKey(
          ctx.deviceId,
          ctx.accessToken,
          row.tuya_user_id,
          type,
          Number(row.tuya_unlock_no),
        );
        await deleteTuyaUser(ctx.deviceId, ctx.accessToken, row.tuya_user_id);
      }

      const { error: updateError } = await ctx.supabase
        .from(credentialType.table)
        .update({ status: "revoked" })
        .eq("id", row.id);

      if (updateError) {
        throw new CredentialSaveError(
          `It was removed from the lock but the record could not be updated (${updateError.message}).`,
        );
      }

      return jsonResponse({ success: true, action, deviceId: ctx.deviceId });
    }

    return jsonResponse({ error: "Unsupported action." }, 400);
  } catch (error) {
    if (error instanceof CredentialSaveError) {
      return jsonResponse({ error: error.message }, 500);
    }

    throw error;
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

  // Non-Tuya failures (our own code, crypto, parsing). These messages never
  // contain secrets, so return them to make problems diagnosable from the app.
  const detail =
    error instanceof Error && error.message
      ? error.message.slice(0, 200)
      : "Unknown error";

  console.error("Non-Tuya failure detail:", detail);

  return jsonResponse(
    { error: `Smart lock operation failed: ${detail}` },
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

    if (
      !["status", "lock", "unlock", ...PIN_ACTIONS, ...CREDENTIAL_ACTIONS]
        .includes(action)
    ) {
      return jsonResponse({ error: "Unsupported action." }, 400);
    }

    // Find the lock using the actual device_id column in your schema.
    const { data: locks, error: lockError } = await supabase
      .from("smart_locks")
      .select("id, property_id, unit_id, device_id")
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

    if (CREDENTIAL_ACTIONS.includes(action)) {
      return await handleCredentialAction({
        action,
        body: requestBody,
        supabase,
        lock: authorizedLock,
        deviceId: verifiedDeviceId,
        accessToken,
      });
    }

    if (PIN_ACTIONS.includes(action)) {
      return await handlePinAction({
        action,
        body: requestBody,
        supabase,
        lock: authorizedLock,
        deviceId: verifiedDeviceId,
        accessToken,
      });
    }

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