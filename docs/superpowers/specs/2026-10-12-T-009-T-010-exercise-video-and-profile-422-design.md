# T-009 + T-010 — Exercise Demo Video Visibility & Athlete Profile 422 — Design Spec

> **Status:** Architect plan (no code). Two clearly separated workstreams, one spec.
> **Branch:** `fix/exercise-video-visibility` (work in place, no worktrees).
> **Author role:** architect.
> **Consumers:** coordinator → dev-backend / dev-react-native / dev-front → qa → code-reviewer → security-hacker → USER GATE.
>
> **Rule:** nothing reaches Done without explicit user approval (`apps/rules/14-team-workflow.md` §2).

---

## 0. Verificación de causa raíz (contra código real)

Toda afirmación de esta sección fue re-verificada leyendo el código y consultando la DB de dev
(Turso `trainingdev-innotechlabssas`, vía HTTP `/v2/pipeline`).

### 0.1 T-009 — el video demo del coach no se ve en mobile

**Mecanismo compuesto (4 hechos verificados):**

1. **Mobile solo renderiza el player si `ex.videoUrl` es truthy.**
   - `apps/mobile/src/features/training/presentation/screens/WorkoutDetailScreen.tsx:247`
     → `{ex.videoUrl ? <TrackedVideoPlayer .../> : null}`.
   - Ejecución: `WorkoutExecutionScreen.tsx:209` → `vm.demoVisible && vm.currentExercise && vm.demoVideoUrl`.
   - `TrackedVideoPlayer` monta un container con `backgroundColor: '#000'` y `aspectRatio: 16/9`
     (`TrackedVideoPlayer.tsx:151`) → con una URL no vacía pero inválida queda **caja negra**.

2. **La ÚNICA fuente que Go lee es `exercise_library.video_url`, vía LEFT JOIN por `library_exercise_id`.**
   - `apps/api/internal/infrastructure/training/workout_repository.go:547-603`
     (`getAssignedWorkoutExercises`) — `LEFT JOIN exercise_library el ON el.id = we.library_exercise_id`,
     selecciona `el.video_url`.
   - Sirve ambos endpoints de lectura que usa mobile:
     `GetAssignedWorkoutDetail` → `/workouts/:id` y
     `GetPrescription` (repo L669) → `/workouts/:id/prescription`.
     Mobile consume ambos: `WorkoutDetailScreen.tsx:85` y `:98`.

3. **Los `library_exercise_id` de la DB de dev son huérfanos (`ex-N` sin fila en `exercise_library`).**
   - Distribución real (DB dev): `workout_exercises.library_exercise_id` =
     `NULL=2`, `b1ede1f2-…-1cb11ac2b856=4`, `28255f45-…-f550eb=2`,
     `ex-1=3`, `ex-2=3`, `ex-6=7`, `ex-7=4`, `ex-9=7`.
   - `workout_template_exercises.library_exercise_id` también contiene `ex-1, ex-2, ex-6, ex-7, ex-9`
     (los huérfanos se propagan al asignar un template → `workout_exercises`).
   - `exercise_library` tiene **solo 3 filas**, todas custom del coach `user_3HZA0C336rpjuUto45oaXFM3VBu`:
     `b1ede1f2` "Test Video" (video), `06dc697b` "Test Exercise" (sin video), `28255f45` "Test" (video).
     **No existe ninguna fila `ex-*`.**
   - La seed `apps/web/migrations/012_seed_exercise_library.sql` (ex-1..ex-16) **no está aplicada**.
   - `schema_migrations` (runner Go) contiene **solo** `apps/api/migrations/*` (001…018). Los
     `apps/web/migrations/*` (donde vive `exercise_library`, 011/012/015/022) se aplican **out-of-band**
     (no hay runner Next.js: `apps/web/src/lib/db/db.ts` no ejecuta migraciones). La aplicación de 012
     no está trackeada en ningún lado.
   - Consecuencia medida: de los 10 workouts del atleta `user_3IES26gXWlixDNcoy1OaDAAteu9`,
     **6 tienen 0 videos resolubles** y 4 tienen exactamente 1 (sobre la fila custom "Test Video").

