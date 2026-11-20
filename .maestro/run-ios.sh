#!/usr/bin/env bash
# Runs .maestro/ios-check.yaml on two iPhone simulators: a current Pro model
# (Dynamic Island) and the smallest phone the Mac has. Screenshots land in
# maestro-out/<device name>/, with Maestro's own logs in a debug folder there.
#
# Usage: .maestro/run-ios.sh path/to/TopOne.app
set -euo pipefail

app="$1"
root="$(pwd)"
flow="$root/.maestro/ios-check.yaml"

devices_json="$(xcrun simctl list devices available --json)"
runtime="$(jq -r '.devices | keys[] | select(test("iOS"))' <<<"$devices_json" | sort -V | tail -1)"
echo "Using simulator runtime: $runtime"

pick() {
  jq -r --arg rt "$runtime" --arg re "$1" \
    '.devices[$rt][] | select(.name | test($re)) | "\(.udid)|\(.name)"' <<<"$devices_json" | head -1
}

pro="$(pick '^iPhone [0-9]+ Pro$')"
small="$(pick '^iPhone ([0-9]+e|SE)')"
[ -n "$pro" ] || pro="$(pick '^iPhone')"
if [ "$small" = "$pro" ]; then small=""; fi

status=0
for entry in "$pro" "$small"; do
  [ -n "$entry" ] || continue
  udid="${entry%%|*}"
  name="${entry#*|}"
  out="$root/maestro-out/${name// /-}"
  mkdir -p "$out"
  echo "::group::$name"

  xcrun simctl boot "$udid" || true
  xcrun simctl bootstatus "$udid" -b
  # A fixed clock and full bars, so screenshots compare cleanly between runs
  xcrun simctl status_bar "$udid" override --time 9:41 --batteryState charged --batteryLevel 100 || true
  xcrun simctl install "$udid" "$app"

  # takeScreenshot saves next to where Maestro runs, so run it from $out
  if ! (cd "$out" && maestro --device "$udid" test "$flow" --test-output-dir "$out/debug"); then
    echo "::error::The check failed on $name"
    status=1
  fi

  xcrun simctl shutdown "$udid" || true
  echo "::endgroup::"
done

exit "$status"
