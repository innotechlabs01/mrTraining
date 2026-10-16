# T-015: Mobile App Bootstrap Crash Fix — Plan

**Status:** Draft (Architect review)
**Target:** `mr-training` checkout on `main` (no branches, no worktrees)
**Date:** 2026-10-15

---

## 1. Problem Summary

The mobile app (`apps/mobile`) crashes at startup on iOS Simulator with:
```
[React] [runtime not ready]: ReferenceError: Property 'layout' doesn't exist
```

**Two verified root causes in uncommitted working tree:**

| # | File | Issue |
|---|------|-------|
| 1 | `apps/mobile/src/features/training/presentation/screens/AthleteTodaySummary.tsx:225` | Uses `layout.heroPadding` but `layout` not imported (line 13 imports only `colors, spacing, radius, typography`) |
| 2 | `apps/mobile/src/features/ai/presentation/screens/AiWorkoutScreen.tsx:7,16` | Imports `tokens` aggregate (`import { tokens } from ...`) and destructures it, but `apps/mobile/src/shared/theme/tokens.ts` no longer exports `tokens` (removed in uncommitted changes) |

No other files have these issues (verified by grep across `apps/mobile/src`).

---

## 2. Decomposition — Ordered Minimal Subtasks

### Subtask 1: Fix missing `layout` import in `AthleteTodaySummary.tsx`
**File:** `apps/mobile/src/features/training/presentation/screens/AthleteTodaySummary.tsx`
**Change:** Add `layout` to the import on line 13.
```diff
- import { colors, spacing, radius, typography } from '../../../../shared/theme/tokens';
+ import { colors, layout, radius, spacing, typography } from '../../../../shared/theme/tokens';
```
**Rationale:** `layout` is defined in `tokens.ts` (lines 117-124) and used at line 225. This is a single-line fix.

---

### Subtask 2: Restore `tokens` aggregate export in `tokens.ts`
**File:** `apps/mobile/src/shared/theme/tokens.ts`
**Change:** Add the aggregate export at end of file (after `skeleton` export, ~line 130).
```ts
/** Aggregate export for backward compatibility with existing imports. */
export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  layout,
  fontFamilies,
  skeleton,
} as const;

export default tokens;
```
**Rationale:** `AiWorkoutScreen.tsx` (and only that file) uses `import { tokens }` and `const { colors, spacing, typography, radius } = tokens;`. Restoring this export maintains backward compatibility without changing consumer code. The `as const` preserves literal types.

---

### Subtask 3: Verify no other module-scope identifier issues exist
**Action:** Run a quick static check across `apps/mobile/src` for:
- Any import from `shared/theme/tokens` that references an export not present in `tokens.ts`
- Any `StyleSheet.create` or module-scope code using an undeclared identifier

**Commands:**
```bash
cd apps/mobile
# Check for any remaining 'tokens' aggregate imports (should be zero after fix)
grep -r "import { tokens }" src/

# Check for any layout.* usage without import (should be zero after fix)
# This is a heuristic — manual spot-check the 69 matches from grep
```

**Expected:** Zero findings after Subtasks 1-2.

---

### Subtask 4: Rebuild and launch on iOS Simulator
**Commands:**
```bash
cd apps/mobile
npx expo run:ios --device "iPhone 17"
```
**Verification:** App installs and launches without `runtime not ready` error. Metro logs show clean bundle load.

---

### Subtask 5: Real-UI validation with Maestro (Mobile MCP)
**Target:** Validate the app boots to the sign-in screen and the affected screens render.
**Flows to test:**
1. **Cold boot → SignInScreen** — app launches, no crash, sign-in UI visible
2. **AthleteTodaySummary rendering** — navigate to Today tab (if auth bypass available) or verify component renders in isolation via test harness
3. **AiWorkoutScreen module load** — verify the AI workout screen can be required/loaded without module evaluation error
4. **Bundle build** — Metro serves bundle (HTTP 200, size ~15.9 MB as before)

**Maestro commands (pseudo):**
```yaml
# app-launch.yaml
- launchApp
- assertVisible: "Sign in"  # or equivalent sign-in screen text
- screenshot: boot-success

# athlete-today-summary.yaml (if deep-link or test harness available)
- launchApp
- tapOn: "Today" tab
- assertVisible: "Readiness"  # or t.overline text
- screenshot: today-summary-renders
```

---

### Subtask 6: Run unit tests (regression guard)
**Command:**
```bash
cd apps/mobile && npm test
```
**Acceptance:** 353/353 PASS (same as before).

