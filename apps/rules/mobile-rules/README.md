# MR Training — Mobile Rules Index

**Version 1.0 — 2026**

---

## Mobile Rule Files

| File | Content |
|------|---------|
| `00-mobile-architecture.md` | Clean Architecture, project structure, API integration, auth, navigation |
| `01-mobile-ui-ux.md` | Design principles, component states, design tokens, themes, animations |
| `02-mobile-code-quality.md` | TypeScript strict, naming, hooks, state management, tooling |
| `03-mobile-testing.md` | Unit tests, coverage targets, bug fix protocol, pre-commit checklist |
| `04-mobile-security.md` | OWASP Mobile Top 10, secure storage, anti-tampering, API security |
| `05-mobile-performance.md` | FPS targets, FlashList, image optimization, memory leaks, bundle size |
| `06-mobile-bug-hunter.md` | QA checklist, edge cases, regression prevention, release gate |

---

## TL;DR — Core Principles

1. **React Native CLI + TypeScript strict.** No Expo. No `any`.
2. **Clean Architecture** — domain → application → infrastructure → presentation.
3. **Same Next.js API** as web. No new backend.
4. **Clerk for auth.** Shared accounts between web and mobile.
5. **React Query + Zustand.** Server state vs client state.
6. **FlashList + Reanimated.** 60 FPS everywhere.
7. **MMKV encrypted storage.** No AsyncStorage for sensitive data.
8. **Every state is handled:** loading, error, empty, success, disabled, offline.
9. **90%+ test coverage.** No code without tests.
10. **Security audit on every feature.** OWASP Mobile Top 10.

---

## Stack Summary

```typescript
const stack = {
  framework: 'React Native CLI 0.76+',
  language: 'TypeScript 5.x strict',
  navigation: 'React Navigation 7',
  auth: '@clerk/clerk-react-native',
  state: 'Zustand 5',
  serverState: '@tanstack/react-query 5',
  forms: 'React Hook Form + Zod',
  storage: 'react-native-mmkv',
  lists: '@shopify/flash-list',
  animation: 'react-native-reanimated 3 + gesture-handler 2',
  http: 'axios',
  testing: 'Jest + RN Testing Library',
  e2e: 'Maestro',
  target: 'iOS 16+ / Android 14+',
};
```

---

## When These Rules Activate

These rules activate automatically when working on:
- `apps/mobile/` directory
- React Native components, screens, or features
- Mobile-specific API integration
- Mobile navigation or auth flows
- Mobile testing or performance optimization
