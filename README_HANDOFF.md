# Random Client mobile app handoff

This is the updated Expo React Native source. See `../SECURTAP_AUDIT_REPORT.md` for changes, setup requirements, testing status, and remaining work.

## Before running

1. Install Node.js compatible with the Expo SDK in `package.json`.
2. Run `npm ci` in this folder.
3. In Supabase Authentication → URL Configuration, allow-list `securtapp://auth/callback` and `securtapp://auth/reset-password`.
4. Confirm the Supabase signup email template uses a confirmation link compatible with the app's redirect URL.
5. Build and install a native app after the scheme change; then test links from a real inbox.
6. Deploy `supabase/functions/tuya-lock-status` after configuring its Tuya secrets and checking the project's RLS policies.

The existing Supabase URL and anon key are client-side values and were preserved. Do not add a Supabase service-role key or Tuya secret to the mobile app.
