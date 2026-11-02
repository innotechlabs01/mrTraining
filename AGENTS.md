# MR TRAINING — AGENTS.md (Rule Manager)

## REGLA DE ORO

**ANTES de cualquier cambio de codigo, diseño, arquitectura, o configuracion, DEBES leer los archivos de reglas relevantes en `apps/rules/`.**

Si no sabes que regla aplica, lee `apps/rules/MASTER_PROMPT.md` primero.

---

## MAPA DE REGLAS POR TIPO DE CAMBIO

| Tipo de cambio | Reglas obligatorias |
|---|---|
| **Nuevo feature/producto** | `00-product-vision.md` + `03-ux-workflows.md` |
| **UI / Diseño / Estilos** | `01-brand-guidelines.md` + `02-design-system.md` |
| **Flujos de usuario / UX** | `03-ux-workflows.md` |
| **Base de datos / Schema** | `04-database-design.md` |
| **Backend / API / Go** | `05-backend-architecture.md` + `08-api-specification.md` |
| **Frontend / Next.js / React** | `06-frontend-architecture.md` |
| **APIs / Endpoints** | `08-api-specification.md` |
| **AI / ML** | `09-ai-specification.md` |
| **DevOps / CI/CD / Docker** | `10-devops.md` |
| **Seguridad / Auth** | `11-security.md` |
| **Coding style / Linting** | `12-coding-standards.md` |
| **Testing** | `13-testing.md` |
| **Team workflow / Caveman** | `14-team-workflow.md` |
| **Mobile / React Native** | `mobile-rules/*` (ver seccion abajo) |
| **Cualquier cosa** | `MASTER_PROMPT.md` (siempre) |

## REGLA OBLIGATORIA — MIGRACIONES DE BASE DE DATOS (PostgreSQL / Supabase)

**Todo cambio de esquema de base de datos DEBE ir acompañado de su archivo de migración SQL en `apps/api/migrations/postgres/`.** Nunca se aplica un cambio de schema directamente contra la base sin una migración versionada.

| Reglas obligatorias para migraciones |
|---|
| 1. Toda nueva tabla, columna, índice, clave foránea o restricción se crea mediante un archivo `.sql` numerado en `apps/api/migrations/postgres/` (formato `NNN_descripcion.sql`). |
| 2. Las migraciones son incrementales y reproducibles desde una base vacía. |
| 3. Usar placeholders `$1`, `$2`, ... (PostgreSQL), nunca `?` (SQLite/libSQL). |
| 4. Usar `NOW()` / `CURRENT_TIMESTAMP`, nunca `datetime('now')`. |
| 5. Usar `BOOLEAN` (`true`/`false`), nunca `INTEGER 0/1`. |
| 6. Usar `ON CONFLICT (...) DO NOTHING` / `DO UPDATE SET`, nunca `INSERT OR IGNORE` / `INSERT OR REPLACE`. |
| 7. Usar `gen_random_uuid()` o UUID generado en aplicación, nunca `hex(randomblob(16))`. |
| 8. Cada migración se aplica una sola vez y se registra en `schema_migrations`. Nunca se reescribe una migración ya aplicada. |
| 9. Si se necesita un cambio adicional sobre una tabla ya migrada, se crea un archivo de migración nuevo (ej. `204_1_...`), no se modifica el existente. |
| 10. Antes de aplicar en QA o Producción, las migraciones deben ejecutarse y verificarse contra una base PostgreSQL local vacía. |
| 11. Nunca eliminar ni sobrescribir datos sin autorización. Nunca ejecutar operaciones destructivas contra producción durante la auditoría. |
| 12. Turso/libSQL queda retirado: el único driver de base de datos es `github.com/jackc/pgx/v5` con `database/sql`. |

## REGLA OBLIGATORIA — SIN MIGRACIÓN NO HAY CAMBIO DE SCHEMA

Si un cambio requiere modificar la base de datos (tabla, columna, índice, restricción, FK), el agente debe:
1. Crear el archivo de migración correspondiente en `apps/api/migrations/postgres/`.
2. Aplicarlo en la base local de desarrollo (`DATABASE_URL` apuntando a PostgreSQL local).
3. Verificar que `go build ./...` y los tests correspondientes pasen.
4. Solo entonces tocar el código Go/TypeScript que dependa de ese esquema.

