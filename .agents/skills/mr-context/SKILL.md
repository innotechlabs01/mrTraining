---
name: mr-context
description: Senior engineering context for the MR Training monorepo. Load at the start of ANY task in this repo — gives the repo map, non-negotiable rules, and the senior quality bar before touching code.
metadata:
  audience: all-developers
  workflow: team
---

# MR Context — Senior Bar for This Repo

Load this before starting any task in mr-training. It gives orientation and
the quality bar. It does NOT replace the rules — it tells you which rules to
read for your change.

## Repo map (30 seconds)

```
apps/web      Next.js 14 coach dashboard + landing (Clerk v6, Tailwind 3)
apps/api      Go 1.25 Fiber API — SINGLE SOURCE OF TRUTH for data
apps/mobile   React Native athlete app (React Navigation + React Query)
apps/rules/   The rules. Read the ones your change touches.
packages/     Empty by design — see 14-team-workflow.md §4 before adding
```

## Non-negotiables (violating any of these = rework)

1. **API-first:** web and mobile talk ONLY to `apps/api`. No Next.js API
   routes for data (webhooks/SSR/static excepted).
2. **Never work on `main`.** One branch = one worktree:
   `scripts/worktree.sh new feature/<name>`.
3. **Read rules before code.** Rules map in `AGENTS.md` — match your change
   type (UI, API, DB, mobile, security...) to its rule files, read them,
   then code. No guessing.
4. **Mobile UI changes aren't done until validated on a real device/emulator.**
   Code compiling is NOT validation. See the mobile validation rule in
   `AGENTS.md`.
5. **Conventional commits, atomic, no AI attribution.**

## Senior quality bar (how to think here)

- **Verify before you claim.** Read the actual code/files — never assume what
  a file contains or that a named function does what its name suggests.
- **Root cause over symptom.** If a bug surprises you, stop patching and find
  WHY. A fix that doesn't explain the bug is not a fix.
- **Scope discipline.** Fix what was asked. Adjacent problems get reported,
  not silently fixed. Say what you deliberately did NOT touch.
- **Small and reviewable.** ~100 lines per commit/PR target. Split before
  submitting, not after.
- **Push back with alternatives.** If the ask is wrong, underspecified, or
  skips architecture, say so BEFORE coding — with the tradeoff, not just "no".
- **Abstractions earn their place.** No `packages/` extraction, no shared
  layers, no "future-proofing" without 2+ real consumers (see
  `14-team-workflow.md` §4).
- **Tests prove behavior.** New logic = tests. Existing behavior changed =
  tests updated in the same commit.
- **Every task ends with:** lint + typecheck + tests green, and a CHANGES MADE
  summary (what changed, what intentionally untouched, concerns).

## Task flow

Entry point: `pipeline-init` skill (loads this + herdr context). Then:

```
1. Worktree: scripts/worktree.sh new feature/<name>
2. Read the matching rule files (map in AGENTS.md)
3. Feature or contract change? Spec first: docs/superpowers/specs/
   (template: TEMPLATE-coach-feature.md)
4. Implement — small slices, commit each
5. Verify: lint, typecheck, tests (+ real-device run for mobile UI)
6. PR to main → clean up worktree
```

Full workflow detail: `apps/rules/14-team-workflow.md`.
