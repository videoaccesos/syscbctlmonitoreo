# Video Accesos - Sistema de Control de Accesos Residenciales

Sistema integral de control de accesos para comunidades residenciales cerradas (privadas/fraccionamientos). Gestiona el registro de visitantes, tarjetas RFID de acceso vehicular y peatonal, monitoreo en tiempo real con camaras e intercomunicadores SIP/VoIP, y administracion financiera (ventas de tarjetas, mensualidades, gastos operativos).

---

## Stack Tecnologico

| Componente | Tecnologia | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| Frontend | React | 19.2.3 |
| Lenguaje | TypeScript | 5.x |
| ORM | Prisma Client | 5.22.0 |
| Base de datos | MySQL | 5.7 |
| Autenticacion | NextAuth.js (JWT) | 4.24.13 |
| Estilos | Tailwind CSS | 4.x |
| Iconos | Lucide React | 0.575.0 |
| Graficas | Recharts | 3.7.0 |
| Tablas | TanStack React Table | 8.21.3 |
| Formularios | React Hook Form + Zod | 7.71 / 4.3 |
| VoIP/SIP | JsSIP | 3.13.5 |
| Excel | ExcelJS | 4.4.0 |
| Email | Nodemailer | 7.0.13 |

---

## Arquitectura General

```
Cloudflare (DNS/SSL) --> Nginx (reverse proxy :443 -> :3000) --> Next.js (puerto 3000)
                                                                    |
                                                                    +--> MySQL 5.7 (Prisma ORM)
                                                                    +--> Servidor Relay (puerto 5501) -- apertura de puertas
                                                                    +--> Asterisk PBX (WebSocket SIP) -- intercomunicadores
                                                                    +--> Camaras IP (proxy RTSP/snapshot)
```

### Servidor de produccion
- **OS**: Ubuntu 22.04 (VPS GoDaddy)
- **Dominio**: accesoswhatsapp.info
- **Servicio systemd**: `video-accesos.service`
- **Directorio**: `/home/wwwvideoaccesos/public_html/syscbctlmonitoreo/video-accesos-app`
- **Branch**: `claude/analyze-project-nchIs`

---

## Variables de Entorno

| Variable | Descripcion | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Conexion MySQL | `mysql://user:pass@localhost:3306/wwwvideo_video_accesos` |
| `NEXTAUTH_SECRET` | Secreto para firmar JWT | (cadena aleatoria de 32+ chars) |
| `NEXTAUTH_URL` | URL base del sistema | `https://accesoswhatsapp.info` |
| `RELAY_API_URL` | Endpoint del servidor relay | `http://127.0.0.1:5501/api/relay/ejecutar` |
| `RELAY_API_KEY` | API key del relay (opcional) | (cadena si esta configurado) |
| `LOG_FILE` | Ruta del archivo de log | `/tmp/video-accesos.log` |

---

## Estructura del Proyecto

```
video-accesos-app/
|-- prisma/
|   |-- schema.prisma          # 32 modelos, mapeados a BD legacy
|   +-- seed.ts                # Datos semilla
|
|-- src/
|   |-- app/
|   |   |-- (auth)/login/      # Pagina de login
|   |   |-- (dashboard)/       # Layout con sidebar + header
|   |   |   |-- page.tsx       # Dashboard principal (KPIs del dia)
|   |   |   |-- catalogos/     # 9 paginas de catalogos
|   |   |   |-- procesos/      # 9 paginas de procesos operativos
|   |   |   |-- herramientas/  # 2 paginas de herramientas analiticas
|   |   |   |-- reportes/      # 6 paginas de reportes
|   |   |   +-- seguridad/     # 3 paginas (usuarios, grupos, permisos)
|   |   |
|   |   +-- api/               # 72 rutas de API
|   |       |-- auth/          # NextAuth
|   |       |-- dashboard/     # Stats del dia
|   |       |-- catalogos/     # CRUD de cada catalogo
|   |       |-- procesos/      # Logica de negocio
|   |       |-- herramientas/  # Conciliacion, ingresos, remisiones
|   |       |-- reportes/      # Consultas de reportes
|   |       |-- seguridad/     # Usuarios, grupos, permisos, sync
|   |       |-- camera-proxy/  # Proxy a camaras IP
|   |       +-- relay/         # Proxy a servidor de apertura de puertas
|   |
|   |-- components/
|   |   |-- AccesPhone.tsx     # Softphone SIP/VoIP con JsSIP
|   |   |-- CameraGrid.tsx    # Grid de camaras con proxy
|   |   +-- layout/
|   |       |-- sidebar.tsx    # Menu lateral con filtro por permisos
|   |       |-- header.tsx     # Encabezado con usuario/notificaciones
|   |       +-- providers.tsx  # SessionProvider de NextAuth
|   |
|   |-- lib/
|   |   |-- auth.ts           # Configuracion NextAuth + carga de permisos
|   |   |-- prisma.ts         # Singleton de Prisma Client
|   |   |-- logger.ts         # Logger a archivo con rotacion
|   |   |-- ensure-gastos-schema.ts
|   |   +-- ensure-mensualidades.ts
|   |
|   +-- middleware.ts          # Control de acceso por ruta (RBAC)
|
+-- public/
    +-- sounds/                # Ringtones SIP (*.wav)
```

