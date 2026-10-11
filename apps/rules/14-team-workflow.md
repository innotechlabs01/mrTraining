# MR Training — Team Workflow

**Version 1.0 — 2026**

Workflow unificado para humanos y agentes AI que trabajan en este repo:
multi-branch con worktrees, pipeline spec-first, extracción de skills,
shared code por madurez, y comunicación en modo caveman.

---

## 1. Multi-branch con Git Worktrees

**Regla: un branch = un worktree.** Nunca cambiar de branch en el directorio
principal para trabajar en paralelo — eso es lo que pisa el trabajo de otros.

### Comandos (script oficial: `scripts/worktree.sh`)

```bash
scripts/worktree.sh new feature/invite-redesign       # crea worktree + pnpm install
scripts/worktree.sh new fix/ios-bundle main           # desde base custom
scripts/worktree.sh list                              # lista worktrees activos
scripts/worktree.sh remove feature/invite-redesign    # limpia (branch queda)
scripts/worktree.sh sync                              # fetch + update main
```

Los worktrees viven en `../mr-training-worktrees/<branch>` (fuente del repo
principal, un directorio por branch).

### Convención de branches

```
main                  # siempre deployable — direct push PROHIBIDO
  ├── feature/<desc>  # features nuevas (vida corta: 1-3 días)
  ├── fix/<desc>      # bugs
  ├── chore/<desc>    # deps, tooling, docs
  └── refactor/<desc> # refactor sin cambio de comportamiento
```

### Flujo completo por tarea

```
1. scripts/worktree.sh sync              # main al día
2. scripts/worktree.sh new feature/x     # worktree dedicado
3. cd ../mr-training-worktrees/x         # trabajar AHÍ, no en main
4. Commits atómicos (ver 12-coding-standards.md §7.2)
5. git push -u origin feature/x
6. PR a main (ver 12-coding-standards.md §7.3)
7. Tras merge: scripts/worktree.sh remove feature/x
```

Cada worktree necesita su propio `pnpm install` (lo hace el script). Un mismo
branch NO puede estar checked-out en dos worktrees a la vez — git lo bloquea
y está bien: eso es el aislamiento.

---

## 2. Pipeline Spec-First (Orca Team)

**Toda feature coach nueva pasa por el mismo pipeline.** Nada de escritura
ad-hoc: el spec reutilizable define roles, acceptance criteria y criterios
de UX una sola vez; cada feature lo extiende.

```
pipeline-init (skill, paso 0 — carga mr-context + herdr-setup [+ herdr si HERDR_ENV=1])
  ↓
Spec (docs/superpowers/specs/)
  ↓  defines: roles, AC, criterios UX, flujos
Plan (docs/superpowers/plans/)
  ↓  define: fases, archivos, estimaciones
BOARD.md (Orca Team kanban)
  ↓  TODO → In Progress → Review → Done
Worktree (sección 1)
  ↓
Implement + Validación (13-testing.md, mobile validation rule de AGENTS.md)
  ↓
PR a main → Review → Done
```

Reglas:
- Specs viven en `docs/superpowers/specs/YYYY-MM-DD-<feature>-design.md`.
- Usar el template oficial `docs/superpowers/specs/TEMPLATE-coach-feature.md`
  (roles + AC, criterios UX obligatorios, scope explícito fuera de alcance).
  Spec de referencia del Coach OS:
  `2026-07-08-coach-operating-system-design.md`.
- Nada llega a Done sin aprobación explícita del usuario.
- Features chicas (< 1 día, 1 archivo) pueden saltar spec — pero el board
  y el worktree siguen siendo obligatorios.

---

## 3. Extracción de Skills (Regla de las 3)

Cuando un mismo flujo se repite **2-3 veces** escrito a mano, se convierte
en un Skill cargable por descripción. Ahorra tokens e instrucciones repetidas.

