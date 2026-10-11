---
name: pipeline-init
description: Bootstrap entry point for ANY task in the MR Training repo. Loads repo context, senior bar, and Herdr awareness in one step. Invoke FIRST, before touching code — this is step 0 of the team pipeline.
metadata:
  audience: all-developers
  workflow: team
  step: 0
---

# Pipeline Init — Step 0

You are starting a task in the MR Training monorepo. Execute this bootstrap
in order, every time. No exceptions for "small" tasks.

## 1. Load context (always)

Call the skill tool for `mr-context`. It gives you: repo map, 5
non-negotiables (API-first, never main, read rules before code, real-device
mobile validation, atomic commits), and the senior quality bar. Non-negotiable
reading before any code change.

## 2. Load Herdr guide (always)

Call the skill tool for `herdr-setup`. Even if you never touch Herdr, its
concept model (workspace/pane/agent states) is how this team runs parallel
agents — you need it to understand instructions like "check the board" or
"another agent is blocked on this branch".

## 3. Herdr control (conditional)

Check:

```bash
test "${HERDR_ENV:-}" = 1
```

- **Passes** → call the skill tool for `herdr`. You are inside a Herdr pane:
  you can split panes, start sibling agents, read their output, wait on
  states. Use `--no-focus` for background work.
- **Fails** → skip `herdr`. You are outside Herdr: do NOT try to control
  panes or sessions. Work directly in your worktree.

## 4. Orient on the task

Bootstrap done. Now:

```
1. ¿Hay BOARD.md con la task? → mover a In Progress
2. Worktree: scripts/worktree.sh new <tipo>/<nombre>  (nunca main)
3. Leer reglas que aplican (mapa en AGENTS.md)
4. ¿Feature con diseño? → Spec primero (TEMPLATE-coach-feature.md)
5. Implementar en slices chicos, commit atómico
6. Verificar: lint + typecheck + tests (+ dispositivo real si mobile UI)
7. Review chain: qa → code-reviewer → security-hacker (cada uno gate)
8. USER GATE: resumen + evidencia al usuario → aprobación = Done + PR merge
```

Full detail: `apps/rules/14-team-workflow.md`.

## Rules for this skill

- Do not skip step 1 "because the task is obvious". Context is cheap;
  rework is not.
- If `mr-context` or `herdr-setup` fail to load, say so and continue with
  `14-team-workflow.md` as fallback — never proceed blind.
- pipeline-init is the entry point, not a loop. Load once per task session,
  not per message.
