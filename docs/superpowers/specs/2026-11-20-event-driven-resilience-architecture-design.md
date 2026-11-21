# Event-Driven Architecture, Resiliencia y Observabilidad — MR Training

**Fecha:** 2026-11-20  
**Estado:** Implementado  
**Alcance:** Go API (`apps/api`), Worker dedicado (`cmd/worker`), Migración PostgreSQL (`432`), Web (`apps/web`), Mobile (`apps/mobile/src/infrastructure/{api,storage}`)

---

## 1. Problema

Los flujos críticos de MR Training (pagos Wompi/MercadoPago, webhooks externos Clerk/Garmin, notificaciones Expo/FCM, Discord, TRM y sincronización de entrenamiento/running) acoplaban trabajo secundario dentro de la petición HTTP síncrona, carecían de aislamiento ante caídas de terceros (circuit breaker, bulkhead, singleflight, timeouts estrictos) y presentaban riesgos de duplicación o pérdida silenciosa en reintentos de clientes Web/Mobile y despliegues horizontales.

---

## 2. Arquitectura General (Monolito Modular + Transactional Outbox + NATS JetStream)

```text
Web / Mobile (X-Correlation-ID + Idempotency-Key + Client Circuit Breaker)
   │
   ▼ HTTP / Fiber
┌─────────────────────────────────────────────────────────────┐
│ apps/api (cmd/api)                                          │
│  ├─ Middleware: RequestID/CorrelationID → Metrics → CORS →  │
│  │              RateLimit (Redis/Auto) → Timeout →          │
│  │              Auth (Singleflight + CB) → Idempotency      │
│  ├─ Handlers & Services: escriben negocio + public.outbox   │
│  │                       en la MISMA transacción PostgreSQL │
│  └─ Realtime: NATS Core Bridge (rt.ws.* / rt.sse.*)        │
└─────────────────────────────────────────────────────────────┘
   │ Transactional Outbox Relay (poll + advisory/row claim)
   ▼ NATS JetStream (Stream: MR_EVENTS, dedup Nats-Msg-Id)
┌─────────────────────────────────────────────────────────────┐
│ apps/api/cmd/worker (o embebido si EMBEDDED_WORKER=true)    │
│  ├─ Billing (payment.approved, checkout.paid/failed)        │
│  ├─ Clerk Metadata Sync (clerk.metadata.sync_requested)     │
│  ├─ Push Dispatch (notification.requested -> Expo/FCM)      │
│  ├─ Discord Alerts (error.reported)                         │
│  ├─ Garmin Async Sync (wearable.garmin.sync_requested)      │
│  ├─ Training Gamification (workout.completed)               │
│  ├─ Athlete Session Consumer (running.session.*)            │
│  └─ Scheduled Jobs (PGAdvisoryLocker single-leader)         │
└─────────────────────────────────────────────────────────────┘
   │ Reintentos agotados (MaxDeliver=5)
   ▼ Dead Letter Queue: JetStream MR_DLQ + public.dead_letter_events
```

### Principios clave
1. **PostgreSQL + Go API siguen siendo la única fuente de verdad.**
2. **Cero nuevas dependencias externas en `apps/api/go.mod`:** `pkg/resilience` y `pkg/metrics` están implementados en Go estándar + `github.com/nats-io/nats.go` ya presente.
3. **Degradación segura:** si `NATS_URL` o `REDIS_URL` no están disponibles al arranque, `cmd/api` y `cmd/worker` degradan de forma explícita (`InMemoryBus` local y rate limit/caché en memoria) mientras exponen el estado `degraded` en `/ready`.

---

## 3. Esquema de Base de Datos (Migración `432`)

Archivo: `apps/api/migrations/postgres/432_event_driven_outbox_and_idempotency.sql` (sincronizado con `supabase/migrations/432_event_driven_outbox_and_idempotency.sql`).

