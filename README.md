# CleanOS — shared housekeeping management

**Aura Tradings, India · Developed by Aura Builds**

This branch implements the real-account, shared-workspace Android client. It is a
release candidate until the hosted database, email delivery, owner signing and
multiple-phone acceptance checks are complete. The earlier demo remains available.

## Start on your Android phone

1. Complete the [Supabase setup guide](docs/SUPABASE_SETUP.md), including both SQL
   migrations, confirmed email sign-in and the `cleanos-team://auth/callback` redirect.
2. [Download the shared CleanOS APK (31 MB)](https://github.com/pradyumnagavhankar5-web/clean-os-android/releases/download/shared-preview-7-1-6779dcc/CleanOS-team-preview.apk)
   for modern Android phones. The [24 MB compatibility APK](https://github.com/pradyumnagavhankar5-web/clean-os-android/releases/download/shared-preview-7-1-6779dcc/CleanOS-team-preview-armv7.apk)
   supports older 32-bit devices. The build, database tests and Android 16 emulator
   installation/sign-in-screen/callback checks passed for this candidate.
3. Create and confirm your account, then create an empty workspace or join using
   the code issued by your administrator. Real workspaces contain no sample data.
4. Add facilities, cleaning areas and products. Invite staff using their actual
   email addresses and assign their workspace roles.

The shared client uses Android package `in.auratradings.cleanos.team`, separate
from the device-local demo. Existing demo records are not automatically uploaded
or imported. Install the shared APK alongside the demo during acceptance testing.

The [30 MB demo APK](https://github.com/pradyumnagavhankar5-web/clean-os-android/releases/download/android-preview-5-1-50fb66e/CleanOS-preview.apk)
and [demo instructions](DEMO_README.md) remain available for comparison.

## Shared operations

- Supabase email/password accounts, PKCE confirmation/recovery and encrypted
  session storage using Expo SecureStore. Native S256 hashing and cryptographic
  randomness avoid relying on missing browser APIs in Hermes.
- Server-controlled admin, supervisor and cleaning-staff memberships. Invitations
  are hashed, expire and are bound to the intended verified email address.
- Facility/area setup and archiving, product catalogue setup and team management.
- Task assignment, explicit checklist state, completion rules and revision checks
  that reject stale edits from another phone.
- Shared or facility stock rooms, opening balances and atomic stock receipts/issues.
  Request IDs prevent a retried stock movement from changing the balance twice.
- INR, Indian dates, Asia/Kolkata timestamps, low-stock alerts and editable,
  recipient-free WhatsApp supply enquiries.

Writes require connectivity and server confirmation. The app refreshes when it
returns to the foreground, approximately once a minute while open, and on demand
with Refresh. It does not promise offline writes or instant push notifications.
Stock history shows the latest 200 movements per selected room; the database
retains the complete append-only ledger. Tasks currently load the visible
workspace task board; pagination is a future scaling improvement.

## Run checks in Codex Cloud

```sh
npm ci
npm run check
npm run test:database
npm run export:android
npx expo-doctor
```

The database checks use an isolated PostgreSQL 17 Docker container with test-only
Auth fixtures. They exercise real RLS, role checks, revisions and simultaneous
stock transactions. They do not create hosted users or send email.

```sh
npm start
npm run start:demo
```

The default is the shared client. `start:demo` explicitly selects the isolated
local sandbox. Modules remain compatible with Expo Go SDK 58; complete email-link
and Android signing acceptance tests use the standalone APK with its registered
callback scheme.

## Configuration and release

`src/config/cloud.ts` contains the public project URL and publishable key supplied
by the project owner. `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` can override these at build time. No
service-role key, database password or SMTP credential belongs in the app.

The Android candidate workflow builds one processor variant per APK to keep phone
downloads small, plus a separate x86_64 build used only for installation testing.
It verifies signatures, package/version, exact architecture, bundled JavaScript,
ZIP alignment and ARM64 ELF alignment, then checks a fresh Android 16 emulator
launch before publishing phone downloads. Preview-template signing is not a
production signing identity.

The [private signing guide](docs/ANDROID_SIGNING.md) prepares an owner-controlled
key and a manual GitHub workflow that signs an already tested candidate without
rebuilding or changing its app payload. No owner key has been generated yet.

Follow the [shared release checklist](docs/SHARED_RELEASE_CHECKLIST.md) before
operational distribution. Free Supabase capacity, inactivity and backup limits
need to be understood by the project owner; email delivery must work for the
actual staff addresses. Physical device and multiple-account acceptance remain
separate from build and emulator checks.

## Code layout

| Location | Responsibility |
|---|---|
| `src/auth/` | Real sign-in, secure session storage and email callbacks |
| `src/cloud/` | Scoped RPC adapter, canonical read model and shared setup screens |
| `supabase/migrations/` | Tenant tables, permissions, atomic commands and schema upgrades |
| `supabase/tests/` | PostgreSQL security, integrity and concurrency assertions |
| `src/domain/` | Reusable models, date formatting and pure demo rules |
| `src/state/DemoAppProvider.tsx` | Explicitly isolated local sample-data mode |
| `src/screens/`, `src/ui/` | Operational forms, navigation and reusable components |