---

## Modelo de Datos (32 modelos Prisma)

### Seguridad y Autenticacion
| Modelo | Tabla MySQL | Descripcion |
|---|---|---|
| `Usuario` | `usuarios` | Usuarios del sistema con hash DES crypt (legacy PHP) |
| `GrupoUsuario` | `grupos_usuarios` | Grupos de permisos (ej: "admin", "operador", "administrador") |
| `GrupoUsuarioDetalle` | `grupos_usuarios_detalles` | Relacion usuario-grupo (M:N) |
| `Proceso` | `procesos` | Ramas de menu (Catalogos, Procesos, Reportes, etc.) |
| `Subproceso` | `subprocesos` | Pantallas individuales con ruta (ej: `/catalogos/privadas`) |
| `PermisoAcceso` | `permisos_acceso` | Relacion grupo-subproceso (que grupo puede ver que pantalla) |
| `BitacoraInicio` | `bitacora_inicios` | Auditoria de inicios de sesion |

**Flujo de permisos**: Usuario -> GrupoUsuarioDetalle -> GrupoUsuario -> PermisoAcceso -> Subproceso.funcion -> rutasAutorizadas (JWT)

El grupo llamado exactamente `admin` (case-insensitive) obtiene `isAdmin=true` con acceso total sin verificar permisos.

### Comunidades y Residencias
| Modelo | Tabla MySQL | Descripcion |
|---|---|---|
| `Privada` | `privadas` | Fraccionamientos/privadas con precios, telefono SIP, config DNS/video/relay |
| `Residencia` | `residencias` | Casas/lotes dentro de cada privada |
| `Residente` | `residentes` | Residentes permanentes (ID char(8) legacy) |
| `Visita` | `visitas` | Visitantes temporales |
| `RegistroGeneral` | `registro_general` | Registros de personas no residentes |

### Tarjetas RFID
| Modelo | Tabla MySQL | Descripcion |
|---|---|---|
| `Tarjeta` | `tarjetas` | Inventario de tarjetas (estatus: 1=disponible, 2=asignada, 3=cancelada) |
| `ResidenteTarjeta` | `residencias_residentes_tarjetas` | Asignaciones Folio H (con renovacion). 5 slots desnormalizados por registro |
| `ResidenteTarjetaNoRenovacion` | `residencias_residentes_tarjetas_no_renovacion` | Asignaciones Folio B (sin renovacion) |

**Nota sobre tablas de tarjetas**: La tabla H tiene columna `interfon_extra`, la tabla B no. Los INSERTs manejan esto condicionalmente.

### Accesos y Monitoreo
| Modelo | Tabla MySQL | Descripcion |
|---|---|---|
| `RegistroAcceso` | `registros_accesos` | Log de entradas/salidas (acceso=1, rechazo=2, informe=3) |
| `SupervisionLlamada` | `supervicion_llamadas` | Calificacion de calidad de atencion por llamada |

