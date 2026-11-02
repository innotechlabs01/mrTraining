# MR Training — Mobile Redesign (Phase A) · Guía de estilo y cómo probar

> **Qué es esto:** resumen compacto del nuevo sistema visual (sistema Volt) + qué cambió + cómo levantar y probar la app. Fuente canónica: `apps/mobile/src/shared/theme/tokens.ts`.

---

## 1. Nuevo sistema de color — Volt

Un solo acento de marca: **Volt #C8FF00**. Dark-first, superficies por diferencia tonal (no bordes).

| Rol | Hex | Uso |
|---|---|---|
| Base | `#111214` | Fondo de app, capa más profunda |
| Surface | `#191B1E` | Cards, superficies principales |
| Surface Raised | `#202329` | Elementos elevados, inputs, chips |
| Border | `#26292E` | Hairlines, separadores |
| **Primary (Volt)** | `#C8FF00` | Único acento. Un CTA primary por pantalla. Progreso, estados activos |
| Primary Pressed | `#A8D900` | Estado presionado de elementos Volt |
| Text | `#F5F5F7` | Texto principal (WCAG AA) |
| Text Secondary | `#9CA3AF` | Texto secundario, captions, placeholders |
| Success | `#34D399` | Acciones completadas, tendencias positivas |
| Warning | `#FBBF24` | Estados de cautela, membresía por vencer |
| Error | `#FF5A5F` | Errores, acciones destructivas |

Regla clave: **un solo CTA Volt por pantalla**. Texto sobre Volt siempre es Base (`#111214`), nunca blanco.

## 2. Tipografía

- **Display / títulos / números grandes (scoreboard):** Archivo (700–900)
- **UI / cuerpo:** Inter (400–800)

Escala: display 40–48 · title 20 · body 15 · label 11 uppercase tracking 2.

## 3. UI Kit — componentes compartidos (`src/shared/components/ui/`)

| Componente | Archivo | Para qué |
|---|---|---|
| PrimaryButton | `PrimaryButton.tsx` | El único CTA Volt por pantalla |
| Card | `Card.tsx` | Contenedor de superficie (card con hairline + sombra) |
| Badge | `Badge.tsx` | Estados neutral/success/warning/error/primary |
| ScreenHeader | `ScreenHeader.tsx` | Header con título/subtítulo/back/action |
| ProgressBar | `ProgressBar.tsx` | Barra de progreso accesible (0..1) |
| Input | `Input.tsx` | Campo de texto con estado de error |
| EmptyState | `EmptyState.tsx` | Estados loading/error(+retry)/empty |

Todos consumen solo `tokens` — **cero colores hardcodeados**.

## 4. Lo que cambió / quedó en esta fase

- `shared/theme/tokens.ts` — fuente única del sistema Volt
- `shared/theme/index.ts` + `designTokens.ts` — ahora shims temporales respaldados por tokens (los consumidores migran en Fase B); `primitives.ts` eliminado
- `shared/theme/fonts.ts` — carga Archivo + Inter vía expo-font (+ FontGate en `App.tsx`)
- Dependencia `react-native-svg` agregada
- **Jest infra**: jest-expo + @testing-library/react-native configurados y funcionando
- Reglas actualizadas: `01-brand-guidelines.md`, `02-design-system.md`, `mobile-rules/01-mobile-ui-ux.md` → sistema Volt (naranja/azul retirados)

## 5. Cómo probar la app

```bash
# 1. Instalar dependencias del app (use --legacy-peer-deps por el mismatch de React)
cd apps/mobile
npm install --legacy-peer-deps

# 2. Levantar el dev server de Expo
npx expo start
#   → a para Android, i para iOS, o escaneá el QR en Expo Go

# 3. (opcional) build nativo prebuilt
npx expo run:ios     # o run:android
```

### Correr los tests

```bash
cd apps/mobile
npm test            # 11 suites / 26 tests (kit UI + tokens + fonts + svg)
```

### Verificar tipos

```bash
cd apps/mobile
npx tsc --noEmit
```

## 6. Puntos a verificar al navegar la app

- Fuentes Archivo/Inter cargan correctamente (sin tipografía fallback genérica)
- Las cards usan Surface `#191B1E` + hairline `#26292E` en vez de naranja plano
- Un único botón primario Volt por pantalla, texto oscuro encima
- El splash nativo se mantiene hasta que cargan las fuentes (FontGate)

---

> Nota: el **look final** (Glass Dock, Readyness display con números gigantes, entry flow reestructurado, workout/eventos/pagos) corresponde a las **Fases B/C** — esta fase instala la base sobre la que se construyen.
