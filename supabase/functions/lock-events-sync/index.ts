// Scheduled function: asks Tuya for new lock events, battery and online
// status, stores them, and notifies admins. Called every minute by pg_cron.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTuyaAccessToken, tuyaRequest, TuyaApiError } from "../_shared/tuya.ts";
import { sendNotices, type Notice } from "../_shared/notify.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SYNC_SECRET = Deno.env.get("SYNC_SECRET") ?? "";

// Only events from the last 15 minutes are looked at; duplicates are ignored
// by a unique index, so overlapping runs never notify twice.
const LOOKBACK_MS = 15 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const BATTERY_CODES = ["residual_electricity", "battery_percentage", "battery_state"];

const METHOD_LABELS: Record<string, string> = {
  unlock_fingerprint: "fingerprint",
  unlock_password: "PIN",
  unlock_temporary: "temporary PIN",
  unlock_dynamic: "dynamic PIN",
  unlock_card: "NFC card",
  unlock_face: "face recognition",
  unlock_key: "mechanical key",
  unlock_identity_card: "ID card",
  unlock_emergency: "emergency code",
  unlock_app: "the app",
  unlock_phone_remote: "the app",
  unlock_remote: "the app",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errInfo(error: unknown) {
  if (error instanceof TuyaApiError) {
    return { code: error.code, message: error.tuyaMessage, path: error.path };
  }
  return { message: error instanceof Error ? error.message : String(error) };
}

function toMs(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > 1e12 ? n : n * 1000;
}

function itemTimeMs(item: any): number | null {
  for (const key of [
    "update_time", "time", "create_time", "gmt_create", "event_time",
    "open_time", "unlock_time", "timestamp", "date",
  ]) {
    const ms = toMs(item?.[key]);
    if (ms) return ms;
  }
  return null;
}

function pickList(result: any): any[] {
  if (Array.isArray(result?.logs)) return result.logs;
  if (Array.isArray(result?.records)) return result.records;
  if (Array.isArray(result)) return result;
  return [];
}

function userNameOf(item: any): string | null {
  const name = item?.nick_name ?? item?.user_name ?? item?.userName ?? item?.name ?? null;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function alarmText(code: string, value: unknown): string {
  const v = String(value ?? "").toLowerCase();
  const c = code.toLowerCase();

  if (c.includes("hijack") || v.includes("hijack")) return "Duress code used";
  if (c.includes("doorbell")) return "Doorbell pressed";
  if (c.includes("tamper") || v.includes("tamper")) return "Tamper alert";
  if (v.includes("wrong_password") || v.includes("wrong_pass")) return "Wrong PIN entered several times";
  if (v.includes("wrong_finger")) return "Wrong fingerprint used several times";
  if (v.includes("wrong_card")) return "Unknown card used several times";
  if (v.includes("battery") || c.includes("battery")) return "Lock battery is low";
  if (v.includes("unclosed") || c.includes("unclosed")) return "Door was left unlocked";
  return `Lock alert: ${code}${value !== undefined && value !== null ? ` (${value})` : ""}`;
}

async function fetchLogs(
  label: string,
  attempts: string[],
  token: string,
  errors: unknown[],
): Promise<any[]> {
  for (const path of attempts) {
    try {
      const data = await tuyaRequest("GET", path, token);
      return pickList(data.result);
    } catch (error) {
      errors.push({ api: label, ...errInfo(error) });
    }
  }
  return [];
}

type LockRow = {
  id: string;
  property_id: string | null;
  unit_id: string | null;
  lock_name: string | null;
  device_id: string;
  battery_level: number | null;
  low_battery_notified_at: string | null;
  offline_notified: boolean | null;
};

async function syncLock(
  admin: ReturnType<typeof createClient>,
  lock: LockRow,
  recipients: string[],
  token: string,
  debug: boolean,
) {
  const id = encodeURIComponent(lock.device_id);
  const name = lock.lock_name || "Your lock";
  const notices: Notice[] = [];
  const errors: unknown[] = [];
  const report: Record<string, unknown> = { lock: name };
  const now = Date.now();
  const lockUpdates: Record<string, unknown> = {};

  // ---- online / offline -------------------------------------------------
  try {
    const info = await tuyaRequest("GET", `/v1.0/devices/${id}`, token);
    const online = info.result?.online;
    report.online = online;

    if (online === false && !lock.offline_notified) {
      lockUpdates.offline_notified = true;
      for (const adminId of recipients) {
        notices.push({ adminId, type: "lock_offline", title: "Lock offline", body: `${name} lost its connection.` });
      }
    } else if (online === true) {
      lockUpdates.last_seen_at = new Date().toISOString();
      if (lock.offline_notified) {
        lockUpdates.offline_notified = false;
        for (const adminId of recipients) {
          notices.push({ adminId, type: "lock_online", title: "Lock back online", body: `${name} is connected again.` });
        }
      }
    }
  } catch (error) {
    errors.push({ api: "device-info", ...errInfo(error) });
  }

  // ---- battery ----------------------------------------------------------
  try {
    const status = await tuyaRequest("GET", `/v1.0/devices/${id}/status`, token);
    const items: any[] = Array.isArray(status.result) ? status.result : [];
    const entry = items.find((item) => BATTERY_CODES.includes(item?.code));
    const raw = entry?.value;
    report.batteryRaw = raw ?? null;

    let level: number | null = null;
    if (typeof raw === "number" && raw >= 0 && raw <= 100) level = Math.round(raw);
    else if (raw === "low") level = 15;
    else if (raw === "middle") level = 50;
    else if (raw === "high") level = 90;

    if (level !== null) {
      if (level !== lock.battery_level) lockUpdates.battery_level = level;

      const last = lock.low_battery_notified_at ? Date.parse(lock.low_battery_notified_at) : 0;
      const cooldown = level <= 10 ? 6 * HOUR : 24 * HOUR;

      if (level <= 20 && now - last > cooldown) {
        lockUpdates.low_battery_notified_at = new Date(now).toISOString();
        for (const adminId of recipients) {
          notices.push({
            adminId,
            type: "low_battery",
            title: level <= 10 ? "Battery critically low" : "Battery low",
            body: `${name} battery is at ${level}%. Replace the batteries soon.`,
          });
        }
      } else if (level > 30 && lock.low_battery_notified_at) {
        lockUpdates.low_battery_notified_at = null;
      }
    }
  } catch (error) {
    errors.push({ api: "status", ...errInfo(error) });
  }

  // ---- door events ------------------------------------------------------
  const since = now - LOOKBACK_MS;

  const openLogs = await fetchLogs(
    "open-logs",
    [
      `/v1.1/devices/${id}/door-lock/open-logs?page_no=1&page_size=20&start_time=${since}&end_time=${now}`,
      `/v1.0/devices/${id}/door-lock/open-logs?page_no=1&page_size=20&start_time=${Math.floor(since / 1000)}&end_time=${Math.floor(now / 1000)}`,
    ],
    token,
    errors,
  );

  const alarmLogs = await fetchLogs(
    "alarm-logs",
    [
      `/v1.1/devices/${id}/door-lock/alarm-logs?page_no=1&page_size=20`,
      `/v1.0/devices/${id}/door-lock/alarm-logs?page_no=1&page_size=20`,
    ],
    token,
    errors,
  );

  if (debug) {
    report.openLogsSample = openLogs.slice(0, 2);
    report.alarmLogsSample = alarmLogs.slice(0, 2);
  }

  type Ev = {
    recordId: string;
    timeMs: number;
    eventType: string;
    method: string | null;
    result: string;
    guest: string | null;
    title: string;
    body: string;
    notifType: string;
    raw: unknown;
  };

  const events: Ev[] = [];

  for (const item of openLogs) {
    const timeMs = itemTimeMs(item);
    if (!timeMs || timeMs < since) continue;

    const code = String(item?.status?.code ?? item?.code ?? item?.dp_code ?? item?.unlock_type ?? "unlock");
    const value = item?.status?.value ?? item?.value ?? "";
    const methodLabel = METHOD_LABELS[code] ?? code.replace(/^unlock_/, "").replace(/_/g, " ");
    const guest = userNameOf(item);
    const recordId = `open:${item?.log_id ?? item?.id ?? item?.record_id ?? `${code}|${value}|${timeMs}`}`;

    events.push({
      recordId,
      timeMs,
      eventType: "unlock",
      method: code,
      result: "success",
      guest,
      title: "Door unlocked",
      body: `${name} was unlocked with ${methodLabel}${guest ? ` (${guest})` : ""}.`,
      notifType: "unlock",
      raw: item,
    });
  }

  for (const item of alarmLogs) {
    const timeMs = itemTimeMs(item) ?? now;
    if (timeMs < since) continue;

    const code = String(item?.dp_code ?? item?.code ?? item?.status?.code ?? "alarm");
    const value = item?.value ?? item?.dp_value ?? item?.status?.value;
    const recordId = `alarm:${item?.log_id ?? item?.id ?? item?.record_id ?? `${code}|${value}|${timeMs}`}`;

    events.push({
      recordId,
      timeMs,
      eventType: "alert",
      method: null,
      result: "alert",
      guest: null,
      title: "Lock alert",
      body: `${name}: ${alarmText(code, value)}.`,
      notifType: "alert",
      raw: item,
    });
  }

  report.eventsInWindow = events.length;

  for (const ev of events) {
    const rows = recipients.map((adminId) => ({
      admin_id: adminId,
      lock_device_id: lock.id,
      property_id: lock.property_id,
      guest_name: ev.guest,
      event_type: ev.eventType,
      access_method: ev.method,
      result: ev.result,
      event_time: new Date(ev.timeMs).toISOString(),
      tuya_record_id: ev.recordId,
      raw_event: ev.raw,
    }));

    // Rows that already exist are skipped, so only new events come back.
    const { data: inserted, error } = await admin
      .from("entry_logs")
      .upsert(rows, { onConflict: "admin_id,lock_device_id,tuya_record_id", ignoreDuplicates: true })
      .select("id, admin_id");

    if (error) {
      errors.push({ api: "entry_logs", code: error.code, message: error.message });
      continue;
    }

    if (!inserted || inserted.length === 0) continue;

    for (const row of inserted) {
      notices.push({
        adminId: row.admin_id,
        entryLogId: row.id,
        type: ev.notifType,
        title: ev.title,
        body: ev.body,
      });
    }

    // One dashboard activity per event.
    const { error: activityError } = await admin.from("activity_logs").insert({
      admin_id: recipients[0],
      property_id: lock.property_id,
      unit_id: lock.unit_id,
      lock_id: lock.id,
      activity_type: ev.eventType === "unlock" ? "door_unlocked" : "lock_alert",
      title: ev.title,
      description: ev.body,
      authentication_method: ev.method,
      status: ev.result,
    });

    if (activityError) {
      errors.push({ api: "activity_logs", code: activityError.code, message: activityError.message });
    }
  }

  if (Object.keys(lockUpdates).length > 0) {
    const { error } = await admin.from("smart_locks").update(lockUpdates).eq("id", lock.id);
    if (error) errors.push({ api: "smart_locks", code: error.code, message: error.message });
  }

  await sendNotices(admin, notices);

  report.notificationsSent = notices.length;
  if (errors.length > 0) report.errors = errors;
  return report;
}

Deno.serve(async (request) => {
  if (!SYNC_SECRET || request.headers.get("x-sync-secret") !== SYNC_SECRET) {
    return json({ error: "Unauthorized." }, 401);
  }

  let debug = false;
  try {
    debug = (await request.json())?.debug === true;
  } catch {
    // no body
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: locks, error } = await admin
    .from("smart_locks")
    .select("id, property_id, unit_id, lock_name, device_id, battery_level, low_battery_notified_at, offline_notified")
    .not("device_id", "is", null);

  if (error) {
    console.error("Loading locks failed:", { code: error.code, message: error.message });
    return json({ error: "Could not load locks." }, 500);
  }

  const propertyIds = [...new Set((locks ?? []).map((l) => l.property_id).filter(Boolean))];

  const { data: properties } = await admin
    .from("properties")
    .select("id, created_by, admin_id")
    .in("id", propertyIds);

  const recipientsByProperty = new Map<string, string[]>();
  for (const property of properties ?? []) {
    recipientsByProperty.set(
      property.id,
      [...new Set([property.created_by, property.admin_id].filter(Boolean))] as string[],
    );
  }

  let token: string;
  try {
    token = await getTuyaAccessToken();
  } catch (e) {
    console.error("Tuya token failed:", errInfo(e));
    return json({ error: "Tuya authentication failed." }, 502);
  }

  const reports: unknown[] = [];

  for (const lock of (locks ?? []) as LockRow[]) {
    const recipients = recipientsByProperty.get(lock.property_id ?? "") ?? [];

    if (recipients.length === 0) continue;

    try {
      reports.push(await syncLock(admin, lock, recipients, token, debug));
    } catch (e) {
      console.error("Lock sync failed:", { lock: lock.id, ...errInfo(e) });
      reports.push({ lock: lock.lock_name, error: errInfo(e).message });
    }
  }

  return json({ success: true, locks: reports.length, ...(debug ? { reports } : {}) });
});
