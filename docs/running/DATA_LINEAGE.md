# MR Training — Data Lineage: Running Tracking

Fecha: 2026-10-28
Estado: Borrador para revisión

---

## Convenciones

| Campo | Significado |
|---|---|
| Mide | Valor obtenido directamente de un sensor |
| Calcula | Valor derivado de una fórmula sobre valores medidos |
| Estima | Valor aproximado con incertidumbre documentada |
| Origen | Fuente autoritativa del dato |
| Nulo | El campo puede ser NULL/ausente |
| Sensible | Dato de ubicación precisa o de salud (GPS, FC) — no loguear |

---

## 1. Identificador de sesión

| Paso | Detalle |
|---|---|
| Origen | Generado por backend Go (`uuid.NewString()`) al crear `RunningSession` |
| Captura móvil | Recibido en respuesta de `POST /running/workouts/sessions/:id/start` |
| Cálculo | N/A (identificador, no calculado) |
| Persistencia local | MMKV `running_session_state:{sessionId}` |
| Sincronización | Enviado como `session_id` en cada punto GPS y en `complete` |
| Validación Go | `session.ID != ""`; UUID válido |
| Almacenamiento PostgreSQL | `running_sessions.id` (TEXT PRIMARY KEY) |
| Consulta API | `GET /running/sessions/:id` con ownership check |
| Visualización web | ID de sesión en historial y detalle |
| KPI | Usado para agrupar puntos GPS y métricas de la sesión |
| Tipo | string (UUID) |
| Fuente autoritativa | Backend Go |
| Se mide/calcula/estima | N/A |
| Regla de validación | UUID no vacío, pertenece al usuario autenticado |
| Valores nulos | Nunca |
| Método de agregación | Agrupación por `session_id` |
| Permisos de lectura | Dueño de la sesión o coach autorizado |
| Retención | Indefinida (soft delete) |
| Sensible | No |

---

## 2. Atleta

| Paso | Detalle |
|---|---|
| Origen | `users` table (Clerk) |
| Captura móvil | Token de sesión Clerk; `user_id` desde middleware |
| Cálculo | N/A |
| Persistencia local | MMKV `athlete_id` |
| Sincronización | Enviado en `user_id` de cada petición |
| Validación Go | `session.UserID == authenticatedUserID` |
| Almacenamiento PostgreSQL | `running_sessions.user_id` |
| Consulta API | Filtro `WHERE user_id = $1` en listado |
| Visualización web | Nombre de atleta en dashboard de coach |
| KPI | Agrupación de métricas por atleta |
| Tipo | string (UUID) |
| Fuente autoritativa | Clerk / users table |
| Se mide/calcula/estima | N/A |
| Regla de validación | Debe existir en `users` |
| Valores nulos | Nunca |
| Método de agregación | COUNT, SUM, AVG por user_id |
| Permisos de lectura | Dueño o coach asignado |
| Retención | Indefinida |
| Sensible | No (identificador, no PII directo) |

---

## 3. Entrenamiento asignado (template)

| Paso | Detalle |
|---|---|
| Origen | Coach crea template en web |
| Captura móvil | `GET /running/workouts/templates` → lista de templates |
| Cálculo | N/A |
| Persistencia local | React Query cache + MMKV opcional |
| Sincronización | No se sincroniza; se consulta por API |
| Validación Go | `template.coach_id == coachID`; `deleted_at IS NULL` |
| Almacenamiento PostgreSQL | `running_workout_templates` |
| Consulta API | `GET /running/workouts/templates` |
| Visualización web | Lista de plantillas del coach |
| KPI | Plantillas creadas por coach |
| Tipo | Objeto con segments[] |
| Fuente autoritativa | Backend Go |
| Se mide/calcula/estima | N/A |
| Regla de validación | `coach_id` no vacío; `name` no vacío |
| Valores nulos | `description`, targets pueden ser nulos |
| Método de agregación | COUNT por coach |
| Permisos de lectura | Dueño (coach) |
| Retención | Soft delete |
| Sensible | No |

