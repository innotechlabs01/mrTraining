---
name: herdr-setup
description: Guide a human through understanding, installing, setting up or troubleshooting Herdr (terminal workspace manager for AI agents). Use when the user mentions Herdr, wants parallel agent panes, or asks how to see agent states across projects.
metadata:
  audience: developers
  workflow: setup
---

# Herdr Setup

Herdr = terminal workspace manager for AI agents (tmux-like, mouse-first,
agent-aware sidebar: working/blocked/done states per pane).

Canonical guide: https://herdr.dev/agent-guide.md — **read it first, then
walk the human step by step.** Docs: https://herdr.dev/docs/. Never invent
keybindings/config/flags — verify against the docs pages.

## First check

`HERDR_ENV=1` set? Human is already inside a Herdr pane — skip launch
instructions (nested launch is blocked by design). Go straight to skill
control: https://raw.githubusercontent.com/herdrdev/herdr/master/skills/herdr/SKILL.md

## Setup path (outside a pane)

1. Install: `curl -fsSL https://herdr.dev/install.sh | sh` then `herdr`
   (macOS/Linux). Onboarding flow on first run.
2. In each pane start the coding agent (`claude`, `opencode`, ...). Herdr
   auto-detects. `herdr integration install <agent>` for lifecycle state /
   session restore when available.
3. Mouse-first: click panes/tabs, drag borders, right-click menus. No
   keybindings required.
4. Splits: `prefix+v` (right), `prefix+minus` (down). New tab: `prefix+c`.
   Prefix = `ctrl+b`. `prefix+?` shows live bindings.
5. Detach: `prefix+q` or close window — everything keeps running. Reattach:
   `herdr`. Full stop: `herdr server stop`.

## Fit with our workflow

One Herdr workspace per repo; pair with one worktree per branch
(`scripts/worktree.sh`, see `apps/rules/14-team-workflow.md` §1). Sidebar
agent states = visibility when several agents work parallel worktrees.

## Diagnosis quick refs

- Agent not detected: `herdr agent list`, `herdr agent explain <target> --json`
- Keybinding dead: outer terminal owns the chord → https://herdr.dev/docs/keyboard/
- Status/logs: `herdr status`, `~/.config/herdr/`
