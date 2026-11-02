# MR Training — Mapa de Capacidades de Tracking (Open Source vs MR)

Fecha: 2026-10-28
Estado: Borrador para revisión
Referencia: https://github.com/jonasoreland/runnerup, https://github.com/sawtoothdata/FreePace, https://github.com/aliresana/expo-running-kit, https://github.com/OpenTracksApp/OpenTracks

---

## Matriz Comparativa

| Capacidad | Proyecto fuente | Archivo o módulo original | Solución observada | Implementación MR actual | Archivo MR correspondiente | Brecha | Acción |
|---|---|---|---|---|---|---|---|
| Seguimiento GPS | expo-running-kit | `ios/RunningKit/RunningKitLocationManager.swift` / `android/runningkit/src/main/java/...` | watchPositionAsync con accuracy High, distanceInterval, timeInterval; máquina de estado de sesión | `useGpsTracking` con `Location.watchPositionAsync` (Accuracy.High, distanceInterval 10m, timeInterval 5s) | `apps/mobile/src/features/training/hooks/useGpsTracking.ts` | No hay validación de precisión, no hay detección de saltos GPS, no hay filtrado de ruido | REIMPLEMENT |
| Distancia y ritmo | expo-running-kit | `ios/RunningKit/RunningKitMetricsCalculator.swift` | Haversine para distancia entre puntos; ritmo instantáneo/medio/mejor | `RunningRouteView` usa `haversineMeters` para distancia de ruta; `useGpsTracking` no calcula ritmo ni distancia acumulada | `apps/mobile/src/features/training/presentation/components/RunningRouteView.tsx` | No hay cálculo de distancia acumulada en tiempo real, no hay ritmo instantáneo ni parciales | REIMPLEMENT |
| Entrenamientos por intervalos | RunnerUp | `common/src/main/kotlin/com/jonasoreland/runnerup/.../workout/` | Estructura de entrenamiento con intervalos, pasos, objetivos de ritmo/FC | Templates con segmentos (warmup/main/interval/recovery/cooldown) ya modelados | `apps/api/internal/domain/running/workout_template.go` | No hay ejecución guiada de segmentos en móvil (solo muestra template.name estático) | ADAPT |
| Objetivos de ritmo y FC | RunnerUp | `common/src/main/kotlin/.../goal/` | Objetivos de ritmo y frecuencia cardíaca por segmento | Templates ya tienen target_pace_min/max, target_heart_rate_min/max | `apps/api/internal/domain/running/workout_template.go` | La app móvil no usa estos objetivos durante la ejecución (solo se muestran estáticamente) | ADAPT |
| Zonas cardíacas | RunnerUp | `common/src/main/kotlin/.../zone/` | Cálculo de zonas FC basadas en FC máxima | No implementado | N/A | Ausente | DEFER |
| Audio coaching configurable | expo-running-kit / RunnerUp | `ios/RunningKit/RunningKitSpeechSynthesizer.swift` / `RUTextToSpeech` | Síntesis de voz para anuncios de segmento, ritmo, FC | `useRunningAudio` con `expo-speech` (solo announcements básicos de segmento) | `apps/mobile/src/features/training/application/useRunningAudio.ts` | Sin anuncios de ritmo, distancia por km, zona FC, cadencia; sin configuración de audio | ADAPT |
| Pausas y reanudación | RunnerUp / OpenTracks | Máquina de estado de sesión | Estados: preparado, en ejecución, pausa, reanudado, finalizado | `RunningExecutionScreen` tiene isPaused local; sin persistencia de estado de pausa | `apps/mobile/src/features/training/presentation/screens/RunningExecutionScreen.tsx` | No persiste estado de pausa; no sobrevive a cierre de app; sin máquina de estados formal | REIMPLEMENT |
| Sensores BLE/ANT+ | OpenTracks / RunnerUp | `services/ble/` / `common/src/main/kotlin/.../ble/` | BLE HRM, cadencia, potencia, presión; ANT+ submódulo | `DeviceConnection` + `WearableProvider` en backend; móvil sin integración BLE | `apps/api/internal/domain/running/provider.go` | Móvil no tiene escaneo BLE ni lectura de sensores HR/cadencia | BLOCKED (requiere hardware nativo y permisos) |
| Historial y exportación | OpenTracks / FreePace | `services/export/` / `ExportService` | GPX 1.1, KML, CSV; import GPX | Backend ya tiene `ExportRunningSessions` (CSV y GPX incompleto); móvil sin export | `apps/api/internal/application/running/service.go` (exportCSV/exportGPX) | GPX sin trackpoints reales (polyline decoding pendiente); móvil sin export local | ADAPT |
| Wear OS | RunnerUp | `wear/` | Sesiones en reloj con sincronización | No implementado | N/A | Fuera de scope actual | DEFER |
| Persistencia offline | FreePace / OpenTracks | `SwiftData` model / `SQLite` | Persistencia local de sesiones y puntos; sincronización idempotente | `useRunningOffline` con MMKV (sesiones y puntos pendientes); backend con `external_id` único para idempotencia | `apps/mobile/src/features/training/application/useRunningOffline.ts` | No hay persistencia de estado de sesión (pausa, segmento actual); sincronización no verifica duplicados del backend | ADAPT |
| Sincronización | RunnerUp / OpenTracks | Sync service con external_id | Re-sync idempotente vía external_id único | Backend `GetSessionIDByExternalID` + `running_session_devices(user_id, external_id)` único | `apps/api/internal/domain/running/provider.go` | Móvil no reintenta con backoff; no hay detección de conflicto de datos diferentes | ADAPT |
| Cálculo de métricas | FreePace | `MetricsService` | Distancia, ritmo, velocidad, elevación, calorías | `RunningStats` en backend (distancia, duración, pace medio, FC media); móvil sin métricas en tiempo real | `apps/api/internal/application/running/service.go` | No hay métricas instantáneas (ritmo actual, velocidad actual, elevación ganada/pérdida) | REIMPLEMENT |
| Récords personales | OpenTracks | PR tracking | Mejores marcas por distancia | No implementado | N/A | Ausente | DEFER |
| Perfil de elevación | FreePace / OpenTracks | Elevation processing | Ganancia/pérdida de elevación filtrada | `elevation` campo en `RunningSession`; sin procesamiento de elevación | `apps/api/internal/domain/running/running.go` | Sin cálculo de elevación ganada/pérdida; sin perfil de elevación | DEFER |
| Mapa coloreado por ritmo/elevación | FreePace | `MapView` con color por pace/elevación | Polyline con gradiente de color | `RunningRouteView` muestra ruta en color sólido y completado; sin color por pace/elevación | `apps/mobile/src/features/training/presentation/components/RunningRouteView.tsx` | Sin coloración por métrica | DEFER |
| Import/export GPX/CSV | OpenTracks / FreePace | GPX parser/generator | GPX 1.1 con trackpoints; CSV con métricas | Backend `exportGPX` sin trackpoints (solo trkseg vacío); `exportCSV` completo | `apps/api/internal/application/running/service.go` | GPX incompleto (no incluye puntos GPS); móvil sin import | ADAPT |
| Funcionamiento pantalla bloqueada | expo-running-kit | Background location task | Location en segundo plano con permisos específicos | No configurado en móvil | N/A | No hay background location ni TaskManager para running | BLOCKED (requiere configuración nativa iOS/Android) |
| Pruebas con servicios simulados | FreePace | XCTest con in-memory SwiftData | Pruebas unitarias de métricas con datos sintéticos | Pruebas de Go para data-migrate; móvil sin pruebas de tracking | `apps/api/cmd/data-migrate/main_test.go` | No hay pruebas de filtro GPS, distancia, parciales, sincronización | REIMPLEMENT |

