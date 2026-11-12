# Git Workflow + Changelog — Reglas Obligatorias

## 1. Branch Strategy (GitFlow simplificado)

```
main                    # protegida, solo merge vía PR aprobado
  └── dev               # rama de integración continua, protegida
        ├── feature/<siglas>-<descripcion-corta>  # ej: feature/db-rls-policies
        ├── fix/<siglas>-<descripcion-corta>
        ├── chore/<siglas>-<descripcion-corta>
        └── refactor/<siglas>-<descripcion-corta>
```

**Siglas por área:**
- `fe` — Frontend (web)
- `be` — Backend (API Go)
- `db` — Database / Supabase / Migraciones
- `mo` — Mobile (React Native)
- `in` — Infra / DevOps / CI
- `se` — Seguridad
- `ux` — UX/UI

**Regla:** Todo trabajo NUEVO sale de `dev` → `feature/<siglas>-<desc>`. PR siempre `feature/* → dev`. `dev → main` solo en release.

## 2. Flujo Obligatorio por Tarea

```
1. git checkout dev && git pull origin dev
2. git checkout -b feature/<siglas>-<descripcion>
3. Trabajar (commits atómicos, convencionales)
4. git push -u origin feature/<siglas>-<descripcion>
5. Abrir PR: feature/<siglas>-<descripcion> → dev
6. PR debe pasar: CI (lint, build, tests) + REVIEW gates (qa → code-reviewer → security-hacker)
7. USER GATE: aprobación explícita
8. Merge a dev (squash o merge commit, no rebase)
9. Borrar branch remoto y local
```

## 3. Changelog Obligatorio

Cada PR que toque **código de producción** (no solo docs/config) debe actualizar `CHANGELOG.md` en la raíz del repo.

### Formato (Keep a Changelog + semver)

```markdown
# Changelog

## [Unreleased]
### Added
- [db] RLS policies para tabla `workouts` — @dev-database (PR #123)
- [be] Endpoint GET /api/v1/athletes/:id/workouts — @dev-backend (PR #124)

### Changed
- [fe] Dashboard coach: nueva vista de progresión — @dev-front (PR #125)

### Fixed
- [mo] Crash al rotar pantalla en WorkoutDetail — @dev-react-native (PR #126)

### Security
- [se] Sanitización input en webhook Clerk — @security-hacker (PR #127)
```

### Reglas de entrada
- **Prefijo área**: `[fe]`, `[be]`, `[db]`, `[mo]`, `[in]`, `[se]`, `[ux]`
- **Autor**: GitHub handle del responsable (quien hizo el trabajo)
- **PR**: Número de PR para trazabilidad
- **Una línea por cambio significativo** (no un commit = una línea)

### Versionado
- `dev` merge → `Unreleased` se acumula
- Release tag `vX.Y.Z` → mover `Unreleased` a `## [X.Y.Z] - YYYY-MM-DD`
- `main` siempre refleja último release

## 4. Responsabilidades por Rol

| Rol | Debe actualizar changelog en PR |
|---|---|
| `dev-front` | Sí — cambios web |
| `dev-backend` | Sí — cambios API |
| `dev-database` | Sí — migraciones, RLS, schema |
| `dev-react-native` | Sí — cambios mobile |
| `architect` | No (plan only) |
| `qa` / `code-reviewer` / `security-hacker` | No (review only) |

## 5. Validación en CI (sugerido)

Agregar job en workflow que verifique:
- PR desde `feature/*` hacia `dev` (no a `main`)
- Branch name matches `feature/(fe|be|db|mo|in|se|ux)-.+`
- `CHANGELOG.md` modificado si hay cambios en `apps/web`, `apps/api`, `apps/mobile`
- Entrada changelog tiene formato correcto (prefijo área + autor + PR)

## 6. Excepciones

- **Hotfix crítico en producción**: branch `hotfix/<siglas>-<desc>` desde `main`, PR a `main` + `dev` (backport), changelog obligatorio.
- **Solo docs / config CI**: changelog opcional.
- **Features < 1 día, 1 archivo**: pueden saltar spec, PERO siguen gitflow + changelog.