4. **El subsistema de video está fragmentado en 3 paths; solo uno es leído por Go.**
   - **Path A (VIVO, el único que llega a mobile):**
     `POST /api/exercises/upload` (Vercel Blob, `exercises/pending/<uuid>.mp4`) →
     `exerciseApi.uploadVideo` (`apps/web/src/features/shared/api/client.ts:1268`) →
     UI setea `form.videoUrl` (`ExerciseLibrary.tsx:330`) → `exerciseApi.create/update`
     (client.ts:1250/1257) → Go `POST/PUT /api/v1/exercises` (`training.go:148/96`) →
     `exercise_library.video_url` (`exercise_repository.go:168/212`). **Mobile lee esto.**
   - **Path B (MUERTO):** `POST /api/coach/exercise-videos/upload`
     (`apps/web/src/app/api/coach/exercise-videos/upload/route.ts`) → tabla `exercise_videos`
     (`apps/web/src/lib/db/video-metrics.ts`). **Ningún código Go lee `exercise_videos`; ningún
     consumidor mobile; la tabla tiene 0 filas.** También existen `GET/DELETE
     /api/coach/exercise-videos` sin caller en UI.
   - **Path C (MUERTO):** `POST /api/exercises/[id]/video`
     (`apps/web/src/app/api/exercises/[id]/video/route.ts`) → `UPDATE exercise_library SET video_url`
     directo (viola API-first). **Sin caller en `apps/web/src`.**

5. **El write de audio del coach puede fallar en silencio (sin error).**
   - `exercise_repository.go:212-225` (`Update`) ejecuta `UPDATE exercise_library … WHERE id = ?`
     y **no comprueba `RowsAffected`** → editar un ejercicio inexistente (p. ej. el huérfano `ex-6`)
     devuelve 200 OK y no persiste nada. El toast de la UI dice "Ejercicio actualizado".
   - (Comparación: `user` repo sí chequea `rows == 0` → `NotFound`, `user/repository.go:82-101`.)

**Conclusión T-009:** el síntoma "el video que subió el coach no se ve" es compuesto:
(a) el read solo resuelve `exercise_library.video_url` y las referencias `ex-N` son huérfanas → NULL;
(b) existe un path de subida alternativo (Path B) que escribe en una tabla muerta que la API nunca lee;
(c) el update de ejercicios puede no-opear en silencio; y
(d) mobile no valida la URL, así que un valor no jugable deja una caja negra en vez de nada.

### 0.2 T-010 — editar el perfil del atleta devuelve 422

**Causa raíz confirmada (sin correcciones):**

1. **El path map de mobile es method-agnostic:** `/athlete/profile` → `/users/me` para TODOS los
   métodos (`apps/mobile/src/infrastructure/api/client.ts:22`, usado por `toGoApiPath` L48-68 y el
   interceptor de request del `smartClient` L161-176). No hay transform camel→snake (el interceptor
   solo agrega auth y desenvuelve `ListResponse`).
2. **`PUT /users/me` exige `name` (2-100)** — `UpdateProfileRequest{ name, avatar_url }`
   (`dto/user.go:5-10`), `ValidateUpdateProfile` (`validator.go:37-47`),
   `user.go:57-79`. No hay `PATCH` ni merge.
3. **Los 3 callers mandan camelCase sin `name` → 422 siempre:**
   - `PersonalDataScreen.tsx:56` → `{ firstName, lastName }`.
   - `TrainingPreferencesScreen.tsx:60` → `{ modality }`; `:83` → `{ scheduleDays, scheduleTime }`.
   - `EmergencyContactScreen.tsx:42` → `{ emergencyContact }`.
4. **El endpoint correcto de esos campos es `PUT /athletes/me`** (`routes.go:31`,
   `middleware.RequireAthlete`, handler `user.go:179-201`), con body snake_case
   (`UpdateAthleteRequest`: `sport, experience_level, height_cm, weight_kg, emergency_contact,
   emergency_phone, modality, schedule_days, schedule_time`). `name` pertenece a `PUT /users/me`.
5. **El GET sí funciona:** `useAthleteProfile` (`useAthleteProfile.ts:82-91`) hace
   `GET /athlete/profile` → `/users/me` y lee `data.athlete_profile`. Por eso leer anda y escribir no.

