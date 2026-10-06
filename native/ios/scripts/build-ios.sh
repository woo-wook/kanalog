#!/bin/bash
set -euo pipefail
IOS_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PRIVATE_PACKAGE="${NATIVE_PRIVATE_PACKAGE:-$IOS_ROOT/../../private-data/native/ios}"
INCLUDE_PRIVATE="${INCLUDE_PRIVATE_CONTENT:-0}"
PROJECT_ONLY=0
for argument in "$@"; do
  case "$argument" in
    --private) INCLUDE_PRIVATE=1 ;;
    --project-only) PROJECT_ONLY=1 ;;
    *) echo "Unknown argument: $argument" >&2; exit 1 ;;
  esac
done
if [[ "$INCLUDE_PRIVATE" == '1' ]]; then
  [[ -f "$PRIVATE_PACKAGE/manifest.json" ]] || { echo 'Private package manifest is missing.' >&2; exit 1; }
  mkdir -p "$IOS_ROOT/Resources/PersonalAssets"
  rsync -a --delete --exclude README.md "$PRIVATE_PACKAGE/" "$IOS_ROOT/Resources/PersonalAssets/"
else
  PUBLIC_EMPTY="$(mktemp -d)"
  trap 'rmdir "$PUBLIC_EMPTY"' EXIT
  rsync -a --delete --exclude README.md "$PUBLIC_EMPTY/" "$IOS_ROOT/Resources/PersonalAssets/"
fi
command -v xcodegen >/dev/null || { echo 'Install XcodeGen 2.46.0 or later.' >&2; exit 1; }
xcodegen generate --spec "$IOS_ROOT/project.yml" --project "$IOS_ROOT"
if [[ "$PROJECT_ONLY" == '1' ]]; then exit 0; fi
if ! xcrun --sdk iphonesimulator --show-sdk-path >/dev/null 2>&1; then
  echo 'Full Xcode with the iOS simulator SDK is required. Project generated; app build was not run.' >&2
  exit 2
fi
xcodebuild -project "$IOS_ROOT/Kanalog.xcodeproj" -scheme Kanalog -destination 'generic/platform=iOS Simulator' -derivedDataPath "$IOS_ROOT/DerivedData" CODE_SIGNING_ALLOWED=NO build
