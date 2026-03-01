# Propuesta Tecnica: Evolucion del Softphone AccesPhone

## Documento de Evaluacion Tecnica

**Fecha:** 2026-02-28
**Version:** 1.0
**Autor:** Claude (Asistente IA)
**Proyecto:** syscbctlmonitoreo - Sistema de Video Accesos

---

## 1. RESUMEN EJECUTIVO

Este documento describe una propuesta de mejora para el softphone del sistema de Video Accesos, basada en el analisis de dos implementaciones existentes:

| Aspecto | AccesPhone.tsx (Produccion) | softphone/index.html (Referencia) |
|---------|---------------------------|----------------------------------|
| **Tecnologia** | React/Next.js (TypeScript) | HTML/JS vanilla |
| **Lineas de codigo** | ~1,170 | ~2,289 (backup completo) / 758 (version actual) |
| **Integracion SIP** | JsSIP via npm | JsSIP via script (jssip.min.js) |
| **Video** | Basico (1 camara activa) | Multi-camara, grid view, proxy PHP |
| **Relays/MQTT** | No incluido | Pendiente de implementacion |
| **Contactos** | No incluido | CRUD completo con busqueda |
| **Historial** | No incluido | Registro de llamadas con tipos |
| **Audio** | Mute/Speaker basico | Control granular (mic, speaker, ringtone con sliders) |
| **Privadas** | Via API externa de page.tsx | Pendiente de integrar |
| **Auto-snapshot** | Parcial | Completo con guardado servidor y descarga |
| **Reconexion** | Si (backoff exponencial) | No (solo conexion manual) |
| **Diseno UI** | Widget flotante minimalista | Panel lateral deslizante profesional |

**Conclusion:** Cada implementacion tiene fortalezas unicas. La propuesta es crear una **version fusionada** que combine lo mejor de ambas.

---

## 2. ANALISIS DETALLADO DE CADA IMPLEMENTACION

### 2.1 AccesPhone.tsx (Produccion actual)

**Ubicacion:** `video-accesos-app/src/components/AccesPhone.tsx`
**Lineas:** 1,169

**Fortalezas:**
- Arquitectura React moderna con TypeScript (tipado seguro)
- Integracion nativa con Next.js (dynamic import, SSR-safe)
- Sistema de callbacks (`onIncomingCall`, `onCallAnswered`, `onCallEnded`) para comunicacion con la pagina de Registro de Accesos
- Auto-reconexion con backoff exponencial (2s, 4s, 8s... 30s max)
- Manejo de estado con hooks de React (useState, useCallback, useRef)
- Widget flotante no intrusivo (boton circular + panel desplegable)
- Configuracion ICE Servers para NAT traversal
- Fallback a stream silencioso cuando microfono no disponible (NotReadableError)

**Debilidades:**
- Sin video multi-camara (solo 1 camara a la vez, sin grid)
- Sin sistema de relays/MQTT integrado
- Sin historial de llamadas
- Sin contactos
- Sin controles de audio granulares
- Componente monolitico (~1,170 lineas en un solo archivo)
- Sin snapshot con guardado en servidor
- Sin selector de privada integrado (depende de page.tsx)
- Credenciales SIP almacenadas en localStorage sin encriptar

**Paginas que lo usan:**
- `procesos/registro-accesos/page.tsx` (1,863 lineas) - Import dinamico con SSR deshabilitado
- `procesos/monitoristas/page.tsx` (1,812 lineas) - Usa variante `AccesPhoneInline`

### 2.2 softphone/index.html (Referencia)

**Ubicacion:** `softphone/index.html` (758 lineas actual) + `index.html.backup` (2,289 lineas, version completa)
**Backend:** `camera_proxy.php` (204 lineas)

**Fortalezas:**
- **Video completo:** Vista individual + grid multi-camara (2x2), switching con animacion, indicador FPS, pause/resume, fullscreen
- **Proxy de camaras PHP:** Autenticacion Digest/Basic para Hikvision, snapshot guardado en servidor con bitacora JSON
- **Contactos:** CRUD completo, busqueda, tipos VIP/Normal
- **Historial:** Registro de llamadas entrantes/salientes/perdidas con duracion
- **Audio granular:** Sliders separados para microfono, parlante y ringtone
- **Diseno profesional:** Panel lateral con tab animado, toast notifications, modales
- **Atajos de teclado:** V=video, R=relays, M=mute, G=grid, numeros del dialpad
- **Integracion iframe:** Comunicacion bidireccional via postMessage