**Hallazgo adicional crítico (NO en el recon original):** ambos PUT de Go son **full-replace**, no
parciales:
- `user/service.go:151-171` (`UpdateAthleteProfile`) carga el perfil y **sobrescribe TODOS los campos**
  con el request. Mandar `{ modality }` pone `sport=""`, `height_cm=0`, `weight_kg=0`,
  `emergency_contact=""`, `schedule_days=""`, `schedule_time=""` → **borra el resto**.
- `user/repository.go:174-197` escribe las 12 columnas.
- `user/service.go:113-127` (`UpdateProfile`) análogamente setea `avatar_url` (vacío borra el avatar).
- El validador es "partial-friendly" (`ValidateUpdateAthlete` solo valida campos no vacíos,
  `validator.go:64-116`), pero el servicio **no** lo es. `08-api-specification.md §1.1` define PUT =
  full replace, así que el servicio es "correcto" por spec pero letal para un cliente que manda diffs.

→ Un fix T-010 que solo cambie path + snake_case **destruiría datos** en cada save parcial.

---

## 1. Problema

- **T-009 (atleta / coach):** el coach sube un video demo a un ejercicio y el atleta no lo ve en la
  app mobile. El sistema tiene 3 caminos de video, solo uno llega a mobile, y las referencias
  `library_exercise_id` de los workouts son huérfanas. El atleta pierde la instrucción visual;
  el coach cree que guardó algo que no existe. Si además no hay video válido, mobile puede dejar
  una **caja negra**.
- **T-010 (atleta):** guardar cualquier sección del perfil falla con HTTP 422. El atleta no puede
  editar nombre, modalidad, horario ni contacto de emergencia. Un fix ingenuo (solo snake_case)
  borraría el resto del perfil.

---

## 2. Diseño objetivo (tradeoffs + decisión)

### 2.1 T-009 — Fuente única `exercise_library.video_url` + reparación de integridad + guard mobile

**Opciones consideradas:**

| Opción | Descripción | Veredicto |
|---|---|---|
| O1 (elegida) | Fuente única = `exercise_library.video_url`. Retirar Path B (`exercise_videos`, rutas `/api/coach/exercise-videos/*`, `video-metrics.ts`) como código muerto. Write fail-loud. Reparación aditiva de la tabla (re-seed del catálogo global con los mismos ids `ex-N`, insert-only). Guard de validez en mobile. | ✅ Simple, una sola verdad, respeta ownership de schema, sin drop destructivo. |
| O2 | Read multi-fuente: resolver video de `exercise_library.video_url` **o** del último `exercise_videos` del ejercicio; cablear la tabla muerta a Go. | ❌ Dos fuentes de verdad, precedencia ambigua, tabla vacía + 0 consumidores → complejidad sin dato. Viola "simple antes que complejo". |
| O3 | Solo defensive read (sin reparar data, sin tocar writes). | ❌ No arregla nada: si no hay fila en `exercise_library` no hay video que mostrar, y el write seguirá no-opeando en silencio. |

**Diseño T-009 (decidido — O1):**

- **T-009.1 (dev-backend) — Fuente única + retiro del path muerto.**
  - Dejar `exercise_library.video_url` como la **única** fuente de video demo. Todo write de video del
    coach pasa por el **Path A** (Go `POST/PUT /api/v1/exercises`).
  - Marcar como deprecado (NO borrar sin aprobación): `exercise_videos` (tabla),
    `apps/web/src/lib/db/video-metrics.ts`, `apps/web/src/app/api/coach/exercise-videos/route.ts` y
    `.../upload/route.ts`, `apps/web/src/app/api/exercises/[id]/video/route.ts`. Comentario de
    deprecación + quitar consumo si hubiera. El drop de tabla es un ticket aparte que requiere
    aprobación explícita.
- **T-009.2 (dev-backend) — Write fail-loud.**
  - `ExerciseRepository.Update` debe devolver `errors.NotFound("Exercise", id)` cuando
    `RowsAffected == 0` (patrón ya usado en `user/repository.go:82-101` y `exercise_repository.go:229-238`
    para `Delete`). El handler ya mapea `AppError` → status correcto.
  - Efecto: subir/editar video de un ejercicio inexistente devuelve 404 explícito, no un 200 mentiroso.
