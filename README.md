# CleanOS

**Smart Housekeeping Management · Aura Tradings, India**

Developed by **Aura Builds**.

Source repository: [pradyumnagavhankar5-web/clean-os-android](https://github.com/pradyumnagavhankar5-web/clean-os-android).

An Android-only housekeeping prototype built with Expo SDK 58, React Native,
TypeScript and Expo Router. The standalone preview APK runs on your phone without
Expo Go, an Expo account or a running development server. You do not need Android
Studio, a laptop or API keys to install it.

**GitHub shows the project's source code and instructions.** To use the Android
app, install the **preview APK** below. Expo Go is an optional development route.
The local demo needs no Supabase connection, account or secret keys. Supabase is
an optional future integration.

## Install the Android preview APK

1. On your phone, open the repository's
   [Android preview downloads](https://github.com/pradyumnagavhankar5-web/clean-os-android/releases).
2. Open the newest preview release, expand **Assets** if needed, and download
   **`CleanOS-preview.apk`**.
3. Open the APK from your phone's **Downloads**. If Android asks, allow that
   browser or Files app to install it, then tap **Install**.
4. Launch **CleanOS**, tap **Explore the demo**, and choose a demo role.

If CleanOS is already installed, open the new APK and choose **Update**. Keep the
existing app installed to retain your locally saved demo tasks and stock changes.
Version 1.0.1 adds the house-and-checkmark logo, Aura Builds developer credit and
refined layouts across the app. The business remains Aura Tradings, India.

The download appears only after the
[Android preview workflow](https://github.com/pradyumnagavhankar5-web/clean-os-android/actions/workflows/android-preview.yml)
finishes successfully. If there is no preview asset yet, check that workflow's
latest run; a build in progress is not an available APK.

This workflow uses GitHub Actions for this public repository and requires no Expo
or EAS credentials. It also saves the APK as a workflow artifact. Repository or
account restrictions can affect Actions availability.

The APK bundles the app code, so you can open the local demo without a preview
server. WhatsApp enquiries still require a compatible app or browser and internet
access. Demo data stays on the device and does not sync.

**Preview signing:** this build uses the generated Android template's debug
signing certificate for testing with sample information. It is not a production
signing identity or a Google Play release. Production distribution requires your
own signing key and release preparation. Physical phone testing is recorded
separately in [the Android checklist](docs/ANDROID_TEST_CHECKLIST.md).

## First preview from your Android phone

This optional route is for developing with Expo Go. For a simple installed demo,
use the [Android preview APK](#install-the-android-preview-apk) above.

1. Install **Expo Go for SDK 58**. If the Play Store version does not yet support
   SDK 58, get the matching Android build from the
   [official Expo download page](https://expo.dev/go?device=true&platform=android&sdkVersion=58).
   A verified official [Expo Go 58.0.5 Android APK](https://github.com/expo/expo-go-releases/releases/download/Expo-Go-58.0.5/Expo-Go-58.0.5.apk)
   is also available. This installs Expo Go; open CleanOS with the server link below.
2. In an active cloud workspace connected to this repository, open its terminal
   or ask Codex to run the following from the folder containing `package.json`:

   ```sh
   npm ci
   npm run start:tunnel
   ```

3. Wait for the terminal to report that the tunnel is ready and display an
   `exp://...` URL. On the same phone, copy that complete URL into Expo Go's URL entry,
   if available, or tap an Expo Go link provided by the terminal. You cannot scan a
   QR code displayed on your own phone with that phone's camera. If using another
   screen, scan the QR code instead.
4. Keep the cloud workspace and development server running while you preview.
   Stop the server later with **Ctrl+C** in its terminal.

Node 24 is suitable for the cloud workspace. `npm ci` installs the locked package
versions. The tunnel script selects ngrok and Expo Go; its helper is included.

**Preview availability:** a link works only while a reachable server is running.
The earlier ngrok attempts in this Codex workspace failed; no live Expo Go preview
URL is provided here. Cloud sessions may stop serving when a task ends. If
your host cannot maintain a tunnel, use a persistent browser workspace such as
GitHub Codespaces within its available free quota, or install the
[Android preview APK](#install-the-android-preview-apk). These paths work without
a laptop or Android Studio.

If a specific step fails, use the matching entry in the
[troubleshooting guide](docs/TROUBLESHOOTING.md). That guide lists possible
symptoms and recovery steps; it is not a list of confirmed app defects.

## What the demo includes

- Demo role selection, facilities and cleaning areas, and a dashboard calculated
  from saved tasks and stock.
- Create, edit, assign, search and filter tasks; follow checklists and complete
  work. Staff can update their own assigned work.
- Search/filter inventory, record stock receipts and issues, inspect movement
  history and configure low-stock thresholds. Stock cannot go below zero.
- Prepare an editable WhatsApp enquiry with a message preview. You choose a
  verified recipient and send it in WhatsApp; no phone number is hardcoded and
  opening the enquiry does not place an order.
- Profile, role switching, explicit demo reset and loading/error/empty states.

Sample facilities cover an office, housing society and clinic in Pune. Supplies
include tissues, floor cleaner, toilet cleaner, handwash, dishwash, garbage bags
and gloves. INR prices are illustrative. Dates follow Asia/Kolkata; enter task
dates as **DD/MM/YYYY**.

## Try the complete demo

1. Tap **Explore the demo**, select **Facility Admin**, then continue.
2. Open **Tasks → New task**. Choose a facility, area, staff member and today's
   date; add a checklist and tap **Create and assign task**.
3. Open the task, tap **Start task**, check its steps, then **Complete task**.
   Return to the dashboard to see the totals update. Use **Edit** to change its
   assignment, priority or other details.
4. Open the **Stock** tab (Inventory). Search for floor cleaner, record
   **Stock in** or **Stock out**, and check the movement history. Set
   **Edit threshold** equal to the
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

Source commit `d99a4d7` passed [GitHub Actions run 41226315517](https://github.com/pradyumnagavhankar5-web/clean-os-android/actions/runs/41226315517),
including installation, lint, TypeScript, automated tests and Android JavaScript
export. This historical CI result does not replace physical Android testing.

## Optional Android builds later

The [GitHub Actions preview](#install-the-android-preview-apk) above is the route
that avoids Expo sign-in. The commands in this section are an optional EAS route
for later development and production build work.

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

For a specific setup or app symptom, see
[conditional troubleshooting steps](docs/TROUBLESHOOTING.md).
