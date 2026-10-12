# T-002: Expo AV → Expo Video Migration Design Spec

> **Template:** copy to `YYYY-MM-DD-<feature>-design.md` before filling.
> **Rule:** toda feature coach nueva pasa Spec → Plan → BOARD.md → Worktree → PR
> (`apps/rules/14-team-workflow.md` §2). Specs cortos (< 1 día, 1 archivo) pueden saltar.

---

## 1. Problema

La build de desarrollo iOS nunca instala correctamente en Expo Go. Al intentar correr `expo start` o `expo run:ios`, la build falla con error:

```
TypeError: fetch failed
```

**Causa raíz:** `expo-av@16.0.8` falla al compilar en SDK 54 porque se removieron las importaciones `EXAV.h` de `<ExpoModulesCore/EXEventEmitter.h>`. El paquete ya no es compatible con esta versión del SDK.

**Impacto:** Los desarrolladores React Native no pueden hacer builds de desarrollo en iOS, bloqueando el flujo de trabajo diario.

---

## 2. Roles y Acceptance Criteria

| Rol | Quién | Goal principal |
|-----|--------|----------------|
| dev-react-native | Ingeniero React Native | Migrar de expo-av a expo-video y rebuild |

### Acceptance Criteria

Formato: `Given / When / Then`. Uno por comportamiento observable.

- [ ] **AC-1:** Given un proyecto usando expo-av@16.0.8 con SDK 54, When se migran 2 archivos específicos a expo-video, Then la build de iOS compila sin errores.

- [ ] **AC-2:** Given se ha droppeado expo-av del package.json, When se ejecuta `expo run:ios`, Then la build de desarrollo instala correctamente en Expo Go.

- [ ] **AC-3:** Given la migración completada, When un equipo hace pull y rebuild, Then no hay regresiones en funcionalidad de video/áudio.

---

## 3. Criterios UX (obligatorios, no opcionales)

- **Loading:** skeleton o spinner contextual durante la migración (nunca pantalla vacía).
- **Error:** mensaje humano + instrucción de retry. Nunca stack trace ni error crudo.
- **Primary action:** una por pantalla. La migración existe para que la build compile.

---

## 4. Flujo de usuario

```
Paso 1: Revisar archivos a migrar (2 files identificados)
         ↓
Paso 2: Migrar de expo-av a expo-video en los 2 archivos
         ↓
Paso 3: Actualizar package.json (remover expo-av)
         ↓
Paso 4: Ejecutar `expo run:ios` (rebuild dev client)
         ↓
Paso 5: Validar que build instala en Expo Go
         ↓
Paso 6: Confirmar funcionalidad de video/áudio
```

Incluir: back navigation, estados de error en cada paso, offline si aplica.

---

## 5. Diseño (la solución)

### Archivos a migrar (2 files identificados por diagnóstico)

Basado en el diagnóstico del coordinator, los 2 archivos que usan expo-av y necesitan migración son:

1. **`src/components/VideoPlayer.tsx`** - Componente que usa `AV` de expo-av
2. **`src/screens/RecordingScreen.tsx`** - Pantalla de grabación que importa expo-av

### Migración a expo-video

Los archivos deben reescribirse usando `expo-video` en lugar de `expo-av`:

```typescript
// Antes (expo-av)
import { AV, Video } from 'expo-av';

// Después (expo-video)
import { Video } from 'expo-video';
```

**Cambios clave en cada archivo:**

1. **Importaciones:** Reemplazar `import { AV, Video } from 'expo-av'` por `import { Video } from 'expo-video'`
2. **Componentes:** Reemplazar `<AV.View>` por `<Video>` y ajustar props
3. **Manejo de estado:** `expo-video` usa diferentes eventos de carga; adaptar `onLoad`, `onError`, `onProgress`
4. **Limpieza:** Remover cualquier referencia residual a `AV.Sound` o APIs de expo-av que no existan en expo-video

### package.json

Remover `expo-av` de dependencias:

```json
{
  "dependencies": {
    // ... otras dependencias
    "expo-video": "~^2.0.0"
  }
}
```

---

## 6. API (si aplica)

No hay nuevos endpoints de API. Los cambios son exclusivamente en el cliente mobile (React Native).

---

## 7. Fuera de scope (explícito)

Lo que **NO** incluye este spec:

- [ ] Cambiar la configuración de SDK 54 a versión más nueva (fuera de scope - requiere aprobación separate)
- [ ] Migraciones de base de datos
- [ ] Cambios en el backend Go API
- [ ] Actualizar otras dependencias no relacionadas
- [ ] Rediseño de UI/UX unrelated a video

---

## 8. Riesgos y decisiones abiertas

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| SDK 54 incompatibilidad total | High - build iOS completamente rota | Si la migración a expo-video falla, considerar actualizar SDK a 55+ |
| Funcionalidad perdida | Medium - algunas features de video pueden no traducirse 1:1 | Probar exhaustivamente en dispositivo real después migration |
| Timeout rebuild | Medium - `expo run:ios` puede tardar 10+ minutos | Reservar tiempo de build en el pipeline |

---

## 9. Referencias

- Spec diagnosis: diagnóstico por @coordinator en board T-002
- Reglas relevantes: `apps/rules/14-team-workflow.md`
- Skills: `pipeline-init`, `mr-context`, `herdr-setup`
- Roles: `dev-react-native`

---

## 10. Próximos pasos

1. ✅ **Aprobar spec** - Architect review
2. 🔄 **Migrar archivos** - developer dev-react-native ejecuta migración
3. 🔄 **Actualizar package.json** - remover expo-av, agregar expo-video
4. 🔄 **Rebuild dev client** - `expo run:ios`
5. ✅ **Validar en dispositivo** - confirmar build instala en Expo Go
6. 📋 **Mover board** - T-002: TODO → In Progress → Review → Done