| Tabla / Cambio | Propósito | RLS |
|---|---|---|
| `public.outbox` (evolución) | Añade `event_version`, `correlation_id`, `causation_id`, `organization_id`, `metadata`, índice parcial `idx_outbox_event_type_pending` e índice `idx_outbox_correlation_id`. | Políticas `outbox_tenant_isolation_*` para `coach_id`, `athlete_id`, `organization_id` y contextos internos (`system_worker`, `webhook_worker`, `clerk_provisioning`). |
| `public.processed_events` | Clave primaria `(consumer_name, event_id)` para deduplicación idempotente por consumidor en NATS JetStream. | Solo contextos internos de worker. |
| `public.dead_letter_events` | Auditoría y replay (`replayed_at`) de mensajes que agotan reintentos. | Solo contextos internos de worker. |
| `public.idempotency_keys` | Deduplicación transaccional HTTP `(scope, key, actor_id)` con `request_hash`, estado `in_progress`, `locked_until` (30s) y `expires_at` (24h). | Contextos internos o `actor_id = app.current_user_id`. |

---

## 4. Catálogo de Eventos y Consumidores (`internal/pkg/eventbus`, `internal/workers`)

Streams JetStream en `apps/api/internal/infrastructure/nats/eventbus.go`:
- **`MR_EVENTS`**: subjects `workout.>`, `template.>`, `assignment.>`, `payment.>`, `subscription.>`, `checkout.>`, `clerk.>`, `notification.>`, `support.>`, `error.>`, `wearable.>`, `earnings.>` (`Duplicates: 2m`, retención 7d, header `Nats-Msg-Id`).
- **`MR_DLQ`**: subject `dlq.>` (retención 30d) + persistencia en `public.dead_letter_events`.
- **Reentrega y DLQ:** `MaxDeliver = 5` en suscriptores durables; tras agotar entregas pasa a DLQ.

| Durable Consumer | Subject(s) | Acción principal |
|---|---|---|
| `billing-payment-approved` | `payment.approved` | Registro asíncrono en ledger financiero y comisiones. |
| `billing-checkout-paid` | `checkout.paid` | Marca checkout pagado de forma idempotente. |
| `billing-checkout-failed` | `checkout.failed` | Marca checkout fallido. |
| `clerk-metadata-sync` | `clerk.metadata.sync_requested` | Sincroniza `public_metadata` en Clerk e invalida caché de rol. |
| `notification-push` | `notification.requested` | Envía push Expo/FCM y desactiva tokens `DeviceNotRegistered`. |
| `error-discord-notify` | `error.reported` | Notifica errores críticos al webhook de Discord. |
| `wearable-garmin-sync` | `wearable.garmin.sync_requested` | Ejecuta pull de actividades Garmin desde webhook 202 async. |
| `training-workout-completed` | `workout.completed` | Registra racha diaria y evalúa insignias de gamificación. |

Otros eventos publicados vía Outbox y enrutados en tiempo real:
`workout.started`, `workout.progress`, `workout.set.logged`, `template.created`, `template.updated`, `assignment.created`, `payment.failed`, `subscription.activated`, `subscription.cancelled`, `checkout.claimed`, `clerk.user.provisioned`, `support.ticket.created`, `support.message.added`, `earnings.commission.accrued`.

---

## 5. Matriz de Resiliencia (`pkg/resilience`, Middlewares, Clientes Web/Mobile)

### 5.1 Circuit Breakers, Bulkhead, Retries y Singleflight en Go (`apps/api`)
Todos los breakers se registran en `resilience.DefaultRegistry` (visibles en `/ready` y `/metrics`):

