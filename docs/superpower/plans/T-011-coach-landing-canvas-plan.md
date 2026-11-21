# T-011 — Coach Landing Canvas: Plan de Arquitectura (D1-D5 validado)

**Estado:** Plan (listo para USER GATE)
**Rol:** Architect
**Fecha:** 2026-11-16
**Espec base:** `docs/superpower/specs/T-011-coach-landing-canvas.md`

---

## 1. Decisión D4 — alcance de la ruta (ambigüedad resuelta)

### Decisión: Opción (b)

El canvas va a una **ruta nueva** (`/coach/landing-canvas`) y el editor global se queda en `/coach/landing`.

### Qué cambia

| Elemento | Antes | Después |
|----------|-------|---------|
| Sidebar item "Landing Page" (`CoachSidebar.tsx:56`) | `href: '/coach/landing'` | `href: '/coach/landing-canvas'` |
| Ruta `/coach/landing` | Editor del **landing global** (`landing_content`, tabla marketing, renderizado por `components/landing/LandingPage.tsx` en la home) | **Sin cambios**. Sigue editando `landing_content`. |
| Ruta nueva `/coach/landing-canvas` | No existe (huérfano `/coach/landing-builder`) | Canvas WYSIWYG que edita la **landing del coach** (`coach_landing_pages`, slug, publicado en `/l/[slug]`). |
| Ruta `/coach/landing-builder` | Huérfana, llama endpoints inexistentes | **Eliminada** (per D4 de la spec). |

### Justificación

1. **Regla feature-first (`06-frontend-architecture.md`):** El canvas es una feature del coach que edita `coach_landing_pages` — un dominio distinto del editor global que edita `landing_content` (marketing). Cada feature vive en su propia ruta y carpeta bajo `src/features/`. Fusionarlas en una sola ruta rompe el encapsulamiento de features.

2. **"El navegador interpreta el HTML sin deploy":** Esto aplica a la landing del coach, servida desde DB en `/l/[slug]` (`is_published = true`). Es independiente de la home de marketing. El canvas escribe a `coach_landing_pages`; el navegador la interpreta al visitar `/l/{slug}`. No hay redeploy de Vercel. La home de marketing (`landing_content`, `LandingPage.tsx`) sigue sirviéndose como hoy.

3. **No romper la home de marketing:** `/coach/landing` no se toca. Sigue editando `landing_content` y la home sigue renderizando `components/landing/LandingPage.tsx`. Sin migración de schema, sin tocar `components/landing/` ni la tabla `landing_content`.

### Semántica del sidebar

El label "Landing Page" se mantiene (ahora apunta al canvas del coach, que es lo que un coach espera al hacer clic). El id del item se conserva (`landing`) para no romper estilos/selectores existentes. Solo cambia el `href`.

---

## 2. Validación de D1-D3 y D5

| Decisión | Veredicto | Comentario |
|----------|-----------|------------|
| **D1** — Un único renderer `CoachLandingBlock` usado por preview del canvas y por `/l/[slug]` | **VÁLIDO, mantener** | Es la garantía de WYSIWYG por construcción. El renderer vive en `features/coach/landing-canvas/components/blocks/CoachLandingBlock.tsx`. |
| **D2** — Persistencia en `coach_landing_pages.sections` (JSONB) + `config` + `images` | **VÁLIDO, mantener** | Las columnas ya existen (migración 416). Sin nueva migración. `sections` = array de bloques (drag-and-drop). |
| **D3** — `PUT /coach/landing/:id` guarda documento; `PUT /coach/landing/:id/publish` activa `is_published` | **VÁLIDO, mantener** | Los endpoints ya existen en Go (`coach_landing.go:29`, `:30`). Se usan tal cual; se corrigen B1/B2/B3 en el cliente web. |
| **D5** — Estructura bajo `src/features/coach/landing-canvas/` | **VÁLIDO, mantener** | Cumple `06-frontend-architecture.md`. No vive en `src/app/`. |

---

## 3. Contrato de bloques (TypeScript)

Ubicación: `apps/web/src/features/coach/landing-canvas/types/index.ts`