---

### Reglas Mobile (React Native)

Cuando trabajes en `apps/mobile/`, React Native, o cualquier feature mobile, activa TODAS estas reglas:

| Regla | Archivo | Cuando aplica |
|---|---|---|
| **Arquitectura** | `mobile-rules/00-mobile-architecture.md` | Estructura del proyecto, capas, navegacion |
| **UI/UX** | `mobile-rules/01-mobile-ui-ux.md` | Diseño de pantallas, componentes, estados |
| **Codigo** | `mobile-rules/02-mobile-code-quality.md` | TypeScript, naming, hooks, componentes |
| **Testing** | `mobile-rules/03-mobile-testing.md` | Unit tests, coverage, bug fixes |
| **Seguridad** | `mobile-rules/04-mobile-security.md` | OWASP, almacenamiento seguro, API |
| **Performance** | `mobile-rules/05-mobile-performance.md` | 60 FPS, FlashList, bundles, memoria |
| **QA / Bugs** | `mobile-rules/06-mobile-bug-hunter.md` | Edge cases, doble tap, offline, rotacion |

---

## GLOBAL MOBILE UI VALIDATION RULE

**Scope: Only applies when working in `apps/mobile/` (React Native app).**

For every mobile task that changes UI, navigation, interaction, state, or user flow **inside `apps/mobile/`**, the task is NOT complete until the real application has been tested on a running Android emulator/device or iOS simulator/device using the available mobile MCP (Maestro).

### Mandatory workflow

1. Read and understand the task requirements.
2. Implement the change.
3. Build the mobile application.
4. Launch/install the application on the available mobile target.
5. Use the mobile MCP to interact with the REAL rendered UI.
6. Validate:

   * screen rendering
   * navigation
   * buttons and touch interactions
   * text inputs
   * forms
   * lists/scrolling
   * loading states
   * success states
   * error states
   * empty states when applicable
   * keyboard behavior when applicable
   * back navigation
   * permissions when applicable
7. Take screenshots when visual validation is relevant.
8. Compare the actual result against the task requirements and expected UX.
9. If anything fails, is visually incorrect, inaccessible, broken, or inconsistent:

   * diagnose the root cause
   * fix the implementation
   * rebuild/reload the application
   * repeat the real-device/emulator validation
10. Continue until the affected flow passes.

### Strict completion rule

NEVER mark a mobile task as completed because:

* the code compiles
* TypeScript/Dart checks pass
* unit tests pass
* static analysis passes
* the implementation looks correct from the source code
* the UI was only inspected from screenshots provided by the user

Those checks are necessary but NOT sufficient.

The actual running mobile application MUST be validated.

### MCP requirement

Prefer the configured mobile MCP/ Maestro tools for UI interaction and validation.

If the mobile MCP is unavailable:

1. Do NOT falsely claim that the UI was validated.
2. Report that real mobile validation could not be performed.
3. Continue with code-level validation if possible.
4. Mark the task as BLOCKED rather than COMPLETE.

### Final response requirement

Before declaring completion, report:

* Build result
* Mobile target tested
* Screens/flows tested
* UI interactions tested
* E2E result
* Any remaining issues

Use one of these final statuses:

PASS — implementation and real mobile UI validation passed.

PASS WITH LIMITATIONS — implementation passed but a clearly documented validation limitation remains.

BLOCKED — real mobile UI validation could not be performed.

NEVER report PASS when the real mobile UI was not actually tested.

---

## WORKFLOW OBLIGATORIO