**Debilidades:**
- HTML/JS vanilla (mas dificil de mantener a largo plazo)
- Sin reconexion automatica SIP
- Sin tipado (propenso a errores en runtime)
- Sin SSR handling (requiere navegador)
- Sin integracion con Next.js/React
- No puede comunicarse via callbacks con page.tsx

### 2.3 Backend PHP Existente

**camera_proxy.php** (204 lineas) - Completamente funcional:
- Proxy HTTP para camaras Hikvision via ISAPI
- Autenticacion Digest/Basic con cURL
- Mapeo de canales por extension (702, 502, 802, 102, 202)
- Acciones: `list` (JSON de camaras), `mapping` (extension->canal), snapshot JPEG
- SVG de error como fallback visual
- CORS habilitado (`Access-Control-Allow-Origin: *`)

**Archivos pendientes de crear:**
- `mqtt_relay.php` - No existe aun, se debe implementar
- `api_privada.php` - No existe aun, se debe implementar

### 2.4 Documentacion de Referencia del Bot Orquestador

**Ubicacion:** `documentacion bot orquestador/Manual_Tecnico_Control_Remoto_MQTT.md` (45.9 KB)

Este manual documenta el protocolo MQTT para control de relays, lo cual es la base para implementar `mqtt_relay.php` y la integracion de relays en el softphone.

---

## 3. PROPUESTA: AccesPhone Pro v3.0

### 3.1 Vision

Crear una **version unificada** en React/TypeScript que:
1. Mantenga la arquitectura React actual de produccion
2. Incorpore todas las funcionalidades avanzadas de la referencia
3. Mejore la modularidad dividiendo el componente monolitico

### 3.2 Arquitectura Propuesta

```
video-accesos-app/src/components/
  accesphone/
    AccesPhone.tsx              <- Componente principal (orquestador)
    hooks/
      useSipConnection.ts       <- Hook: conexion SIP, registro, reconexion
      useCallManager.ts         <- Hook: llamadas entrantes/salientes, DTMF
      useCameraSystem.ts        <- Hook: video multi-camara, grid, snapshots
      useRelayController.ts     <- Hook: MQTT relays via proxy PHP
      useAudioControls.ts       <- Hook: volumen mic/speaker/ringtone
      useContactsManager.ts     <- Hook: CRUD contactos, busqueda
      useCallHistory.ts         <- Hook: historial de llamadas
      usePrivadaSelector.ts     <- Hook: selector de privada + auto-lookup
    components/
      PhoneButton.tsx           <- Boton flotante con indicador de estado
      PhonePanel.tsx            <- Panel principal desplegable
      DialpadTab.tsx            <- Teclado numerico + display
      CameraTab.tsx             <- Video individual + grid + controles
      AudioTab.tsx              <- Controles de audio con sliders
      RelayTab.tsx              <- Panel de relays con botones de activacion
      ContactsTab.tsx           <- Lista de contactos + busqueda
      HistoryTab.tsx            <- Historial de llamadas
      IncomingCallOverlay.tsx   <- Modal de llamada entrante
      SettingsModal.tsx         <- Configuracion SIP/Video/MQTT
      PrivadaSelector.tsx       <- Barra selector de privada
    types.ts                    <- Interfaces TypeScript
    constants.ts                <- Constantes y defaults
    utils/
      dtmf.ts                   <- Generador de tonos DTMF
      formatters.ts             <- Formateo de numeros, tiempo
      storage.ts                <- Helpers de localStorage
```

### 3.3 Funcionalidades Detalladas

#### 3.3.1 Sistema de Video Multi-Camara (NUEVO)

**Estado actual (produccion):** Solo muestra 1 camara, sin controles avanzados.

**Propuesta:** Incorporar el sistema completo de la referencia.