---

## 3. Team & Role Order

| Stage | Role | Responsibility |
|-------|------|----------------|
| **Implementation** | `dev-react-native` | Execute Subtasks 1-2 (code fixes), Subtask 3 (static check) |
| **Build & Launch** | `dev-react-native` | Execute Subtask 4 (rebuild, launch on simulator) |
| **Validation (QA)** | `qa` | Execute Subtask 5 (Maestro real-UI validation), Subtask 6 (unit tests) |
| **Review** | `code-reviewer` | Verify fixes are minimal, no unrelated changes, no business logic alterations |
| **Security Gate** | `security-hacker` | Confirm no auth/session/credential changes (per API-first rule) |

**Order:** `dev-react-native` → `qa` → `code-reviewer` → `security-hacker` → **USER GATE** → Done

---

## 4. Acceptance Criteria (Observable & Testable)

| # | Criterion | How Verified |
|---|-----------|--------------|
| 1 | App boots to sign-in screen without `runtime not ready` error | Maestro `app-launch.yaml` passes; Metro logs clean |
| 2 | `AthleteTodaySummary` component renders (no module-eval crash) | Maestro `athlete-today-summary.yaml` passes OR unit test mounts component |
| 3 | `AiWorkoutScreen` module loads without `TS2305` / runtime error | `require()` or dynamic import in test harness succeeds |
| 4 | Unit tests unchanged | `npm test` → 353/353 PASS |
| 5 | Metro bundle builds successfully | HTTP 200, bundle size ~15.9 MB |
| 6 | No new TypeScript errors introduced in fixed files | `npx tsc --noEmit --ignoreDeprecations 6.0` on changed files only → 0 new errors |

---

## 5. Risks & Do-Not-Touch Boundaries

| Boundary | Rule |
|----------|------|
| **Database / RLS / Auth / Session** | ❌ Do not touch. Go API (`apps/api`) is sole source of truth. |
| **API contracts / endpoints** | ❌ Do not touch. Coordination required across API/Web/Mobile. |
| **Business logic** | ❌ Do not change. Only visual/module-wiring fixes in scope. |
| **Uncommitted work** | ✅ Preserve all. Do NOT reset/stash/checkout/revert. |
| **1570 TypeScript errors (tsc masked by `baseUrl`)** | ❌ **OUT OF SCOPE** for T-015. Coordinator position: separate task. Rationale: T-015 must stay minimal to unblock the app. The 1570 errors are pre-existing (masked by TS5101), not introduced by the two regressions. Fixing them would expand scope unpredictably. |
| **Reformatting unrelated files** | ❌ Do not reformat. Touch only the two files identified. |
| **Navigation / routing changes** | ❌ Not needed. Bootstrap crash is module-evaluation, not navigation. |

---

## 6. Ambiguities / Questions for Coordinator

1. **Maestro availability:** Is the mobile MCP (Maestro) configured and working in this environment? If not, Subtask 5 falls back to code-level validation and the task must be marked **BLOCKED** per AGENTS.md §GLOBAL MOBILE UI VALIDATION RULE.

2. **Auth bypass for testing:** Does the app have a dev-mode auth bypass or test harness to reach `AthleteTodaySummary` and `AiWorkoutScreen` without full sign-in? If not, QA validates module load only (Subtask 3 static check + require test) and marks **PASS WITH LIMITATIONS**.

3. **Sign-off on TypeScript error scope:** Confirm T-015 does NOT include the 1570 tsc errors. If you want them addressed, a separate task (T-016) should be created.

---

## 7. Deliverables

- This plan document (approved by coordinator → becomes spec for `dev-react-native`)
- Two minimal code changes (Subtasks 1-2)
- Maestro validation artifacts (screenshots, flow results) or documented limitation
- Test run output (353/353 PASS)
- Conventional commit: `fix(mobile): restore tokens export and add missing layout import to unblock bootstrap`

---

**Architect Notes:**
- The `tokens.ts` comment at line 115 (`Values inlined to match layout.ts source of truth`) is stale — `layout.ts` does not exist. This is a doc bug, not a code bug. Can be fixed in follow-up.
- The `layout` object in `tokens.ts` (lines 117-124) is the canonical source. All 69 usages across the codebase import it correctly except `AthleteTodaySummary.tsx`.
- `AiWorkoutScreen.tsx` is the only consumer of the `tokens` aggregate export. Restoring it is the minimal fix.