- **T-009.3 (dev-backend) — Reparación de integridad (insert-only, requiere aprobación antes de aplicar).**
  - Backfill del catálogo global faltante re-insertando las filas de `012_seed_exercise_library.sql`
    **con los mismos ids `ex-1..ex-16`** (`INSERT OR IGNORE`; idempotente). Con esto las referencias
    `library_exercise_id` existentes dejan de ser huérfanas sin tocar `workout_exercises` ni
    `workout_template_exercises` (cero UPDATEs destructivos).
  - **Aclaración honesta:** las filas seed no traen video → reparar la integridad **no** hace aparecer
    videos inexistentes. Lo que arregla es (a) que el LEFT JOIN deje de perder filas y (b) que un video
    que el coach adjunte a un ejercicio global **persista y resuelva** en el futuro. El video que HOY
    existe (en las filas custom) ya resuelve.
  - Ubicación recomendada: `apps/web/migrations/025_*.sql` (misma línea de vida que la tabla
    `exercise_library`, que vive en `apps/web/migrations`). Ver §7 y riesgo R2.
- **T-009.4 (dev-react-native) — Guard de validez, nunca caja negra.**
  - Reemplazar el check truthy por un check de **URL jugable válida**: no vacía, sin whitespace, con
    esquema absoluto `http`/`https` (y host no vacío). Si no es válida → **no renderizar el player y no
    reservar el bloque `16/9` negro** (renderizar nada, o el placeholder no-video definido por UX).
  - Centralizar en un helper puro `isPlayableVideoUrl(url: string | null | undefined): boolean` en
    `apps/mobile/src/shared/components/video/` y aplicarlo en los 3 sitios:
    `WorkoutDetailScreen.tsx:247`, `WorkoutExecutionScreen.tsx:209` (vía `demoVideoUrl`) y
    `ExerciseDemoModal`/`ExerciseVideoPlayer` (defensa en profundidad: si llega una URL inválida, no
    montar `VideoView`).
  - `TrackedVideoPlayer`: si `expo-video` reporta `status === 'error'` ya hay overlay de retry
    (`TrackedVideoPlayer.tsx:125-132`); agregar además que el container no fuerce `#000` antes de tener
    `readyToPlay` (evitar el flash de caja negra). Cambio mínimo y sin regresión del tracking.

### 2.2 T-010 — Mobile se adapta al contrato Go (opción A) con read-modify-write

**Opciones consideradas:**

| Opción | Descripción | Veredicto |
|---|---|---|
| A (elegida) | Mobile rutea cada write al endpoint Go correcto con body snake_case y, por el full-replace de los PUT, hace **read-modify-write** del perfil completo. **Cero cambios de contrato/backend.** | ✅ Default del task, API-first, no toca el contrato ni el schema. |
| B | Agregar un endpoint unificado / PATCH parcial en Go. | ❌ Cambio de contrato; PUT ya está definido como full-replace en `08-api-specification.md §1.1`; no hay razón para migrar contrato. Descartado. |
| A' | Igual que A pero además Go mergea solo campos provistos (arreglar el full-replace). | ⚠️ Alternativa válida y más simple para mobile, pero es un **cambio de comportamiento de API** (desvío del PUT estricto). NO elegido por default. Ver riesgo R4. |

**Diseño T-010 (decidido — A):**

