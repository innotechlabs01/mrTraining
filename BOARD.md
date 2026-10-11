# Team Board

## TODO
- [ ] T-002: iOS dev build never installs → Expo Go fallback → `TypeError: fetch failed`. ROOT CAUSE: `expo-av@16.0.8` fails to compile on SDK 54 (`EXAV.h` imports removed `<ExpoModulesCore/EXEventEmitter.h>`). Fix: migrate 2 files to `expo-video`, drop `expo-av`, rebuild dev client with `expo run:ios`. (diagnosis by @coordinator)

## In Progress

## Review
- [ ] T-001: iOS bundle fix — PR #1 (fix/T-001-ios-bundle). UPDATE: duplicate `type Nav` was already fixed in 819e39a. REAL blocker: aa9d8fc switched `src/i18n.ts` to `expo-localization` but never added the dep → Metro resolve failure. Fix: add `expo-localization@~17.0.9`. Verified: `expo export -p ios` produces hbc bundle. PENDING: user approval + merge. Note: `react-native-localize` now unused (follow-up chore).

## Done