# Manual Tecnico - Sistema de Control de Acceso y Videomonitoreo (Video Accesos)

**Version:** 3.0
**Fecha:** Marzo 2026
**Nombre del proyecto:** syscbctlmonitoreo / Video Accesos
**Repositorio:** videoaccesos/syscbctlmonitoreo

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura General](#2-arquitectura-general)
3. [Stack Tecnologico](#3-stack-tecnologico)
4. [Estructura del Proyecto](#4-estructura-del-proyecto)
5. [Base de Datos (Prisma/MySQL)](#5-base-de-datos-prismamysql)
6. [Sistema de Autenticacion y Seguridad](#6-sistema-de-autenticacion-y-seguridad)
7. [Modulos Funcionales](#7-modulos-funcionales)
8. [API REST - Endpoints Completos](#8-api-rest---endpoints-completos)
9. [Componente AccesPhone (Softphone VoIP/SIP)](#9-componente-accesphone-softphone-voipsip)
10. [Componente CameraGrid (Videomonitoreo)](#10-componente-cameragrid-videomonitoreo)
11. [Camera Proxy (API Backend)](#11-camera-proxy-api-backend)
12. [Flujo Operativo Principal](#12-flujo-operativo-principal)
13. [Configuracion y Variables de Entorno](#13-configuracion-y-variables-de-entorno)
14. [Scripts de Base de Datos](#14-scripts-de-base-de-datos)
15. [Sistema Legacy (v1 - PHP/CodeIgniter)](#15-sistema-legacy-v1---phpcodeigniter)
16. [Diagrama de Arquitectura](#16-diagrama-de-arquitectura)
17. [Glosario](#17-glosario)

---

## 1. Resumen Ejecutivo

**Video Accesos** es un sistema integral de control de acceso y videomonitoreo para administrar comunidades residenciales privadas (fraccionamientos cerrados). Permite a operadores de caseta gestionar el ingreso de visitantes, residentes y proveedores mediante:

- **Registro de accesos** con identificacion de solicitante (autocomplete con busqueda en residentes, visitantes y registros generales)
- **Comunicacion VoIP/SIP** (softphone integrado con JsSIP) para contactar residentes via interfon
- **Videomonitoreo en tiempo real** de camaras IP en accesos (proxy con autenticacion Digest hacia DVRs)
- **Gestion de tarjetas RFID** para acceso vehicular y peatonal (5 slots por residente)
- **Reportes y graficas** de actividad operativa (Recharts)
- **Supervision de calidad** de llamadas de operadores
- **Ordenes de servicio** para mantenimiento de equipos
- **Control de gastos** operativos por privada
- **Recuperacion patrimonial** con seguimiento de casos

El proyecto inicio en enero 2013 como aplicacion PHP/CodeIgniter (v1) y fue migrado en 2025-2026 a **Next.js 16, React 19, Prisma ORM y TailwindCSS 4** (v2), conservando la misma base de datos MySQL de produccion.

---

## 2. Arquitectura General

### Componentes del Sistema

```
[Navegador Web]
    |
    |--- Next.js 16 App (React 19 + TailwindCSS 4)
    |       |
    |       |--- NextAuth (JWT, sesiones 2h)
    |       |--- Prisma ORM --> MySQL (wwwvideo_video_accesos)
    |       |--- API Routes (REST)
    |       |--- AccesPhone (JsSIP) --> Asterisk PBX (WebSocket SIP)
    |       |--- CameraGrid --> Camera Proxy API --> DVRs (HTTP Digest Auth)
    |
[Asterisk PBX]
    |--- WebSocket (wss://accessbotpbx.info:8089/ws)
    |--- Extensiones SIP
    |
[DVRs / Camaras IP]
    |--- HTTP con autenticacion Digest
    |--- Snapshots JPEG por canal
```

### Flujo de Datos

1. **Operador** inicia sesion via NextAuth (credenciales legacy DES crypt)
2. **Dashboard** muestra estadisticas del dia (accesos, rechazos, privadas activas)
3. **Llamada entrante** → AccesPhone detecta via JsSIP → busca caller ID en BD → auto-puebla formulario
4. **Camaras** se cargan via proxy que autentica contra DVRs con HTTP Digest
5. **Registro de acceso** se guarda en BD con referencia a solicitante, residencia, operador y duracion

---

## 3. Stack Tecnologico

### Frontend
| Tecnologia | Version | Uso |
|---|---|---|
| Next.js | 16.1.6 | Framework fullstack (App Router) |
| React | 19.2.3 | UI components |
| TailwindCSS | 4.x | Estilos utilitarios |
| Lucide React | 0.575.0 | Iconografia |
| JsSIP | 3.13.5 | Cliente SIP/VoIP WebRTC |
| Recharts | 3.7.0 | Graficas y reportes |
| React Hook Form | 7.71.2 | Manejo de formularios |
| Zod | 4.3.6 | Validacion de schemas |
| @tanstack/react-table | 8.21.3 | Tablas de datos |

### Backend
| Tecnologia | Version | Uso |
|---|---|---|
| Prisma ORM | 5.22.0 | Acceso a base de datos |
| NextAuth | 4.24.13 | Autenticacion (JWT, 2h) |
| MySQL | 5.7+ | Base de datos produccion |
| ExcelJS | 4.4.0 | Exportacion a Excel |
| Nodemailer | 7.0.13 | Envio de correos |
| unix-crypt-td-js | 1.1.4 | Hash de passwords legacy (PHP DES) |

### Infraestructura
| Componente | Detalle |
|---|---|
| PBX | Asterisk via WebSocket (wss://accessbotpbx.info:8089/ws) |
| DVRs | Camaras IP con HTTP Digest Auth |
| Base de datos | MySQL `wwwvideo_video_accesos` |
| Logging | Archivo `/tmp/video-accesos.log` (rotacion 10MB) |

---

## 4. Estructura del Proyecto

```
syscbctlmonitoreo/
├── MANUAL_TECNICO.md                    # Este manual
├── documentacion bot orquestador/
│   └── Manual_Tecnico_Control_Remoto_MQTT.md
│
└── video-accesos-app/                   # Aplicacion Next.js principal
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── middleware.ts                     # Proteccion de rutas (NextAuth)
    │
    ├── prisma/
    │   ├── schema.prisma                # 734 lineas, 45+ modelos
    │   └── seed.ts                      # Verificacion de conexion
    │
    ├── public/
    │   └── sounds/                      # Archivos de audio (ringtones legacy)
    │
    └── src/
        ├── app/
        │   ├── layout.tsx               # Root layout
        │   ├── globals.css              # Estilos globales
        │   │
        │   ├── (auth)/
        │   │   ├── layout.tsx
        │   │   └── login/page.tsx       # Pagina de login
        │   │
        │   ├── (dashboard)/
        │   │   ├── layout.tsx           # Layout con sidebar + header
        │   │   ├── page.tsx             # Dashboard principal
        │   │   │
        │   │   ├── catalogos/
        │   │   │   ├── empleados/page.tsx
        │   │   │   ├── fallas/page.tsx
        │   │   │   ├── materiales/page.tsx
        │   │   │   ├── privadas/page.tsx
        │   │   │   ├── puestos/page.tsx
        │   │   │   ├── residencias/page.tsx
        │   │   │   ├── tarjetas/page.tsx
        │   │   │   └── turnos/page.tsx
        │   │   │
        │   │   ├── procesos/
        │   │   │   ├── asignacion-tarjetas/page.tsx
        │   │   │   ├── gastos/page.tsx
        │   │   │   ├── monitoristas/page.tsx      # Consola de monitoreo
        │   │   │   ├── ordenes-servicio/page.tsx
        │   │   │   ├── registro-accesos/page.tsx  # Modulo principal
        │   │   │   └── supervision-llamadas/page.tsx
        │   │   │
        │   │   ├── reportes/
        │   │   │   ├── accesos-consultas/page.tsx
        │   │   │   ├── accesos-graficas/page.tsx
        │   │   │   └── supervision-llamadas/page.tsx
        │   │   │
        │   │   └── seguridad/
        │   │       ├── grupos-usuarios/page.tsx
        │   │       ├── permisos/page.tsx
        │   │       └── usuarios/page.tsx
        │   │
        │   └── api/
        │       ├── auth/[...nextauth]/route.ts
        │       ├── dashboard/route.ts
        │       ├── camera-proxy/
        │       │   ├── route.ts          # Proxy principal de camaras
        │       │   ├── diag/route.ts     # Diagnosticos de camara
        │       │   └── lookup/route.ts   # Busqueda de camaras por telefono/privada
        │       ├── catalogos/            # CRUD para cada catalogo
        │       │   ├── empleados/[route.ts, [id]/route.ts]
        │       │   ├── fallas/[route.ts, [id]/route.ts]
        │       │   ├── materiales/[route.ts, [id]/route.ts]
        │       │   ├── privadas/[route.ts, [id]/route.ts]
        │       │   ├── puestos/[route.ts, [id]/route.ts]
        │       │   ├── residencias/[route.ts, [id]/route.ts]
        │       │   ├── residentes/[route.ts, [id]/route.ts]
        │       │   ├── tarjetas/[route.ts, [id]/route.ts]
        │       │   └── turnos/[route.ts, [id]/route.ts]
        │       ├── procesos/
        │       │   ├── asignacion-tarjetas/[route.ts, [id]/route.ts]
        │       │   ├── gastos/[route.ts, [id]/route.ts]
        │       │   ├── ordenes-servicio/[route.ts, [id]/route.ts]
        │       │   ├── registro-accesos/
        │       │   │   ├── route.ts                    # CRUD principal
        │       │   │   ├── [id]/route.ts
        │       │   │   ├── buscar-por-telefono/route.ts
        │       │   │   ├── buscar-residencia/route.ts
        │       │   │   ├── buscar-solicitante/route.ts # Autocomplete
        │       │   │   ├── registrar-general/route.ts
        │       │   │   ├── registrar-visitante/route.ts
        │       │   │   └── resolver-nombre/route.ts
        │       │   └── supervision-llamadas/route.ts
        │       ├── reportes/
        │       │   ├── accesos-consultas/route.ts
        │       │   ├── accesos-graficas/route.ts
        │       │   └── supervision-llamadas/route.ts
        │       └── seguridad/
        │           ├── grupos-usuarios/[route.ts, [id]/route.ts]
        │           ├── mis-permisos/route.ts
        │           ├── permisos/route.ts
        │           ├── sync-procesos/route.ts
        │           └── usuarios/[route.ts, [id]/route.ts]
        │
        ├── components/
        │   ├── AccesPhone.tsx           # Softphone VoIP/SIP (~1600 lineas)
        │   ├── CameraGrid.tsx           # Grid de camaras (~524 lineas)
        │   └── layout/
        │       ├── header.tsx           # Barra superior
        │       ├── sidebar.tsx          # Menu lateral con permisos
        │       └── providers.tsx        # SessionProvider wrapper
        │
        ├── lib/
        │   ├── auth.ts                  # Configuracion NextAuth
        │   ├── prisma.ts               # Cliente Prisma singleton
        │   └── logger.ts               # Logger con archivo y rotacion
        │
        └── types/
            └── next-auth.d.ts           # Tipos extendidos de sesion
```

---

## 5. Base de Datos (Prisma/MySQL)

### Conexion
- **Motor:** MySQL 5.7+
- **Base de datos:** `wwwvideo_video_accesos`
- **ORM:** Prisma 5.22.0 con `relationMode = "prisma"` (sin foreign keys en BD)
- **Modo:** Solo lectura de esquema (`db pull`), sin migraciones contra produccion

### Modelos Principales (45+ tablas)

#### Seguridad
| Modelo | Tabla | Descripcion |
|---|---|---|
| `Usuario` | `usuarios` | Usuarios del sistema con password DES crypt |
| `GrupoUsuario` | `grupos_usuarios` | Grupos/roles de usuario |
| `GrupoUsuarioDetalle` | `grupos_usuarios_detalle` | Membresia usuario-grupo |
| `Proceso` | `procesos` | Procesos del menu (jerarquico, padre-hijo) |
| `Subproceso` | `subprocesos` | Subprocesos para permisos granulares |
| `PermisoAcceso` | `permisos_accesos` | Control de acceso rol+subproceso |
| `BitacoraInicio` | `bitacora_inicio` | Auditoria de logins |

#### Catalogos
| Modelo | Tabla | Descripcion |
|---|---|---|
| `Empleado` | `empleados` | Empleados con puesto, contacto, permisos |
| `Puesto` | `puestos` | Puestos de trabajo |
| `Turno` | `turnos` | Turnos laborales (hora inicio/fin) |
| `Privada` | `privadas` | Privadas/fraccionamientos con DNS, video, relays |
| `PrivadaRelay` | `privadas_relays` | Configuracion de relays por privada |
| `Residencia` | `residencias` | Casas/departamentos (#casa, calle, telefonos, estatus) |
| `Residente` | `residentes` | Residentes (ID char(8)) |
| `Visita` | `visitas` | Visitantes registrados (ID char(8)) |
| `RegistroGeneral` | `registros_generales` | Personas generales no categorizadas |
| `Falla` | `fallas` | Codigos de falla |
| `Material` | `materiales` | Inventario de materiales |
| `Tarjeta` | `tarjetas` | Tarjetas RFID |

#### Procesos de Negocio
| Modelo | Tabla | Descripcion |
|---|---|---|
| `RegistroAcceso` | `registros_accesos` | Registro principal de accesos (entrada/salida) |
| `SupervisionLlamada` | `supervision_llamadas` | Calificacion de llamadas |
| `ResidenteTarjeta` | `residentes_tarjetas` | Asignacion de tarjetas (5 slots, precio, seguro) |
| `OrdenServicio` | `ordenes_servicio` | Ordenes de trabajo tecnico |
| `OrdenServicioSeguimiento` | `ordenes_servicio_seguimientos` | Seguimiento de ordenes |
| `Gasto` | `gastos` | Gastos operativos por privada |
| `RecuperacionPatrimonial` | `recuperacion_patrimonial` | Seguimiento de incidentes |

### Campos Clave de Privada (Configuracion de Video)
```
privada {
  dns_1, dns_2, dns_3          // Hostnames de DVRs
  puerto_1, puerto_2, puerto_3 // Puertos HTTP
  contrasena_1, contrasena_2, contrasena_3  // "usuario:password"
  video_1 ... video_16         // Paths o URLs completas de snapshot por canal
}
```

### Campos Clave de Residencia
```
residencia {
  nroCasa                      // Numero de casa
  calle                        // Calle
  telefono1, telefono2         // Telefonos del residente
  interfon                     // Extension del interfon
  telefonoInterfon             // Telefono del interfon
  estatusId                    // 1=Activo, 2=Inactivo, 3=Moroso
}
```

---

## 6. Sistema de Autenticacion y Seguridad

### Autenticacion (NextAuth)
- **Estrategia:** JWT con sesiones de 2 horas
- **Provider:** Credentials (usuario + contrasena)
- **Hash de password:** Legacy PHP DES crypt: `substr(crypt($pass, 0), 0, 10)`
- **Middleware:** Protege todas las rutas excepto `/login`, `/api/auth`, `/_next/*`, `/favicon.ico`

### Sesion del Usuario (JWT extendido)
```typescript
session.user = {
  id, name, email,
  usuarioId,        // ID del usuario en tabla usuarios
  empleadoId,       // ID del empleado vinculado
  puestoId,         // Puesto del empleado
  nroOperador,      // Numero de operador
  modificarFechas,  // Permiso especial
  privadaId,        // Privada asignada (si aplica)
  isAdmin           // Flag de administrador
}
```

### Sistema de Permisos
1. **Procesos** (menu principal) → **Subprocesos** (acciones dentro del menu)
2. **GrupoUsuario** agrupa usuarios
3. **PermisoAcceso** vincula grupo + subproceso con permisos (alta, baja, cambio, consulta, reporte)
4. **Sidebar** filtra menu segun permisos del usuario via `/api/seguridad/mis-permisos`
5. **Admins** ven todo el menu sin restriccion

### Auditoria
- Cada login se registra en `BitacoraInicio` con fecha, hora, IP, navegador

---

## 7. Modulos Funcionales

### 7.1 Dashboard Principal (`/`)
- 4 tarjetas resumen: Accesos Hoy, Privadas Activas, Residencias, Desglose (accesos/rechazos/informes)
- Tabla de ultimos accesos del dia con paginacion
- Auto-refresh cada 30 segundos
- Layout responsivo (1/2/4 columnas)

### 7.2 Registro de Accesos (`/procesos/registro-accesos`)
**Modulo principal del sistema.** Permite registrar entradas/salidas de personas.

**Formulario:**
- **Privada:** Selector dropdown de privadas activas
- **Residencia:** Busqueda autocomplete por #casa o calle (Enter para buscar). Muestra residentes y visitantes de la residencia en tabs.
- **Tipo de Gestion:** 9 opciones (No concluida, Moroso, Proveedor, Residente, Tecnico, Trab. Obra, Trab. Servicio, Visita, Visita Morosos)
- **Solicitante:** Autocomplete con debounce 300ms. Busca en visitantes (V) y registros generales (G). Boton `+` para registrar nueva persona con modal prellenado. Todo en MAYUSCULAS.
- **Observaciones:** Campo de texto libre
- **Timer:** Cronometro que inicia automaticamente

**Acciones de guardado:**
- **Acceso** (estatusId=1) - Acceso concedido
- **Informo** (estatusId=3) - Solo informacion
- **Rechazo** (estatusId=2) - Acceso denegado

**Integracion con llamadas:**
- Al recibir llamada entrante, busca el telefono en BD
- Si encuentra residencia → auto-puebla privada + residencia + inicia timer
- Si encuentra privada → auto-selecciona privada

**Historial:** Tabla paginada (20/pag) filtrable por privada y rango de fechas.

### 7.3 Consola de Monitoristas (`/procesos/monitoristas`)
Panel de monitoreo en tiempo real que integra:
- Panel de llamadas entrantes con identificacion de caller
- Lista de residencias de la privada seleccionada con telefonos y estatus
- Grid de camaras en vivo (componente CameraGrid)
- Softphone integrado (componente AccesPhone)
- Historial de registros del dia

### 7.4 Catalogos (`/catalogos/*`)
CRUD completo para cada catalogo:
- **Privadas:** Fraccionamientos con configuracion de DNS, video (16 canales), relays
- **Residencias:** Casas con telefonos, interfon, estatus (Activo/Inactivo/Moroso)
- **Empleados:** Personal con puesto, contacto, permisos especiales
- **Tarjetas:** Tarjetas RFID con numero y estatus
- **Puestos, Turnos, Fallas, Materiales:** Catalogos auxiliares

### 7.5 Asignacion de Tarjetas (`/procesos/asignacion-tarjetas`)
- 5 slots de tarjeta por residente
- Precio y seguro por tarjeta
- Historico de asignaciones y no-renovaciones

### 7.6 Ordenes de Servicio (`/procesos/ordenes-servicio`)
- Registro de trabajos tecnicos con diagnostico
- Seguimiento con actualizaciones
- Codigos de servicio y diagnostico

### 7.7 Gastos (`/procesos/gastos`)
- Registro de gastos por privada
- Seguimiento de pagos
- Tipos de gasto configurables

### 7.8 Supervision de Llamadas (`/procesos/supervision-llamadas`)
- Calificacion de llamadas de operadores
- Metricas de calidad

### 7.9 Reportes (`/reportes/*`)
- **Accesos Consultas:** Busqueda avanzada de registros de acceso
- **Accesos Graficas:** Graficas con Recharts (barras, lineas, pie)
- **Supervision Llamadas:** Reporte de calificaciones

### 7.10 Seguridad (`/seguridad/*`)
- **Usuarios:** CRUD de usuarios del sistema
- **Grupos de Usuario:** Roles/grupos
- **Permisos de Acceso:** Asignacion de permisos grupo-subproceso

---

## 8. API REST - Endpoints Completos

### Autenticacion
| Metodo | Endpoint | Descripcion |
|---|---|---|
| POST | `/api/auth/[...nextauth]` | Login/logout/session via NextAuth |

### Dashboard
| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/dashboard` | Estadisticas del dia (accesos, privadas, residencias) |

### Camera Proxy
| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/camera-proxy?cam=N&telefono=X` | Snapshot JPEG de camara via proxy |
| GET | `/api/camera-proxy?cam=N&privada_id=X` | Snapshot por ID de privada |
| GET | `/api/camera-proxy/lookup?telefono=X` | Lista camaras disponibles |
| GET | `/api/camera-proxy/lookup?privada_id=X` | Lista camaras por privada |
| GET | `/api/camera-proxy/diag` | Diagnosticos del proxy |

### Catalogos (patron repetido para cada uno)
| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/catalogos/{recurso}` | Listar con filtros |
| POST | `/api/catalogos/{recurso}` | Crear registro |
| GET | `/api/catalogos/{recurso}/[id]` | Obtener por ID |
| PUT | `/api/catalogos/{recurso}/[id]` | Actualizar |
| DELETE | `/api/catalogos/{recurso}/[id]` | Eliminar (soft delete) |

Recursos: `empleados`, `fallas`, `materiales`, `privadas`, `puestos`, `residencias`, `residentes`, `tarjetas`, `turnos`

### Registro de Accesos
| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/procesos/registro-accesos` | Listar registros con filtros |
| POST | `/api/procesos/registro-accesos` | Crear registro de acceso |
| GET | `/api/procesos/registro-accesos/[id]` | Detalle de registro |
| GET | `/api/procesos/registro-accesos/buscar-por-telefono?telefono=X` | Buscar residencia/privada por telefono |
| GET | `/api/procesos/registro-accesos/buscar-residencia?privadaId=X&q=Y` | Autocomplete de residencias |
| GET | `/api/procesos/registro-accesos/buscar-solicitante?q=X` | Autocomplete de solicitantes (V/G) |
| POST | `/api/procesos/registro-accesos/registrar-visitante` | Registrar nuevo visitante |
| POST | `/api/procesos/registro-accesos/registrar-general` | Registrar persona general |
| GET | `/api/procesos/registro-accesos/resolver-nombre?ids=X,Y,Z` | Resolver nombres por IDs |

### Otros Procesos
| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET/POST | `/api/procesos/asignacion-tarjetas` | Asignacion de tarjetas RFID |
| GET/POST | `/api/procesos/gastos` | Gastos operativos |
| GET/POST | `/api/procesos/ordenes-servicio` | Ordenes de servicio |
| GET/POST | `/api/procesos/supervision-llamadas` | Supervision de calidad |

### Reportes
| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/reportes/accesos-consultas` | Consulta avanzada de accesos |
| GET | `/api/reportes/accesos-graficas` | Datos para graficas |
| GET | `/api/reportes/supervision-llamadas` | Reporte de supervision |

### Seguridad
| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET/POST | `/api/seguridad/usuarios` | CRUD usuarios |
| GET/POST | `/api/seguridad/grupos-usuarios` | CRUD grupos |
| GET/PUT | `/api/seguridad/permisos` | Gestion de permisos |
| GET | `/api/seguridad/mis-permisos` | Permisos del usuario actual |
| POST | `/api/seguridad/sync-procesos` | Sincronizar procesos del menu |

---

## 9. Componente AccesPhone (Softphone VoIP/SIP)

**Archivo:** `src/components/AccesPhone.tsx` (~1600 lineas)
**Libreria:** JsSIP 3.13.5

### Configuracion (almacenada en localStorage)
```typescript
interface AccesPhoneConfig {
  wsServer: string;      // WebSocket del PBX (wss://accessbotpbx.info:8089/ws)
  extension: string;     // Extension SIP
  sipPassword: string;   // Password SIP
  sipDomain: string;     // Dominio SIP (accessbotpbx.info)
  displayName: string;   // Nombre mostrado
  micDeviceId: string;   // Microfono seleccionado ("" = default)
  autoAnswer: boolean;   // Auto-contestar llamadas entrantes
  cameraProxyUrl: string;  // URL del proxy de camaras
  cameraRefreshMs: number; // Intervalo de refresh de camaras (ms)
  videoAutoOnCall: boolean; // Mostrar video al recibir llamada
}
```

### Funcionalidades
- **Conexion SIP:** Auto-reconexion con backoff exponencial (2s base, 30s max, reintentos ilimitados)
- **Llamadas entrantes:** Deteccion, caller ID lookup en BD, indicador de ringing con animacion
- **Llamadas salientes:** Teclado numerico, marcacion directa
- **DND (No Molestar):** Rechaza llamadas con 486 Busy Here
- **Auto-contestar:** Contesta automaticamente llamadas entrantes
- **Audio:**
  - Mute/unmute microfono
  - Speaker on/off
  - Seleccion de microfono en configuracion
  - Fallback a stream silencioso si no hay microfono (modo solo-escucha)
- **DTMF:** Envio de tonos durante llamada
- **Timer:** Duracion de llamada en formato MM:SS
- **Tono de timbre:** Usa el ringback tone nativo de Asterisk (sin ringtones custom)

### Compatibilidad SDP con Asterisk
El componente incluye parches de SDP para compatibilidad con Asterisk/FreePBX:
- Inyeccion de credenciales ICE faltantes
- Limpieza de codecs no soportados (opus, red, CN) en llamadas salientes
- Conversion SAVPF → SAVP
- Remocion de extensiones no soportadas

### Diagnosticos
- `window.__sipDiag()` — Log completo de eventos SIP con timestamps
- `window.__sipDiagSummary()` — Resumen de diagnosticos

### UI
- Widget flotante en esquina inferior derecha
- Panel expandible/colapsable
- Indicadores de estado: Desconectado (rojo), Conectando (amarillo), Registrado (verde)
- Info de llamada con label de caller (privada/residencia)

---

## 10. Componente CameraGrid (Videomonitoreo)

**Archivo:** `src/components/CameraGrid.tsx` (~524 lineas)

### Funcionamiento
1. **Lookup:** Consulta `/api/camera-proxy/lookup` con `telefono` o `privada_id`
2. **Renderizado:** Grid de thumbnails con imagenes JPEG de cada camara
3. **Refresh secuencial:** Espera `onload`/`onerror` antes de pedir siguiente snapshot (evita saturar el DVR)
4. **Intervalo:** Default 300ms, configurable via prop `refreshMs`

### Manejo de Errores
- Backoff progresivo: 3x delay en errores consecutivos
- Pausa automatica a los 10+ errores consecutivos
- Log de diagnosticos

### Modo Fullscreen
- Portal overlay con camara ampliada
- Navegacion prev/next entre camaras
- Sincronizacion de src desde thumbnail

### Props
```typescript
{
  telefono?: string;      // Buscar camaras por telefono
  privadaId?: string;     // Buscar camaras por ID de privada
  refreshMs?: number;     // Intervalo de refresh (default 300)
  compact?: boolean;      // Modo compacto para sidebar
}
```

### Diagnosticos
- `window.__camDiag()` — Estado actual de camaras
- `window.__camDiagStats()` — Estadisticas de carga

---

## 11. Camera Proxy (API Backend)

**Archivo:** `src/app/api/camera-proxy/route.ts`

### Flujo de Proxy
1. **Autenticacion:** Verifica sesion NextAuth
2. **Resolucion de camara:**
   - Por `privada_id`: Query directo a tabla `privadas`
   - Por `telefono`: Busca en privada (telefono/celular) → residencia (interfon/telefono)
3. **Construccion de URL:** Combina `video_N` + `dns_N` + `puerto_N` de la privada
4. **Descubrimiento de credenciales:** Busca hostname en dns_1/2/3, parsea `contrasena_N` como "usuario:password"

### Autenticacion HTTP Digest
- **Cache de nonce:** Reutiliza challenge Digest por 60s (evita doble request por snapshot)
- **Fallback:** Basic Auth si el servidor no usa Digest
- **Flujo:**
  1. Request sin auth → 401 con WWW-Authenticate
  2. Parsea challenge, calcula response MD5, envia request autenticado

### Control de Concurrencia
- **Semaforo por host:** MAX_CONCURRENT_PER_HOST = 2
- Previene agotamiento de conexiones del DVR
- Cola de requests excedentes

### Respuesta
- **Exito:** 200 con imagen JPEG y headers no-cache
- **Error:** 200 con placeholder SVG (evita loops de recarga del browser)
- Headers: `X-Camera-Index`, `X-Privada`

---

## 12. Flujo Operativo Principal

### Flujo de Registro de Acceso (caso tipico)

```
1. Llamada entrante al interfon
   └─> Asterisk PBX envia INVITE via WebSocket
       └─> AccesPhone detecta llamada entrante
           └─> Busca caller ID: /api/registro-accesos/buscar-por-telefono
               ├─> Match residencia: auto-puebla privada + residencia
               ├─> Match privada: auto-selecciona privada
               └─> Sin match: muestra solo numero

2. Operador contesta la llamada
   └─> Timer inicia automaticamente
   └─> Camaras de la privada se cargan (CameraGrid)

3. Operador identifica al visitante
   └─> Busca solicitante por nombre (autocomplete)
       ├─> Selecciona existente del dropdown
       └─> O registra nuevo via boton + (modal prellenado)

4. Operador selecciona tipo de gestion
   └─> Ej: "Visita", "Proveedor", "Residente"

5. Operador registra el acceso
   └─> Boton "Acceso" / "Informo" / "Rechazo"
       └─> POST /api/procesos/registro-accesos
           └─> Guarda: solicitanteId, residenciaId, empleadoId, duracion, estatus

6. Formulario se reinicia para siguiente registro
```

---

## 13. Configuracion y Variables de Entorno

### Variables Requeridas
```env
DATABASE_URL="mysql://usuario:password@host:3306/wwwvideo_video_accesos"
NEXTAUTH_SECRET="clave-secreta-para-jwt"
NEXTAUTH_URL="http://localhost:3000"
LOG_FILE="/tmp/video-accesos.log"
```

### Scripts Disponibles
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de produccion
npm run start        # Servidor de produccion
npm run lint         # Linter ESLint

npm run db:pull      # Sincronizar schema desde BD
npm run db:generate  # Generar cliente Prisma
npm run db:studio    # Abrir Prisma Studio
npm run db:seed      # Verificar conexion a BD
npm run db:verify    # Verificar conexion a BD
```

### Configuracion Next.js
```typescript
// next.config.ts
{
  outputFileTracingRoot: path.join(__dirname)
}
```

---

## 14. Scripts de Base de Datos

### Prisma Schema
- **Ubicacion:** `prisma/schema.prisma` (734 lineas)
- **Modo:** `relationMode = "prisma"` (relaciones manejadas por Prisma, no por BD)
- **Sincronizacion:** `npx prisma db pull` para leer esquema de produccion
- **IMPORTANTE:** No se ejecutan migraciones contra produccion. Solo `db pull` para mantener schema sincronizado.

### Seed Script
- **Ubicacion:** `prisma/seed.ts`
- Solo verifica conexion y muestra conteo de registros por tabla
- No inserta datos

---

## 15. Sistema Legacy (v1 - PHP/CodeIgniter)

El sistema v1 coexiste con v2 compartiendo la misma base de datos:

- **Framework:** CodeIgniter 3.x
- **Lenguaje:** PHP 7.x
- **Password hash:** DES crypt `substr(crypt($pass, 0), 0, 10)`
- **Ubicacion:** Carpeta raiz del repositorio (archivos PHP)
- **Estado:** En uso parcial, siendo reemplazado por v2

La compatibilidad de passwords se mantiene via la libreria `unix-crypt-td-js` en el sistema v2.

---

## 16. Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    NAVEGADOR WEB                        │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Dashboard   │  │  Registro    │  │  Monitorista │  │
│  │              │  │  Accesos     │  │  Console     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │  AccesPhone  │  │  CameraGrid  │                    │
│  │  (JsSIP)     │  │  (Proxy)     │                    │
│  └──────┬───────┘  └──────┬───────┘                    │
│         │                  │                            │
└─────────┼──────────────────┼────────────────────────────┘
          │ WebSocket        │ HTTP
          │ SIP              │ JPEG snapshots
          ▼                  ▼
┌──────────────┐    ┌──────────────────┐
│  Asterisk    │    │  Next.js API     │
│  PBX         │    │  Routes          │
│              │    │                  │
│  Extensions: │    │  ┌────────────┐  │    ┌──────────┐
│  100-199     │    │  │ Camera     │──┼───>│ DVR 1    │
│              │    │  │ Proxy      │  │    │ (Digest) │
│  WebSocket:  │    │  └────────────┘  │    └──────────┘
│  :8089/ws    │    │                  │    ┌──────────┐
└──────────────┘    │  ┌────────────┐  │    │ DVR 2    │
                    │  │ Prisma     │──┼───>│ (Digest) │
                    │  │ ORM        │  │    └──────────┘
                    │  └─────┬──────┘  │
                    │        │         │
                    └────────┼─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  MySQL 5.7       │
                    │  wwwvideo_       │
                    │  video_accesos   │
                    └──────────────────┘
```

---

## 17. Glosario

| Termino | Definicion |
|---|---|
| **Privada** | Fraccionamiento o comunidad residencial cerrada con caseta de acceso |
| **Residencia** | Casa o departamento individual dentro de una privada |
| **Residente** | Persona que habita en una residencia |
| **Visitante (Visita)** | Persona externa que solicita acceso a una residencia |
| **Registro General** | Persona no categorizada como residente ni visitante |
| **Solicitante** | Persona que solicita el acceso (puede ser residente, visitante o general) |
| **Monitorista** | Operador de caseta que gestiona el acceso |
| **Interfon** | Extension telefonica del interfon de la residencia |
| **DVR** | Digital Video Recorder, dispositivo que graba video de camaras IP |
| **AccesPhone** | Componente softphone VoIP integrado en el sistema |
| **CameraGrid** | Componente de visualizacion de camaras en grid |
| **Tipo de Gestion** | Clasificacion del motivo de acceso (Visita, Proveedor, Tecnico, etc.) |
| **Estatus de Acceso** | Resultado: Acceso (1), Rechazo (2), Informo (3) |
| **DND** | Do Not Disturb - modo que rechaza llamadas automaticamente |
| **DTMF** | Dual Tone Multi-Frequency - tonos de teclado telefonico |
| **Nonce cache** | Cache de challenge HTTP Digest para evitar doble request a DVRs |
| **Semaforo por host** | Limite de 2 conexiones simultaneas por DVR |
| **DES crypt** | Algoritmo de hash de passwords del sistema legacy PHP |

---

*Generado: Marzo 2026 | Version 3.0 | Proyecto syscbctlmonitoreo*