| Nombre | Archivo | Política clave |
|---|---|---|
| `garmin_api` | `internal/infrastructure/running/garmin_provider.go` | HTTP resiliente (10s, CB + Bulkhead + Retry GET). |
| `wompi` | `internal/infrastructure/subscription/wompi/adapter.go` | CB + Bulkhead + Retry GET idempotente. |
| `wompi_statuspage` | `internal/application/wompiavailability/service.go` | Gate de disponibilidad fail-closed para checkouts. |
| `mercadopago` | `internal/infrastructure/subscription/mercadopago/adapter.go` | CB + Verificación fail-closed cuando falta firma webhook. |
| `clerk` | `internal/infrastructure/user/clerk_client.go` | CB + Bulkhead + `Singleflight` en `FetchUser` e invitaciones. |
| `clerk_role` | `internal/middleware/auth.go` | `Singleflight` + caché local/Redis en resolución de roles + timeout acotado. |
| `trm_datosgov` | `internal/application/trm/service.go` | CB + Retry GET + `Singleflight` + fallback en DB. |
| `expo_push` | `internal/infrastructure/expo/push.go` | CB + Bulkhead + reporte por token (`DeviceNotRegistered`). |
| `fcm` | `internal/infrastructure/firebase/fcm.go` | CB + Bulkhead. |
| `discord_webhook` | `internal/infrastructure/error_tracking/discord.go` | CB + Bulkhead. |
| `infisical` | `internal/infrastructure/infisical/client.go` | CB + Retry GET + mutex de autenticación. |
| `redis_cache` | `internal/infrastructure/cache/redis.go` | Fail-open CB + timeouts 500ms/300ms + métricas de caché. |
| `nats_publish` | `internal/infrastructure/nats/eventbus.go` | CB de publicación hacia JetStream. |

### 5.2 Idempotencia HTTP y Rate Limiting (`apps/api/internal/middleware` y `routes`)
- **HTTP Idempotency (`routes.RegisterCriticalIdempotencyMiddleware`):** activo con encabezado `Idempotency-Key` en:
  - Público: `POST /checkouts`
  - Autenticado (`/api/v1`): `POST /subscriptions`, `POST /coach/subscription/checkout`, `POST /coach/subscription/trial`, `POST /checkouts/:id/claim`, `POST /athlete/ally/products/:id/purchase`, `POST /workouts/:id/sets`, `POST /running/workouts/sessions/:id/complete`
- **CORS (`internal/middleware/cors.go`):** permite `X-Correlation-ID` e `Idempotency-Key` y expone `X-Correlation-ID` y `X-Idempotent-Replayed`.
- **Rate Limiting (`internal/middleware/ratelimit.go`):** soporta `RATE_LIMIT_BACKEND=auto|redis|memory` con script distribuido Redis y fallback automático fail-open a memoria.
- **Jobs distribuidos (`internal/jobs/runner.go`):** `PGAdvisoryLocker` (FNV-1a + `pg_try_advisory_lock`) para líder único entre réplicas y apagado coordinado con `sync.WaitGroup`.
- **Realtime distribuido (`internal/infrastructure/realtime/bridge.go`):** replica eventos WebSocket (`rt.ws.*`) y SSE (`rt.sse.*`) entre nodos suppressing echoes mediante `OriginNodeID`.

### 5.3 Web (`apps/web`) y Mobile (`apps/mobile/src/infrastructure/{api,storage}`)
- **Web (`apps/web/src/lib/api/resilience.ts`, `go-client.ts`, `features/shared/api/client.ts`):**
  - `CircuitBreaker` (`CLOSED`/`OPEN`/`HALF_OPEN`), `CircuitBreakerOpenError` (`status = 503`).
  - `fetchWithResilience`: timeout 10s con `AbortController`, propagación `X-Correlation-ID`, reintentos con backoff + jitter y soporte `Retry-After` solo para `GET`/`HEAD`/`OPTIONS` o peticiones con `Idempotency-Key`. Los códigos `4xx` (excepto `429`) y abortos del llamador no disparan el breaker ni reintentan.
  - `goFetch`, `goFetchServer`, `goFetchBlob` lanzan `GoApiError` con `.status` consistente y adjuntan `Idempotency-Key` una vez por mutación lógica (manteniendo el refresh único de 401 Clerk).
  - `shouldFallbackToNextApi(err, method)`: restringe el fallback a Next.js exclusivamente a lecturas (`GET`/`HEAD`) con estado `404` o `501` en `GoApiError`. Eliminados todos los fallbacks en mutaciones (`POST`/`PUT`/`DELETE`).