---

## 4. Snapshot de prescripción

| Paso | Detalle |
|---|---|
| Origen | JSON serializado de template + segments al iniciar sesión |
| Captura móvil | Recibido en respuesta de `start` |
| Cálculo | `json.Marshal(template)` en backend |
| Persistencia local | MMKV `running_snapshot:{sessionId}` |
| Sincronización | Enviado al crear sesión |
| Validación Go | `template_copy` es JSONB válido |
| Almacenamiento PostgreSQL | `running_workout_snapshots.template_copy` (JSONB) |
| Consulta API | `GET /running/workouts/snapshots/:sessionId` |
| Visualización web | Plan vs real en resumen de sesión |
| KPI | Comparación plan vs ejecución real |
| Tipo | JSONB |
| Fuente autoritativa | Backend Go (inmutable tras captura) |
| Se mide/calcula/estima | N/A |
| Regla de validación | JSON válido; `session_id` único (UNIQUE index) |
| Valores nulos | Nunca |
| Método de agregación | N/A (1:1 con sesión) |
| Permisos de lectura | Dueño de sesión o coach autorizado |
| Retención | Indefinida (cascade con sesión) |
| Sensible | No |

---

## 5. Fecha y zona horaria

| Paso | Detalle |
|---|---|
| Origen | `time.Now().UTC()` en backend al crear sesión |
| Captura móvil | `Date` header del dispositivo o servidor |
| Cálculo | N/A |
| Persistencia local | MMKV `createdAt` |
| Sincronización | `date` campo en sesión |
| Validación Go | RFC3339 parseable |
| Almacenamiento PostgreSQL | `running_sessions.date` (TIMESTAMPTZ) |
| Consulta API | Filtro por rango `from_date` / `to_date` |
| Visualización web | Fecha de sesión en historial |
| KPI | Agrupación semanal/mensual por fecha |
| Tipo | string (RFC3339) |
| Fuente autoritativa | Backend Go |
| Se mide/calcula/estima | N/A |
| Regla de validación | Formato RFC3339 UTC |
| Valores nulos | Nunca |
| Método de agregación | GROUP BY semana ISO |
| Permisos de lectura | Dueño o coach autorizado |
| Retención | Indefinida |
| Sensible | No |

---

## 6. Fuente de actividad

| Paso | Detalle |
|---|---|
| Origen | `source` campo: `manual` \| `mobile_gps` \| `apple_watch` \| `garmin` \| `health_connect` |
| Captura móvil | `SourceMobileGPS` para sesiones iniciadas en app |
| Cálculo | N/A |
| Persistencia local | MMKV `source` |
| Sincronización | Enviado en creación y importación de dispositivo |
| Validación Go | `domain.IsDeviceSource()` para importación; cualquier string para manual |
| Almacenamiento PostgreSQL | `running_sessions.source` |
| Consulta API | Filtro opcional por source |
| Visualización web | Etiqueta de origen en historial |
| KPI | Sesiones por fuente (móvil vs wearable) |
| Tipo | string |
| Fuente autoritativa | Backend Go |
| Se mide/calcula/estima | N/A |
| Regla de validación | Uno de los valores canonicos |
| Valores nulos | Nunca (default 'manual') |
| Método de agregación | COUNT por source |
| Permisos de lectura | Dueño o coach autorizado |
| Retención | Indefinida |
| Sensible | No |

---

## 7. Estado de ejecución

