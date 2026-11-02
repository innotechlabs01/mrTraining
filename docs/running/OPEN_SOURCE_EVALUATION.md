# MR Training — Evaluación de Proyectos Open Source de Tracking

Fecha: 2026-10-28
Estado: Borrador para revisión

---

## 1. Repositorios inspeccionados

| Proyecto | URL | Licencia | Estado | Mantenimiento |
|---|---|---|---|---|
| RunnerUp | https://github.com/jonasoreland/runnerup | GPL-3.0 | Activo (Kotlin Multiplatform) | Medio |
| FreePace | https://github.com/sawtoothdata/FreePace | Revisar | Activo (Swift/SwiftData, solo iOS) | Medio |
| expo-running-kit | https://github.com/aliresana/expo-running-kit | Revisar | Bajo (módulo nativo Expo) | Bajo |
| OpenTracks | https://github.com/OpenTracksApp/OpenTracks | Revisar | Archivado | Nulo |

---

## 2. Evaluación por proyecto

### 2.1 RunnerUp

**Puntuación funcional:** 8/10
**Puntuación de reusabilidad para MR Training:** 2/10 (licencia GPL-3.0 incompatible)

**Fortalezas:**
- Máquina de estados de sesión completa
- Entrenamientos por intervalos con series y repeticiones
- Objetivos de ritmo y FC
- Zonas cardíacas
- Audio coaching configurable (TTS)
- Sensores BLE/ANT+ (HRM, cadencia, potencia, presión)
- Wear OS
- Historial y exportación multiplataforma

**Debilidades:**
- Licencia GPL-3.0 (copyleft) — incompatible con producto propietario MR Training
- Arquitectura antigua (Kotlin Multiplatform, no compartible con React Native/Expo)
- Código no directamente reutilizable

**Veredicto:** Usar **únicamente como referencia funcional**. Nunca copiar código. Acción: REIMPLEMENT los patrones observados (máquina de estados, intervalos, objetivos) de forma independiente.

---

### 2.2 FreePace

**Puntuación funcional:** 7/10
**Puntuación de reusabilidad para MR Training:** 4/10 (solo iOS, SwiftUI)

**Fortalezas:**
- Arquitectura limpia (MVVM, SwiftData)
- Pruebas XCTest con in-memory models
- GPX 1.1 + CSV import/export completo
- Cálculo de distancia y ritmo
- Parciales configurables
- Checkpoints y comparación con carrera de referencia
- Audio coaching
- Perfil de elevación
- Mapa coloreado por ritmo/elevación
- Funcionamiento con pantalla bloqueada

**Debilidades:**
- Solo iOS (SwiftUI, SwiftData) — no compartible con Expo/React Native
- Licencia por verificar

**Veredicto:** Usar como referencia de **arquitectura limpia y patrones de prueba**. Acción: ADAPT patrones de MVVM y pruebas unitarias con datos sintéticos.

---

### 2.3 expo-running-kit

**Puntuación funcional:** 5/10
**Puntuación de reusabilidad para MR Training:** 7/10 (proximidad tecnológica Expo/React Native)

**Fortalezas:**
- Módulo nativo ligero para iOS y Android
- Máquina de estado de sesión
- Cálculo Haversine para distancia
- Ritmo instantáneo, medio y mejor
- Cadencia y pasos
- Auto-pausa y reanudación
- Parciales
- Indicador de calidad GPS
- Gestión de permisos
- Ciclo de vida de sesión

**Debilidades:**
- Sin persistencia local
- Sin exportación
- Sin audio coaching
- Mantenimiento bajo
- Licencia por verificar

**Veredicto:** **No incorporar como dependencia automática.** Verificar licencia, mantenimiento, API y compatibilidad con versiones actuales del proyecto (Expo 54, RN 0.81). Acción: ADAPT ideas (máquina de estado, Haversine, auto-pausa) a nuestra implementación propia.

---

### 2.4 OpenTracks

**Puntuación funcional:** 9/10
**Puntuación de reusabilidad para MR Training:** 3/10 (archivado, Java/Android)

**Fortalezas:**
- GPX 1.1, KML 2.2/2.3 export completo con trackpoints
- BLE sensores extensos (HR, cadencia, potencia, presión)
- Anuncios de voz
- SQLite probado
- Identificadores únicos para evitar duplicaciones
- Privacidad y almacenamiento local

