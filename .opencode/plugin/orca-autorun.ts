/**
 * orca-autorun.ts — Deterministic role → agent → skills router for the
 * Orca Team pipeline (apps/rules/14-team-workflow.md §2.0).
 *
 * Problem it solves: dispatch used to depend on the coordinator remembering
 * which agent file, skills and rules belong to each board role. Now the
 * mapping lives in ONE place (ROUTER below, mirroring §2.0) and is served
 * through tools, so every dispatch is identical.
 *
 * Tools:
 *   orca_status   → pending tasks per stage parsed from BOARD.md
 *   orca_dispatch → exact agent + skills + rules + worktree mode + template
 *                   for a given board role
 *
 * Limits (honest): a plugin cannot spawn workers by itself. The coordinator
 * (main agent or Orca run) still triggers one dispatch per gate — but each
 * dispatch is now a single tool call instead of manual reasoning.
 */

import fs from "node:fs"
import path from "node:path"
import { tool, type Plugin } from "@opencode-ai/plugin"

type RoleKey =
  | "dev-front"
  | "dev-backend"
  | "dev-react-native"
  | "dev-flutter"
  | "ux-ui-designer"
  | "qa"
  | "code-reviewer"
  | "security-hacker"

const ROUTER: Record<
  RoleKey,
  { agent: string; skills: string[]; rules: string[]; worktree: string }
> = {
  "dev-front": {
    agent: ".opencode/agent/web.md",
    skills: ["pipeline-init", "mr-context"],
    rules: ["MASTER_PROMPT.md", "00-product-vision.md", "03-ux-workflows.md", "06-frontend-architecture.md", "08-api-specification.md"],
    worktree: "new-child",
  },
  "dev-backend": {
    agent: ".opencode/agent/api.md",
    skills: ["pipeline-init", "mr-context"],
    rules: ["MASTER_PROMPT.md", "04-database-design.md", "05-backend-architecture.md", "08-api-specification.md"],
    worktree: "new-child",
  },
  "dev-react-native": {
    agent: ".opencode/agent/mobile.md",
    skills: ["pipeline-init", "mr-context"],
    rules: ["MASTER_PROMPT.md", "mobile-rules/00-mobile-architecture.md", "mobile-rules/01-mobile-ui-ux.md", "mobile-rules/02-mobile-code-quality.md", "mobile-rules/03-mobile-testing.md", "mobile-rules/04-mobile-security.md", "mobile-rules/05-mobile-performance.md", "mobile-rules/06-mobile-bug-hunter.md"],
    worktree: "new-child",
  },
  "dev-flutter": {
    agent: "general (no hay agente flutter registrado)",
    skills: ["pipeline-init", "mr-context"],
    rules: ["MASTER_PROMPT.md"],
    worktree: "new-child",
  },
  "ux-ui-designer": {
    agent: ".opencode/agent/web-designer.md o .opencode/agent/mobile-designer.md (según superficie)",
    skills: ["pipeline-init", "mr-context"],
    rules: ["01-brand-guidelines.md", "02-design-system.md", "03-ux-workflows.md"],
    worktree: "current",
  },
  qa: {
    agent: ".opencode/agent/qa.md",
    skills: ["pipeline-init", "mr-context"],
    rules: ["13-testing.md", "mobile-rules/03-mobile-testing.md (si mobile)"],
    worktree: "current",
  },
  "code-reviewer": {
    agent: ".opencode/agent/code-reviewer.md",
    skills: ["pipeline-init", "mr-context"],
    rules: ["12-coding-standards.md"],
    worktree: "current",
  },
  "security-hacker": {
    agent: ".opencode/agent/security-hacker.md",
    skills: ["pipeline-init", "mr-context"],
    rules: ["11-security.md", "mobile-rules/04-mobile-security.md (si mobile)"],
    worktree: "current",
  },
}

const GATE_ORDER = ["qa", "code-reviewer", "security-hacker"] as const

function repoRoot(toolCtx: any): string {
  return toolCtx.worktree || toolCtx.directory || process.cwd()
}

function parseBoard(root: string): Record<string, string[]> {
  const fallback: Record<string, string[]> = { TODO: [], "In Progress": [], Review: [], Done: [] }
  try {
    const raw = fs.readFileSync(path.join(root, "BOARD.md"), "utf8")
    let stage = ""
    for (const line of raw.split("\n")) {
      const h = line.match(/^##\s+(.+)\s*$/)
      if (h && fallback[h[1]] !== undefined) {
        stage = h[1]
        continue
      }
      if (stage && /^\s*-\s+\[[ x]\]\s+\S/.test(line)) fallback[stage].push(line.trim())
    }
  } catch {
    // Missing/unreadable board → empty stages, never throw
  }
  return fallback
}

export const OrcaAutorun: Plugin = async () => {
  return {
    tool: {
      orca_status: tool({
        description:
          "Lee BOARD.md del proyecto y devuelve tareas pendientes por stage (TODO / In Progress / Review / Done). Úsalo al iniciar sesión o antes de cada dispatch.",
        args: {},
        async execute(_args, toolCtx) {
          const stages = parseBoard(repoRoot(toolCtx))
          const pending = [...stages["In Progress"], ...stages["Review"]]
          return JSON.stringify({ stages, pendingDispatch: pending }, null, 2)
        },
      }),

      orca_dispatch: tool({
        description:
          "Dado un rol del board (dev-front, dev-backend, dev-react-native, qa, code-reviewer, security-hacker...), devuelve el agente exacto, skills a invocar, reglas a leer, modo worktree y contrato worker_done. Fuente única: 14-team-workflow.md §2.0.",
        args: {
          role: tool.schema
            .string()
            .min(1)
            .describe("Rol del board, ej. dev-react-native, qa, code-reviewer, security-hacker."),
          task: tool.schema
            .string()
            .min(1)
            .describe("ID tarea, ej. T-002."),
        },
        async execute(args, toolCtx) {
          const role = (args as any).role as string
          const task = (args as any).task as string
          const entry = (ROUTER as Record<string, (typeof ROUTER)[RoleKey]>)[role]
          if (!entry) {
            return JSON.stringify({
              error: `Rol desconocido: ${role}`,
              validRoles: Object.keys(ROUTER),
              gateOrder: GATE_ORDER,
            })
          }
          return JSON.stringify(
            {
              task,
              role,
              agent: entry.agent,
              skillsToInvoke: entry.skills,
              rulesToRead: entry.rules,
              worktreeMode: entry.worktree,
              repoRoot: repoRoot(toolCtx),
              workerDoneContract: "outcome explícito (PASS/FAIL) + resumen 3 frases + --files-modified si hubo código. FAIL = loop rule (max 3/stage).",
            },
            null,
            2
          )
        },
      }),
    },
  }
}