| Paso | Detalle |
|---|---|
| Origen | Máquina de estados móvil: `preparado` → `en_ejecucion` → `en_pausa` → `finalizando` |
| Captura móvil | Estado local en MMKV |
| Cálculo | N/A |
| Persistencia local | MMKV `running_session_state:{sessionId}` |
| Sincronización | `status` en assignment (`assigned` → `started` → `completed`) |
| Validación Go | Transiciones válidas de `RunningWorkoutAssignmentStatus` |
| Almacenamiento PostgreSQL | `running_workout_assignments.status` |
| Consulta API | Filtro por status |
| Visualización web | Estado de asignación (pendiente, iniciado, completado) |
| KPI | % de cumplimiento (completados / asignados) |
| Tipo | string (enum) |
| Fuente autoritativa | Backend Go (móvil reporta, backend confirma) |
| Se mide/calcula/estima | N/A |
| Regla de validación | Uno de: assigned, available, started, completed, skipped, cancelled |
| Valores nulos | Nunca (default 'assigned') |
| Método de agregación | COUNT por status |
| Permisos de lectura | Dueño o coach autorizado |
| Retención | Indefinida |
| Sensible | No |

---

## 8. Tiempo transcurrido

| Paso | Detalle |
|---|---|
| Origen | Timer local en móvil (setInterval 1s mientras `en_ejecucion`) |
| Captura móvil | `timeElapsed` en RunningExecutionScreen |
| Cálculo | `finished_at - started_at` (incluye pausas) en backend `UpdateSession` |
| Persistencia local | MMKV `running_metrics:{sessionId}.duration` |
| Sincronización | `duration` en `complete` request |
| Validación Go | `duration >= 0`; si distance > 0 y duration > 0 → calcula pace y speed |
| Almacenamiento PostgreSQL | `running_sessions.duration` (INTEGER segundos) |
| Consulta API | Campo en respuesta de sesión |
| Visualización web | Duración en resumen y historial |
| KPI | Volumen semanal (suma de duración) |
| Tipo | int (segundos) |
| Fuente autoritativa | Móvil (envía), backend (valida y persiste) |
| Se mide/calcula/estima | Mide (timer local) |
| Regla de validación | No negativo |
| Valores nulos | Nunca (default 0) |
| Método de agregación | SUM, AVG |
| Permisos de lectura | Dueño o coach autorizado |
| Retención | Indefinida |
| Sensible | No |

---

## 9. Tiempo en movimiento

| Paso | Detalle |
|---|---|
| Origen | Suma de intervalos con estado `en_ejecucion` (excluye pausas) |
| Captura móvil | Calculado en motor de tracking |
| Cálculo | `tiempo_en_movimiento = transcurrido - tiempo_en_pausa` |
| Persistencia local | MMKV `running_metrics:{sessionId}.movingDuration` |
| Sincronización | Enviado como parte de métricas finales |
| Validación Go | `moving_duration <= duration` |
| Almacenamiento PostgreSQL | **No existe aún** — requeriría nueva columna |
| Consulta API | N/A (pendiente de migración) |
| Visualización web | N/A (pendiente) |
| KPI | Ritmo medio basado en tiempo en movimiento (más preciso) |
| Tipo | int (segundos) |
| Fuente autoritativa | Móvil |
| Se mide/calcula/estima | Calcula |
| Regla de validación | <= tiempo transcurrido |
| Valores nulos | Puede ser nulo (si no se implementa aún) |
| Método de agregación | SUM, AVG |
| Permisos de lectura | Dueño o coach autorizado |
| Retención | Indefinida |
| Sensible | No |

---

## 10. Distancia

| Paso | Detalle |
|---|---|
| Origen | Suma de Haversine entre puntos GPS válidos consecutivos |
| Captura móvil | Motor de tracking acumula distancia por punto |
| Cálculo | `distancia_total = Σ haversine(p[i-1], p[i])` para puntos válidos |
| Persistencia local | MMKV `running_metrics:{sessionId}.distance` (metros) |
| Sincronización | `distance` en `complete` request (km) |
| Validación Go | `distance >= 0`; si > 0 y duration > 0 → calcula pace y speed |
| Almacenamiento PostgreSQL | `running_sessions.distance` (REAL, km) |
| Consulta API | Campo en respuesta de sesión |
| Visualización web | Distancia en resumen, historial, mapa |
| KPI | Volumen semanal (km), distancia por atleta |
| Tipo | float64 (km) |
| Fuente autoritativa | Móvil (calcula), backend (valida y persiste) |
| Se mide/calcula/estima | Calcula |
| Regla de validación | >= 0; <= distancia máxima razonable (maratón = 42.195 km como sanity check suave) |
| Valores nulos | Nunca (default 0) |
| Método de agregación | SUM, AVG |
| Permisos de lectura | Dueño o coach autorizado |
| Retención | Indefinida |
| Sensible | Sí (derivado de GPS) |

