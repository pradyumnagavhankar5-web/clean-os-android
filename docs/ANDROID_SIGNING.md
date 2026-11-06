# Private Android release signing

The shared preview APK uses Expo's public template signing key for acceptance
testing. Before operational distribution, Aura Builds needs its own private key.
Keep that same key for future updates to `in.auratradings.cleanos.team`.

This can be prepared in Codex Cloud; Android Studio and a laptop are not required.
Do this after the shared candidate passes its hosted and two-phone checks.

1. In the cloud workspace terminal, run:

   ```sh
   python scripts/prepare-android-signing.py
   ```

   The command requires Java's `keytool`, which is available in the current cloud
   environment. It creates a new random password and RSA-4096 PKCS12 identity in
   the ignored `.private/android-signing/` folder. It does not print credentials
   or replace an existing folder. Do not generate a new identity for each update.

2. Download `cleanos-release.p12` using your cloud workspace's file controls and
   save it in a protected private backup. Save the password from
   `CLEANOS_ANDROID_KEYSTORE_PASSWORD.txt` separately in your password manager.
   Verify you can recover both. Never post either file in chat, a GitHub issue,
   repository source or a public release. The Base64 file is also private key
   material, not a public certificate.

3. In GitHub, open this repository's **Settings → Secrets and variables →
   Actions → New repository secret**. On a phone, Chrome's **Desktop site** may
   expose the Settings control. Add these two secrets using the corresponding
   private files' contents:

   | Secret name | Private file to copy |
   |---|---|
   | `CLEANOS_ANDROID_KEYSTORE_BASE64` | `CLEANOS_ANDROID_KEYSTORE_BASE64.txt` |
   | `CLEANOS_ANDROID_KEYSTORE_PASSWORD` | `CLEANOS_ANDROID_KEYSTORE_PASSWORD.txt` |

   Keep them in GitHub secrets. They are not `EXPO_PUBLIC_` app settings. This
   setup does not need an Expo account, service-role key or database password.

4. Once this workflow is present on `main`, open **Actions → Sign CleanOS with
   the owner key → Run workflow**. Choose `main` and enter the complete successful
   `shared-preview-…` tag from **Releases**. Run it once.

   The workflow checks the exact run and attempt encoded in the candidate tag,
   including successful manual builds. It downloads that run's immutable Actions
   artifact by ID, verifies its SHA-256 digest and replaces the two phone APKs'
   signatures. It does not use replaceable release downloads as signing inputs.
   It checks the owner certificate, processor variants, package/version,
   checksums and ZIP alignment, and compares every app payload entry with the
   original. Private signing files stay in the runner's temporary directory;
   they are never published or uploaded as artifacts.

   Build artifacts expire after 30 days. If the original has expired, create a
   fresh preview build rather than signing an unverifiable old download.

5. After success, **Releases** contains `shared-signed-v…` with **CleanOS.apk**
   (modern ARM64 phones), **CleanOS-armv7.apk** (older 32-bit phones), checksums
   and the public certificate fingerprint. Download the appropriate APK.

A shared preview already installed with the generic template key cannot be
updated by an APK signed with the private owner key. Remove that **shared
candidate**, install the owner-signed APK and sign in again. Its records remain
on Supabase. The older device-local demo has a separate Android package and can
stay installed with its local data.

Record the owner certificate fingerprint and APK checksum in the
[release checklist](SHARED_RELEASE_CHECKLIST.md). Complete physical installation,
confirmation/recovery and multiple-phone acceptance before calling the app a
final operational release. Signing does not configure Supabase or email delivery.