```typescript
// Hook: useCameraSystem.ts
interface CameraSystem {
  cameras: Camera[];
  currentCamera: number;
  cameraImage: string;
  gridView: boolean;
  gridImages: Record<string, string>;
  isPaused: boolean;
  fps: number;
  isLoading: boolean;
  hasError: boolean;

  selectCamera: (index: number) => void;
  toggleGrid: () => void;
  togglePause: () => void;
  captureSnapshot: () => Promise<void>;
  toggleFullscreen: () => void;
  loadPrivadaCameras: (videos: PrivadaVideo[]) => void;
}
```

**Caracteristicas:**
- Vista individual con indicador LIVE y FPS
- Vista grid 2x2 con todas las camaras
- Switching de camara con animacion de carga
- Pause/Resume del video
- Fullscreen nativo
- Auto-recovery cuando se pierden frames (5 errores consecutivos -> pausa 3s -> reintentar)
- Snapshot manual (descarga + guardado servidor)
- Auto-snapshot al contestar llamada (todas las camaras de la privada)

#### 3.3.2 Panel de Relays MQTT (NUEVO)

**Estado actual (produccion):** No existe.

**Propuesta:** Integrar control de relays creando `mqtt_relay.php` como backend y consumiendolo desde React.

```typescript
// Hook: useRelayController.ts
interface RelayController {
  relays: Relay[];
  activatingId: number | null;
  mqttConnected: boolean;

  loadRelays: (privadaId: number) => Promise<void>;
  activateRelay: (relay: Relay) => Promise<boolean>;
  checkHealth: () => Promise<boolean>;
}
```

**Flujo de activacion:**
1. Frontend llama al hook `activateRelay(relay)`
2. Hook hace POST a `mqtt_relay.php?action=activate`
3. El proxy PHP intenta via Bot Orquestador API
4. Si falla, usa fallback MQTT directo (raw TCP al broker Mosquitto)
5. Respuesta visual: icono cambia (candado -> reloj -> check/error)

**Prerequisito:** Crear `softphone/mqtt_relay.php` basandose en la documentacion del Bot Orquestador (`Manual_Tecnico_Control_Remoto_MQTT.md`).

#### 3.3.3 Historial de Llamadas (NUEVO)

```typescript
// Hook: useCallHistory.ts
interface CallHistoryEntry {
  id: number;
  type: 'incoming' | 'outgoing' | 'missed';
  number: string;
  contactName?: string;
  privadaName?: string;
  duration?: number;      // segundos
  timestamp: string;      // ISO date
  snapshotPath?: string;  // ruta del snapshot asociado
}

interface CallHistoryHook {
  history: CallHistoryEntry[];
  addEntry: (entry: Omit<CallHistoryEntry, 'id'>) => void;
  clearHistory: () => void;
  callFromHistory: (number: string) => void;
}
```

**Almacenamiento:** localStorage (max 100 entradas).

**Visualizacion:** Lista con iconos de tipo (entrante verde, saliente azul, perdida roja), hora, duracion, nombre de contacto/privada.

#### 3.3.4 Contactos (NUEVO)

```typescript
// Hook: useContactsManager.ts
interface Contact {
  id: number;
  name: string;
  number: string;
  type: 'normal' | 'vip';
}

interface ContactsHook {
  contacts: Contact[];
  addContact: (contact: Omit<Contact, 'id'>) => void;
  updateContact: (id: number, contact: Partial<Contact>) => void;
  deleteContact: (id: number) => void;
  searchContacts: (query: string) => Contact[];
  getContactByNumber: (number: string) => Contact | undefined;
}
```

#### 3.3.5 Controles de Audio Avanzados (MEJORA)

**Estado actual:** Solo toggle mute y toggle speaker.

**Propuesta:**

```typescript
// Hook: useAudioControls.ts
interface AudioControls {
  micVolume: number;        // 0-100
  speakerVolume: number;    // 0-100
  ringtoneVolume: number;   // 0-100
  isMuted: boolean;

  setMicVolume: (v: number) => void;
  setSpeakerVolume: (v: number) => void;
  setRingtoneVolume: (v: number) => void;
  toggleMute: () => void;
}
```

**UI:** Tres sliders con iconos (microfono, parlante, campana) + boton de mute.

#### 3.3.6 Selector de Privada Integrado (MEJORA)

**Estado actual:** page.tsx maneja la logica y pasa datos via callbacks.

**Propuesta:** Integrar el selector directamente en el panel del softphone.