### Servicio y Mantenimiento
| Modelo | Tabla MySQL | Descripcion |
|---|---|---|
| `OrdenServicio` | `ordenes_servicio` | Reportes de falla con tecnico asignado |
| `OrdenServicioSeguimiento` | `ordenes_servicio_seguimientos` | Comentarios de seguimiento |
| `Falla` | `fallas` | Catalogo de tipos de falla |
| `Material` | `materiales` | Catalogo de materiales con precio unitario |

### Financiero
| Modelo | Tabla MySQL | Descripcion |
|---|---|---|
| `Gasto` | `gastos` | Gastos operativos por privada o generales |
| `TipoGasto` | `tipo_gasto` | Catalogo de tipos de gasto |
| `CuentaGasto` | `cuentas_gasto` | Cuentas contables para gastos |
| `FolioMensualidad` | `folios_mensualidades` | Pagos mensuales de privadas |
| `FolioRemision` | `folios_remisiones` | Ingresos por remision (concepto libre) |
| `Prenomina` | `prenomina` | Prenomina quincenal de empleados |

### Empleados
| Modelo | Tabla MySQL | Descripcion |
|---|---|---|
| `Empleado` | `empleados` | Datos completos (nombre, puesto, turno, salario, banco) |
| `Puesto` | `puestos` | Catalogo de puestos |
| `Turno` | `turnos` | Catalogo de turnos con hora entrada/salida |

---

## Sistema de Autenticacion y Permisos

### Login
1. Usuario envia credenciales via formulario `/login`
2. NextAuth `authorize()` busca usuario activo en BD
3. Verifica contrasena con DES crypt legacy (compatibilidad con sistema PHP anterior): `substr(crypt($pass, salt), 0, 10)`
4. Carga grupos del usuario y sus permisos (subproceso.funcion)
5. Si algun grupo es `admin` -> `isAdmin=true` (acceso total)
6. Genera JWT con `usuarioId`, `empleadoId`, `isAdmin`, `rutasAutorizadas[]`
7. JWT expira en 2 horas

### Middleware (control de acceso por ruta)
```
Matcher: todo excepto /login, /api/auth, /_next, /favicon.ico, /sounds/

Flujo:
1. Rutas publicas (/) -> acceso libre
2. Sin token -> redirect a /login
3. isAdmin -> acceso total
4. Ruta API:
   a. GET a catalogos -> acceso libre (lectura de dropdowns)
   b. API protegida -> verificar permiso por API_RUTA_PERMISO map
   c. API no mapeada -> acceso libre (ej: /api/dashboard)
5. Ruta de pagina -> verificar en rutasAutorizadas del JWT
6. Sin permiso -> redirect a /?forbidden=1
```

### Catalogos de lectura libre (GET sin permiso especifico)
- `/api/catalogos/privadas`, `/api/catalogos/residencias`, `/api/catalogos/empleados`
- `/api/catalogos/tarjetas`, `/api/catalogos/puestos`, `/api/catalogos/turnos`
- `/api/catalogos/fallas`, `/api/catalogos/materiales`, `/api/catalogos/cuentas-gasto`

---

## Modulos Funcionales

### 1. Dashboard Principal (`/`)
KPIs del dia: accesos hoy, privadas activas, total residencias, desglose (acceso/rechazo/informe). Tabla de ultimos 10 accesos con calle y numero de casa.

### 2. Catalogos (9 pantallas CRUD)
| Pantalla | Ruta | Funcion |
|---|---|---|
| Privadas | `/catalogos/privadas` | Fraccionamientos con precios, telefono SIP, config DNS/video |
| Residencias | `/catalogos/residencias` | Casas por privada, residentes, telefonos |
| Empleados | `/catalogos/empleados` | Personal con puesto, turno, salario |
| Tarjetas | `/catalogos/tarjetas` | Inventario RFID, historial de asignaciones |
| Puestos | `/catalogos/puestos` | Tipos de puesto laboral |
| Turnos | `/catalogos/turnos` | Horarios con entrada/salida |
| Fallas | `/catalogos/fallas` | Tipos de falla para ordenes de servicio |
| Materiales | `/catalogos/materiales` | Insumos con precio unitario |
| Cuentas de Gasto | `/catalogos/cuentas-gasto` | Clasificacion contable de gastos |

