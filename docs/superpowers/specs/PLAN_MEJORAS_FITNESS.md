# Plan de Mejoras — Competir con Apps de Fitness

Estado: Planificación v2 — auditoría de código verificada 2026-10-18
Stack: Go API (fuente de verdad) + Next.js web + React Native mobile

## Contexto — Ya implementado (base sólida, no tocar)

| Item | Estado | Evidencia |
|------|--------|-----------|
| Migraciones pendientes (9) aplicadas | ✅ | `go run ./cmd/migrate` → 0 pending |
| Polar.sh removido, MercadoPago único | ✅ | 3 commits, builds verdes |
| coach_code garantizado todo coach + /users/me | ✅ | Commit 1b0e7ed |
| Rate limit + lockout /invites/* | ✅ | Commit 8a0cdc1, tests pasan |
| Job inactividad masiva (retención) | ✅ | Commit 8a0cdc1, 24h ticker |
| Badges membresía 1m/3m/6m | ✅ | Commit 2b222f7 |
| Typical workout time endpoint | ✅ | Commit 2b222f7 |
| Web lint 0 errores, tsc 0, tests 161/161 | ✅ | Verificado |
| Mobile tsc 0, tests 353/353 | ✅ | Verificado |
| Go API 34 paquetes OK, 0 FAIL | ✅ | Verificado |
| Stubs coaching → datos reales + lint Alianzas | ✅ | Commit 51c8431 |
| Bundle ID → .dev para App Store | ✅ | Commit f5fbe66 |
| **Backend running GPS completo** | ✅ | Commit b2a72a4 (ver Fase 1) |
| **Bridges HealthKit + HealthConnect + sync** | ✅ | `apps/mobile/src/infrastructure/health/` |

---

## Auditoría 2026-10-18 — estado real del código (verificado, no asumido)

### Fase 1 GPS — HECHO vs FALTA
| Pieza | Estado | Evidencia |
|-------|--------|-----------|
| Dominio `GpsPoint`, `DeviceConnection` | ✅ | `domain/running/running.go` |
| Repository `SaveGpsPoint`/`ListGpsPointsBySession` | ✅ | `infrastructure/running/repository.go` (251 líns) |
| Migración tabla GPS | ✅ | `migrations/027_running_gps_points.sql` (+índice session,timestamp) |
| `GET /running/sessions/:id` con gpsPoints | ✅ | `handlers/running.go` + wired en main.go:346 |
| `POST /running/sessions/:id/live-location` | ✅ | handler LogGpsPoint, valida ownership + timestamp |
| `GET /running/sessions` paginado + `GET /running/stats` | ✅ | handler + service con promedios |
| `POST/DELETE /running/devices` | ✅ | ConnectDevice/DisconnectDevice |
| Web types + API client running | ⚠️ SIN COMMIT | `features/shared/api/client.ts` (working tree) |
| Web `RunningRouteMap.tsx` | ⚠️ SIN COMMIT + sin usar | creado, 0 consumidores (ver 1C defects) |
| Web páginas `/running` y `/running/[id]` | ❌ NO EXISTE | no hay carpeta `(app)/running/` |
| Web tracking en vivo (watchPosition → API) | ❌ NO EXISTE | — |
| Web cierre de sesión running (distancia final) | ❌ NO EXISTE endpoint PATCH | sesión en vivo no se puede finalizar |
| Mobile grabación GPS de carrera | ❌ NO EXISTE | `RunningRouteView` solo visualiza; expo-location solo para posición en vivo del mapa |
| Config GPS (permisos, batería, filtros, offline) | ❌ NO DEFINIDA | ver 1E — nuevo |

### Fase 2 Wearables — HECHO vs FALTA
| Pieza | Estado | Evidencia |
|-------|--------|-----------|
| `WearableProvider` interface (adapter) | ✅ | `domain/running/provider.go` |
| HealthKit/HealthConnect bridges + background-sync | ✅ | `infrastructure/health/` (factory iOS/Android) |
| `GET/POST /health/metrics`, `/health/sleep`, `/health/devices` | ✅ | routes.go:175-185; mobile alias `/athlete/health/*`→`/health/*` en client.ts:25-27 |
| GarminProvider (OAuth + fetch) | ❌ NO EXISTE | solo interfaz, 0 implementaciones registradas |
| Webhook `POST /webhooks/garmin` | ❌ NO EXISTE | — |
| Import .fit/.tcx/.gpx | ❌ NO EXISTE | import service solo acepta strong/hevy/fitnotes |
| Campos wearable en AthleteProfile | ❌ NO EXISTE | cero referencias a "wearable" en domain/user |
| Mobile garmin-bridge.ts | ❌ NO EXISTE | factory solo devuelve HealthKit/HealthConnect |
| UI conexión wearables (Settings mobile) | ❌ NO EXISTE | — |
| Sync automática server-side (NATS jobs) | ❌ NO EXISTE | solo polling mobile 15min |

### Fase 3 IA — HECHO vs FALTA (hallazgo crítico)
| Pieza | Estado | Evidencia |
|-------|--------|-----------|
| `training-engine` web (fatigue, onerm, progression, effort, hr-zones) | ✅ | `apps/web/src/lib/training-engine/` completo, puro, testeado |
| Analytics domain interface + service + handler + routes | ⚠️ CÓDIGO MUERTO | `RegisterAnalyticsRoutes` existe en routes.go:189 pero **NO está invocado en main.go** + **no hay implementación de `analytics.Repository`** en infrastructure (solo interfaz+test). En runtime: 404. |
| `GET /workouts/:id/ai-insights` | ❌ NO EXISTE | — |
| Servicio IA training (NextPrescription, DetectPlateau, RecommendRest, Calculate1RM) | ❌ NO EXISTE | — |
| Web sección atleta (workout detail) | ❌ NO EXISTE | `(app)/` solo tiene coach/, nutrition/ |
| Mobile WorkoutDetailScreen sección IA | ❌ NO EXISTE | el screen existe pero sin sugerencias/1RM/fatiga |

### Fases 4-5 — sin cambios de alcance respecto plan v1 (retención + App Store).

---

## Fase 1 — GPS Running + Web Tracking (completar lo empezado)

**Objetivo:** atleta graba carrera con GPS (móvil o web) y coach/atleta ven historial + mapa + métricas + tracking en vivo.

### 1.0 Commit pendiente (inmediato)
- [ ] Commit del working tree: `client.ts` (types+API running) y `features/running/RunningRouteMap.tsx` — son base de todo lo que sigue.

### 1.1 Web — páginas de running (NUEVO, era 1.3)
- [ ] `apps/web/src/app/(app)/running/page.tsx` — historial: tarjetas stats globales (distancia total, sesiones, ritmo promedio, tiempo total) + lista de sesiones con mini-mapa por sesión, paginación.
- [ ] `apps/web/src/app/(app)/running/[id]/page.tsx` — detalle: `RunningRouteMap` con ruta completa, métricas (pace, elevación, FC, cadencia, calorías), splits por km, fuente del dato (manual/garmin/apple).
- [ ] Acceso desde nav coach + atleta (coaches ven sus atletas; atletas ven las suyas — verificar scope de ownership en list, hoy solo filtra por user_id propio).

### 1.2 API Go — endpoints faltantes para ciclo de vida de sesión
- [ ] `PATCH /running/sessions/:id` — cerrar sesión en vivo: acepta distance, duration, pace, calories, elevation, heart_rate finales (hoy no se puede finalizar una sesión grabada con live-location).
- [ ] `DELETE /running/sessions/:id` — borrar sesión propia (repository ya lo tiene; falta route+handler+ownership).
- [ ] `POST /running/sessions/:id/live-location` batch: aceptar `points: []` (array) además de punto único — el tracking en vivo dispara 1 req/cada N segundos; batch reduce rate y ruido. Validar max 100 puntos/request.
- [ ] Rate limiting `middleware.RateLimit` en `/running/*` (hoy solo existe en /invites/*). Sug: 60 req/min en live-location.
- [ ] Filtro de precisión del lado servidor: descartar puntos con `accuracy > 50m` (basura GPS urbana/campo).

### 1.3 Web — tracking en vivo (NUEVO, era 1.3b)
- [ ] Componente cliente `LiveRunTracker`: `navigator.geolocation.watchPosition({ enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 })`.
- [ ] Envío batch cada 15s o cada 20m (el que llegue primero), con reintentos y buffer local (localStorage) si falla la red.
- [ ] Overlay en el mapa: posición actual (marker animado), distancia, tiempo, pace en vivo.
- [ ] Botones: Pausar / Finalizar → al finalizar llama `PATCH` con totales + polyline encoded calculada en cliente (lib `@mapbox/polyline`, ya en deps web).
- [ ] Pausa automática sin movimiento (sin cambio de posición por >90s).
- [ ] `visibilitychange`: seguir contando tiempo, pausar envíos si la pestaña está oculta >5 min.

### 1.4 Mobile — grabación de carrera con GPS (NUEVO, era 1.4)
- [ ] `RunRecordingScreen`: inicia sesión `POST /running/sessions` (source="mobile_gps"), graba puntos con expo-location `watchPosition` (config en 1E), envía batch al API + respaldo local MMKV offline-first (sync al reconectar).
- [ ] Pantalla en vivo: mapa (`RunningRouteView` existente, adaptar a modo "grabando"), distancia/tiempo/pace, botones pausa/finalizar.
- [ ] Al finalizar: `PATCH` con totales + gpsRoute polyline encoded.
- [ ] Historial de carreras en mobile con mapa (reuse `RunningRouteView` modo lectura).

### 1.5 Web — mejoras obligatorias a `RunningRouteMap` (revisión encontrada)
Defects/mejoras verificados en el componente actual:
- [ ] **BUG:** `<useMapEvents />` invocado como JSX tag lowercase → se renderiza como tag HTML desconocido, no hace nada. Convertir a hook `useMapEvents({...})` dentro de un sub-componente o eliminarlo.
- [ ] **BUG (Next.js):** importar `leaflet/dist/leaflet.css` y usar `dynamic(..., { ssr: false })` para MapContainer — hoy hay riesgo de error SSR y CSS faltante.
- [ ] **BUG íconos Leaflet:** marcadores default referencian imágenes que Webpack/Next no resuelve → pins rotos. Usar `divIcon` custom (estilo brand).
- [ ] **UX:** sin `fitBounds` — centra en el primer punto con zoom fijo 13; rutas largas quedan fuera de pantalla. Ajustar bounds con padding 40px.
- [ ] **Perf:** decimar polyline >2000 puntos (Douglas-Peucker simple o muestreo cada N) antes de render.
- [ ] **Perf:** `preferCanvas` en MapContainer para rutas largas.
- [ ] **Feature:** prop opcional `livePosition` + marker con popup (distancia/pace) para modo vivo.
- [ ] **Feature:** marcadores de splits cada km (popup: km, tiempo del km, pace del km).
- [ ] **Feature:** color de polyline por pace (gradiente) o capa de elevación opcional — decide PM.
- [ ] **Feature:** modo `thumbnail` (sin controles, sin zoom, bounds fijos) para las mini-maps del historial; lazy-load por IntersectionObserver (20 mini-mapas en lista no deben matar el bundle/paint).

### 1.6 Web — integración
- [ ] Hooks/swr o react-query para `getRunningSessions`/`getRunningSession`/`getRunningStats` (siguiendo patrón existente en features coach).
- [ ] Estados vacíos ("Todavía no registraste carreras" + CTA "Grabar carrera" si mobile-web soportado), loading, error.

### Criterios de aceptación Fase 1
- [ ] Coach/atleta ven lista de carreras con mini-mapa en web; click → detalle con ruta, splits y métricas.
- [ ] Atleta puede grabar carrera desde el navegador con tracking en vivo y verla reflejada en el mapa al finalizar.
- [ ] Móvil graba GPS durante carrera (foreground + background service en Android), envía al API y la sesión aparece en web con la ruta.
- [ ] Puntos con accuracy >50m descartados; batch ≤100 puntos; rate limit activo.

---

## Fase 2 — Wearables end-to-end (Garmin + Apple Watch configurados correctamente)

**Objetivo:** atleta conecta Apple Watch o Garmin y sus entrenamientos/métricas/sueño llegan solos. Apple Watch ya funciona vía HealthKit bridge en mobile; **el gap real es Garmin (no existe nada) + sync automática server-side**.

### 2.1 API Go — perfil atleta con wearable
- [ ] Campos `wearable_platform`, `wearable_device_id`, `wearable_connected_at` en `AthleteProfile` (domain/user/user.go + repository + migración SQL aditiva).
- [ ] `PUT /athletes/me` acepta los campos.

### 2.2 API Go — GarminProvider (adapter sobre `WearableProvider` existente)
- [ ] `infrastructure/running/garmin_provider.go`: OAuth 2.0 Garmin Health API (partner flow: request token → user auth → access token, almacenado por usuario).
- [ ] `FetchSessions`: descargar activities del período → parsear .fit/.tcx → mapear a `RunningSession{Source:"garmin"}`.
- [ ] `SyncHealthData`: HRV, resting HR, sleep, steps desde Garmin wellness endpoint.
- [ ] Registrar provider en main.go vía `RegisterProvider` (ya existe el mecanismo).
- [ ] Credenciales por env vars (`GARMIN_CLIENT_ID/SECRET`) + tokens en tabla nueva `wearable_oauth_tokens`.

### 2.3 API Go — webhook Garmin (push real, sin polling)
- [ ] `POST /webhooks/garmin` — Garmin notifica user IDs → job encolado (NATS JetStream ya en stack) → sync de ese usuario → `RunningSession` source="garmin" + health metrics.
- [ ] Validación de origen (token compartido Garmin) + idempotencia por activity ID.
- [ ] Rate limit en webhook.

### 2.4 API Go — import de archivos
- [ ] Extender `application/import/service.go` con fuentes `"fit"`, `"tcx"`, `"gpx"` (validSources + parser; la ruta `POST /import` ya existe).
- [ ] Reusar el mismo parser del GarminProvider (paquete `internal/pkg/fitparse` o similar compartido).

### 2.5 API Go — alinear rutas health con lo que el mobile ya llama
- [ ] El mobile llama `/athlete/health/*` y hoy lo compensa con un alias map en `client.ts`. Decidir (PM): mover rutas a `/athlete/health/*` en Go (canónico) y quitar el alias, o confirmar alias permanente. Actualizar spec 08-api-specification.
- [ ] Rate limiting en `/health/*` (sync dispara 1 POST por métrica).

### 2.6 Mobile — bridge Garmin
- [ ] `infrastructure/health/garmin-bridge.ts` implementando `HealthBridge` (el "dispositivo" es la cuenta Garmin: isAvailable = token presente; leer = llamar al API vía smartClient o recibir vía webhook/push local).
- [ ] Actualizar factory `index.ts` para `platform === 'garmin'` en Android (Garmin no usa Health Connect; sincronización server-side empuja, mobile solo muestra estado de conexión).
- [ ] Pantalla Conexión de wearables en Settings: Apple Watch (HealthKit permissions flow) / Garmin (OAuth flow web) / Health Connect + estado último sync + botón "Sincronizar ahora".

### 2.7 Sincronización automática
- [ ] Job programado en API (ticker 15 min, patrón ya usado en job de inactividad): sync incremental de usuarios con wearable conectado y app inactiva.
- [ ] Webhooks Garmin llegan → sync inmediato (2.3). HealthKit sigue con background-sync del móvil (ya existe) + empujar resultado a `running_sessions`.

### Criterios de aceptación Fase 2
- [ ] Atleta conecta Garmin por OAuth desde la app; conecta Apple Watch con permisos HealthKit.
- [ ] Entrenamiento del watch/Garmin aparece automáticamente en Running Sessions (web + mobile) con source correcto.
- [ ] Métricas de salud (HRV, sueño, pasos) llegan al dashboard sin entrada manual; "último sync" visible en Settings.

---

## Fase 3 — IA en Workout Detail (desbloquear analytics + insights)

**Objetivo:** el detalle de entrenamiento sugiere cargas, detecta fatiga/plato, calcula 1RM y adapta la sesión — en web y mobile.

### 3.0 CRÍTICO — analytics actual es código muerto (hallazgo auditoría)
- [ ] Implementar `infrastructure/analytics/repository.go` — implementación SQL real de `analytics.Repository` (GetDashboardSummary, GetHRZones, GetFatigueMap, GetOneRM, GetTrainingSummary, GetEffort) desde `workout_set_logs` + sesión de entrenamiento:
  - Fatiga por músculo: decaimiento exponencial (media vida ~72h configurable).
  - 1RM: Epley/Brzycki desde mejor set por ejercicio.
  - Esfuerzo RIR/RPE agregado por sesión.
- [ ] Wirear en `cmd/api/main.go`: crear repo+service+handler e invocar `routes.RegisterAnalyticsRoutes(api, handler)` — hoy los 4 endpoints /analytics/* devuelven 404.
- [ ] Tests del repository con la DB real (patrón de otros repos infrastructure).

### 3.1 API Go — servicio de IA en training (`application/trainingai/`)
- [ ] `NextPrescription(workoutID, athleteID)` — peso/reps sugeridos por ejercicio desde historial + progresión (misma lógica que `training-engine/progression.ts` de web, reimplementada en Go para que la fuente de verdad sea la API).
- [ ] `DetectPlateau(exerciseID, athleteID)` — N sesiones sin progreso en reps×peso → alerta + sugerencia de deload/cambio.
- [ ] `RecommendRest(muscleGroups, athleteID)` — desde fatiga por músculo (3.0).
- [ ] `Calculate1RM(exerciseID, athleteID)` — 1RM estimado + evolución.
- [ ] Prescripción validada contra reglas de seguridad 09-ai-specification: respetar lesiones del atleta, nivel de experiencia, equipamiento disponible; confianza <0.7 se etiqueta "observación", no "recomendación".

### 3.2 API Go — endpoint de IA
- [ ] `GET /api/v1/workouts/:id/ai-insights` — por ejercicio: peso sugerido, reps, RIR objetivo, estado de fatiga de los músculos implicados, 1RM, alerta de plato, confidence score. Latencia objetivo <2s p95 (09-ai-spec): calcular desde datos ya persistidos, sin llamadas externas en v1.
- [ ] Rate limit + cache Redis por workout+athlete (invalidar al loggear set).

### 3.3 Web — sección atleta workout detail (NUEVO)
- [ ] `apps/web/src/app/(app)/athlete/workouts/[id]/page.tsx` — primer page de la sección atleta en web (hoy no existe `(app)/athlete/`).
- [ ] Renderiza detalle del workout asignado + tarjetas de IA por ejercicio (peso sugerido, reps, RIR, 1RM, fatiga).
- [ ] Integrar `lib/training-engine/` para la capa de visualización (consistencia con datos del API; el API es la fuente de verdad).
- [ ] Guards: atleta solo ve sus workouts; coach ve preview de lo que prescribió.

### 3.4 Mobile — WorkoutDetailScreen con IA
- [ ] Sección "Sugerencia de IA" por ejercicio: peso recomendado, reps, RIR objetivo (desde `/workouts/:id/ai-insights`).
- [ ] Mostrar fatiga muscular relevante + 1RM estimado por ejercicio.
- [ ] Botón "Ajustar cargas por IA" → aplica prescripción a los sets de la sesión antes de iniciar.

### Criterios de aceptación Fase 3
- [ ] Endpoints /analytics/* responden datos reales (hoy 404) — dashboard coach desbloqueado.
- [ ] Al abrir un entrenamiento asignado (web o mobile), el atleta ve sugerencias de peso/reps con confidence.
- [ ] Sistema detecta plato y sugiere deload o aumento; 1RM y fatiga visibles en el detalle.

---

## Fase 4 — Fidelización y retención (sin cambios vs v1)

### 4.1 Onboarding y activación
- [ ] Check-in matutino de 10 segundos (readiness 1-5)
- [ ] Plan de bienvenida de 7 días (día 1 = primer entrenamiento, día 7 = suscripción)
- [ ] Tour interactivo de la app (Today, History, Recovery)

### 4.2 Gamificación profunda
- [ ] Rachas compartidas coach-atleta (notificación a ambos si falta un día)
- [ ] Desafíos semanales entre atletas (tabla de clasificación)
- [ ] Niveles y XP por entrenamiento completado
- [ ] Streak freeze / racha perdonada (1 día sin romper racha)

### 4.3 Entrenamiento inteligente
- [ ] Sugerencia de carga diaria adaptativa (readiness + historial)
- [ ] Adaptación por fatiga (HRV/sueño bajos → entrenamiento ligero)

### 4.4 Notificaciones push
- [ ] Push de racha, de próximo entrenamiento (`typical-workout-time`), de logro del coach

### 4.5 Monetización
- [ ] Prueba gratuita 7/14 días al completar onboarding
- [ ] Niveles de suscripción (Básico vs Premium con coach directo)
- [ ] Pago anual con descuento

### Criterios de aceptación Fase 4
- [ ] Atleta recibe push matutino de check-in
- [ ] Atleta ve desafíos semanales y leaderboard
- [ ] Atleta puede iniciar trial gratuito

---

## Fase 5 — App Store Connect (despliegue, sin cambios vs v1)

### 5.1 Requisitos de Apple (pendiente de cuenta pagada)
- [ ] Cuenta Apple Developer Program pagada (USD 99/año) con equipo asociado
- [ ] Certificado de distribución (.p12) + provisioning profile para `com.innotechlabssas.mrtraining.dev`
- [ ] App creada en App Store Connect

### 5.2 Despliegue EAS
- [ ] `eas credentials` (iOS production) → `eas build` → `eas submit` → metadata → revisión

### Mientras tanto — validación en dispositivo real
- [ ] `eas build --platform ios --profile preview` (distribución interna) e instalar en iPhone real
- [ ] Validar flujos T-034/035/038 + grabación GPS en dispositivo real (Fase 1 móvil)

---

## Configuración GPS — estándar técnico (nuevo, aplica a 1.3 web y 1.4 mobile)

### Permisos
- iOS: `LocationWhenInUseUsageDescription` + `LocationAlwaysAndWhenInUseUsageDescription` (texto claro: "para grabar tu carrera aunque la app esté en segundo plano"). Pide Always **después** de la primera carrera exitosa (pre-permission screen explicando por qué).
- Android: `ACCESS_FINE_LOCATION` + `ACCESS_BACKGROUND_LOCATION` + ForegroundService tipo `location` con notificación "Grabando carrera…" (requisito Play Store) + `FOREGROUND_SERVICE_LOCATION` (API 34+).
- Web: `navigator.geolocation` solo en uso; mostrar aviso de que la pestaña debe permanecer abierta (mitigar con `visibilitychange` + Wake Lock API si está disponible).

### Muestreo y precisión
| Parámetro | Valor | Por qué |
|---|---|---|
| `enableHighAccuracy` | true | GPS puro vs red/wifi |
| `timeInterval` | 5000 ms | ~3 puntos/min en carrera |
| `distanceInterval` | 5–8 m | evitar micro-movimientos en paradas |
| Filtro accuracy cliente | descartar >30m | Multipath urbano |
| Filtro accuracy servidor | descartar >50m | Defensa ante clientes viejos |
| Pausa automática | sin cambio de posición >90s | Semáforos, bebidas |

### Batería
- Batch de envío (15s o 20m) en vez de 1 req/punto — reduce radio activo y rate.
- Dejar de pedir updates durante la pausa (clear watchId) y reanudar.
- Android foreground service con `IMPORTANCE_LOW` notification.
- Web: enviar solo cuando `document.visibilityState === 'visible'`; al ocultar >5 min, pausar envíos y avisar en UI.

### Offline-first (mobile)
- Cada punto se persiste localmente (MMKV/SQLite) antes de enviar.
- Reintento con backoff exponencial (1s, 2s, 4s… max 30s) y buffer al reconnect.
- Al finalizar sin red: sesión queda local con flag `pending_sync`; sincroniza al recuperar conexión (POST sesión + batch de puntos + PATCH totales).

### Codificación de ruta
- `gpsRoute` = polyline encoded precision 5 (`@mapbox/polyline`, ya instalado en web) generado en cliente al finalizar.
- Puntos GPS crudos viven en `running_gps_points` (detalle/splits); polyline es el resumen para listas.
- Simplificar polyline con Douglas-Peucker (tolerancia ~2m) antes de codificar — payloads chicos para mobile webview/maps.

---

## Orden de ejecución sugerido (v2, con dependencias reales verificadas)

| Sprint | Fase | Entregable | Esfuerzo | Bloqueado por |
|--------|------|------------|----------|---------------|
| S0 | 1.0 | Commit working tree (client.ts + RunningRouteMap) | Bajo | — |
| S1 | 1.1+1.6 | Páginas web /running y /running/[id] con mapa (sin live) | Medio | S0 |
| S2 | 1.5+1.3 | RunningRouteMap fixes+mejoras y LiveRunTracker web + PATCH sesión | Medio | S1 |
| S3 | 1.2 | PATCH/DELETE sessions + batch live-location + rate limit + filtro accuracy | Medio | — (paralelo con S1) |
| S4 | 1.4+1E | Mobile RunRecordingScreen + config GPS + offline-first | Medio-Alto | S3 |
| S5 | 3.0 | Repository analytics SQL + wire main.go (desbloquea /analytics/*) | Alto | — (paralelo) |
| S6 | 3.1+3.2 | Servicio IA training + GET /workouts/:id/ai-insights | Alto | S5 |
| S7 | 3.3+3.4 | Web athlete workout detail + mobile sección IA | Alto | S6 |
| S8 | 2.1+2.2 | Campos wearable + GarminProvider OAuth + parser fit/tcx/gpx | Alto | — (paralelo) |
| S9 | 2.3+2.4+2.6+2.7 | Webhook Garmin + import archivos + garmin-bridge + UI Settings + jobs sync | Alto | S8 |
| S10 | 4.x | Check-in matutino + desafíos semanales + streak freeze | Medio | — |
| S11 | 4.x | Trial gratuito + niveles de suscripción | Medio | S10 |
| S12 | 5.x | App Store Connect (pendiente cuenta Apple pagada) | Operativo | S4+validación |

---

**Nota de proceso:** cada sprint termina con commit atómico convencional, tests verdes (Go + web + mobile) y build limpio. Nada se mezcla con main sin tests pasando. Per orca-team: transiciones por stage machine (Spec → TODO → In Progress → Review → USER GATE → Done), board BOARD.md como fuente de verdad.