---

## Hallazgos Clave

### 1. Lo que MR Training ya tiene bien implementado

- **Backend Go completo:** Servicio de running con sesiones, GPS points, dispositivos, templates, asignaciones, snapshots, importación de wearables, exportación CSV/GPX.
- **Modelo de datos relacional:** Tablas `running_sessions`, `running_gps_points`, `running_workout_templates`, `running_workout_segments`, `running_workout_assignments`, `running_workout_snapshots`, `running_session_devices`, `device_connections`.
- **Idempotencia por external_id:** `running_session_devices(user_id, external_id)` es único, permitiendo re-sync sin duplicados.
- **Snapshots inmutables:** `running_workout_snapshots.template_copy` guarda JSON de la plantilla al iniciar la sesión.
- **Mobile funcional:** `useGpsTracking` (expo-location), `useRunningOffline` (MMKV), `useRunningAudio` (expo-speech), `RunningExecutionScreen`, `RunningSessionSummaryScreen`, `RunningRouteView`.

### 2. Brechas críticas (acción requerida)

| # | Brecha | Impacto | Acción |
|---|---|---|---|
| 1 | No hay máquina de estados de sesión en móvil | Alta | REIMPLEMENT: estados preparado/iniciando/en ejecución/pausa/reanudando/finalizando/pendiente sync/sincronizado/error |
| 2 | No hay filtro GPS ni detección de saltos | Alta | REIMPLEMENT: validación de precisión, detección de saltos, filtrado de ruido |
| 3 | No hay métricas en tiempo real (ritmo, distancia acumulada) | Alta | REIMPLEMENT: calculadora de métricas con posiciones sintéticas para pruebas |
| 4 | No hay ejecución guiada de segmentos | Alta | ADAPT: usar template.segments para guiar segmento actual, objetivo pace/FC |
| 5 | No hay persistencia de estado de pausa/segmento | Media | ADAPT: extender MMKV para guardar estado de sesión activa |
| 6 | GPX export sin trackpoints | Media | ADAPT: incluir puntos GPS en export GPX |
| 7 | No hay pruebas de tracking (filtro, distancia, parciales, sync) | Media | REIMPLEMENT: pruebas unitarias con datos sintéticos |
| 8 | No hay background location | Media | BLOCKED: requiere configuración nativa iOS/Android y permisos |

