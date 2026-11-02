# <Feature Name> — Design Spec

> **Template:** copy to `YYYY-MM-DD-<feature>-design.md` before filling.
> **Rule:** toda feature coach nueva pasa Spec → Plan → BOARD.md → Worktree → PR
> (`apps/rules/14-team-workflow.md` §2). Specs cortos (< 1 día, 1 archivo) pueden saltar.

---

## 1. Problema

Qué dolor resuelve, para quién, y qué pasa si NO lo hacemos.
Una o dos frases. Sin soluciones acá — esto es el problema, no el diseño.

## 2. Roles y AC

| Rol | Quién es | Goal principal |
|---|---|---|
| Coach | ... | ... |
| Athlete | ... | ... |

### Acceptance Criteria

Formato: `Given / When / Then`. Uno por comportamiento observable.

- [ ] **AC-1:** Given ..., When ..., Then ...
- [ ] **AC-2:** Given ..., When ..., Then ...

## 3. Criterios UX (obligatorios, no opcionales)

- **Loading:** skeleton o spinner contextual (nunca pantalla vacía).
- **Empty:** ilustración + copy + acción sugerida.
- **Error:** mensaje humano + retry. Nunca stack trace ni error crudo.
- **Primary action:** una por pantalla. La pantalla existe para esa acción.
- **Mobile:** 60 FPS, touch targets ≥ 44pt, safe areas respetadas.

## 4. Flujo de usuario

```
Paso 1 → Paso 2 → Paso 3 (primary action)
```

Incluir: back navigation, estados de error en cada paso, offline si aplica.

## 5. Diseño (la solución)

### Estructura de rutas / screens

```
/(app)/coach/<feature>/
├── page.tsx
└── ...
```

### Componentes (uno por responsabilidad)

| Componente | Responsabilidad |
|---|---|
| <FeatureLayout> | Shell |
| <FeatureList> | Lista/loading/empty |
| <FeatureItem> | Item individual |

### Types

```typescript
// Definir aquí o referenciar contrato Go API
```

## 6. API (si aplica)

**Regla:** endpoints NUEVOS se definen en `apps/api` (Go) primero. El spec
los lista acá; el frontend los consume, nunca los inventa.

| Método | Path | Purpose |
|---|---|---|
| GET | /api/v1/... | ... |

Contrato detalle: `apps/rules/08-api-specification.md`.

## 7. Fuera de scope (explícito)

Lo que NO incluye este spec. Obligatorio — protege el review y el scope:

- ...
- ...

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|---|---|---|
| ... | ... | ... |

## 9. Referencias

- Spec similar previo: `docs/superpowers/specs/<archivo>.md`
- Rules relevantes: `apps/rules/<archivo>.md`