```typescript
// Hook: usePrivadaSelector.ts
interface PrivadaSelector {
  privadas: PrivadaOption[];
  selectedId: number | null;
  isLoading: boolean;
  privadaInfo: string;

  selectPrivada: (id: number) => Promise<void>;
  lookupByCaller: (phone: string) => Promise<PrivadaLookupResult | null>;
  clearSelection: () => void;
}
```

**Flujo al recibir llamada:**
1. Llega llamada entrante con CallerID
2. `lookupByCaller` busca en la BD via `api_privada.php?action=lookup_caller`
3. Si encuentra: auto-selecciona la privada, carga sus camaras y relays
4. Video se abre automaticamente mostrando las camaras de esa privada
5. Panel de relays se abre mostrando los botones de apertura
6. **Simultaneamente:** callback `onIncomingCall` notifica a page.tsx para prellenar formulario

**Prerequisito:** Crear `softphone/api_privada.php` con acciones: `lookup_caller`, `list`, `videos`, `relays`.

### 3.4 Comunicacion con la Pagina de Registro de Accesos

La interfaz de callbacks se expande para cubrir los nuevos escenarios:

```typescript
interface AccesPhoneProps {
  // --- Callbacks existentes (se mantienen) ---
  onIncomingCall?: (callerNumber: string) => void;
  onCallAnswered?: () => void;
  onCallEnded?: () => void;

  // --- Callbacks nuevos ---
  onPrivadaIdentified?: (privada: {
    id: number;
    nombre: string;
    contacto: string;
    telefono: string;
  }) => void;

  onRelayActivated?: (relay: {
    id: number;
    alias: string;
    success: boolean;
  }) => void;

  onSnapshotCaptured?: (snapshot: {
    privadaId: number;
    camIndex: number;
    camName: string;
    path: string;
  }) => void;
}
```

Esto permite que `page.tsx` pueda:
- Auto-llenar datos de la privada cuando se identifica por CallerID
- Registrar en el log cuando se activa un relay
- Asociar snapshots al registro de acceso actual

### 3.5 Diseno de UI Propuesto

#### Panel Desplegable (mejorado)

```
+------------------------------------------+
| [AP] ACCESS PHONE PRO    [gear] [chevron]|
|  * Conectado              Ext 103        |
+------------------------------------------+
| PRIVADA: [-- Seleccionar --        v]    |
| * Estancia V - Identificada por CallerID |
+------------------------------------------+
| [Teclado] [Camaras] [Audio] [Relays]    |  <- 4 tabs con iconos
+==========================================+
|                                          |
|  (Contenido del tab activo aqui)         |
|                                          |
|  Tab Teclado: dialpad + display          |
|  Tab Camaras: video + grid + selector    |
|  Tab Audio: 3 sliders + mute            |
|  Tab Relays: botones de apertura         |
|                                          |
+------------------------------------------+
| [Historial]  [Contactos]                |  <- Links secundarios
+------------------------------------------+
```

#### Boton Flotante (mejorado)

```
Estados visuales:
  Desconectado  ->  Gris con punto rojo
  Conectado     ->  Verde con punto verde
  En llamada    ->  Azul con pulso
  Timbrando     ->  Rojo con bounce + badge de numero
  Relay activo  ->  Naranja momentaneo
```

---

## 4. BACKEND PHP: EXISTENTE Y POR CREAR

### 4.1 camera_proxy.php (EXISTENTE - Listo)

**Ubicacion:** `softphone/camera_proxy.php` (204 lineas)

- **Ya maneja:** Autenticacion Digest/Basic con Hikvision
- **Ya maneja:** Camaras estaticas (por canal) y dinamicas (por privada desde BD)
- **Ya maneja:** Snapshot guardado en servidor con bitacora JSON
- **Ya maneja:** SVG de error como fallback visual
- **URL actual en AccesPhone.tsx:** `/syscbctlmonitoreo/softphone/camera_proxy.php`

### 4.2 api_privada.php (POR CREAR)

**Acciones necesarias:**
- `action=lookup_caller&phone=XXXXXXXXXX` - Buscar privada por telefono/celular
- `action=list` - Lista de privadas activas
- `action=videos&privada_id=N` - Videos (video_1, video_2, video_3) de una privada
- `action=relays&privada_id=N` - Relays (dns_1, dns_2, dns_3) de una privada

