# SECURTAP improvements included

## Updated files
- `src/screens/LockManagementScreen.js`
  - Adds automatic status polling every ~30 seconds plus Supabase Realtime refreshes.
  - Adds a Manage modal with lock information and existing PIN records.
  - Adds creation/revocation of PIN *records* in `lock_passcodes`.
  - Adds a Remove action for the SECURTAP database record, with a warning that this does not unpair Tuya or erase the physical lock's credentials.
- `src/screens/DashboardScreen.js`
  - Replaces the Active Units metric with Pending Guests (guest status `reserved`).
  - Upcoming Check-ins now lists only reserved guests.
  - Uses activity title/activity_type as a fallback for recent activity labels.

## Important limitations (do not skip)
1. The current `tuya-lock-status` Edge Function supports only `status`, `lock`, and `unlock`. It does not currently program/delete keypad PINs, enroll NFC cards, enroll fingerprints, or report failed PIN attempts. This UI therefore labels PIN operations as database-only records and does not claim that a PIN was programmed into the physical lock.
2. Do not share generated PIN records with guests until a supported Tuya X6PRO PIN API is implemented and a successful hardware response is verified. The current schema stores PINs as plain text; for production, avoid storing reusable PINs in plaintext and implement appropriate access policies/backend handling.
3. NFC/fingerprint enrollment requires the lock's supported Tuya API and actual lock-side enrollment workflow. A phone's fingerprint sensor or NFC reader cannot by itself enroll credentials into the lock.
4. A five-attempt/five-minute cooldown cannot reliably be enforced from the app unless failed-attempt events are available. Implement this on the backend/lock after confirming event support; a client-only cooldown is bypassable.
5. Review Supabase RLS for `lock_passcodes`, `nfc_cards`, and `fingerprints`. The schema report showed no policies for these tables. If RLS is enabled without policies, the new PIN record operations will be denied; do not disable RLS globally to make them work.
6. Polling status can consume Tuya API quota. Adjust the 30-second interval to match your project's quota and lock responsiveness.

## Apply and test
1. Back up your current project.
2. Extract this ZIP to a separate folder first; don't overwrite the working copy until reviewed.
3. Run `npm install` if needed, then `npx expo start -c`.
4. Test with a non-critical lock: list/status polling, open Manage, create a PIN record, revoke its database record, and remove only a test lock record.
5. Verify the Tuya physical lock still reports its real status. The PIN UI in this version does not alter physical keypad credentials.
