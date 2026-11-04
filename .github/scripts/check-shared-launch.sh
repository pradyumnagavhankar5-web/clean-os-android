#!/usr/bin/env bash
set -Eeuo pipefail
mkdir -p emulator-evidence
app_package="$(node -p 'require("./app.json").expo.android.package')"
adb_cmd=(adb -s "emulator-${EMULATOR_PORT:-5554}")
capture() {
  local result=$?
  trap - EXIT
  set +e
  timeout 15s "${adb_cmd[@]}" logcat -d -v threadtime > emulator-evidence/logcat.txt 2>&1
  timeout 15s "${adb_cmd[@]}" shell dumpsys package "$app_package" > emulator-evidence/package.txt 2>&1
  timeout 10s "${adb_cmd[@]}" exec-out screencap -p > emulator-evidence/screenshot.png
  printf 'exit_code=%s\n' "$result" > emulator-evidence/result.txt
  exit "$result"
}
trap capture EXIT
(cd artifacts && sha256sum --check CleanOS-emulator.apk.sha256)
"${adb_cmd[@]}" logcat -c
"${adb_cmd[@]}" install --no-streaming artifacts/CleanOS-emulator.apk | tee emulator-evidence/install.txt
grep -Fxq Success emulator-evidence/install.txt
"${adb_cmd[@]}" shell am start -W -n "$app_package/.MainActivity" | tee emulator-evidence/launch.txt
grep -Eq '^Status: ok' emulator-evidence/launch.txt
sleep 20
"${adb_cmd[@]}" shell pidof "$app_package" > emulator-evidence/pid.txt
"${adb_cmd[@]}" shell dumpsys activity activities > emulator-evidence/activity.txt
grep -E 'topResumedActivity|mResumedActivity' emulator-evidence/activity.txt | grep -Fq "$app_package/"
"${adb_cmd[@]}" shell uiautomator dump /sdcard/cleanos-shared-ui.xml
"${adb_cmd[@]}" pull /sdcard/cleanos-shared-ui.xml emulator-evidence/ui.xml
python - <<'PY'
import xml.etree.ElementTree as ET
root = ET.parse('emulator-evidence/ui.xml').getroot()
labels = ' '.join(node.get('text', '') + ' ' + node.get('content-desc', '') for node in root.iter())
if 'Sign in' not in labels or 'Create account' not in labels:
    raise SystemExit('The real account sign-in screen was not visible after launch.')
if 'Explore the demo' in labels or 'Switch demo role' in labels:
    raise SystemExit('The app unexpectedly launched in demo mode.')
print('Fresh Android 16 installation and real-account sign-in screen verified. No account created or email sent.')
PY
"${adb_cmd[@]}" exec-out screencap -p > emulator-evidence/sign-in.png
"${adb_cmd[@]}" shell am start -W -a android.intent.action.VIEW \
  -d 'cleanos-team://auth/callback?error=access_denied' -p "$app_package" > emulator-evidence/callback-intent.txt
sleep 3
"${adb_cmd[@]}" shell pidof "$app_package" > emulator-evidence/callback-pid.txt
"${adb_cmd[@]}" shell uiautomator dump /sdcard/cleanos-shared-callback.xml
"${adb_cmd[@]}" pull /sdcard/cleanos-shared-callback.xml emulator-evidence/callback-ui.xml
python - <<'PY'
import xml.etree.ElementTree as ET
root = ET.parse('emulator-evidence/callback-ui.xml').getroot()
labels = ' '.join(n.get('text', '') + ' ' + n.get('content-desc', '') for n in root.iter())
if 'Sign in' not in labels or 'email link has expired or is invalid' not in labels:
    raise SystemExit('The registered email callback did not recover safely to sign-in.')
print('Registered Android email callback and invalid-link recovery verified without sending email.')
PY
