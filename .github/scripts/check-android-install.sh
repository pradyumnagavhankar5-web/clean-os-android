#!/usr/bin/env bash
# Diagnose the unchanged published APK on a fresh CI emulator.
set -Eeuo pipefail

apk_path="${1:-downloads/CleanOS-preview.apk}"
evidence_dir=artifacts
app_package=in.auratradings.cleanos
app_component="$app_package/.MainActivity"
adb_cmd=(adb -s "emulator-${EMULATOR_PORT:-5554}")
mkdir -p "$evidence_dir"

capture_evidence() {
  local diagnostic_status=$?
  trap - EXIT
  set +e
  timeout 15s "${adb_cmd[@]}" shell dumpsys package "$app_package" > "$evidence_dir/package-info.txt" 2>&1
  timeout 15s "${adb_cmd[@]}" shell dumpsys activity activities > "$evidence_dir/activity-info.txt" 2>&1
  timeout 15s "${adb_cmd[@]}" shell dumpsys window windows > "$evidence_dir/window-info.txt" 2>&1
  timeout 15s "${adb_cmd[@]}" logcat -d -v threadtime > "$evidence_dir/logcat.txt" 2>&1
  timeout 20s "${adb_cmd[@]}" shell uiautomator dump /sdcard/cleanos-install-diagnostic.xml > "$evidence_dir/ui-dump-result.txt" 2>&1
  timeout 10s "${adb_cmd[@]}" pull /sdcard/cleanos-install-diagnostic.xml "$evidence_dir/ui.xml" > "$evidence_dir/ui-pull-result.txt" 2>&1
  timeout 10s "${adb_cmd[@]}" exec-out screencap -p > "$evidence_dir/screenshot.png" 2> "$evidence_dir/screenshot-result.txt"
  printf 'diagnostic_exit_code=%s\n' "$diagnostic_status" > "$evidence_dir/diagnostic-result.txt"
  printf 'DIAGNOSTIC_EXIT_CODE=%s\n' "$diagnostic_status"
  exit "$diagnostic_status"
}
trap capture_evidence EXIT

# Recheck the bytes in the script before any APK installation.
printf '%s  %s\n' \
  499c248073a67edcbb3237215891ca15cd4efd088151e06695513cec93a763e7 \
  "$apk_path" | sha256sum --check

# Check native-library ZIP page alignment when recent SDK tools are available.
sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
zipalign_bin=""
mapfile -t zipalign_candidates < <(printf '%s\n' "$sdk_root"/build-tools/*/zipalign | sort -Vr)
for candidate in "${zipalign_candidates[@]}"; do
  tool_version="$(basename "$(dirname "$candidate")")"
  tool_major="${tool_version%%.*}"
  if [[ -x "$candidate" && "$tool_major" =~ ^[0-9]+$ ]] && (( tool_major >= 36 )); then
    zipalign_bin="$candidate"
    break
  fi
done
if [[ -n "$zipalign_bin" ]]; then
  set +e
  "$zipalign_bin" -c -P16 4 "$apk_path" > "$evidence_dir/zipalign-16kb.txt" 2>&1
  zipalign_status=$?
  set -e
  printf 'zipalign=%s\nexit_code=%s\n' "$zipalign_bin" "$zipalign_status" > "$evidence_dir/zipalign-result.txt"
  printf 'ZIPALIGN_16KB_EXIT_CODE=%s\n' "$zipalign_status"
  cat "$evidence_dir/zipalign-16kb.txt"
  # Continue to preserve the independent Android installer result.
else
  printf '%s\n' 'No build-tools 36+ zipalign found; 16 KB ZIP alignment was not checked.' \
    > "$evidence_dir/zipalign-result.txt"
fi

timeout 60s "${adb_cmd[@]}" wait-for-device
"${adb_cmd[@]}" shell getprop > "$evidence_dir/device-properties.txt"
"${adb_cmd[@]}" shell df -h /data > "$evidence_dir/device-storage.txt"
"${adb_cmd[@]}" shell pm list packages "$app_package" | tr -d '\r' > "$evidence_dir/packages-before-install.txt"
if grep -Fxq "package:$app_package" "$evidence_dir/packages-before-install.txt"; then
  printf '%s\n' 'The emulator already has CleanOS installed; this is not a fresh-install test.' >&2
  exit 1
fi
"${adb_cmd[@]}" logcat -c

set +e
"${adb_cmd[@]}" install --no-streaming "$apk_path" > "$evidence_dir/install-result.txt" 2>&1
install_status=$?
set -e
printf '%s\n' "$install_status" > "$evidence_dir/install-exit-code.txt"
printf 'ADB_INSTALL_EXIT_CODE=%s\n' "$install_status"
cat "$evidence_dir/install-result.txt"
if (( install_status != 0 )); then
  exit "$install_status"
fi
if ! tr -d '\r' < "$evidence_dir/install-result.txt" | grep -Fxq Success; then
  printf '%s\n' 'adb returned zero without reporting successful installation.' >&2
  exit 1
fi

set +e
"${adb_cmd[@]}" shell am start -W -n "$app_component" > "$evidence_dir/launch-result.txt" 2>&1
launch_status=$?
set -e
printf '%s\n' "$launch_status" > "$evidence_dir/launch-exit-code.txt"
printf 'ADB_LAUNCH_EXIT_CODE=%s\n' "$launch_status"
cat "$evidence_dir/launch-result.txt"
if (( launch_status != 0 )); then
  exit "$launch_status"
fi
if ! tr -d '\r' < "$evidence_dir/launch-result.txt" | grep -Eq '^Status: ok$'; then
  printf '%s\n' 'Android did not confirm a successful activity launch.' >&2
  exit 1
fi

sleep 15
set +e
"${adb_cmd[@]}" shell pidof "$app_package" > "$evidence_dir/app-pid.txt" 2>&1
pid_status=$?
set -e
if (( pid_status != 0 )) || [[ -z "$(tr -d '\r\n ' < "$evidence_dir/app-pid.txt")" ]]; then
  printf '%s\n' 'CleanOS has no running process 15 seconds after launch.' >&2
  exit 1
fi
"${adb_cmd[@]}" shell dumpsys activity activities | tr -d '\r' > "$evidence_dir/activity-after-launch.txt"
if ! grep -E 'topResumedActivity|mResumedActivity' "$evidence_dir/activity-after-launch.txt" \
  | grep -Fq "$app_package/"; then
  printf '%s\n' 'CleanOS is not the resumed foreground activity after launch.' >&2
  exit 1
fi
printf 'Installed and launched CleanOS on API 36 x86_64 emulator; PID=%s\n' \
  "$(tr -d '\r\n' < "$evidence_dir/app-pid.txt")" | tee "$evidence_dir/SUCCESS.txt"