```
Recibes una tarea
  ↓
0. Invoca el skill `pipeline-init` (carga mr-context + herdr-setup,
   y herdr si HERDR_ENV=1). Trabajá SIEMPRE en `main` en el checkout
   `mr-training` (SIN branches ni worktrees). Los agentes se activan
   como worker-tasks sobre ese checkout.
   Detalle: 14-team-workflow.md
  ↓
1. Identifica el tipo de cambio
  ↓
2. Lee el/los archivo(s) de reglas de `apps/rules/` correspondientes
  ↓
3. Lee el MASTER_PROMPT.md si tienes dudas
  ↓
4. Ejecuta el cambio siguiendo las reglas
  ↓
5. Verifica con lint, build, tests segun 13-testing.md
  ↓
6. Commit atomico convencional + PR a main. Sin worktrees: trabajá en mr-training.
```

---

## EJECUCIÓN AUTÓNOMA CON SKILLS DEL EQUIPO

**Los skills son el camino de ejecución, no un accesorio.** Antes de resolver
una tarea, el agente DEBE cargar los skills que apliquen y seguirlos al pie de
la letra. No improvises un flujo propio si ya existe un skill.

| Skill | Cuándo |
|---|---|
| `pipeline-init` | Paso 0 de toda tarea (contexto + reglas). |
| `mr-context` | Mapa del repo, no-negociables y barra senior. |
| `orca-team` | Orquestación multi-rol sobre el board (ver abajo). |
| `herdr` / `herdr-setup` | Sólo si `HERDR_ENV=1`. |

### orca-team — equipo orquestado

Cuando la tarea NO es un cambio trivial de un solo archivo, el agente trabaja
como **coordinador** del pipeline orca-team. Los role prompts viven en el skill
(`~/.config/opencode/skills/orca-team/roles/*.md`); NO hay plugin ni agentes
project-local (fueron removidos en `d1f4b55` — ver `14-team-workflow.md` §2.0).

```
pipeline-init → Spec → TODO (architect) → IN PROGRESS (devs + ux-ui)
  → REVIEW (qa → code-reviewer → security-hacker) → USER GATE → DONE
```

- El board `BOARD.md` es la fuente de verdad; actualizalo en CADA transición.
- El coordinador NO improvisa: lee el role template del skill, llena el
  `Task Context`, y despacha con
  `orca orchestration worker-start --spec "$SPEC" --worktree current --agent opencode --json`.
- Verificá que Orca responda antes de despachar:
  `/Applications/Orca.app/Contents/Resources/bin/orca --version`. Si no
  responde, reportá el fallo y degradá a ejecución directa; NUNCA simules orca.
- Los workers heredan el modelo default global de
  `~/.config/opencode/opencode.json`; `--model` NO se soporta con
  `--agent opencode`.

### Autonomía — no pedir aprobación paso a paso

- **NO pidas aprobación** por cada decisión de implementación o diseño:
  ejecutá los cambios según los skills y `apps/rules/`.
- Pedile al usuario SÓLO si: (1) llegaste al **USER GATE** (feature completa
  lista para Done), (2) la decisión es irreversible o sensible en seguridad
  (borrar datos, migraciones destructivas, credenciales, producción), o
  (3) hay una ambigüedad real con tradeoffs que no podés resolver.
- Hacé **una sola** pregunta y detenete a esperar.
- Nada llega a Done sin aprobación explícita ("apruebo" / "approved" / "done").

---

## TEAM WORKFLOW (detalle en `14-team-workflow.md`)

- **Paso 0 — pipeline-init:** todo agente invoca el skill `pipeline-init`
  ANTES de tocar código. Carga `mr-context` (mapa repo, no-negociables,
  barra senior) + `herdr-setup` (conceptos Herdr) + `herdr` sólo si
  `HERDR_ENV=1` (corre dentro de un pane Herdr).
- **Todo en main, sin branches ni worktrees:** trabajá SIEMPRE en el
  checkout `mr-training` sobre `main`. NO ejecutes `scripts/worktree.sh`,
  NO crees branches de trabajo ni worktrees; los agentes se activan como
  worker-tasks sobre ese checkout.
- **Spec-first + stage machine:** toda feature coach nueva pasa
  Spec → TODO (architect) → In Progress (devs) → Review (qa →
  code-reviewer → security-hacker) → USER GATE → Done. Loop max
  3 por stage. Specs en `docs/superpowers/specs/` (template:
  `TEMPLATE-coach-feature.md`). Detalle: `14-team-workflow.md` §2.