**Debilidades:**
- Repositorio archivado (sin mantenimiento)
- Código Java/Android antiguo
- No compartible con React Native/Expo

**Veredicto:** Usar como referencia de **formatos GPX/KML y tratamiento de tracks**. Acción: ADAPT formato GPX para export backend.

---

## 3. Decisiones de dependencias

| Dependencia potencial | Decisión | Justificación |
|---|---|---|
| `expo-running-kit` | NO agregar automáticamente | Verificar licencia y mantenimiento primero; mejor adaptar ideas |
| `@react-native-community/geolocation` | NO | `expo-location` ya está en el proyecto y es suficiente |
| `react-native-maps` | YA EXISTE | `RunningRouteView` ya lo usa |
| `@mapbox/polyline` | YA EXISTE | `RunningRouteView` ya lo usa para decodificar polylines |
| BLE library (react-native-ble-plx) | BLOCKED | Requiere hardware nativo y permisos; fuera de scope inicial |
| expo-background-fetch | BLOCKED | Requiere configuración nativa; fuera de scope inicial |

---

## 4. Patrones y algoritmos identificados

| Patrón/algoritmo | Proyecto fuente | Archivo | Aplicación en MR Training |
|---|---|---|---|
| Máquina de estados de sesión | RunnerUp | `common/src/main/kotlin/.../session/` | REIMPLEMENT en `TrackingEngine.ts` |
| Cálculo Haversine distancia | expo-running-kit / RunningRouteView | `RunningRouteView.tsx` (ya existe) | KEEP (ya implementado en móvil) |
| Filtro de precisión GPS | OpenTracks / RunnerUp | `services/location/` | REIMPLEMENT en `GpsFilter.ts` |
| Detección de saltos GPS | RunnerUp | `common/src/main/kotlin/.../gps/` | REIMPLEMENT en `GpsFilter.ts` |
| Auto-pausa por cadencia | expo-running-kit | `ios/RunningKit/` | REIMPLEMENT en `TrackingEngine.ts` |
| Parciales por distancia | FreePace | `MetricsService` | REIMPLEMENT en `MetricsCalculator.ts` |
| Audio coaching TTS | RunnerUp / expo-speech | `RUTextToSpeech` / `useRunningAudio.ts` | ADAPT (extender announcements) |
| Export GPX 1.1 | OpenTracks / FreePace | `services/export/` | ADAPT (completar `exportGPX` backend) |
| Idempotencia por external_id | RunnerUp / OpenTracks | `running_session_devices` (ya existe) | KEEP (ya implementado) |
| Snapshot inmutable | MR Training (propio) | `running_workout_snapshots` (ya existe) | KEEP |

---

## 5. Funciones actuales de MR Training reutilizadas

| Función | Archivo | Estado |
|---|---|---|
| `useGpsTracking` (expo-location) | `apps/mobile/src/features/training/hooks/useGpsTracking.ts` | KEEP + extender con filtro y métricas |
| `useRunningOffline` (MMKV) | `apps/mobile/src/features/training/application/useRunningOffline.ts` | KEEP + extender con estado de sesión |
| `useRunningAudio` (expo-speech) | `apps/mobile/src/features/training/application/useRunningAudio.ts` | KEEP + extender announcements |
| `RunningExecutionScreen` | `apps/mobile/src/features/training/presentation/screens/RunningExecutionScreen.tsx` | ADAPT (máquina de estados, segmentos) |
| `RunningSessionSummaryScreen` | `apps/mobile/src/features/training/presentation/screens/RunningSessionSummaryScreen.tsx` | KEEP + extender con splits y elevación |
| `RunningRouteView` | `apps/mobile/src/features/training/presentation/components/RunningRouteView.tsx` | KEEP (ya tiene Haversine y mapa) |
| `RunningService` (Go) | `apps/api/internal/application/running/service.go` | KEEP + extender con validación GPS y cálculos |
| `RunningRepository` (Go) | `apps/api/internal/infrastructure/running/repository.go` | KEEP |
| Migraciones SQL 001-008 | `apps/api/migrations/postgres/` | KEEP |
| DTOs y handlers HTTP | `apps/api/internal/interfaces/http/` | KEEP |

---

## 6. Brechas encontradas

