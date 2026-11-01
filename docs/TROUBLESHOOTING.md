# Help with a specific symptom

These are possible symptoms and steps to try **only if you encounter them**.
Their presence in this guide does not mean they occurred or are confirmed defects.
Recorded test results and actual limitations are in [VALIDATION.md](VALIDATION.md).

## I see files or instructions on GitHub

That is the source repository. GitHub displays the code and README; to open
CleanOS, install the [Android preview APK](../README.md#install-the-android-preview-apk).
Expo Go with a running development server is an optional development route.

The current prototype saves demo data on your device. It does not need Supabase,
a real login account or backend keys. Connecting Supabase is future work, not a
step required to make this demo run.

## I cannot find the CleanOS APK download

Open [Releases](https://github.com/pradyumnagavhankar5-web/clean-os-android/releases)
and look under the newest preview release's **Assets** for
**`CleanOS-preview.apk`**. The source ZIP shown by GitHub is project code, not an
Android installer.

A preview release is created only after the
[Android preview workflow](https://github.com/pradyumnagavhankar5-web/clean-os-android/actions/workflows/android-preview.yml)
builds and verifies the APK successfully. If the run is queued, running or failed,
that run has not produced a published download. The workflow also saves a build
artifact containing the APK; downloading an Actions artifact may require GitHub
sign-in.

## Expo says device verification has already been denied

That sign-in request cannot be approved again by reusing the same code. The
message does not establish why it was denied. Repeatedly reopening that request
will not complete the connection.

Use the [standalone Android preview APK](../README.md#install-the-android-preview-apk)
to run CleanOS without Expo sign-in, Expo Go or a running preview server. If you
later choose the Expo development route, start a new login request and follow its
current browser instructions; a numeric pairing check may be required. Do not
guess pairing numbers or share your password in the project or chat.

## Expo Go explicitly reports an unsupported SDK

The Google Play version may lag a new SDK release. Check the exact error and get
an Android Expo Go build for SDK 58 from the
[official matching-version download page](https://expo.dev/go?device=true&platform=android&sdkVersion=58).
Follow [Expo's SDK version mismatch instructions](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/).
Installing an updated Play Store version only helps if it supports this project's
SDK; its availability is not guaranteed here. Android may ask permission to
install the official download from your browser.

You can also ask the cloud terminal for the matching official APK link:

```sh
npx --yes expo-go@0.2.0 url android 58
```

Open the resulting download link **on your Android phone**, then install it
there. The cloud terminal and phone have separate filesystems. If a proxy-based
cloud workspace requires it, prefix the command with `NODE_USE_ENV_PROXY=1`.
This retrieves a download URL and adds no project dependency. It does not require
Android Studio or an EAS build.

Alternatively, install the [preview APK](../README.md#install-the-android-preview-apk),
which is a separately installed Android app and does not need Expo Go.

## The phone cannot reach the preview

1. Confirm the cloud terminal still has Expo running. A repository page or a
   completed Codex task does not keep a development server alive.
2. Check internet access on the phone and cloud host. Use the complete tunnel
   `exp://...` link printed by Expo, rather than the cloud machine's private LAN
   address. On the same phone, paste it into Expo Go's URL entry if offered, or
   tap an Expo Go link exposed by the terminal.
3. Stop the old server and retry `npm run start:tunnel` from the repository folder.
4. If the cloud host/ngrok cannot establish a tunnel, use a persistent supported
   workspace or the [Android preview APK](../README.md#install-the-android-preview-apk).
   No tunnel is guaranteed on every host.

The earlier attempt in this Codex workspace timed out; the repository does not
currently provide a live preview URL. This is separate from JavaScript checks
passing in CI.

If Expo specifically asks for the ngrok helper after a partial installation, stop
the server and reinstall it locally in the project:

```sh
npx expo install --dev @expo/ngrok
npm run start:tunnel
```

No global package installation is necessary.

## Old app code appears after a change

Stop the development server with Ctrl+C, then restart with a cleared bundler cache:

```sh
npm run start:tunnel -- --clear
```

This clears the JavaScript bundler cache, not the demo's saved task and stock data.

## The app reports that saved demo data could not load

Try **Retry loading** first. The app preserves invalid saved data until you
explicitly choose recovery. If you accept losing local changes, choose
**Replace with fresh demo** and confirm. In a running app, **Profile → Reset demo
data** also restores the sample data after confirmation.

Do not clear app storage just to solve a network connection problem: clearing
storage can erase saved tasks and stock changes.

## The app reports that a save failed

Check available device storage, free space if needed and retry. The app keeps the
last successfully saved state when a write fails. If the failure continues, record
the exact message and the action you tried.

## WhatsApp does not open

Install WhatsApp or use a compatible browser. The enquiry opens a recipient-free
`https://wa.me/?text=...` link. Select products with positive quantities, review
the message, then choose your verified contact in WhatsApp. No message is sent
automatically, and preparing an enquiry does not change stock.

## A GitHub command reports an authentication error

This affects publishing source, rather than running the local demo. CLI
credentials and the workspace's connected GitHub integration can have different
access. Use the connected integration or configure CLI access through your account
settings. Do not paste passwords or tokens into source files or commit them.

## Reporting a reproducible problem

Record the screen/action, exact error text, expected result and phone/Android/Expo
Go version. State whether you used Expo Go or an installed preview APK. Follow
[the Android test checklist](ANDROID_TEST_CHECKLIST.md) to verify a fix on a phone.
