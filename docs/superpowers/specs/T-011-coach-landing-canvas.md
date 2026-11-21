# T-011 — Coach Landing Canvas (WYSIWYG) + Publish sin redeploy

**Status:** Spec
**Owner:** @user (aprobación en USER GATE)
**Fecha:** 2026-11-16

---

## 1. Objetivo

Convertir la opción de menú **"Landing Page"** del coach (`/coach/landing`) en un **editor canvas
(WYSIWYG)** con vista previa en vivo, de modo que:

- El coach ve **exactamente** lo que verá el visitante final (mismos componentes, mismos estilos).
- **Publicar NO es un deploy de Vercel.** Publicar = habilitar el HTML servido desde la DB
  (`is_published = true`). El navegador interpreta el HTML servido; no hay redeploy, no hay build.
- El contenido vive en el modelo ya existente `coach_landing_pages` (PostgreSQL), que fue diseñado
  para esto: `sections JSONB` documentado como *"arreglo de secciones (drag-and-drop)"*, slug
  público único, `is_published` para publicar/despublicar.

## 2. Problema actual (verificado en código)

El editor actual en `apps/web/src/app/(app)/coach/landing/page.tsx` edita el **landing global del
sitio** (`landing_content` vía `GET/PUT /api/v1/landing`), no la landing del coach. Su preview es
un modal que renderiza `components/landing/LandingPage.tsx` — un componente distinto al que
sirve `/l/[slug]`. Eso no es WYSIWYG: son dos renderizadores distintos.

Además hay **3 bugs de contrato** que impiden que el flujo de landing por coach funcione:

| # | Bug | Evidencia |
|---|---|---|
| B1 | `GET /api/v1/coach/landing` devuelve una **lista** de landings del coach; el cliente web asume un objeto único | `apps/api/internal/interfaces/http/handlers/coach_landing.go:73` (`GetByCoach` → `[]*LandingPage`) |
| B2 | `PUT /api/v1/coach/landing` **no existe**; la ruta real es `PUT /api/v1/coach/landing/:id` | `apps/api/internal/interfaces/http/routes/routes.go:786-792` |
| B3 | La página pública `/l/[slug]` consulta `${GO_API}/api/v1/l/:slug`, pero el API expone `/l/:slug` en la **raíz** del server | `routes.go:792` (`app.Get("/l/:slug")`) vs `apps/web/src/app/l/[slug]/page.tsx:33` |

Riesgo adicional: los handlers usan `c.Locals("coach_id").(string)` — aserción de tipo sin
comprobación que hace **panic** si el contexto de tenant no fue resuelto.

## 3. Decisiones (coordinador — requieren validación del arquitecto)

### D1 — Modelo de datos: un único renderer, dos superficies

El bloque de la landing es la **unidad de contenido**. Se renderiza con **un solo componente
React** (`CoachLandingBlock`) usado por:

- la vista previa del canvas (client component), y
- la página pública `/l/[slug]` (server component).

Garantía de WYSIWYG por construcción: si el preview y la página pública comparten renderer, no
pueden divergir. Ésta es la decisión arquitectónica central.

### D2 — Persistencia: `coach_landing_pages.sections`

El documento del canvas (lista de bloques) se serializa a JSON y se guarda en
`coach_landing_pages.sections` (JSONB). **Sin migración de schema**: la columna ya existe y su
semántica documentada ya es "arreglo de secciones (drag-and-drop)".

`config` JSONB guarda el theme del canvas (color primario, tipografía, fondo).
`images` JSONB guarda las URLs de media subidas.

### D3 — Publicar = `is_published`

- `PUT /api/v1/coach/landing/:id` → guarda el documento (canvas) y el theme.
- `PUT /api/v1/coach/landing/:id/publish` → `{ "is_published": true|false }`.

Publicar = 1 request. El visitante pide `/l/{slug}` y el server renderiza desde DB. Sin deploy.

### D4 — Scope del cambio de ruta

El editor canvas **reemplaza** la implementación de `/coach/landing` (la opción de menú). La
ruta `/coach/landing-builder` (huérfana, no está en el menú, y hoy llama endpoints inexistentes)
se **elimina**.

**Decisión a validar:** ¿el canvas reemplaza al editor de landing global (`landing_content`) o
coexiste con él? El editor actual de `/coach/landing` edita el **landing global del sitio**
(marketing), no la landing del coach. Son dos módulos distintos con dos tablas distintas.

### D5 — Estructura de frontend (feature-first, regla `06-frontend-architecture.md`)

El canvas **no** vive en `src/app/...`. Vive en la feature:

```
apps/web/src/features/coach/landing-canvas/
├── index.ts                      # barrel público
├── components/
│   ├── CoachLandingCanvas.tsx    # orquestador del editor (client)
│   ├── CanvasToolbar.tsx         # paleta de bloques + jerarquía de secciones
│   ├── CanvasStage.tsx           # lienzo: render de bloques + affordances de selección
│   ├── CanvasInspector.tsx       # panel de propiedades del bloque seleccionado
│   └── blocks/
│       ├── CoachLandingBlock.tsx # RENDERER ÚNICO (preview + público)
│       ├── HeroBlock.tsx
│       ├── HeadingBlock.tsx
│       ├── TextBlock.tsx
│       ├── ImageBlock.tsx
│       ├── ButtonBlock.tsx
│       ├── DividerBlock.tsx
│       ├── SocialLinksBlock.tsx
│       └── ContactBlock.tsx
├── hooks/
│   └── useLandingCanvas.ts       # estado del canvas (add/move/delete/update/undo)
├── types/
│   └── index.ts                  # CoachLandingBlock union + payload
├── api/
│   └── coachLanding.ts           # cliente del Go API (create/get/update/publish/upload)
└── utils/
    ├── serialize.ts              # canvas -> JSONB (sections/config/images)
    └── htmlExport.ts             # canvas -> HTML standalone (archivo, sin Vercel)
```

## 4. Criterios de aceptación (verificables por QA)

- **AC1** `/coach/landing` renderiza un canvas con: paleta de bloques, lienzo con vista previa,
  panel de propiedades, botón Publicar, y export HTML.
- **AC2** La vista previa del canvas y `/l/[slug]` renderizan el **mismo** componente de bloque
  (mismo import path). Verificable por grep del import y por comparación visual.
- **AC3** Añadir un bloque en el canvas lo muestra en la vista previa **sin recargar** la página.
- **AC4** Editar texto/color/tamaño de un bloque se refleja en la vista previa en vivo.
- **AC5** Publicar persiste el documento y hace que `/l/{slug}` sirva el contenido **sin deploy**
  (sin build de Vercel). Verificable: request a `/l/{slug}` devuelve el bloque recién publicado.
- **AC6** `pnpm build` termina exit 0 (hoy falla con `Property 'loaded' does not exist on type '{}'`
  en `tests/ui/mock-clerk-coach-client.ts:119`).
- **AC7** `pnpm lint` y `pnpm test` pasan.
- **AC8** `go build ./...` y `go test ./...` pasan en `apps/api`.
- **AC9** Un coach **no puede** editar ni publicar la landing de **otro** coach (ownership check).
- **AC10** El HTML exportado se abre en un navegador y muestra el mismo contenido que la vista previa.
- **AC11** No hay regresión en el flujo de pago (T-008/T-009 siguen verdes).

## 5. Roles

| Orden | Rol | Responsabilidad |
|---|---|---|
| 1 | `architect` | Validar D1-D5, descomponer, fijar contrato de bloques y endpoints |
| 2 | `dev-backend` | Arreglar B1/B2/B3 + panic de `coach_id` + endpoint de upload por coach |
| 3 | `dev-front` | Feature `landing-canvas` completa (D5) + reescritura de `/coach/landing` + `/l/[slug]` |
| 4 | `qa` | Verificar AC1-AC11 empíricamente |
| 5 | `code-reviewer` | Revisar el diff |
| 6 | `security-hacker` | Atacar: ownership, XSS en HTML exportado, open redirect, RLS |
| 7 | — | **USER GATE**: aprobación explícita del usuario |

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| XSS vía HTML exportado / bloques renderizados | Sanitizar contenido de texto; nunca `dangerouslySetInnerHTML` con input de coach; revisar en security stage |
| Coach A edita landing de coach B | `WHERE id = $1 AND coach_id = $2` ya está en repo; `Publish`/`Update` validan ownership via `GetByID`; verificar tests |
| Panic por `c.Locals("coach_id").(string)` | Usar helper seguro (`middleware.GetCoachID`) con comma-ok |
| Preview y público divergen | Renderer único compartido (D1) |
| Migración de schema no授权 | **No hay migración**: `sections`/`config`/`images` ya existen como JSONB |
| Regresión en landing global (`landing_content`) | No tocar `components/landing/LandingPage.tsx` ni `landing_content` salvo que el arquitecto decida lo contrario en D4 |

## 7. Fuera de alcance

- No tocar `apps/mobile`.
- No rediseñar el landing global de marketing (`components/landing/`).
- No agregar drag-and-drop de reordenamiento por pixel (el orden es por lista; mover = arriba/abajo).
- No persistir drafts sin publish (el guardado es explícito).