```typescript
export type BlockType =
  | 'hero'
  | 'heading'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'social-links'
  | 'contact'

export interface BaseBlock {
  id: string
  type: BlockType
  order: number
}

export interface BlockStyle {
  backgroundColor?: string
  textColor?: string
  padding?: string
  marginBottom?: string
  width?: 'full' | 'boxed'
  align?: 'left' | 'center' | 'right'
}

export interface HeroBlockProps extends BlockStyle {
  headline: string
  subheadline: string
  ctaLabel: string
  ctaUrl: string
  mediaUrl?: string
  mediaAlt?: string
}

export interface HeadingBlockProps extends BlockStyle {
  level: 'h1' | 'h2' | 'h3' | 'h4'
  text: string
}

export interface TextBlockProps extends BlockStyle {
  body: string
}

export interface ImageBlockProps extends BlockStyle {
  src: string
  alt: string
  width?: 'auto' | 'full'
  rounded?: boolean
}

export interface ButtonBlockProps extends BlockStyle {
  label: string
  url: string
  variant: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export interface DividerBlockProps extends BlockStyle {
  style: 'solid' | 'dashed' | 'dotted'
  thickness: '1px' | '2px'
}

export interface SocialLink {
  label: string
  url: string
  icon?: string
}

export interface SocialLinksBlockProps extends BlockStyle {
  links: SocialLink[]
  layout?: 'row' | 'column'
}

export interface ContactBlockProps extends BlockStyle {
  email?: string
  phone?: string
  whatsapp?: string
  city?: string
  socialLinks: SocialLink[]
}

// Unión discriminada: cada bloque lleva id, type, order + props propios
export type CoachLandingBlock =
  | (BaseBlock & { type: 'hero'; props: HeroBlockProps })
  | (BaseBlock & { type: 'heading'; props: HeadingBlockProps })
  | (BaseBlock & { type: 'text'; props: TextBlockProps })
  | (BaseBlock & { type: 'image'; props: ImageBlockProps })
  | (BaseBlock & { type: 'button'; props: ButtonBlockProps })
  | (BaseBlock & { type: 'divider'; props: DividerBlockProps })
  | (BaseBlock & { type: 'social-links'; props: SocialLinksBlockProps })
  | (BaseBlock & { type: 'contact'; props: ContactBlockProps })

export interface CanvasConfig {
  primaryColor: string
  fontFamily: string
  backgroundColor: string
}

export interface ImageAsset {
  id: string
  url: string
  filename: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string
}

export interface CoachLandingDocument {
  id: string
  coachId: string
  slug: string
  title: string
  subtitle: string
  config: CanvasConfig
  sections: CoachLandingBlock[]
  images: ImageAsset[]
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export interface CoachLandingListItem {
  id: string
  slug: string
  title: string
  subtitle: string
  isPublished: boolean
  updatedAt: string
}
```

Reglas del contrato:
- `sections` (JSONB) se serializa/deserializa como `CoachLandingBlock[]`.
- `config` (JSONB) = `CanvasConfig` (tema del canvas).
- `images` (JSONB) = `ImageAsset[]` (URLs de media subidas).
- `type` es el discriminador. Todo `switch` sobre `type` debe ser exhaustivo (`assertNever` en default).
- Sin `any`. Todo tipado explícito.

---

## 4. Contrato de endpoints (Go API, `/api/v1`)

Todos los endpoints de coach-landing ya existen en `coach_landing.go`. El cliente web los consume así. Se corrigen B1, B2, B3 y el panic de `coach_id`.

| # | Método | URL | Auth | Request | Respuesta | Reglas de negocio |
|---|--------|-----|------|---------|-----------|-------------------|
| E1 | GET | `/api/v1/coach/landing` | Coach | — | `{ data: CoachLandingPage[] }` | Lista de landings del coach autenticado. Cada ítem trae `sections`/`config`/`images` completos. |
| E2 | POST | `/api/v1/coach/landing` | Coach | `CreateInput` | `{ data: CoachLandingPage }` | Crea landing. `coach_id` desde contexto de sesión (NO del body). Slug único global. |
| E3 | PUT | `/api/v1/coach/landing/:id` | Coach (ownership) | `UpdateInput` (parcial) | `{ updated: true }` | Solo si `id` y `coach_id` coinciden. 404 si no existe o no es del coach. |
| E4 | PUT | `/api/v1/coach/landing/:id/publish` | Coach (ownership) | `{ is_published: boolean }` | `{ published: boolean }` | Activa/desactiva `is_published`. Solo dueño. |
| E5 | DELETE | `/api/v1/coach/landing/:id` | Coach (ownership) | — | `{ deleted: true }` | Solo dueño. |
| E6 | GET | `/l/:slug` | Público (sin auth) | — | `CoachLandingPage` | Solo `is_published = true`. 404 si no existe o no publicado. |
| E7 | POST | `/api/v1/landing/media` | Coach | multipart `file` | `{ url: string }` | **YA EXISTE** (`routes_setup.go:373` → `HandlerUploadLandingMedia`). Sube a `/uploads/landing/` local. NO hay presigned URL ni S3 en este repo — el plan original inventaba E7; se corrige a la ruta real. |