- **T-010.1 (dev-react-native) — Capa API de perfil (una sola verdad en mobile).**
  - Crear un módulo `apps/mobile/src/features/auth/application/useAthleteProfile.ts` extendido (o
    `athleteProfileApi.ts` en la misma feature) con dos funciones puras y testeables:
    - `updateUserName({ firstName, lastName })` → `PUT /users/me` con `{ name, avatar_url }`.
    - `updateAthleteSection(patch)` → `PUT /athletes/me` con el **perfil completo mergeado** en
      snake_case + `patch`.
  - **Endpoint routing:** los writes van **directo a los paths Go** (`/users/me`, `/athletes/me`), que
    `toGoApiPath` deja pasar as-is (default: usar path tal cual). El GET sigue usando el path mobile
    `/athlete/profile` → `/users/me`. Así se resuelve el split GET-vs-PUT **sin** router method-aware
    (que sería implícito y sorprendente). Se documenta que `/athlete/profile` en mobile queda
    **solo-lectura**.
  - **Read-modify-write obligatorio:** el helper lee el objeto `athlete_profile` **crudo** (todas las
    claves que devuelve Go: `name, email, avatar_url, sport, experience_level, height_cm, weight_kg,
    emergency_contact, emergency_phone, modality, schedule_days, schedule_time`) desde la query
    `['athlete-profile']` (o hace el GET si el cache está frío), mergea el patch y manda todo. El tipo
    mobile `AthleteProfile` actual no declara esos campos → el helper NO debe depender del tipo
    (usar el objeto crudo tipado con un `AthleteProfileRaw`).
  - **No wipe:** al mandar el perfil completo, el full-replace del backend preserva los campos que no
    se editaron (incluido `emergency_phone`, `height_cm`, `weight_kg`, `sport`,
    `experience_level`, `avatar_url`).
- **T-010.2 (dev-react-native) — Callers por pantalla (endpoint + payload exactos):**

| Pantalla | Línea actual | Endpoint nuevo | Payload (snake_case) |
|---|---|---|---|
| `PersonalDataScreen.tsx` | 56 | `PUT /users/me` | `{ name: "<firstName lastName>".trim(), avatar_url: <actual> }` |
| `TrainingPreferencesScreen.tsx` (modality) | 60 | `PUT /athletes/me` | perfil completo + `{ modality: next }` |
| `TrainingPreferencesScreen.tsx` (schedule) | 83 | `PUT /athletes/me` | perfil completo + `{ schedule_days, schedule_time }` |
| `EmergencyContactScreen.tsx` | 42 | `PUT /athletes/me` | perfil completo + `{ emergency_contact }` |

  - Tras el 2xx → `invalidateQueries(['athlete-profile'])` (ya existe) + feedback de éxito (ya existe).
  - `PersonalDataScreen` conserva `user.update({ firstName, lastName })` (Clerk es la fuente de
    identidad) pero **ya no** llama `apiClient.put('/athlete/profile', { firstName, lastName })`.
- **T-010.3 (dev-react-native) — Manejo de error 422/404.**
  - El interceptor no transforma el body de error, así que la `Alert` muestra `err.message` genérico.
    Mapear el 422 a un mensaje humano por campo (o mensaje único "Revisá los datos ingresados") y
    **no** revertir el estado optimista sin avisar (modality ya hace rollback en L63).

---

## 3. Descomposición (ordenada) y roles

> Orden de ejecución sugerido. Los workstreams T-009 y T-010 son independientes; pueden ir en
> paralelo, pero **T-009.4 (mobile video guard) y T-010.* (mobile profile)** son el mismo rol
> (`dev-react-native`) → secuenciar dentro del rol.

| # | Subtask | Rol | Depende de | Salida |
|---|---|---|---|---|
| A1 | T-009.2 Write fail-loud (`ExerciseRepository.Update` → NotFound) + tests unit | dev-backend | — | update inexistente → 404; test Go |
| A2 | T-009.1 Deprecar Path B (`exercise_videos` + rutas + `video-metrics.ts`) — solo anotación/limpieza de consumo, sin drop | dev-backend | — | código muerto marcado; `go build ./...` OK |
| A3 | T-009.3 Reparación de integridad (re-seed catálogo, insert-only) — **requiere aprobación** | dev-backend | aprobación (§7) | migración idempotente + re-GET resuelve filas |
| B1 | T-009.4 Guard de URL válida + no caja negra en mobile (3 sitios + helper + test) | dev-react-native | — | helper + tests; sin bloque negro sin video |
| B2 | T-010.1 Capa API perfil (helper merge + routing + snake_case) + tests | dev-react-native | — | funciones puras testeables |
| B3 | T-010.2 Refactor de los 3 callers | dev-react-native | B2 | cada pantalla guarda 2xx y persiste |
| B4 | T-010.3 Mapeo de errores 422/404 | dev-react-native | B3 | mensaje humano, sin datos borrados |
| C1 | QA: verificación empírica de AC (Go + mobile + device) | qa | A*, B* | evidencia AC-1..AC-10 |
| C2 | Code review (diff) | code-reviewer | C1 | PASS/FAIL |
| C3 | Security review (OWASP, URL handling, authz de `/athletes/me`) | security-hacker | C1 | PASS/FAIL |
| G | USER GATE | coordinator + user | C2,C3 | aprobación explícita |