---

## 11. Ritmo medio

| Paso | Detalle |
|---|---|
| Origen | `paceSeconds = duration_seconds / distance_km` |
| Captura móvil | `formatPace(distance, duration)` |
| Cálculo | Backend recalcula en `UpdateSession` si distance > 0 y duration > 0 |
| Persistencia local | MMKV `running_metrics:{sessionId}.pace` |
| Sincronización | `pace` string en `complete` request |
| Validación Go | `formatPace(distance, duration)` si no proviene del cliente |
| Almacenamiento PostgreSQL | `running_sessions.pace` (TEXT, "5:30") |
| Consulta API | Campo en respuesta de sesión |
| Visualización web | Ritmo medio en resumen y historial |
| KPI | Evolución del ritmo por atleta |
| Tipo | string ("min:seg" por km) |
| Fuente autoritativa | Backend Go (recalcula para consistencia) |
| Se mide/calcula/estima | Calcula |
| Regla de validación | Formato "M:SS"; distance > 0 requerido |
| Valores nulos | Puede ser vacío si distance = 0 |
| Método de agregación | AVG (convertir a segundos, promedio, formatear) |
| Permisos de lectura | Dueño o coach autorizado |
| Retención | Indefinida |
| Sensible | No |

---

## 12. Ritmo por parcial (split)

| Paso | Detalle |
|---|---|
| Origen | Distancia acumulada cada 1 km o fin de segmento |
| Captura móvil | Motor de tracking genera split al alcanzar umbral |
| Cálculo | `splitPace = splitDuration / splitDistance` |
| Persistencia local | MMKV `running_splits:{sessionId}[]` |
| Sincronización | **No existe aún** — requeriría tabla `running_splits` |
| Validación Go | N/A (pendiente) |
| Almacenamiento PostgreSQL | **No existe** — requieren nueva tabla |
| Consulta API | N/A (pendiente) |
| Visualización web | Parciales en detalle de sesión |
| KPI | Ritmo por tramo, consistencia |
| Tipo | Array de {distancia_km, duracion_seg, pace} |
| Fuente autoritativa | Móvil |
| Se mide/calcula/estima | Calcula |
| Regla de validación | distancia > 0; duracion > 0 |
| Valores nulos | Array vacío si no hay splits |
| Método de agregación | N/A |
| Permisos de lectura | Dueño o coach autorizado |
| Retención | Indefinida |
| Sensible | Sí (derivado de GPS) |

---

## 13. Velocidad

| Paso | Detalle |
|---|---|
| Origen | `velocidad_mps = distancia_metros / duracion_segundos` |
| Captura móvil | Calculado en motor de tracking |
| Cálculo | Backend: `speed = (distance / duration) * 3600` (km/h) |
| Persistencia local | MMKV `running_metrics:{sessionId}.speed` |
| Sincronización | No enviado explícitamente (derivado) |
| Validación Go | `speed >= 0` |
| Almacenamiento PostgreSQL | `running_sessions.speed` (REAL, km/h) |
| Consulta API | Campo en respuesta |
| Visualización web | Velocidad en detalle |
| KPI | Velocidad máxima, velocidad media |
| Tipo | float64 (km/h) |
| Fuente autoritativa | Backend Go (calcula desde distance/duration) |
| Se mide/calcula/estima | Calcula |
| Regla de validación | >= 0 |
| Valores nulos | Puede ser 0 si distance = 0 |
| Método de agregación | MAX, AVG |
| Permisos de lectura | Dueño o coach autorizado |
| Retención | Indefinida |
| Sensible | No |