### Correcciones de contratos (bugs B1-B3 + panic)

- **B1:** `GET /api/v1/coach/landing` devuelve una **lista** `[]*LandingPage`; el cliente web asumía un objeto único. **Fix:** el cliente web trata la respuesta como lista (`data[]`), selecciona una landing (primera o por `id`), y edita esa. No se cambia el backend.
- **B2:** `PUT /api/v1/coach/landing` **no existe**; la ruta real es `PUT /api/v1/coach/landing/:id`. **Fix:** el canvas llama a E3 con `:id`. No se agrega `PUT /coach/landing` (sin id).
- **B3:** `/l/[slug]` (web) consulta `${GO_API}/api/v1/l/:slug`, pero la ruta Go está en la **raíz** `app.Get("/l/:slug")` (`routes.go:792`). **Fix:** el web llama a `${GO_API}/l/:slug` (sin `/api/v1`).
- **Panic:** `c.Locals("coach_id").(string)` es una aserción de tipo sin comprobación → panic si falta el contexto de tenant. **Fix:** usar comma-ok seguro: `coachID, ok := c.Locals("coach_id").(string); if !ok || coachID == "" → 403`. Aplicar en todos los handlers de `coach_landing.go`.

### Endpoints del landing GLOBAL (no se tocan)

`GET/PUT /api/v1/landing` y `POST /api/v1/landing/media` siguen sirviendo al editor global en `/coach/landing` (`landing_content`). El canvas **no** los usa.

---

## 5. Roles y orden de ejecución

| Orden | Rol | Responsabilidad |
|-------|-----|-----------------|
| 1 | `architect` | Este plan: validar D1-D5, contrato de bloques, contrato de endpoints, decisión D4, subtareas, AC, riesgos. |
| 2 | `dev-backend` | Arreglar B1/B2/B3 (lado cliente es web, pero el backend valida), panic de `coach_id` (comma-ok), verificar E1-E6, upload-url E7. Tests Go. |
| 3 | `dev-front` | Feature `landing-canvas` completa (D5) en `src/features/coach/landing-canvas/`; reescribir `/coach/landing-canvas`; reescribir `/l/[slug]` para usar el renderer único (D1); corregir B3 en `page.tsx`; eliminar `/coach/landing-builder`; actualizar `CoachSidebar.tsx` href. |
| 4 | `qa` | Verificar AC1-AC12 empíricamente (incluido build, lint, tests). |
| 5 | `code-reviewer` | Revisar el diff completo. |
| 6 | `security-hacker` | Atacar: ownership (coach A no edita landing de coach B), XSS en HTML exportado/bloques, open redirect, RLS, `dangerouslySetInnerHTML`. |
| 7 | — | **USER GATE**: aprobación explícita del usuario antes de marcar Done. |

---

## 6. Descomposición en subtareas (límites claros)

Cada subtarea tiene: ID, título, rol, entrada, salida, definición de hecho (DoD), límites (qué NO toca).

### Fase 0 — Prerrequisito: desbloquear el build

**ST-00 — Corregir error de tipado en mock de Clerk que rompe `pnpm build`**
- Rol: `dev-front`
- Entrada: `apps/web/tests/ui/mock-clerk-coach-client.ts:119` (`Property 'loaded' does not exist on type '{}'`)
- Salida: mock de Clerk con `loaded: boolean` tipado; `pnpm build` exit 0 en `apps/web`
- DoD: `cd apps/web && pnpm build` termina con exit 0
- Límites: solo tipado del mock. Sin cambios de lógica.

### Fase 1 — Backend (contratos y correcciones)

**ST-01 — Corregir panic de `coach_id` en handlers de coach-landing**
- Rol: `dev-backend`
- Entrada: `apps/api/internal/interfaces/http/handlers/coach_landing.go`
- Salida: todos los handlers usan comma-ok para `c.Locals("coach_id")`; 403 si falta o está vacío
- DoD: `go build ./...` y `go test ./...` en `apps/api` pasan; ningún handler hace aserción de tipo sin comprobación
- Límites: solo `coach_landing.go`. Sin cambios a otras rutas.

**ST-02 — Verificar contratos de endpoints E1-E6 (backend)**
- Rol: `dev-backend`
- Entrada: `routes.go:786-792`, `coach_landing.go`, `repository.go`
- Salida: confirmar que E1-E6 existen y retornan los shapes esperados; E7 (`/api/v1/landing/media`) existe y sube a `/uploads/landing/` (NO hay presigned URL/S3 en este repo — ver corrección en la tabla de endpoints)
- DoD: `go build ./...` y `go test ./...` pasan; integración de endpoints probada con test DB
- Límites: sin nuevas rutas a menos que falte alguna (reportar al architect si falta).