**Roles que NO hacen falta:** `ux-ui-designer` (no cambia lenguaje visual; solo se agrega un estado
"sin video" que ya existe como ausencia) y `dev-front` (web no se modifica en este fix; las rutas
muertas se anotan, no se rediseñan).

**Nota de rol:** T-009.4 y T-010.* son `dev-react-native`; el resto backend. Máx 2 devs en paralelo.

---

## 4. Acceptance Criteria (observables + testeables)

### T-009

- [ ] **AC-1:** Given un ejercicio cuyo `library_exercise_id` apunta a una fila real de
  `exercise_library` con `video_url` no vacío, When el atleta abre el workout y el prescribing
  endpoint responde, Then `videoUrl` viaja en la respuesta y mobile monta `TrackedVideoPlayer`.
- [ ] **AC-2:** Given un ejercicio SIN `library_exercise_id` o con `video_url` NULL/vacío,
  When el atleta abre el workout, Then mobile **no** monta `TrackedVideoPlayer` y **no** aparece
  ningún bloque negro `16/9` (ni caja vacía).
- [ ] **AC-3:** Given una `videoUrl` no vacía pero inválida (whitespace, `"not-a-url"`,
  `"ftp://x"`, `"//host/x"`), When mobile evalúa, Then `isPlayableVideoUrl` es `false` y no se
  renderiza el player (test unit del helper + render test del screen).
- [ ] **AC-4:** Given un ejercicio inexistente (p. ej. id huérfano `ex-6`), When el coach intenta
  `PUT /api/v1/exercises/ex-6` con un `videoUrl`, Then la API responde **404** (no 200) y el video no
  se pierde en silencio. (test handler/repo Go)
- [ ] **AC-5:** Given la reparación aplicada, When se corre
  `SELECT COUNT(*) FROM workout_exercises we LEFT JOIN exercise_library el ON el.id = we.library_exercise_id WHERE we.library_exercise_id IS NOT NULL AND el.id IS NULL`,
  Then el resultado es **0** (cero refs huérfanas para ids no nulos).
- [ ] **AC-6:** Given la reparación aplicada (idempotencia), When se corre 2 veces, Then no hay
  filas duplicadas y el resultado de AC-5 sigue siendo 0.
- [ ] **AC-7:** Given el atleta abre un workout asignado tras subir un video por el Path A a un
  ejercicio existente, When re-abre, Then el player aparece y reproduce (evidencia E2E mobile/device).

### T-010

- [ ] **AC-8:** Given el atleta está en "Datos personales" y cambia nombre/apellido, When guarda,
  Then `PUT /users/me` responde 2xx con `{ name }` y al re-GET `GET /users/me` el `user.name` es el nuevo
  valor. (Evidence: request/response 2xx + re-GET)
- [ ] **AC-9:** Given el atleta cambia la **modalidad**, When guarda, Then `PUT /athletes/me`
  responde 2xx y al re-GET `athlete_profile.modality` es la nueva **y** `emergency_contact`,
  `schedule_days`, `schedule_time`, `sport`, `height_cm`, `weight_kg`, `emergency_phone` **siguen
  intactos** (no wipe).
- [ ] **AC-10:** Given el atleta cambia **días/hora de entrenamiento**, When guarda, Then
  `PUT /athletes/me` responde 2xx y `schedule_days`/`schedule_time` persisten en el re-GET sin borrar
  los demás campos.
- [ ] **AC-11:** Given el atleta cambia el **contacto de emergencia**, When guarda, Then
  `PUT /athletes/me` responde 2xx y `emergency_contact` persiste en el re-GET sin borrar los demás.
- [ ] **AC-12:** Given la app mobile, When se corren `npx tsc --noEmit && npm test`, Then
  compila sin errores y los tests (helper de URL + helpers de perfil) pasan.
