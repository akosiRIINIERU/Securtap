// Saves in-app notifications and sends Expo push notifications.
// Must be called with a service-role Supabase client.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Notice = {
  adminId: string;
  title: string;
  body: string;
  type: string;
  entryLogId?: string | null;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN_PATTERN = /^Expo(nent)?PushToken\[.+\]$/;

export async function sendNotices(admin: SupabaseClient, notices: Notice[]) {
  if (notices.length === 0) return;

  // 1) In-app inbox.
  const { error: inboxError } = await admin.from("app_notifications").insert(
    notices.map((n) => ({
      admin_id: n.adminId,
      entry_log_id: n.entryLogId ?? null,
      title: n.title,
      body: n.body,
      notification_type: n.type,
      is_read: false,
    })),
  );

  if (inboxError) {
    console.error("Saving app notifications failed:", {
      code: inboxError.code,
      message: inboxError.message,
    });
  }

  // 2) Push to every registered device of each recipient.
  const adminIds = [...new Set(notices.map((n) => n.adminId))];

  const { data: tokens, error: tokenError } = await admin
    .from("admin_push_tokens")
    .select("admin_id, expo_push_token")
    .in("admin_id", adminIds);

  if (tokenError) {
    console.error("Loading push tokens failed:", { message: tokenError.message });
    return;
  }

  const messages: any[] = [];

  for (const notice of notices) {
    for (const row of tokens ?? []) {
      if (row.admin_id !== notice.adminId) continue;
      if (!EXPO_TOKEN_PATTERN.test(row.expo_push_token)) continue;

      messages.push({
        to: row.expo_push_token,
        title: notice.title,
        body: notice.body,
        sound: "default",
        priority: "high",
        channelId: "default",
        data: { type: notice.type, entryLogId: notice.entryLogId ?? null },
      });
    }
  }

  const deadTokens: string[] = [];

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();
      const tickets: any[] = Array.isArray(result?.data) ? result.data : [];

      tickets.forEach((ticket, index) => {
        if (ticket?.status === "error") {
          console.warn("Expo push error:", {
            error: ticket?.details?.error ?? null,
            message: ticket?.message ?? null,
          });

          if (ticket?.details?.error === "DeviceNotRegistered") {
            deadTokens.push(chunk[index].to);
          }
        }
      });
    } catch (error) {
      console.error("Expo push request failed:", error instanceof Error ? error.message : error);
    }
  }

  if (deadTokens.length > 0) {
    await admin.from("admin_push_tokens").delete().in("expo_push_token", deadTokens);
  }
}
