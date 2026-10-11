# Team Board

## TODO
- [ ] T-002: iOS dev build never installs → Expo Go fallback → `TypeError: fetch failed` — ROOT CAUSE: `expo-av@16.0.8` fails to compile on SDK 54 (`EXAV.h` imports removed `<ExpoModulesCore/EXEventEmitter.h>`). Fix: migrate 2 files to `expo-video`, drop `expo-av`, rebuild dev client with `expo run:ios`. Role: dev-react-native. (diagnosis by @coordinator)

## In Progress

## Review
- [ ] T-001: iOS bundle fix (missing expo-localization) — QA PASS (expo export -p ios produces hbc bundle) | review pending | security n/a (dependency add) | PR #1 (fix/T-001-ios-bundle) awaiting @user approval. Note: `react-native-localize` now unused (follow-up chore).

## Done
