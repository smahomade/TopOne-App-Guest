#!/usr/bin/env bash
# Runs .maestro/ios-check.yaml on simulators of the iPhone models named, each
# on the newest iOS the Mac has for that model. Screenshots land in
# maestro-out/<model>/, with Maestro's own logs in a debug folder there.
#
# Usage: .maestro/run-ios.sh path/to/TopOne.app "iPhone 12 Pro" ["iPhone SE (3rd generation)" ...]
set -euo pipefail

app="$1"
shift
root="$(pwd)"
flow="$root/.maestro/ios-check.yaml"

# Maestro's iPhone driver can be slow to start on a freshly booted simulator
export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-300000}"

runtimes_json="$(xcrun simctl list runtimes --json)"
devicetypes_json="$(xcrun simctl list devicetypes --json)"

status=0
for model in "$@"; do
  echo "::group::$model"
  out="$root/maestro-out/${model//[ ()]/-}"
  mkdir -p "$out"

  type_id="$(jq -r --arg n "$model" '.devicetypes[] | select(.name == $n) | .identifier' <<<"$devicetypes_json" | head -1)"
  runtime_id="$(jq -r --arg n "$model" '
    [.runtimes[] | select(.platform == "iOS" and .isAvailable and any(.supportedDeviceTypes[]; .name == $n))]
    | sort_by(.version | split(".") | map(tonumber)) | last | .identifier // empty' <<<"$runtimes_json")"

  if [ -z "$type_id" ] || [ -z "$runtime_id" ]; then
    echo "::error::This Mac has no simulator for $model"
    status=1
    echo "::endgroup::"
    continue
  fi
  echo "Creating $model on $runtime_id"

  udid="$(xcrun simctl create "$model check" "$type_id" "$runtime_id")"

  # Show the on-screen keyboard like a real iPhone, instead of acting as if the
  # Mac's keyboard is plugged in (which hides it). The Simulator app reads this
  # both as a default and per device.
  plist="$HOME/Library/Preferences/com.apple.iphonesimulator.plist"
  defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false
  /usr/libexec/PlistBuddy -c "Add :DevicePreferences dict" "$plist" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c "Add :DevicePreferences:$udid dict" "$plist" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c "Add :DevicePreferences:$udid:ConnectHardwareKeyboard bool false" "$plist" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Set :DevicePreferences:$udid:ConnectHardwareKeyboard false" "$plist" || true

  xcrun simctl boot "$udid"
  xcrun simctl bootstatus "$udid" -b
  # The keyboard setting only applies with the Simulator app open on this device
  open -a Simulator --args -CurrentDeviceUDID "$udid" || true
  # A fixed clock and full bars, so screenshots compare cleanly between runs
  xcrun simctl status_bar "$udid" override --time 9:41 --batteryState charged --batteryLevel 100 || true
  xcrun simctl install "$udid" "$app"

  # takeScreenshot saves next to where Maestro runs, so run it from $out
  if ! (cd "$out" && maestro --device "$udid" test "$flow" --test-output-dir "$out/debug"); then
    echo "::error::The check failed on $model"
    status=1
  fi

  xcrun simctl shutdown "$udid" || true
  echo "::endgroup::"
done

exit "$status"