### 3. Decisiones de licencia

- **RunnerUp (GPL-3.0):** Usar SOLO como referencia funcional. NUNCA copiar código. Copyleft incompatibile con producto propietario.
- **FreePace:** Revisar licencia antes de usar cualquier patrón específico.
- **expo-running-kit:** Revisar licencia (probablemente MIT o similar). Proximidad tecnológica alta con Expo/React Native.
- **OpenTracks (archivado):** Usar como referencia de formatos GPX/KML y tratamiento de tracks.

---

## Priorización de Acciones

| Prioridad | Capacidad | Acción | Esfuerzo | Dependencias |
|---|---|---|---|---|
| P0 | Máquina de estados de sesión | REIMPLEMENT | 2 días | Ninguna |
| P0 | Filtro GPS y detección de saltos | REIMPLEMENT | 2 días | Ninguna |
| P0 | Métricas en tiempo real (distancia, ritmo) | REIMPLEMENT | 3 días | Filtro GPS |
| P0 | Pruebas unitarias de tracking | REIMPLEMENT | 2 días | Ninguna |
| P1 | Ejecución guiada de segmentos | ADAPT | 3 días | Máquina de estados |
| P1 | Persistencia de estado de sesión | ADAPT | 1 día | MMKV existente |
| P1 | GPX export con trackpoints | ADAPT | 1 día | Backend existente |
| P2 | Audio coaching extendido | ADAPT | 2 días | expo-speech existente |
| P3 | Perfil de elevación | DEFER | - | - |
| P3 | Zonas cardíacas | DEFER | - | - |
| P3 | Sensores BLE/ANT+ | BLOCKED | - | Hardware nativo |
| P3 | Background location | BLOCKED | - | Configuración nativa |