- [ ] **AC-13:** Given `apps/api`, When se corre `go build ./... && go test ./...`, Then verde.

**Regla de cierre:** ningún AC se marca cumplido solo porque compila/tests pasan; la verificación
mobile real en emulador/device (Maestro) es obligatoria para AC-2, AC-3, AC-7, AC-8..AC-11
(`apps/mobile/AGENTS.md` Global Mobile UI Validation Rule).

---

## 5. Criterios UX (obligatorios)

- **Sin video:** la ausencia de player no deja hueco visual ni caja negra; el flujo del workout no
  cambia (`§3` del template).
- **Loading:** el player mantiene su overlay de loading; no forzar `#000` hasta `readyToPlay`.
- **Error de video:** mantener overlay de retry (`TrackedVideoPlayer.tsx:125-132`); nunca stack trace.
- **Perfil:** botón guardar con estado disabled durante el save (ya existe); error 422 → mensaje humano
  con retry; éxito → confirmación (ya existe).
- **Mobile:** touch targets ≥ 44pt, dark-first, sin regresión de 60 FPS.

---

## 6. Contrato / API

**Sin cambios de contrato.** Se usan endpoints existentes:

| Método | Path | Uso | Auth |
|---|---|---|---|
| GET | `/users/me` | lectura perfil (vía `/athlete/profile`) | auth |
| PUT | `/users/me` | `name`, `avatar_url` — full-replace | auth |
| PUT | `/athletes/me` | sport, experience_level, height_cm, weight_kg, emergency_contact, emergency_phone, modality, schedule_days, schedule_time (snake_case) — full-replace | `RequireAthlete` |
| GET | `/workouts/:id`, `/workouts/:id/prescription` | video vía `exercise_library.video_url` | `RequireAthlete` |
| POST/PUT | `/exercises`, `/exercises/:id` | persistir `video_url` (Path A) | `RequireCoach` |

Único cambio de comportamiento backend: `PUT /exercises/:id` sobre id inexistente pasa de **200
(silencioso) → 404** (T-009.2). No es cambio de shape; es corrección de semántica REST
(`08-api-specification.md §1.2`).

---

## 7. Reparación de datos (requiere aprobación explícita antes de aplicar)

- **Qué:** `INSERT OR IGNORE` de las filas globales de `exercise_library` con los ids canónicos
  `ex-1..ex-16` (contenido de `apps/web/migrations/012_seed_exercise_library.sql`).
- **Por qué:** elimina las refs huérfanas (`AC-5`) sin UPDATEs ni drops.
- **Naturaleza:** **aditiva / insert-only / idempotente** — NO destructiva.
- **Impacto producto-visual:** el catálogo global de ejercicios vuelve a aparecer en la library del
  coach (16 filas globales). Confirmar que ese es el estado deseado (fue la intención de 012).
- **Ubicación:** `apps/web/migrations/025_*.sql` (misma línea que la tabla; ver R2).
- **Rollback:** `DELETE FROM exercise_library WHERE id LIKE 'ex-%' AND is_custom = 0 AND coach_id IS NULL`
  (solo las filas re-insertadas; no hay FKs entrantes con ON DELETE, la referencia es app-enforced).
- **Aplicación:** manual/Turso CLI (como 011/012/015) — no hay runner Next.js. En dev, contra la DB.
- **NO se aplica** hasta aprobación del coordinator/usuario.

---