**Base de datos:** Tabla `privadas` existente en `wwwvideo_video_accesos`.

### 4.3 mqtt_relay.php (POR CREAR)

**Referencia:** `documentacion bot orquestador/Manual_Tecnico_Control_Remoto_MQTT.md`

**Acciones necesarias:**
- `action=activate` (POST) - Activar relay via Bot Orquestador API, con fallback MQTT directo
- `action=status` (GET) - Estado de conectividad del bot/MQTT
- `action=health` (GET) - Health check

**Flujo de activacion:**
1. Login al Bot Orquestador para obtener session
2. POST al API del Bot Orquestador para ejecutar comando relay
3. Si falla: fallback MQTT directo (raw TCP a Mosquitto)
4. Logging de todas las activaciones

---

## 5. DEPENDENCIAS

### Actuales (se mantienen)

```json
{
  "jssip": "^3.13.5",
  "next": "16.1.6",
  "react": "19.2.3",
  "react-dom": "19.2.3"
}
```

### Nuevas requeridas

```
Ninguna.
```

Toda la funcionalidad propuesta se implementa con:
- React hooks nativos (useState, useEffect, useCallback, useRef)
- APIs nativas del navegador (fetch, Audio, AudioContext, WebSocket, fullscreen)
- JsSIP (ya instalado)
- Tailwind CSS (ya disponible en el proyecto Next.js)
- Lucide React icons (ya disponible en el proyecto)

---

## 6. PLAN DE IMPLEMENTACION POR FASES

### Fase 1: Refactorizacion Modular

**Esfuerzo:** Moderado
**Riesgo:** Bajo (misma funcionalidad, solo reorganizacion)

- Extraer hooks: `useSipConnection`, `useCallManager`, `useAudioControls`
- Extraer subcomponentes: `PhoneButton`, `PhonePanel`, `DialpadTab`
- Crear archivos de types y constants
- **Verificar:** Todo sigue funcionando identico

### Fase 2: Video Multi-Camara + Snapshots

**Esfuerzo:** Alto
**Riesgo:** Medio (nuevo UI, interaccion con proxy PHP)

- Implementar `useCameraSystem` hook
- Crear `CameraTab` con vista individual + grid 2x2
- Integrar con `camera_proxy.php` existente
- Auto-snapshot al contestar
- Callback `onSnapshotCaptured`

### Fase 3: Backend PHP (api_privada.php + mqtt_relay.php)

**Esfuerzo:** Medio
**Riesgo:** Medio (requiere acceso a BD y conectividad MQTT)

- Crear `softphone/api_privada.php` con CRUD de privadas
- Crear `softphone/mqtt_relay.php` basado en documentacion del Bot Orquestador
- Probar endpoints independientemente

### Fase 4: Relays MQTT (Frontend)

**Esfuerzo:** Medio
**Riesgo:** Medio (depende de Fase 3 + conectividad con Bot Orquestador)

- Implementar `useRelayController` hook
- Crear `RelayTab` con botones de activacion
- Integrar con `mqtt_relay.php`
- Callback `onRelayActivated`

### Fase 5: Privada Integrada + CallerID

**Esfuerzo:** Medio
**Riesgo:** Bajo (logica ya probada en referencia)

- Implementar `usePrivadaSelector` hook
- Crear `PrivadaSelector` componente (barra)
- Auto-lookup por CallerID al recibir llamada
- Integrar con `api_privada.php`
- Callback `onPrivadaIdentified`
- Cargar camaras y relays automaticamente

### Fase 6: Historial + Contactos

**Esfuerzo:** Bajo
**Riesgo:** Bajo (funcionalidad standalone)

- Implementar `useCallHistory` y `useContactsManager` hooks
- Crear `HistoryTab` y `ContactsTab`
- Almacenamiento en localStorage

### Fase 7: Controles de Audio Avanzados

**Esfuerzo:** Bajo
**Riesgo:** Bajo

- Mejorar `useAudioControls` con sliders
- Crear `AudioTab` con controles granulares

---

## 7. COMPARATIVA FINAL: ANTES vs DESPUES