| Brecha | Origen | Impacto | Acción |
|---|---|---|---|
| No hay filtro GPS ni detección de saltos | expo-running-kit / OpenTracks | Alta | REIMPLEMENT |
| No hay métricas en tiempo real | expo-running-kit / FreePace | Alta | REIMPLEMENT |
| No hay máquina de estados formal | RunnerUp | Alta | REIMPLEMENT |
| No hay ejecución guiada de segmentos | RunnerUp | Alta | ADAPT |
| No hay pruebas de tracking | FreePace (XCTest) | Media | REIMPLEMENT |
| GPX export sin trackpoints | OpenTracks | Media | ADAPT |
| No hay background location | expo-running-kit | Media | BLOCKED |
| No hay sensores BLE/ANT+ | OpenTracks / RunnerUp | Media | BLOCKED |

---

## 7. Implementaciones nuevas planificadas

| Implementación | Archivo | Esfuerzo |
|---|---|---|
| TrackingEngine (máquina de estados + filtro + métricas) | `apps/mobile/src/features/training/domain/TrackingEngine.ts` | 3 días |
| GpsFilter (precisión, saltos, duplicados, ruido) | `apps/mobile/src/features/training/infrastructure/GpsFilter.ts` | 2 días |
| MetricsCalculator (distancia, ritmo, velocidad, parciales) | `apps/mobile/src/features/training/infrastructure/MetricsCalculator.ts` | 2 días |
| SessionStateManager (MMKV persistencia de estado) | `apps/mobile/src/features/training/infrastructure/SessionStateManager.ts` | 1 día |
| LocationAdapter (wrapper expo-location) | `apps/mobile/src/features/training/infrastructure/LocationAdapter.ts` | 1 día |
| Pruebas unitarias de motor de tracking | `apps/mobile/src/features/training/__tests__/` | 2 días |
| GPX export con trackpoints (backend) | `apps/api/internal/application/running/service.go` | 1 día |
| Validación GPS en backend | `apps/api/internal/application/running/service.go` | 1 día |

---

## 8. Dependencias añadidas y licencias

| Dependencia | Licencia | ¿Añadir? | Justificación |
|---|---|---|---|
| Ninguna nueva | — | No | Todas las capacidades se implementan con dependencias existentes (expo-location, expo-speech, MMKV, react-native-maps, @mapbox/polyline) |

---

## 9. KPI y fórmulas implementadas (planeadas)

| KPI | Fórmula | Fuente |
|---|---|---|
| Volumen semanal (km) | Σ distancia | Backend `running_sessions.distance` |
| Ritmo medio (min/km) | duration / distancia | Backend `formatPace()` |
| % cumplimiento | completados / asignados | Backend `running_workout_assignments.status` |
| Distancia por atleta | Σ distancia WHERE user_id | Backend |
| Entrenamientos iniciados | COUNT status='started' | Backend |
| Entrenamientos completados | COUNT status='completed' | Backend |
| Sesiones incompletas | COUNT status IN ('started', 'assigned') | Backend |
| Errores de sincronización | COUNT sync_queue.status='error' | Móvil → Backend |

---

## 10. Limitaciones verificadas

1. **Licencia GPL-3.0 de RunnerUp:** No se puede copiar código. Solo referencia funcional.
2. **expo-running-kit sin mantenimiento:** No se agrega como dependencia sin verificación previa.
3. **OpenTracks archivado:** Solo referencia de formatos.
4. **FreePace solo iOS:** Patrón de arquitectura aplicable, código no reutilizable.
5. **Sin background location:** No implementado en scope inicial.
6. **Sin sensores BLE/ANT+:** Requiere hardware nativo; fuera de scope.
7. **Sin pruebas en dispositivo real:** Las pruebas de tracking serán unitarias con datos sintéticos.

---

## 11. Tareas pendientes

| Tarea | Prioridad |
|---|---|
| Implementar TrackingEngine con máquina de estados | P0 |
| Implementar GpsFilter con pruebas sintéticas | P0 |
| Implementar MetricsCalculator | P0 |
| Extender useRunningOffline con estado de sesión | P1 |
| Extender RunningExecutionScreen con segmentos | P1 |
| Completar GPX export con trackpoints (backend) | P1 |
| Agregar validación GPS en backend | P1 |
| Escribir pruebas unitarias de tracking | P1 |
| Verificar licencia de expo-running-kit antes de considerar dependencia | P2 |
| Implementar background location (requiere config nativa) | BLOCKED |
| Implementar sensores BLE/ANT+ (requiere hardware) | BLOCKED |