Reglas:
- **No antes de la 2da repetición.** Un skill prematuro es deuda: se
  especializa de más, nadie lo usa, y hay que mantenerlo.
- El skill describe el FLUJO, no el código. El código vive en el repo.
- Un skill = una capacidad. Si crece demasiado, se divide.
- Ubicación: `.agents/skills/<nombre>/SKILL.md` (descubierto por OpenCode,
  Claude Code y otros agentes compatibles).
- Naming: kebab-case, verbo-first cuando aplica
  (`validate-mobile-ui`, `create-coach-spec`).

### Skills oficiales del repo

| Skill | Cuándo cargarlo |
|---|---|
| `pipeline-init` | **Paso 0 de CADA task** — bootstrap: carga mr-context + herdr-setup, y herdr si `HERDR_ENV=1`. Invocar ANTES de tocar código |
| `mr-context` | Al INICIO de CADA tarea — mapa del repo, no-negociables, barra de calidad senior (lo carga pipeline-init) |
| `herdr-setup` | Cuando el humano pregunta por Herdr, quiere panes paralelos de agentes, o ver estados de agentes entre proyectos (lo carga pipeline-init) |
| `herdr` | Controlar Herdr desde dentro de un pane (inicia sesión en pane: `HERDR_ENV=1`) — arrancar agentes, leer output, esperar estados |

Nuevo skill oficial ⇒ agregarlo a esta tabla + mención en AGENTS.md.

---

## 4. Shared Code — Madurez Primero

`packages/` existe en el workspace pnpm pero está vacío. Llenarlo es un paso
grande — sólo cuando la madurez lo justifica.

### Criterios para mover código a `packages/` (todos deben cumplirse)

1. La lógica se usa REALMENTE en 2+ apps (no "algún día").
2. Se repitió en 3+ features.
3. Es lógica pura (domain/types/rules) — cero UI, cero dependencias de framework.

### Candidatos, en orden de probabilidad

1. **Tipos/DTOs compartidos web ↔ mobile**: generarlos desde el contrato del
   Go API (OpenAPI), NO escribirlos a mano. Go API es la fuente de verdad —
   los types se derivan del contrato, nunca al revés.
2. **Reglas de dominio puras** (cálculo ACWR, scoring de readiness, validadores
   de workout): `packages/coach-core` o `packages/domain` si web y mobile
   ambos las necesitan.

### Advertencia de arquitectura

Web = frontend del COACH. Mobile = frontend del ATHLETE. Son usuarios
distintos con flujos distintos. **Verificar que la lógica es genuinamente
compartida antes de extraer** — la mayoría del código "similar" en web y
mobile es coincidencia, no duplicación. Copiar es barato; un paquete
mal abstraído cobra interés compuesto.

---

## 5. Comunicación — Modo Caveman Full

Todo agente AI que trabaje en este repo responde en **modo caveman full**
para ahorrar tokens. Aplica a la conversación, NO a los artefactos.

### Reglas caveman (reply del agente)

- Sin relleno: artículos, pleonasmos, hedging, cortesías — fuera.
- Fragmentos OK. Sinónimos cortos. Término técnico exacto.
- Patrón: `[cosa] [acción] [razón]. [siguiente paso].`
- Ejemplo malo: "Sure! I'd be happy to help. The issue you're experiencing..."
- Ejemplo bueno: "Bug en auth middleware. Token expiry usa `<` no `<=`. Fix:"

### Excepciones — caveman se baja

- Warnings de seguridad.
- Confirmación de operaciones irreversibles (borrado, force-push, DROP).
- Secuencias multi-paso donde un fragmento mal ordenado se malinterpreta.
- El usuario pide claridad o repite la pregunta.

### Artefactos — escritura NORMAL

Código, comentarios, commits, PRs, specs, docs, mensajes de error de UI:
escritura completa y profesional. El modo caveman governa la charla,
no lo que se committea. Commits sin atribución AI (ver git conventions).