---

## 14. Elevación

| Paso | Detalle |
|---|---|
| Origen | `alt` de cada punto GPS |
| Captura móvil | `loc.coords.altitude` |
| Cálculo | `elevacion_ganada = Σ max(0, alt[i] - alt[i-1])`; `elevacion_perdida = Σ max(0, alt[i-1] - alt[i])` |
| Persistencia local | MMKV `running_metrics:{sessionId}.elevation` |
| Sincronización | `elevation` en `complete` request |
| Validación Go | `elevation >= 0` |
| Almacenamiento PostgreSQL | `running_sessions.elevation` (REAL, metros) |
| Consulta API | Campo en respuesta |
| Visualización web | Perfil de elevación (pendiente de tabla de puntos con alt) |
| KPI | Desnivel acumulado |
| Tipo | float64 (metros) |
| Fuente autoritativa | Móvil (GPS), backend (valida) |
| Se mide/calcula/estima | Mide (GPS) + calcula (ganada/pérdida) |
| Regla de validación | >= 0 |
| Valores nulos | Puede ser 0 si sin datos de elevación |
| Método de agregación | SUM, AVG |
| Permisos de lectura | Dueño o coach autorizado |
| Retención | Indefinida |
| Sensible | Sí (derivado de GPS) |

---

## 15. Frecuencia cardíaca

| Paso | Detalle |
|---|---|
| Origen | Sensor BLE HRM o entrada manual |
| Captura móvil | **No implementado aún** (BLE bloqueado) |
| Cálculo | Promedio de lecturas FC durante sesión |
| Persistencia local | MMKV opcional |
| Sincronización | `heart_rate` en `complete` request |
| Validación Go | `heart_rate >= 0` |
| Almacenamiento PostgreSQL | `running_sessions.heart_rate` (INTEGER, BPM) |
| Consulta API | Campo en respuesta |
| Visualización web | FC media en resumen |
| KPI | FC media por sesión, zonas FC (pendiente) |
| Tipo | int (BPM) |
| Fuente autoritativa | Sensor BLE o manual |
| Se mide/calcula/estima | Mide (sensor) |
| Regla de validación | 30 <= FC <= 220 (sanity check) |
| Valores nulos | Puede ser 0 si sin sensor |
| Método de agregación | AVG (solo valores > 0) |
| Permisos de lectura | Dueño o coach autorizado |
| Retención | Indefinida |
| Sensible | Sí (dato de salud) |

---

## 16. Cadencia

| Paso | Detalle |
|---|---|
| Origen | Sensor BLE cadencia o pasos del acelerómetro |
| Captura móvil | **No implementado aún** |
| Cálculo | pasos / minutos_en_movimiento |
| Persistencia local | MMKV opcional |
| Sincronización | `cadence` en `complete` request |
| Validación Go | `cadence >= 0` |
| Almacenamiento PostgreSQL | `running_sessions.cadence` (INTEGER, spm) |
| Consulta API | Campo en respuesta |
| Visualización web | Cadencia en resumen |
| KPI | Cadencia media, evolución |
| Tipo | int (spm) |
| Fuente autoritativa | Sensor o cálculo |
| Se mide/calcula/estima | Mide o calcula |
| Regla de validación | 140 <= cadencia <= 220 (sanity check para running) |
| Valores nulos | Puede ser 0 si sin sensor |
| Método de agregación | AVG (solo valores > 0) |
| Permisos de lectura | Dueño o coach autorizado |
| Retención | Indefinida |
| Sensible | No |

---

## 17. Coordenadas y timestamps GPS