- **Mobile (`apps/mobile/src/infrastructure/api/{resilience,client}.ts`, `storage/{OfflineMutationQueue,FormMetricsSync}.ts`):**
  - Interceptor Axios con `defaultMobileApiBreaker` / `nextClientBreaker`, propagación automática `X-Correlation-ID`, `Idempotency-Key` automático en mutaciones, reintentos transitorios (`max 2`, backoff con jitter) separados del guard `_retry` de refresco Clerk `401` (nunca dispara el breaker en `401` ni en `4xx != 408/429`).
  - `OfflineMutationQueue`: cola persistente en MMKV acotada a 200 items, deduplicación por `idempotencyKey`, lock de reentrada en `flush()`, pausa en `401` o `CircuitBreakerOpenError` sin consumir intentos, envío a dead-letter (`permanent_4xx`, `max_attempts`, `overflow`) tras agotamiento o error cliente permanente.
  - `FormMetricsSync`: lock single-flight (`inFlightSync`), clave determinística por lote ordenada (`computeBatchIdempotencyKey`) y reintentos transitorios acotados.
  - **Restricción cumplida:** cero cambios en pantallas, componentes o navegación UI de `apps/mobile/`.

---

## 6. Observabilidad (`/metrics`, `/ready`, Correlación)

- **`GET /metrics`** (protegido opcionalmente por `METRICS_TOKEN` Bearer): expone formato Prometheus `0.0.4` desde `pkg/metrics`:
  - `http_requests_total`, `http_request_duration_seconds`
  - `external_calls_total`, `external_call_duration_seconds`
  - `circuit_breaker_transitions_total`, `circuit_breaker_state`, `circuit_breaker_consecutive_failures`
  - `cache_operations_total`, `idempotency_hits_total`, `webhooks_received_total`
  - `outbox_events_published_total`, `outbox_pending_events`, `outbox_dead_events`
  - `nats_consumer_messages_total`, `nats_consumer_duration_seconds`
  - `go_goroutines`, `go_mem_alloc_bytes`, `db_pool_connections_open`, `db_pool_connections_in_use`, `db_pool_connections_idle`, `db_pool_wait_count_total`
- **`GET /ready`**: valida conectividad PostgreSQL (obligatorio -> HTTP `503` si falla) + estado de Redis, NATS y snapshot de breakers (`ready` / `degraded`).

---

## 7. Runbook Operacional

### Modos de despliegue (`apps/api/Dockerfile`, `apps/api/docker-compose.yml`)
1. **Producción / QA recomendado (procesos separados):**
   - `cmd/api`: `EMBEDDED_WORKER=false`, `RATE_LIMIT_BACKEND=auto` (usa Redis si disponible).
   - `cmd/worker`: ejecuta el relay del outbox, consumidores JetStream `MR_EVENTS`, consumer de sesiones running y cron jobs distribuidos con `PGAdvisoryLocker`; expone health/metrics en `WORKER_HEALTH_PORT` (default `:9092`).
2. **Desarrollo local / proceso único:**
   - `EMBEDDED_WORKER=true` permite arrancar API + outbox relay + consumers dentro de `cmd/api`.

### Replay manual de Dead Letter Queue
1. Consultar eventos fallidos pendientes:
   ```sql
   SELECT id, subject, consumer_name, event_id, event_type, error_message, created_at
   FROM public.dead_letter_events
   WHERE replayed_at IS NULL
   ORDER BY created_at DESC;
   ```
2. Tras corregir la causa raíz, re-encolar en `public.outbox` con nuevo `id` / `next_retry_at = NOW()` o republicar en el subject correspondiente y marcar `replayed_at = NOW()`.