- **Skills:** flujo repetido 2-3 veces → extraer como Skill. No antes.
- **Shared code:** mover a `packages/` sólo con uso real en 2+ apps y lógica
  pura (types/domain/rules). Generar types desde el contrato Go API.
- **Caveman full:** los agentes responden en modo caveman (sin relleno, ahorro
  de tokens). Código, commits, specs y docs se escriben NORMAL. Seguridad e
  irreversibles siempre en claro. Detalle y excepciones: `14-team-workflow.md`.

---

## STACK

| Capa | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router) + React 18 + TypeScript strict + Tailwind CSS 3 |
| Auth | Clerk v6 (`@clerk/nextjs`) |
| Backend | **Go 1.25 API (FIBER) — FUENTE DE VERDAD** |
| Database | Turso/LibSQL (principal) |
| Cache | Redis 7 |
| Event Bus | NATS 2.10 con JetStream |
| Mobile | React Native CLI + TypeScript strict + React Navigation + React Query |
| Monorepo | pnpm workspaces |

---

## REGLA DE ORO — API-FIRST

**TODA la comunicación entre apps DEBE ir a través del Go API (`apps/api`).**

| App | Role | Regla |
|---|---|---|
| **Go API** (`apps/api`) | **Backend principal** | ÚNICA fuente de verdad para datos |
| **Web** (`apps/web`) | Frontend coach | Lee/escribe SOLO vía Go API |
| **Mobile** (`apps/mobile`) | Frontend athlete | Lee/escribe SOLO vía Go API |

### Flujo correcto
```
Mobile/Web → Go API → Database
Go API → Database → Mobile/Web
```

### Flujo INCORRECTO (NUNCA hacer esto)
```
Mobile → Next.js API Routes → Database  ❌
Web → Next.js API Routes → Database  ❌
Mobile → Next.js API Routes → Web  ❌
```

### Excepciones permitidas
- Next.js API Routes solo sirven para: webhooks de Clerk, server-side rendering data, y archivos estáticos
- Si necesitás datos en Next.js, consumí el Go API desde el server component

### Coordinación de contratos
1. **Cambios de contrato** → coordinar entre API, Web, y Mobile
2. **Nuevos endpoints** → agregar en Go API primero, luego actualizar clientes
3. **Migraciones DB** → Go API es el dueño del schema

---

## COMANDOS UTILES

```bash
# Frontend (apps/web)
cd apps/web && pnpm dev          # Dev server en :3000
cd apps/web && pnpm build        # Build de produccion
cd apps/web && pnpm lint         # ESLint
cd apps/web && pnpm test         # Jest

# Backend (apps/api — Go/Fiber)
cd apps/api && go build ./... # Compilar
cd apps/api && go test ./...  # Tests

# Mobile (apps/mobile)
cd apps/mobile && npx react-native run-ios     # iOS Simulator
cd apps/mobile && npx react-native run-android # Android Emulator
cd apps/mobile && npm test                      # Jest tests

# Infra (Redis para dev)
docker compose -f apps/api/docker-compose.dev.yml up -d redis
```

---

## ESTRUCTURA DEL PROYECTO

```
apps/
├── web/          # Next.js frontend (coach dashboard + landing)
├── api/          # Go API (Fiber, Clean Architecture, CQRS) — backend
├── rules/        # 16 archivos de reglas (esta es LA fuente de verdad)
│   └── mobile-rules/  # Reglas especificas para React Native
└── mobile/       # React Native (iOS + Android)

docs/
└── superpowers/  # Specs y planes generados por AI
    ├── plans/
    └── specs/
```

---

## PRINCIPIOS CLAVE (del MASTER_PROMPT)

1. Arquitectura antes que codigo
2. Features antes que paginas
3. Dominio antes que framework
4. Reutilizable antes que duplicado
5. Legible antes que inteligente
6. Simple antes que complejo
7. Mantenible antes que rapido
8. Nunca optimizar por velocidad. Siempre optimizar por calidad.
9. Pensar antes de codificar.
# Test change Sat Oct 10 22:21:11 -05 2026