| Funcionalidad | AccesPhone v2 (Actual) | AccesPhone Pro v3 (Propuesta) |
|--------------|----------------------|------------------------------|
| Conexion SIP | Si | Si (mejorada) |
| Reconexion automatica | Si | Si |
| Llamadas entrantes/salientes | Si | Si |
| DTMF en llamada | Si | Si |
| Mute/Speaker | Basico | Avanzado (3 sliders) |
| Video 1 camara | Si | Si |
| Video grid multi-camara | No | **Si** |
| Video pause/fullscreen | No | **Si** |
| Snapshot descarga | Parcial | **Completo** |
| Snapshot guardado servidor | No | **Si** |
| Auto-snapshot al contestar | Parcial | **Completo** |
| Selector de privada | No (via page.tsx) | **Integrado** |
| Auto-lookup CallerID | Via page.tsx | **Integrado + page.tsx** |
| Relays MQTT | No | **Si** |
| Historial de llamadas | No | **Si** |
| Contactos | No | **Si** |
| Atajos de teclado | No | **Si** |
| Toast notifications | No | **Si** |
| Tabs organizados | No (todo en 1 vista) | **Si (4 tabs)** |
| Codigo modular | No (monolitico) | **Si (hooks + components)** |
| TypeScript tipado | Si | Si (mejorado) |
| Callbacks a page.tsx | 3 | **6** |

---

## 8. RIESGOS Y MITIGACION

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|------------|
| Proxy PHP no accesible desde Next.js | Baja | Alto | Las URLs ya estan configuradas y funcionan para camera_proxy.php |
| Bot Orquestador caido para relays | Media | Medio | Fallback MQTT directo en mqtt_relay.php |
| mqtt_relay.php y api_privada.php no existen | Alta | Alto | **Deben crearse antes de Fases 4-5** |
| Performance con grid multi-camara | Media | Medio | Grid usa refresh rate 2x mas lento |
| Rotura de integracion con page.tsx | Baja | Alto | Callbacks existentes se mantienen sin cambios |
| Credenciales SIP en localStorage | Alta | Medio | Considerar encriptacion en fase futura |
| Credenciales Hikvision hardcoded en PHP | Media | Medio | Mover a archivo de configuracion externo |
| CORS wildcard en camera_proxy.php | Media | Bajo | Restringir a dominios conocidos |

---

## 9. NOTAS DEL ANALISIS DE CODEBASE

### Hallazgos durante la verificacion:

1. **softphone/index.html** tiene 758 lineas (version actual), mientras que **index.html.backup** tiene 2,289 lineas (version mas completa con todas las funcionalidades). La version backup es la referencia principal para las funcionalidades avanzadas.

2. **mqtt_relay.php** y **api_privada.php** no existen en el codebase. Son componentes que deben ser **creados** como parte de esta propuesta (Fase 3). La documentacion del Bot Orquestador (`Manual_Tecnico_Control_Remoto_MQTT.md`, 45.9 KB) proporciona las especificaciones necesarias.

3. **AccesPhoneInline.tsx** (937 lineas) es una variante del softphone usado en la pagina de Monitoristas. Cualquier refactorizacion debe considerar esta variante para evitar duplicacion de codigo.

4. **Seguridad:** El analisis previo (`ANALISIS_SISTEMA_CONTROL_ACCESO.md`) identifico problemas criticos de seguridad (credenciales en localStorage, hash DES debil, CORS wildcard). Estas mejoras de seguridad deberian considerarse como una fase adicional.

---

## 10. CONCLUSION

La propuesta combina:

- **La solidez arquitectonica** del AccesPhone.tsx actual (React, TypeScript, hooks, SSR-safe, reconexion)
- **La riqueza funcional** del softphone de referencia (video multi-cam, contactos, historial)
- **Una mejora estructural** que divide el componente monolitico en modulos mantenibles
- **Backend nuevo** para relays MQTT y API de privadas (mqtt_relay.php, api_privada.php)

El backend de camaras (camera_proxy.php) ya esta listo y probado. Se requiere crear 2 archivos PHP adicionales. No se requieren dependencias nuevas de npm. La implementacion puede hacerse en 7 fases sin romper la funcionalidad actual en ningun momento.

---

*Este documento es una propuesta para evaluacion. La implementacion requiere aprobacion y puede ajustarse segun prioridades del negocio.*
