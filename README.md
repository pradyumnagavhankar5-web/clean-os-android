# CleanOS

**Smart Housekeeping Management · Aura Tradings, India**

Source repository: [pradyumnagavhankar5-web/clean-os-android](https://github.com/pradyumnagavhankar5-web/clean-os-android).

An Android-only housekeeping prototype built with Expo SDK 58, React Native,
TypeScript and Expo Router. It runs in a compatible Expo Go app without Android
Studio, a laptop, API keys or a paid service.

## What works

- Welcome screen and clearly labelled demo role selection.
- A dashboard calculated from saved tasks and inventory, including today's
  completion percentage and low-stock warnings.
- Facilities and cleaning areas, with links to their tasks.
- Create, edit and assign tasks; set dates and priorities; search and filter by
  status, priority, date and area. Complete checklists before completing a task.
- Inventory search and category filters, stock receipts/issues, movement history
  and editable low-stock thresholds. Stock cannot go below zero.
- A WhatsApp reorder enquiry with selectable products, editable quantities and a
  message preview. You choose a verified recipient in WhatsApp and send it there.
  No business phone number is hardcoded; opening the enquiry does not place an order.
- Profile, role switching, explicit demo reset, and loading/error/empty states.

Demo facilities include an office, housing society and clinic in Pune. The initial
catalogue contains tissues, floor cleaner, toilet cleaner, handwash, dishwash,
garbage bags and gloves. Prices are illustrative INR values, not supplier quotes.
Dates use Indian formats and Asia/Kolkata. Enter task dates as **DD/MM/YYYY**.

## First preview from your Android phone

Use an active cloud workspace connected to this repository. Open its terminal, or
ask Codex to run these commands from the repository folder containing
`package.json` and keep the server running:

```sh
npm ci
npm run start:tunnel
```

The workspace needs Node.js and npm; Node 24 is suitable. `npm ci` installs the
exact dependency versions in `package-lock.json`.

1. Install **Expo Go** from the Google Play Store and use a version compatible
   with Expo SDK 58.
2. Wait for Expo to display the tunnel URL and QR code in the cloud terminal.
3. On the same phone, copy the complete `exp://...` URL into Expo Go's URL entry,
   if available, or tap an Expo Go link provided by the terminal. You cannot scan a
   QR code displayed on your own phone with that phone's camera. If using another
   screen, scan the QR code instead.
4. Keep the cloud workspace and development server running while you preview.
   Stop the server later with **Ctrl+C** in its terminal.

The tunnel script explicitly selects ngrok and Expo Go. It avoids the Expo-account
requirement of SDK 58's default signed tunnel. The ngrok helper is included as a
development dependency. If the CLI requests it after a partial installation,
stop it and reinstall it in the project:

```sh
npx expo install --dev @expo/ngrok
npm run start:tunnel
```

Tunnel connectivity depends on the cloud host, network and ngrok availability.
Some Codex Cloud sessions do not keep a server accessible after the task ends. A
finished Codex task is not permanent app hosting. If your workspace cannot keep
the tunnel alive, use a browser-based persistent development workspace such as
GitHub Codespaces, within its available free quota, or make the optional preview
APK described below. Neither option requires Android Studio or a laptop.

**Your next action:** open this repository in an active cloud workspace, run
`npm ci` followed by `npm run start:tunnel`, then open its `exp://` link in Expo Go.

## Try the complete demo

1. Tap **Explore the demo**, select **Facility Admin**, then continue.
2. Open **Tasks → New task**. Choose a facility, area, staff member and today's
   date; add a checklist and tap **Create and assign task**.
3. Open the task, tap **Start task**, check its steps, then **Complete task**.
   Return to the dashboard to see the totals update. Use **Edit** to change its
   assignment, priority or other details.
4. Open the **Stock** tab (Inventory). Search for floor cleaner, record **Stock in** or **Stock
   out**, and check the movement history. Set **Edit threshold** equal to the
   available quantity: the item should show **Low stock**.
5. Tap **Prepare reorder enquiry**, adjust products and quantities, review the
   preview, then tap **Open WhatsApp enquiry**. Choose your verified supplier
   contact there. Sending a real message is your choice.
6. Open **Profile → Switch demo role** and choose **Cleaning Staff** with a staff
   member. Only their tasks can be updated; inventory is view only. Admin and
   supervisor roles can both manage tasks and stock in this MVP.
7. Reload the app to confirm your changes and selected role remain saved.

The detailed device checklist is in
[docs/ANDROID_TEST_CHECKLIST.md](docs/ANDROID_TEST_CHECKLIST.md). Android device
testing must be performed separately; a successful JavaScript export does not
prove that every interaction works on a physical phone.

## How saving and demo access work

AsyncStorage saves one validated, versioned snapshot on this device. Each change
is saved before it is shown as successful, and writes are queued to avoid losing
rapid changes. Bad saved data produces a recovery screen instead of being silently
overwritten. You can retry loading or explicitly replace it with fresh demo data.

Data is **unencrypted**, local to this installation and not synced or backed up.
Use sample information. Clearing Expo Go/app storage or uninstalling may erase it.
**Profile → Reset demo data** also erases your local changes after confirmation.
Seed task dates are relative to the day data is first created or reset; they do
not automatically reschedule on later days.

Roles simulate permissions for demonstration. They are not authentication or a
security boundary. Facilities, staff and the product catalogue are seeded; this
version does not offer administration screens for adding them. There is no live
backend, multi-user sync, payments, AI feature or push notification service.

## Run checks in the cloud terminal

```sh
npm run check
npm run export:android
```

`check` runs ESLint, TypeScript and automated domain/repository/store tests.
`export:android` checks Android JavaScript bundling and writes generated output to
the ignored `dist/` folder. It creates neither an APK nor a Play Store release.

Individual commands are `npm run lint`, `npm run typecheck` and `npm test`.
`npx expo-doctor` checks Expo package and configuration compatibility.
In a cloud environment using an HTTP proxy, Node 24 may need
`NODE_USE_ENV_PROXY=1 npx expo-doctor` for those online checks.
See [docs/VALIDATION.md](docs/VALIDATION.md) for checks actually completed and the
remaining device verification.

## Optional Android builds later

The included `eas.json` defines preview APK, development-client APK and production
AAB profiles. These are cloud builds; no Android Studio is needed. An Expo account
is required. Free build quotas may be available, with queues and limits; verify
current Expo pricing before requesting builds. Paid services are not required for
the Expo Go prototype.

Before a release, confirm ownership and uniqueness of the configured Android
package **`in.auratradings.cleanos`** in `app.json`; it is a proposed identifier.

For a standalone preview APK that works without the running development server:

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
git diff -- app.json eas.json package.json package-lock.json
npx eas-cli@latest build --platform android --profile preview
```

Choose Android when asked. EAS may link/create an Expo project and offer to manage
Android signing credentials. Review the configuration changes before committing.
After a successful build, open the Expo build page on your phone, download the APK
and install it. Android may ask permission to install from that browser.

A development-client build is optional and requires its package first:

```sh
npx expo install expo-dev-client
npx eas-cli@latest build --platform android --profile development
npx expo start --dev-client --tunnel ngrok
```

Install that APK before opening the development-client link. It still needs a
reachable running development server. Commit the package and lockfile changes.

For a future Google Play release:

```sh
npx eas-cli@latest build --platform android --profile production
```

This produces an AAB after a successful build. Publishing requires separate Play
Console registration, fees and release preparation. No EAS or device build is
claimed by these instructions.

## Project structure and future Supabase integration

```text
src/app/       Expo Router routes and navigation
src/screens/   Screen UI and forms
src/ui/        Shared accessible components and theme
src/domain/    Types, validation, actions, metrics, demo seed and tests
src/data/      Repository interface and active AsyncStorage adapter
src/state/     React provider, queued persistent store and tests
```

The data adapter boundary is ready for further development, but Supabase is not
connected. See [src/data/README.md](src/data/README.md). A production integration
still needs database migrations, real authentication, organisation membership,
server-enforced row-level security, atomic stock transactions and sync/conflict
handling. Do not put privileged backend keys in the app.

## Troubleshooting

- **Expo Go says the SDK is unsupported:** update Expo Go and confirm it supports
  SDK 58. Follow Expo's compatibility guidance if the Play Store build is not yet
  compatible; use an EAS preview APK if needed.
- **Phone cannot connect:** use the tunnel URL, not a cloud machine's private LAN
  address. Check both devices' internet access, keep the server active, and retry
  `npm run start:tunnel`. A tunnel cannot be guaranteed on every cloud host.
- **Stale JavaScript after a change:** stop the server and run
  `npm run start:tunnel -- --clear`.
- **Saved demo cannot load:** try **Retry loading**. If you accept losing local
  demo changes, use **Replace with fresh demo** and confirm. Do not clear storage
  just to fix a connection problem.
- **A save fails:** free device storage and retry. The app keeps the last
  successfully saved state.
- **WhatsApp does not open:** install WhatsApp or use a compatible browser. The
  enquiry uses a recipient-free `https://wa.me/?text=...` URL.
- **GitHub CLI authentication fails:** CLI credentials and the connected GitHub
  integration can have different access. Use the workspace's connected GitHub
  integration or configure CLI access through your account settings. Do not paste
  passwords or tokens into the app or commit them.