### 3. Procesos Operativos (9 pantallas)
| Pantalla | Ruta | Funcion |
|---|---|---|
| Consola Monitorista | `/procesos/monitoristas` | Terminal principal del operador: llamadas SIP, camaras, registro rapido |
| Registro de Accesos | `/procesos/registro-accesos` | Formulario detallado de entrada/salida de visitantes |
| Asignacion de Tarjetas | `/procesos/asignacion-tarjetas` | Venta/renovacion de tarjetas RFID (Folio H y Folio B) |
| Ordenes de Servicio | `/procesos/ordenes-servicio` | Reportes de falla con seguimiento |
| Supervision de Llamadas | `/procesos/supervision-llamadas` | Calificacion de calidad de atencion |
| Gastos | `/procesos/gastos` | Registro de gastos por privada o generales |
| Pago de Mensualidades | `/procesos/mensualidades` | Cobro de cuotas mensuales por privada |
| Correccion Vencimientos | `/procesos/correccion-vencimientos` | Ajuste masivo de fechas de vencimiento |
| Prenomina | `/procesos/prenomina` | Calculo quincenal de nomina |

### 4. Herramientas Analiticas (2 pantallas)
| Pantalla | Ruta | Funcion |
|---|---|---|
| Conciliacion de Tarjetas | `/herramientas/conciliacion` | Analisis de renovaciones vs pendientes por periodo |
| Dashboard de Ingresos | `/herramientas/ingresos` | Ingresos esperados vs cobrados (mensualidades, tarjetas, remisiones) |

### 5. Reportes (6 pantallas)
| Pantalla | Ruta | Funcion |
|---|---|---|
| Accesos Consultas | `/reportes/accesos-consultas` | Historial de accesos con filtros |
| Accesos Graficas | `/reportes/accesos-graficas` | Graficas comparativas por periodo |
| Supervision Llamadas | `/reportes/supervision-llamadas` | Reporte de calificaciones por operador |
| Reporte de Ventas | `/reportes/reporte-ventas` | Tarjetas vendidas con exportacion Excel |
| Tarjetas por Vencer | `/reportes/tarjetas-vencimientos` | Proximos vencimientos con datos de contacto |
| Listado de Tarjetas | `/reportes/catalogo-tarjetas` | Inventario general de tarjetas |

### 6. Seguridad (3 pantallas)
| Pantalla | Ruta | Funcion |
|---|---|---|
| Usuarios | `/seguridad/usuarios` | CRUD de usuarios del sistema |
| Grupos de Usuario | `/seguridad/grupos-usuarios` | Crear grupos y asignar usuarios |
| Permisos de Acceso | `/seguridad/permisos` | Asignar pantallas a cada grupo (con descripciones) |

---

## Componentes Principales

### AccesPhone (Softphone SIP/VoIP)
Componente flotante que permite al operador recibir y hacer llamadas via WebSocket SIP (JsSIP) conectado a Asterisk PBX.

**Funcionalidades:**
- Registro SIP automatico con auto-reconexion exponencial
- Llamadas entrantes/salientes con controles de audio (mute, speaker)
- Deteccion de CallerID -> busqueda automatica de privada/residencia
- Teclado DTMF para navegacion de menus IVR
- Modos DND (No Disponible) y Auto-Answer
- **Botones de apertura remota**: Visita (verde), Residente (azul), Especial (naranja)
  - Se habilitan cuando hay privada seleccionada (via CallerID o seleccion manual en pagina)
  - POST a `/api/relay/ejecutar` -> proxy al servidor relay (puerto 5501)
- Audio unlock automatico para cumplir politicas de autoplay del navegador
- Diagnosticos accesibles via `window.__sipDiag()` en consola

**Configuracion SIP**: Se guarda en `localStorage` del navegador. El operador configura: servidor WS, extension, contrasena, dominio SIP.

### CameraGrid (Visualizador de Camaras)
Grid de imagenes de camaras IP con proxy server-side para evitar mixed-content y CORS.
- Refresco periodico configurable
- Carrusel de camaras por privada
- Modo pantalla completa
- Diagnosticos de conectividad

---

## Integraciones Externas

### Servidor Relay (Puerto 5501)
Controla la apertura remota de puertas/plumas de acceso via MQTT.

