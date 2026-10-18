# Lock status, PIN, NFC, and fingerprint notes

## Changes in this update
- Removed the manual Refresh button from each lock card.
- Changed the background status polling interval from 30 seconds to 1 second.
- Kept background refresh silent so it does not replace the lock list with a loading screen.

## Important Tuya API caution
One-second polling sends frequent status requests to Tuya for every registered lock. Depending on your Tuya cloud/API plan and the lock's supported reporting behavior, this may be rate-limited or delayed. A Tuya device status notification/webhook is preferable for genuinely fast status updates if available for this device and account.

## PIN RLS error
The error `42501: new row violates row-level security policy for table lock_passcodes` means the authenticated Supabase user is not allowed by the table's current INSERT policy. Do not disable RLS or add an unrestricted `WITH CHECK (true)` policy. The correct policy must match the actual ownership model in this project's schema (for example, the logged-in admin's property ownership). Inspect the table's columns, foreign keys, and existing RLS policies before adding a narrowly scoped policy. Until that is done, PIN record creation can still fail.

Even after a database insert works, this UI's generated PIN is only a database record. The current Tuya Edge Function implements status/lock/unlock only; it does not program a PIN into the physical lock.

## NFC and fingerprint enrollment
The app does not currently implement hardware enrollment for NFC cards or fingerprints. A working flow needs confirmed Tuya/X6PRO API support and a way to put the lock into enrollment mode, receive enrollment results, and save only confirmed credentials. The UI must not report success until the physical lock confirms enrollment.
