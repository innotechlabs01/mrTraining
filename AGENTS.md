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
| **Mobile / React Native** | `mobile-rules/*` (ver seccion abajo) |
| **Cualquier cosa** | `MASTER_PROMPT.md` (siempre) |

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

## WORKFLOW OBLIGATORIO

```
Recibes una tarea
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
```

---

## STACK

| Capa | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router) + React 18 + TypeScript strict + Tailwind CSS 3 |
| Auth | Clerk v6 (`@clerk/nextjs`) |
| Backend | Next.js API Routes (principal) + Go 1.25 (auxiliar, no activo en QA) |
| Database | Turso/LibSQL (principal) |
| Cache | Redis 7 |
| Event Bus | NATS 2.10 con JetStream |
| Mobile | React Native CLI + TypeScript strict + React Navigation + React Query |
| Monorepo | pnpm workspaces |

---

## COMANDOS UTILES

```bash
# Frontend (apps/web)
cd apps/web && pnpm dev          # Dev server en :3000
cd apps/web && pnpm build        # Build de produccion
cd apps/web && pnpm lint         # ESLint
cd apps/web && pnpm test         # Jest

# Backend (apps/backend)
cd apps/backend && go build ./... # Compilar
cd apps/backend && go test ./...  # Tests

# Mobile (apps/mobile)
cd apps/mobile && npx react-native run-ios     # iOS Simulator
cd apps/mobile && npx react-native run-android # Android Emulator
cd apps/mobile && npm test                      # Jest tests

# Infra (solo Redis + NATS necesarios para dev)
docker compose -f apps/backend/docker-compose.yml up -d redis nats
```

---

## ESTRUCTURA DEL PROYECTO

```
apps/
├── web/          # Next.js frontend (coach dashboard + landing)
├── backend/      # Go API (Fiber, Clean Architecture, CQRS)
├── rules/        # 15 archivos de reglas (esta es LA fuente de verdad)
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
