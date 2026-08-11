# Invite: Deep Link Expo Go + Código Manual — Design Spec

**Fecha:** 2026-08-11
**Estado:** Aprobado (design approval)
**Relacionado:** App MR Training (Expo SDK 57) + Web Next.js (apps/web)

---

## Contexto y problema

El tester recibe una invitación con un código de entrenamiento (ej. `MR-A3X9`).
Desde la página web `/invite?code=MR-A3X9` debe poder **descargar la app móvil
via Expo Go y abrirla con su código** para aceptar la invitación.

El flujo actual falla porque la página de invitación genera el deep link de Expo Go:

```
exp://u.expo.dev/c4e4a8cc-bcf6-43cd-8d13-33bd46e6fea7/--/invite?code=MR-A3X9
```

sin los parámetros obligatorios que el servicio EAS Update requiere:

```
runtime-version=1.0.0&channel-name=development
```

Al abrir ese link, Expo Go no puede resolver el manifest y muestra:

> `expo-runtime-version expo-channel-name expo-platform are required`

Además, el parsing de `/--/` combinado con query params ha sido frágil en Expo Go
(issue conocido de Expo), así que el código puede llegar o no según la versión
de Expo Go. La app móvil hoy **no** tiene forma de ingresar el código manualmente:
si el deep link no entrega el código, `InviteAcceptScreen` falla con
"No invitation code provided".

---

## Objetivo

Que el tester pueda unirse a MR Training desde una invitación web, ya sea:

1. **Deep link funcionando**: escanear el QR / tocar "Abrir en Expo Go" y que la
   app abra directamente la pantalla de invitación con el código; o
2. **Respaldo manual**: si el deep link no entrega el código, la app muestra un
   campo para pegar el código copiado desde la web.

Ningún camino depende de un servidor local ni de un túnel.

---

## Alcance

- **Web** (`apps/web/src/app/invite/InvitePageClient.tsx`): corregir la URL de
  Expo Go generada.
- **Mobile** (`apps/apps/mobile/src/features/auth/presentation/screens/InviteAcceptScreen.tsx`):
  añadir entrada manual del código.

Fuera de alcance: desarrollo web completo de la app móvil, EAS Build, cambios de
backend.

---

## Diseño

### 1. Web — URL de Expo Go corregida

En `buildExpoUrl`, incluir los parámetros del manifest que EAS exige:

```
Base:   exp://u.expo.dev/<projectId>?runtime-version=1.0.0&channel-name=development
Con código: <base>/--/invite?code=<code>
```

- Los parámetros `runtime-version` y `channel-name` se toman de constantes
  (mismo valor que `app.json` → `runtimeVersion.policy: appVersion` = `1.0.0`,
  canal `development`).
- La URL corregida alimenta: el **QR** (`qrCodeUrl`), el botón **"Abrir en
  Expo Go"** (`expoOpenUrl`) y **"Copiar link para Expo Go"**.
- Se actualiza la instrucción del paso 3: si la app no abre la pantalla de
  invitación sola, el tester pega el código en el campo de la app.

### 2. Mobile — Entrada manual del código

En `InviteAcceptScreen`:

- Si `code` viene por deep link → se auto-completa un campo (editable) y se
  intenta aceptar la invitación como hoy.
- Si `code` es `null` → **ya no** se muestra el error
  "No invitation code provided". En su lugar se muestra:
  - `TextInput` para pegar/escribir el código (estilo consistente con
    `SignInScreen`).
  - Botón **"Conectar con mi coach"** que llama a la misma lógica
    `acceptInvite(code)`.
  - El comportamiento con sesión/no sesión se mantiene: si no hay sesión,
    navega a `Auth` guardando el código (hoy ya lo hace con `route.params.code`,
    ahora también con el código manual).

Estados existentes (`idle/loading/success/error/needs_auth`) no cambian.

### 3. Verificación

- `pnpm lint` + `pnpm typecheck` en `apps/web`.
- Lint/typecheck de la app móvil (`npm run lint`, `npm run typecheck`).
- Prueba manual en dispositivo real con Expo Go:
  - QR con código → la app abre invitación con código.
  - Link sin código → la app muestra el campo manual y conecta al pegar el código.
- Publicar un `eas update --branch development` para que los testers reciban el
  cambio de la app móvil (el link de web sigue apuntando al canal development).

---

## Riesgos

- El parsing de `/--/` + query params depende de la versión de Expo Go instalada.
  Mitigado por la entrada manual del código (Opción C).
- La app usa `API_URL = https://mrtraining.vercel.app` en producción; no cambia.
- `eas update` con `--platform all` intenta bundlear web y falla por falta de
  `react-native-web`; usar `--platform android` y `--platform ios` por separado
  (como se hizo hoy).

---

## Archivos afectados

- `apps/web/src/app/invite/InvitePageClient.tsx`
- `apps/apps/mobile/src/features/auth/presentation/screens/InviteAcceptScreen.tsx`