| Paso | Detalle |
|---|---|
| Origen | `expo-location` watchPositionAsync |
| Captura móvil | Cada punto: lat, lng, alt, timestamp, accuracy |
| Cálculo | Filtrado (precisión, saltos, duplicados) antes de persistir |
| Persistencia local | SQLite local `running_gps_points` + MMKV cola de sync |
| Sincronización | `POST /running/sessions/:id/live-location` (batch de 100 max) |
| Validación Go | `accuracy <= 50m`; timestamp RFC3339; lat/lng válidos |
| Almacenamiento PostgreSQL | `running_gps_points` (id, session_id, lat, lng, alt, timestamp, accuracy) |
| Consulta API | `GET /running/sessions/:id` con puntos |
| Visualización web | Mapa de ruta (polyline decodado de `gps_route`) |
| KPI | Distancia, ritmo, mapa (derivados) |
| Tipo | float64 (lat/lng), int (alt), string (timestamp), float64 (accuracy) |
| Fuente autoritativa | GPS del dispositivo |
| Se mide/calcula/estima | Mide |
| Regla de validación | -90 <= lat <= 90; -180 <= lng <= 180; accuracy >= 0 |
| Valores nulos | alt y accuracy pueden ser nulos |
| Método de agregación | Secuencia ordenada por timestamp |
| Permisos de lectura | Dueño de sesión |
| Retención | Indefinida (cascade con sesión) |
| Sensible | **Sí** — ubicación precisa; no loguear |

---

## 18. Calidad GPS

| Paso | Detalle |
|---|---|
| Origen | `accuracy` de cada punto; porcentaje de puntos válidos |
| Captura móvil | Motor de tracking calcula % válidos |
| Cálculo | `gps_quality = puntos_validos / puntos_totales` |
| Persistencia local | MMKV `running_metrics:{sessionId}.gpsQuality` |
| Sincronización | **No enviado aún** — requeriría campo en sesión |
| Validación Go | N/A (pendiente) |
| Almacenamiento PostgreSQL | **No existe** — requeriría nueva columna |
| Consulta API | N/A (pendiente) |
| Visualización web | Indicador de calidad en mapa |
| KPI | Fiabilidad de distancia por calidad GPS |
| Tipo | float64 (0.0 a 1.0) o enum (good/fair/poor) |
| Fuente autoritativa | Móvil |
| Se mide/calcula/estima | Calcula |
| Regla de validación | 0.0 <= calidad <= 1.0 |
| Valores nulos | Puede ser nulo |
| Método de agregación | AVG |
| Permisos de lectura | Dueño de sesión |
| Retención | Indefinida |
| Sensible | No (metadato de calidad) |

---

## 19. Estado de sincronización

| Paso | Detalle |
|---|---|
| Origen | `pending` → `synced` tras confirmación backend |
| Captura móvil | MMKV `running_sync_queue` |
| Cálculo | N/A |
| Persistencia local | MMKV + SQLite `running_sync_queue` |
| Sincronización | Respuesta HTTP 200 = sincronizado |
| Validación Go | `external_id` único para idempotencia |
| Almacenamiento PostgreSQL | `running_session_devices(user_id, external_id)` único |
| Consulta API | N/A (interno) |
| Visualización web | Banner "Sincronizado" en resumen |
| KPI | Errores de sincronización por atleta |
| Tipo | string (pending/synced/error) |
| Fuente autoritativa | Backend Go (confirma) |
| Se mide/calcula/estima | N/A |
| Regla de validación | Estado válido |
| Valores nulos | Nunca |
| Método de agregación | COUNT por estado |
| Permisos de lectura | Dueño de sesión |
| Retención | 30 días (cola de sync) |
| Sensible | No |

---

## 20. Errores de datos

