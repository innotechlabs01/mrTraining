#!/usr/bin/env bash
# worktree.sh — one branch = one worktree. See apps/rules/14-git-workflow.md
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
WT_BASE="$(dirname "$REPO_ROOT")/$(basename "$REPO_ROOT")-worktrees"

usage() {
  cat <<EOF
Usage: scripts/worktree.sh <command> [args]

Commands:
  new <branch> [base]   Create worktree for branch (base default: origin/main)
  list                  List worktrees
  remove <branch>       Remove worktree for branch (branch kept)
  sync [branch]         Fetch origin + update main

Options for 'new':
  --no-install          Skip pnpm install

Branch naming: feature|fix|chore|refactor/<short-description>
See apps/rules/14-git-workflow.md
EOF
  exit 1
}

cmd_new() {
  local branch="" base="origin/main" install=1
  for arg in "$@"; do
    case "$arg" in
      --no-install) install=0 ;;
      *) if [ -z "$branch" ]; then branch="$arg"; else base="$arg"; fi ;;
    esac
  done
  [ -n "$branch" ] || usage

  local dir="$WT_BASE/${branch//\//-}"

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    git worktree add "$dir" "$branch"
  else
    git fetch origin main --quiet
    git worktree add -b "$branch" "$dir" "$base"
  fi

  if [ "$install" = 1 ]; then
    (cd "$dir" && pnpm install)
  fi

  echo ""
  echo "Worktree ready: $dir"
  echo "Next: cd $dir && open editor"
}

cmd_list() {
  git worktree list
}

cmd_remove() {
  local branch="${1:?usage: worktree.sh remove <branch>}"
  local dir="$WT_BASE/${branch//\//-}"
  if git worktree remove "$dir" 2>/dev/null; then
    echo "Removed $dir (branch '$branch' kept)"
  else
    git worktree remove --force "$dir" || {
      echo "Worktree has uncommitted changes. Commit or stash first:"
      echo "  cd $dir && git add -A && git commit -m 'wip: checkpoint before removing worktree'"
      exit 1
    }
    echo "Force-removed $dir (branch '$branch' kept)"
  fi
  git worktree prune
}

cmd_sync() {
  git fetch origin
  git -C "$REPO_ROOT" pull --ff-only origin main
  echo "main updated. Worktrees keep their own branches — rebase each before PR."
}

case "${1:-}" in
  new)    shift; cmd_new "$@" ;;
  list)   cmd_list ;;
  remove) shift; cmd_remove "$@" ;;
  sync)   shift; cmd_sync "$@" ;;
  *)      usage ;;
esac