## 8. Riesgos y límites (do-not-touch)

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | El recon no identifica con certeza a qué ejercicio el coach adjuntó el video que "no se ve". | Podría haber un segundo mecanismo no cubierto | QA re-produce el flujo exacto (Path A sobre un ejercicio existente) y verifica AC-7 en device; el diseño cubre los 3 mecanismos conocidos. |
| R2 | `exercise_library` y sus migraciones (011/012/015/022) viven en `apps/web/migrations`, NO en el runner Go (`apps/api/migrations`); no hay runner Next.js. | La reparación podría no correr automáticamente / drift de schema | Reparación en la misma línea (`apps/web/migrations/025`) + aplicación manual verificada. Tech-debt: consolidar schema en el runner Go = ticket aparte. |
| R3 | `exercise_videos` (y `athlete_form_recordings`, `coach_video_feedback`, `video_view_metrics`) | Borrar tablas puede perder datos | **NO se dropean** en este fix; solo se deprecan con comentario. Drop = ticket separado con aprobación. |
| R4 | Full-replace de `PUT /athletes/me` y `/users/me` | Un cliente que mande un diff borra el resto | Resuelto en mobile con read-modify-write (A). Mejora real pendiente: merge partial en Go o `PATCH` (`08-api-specification.md §1.1`) — **fuera de scope**, ticket aparte. Do-not-touch salvo nuevo spec. |
| R5 | `useAthleteProfile` tipa `AthleteProfile` con `weight/height/age/birthday` que **no** existen en la respuesta Go (`AthleteProfileResponse` usa `height_cm/weight_kg/...`) | Los stats de PersonalData muestran "—" y un merge basado en el tipo perdería campos | El helper de T-010.1 usa el objeto crudo (`AthleteProfileRaw`), no el tipo actual. Cosmético de stats = ticket aparte. |
| R6 | `middleware.Cache(24h, "exercises")` | Un video recién subido puede tardar en verse | El `CreateExercise/UpdateExercise` handler invalida cache (`middleware.InvalidateCache`) — verificar que si aplica al update. QA espera invalidación. |
| R7 | Regresión de tracking de video | Las `video_view_metrics`/`video-views` dependen del player | El guard solo evita montar el player sin URL válida; con URL válida el tracking no cambia. |

**Do-not-touch (fuera de scope explícito):**
- Web UI/UX de la biblioteca de ejercicios (no se rediseña; solo se deploga el texto de deprecación).
- Drop de tablas de video (`exercise_videos`, `athlete_form_recordings`, `coach_video_feedback`,
  `video_view_metrics`).
- Cambios de contrato Go / nuevos endpoints / PATCH parcial.
- `workout_exercises` / `workout_template_exercises` (no UPDATEs; la reparación es insert-only).
- Contrato de tracking de vistas de video.

---

## 9. Plan de verificación (evidencia requerida)

- **Go:** `cd apps/api && go build ./... && go test ./...`; nuevo test `Update` inexistente → NotFound;
  test idempotencia de la migración.
- **DB (dev):** consulta AC-5 = 0; conteo de filas antes/después de la reparación.
- **Mobile:** `cd apps/mobile && npx tsc --noEmit && npm test` (helper URL + helpers perfil);
  validación real en emulador/device con Maestro de los 4 flujos de perfil + vista de workout con y
  sin video (AC-2, AC-3, AC-7..AC-11). Reportar `PASS / PASS WITH LIMITATIONS / BLOCKED`.
- **QA:** request/response 2xx + re-GET por cada sección (nombre, modalidad, horario, emergencia).

---

## 10. Referencias

- Recon + reglas: `apps/rules/04-database-design.md` (§6 migrations), `05-backend-architecture.md`,
  `08-api-specification.md` (§1.1 PUT full-replace, §1.2 status codes), `06-frontend-architecture.md`,
  `11-security.md`, `13-testing.md`, `mobile-rules/02-mobile-code-quality.md`,
  `mobile-rules/06-mobile-bug-hunter.md`, `apps/mobile/AGENTS.md` (Global Mobile UI Validation Rule).
- Código clave:
  `apps/api/internal/infrastructure/training/workout_repository.go:547-603`,
  `apps/api/internal/infrastructure/training/exercise_repository.go:212-225`,
  `apps/api/internal/application/user/service.go:151-171`,
  `apps/api/internal/infrastructure/user/repository.go:174-197`,
  `apps/mobile/src/infrastructure/api/client.ts:22,48-68,161-176`,
  `apps/mobile/src/features/auth/presentation/screens/{PersonalData,TrainingPreferences,EmergencyContact}Screen.tsx`,
  `apps/mobile/src/features/training/presentation/screens/WorkoutDetailScreen.tsx:247`,
  `apps/mobile/src/features/training/presentation/components/TrackedVideoPlayer.tsx`.
- Specs previos: `docs/superpowers/specs/2026-10-11-T-002-expo-video-migration-design.md`,
  `2026-10-12-T-003-mobile-uiux-design.md`.