| Paso | Detalle |
|---|---|
| Origen | Fallos de validación, puntos descartados, errores de red |
| Captura móvil | `error` estado en motor de tracking |
| Cálculo | Conteo de puntos descartados por motivo |
| Persistencia local | MMKV `running_errors:{sessionId}[]` |
| Sincronización | Enviado en respuesta de error |
| Validación Go | Mensaje de error sanitizado (sin secretos) |
| Almacenamiento PostgreSQL | **No existe** — tabla de errores opcional |
| Consulta API | N/A |
| Visualización web | Indicador de error en sesión |
| KPI | Tasa de error de sincronización |
| Tipo | string (código de error) |
| Fuente autoritativa | Móvil / Backend |
| Se mide/calcula/estima | N/A |
| Regla de validación | Código de error conocido |
| Valores nulos | Puede estar vacío (sin errores) |
| Método de agregación | COUNT por código |
| Permisos de lectura | Dueño de sesión |
| Retención | 7 días |
| Sensible | No (sin PII) |

---

## 21. Métricas planificadas (del snapshot)

| Paso | Detalle |
|---|---|
| Origen | `target_distance_km`, `target_duration_sec` del template |
| Captura móvil | Recibido en snapshot al iniciar sesión |
| Cálculo | N/A |
| Persistencia local | MMKV `running_snapshot:{sessionId}` |
| Sincronización | Parte del snapshot JSON |
| Validación Go | JSONB válido |
| Almacenamiento PostgreSQL | `running_workout_snapshots.template_copy` |
| Consulta API | Parte de detalle de sesión |
| Visualización web | Plan vs real en resumen |
| KPI | % de cumplimiento (real / planificado) |
| Tipo | float64 / int dentro de JSON |
| Fuente autoritativa | Backend Go (template) |
| Se mide/calcula/estima | N/A |
| Regla de validación | Dentro del snapshot válido |
| Valores nulos | Puede ser nulo (free run sin target) |
| Método de agregación | N/A |
| Permisos de lectura | Dueño de sesión o coach autorizado |
| Retención | Indefinida |
| Sensible | No |

---

## 22. Métricas reales

| Paso | Detalle |
|---|---|
| Origen | Cálculos del motor de tracking (distancia, duración, pace, etc.) |
| Captura móvil | Métricas finales al completar sesión |
| Cálculo | Ver secciones 8-16 |
| Persistencia local | MMKV `running_metrics:{sessionId}` |
| Sincronización | `POST /running/sessions/:id/complete` |
| Validación Go | `UpdateSession` recalcula pace/speed si distance/duration > 0 |
| Almacenamiento PostgreSQL | `running_sessions` (distance, duration, pace, speed, etc.) |
| Consulta API | `GET /running/sessions/:id` |
| Visualización web | Resumen real post-sesión |
| KPI | Todos los KPI de atleta y coach |
| Tipo | Varios (ver secciones individuales) |
| Fuente autoritativa | Móvil (envía), backend (valida y persiste como autoridad) |
| Se mide/calcula/estima | Calcula |
| Regla de validación | Cada campo según su regla |
| Valores nulos | Según cada campo |
| Método de agregación | SUM, AVG, MAX, COUNT |
| Permisos de lectura | Dueño o coach autorizado |
| Retención | Indefinida |
| Sensible | Sí (distancia y GPS son sensibles) |

---

## Reglas de integridad

1. **No duplicar datos derivados:** La velocidad y el ritmo se calculan en backend desde distance/duration; no se almacenan dos veces con valores distintos.
2. **Backend es autoridad de KPI:** El móvil envía métricas, pero el backend las valida y recalcula lo necesario (pace, speed) antes de persistir.
3. **Récords personales no basados solo en GPS aproximado:** Un PR oficial requiere distancia validada (puntos GPS suficientes, calidad >= umbral) y tiempo en movimiento confirmado.
4. **No contar dos veces una sincronización:** `external_id` único + `ON CONFLICT DO NOTHING` en dispositivos; `session_id` único en snapshots.
5. **Cero ≠ ausencia ≪ inválido:** Distancia 0 es válida (sesión sin movimiento). Campo ausente (NULL) significa sin dato. Valor inválido (accuracy > 50m) se descarta.