### Fase 2 — Frontend (feature canvas + rutas)

**ST-03 — Crear estructura de feature y tipos de bloque**
- Rol: `dev-front`
- Entrada: contrato de bloques (sección 3 de este plan)
- Salida: `apps/web/src/features/coach/landing-canvas/` con `types/index.ts`, `index.ts` (barrel), `components/`, `blocks/`, `hooks/`, `api/`, `utils/`
- DoD: tipos sin `any`; `pnpm lint` y `pnpm test` en `apps/web` pasan para la feature nueva
- Límites: nada en `src/app/` salvo las rutas de página (ST-05, ST-06). No tocar `components/landing/`.

**ST-04 — Implementar renderer único `CoachLandingBlock` + bloques**
- Rol: `dev-front`
- Entrada: tipos de bloque (ST-03)
- Salida: `CoachLandingBlock.tsx` (renderer único) + `HeroBlock`, `HeadingBlock`, `TextBlock`, `ImageBlock`, `ButtonBlock`, `DividerBlock`, `SocialLinksBlock`, `ContactBlock`
- DoD: cada bloque renderiza solo con sus `props`; `switch` exhaustivo sobre `type`; componente puro presentacional
- Límites: no lógica de persistencia aquí. Solo render.

**ST-05 — Escribir página canvas `/coach/landing-canvas`**
- Rol: `dev-front`
- Entrada: ST-03, ST-04, endpoints E1-E4, E7
- Salida: `apps/web/src/app/(app)/coach/landing-canvas/page.tsx` que orquesta `CoachLandingCanvas` (paleta, lienzo, inspector, toolbar, publicar, exportar HTML)
- DoD: AC1, AC3, AC4, AC10 verificables; usa `useLandingCanvas` hook; persiste via `PUT /coach/landing/:id`; publica via `PUT /coach/landing/:id/publish`
- Límites: no usa endpoints del landing global (`/api/v1/landing`). Solo coach-landing.

**ST-06 — Reescribir página pública `/l/[slug]` con renderer único**
- Rol: `dev-front`
- Entrada: ST-04, endpoint E6 (fix B3)
- Salida: `apps/web/src/app/l/[slug]/page.tsx` (server component) que renderiza `CoachLandingBlock` desde datos de DB; elimina HTML inline crudo
- DoD: AC2 (mismo componente de bloque que el preview, mismo import path), AC5 (sirve contenido publicado sin deploy), B3 corregido (llama `${GO_API}/l/:slug`)
- Límites: server component. No interactividad cliente. No `dangerouslySetInnerHTML` con input de coach.

**ST-07 — Actualizar sidebar y eliminar ruta huérfana**
- Rol: `dev-front`
- Entrada: decisión D4
- Salida: `CoachSidebar.tsx:56` `href: '/coach/landing-canvas'`; eliminar `apps/web/src/app/(app)/coach/landing-builder/page.tsx`
- DoD: sidebar apunta al canvas; `/coach/landing-builder` ya no existe (404 si se accede)
- Límites: no tocar `/coach/landing` (editor global). No tocar `landing_content`.

### Fase 3 — API client web

**ST-08 — Agregar métodos de coach-landing al cliente API web**
- Rol: `dev-front`
- Entrada: endpoints E1-E7
- Salida: funciones en `apps/web/src/features/shared/api/client.ts` (o nueva `api/coachLanding.ts` dentro de la feature): `getCoachLandings`, `createCoachLanding`, `updateCoachLanding`, `publishCoachLanding`, `deleteCoachLanding`, `getPublicCoachLanding(slug)`, `uploadLandingMedia`
- DoD: tipado estricto (responses tipadas con `CoachLandingDocument`); usa `goFetch`/`serverFetch` según corresponda; sin Next.js API Routes para datos
- Límites: no modificar métodos del landing global (`getLanding`, `saveLanding`, `uploadLandingMedia`).

---

## 7. Criterios de aceptación observables (AC)