```
POST /api/relay/ejecutar (proxy Next.js)
  -> POST http://127.0.0.1:5501/api/relay/ejecutar (servidor relay)

Payload:
{
  "trigger_value": "abrir_visitas_api" | "abrir_residentes_api" | "apertura_especial_api",
  "residencial_id": 73,
  "source": "softphone"
}

Respuesta: { "ok": true, "resultado": "exitoso" }
```

### Asterisk PBX (VoIP)
- WebSocket SIP: `wss://accessbotpbx.info:8089/ws`
- Protocolo: SIP sobre WebSocket (JsSIP)
- Codecs: audio solamente (video SDP removido)
- Los intercomunicadores de cada privada llaman al PBX, el operador contesta desde el softphone del navegador

### Camaras IP
- Proxy via `/api/camera-proxy` para evitar mixed-content HTTPS/HTTP
- Lookup de camaras por telefono o privada_id via `/api/camera-proxy/lookup`
- Configuracion de URLs en modelo Privada (campos video1, video2, video3)

---

## Despliegue en Produccion

### Requisitos
- Node.js 20+
- MySQL 5.7 con BD `wwwvideo_video_accesos`
- Nginx como reverse proxy (443 -> 3000)
- Cloudflare DNS con SSL
- Archivo `.env` con variables de entorno

### Comando de despliegue
```bash
cd /home/wwwvideoaccesos/public_html/syscbctlmonitoreo/video-accesos-app
git pull --rebase origin claude/analyze-project-nchIs
npx prisma generate
npm run build
sudo systemctl restart video-accesos
```

### Servicio systemd
```
/etc/systemd/system/video-accesos.service
Ejecuta: npm exec next start --port 3000
```

### Consideraciones importantes
- **NUNCA** ejecutar `prisma db push` o `prisma migrate` en produccion. El esquema tiene divergencias acumuladas que requeririan perdida de datos. Usar solo `prisma generate` y `prisma db pull`.
- Para cambios de esquema de BD, usar `ALTER TABLE` via SQL directo.
- Los cambios a permisos requieren que los usuarios cierren sesion y re-ingresen (JWT de 2 horas).
- Despues de agregar nuevas pantallas al sistema, ejecutar "Sincronizar Catalogo de Ramas" desde Seguridad > Permisos.

---

## Scripts NPM

| Script | Comando | Descripcion |
|---|---|---|
| `dev` | `next dev --turbopack` | Servidor de desarrollo con hot-reload |
| `build` | `next build` | Compilacion para produccion |
| `start` | `next start` | Iniciar servidor de produccion |
| `lint` | `next lint` | Verificacion de estilo con ESLint |
| `db:pull` | `prisma db pull` | Sincronizar schema desde BD (lectura) |
| `db:generate` | `prisma generate` | Regenerar Prisma Client |
| `db:studio` | `prisma studio` | UI visual de la BD |
| `db:seed` | `tsx prisma/seed.ts` | Ejecutar datos semilla |

---

## Notas de Desarrollo

### Convenciones
- Todas las paginas usan `"use client"` (componentes client-side)
- APIs usan `$queryRawUnsafe` / `$executeRawUnsafe` cuando Prisma ORM tiene limitaciones con la BD legacy
- Campos de fecha en BD son `VARCHAR(10)` con formato `YYYY-MM-DD` (legacy)
- IDs de residente/visita son `CHAR(8)` (legacy)
- Estatus: `1` = activo, `2` = inactivo/eliminado (soft delete)
- Tablas mapeadas con `@@map()` para preservar nombres legacy en snake_case

### Manejo de permisos para nuevas pantallas
1. Agregar la ruta al sidebar en `src/components/layout/sidebar.tsx`
2. Agregar entrada en `CATALOGO_RAMAS` de `src/app/api/seguridad/sync-procesos/route.ts`
3. Agregar la funcion a `FUNCIONES_CATALOGO` en `src/app/api/seguridad/permisos/route.ts`
4. Si la API requiere permiso especifico, agregar a `API_RUTA_PERMISO` en `src/middleware.ts`
5. Desplegar, ejecutar "Sincronizar Catalogo" desde la UI, asignar permisos al grupo correspondiente