| ID | Criterio | Cómo se verifica |
|----|----------|------------------|
| AC1 | `/coach/landing-canvas` renderiza canvas: paleta de bloques, lienzo con vista previa, panel de propiedades, botón Publicar, export HTML | QA navega a `/coach/landing-canvas`, ve todos los elementos |
| AC2 | Vista previa del canvas y `/l/[slug]` renderizan el **mismo** componente de bloque (mismo import path) | `grep` del import de `CoachLandingBlock` en ambos; comparación visual lado a lado |
| AC3 | Añadir un bloque en el canvas se muestra en la vista previa **sin recargar** la página | QA agrega bloque, aparece al instante en el preview |
| AC4 | Editar texto/color/tamaño de un bloque se refleja en la vista previa en vivo | QA edita un campo del inspector, el preview se actualiza |
| AC5 | Publicar persiste el documento y `/l/{slug}` sirve el contenido **sin deploy** (sin build de Vercel) | QA publica, luego hace request a `/l/{slug}` y ve el bloque recién publicado |
| AC6 | `pnpm build` exit 0 en `apps/web` (hoy falla en `mock-clerk-coach-client.ts:119`) | `cd apps/web && pnpm build` exit 0 |
| AC7 | `pnpm lint` y `pnpm test` pasan en `apps/web` | `pnpm lint && pnpm test` exit 0 |
| AC8 | `go build ./...` y `go test ./...` pasan en `apps/api` | `cd apps/api && go build ./... && go test ./...` exit 0 |
| AC9 | Un coach **no puede** editar ni publicar la landing de otro coach (ownership check) | QA intenta `PUT /coach/landing/:id` con `coach_id` de otro coach → 403/404 |
| AC10 | El HTML exportado se abre en un navegador y muestra el mismo contenido que la vista previa | QA exporta HTML, lo abre, compara con preview |
| AC11 | Sin regresión en flujo de pago (T-008/T-009 siguen verdes) | Tests de pago pasan |
| AC12 | No hay `any` en el código nuevo de la feature; `noUncheckedIndexedAccess` respetado | Revisión de código + `tsc --noEmit` |

---

## 8. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| XSS vía bloques renderizados / HTML exportado | Nunca `dangerouslySetInnerHTML` con input de coach; sanitizar texto; revisar en stage security-hacker |
| Coach A edita landing de coach B | `WHERE id = $1 AND coach_id = $2` en repo (ya existe); endpoints E3/E4/E5 validan ownership; AC9 |
| Panic por `c.Locals("coach_id").(string)` | Comma-ok en todos los handlers (ST-01) |
| Preview y público divergen | Renderer único compartido `CoachLandingBlock` (D1); AC2 |
| Regresión en landing global (`landing_content`) / home de marketing | No tocar `components/landing/LandingPage.tsx` ni `landing_content`; `/coach/landing` sin cambios |
| B3: URL pública mal construida en web | Corregir a `${GO_API}/l/:slug` (ST-06); AC5 |
| B1: cliente asume objeto único donde hay lista | Cliente trata `GET /coach/landing` como lista (ST-05/ST-08) |
| Build roto pre-existente (`mock-clerk-coach-client.ts`) | ST-00 como prerequisito antes de cualquier trabajo frontend |

---

## 9. Fuera de alcance

- `apps/mobile` (no tocar).
- `components/landing/LandingPage.tsx` y tabla `landing_content` (landing global de marketing), salvo decisión explícita en D4.
- El editor global en `/coach/landing` se queda intacto.
- Drag-and-drop de reordenamiento por píxel (el orden es por lista; mover = arriba/abajo).
- Persistir drafts sin publish (el guardado es explícito).
- Despliegue en Vercel (publicar = `is_published = true`, servido desde DB).

---

## 10. Criterio de finalización (User Gate)

El plan se considera aprobado cuando el usuario da explícitamente su aprobación ("apruebo" / "approved"). Tras ello, el trabajo pasa a ejecución por los roles asignados en el orden definido. Nada llega a Done sin la aprobación explícita del usuario.

---

### Archivos de referencia (no se modifican en este plan)

- `docs/superpower/specs/T-011-coach-landing-canvas.md` — spec base
- `apps/web/src/features/coach/components/navigation/CoachSidebar.tsx:56` — menú "Landing Page"
- `apps/web/src/app/(app)/coach/landing/page.tsx` — editor global (se queda)
- `apps/web/src/app/(app)/coach/landing-builder/page.tsx` — se elimina
- `apps/web/src/app/l/[slug]/page.tsx` — se reescribe (ST-06)
- `apps/web/src/features/shared/api/client.ts` — cliente API (ST-08)
- `apps/api/internal/interfaces/http/handlers/coach_landing.go` — handlers (ST-01)
- `apps/api/internal/interfaces/http/routes/routes.go:786-792` — rutas
- `apps/api/migrations/postgres/416_coach_landing_pages.sql` — tabla (sin cambios)
- `apps/web/tests/ui/mock-clerk-coach-client.ts:119` — build blocker (ST-00)
