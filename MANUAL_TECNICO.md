# Manual Tecnico - Sistema de Control de Acceso y Videomonitoreo (Video Accesos)

**Version:** 3.0
**Fecha:** Abril 2026
**Nombre del proyecto:** syscbctlmonitoreo / Video Accesos
**Repositorio:** videoaccesos/syscbctlmonitoreo

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura General del Sistema](#2-arquitectura-general-del-sistema)
3. [Stack Tecnologico](#3-stack-tecnologico)
4. [Estructura del Proyecto](#4-estructura-del-proyecto)
5. [Sistema Legacy (v1 - PHP/CodeIgniter)](#5-sistema-legacy-v1---phpcodeigniter)
6. [Sistema Moderno (v2 - Next.js)](#6-sistema-moderno-v2---nextjs)
7. [Base de Datos](#7-base-de-datos)
8. [Modulos Funcionales](#8-modulos-funcionales)
9. [API REST - Endpoints](#9-api-rest---endpoints)
10. [Sistema VoIP/SIP - AccesPhone](#10-sistema-voipsip---accesphone)
11. [Sistema MQTT y Agentes de Captura](#11-sistema-mqtt-y-agentes-de-captura)
12. [Sistema de Monitoreo de Portones](#12-sistema-de-monitoreo-de-portones)
13. [Sistema de Autenticacion y Seguridad](#13-sistema-de-autenticacion-y-seguridad)
14. [Flujo Operativo Principal](#14-flujo-operativo-principal)
15. [Configuracion y Despliegue](#15-configuracion-y-despliegue)
16. [Diagrama de Arquitectura](#16-diagrama-de-arquitectura)
17. [Glosario](#17-glosario)

---

## 1. Resumen Ejecutivo

**Video Accesos** es un sistema integral de control de acceso y videomonitoreo disenado para administrar comunidades residenciales privadas (fraccionamientos cerrados). El sistema permite a operadores de caseta gestionar el ingreso de visitantes, residentes y proveedores mediante un flujo que integra:

- **Registro de accesos** con identificacion de solicitante
- **Comunicacion VoIP/SIP** (softphone integrado) para contactar residentes via interfon
- **Videomonitoreo en tiempo real** de camaras en accesos de las privadas via agentes MQTT
- **Video Web** con visualizacion en vivo de camaras, drag-and-drop para reordenar
- **Monitoreo automatico de portones** con deteccion por histograma de imagen y alertas WhatsApp
- **Agentes de captura (CaptureAgent)** en Windows para transmision de frames desde DVRs/camaras IP
- **Comunicacion MQTT** en tiempo real entre servidor y agentes remotos
- **Gestion de tarjetas RFID** para acceso vehicular y peatonal
- **Reportes y graficas** de actividad operativa
- **Supervision de calidad** de llamadas de operadores
- **Ordenes de servicio** para mantenimiento de equipos
- **Control de gastos** operativos por privada
- **Bot de alertas WhatsApp** para notificacion de portones abiertos

El proyecto inicio en enero de 2013 como una aplicacion PHP con CodeIgniter (v1) y fue migrado en 2025-2026 a una arquitectura moderna con **Next.js 16, React 19, Prisma ORM y TailwindCSS** (v2), conservando la misma base de datos MySQL de produccion. En 2026 se agrego una capa de comunicacion **MQTT** para conectar agentes de captura remotos (Windows) con el servidor, habilitando videomonitoreo en tiempo real y deteccion automatica de portones abiertos.

---

## 2. Arquitectura General del Sistema

El sistema opera con una arquitectura de dos generaciones coexistentes:

```
+---------------------------------------------------------------------+
|                        SERVIDOR WEB (50.62.182.131)                 |
|                                                                     |
|  +---------------------------+   +-------------------------------+  |
|  |   SISTEMA LEGACY (v1)     |   |   SISTEMA MODERNO (v2)        |  |
|  |   PHP / CodeIgniter       |   |   Next.js 16 / React 19       |  |
|  |   Puerto 80 (Apache)      |   |   Puerto 3000 (Node.js)       |  |
|  |   /syscbctlmonitoreo/     |   |   /video-accesos-app/         |  |
|  +------------+--------------+   +------+----------------+------+  |
|               |                         |                |         |
|               +-------------------------+                |         |
|                          |                               |         |
|              +-----------v-----------+    +--------------v------+  |
|              |   MySQL 5.7           |    |   MQTT Broker       |  |
|              |   wwwvideo_video_     |    |   Mosquitto :1883   |  |
|              |   accesos             |    |                     |  |
|              +-----------------------+    +----------+----------+  |
|                                                      |             |
|              +-------------------------------+       |             |
|              |   Bot Orquestador :5501       |<------+             |
|              |   (WhatsApp/Twilio alertas)    |                     |
|              +-------------------------------+                     |
+---------------------------------------------------------------------+
         |                    |                        |
+---------v-------+  +--------v--------+  +-----------v-----------+
|   PBX SIP       |  | Agentes Windows |  |   Camaras IP          |
|   accessbotpbx  |  | (CaptureAgent)  |  |   DVR Hikvision/Dahua |
|   .info:8089/ws |  | PowerShell      |  |   (RTSP/HTTP)         |
+-----------------+  | MQTT + HTTP POST|  +-----------------------+
                     +-----------------+
```

### Componentes Clave

| Componente | Tecnologia | Proposito |
|---|---|---|
| Frontend v2 | Next.js 16 + React 19 + TailwindCSS | Interfaz de usuario moderna SPA |
| Backend v2 | Next.js API Routes (App Router) | API REST para todas las operaciones |
| ORM | Prisma 5 | Mapeo objeto-relacional a MySQL |
| Base de datos | MySQL 5.7 | Persistencia de datos (BD legacy compartida) |
| Autenticacion | NextAuth.js 4 (JWT) | Login con credenciales legacy DES crypt |
| Softphone | JsSIP 3.13 + WebRTC | Comunicacion SIP integrada en el navegador |
| PBX | Asterisk/FreePBX | Central telefonica SIP (servidor externo) |
| MQTT Broker | Mosquitto 1883 | Mensajeria en tiempo real servidor-agentes |
| CaptureAgent | PowerShell (Windows) | Captura de frames desde DVRs/camaras IP |
| Frame Store | Node.js in-memory | Almacen de frames con limpieza automatica |
| Gate Monitor | sharp + histograma | Deteccion de portones abiertos por imagen |
| Bot Vision | Python + paho-mqtt + Twilio | Alertas de portones abiertos via WhatsApp |
| Camaras | IP Cameras + Proxy API + Agentes MQTT | Videovigilancia en accesos de privadas |
| CameraGrid | React component + diagnosticos | Grid de visualizacion de camaras con refresco automatico |
| Legacy v1 | PHP/CodeIgniter + Apache | Sistema original (en coexistencia) |

---

## 3. Stack Tecnologico

### Frontend (v2)
- **Next.js 16.1.6** - Framework React con App Router
- **React 19.2.3** - Libreria de UI
- **TailwindCSS 4** - Framework CSS utility-first
- **Lucide React** - Iconografia
- **Recharts 3.7** - Graficas y visualizaciones
- **React Hook Form 7 + Zod 4** - Formularios con validacion
- **@tanstack/react-table 8** - Tablas de datos avanzadas
- **JsSIP 3.13.5** - Cliente SIP/WebRTC

### Backend (v2)
- **Next.js API Routes** - Endpoints REST
- **Prisma 5.22** - ORM para MySQL
- **NextAuth.js 4.24** - Autenticacion JWT
- **unix-crypt-td-js** - Compatibilidad con hashes DES legacy
- **ExcelJS 4.4** - Exportacion de reportes a Excel
- **Nodemailer 7** - Envio de correos electronicos
- **mqtt (npm)** - Cliente MQTT para comunicacion con agentes
- **sharp** - Procesamiento de imagenes (histogramas, ROI, ~2ms/frame)

### MQTT y Agentes
- **Mosquitto** - Broker MQTT (puerto 1883, servidor 50.62.182.131)
- **CaptureAgent (PowerShell)** - Agente de captura en Windows (PS 5.1+ y PS 7+)
- **paho-mqtt (Python)** - Cliente MQTT para bot plugin vision
- **Twilio** - Envio de alertas WhatsApp desde bot vision

### Base de Datos
- **MySQL 5.7** - Motor relacional
- **Base de datos:** `wwwvideo_video_accesos`
- **Prisma Relation Mode:** `prisma` (sin foreign keys nativas en MySQL, relaciones manejadas por Prisma)

### Legacy (v1)
- **PHP 5.x/7.x** - Lenguaje servidor
- **CodeIgniter 2.x** - Framework MVC PHP
- **Apache** con mod_rewrite
- **jQuery, Bootstrap, FusionCharts, jqPlot** - Frontend legacy

### Infraestructura VoIP
- **PBX:** `accessbotpbx.info` (Asterisk/FreePBX)
- **Protocolo:** SIP sobre WebSocket (WSS puerto 8089)
- **Codec:** WebRTC (SRTP)
- **ICE/STUN:** Defaults del navegador (no se configuran servidores ICE explicitamente)

---

## 4. Estructura del Proyecto

```
syscbctlmonitoreo/
|
|-- index.php                    # Entry point del sistema legacy (CodeIgniter)
|-- .htaccess                    # Rewrite rules para Apache + CORS
|-- LEEME.txt                    # Nota historica del proyecto (inicio 2013)
|-- Manual tecnico.pdf           # Manual tecnico anterior (referencia)
|-- MANUAL_TECNICO.md            # Este documento
|
|-- application/                 # Aplicacion CodeIgniter (legacy v1)
|   |-- _controllers/            # Controladores MVC
|   |   |-- catalogos/           # CRUD de catalogos (privadas, empleados, etc.)
|   |   |-- procesos/            # Logica de negocio (accesos, ordenes, etc.)
|   |   |-- reportes/            # Generacion de reportes
|   |   |-- seguridad/           # Gestion de usuarios y permisos
|   |   |-- login.php            # Controlador de autenticacion
|   |   +-- sistema.php          # Controlador del sistema
|   |-- __models/                # Modelos de datos
|   |   |-- catalogos/           # Modelos de catalogos
|   |   |-- procesos/            # Modelos de procesos
|   |   +-- seguridad/           # Modelos de seguridad
|   |-- _views/                  # Vistas PHP (HTML renderizado)
|   |   |-- catalogos/           # Vistas de catalogos
|   |   |-- procesos/            # Vistas de procesos
|   |   |-- reportes/            # Vistas de reportes
|   |   +-- seguridad/           # Vistas de seguridad
|   +-- config/                  # Configuracion de CodeIgniter
|       |-- config.php           # URL base, sesiones, etc.
|       |-- routes.php           # Ruteo (default: login)
|       +-- autoload.php         # Carga automatica de librerias
|
|-- system/                      # Core de CodeIgniter (framework)
|   |-- core/                    # Clases base del framework
|   |-- database/                # Drivers de BD
|   |-- helpers/                 # Helpers utilitarios
|   +-- libraries/               # Librerias del framework
|
|-- js/                          # JavaScript del sistema legacy
|   |-- jquery-2.1.4.js          # jQuery
|   |-- bootstrap.js             # Bootstrap JS
|   |-- fusioncharts.js          # Graficas FusionCharts
|   |-- sistema_form_general.js  # Logica de formularios del sistema
|   +-- ...                      # Plugins adicionales (jqPlot, datepicker, etc.)
|
|-- css/                         # Estilos del sistema legacy
|-- img/                         # Imagenes y recursos
|-- less/                        # Archivos LESS (preprocesador CSS)
|-- reports/                     # Plantillas de reportes
|-- bd/                          # Scripts de base de datos (referencia)
|
|-- softphone/                   # Softphone legacy standalone
|   |-- jssip.min.js             # JsSIP v3.10 (version standalone)
|   +-- mqtt_relay.php           # Bridge HTTP-MQTT para activacion de relays
|
|-- agent-windows/               # === AGENTES DE CAPTURA (Windows) ===
|   |-- CaptureAgent.ps1         # Agente PowerShell 7+ (948 lineas)
|   |-- CaptureAgent-PS5.ps1     # Agente PowerShell 5.1 compatible (1200+ lineas)
|   +-- config.json              # Configuracion del agente (site_id, DVR, MQTT)
|
|-- bot-plugin-vision/           # === PLUGIN BOT ALERTAS DE PORTONES ===
|   |-- plugin_vision.py         # Suscriptor MQTT -> WhatsApp via Twilio
|   +-- README.md                # Documentacion del plugin
|
|-- zk_mqtt_bridge/              # === BRIDGE ZK ACCESS CONTROL -> MQTT ===
|
|-- documentacion bot orquestador/  # Documentacion del bot orquestador
|   +-- Manual_Tecnico_Control_Remoto_MQTT.md
|
+-- video-accesos-app/           # === APLICACION MODERNA (v2) ===
    |-- package.json             # Dependencias Node.js
    |-- tsconfig.json            # Configuracion TypeScript
    |-- prisma/
    |   |-- schema.prisma        # Esquema de BD (734 lineas, 30+ modelos)
    |   +-- seed.ts              # Datos semilla para desarrollo
    |-- data/                    # Datos persistentes en archivo (JSON)
    |   |-- gate-monitors.json   # Configuracion de monitoreo de portones
    |   |-- gate-alerts.json     # Historial de alertas de portones
    |   |-- gate-comparisons.json # Log de lecturas/comparaciones
    |   +-- camera-order.json    # Orden de camaras (drag-and-drop)
    |-- public/
    |   |-- CaptureAgent.ps1     # Agente servido para descarga por PCs remotas
    |   +-- static/
    |       +-- gate-alerts/     # Evidencia fotografica de alertas de portones
    +-- src/
        |-- middleware.ts         # Proteccion de rutas (NextAuth)
        |-- app/
        |   |-- layout.tsx        # Layout raiz (providers)
        |   |-- (auth)/
        |   |   +-- login/page.tsx # Pagina de login
        |   |-- (dashboard)/
        |   |   |-- layout.tsx     # Layout con sidebar + header
        |   |   |-- page.tsx       # Dashboard principal
        |   |   |-- catalogos/     # Paginas de catalogos (8 modulos)
        |   |   |-- procesos/      # Paginas de procesos (6 modulos)
        |   |   |   +-- monitoristas/page.tsx  # Consola monitorista (1100+ lineas)
        |   |   |-- herramientas/  # === NUEVAS HERRAMIENTAS ===
        |   |   |   |-- video-web/page.tsx         # Video Web en vivo (400+ lineas)
        |   |   |   +-- monitoreo-portones/page.tsx # Monitoreo de portones (900+ lineas)
        |   |   |-- reportes/      # Paginas de reportes (3 modulos)
        |   |   +-- seguridad/     # Paginas de seguridad (3 modulos)
        |   +-- api/               # API Routes (endpoints REST)
        |       |-- auth/          # Autenticacion NextAuth
        |       |-- dashboard/     # Estadisticas dashboard
        |       |-- camera-proxy/  # Proxy de camaras IP (snapshot, lookup, diag)
        |       |-- camera-frames/ # Recepcion de frames de agentes + comandos MQTT
        |       |-- gate-monitor/  # APIs de monitoreo de portones
        |       |-- privadas/      # API de listado de privadas
        |       |-- catalogos/     # APIs de catalogos
        |       |-- procesos/      # APIs de procesos
        |       |-- reportes/      # APIs de reportes
        |       +-- seguridad/     # APIs de seguridad
        |-- components/
        |   |-- AccesPhone.tsx     # Softphone SIP/WebRTC integrado
        |   |-- CameraGrid.tsx     # Grid de camaras IP con proxy y diagnosticos
        |   +-- layout/
        |       |-- sidebar.tsx    # Barra lateral de navegacion
        |       |-- header.tsx     # Encabezado con info de usuario
        |       +-- providers.tsx  # SessionProvider de NextAuth
        |-- lib/
        |   |-- auth.ts           # Configuracion NextAuth + DES crypt
        |   |-- logger.ts         # Logger del servidor con rotacion de archivos
        |   |-- prisma.ts         # Singleton del cliente Prisma
        |   |-- mqtt-client.ts    # Cliente MQTT singleton (broker, topics, comandos)
        |   |-- frame-store.ts    # Almacen de frames en memoria + orden de camaras
        |   |-- gate-monitor.ts   # Motor de deteccion de portones (histograma)
        |   +-- agent-config.ts   # Configuracion y token de agentes
        +-- types/
            +-- next-auth.d.ts    # Extensiones de tipo para NextAuth
```

---

## 5. Sistema Legacy (v1 - PHP/CodeIgniter)

### Descripcion General

El sistema original fue desarrollado en 2013 utilizando **CodeIgniter 2.x**, un framework MVC para PHP. Sigue el patron clasico:

- **Controladores** (`application/_controllers/`): Manejan las peticiones HTTP y la logica de negocio
- **Modelos** (`application/__models/`): Interactuan con la base de datos MySQL
- **Vistas** (`application/_views/`): Generan el HTML renderizado en el servidor

### Configuracion

| Parametro | Valor |
|---|---|
| URL Base | `http://50.62.182.131/syscbctlmonitoreo` |
| Zona horaria | `America/Mazatlan` |
| Controlador default | `login` |
| Entorno | `development` |

### Modulos Legacy

| Modulo | Controlador | Descripcion |
|---|---|---|
| Login | `login.php` | Autenticacion de operadores |
| Privadas | `catalogos/privadas.php` | Gestion de fraccionamientos |
| Residencias | `catalogos/residencias.php` | Domicilios dentro de privadas |
| Empleados | `catalogos/empleados.php` | Personal operativo |
| Tarjetas | `catalogos/tarjetas.php` | Tarjetas RFID |
| Registro Accesos | `procesos/registroaccesos.php` | Modulo principal de operacion |
| Asignacion Tarjetas | `procesos/asignaciontarjetas.php` | Asignacion de RFID a residentes |
| Ordenes Servicio | `procesos/ordenesservicio.php` | Mantenimiento de equipos |
| Supervision Llamadas | `procesos/supervisionllamadas.php` | Calidad de atencion |
| Supervision Guardias | `procesos/supervisionguardias.php` | Control de personal |
| Supervision Portones | `procesos/supervisionportonesabiertos.php` | Monitoreo de portones |
| Recuperacion Patrimonial | `procesos/recuperacionpatrimonial.php` | Danos y siniestros |
| Reportes | `reportes/*.php` | Consultas y graficas |

---

## 6. Sistema Moderno (v2 - Next.js)

### Descripcion General

La version 2 reimplementa el sistema completo utilizando tecnologias modernas. Usa el **App Router** de Next.js con React Server Components y Client Components segun corresponda.

### Layout y Navegacion

El layout principal (`(dashboard)/layout.tsx`) consta de:

1. **Sidebar** (`sidebar.tsx`): Menu lateral con navegacion jerarquica
   - Inicio (Dashboard)
   - Catalogos (8 submenus)
   - Procesos (6 submenus, incluye Terminal de Monitoreo)
   - Herramientas
     - Video Web (visualizacion de camaras en vivo)
     - Monitoreo Portones (deteccion de portones abiertos)
   - Reportes (3 submenus)
   - Seguridad (3 submenus)
   - Cerrar Sesion

2. **Header** (`header.tsx`): Barra superior con nombre del sistema, notificaciones y datos del operador logueado (nombre + numero de operador)

3. **Contenido principal**: Area dinamica segun la ruta activa

### Paginas del Sistema v2

#### Catalogos (CRUD completo)

| Pagina | Ruta | Modelo Prisma | Descripcion |
|---|---|---|---|
| Privadas | `/catalogos/privadas` | `Privada` | Fraccionamientos administrados |
| Residencias | `/catalogos/residencias` | `Residencia` | Domicilios, residentes y visitantes |
| Empleados | `/catalogos/empleados` | `Empleado` | Operadores y personal |
| Tarjetas | `/catalogos/tarjetas` | `Tarjeta` | Inventario de tarjetas RFID |
| Puestos | `/catalogos/puestos` | `Puesto` | Tipos de puesto laboral |
| Turnos | `/catalogos/turnos` | `Turno` | Horarios laborales |
| Fallas | `/catalogos/fallas` | `Falla` | Catalogo de tipos de falla |
| Materiales | `/catalogos/materiales` | `Material` | Inventario de materiales |

#### Procesos (Operacion diaria)

| Pagina | Ruta | Descripcion |
|---|---|---|
| Registro de Accesos | `/procesos/registro-accesos` | Modulo operativo principal con softphone integrado |
| Asignacion de Tarjetas | `/procesos/asignacion-tarjetas` | Asignar tarjetas RFID a residentes |
| Ordenes de Servicio | `/procesos/ordenes-servicio` | Mantenimiento tecnico |
| Supervision de Llamadas | `/procesos/supervision-llamadas` | Evaluacion de calidad |
| Monitoristas | `/procesos/monitoristas` | Gestion de operadores/monitoristas |
| Gastos | `/procesos/gastos` | Control de gastos por privada |

#### Reportes (Consulta y analisis)

| Pagina | Ruta | Descripcion |
|---|---|---|
| Accesos Consultas | `/reportes/accesos-consultas` | Busqueda y filtrado de accesos |
| Accesos Graficas | `/reportes/accesos-graficas` | Graficas por tipo, estatus, dia y hora |
| Supervision Llamadas | `/reportes/supervision-llamadas` | Reporte de evaluaciones |

#### Herramientas (Videomonitoreo y Portones)

| Pagina | Ruta | Descripcion |
|---|---|---|
| Video Web | `/herramientas/video-web` | Visualizacion en vivo de camaras con drag-and-drop |
| Monitoreo Portones | `/herramientas/monitoreo-portones` | Dashboard de deteccion de portones abiertos |

#### Seguridad (Administracion)

| Pagina | Ruta | Descripcion |
|---|---|---|
| Usuarios | `/seguridad/usuarios` | Gestion de cuentas |
| Grupos de Usuario | `/seguridad/grupos-usuarios` | Agrupacion de permisos |
| Permisos de Acceso | `/seguridad/permisos` | Asignacion granular de permisos |

---

## 7. Base de Datos

### Informacion General

| Parametro | Valor |
|---|---|
| Motor | MySQL 5.7 |
| Nombre BD | `wwwvideo_video_accesos` |
| Charset | Latin1 / UTF-8 |
| Modo relacion | Prisma (sin FK nativas) |
| ORM | Prisma 5.22 |

### Diagrama Entidad-Relacion (Simplificado)

```
SEGURIDAD                          CATALOGOS
+----------------+                 +----------------+
| Usuario        |                 | Puesto         |
| - usuario_id   |                 | - puesto_id    |
| - usuario      |---+            | - descripcion  |
| - contrasena   |   |            +-------+--------+
| - empleado_id  |   |                    |
| - privada_id   |   |            +-------v--------+
+-------+--------+   |            | Empleado       |
        |             |            | - empleado_id  |
+-------v--------+   |            | - nombre       |
| GrupoUsuario   |   |            | - puesto_id    |
| Detalle        |   |            | - nro_operador |
+----------------+   |            +-------+--------+
                     |                    |
COMUNIDADES          |            +-------v--------+
+----------------+   |            | Turno          |
| Privada        |<--+            | - turno_id     |
| - privada_id   |                +----------------+
| - descripcion  |
| - dns_1..3     |   (config camaras/interfon)
| - video_1..3   |
| - relay config |
+-------+--------+
        |
+-------v--------+    +-------------------+
| Residencia     |--->| Residente         |
| - residencia_id|    | - residente_id    |
| - nro_casa     |    | - nombre          |
| - calle        |    | - celular         |
| - telefono_    |    +--------+----------+
|   interfon     |             |
+-------+--------+    +--------v----------+
        |             | ResidenteTarjeta  |
        |             | (Folio H)         |
        |             | - tarjeta_id 1..5 |
        |             +-------------------+
        |
+-------v--------+    +-------------------+
| Visita         |    | ResidenteTarjeta  |
| - visitante_id |    | NoRenovacion      |
| - nombre       |    | (Folio B)         |
+----------------+    +-------------------+

OPERACION
+--------------------+    +---------------------+
| RegistroAcceso     |--->| SupervisionLlamada  |
| - registro_acceso_id    | - saludo            |
| - empleado_id      |   | - identifico_empresa|
| - privada_id       |   | - amable            |
| - residencia_id    |   | - gracias           |
| - tipo_gestion_id  |   +---------------------+
| - solicitante_id   |
| - estatus_id       |
| - duracion         |
| - observaciones    |
+--------------------+

MANTENIMIENTO
+--------------------+    +---------------------+
| OrdenServicio      |--->| OrdenServicio       |
| - orden_servicio_id|    | Seguimiento         |
| - folio            |    | - comentario        |
| - tecnico_id       |    +---------------------+
| - codigo_servicio  |
| - diagnostico_id   |
+--------------------+

FINANZAS
+--------------------+
| Gasto              |
| - gasto_id         |
| - tipo_gasto       |
| - privada_id       |
| - total            |
+--------------------+
```

### Modelos Prisma (30+ entidades)

| Modelo | Tabla MySQL | PK | Descripcion |
|---|---|---|---|
| `Usuario` | `usuarios` | `usuario_id` (int, auto) | Cuentas de operadores |
| `GrupoUsuario` | `grupos_usuarios` | `grupo_usuario_id` (int, auto) | Grupos de permisos |
| `GrupoUsuarioDetalle` | `grupos_usuarios_detalles` | Compuesta (grupo, usuario) | Relacion N:M |
| `Proceso` | `procesos` | `proceso_id` (int, auto) | Items del menu (jerarquico) |
| `Subproceso` | `subprocesos` | `subproceso_id` (int, auto) | Acciones dentro de procesos |
| `PermisoAcceso` | `permisos_acceso` | Compuesta (grupo, subproceso) | Permisos granulares |
| `BitacoraInicio` | `bitacora_inicio` | Compuesta (usuario, inicio) | Log de sesiones |
| `Puesto` | `puestos` | `puesto_id` (int, auto) | Catalogo de puestos |
| `Empleado` | `empleados` | `empleado_id` (int, auto) | Personal con permisos especiales |
| `Turno` | `turnos` | `turno_id` (int, auto) | Horarios de trabajo |
| `Privada` | `privadas` | `privada_id` (int, auto) | Fraccionamientos con config DNS/video |
| `PrivadaRelay` | `privadas_relays` | `relay_id` (int, auto) | Config de relays por privada |
| `Residencia` | `residencias` | `residencia_id` (int, auto) | Domicilios con telefono interfon |
| `Residente` | `residencias_residentes` | `residente_id` (char(8)) | Personas que viven en residencias |
| `Visita` | `residencias_visitantes` | `visitante_id` (char(8)) | Visitantes registrados |
| `RegistroGeneral` | `registros_generales` | `registro_general_id` (char(8)) | Solicitantes no residentes |
| `Tarjeta` | `tarjetas` | `tarjeta_id` (int, auto) | Inventario de RFID |
| `ResidenteTarjeta` | `residencias_residentes_tarjetas` | `asignacion_id` (int) | Folio H: asignacion con renovacion |
| `ResidenteTarjetaNoRenovacion` | `residencias_residentes_tarjetas_no_renovacion` | `asignacion_id` (int) | Folio B: sin renovacion |
| `RegistroAcceso` | `registros_accesos` | `registro_acceso_id` (int, auto) | Registro principal de operacion |
| `SupervisionLlamada` | `supervicion_llamadas` | `registro_acceso_id` (int) | Evaluacion de calidad 1:1 |
| `OrdenServicio` | `ordenes_servicio` | `orden_servicio_id` (int, auto) | Mantenimiento tecnico |
| `OrdenServicioSeguimiento` | `ordenes_servicio_seguimiento` | Compuesta (orden, seq) | Historial de seguimiento |
| `Gasto` | `gastos` | `gasto_id` (int, auto) | Gastos operativos |
| `TipoGasto` | `tipos_gastos` | `gasto_id` (int, auto) | Catalogo de tipos de gasto |
| `Clasificacion` | `clasificaciones` | `clasificacion_id` (int, auto) | Tipos de clasificacion |
| `Falla` | `fallas` | `falla_id` (int, auto) | Catalogo de fallas |
| `CodigoServicio` | `codigos_servicio` | `codigo_servicio_id` (int, auto) | Codigos de servicio tecnico |
| `Diagnostico` | `diagnosticos` | `diagnostico_id` (int, auto) | Catalogo de diagnosticos |
| `Folio` | `folios` | `folio_id` (int, auto) | Consecutivos de folios |
| `Material` | `materiales` | `material_id` (int, auto) | Inventario de materiales |
| `RecuperacionPatrimonial` | `recuperacion_patrimonial` | Auto (int) | Registro de incidentes |
| `RecuperacionPatrimonialSeguimiento` | `recuperacion_patrimonial_seguimiento` | Compuesta | Seguimiento de incidentes |

### Tipos de Gestion (tipo_gestion_id)

| ID | Tipo | Descripcion |
|---|---|---|
| 1 | No concluida | Gestion que no se completo |
| 2 | Moroso | Residente moroso |
| 3 | Proveedor | Acceso de proveedor |
| 4 | Residente | Acceso de residente |
| 5 | Tecnico | Acceso de tecnico |
| 6 | Trab. Obra | Trabajador de obra |
| 7 | Trab. Servicio | Trabajador de servicio |
| 8 | Visita | Visitante |
| 9 | Visita Morosos | Visita a residente moroso |

### Estatus de Acceso (estatus_id)

| ID | Estatus | Color UI |
|---|---|---|
| 1 | Acceso (permitido) | Verde |
| 2 | Rechazado | Rojo |
| 3 | Informo (solo consulta) | Azul |

---

## 8. Modulos Funcionales

### 8.1 Dashboard (Inicio)

**Ruta:** `/`
**Archivo:** `src/app/(dashboard)/page.tsx`
**API:** `GET /api/dashboard`

Presenta un resumen en tiempo real (actualizacion cada 30 segundos) con:

- **Tarjetas resumen:** Accesos hoy, Privadas activas, Total residencias
- **Desglose del dia:** Accesos permitidos vs. rechazados vs. informes
- **Tabla de ultimos accesos:** Hora, privada, residencia, operador, estado

### 8.2 Registro de Accesos (Modulo Principal)

**Ruta:** `/procesos/registro-accesos`
**Archivo:** `src/app/(dashboard)/procesos/registro-accesos/page.tsx`
**APIs:** Multiples endpoints bajo `/api/procesos/registro-accesos/`

Este es el **modulo central de operacion** del sistema. Integra:

1. **Lista de accesos del dia** con filtros por privada, estatus y texto
2. **Formulario de nuevo registro** con flujo:
   - Seleccion de privada
   - Busqueda/seleccion de residencia (por numero de casa o calle)
   - Identificacion del solicitante (residente, visitante o general)
   - Registro de observaciones y tipo de gestion
   - Seleccion de estatus (Acceso/Rechazado/Informo)
3. **Softphone AccesPhone** integrado para llamar o recibir llamadas
4. **Identificacion automatica de llamadas entrantes** por telefono de interfon

#### Flujo de Trabajo del Operador

```
Llamada entrante del interfon
        |
        v
[AccesPhone detecta numero] ---> [Busca residencia por telefono_interfon]
        |                                    |
        v                                    v
[Operador contesta]              [Pre-selecciona privada + residencia]
        |                                    |
        v                                    v
[Identifica solicitante]         [Muestra residentes y visitantes]
        |
        v
[Registra tipo de gestion] ---> [Decide: Acceso / Rechazo / Informe]
        |
        v
[Guarda registro de acceso con duracion de llamada]
```

### 8.3 Catalogo de Privadas

**Ruta:** `/catalogos/privadas`

Cada privada contiene:
- Datos de contacto (representante, telefono, email)
- **Configuracion DNS** (hasta 3 slots) para interfones IP
- **Configuracion de video** (hasta 3 camaras con alias)
- **Configuracion de relays** (portones, plumas) con tiempo de activacion
- Precios (vehicular, peatonal, mensualidad)
- Fecha de vencimiento de contrato

### 8.4 Catalogo de Residencias

**Ruta:** `/catalogos/residencias`

Cada residencia incluye:
- Numero de casa, calle
- Telefonos de contacto (2 lineas)
- **Telefono interfon** (crucial para identificacion de llamadas)
- Observaciones (mostradas en rojo durante registro de accesos)
- **Residentes** (CRUD de personas que habitan la residencia)
- **Visitantes** (registro de visitantes frecuentes)

### 8.5 Asignacion de Tarjetas RFID

**Ruta:** `/procesos/asignacion-tarjetas`

Sistema de asignacion de tarjetas con dos tipos de folio:
- **Folio H:** Tarjetas con renovacion (hasta 5 tarjetas por residente)
- **Folio B:** Tarjetas sin renovacion
- Incluye precio, descuento, IVA, seguro de tarjeta
- Busqueda de tarjetas en **ambas tablas** de asignacion

### 8.6 Ordenes de Servicio

**Ruta:** `/procesos/ordenes-servicio`

Gestion de mantenimiento tecnico:
- Folio consecutivo automatico
- Asignacion de tecnico y codigo de servicio
- Diagnostico y detalle del trabajo
- Sistema de seguimiento con multiples comentarios
- Cierre por tecnico diferente al asignado

### 8.7 Supervision de Llamadas

**Ruta:** `/procesos/supervision-llamadas`

Evaluacion de calidad del servicio del operador, vinculada a cada registro de acceso:
- Saludo adecuado
- Identificacion de la empresa
- Identificacion del operador
- Amabilidad
- Agradecimiento
- Manejo de demanda
- Asunto resuelto
- Tiempo de gestion

### 8.8 Control de Gastos

**Ruta:** `/procesos/gastos`

Registro de gastos operativos por privada:
- Tipo de gasto (catalogo)
- Descripcion, fecha de pago, comprobante
- Total y tipo de pago

### 8.9 Reportes y Graficas

#### Accesos - Consultas (`/reportes/accesos-consultas`)
- Filtros por privada, rango de fechas, tipo de gestion, estatus
- Tabla paginada con exportacion

#### Accesos - Graficas (`/reportes/accesos-graficas`)
- Grafica por tipo de gestion (barras)
- Grafica por estatus (pie)
- Grafica por dia (linea temporal)
- Grafica por hora del dia (barras)
- Filtros por privada y rango de fechas

#### Supervision de Llamadas (`/reportes/supervision-llamadas`)
- Reporte de evaluaciones por supervisor
- Filtros por fecha

### 8.10 Video Web (Visualizacion en Vivo)

**Ruta:** `/herramientas/video-web`
**Archivo:** `src/app/(dashboard)/herramientas/video-web/page.tsx`
**Permiso requerido:** Video Web (configurable por grupo de usuario)

Modulo de visualizacion en tiempo real de camaras IP via agentes MQTT:

1. **Selector de privada** con lista de sitios que tienen agentes activos
2. **Grid de camaras** con refresco automatico (200ms, sin flicker)
3. **Drag-and-drop** para reordenar camaras (orden persistido por sitio en `data/camera-order.json`)
4. **Click-to-expand** para vista ampliada de una camara individual
5. **Indicador de estado** del agente (online/offline, last seen, hostname)
6. **Indicador MQTT** muestra estado de conexion al broker

**Flujo de datos:**
```
Agente (Windows) --MQTT cmd--> start_stream
Agente captura frames del DVR (Hikvision/Dahua)
Agente --HTTP POST--> /api/camera-frames (JPEG buffer)
Frame Store (memoria) almacena ultimo frame por camara
Navegador --GET--> /api/camera-proxy/lookup (descubre camaras)
Navegador renderiza frames con patron preload+swap (sin flicker)
```

### 8.11 Monitoreo de Portones (Gate Monitor)

**Ruta:** `/herramientas/monitoreo-portones`
**Archivo:** `src/app/(dashboard)/herramientas/monitoreo-portones/page.tsx`

Dashboard de monitoreo automatico de portones con tres pestanas:

#### Pestana: Alertas
- **Tarjetas resumen:** Alertas hoy, promedio tiempo abierto, porton mas frecuente, alertas activas
- **Historial de alertas** con timestamp, duracion, diferencia de histograma
- **Evidencia fotografica** (thumbnails de la camara al momento de la alerta)
- **Filtros por fecha:** Hoy, 7 dias, 30 dias

#### Pestana: Log de Lecturas
- **Tarjetas resumen:** Total lecturas, abiertas, alertas, variacion promedio
- **Tabla color-coded:** verde=normal, naranja=abierto, rojo=alerta disparada
- **Contador consecutivo** (ej: 2/4 lecturas necesarias para alerta)
- **Filtros** por fecha y zona

#### Pestana: Configuracion
- **Selector de privada y camara** con preview en vivo
- **Dibujo interactivo de zonas ROI** (hasta 3 por camara, colores rojo/azul/verde)
- **Captura de imagen de referencia** por zona
- **Gestion de telefonos WhatsApp** para notificaciones
- **Configuracion de intervalo** de verificacion (default 5 min)
- **Umbral de consecutivos** (lecturas consecutivas de "abierto" antes de alertar)

### 8.12 Consola Monitorista (Terminal de Monitoreo)

**Ruta:** `/procesos/monitoristas`
**Archivo:** `src/app/(dashboard)/procesos/monitoristas/page.tsx` (1100+ lineas)

Consola integrada para operadores de monitoreo que combina:

1. **Softphone AccesPhone** para recibir/hacer llamadas SIP
2. **CameraGrid** para visualizacion de camaras en vivo
3. **Formulario de registro de accesos** con busqueda de residentes
4. **Lookup automatico** de residencia por CallerID de interfon
5. **Enmascaramiento de telefonos** (solo ultimos 4 digitos visibles)
6. **Indicadores MQTT** mostrando estado de conexion y agentes activos

**Integracion con MQTT:**
- Consulta `/api/gate-monitor/agents` cada 15 segundos
- Muestra badge de estado MQTT (verde=conectado, rojo=desconectado)
- Lista agentes con indicador pulsante (online) o gris (offline)
- Solo muestra estado de agentes cuando hay una privada seleccionada

---

## 9. API REST - Endpoints

Todos los endpoints requieren autenticacion JWT via NextAuth. Retornan JSON.

### Autenticacion

| Metodo | Endpoint | Descripcion |
|---|---|---|
| POST | `/api/auth/[...nextauth]` | Login/logout via NextAuth |

### Dashboard

| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/dashboard` | Estadisticas generales del dia |

### Catalogos

Cada catalogo implementa el patron CRUD estandar:

| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/catalogos/{recurso}` | Listar con paginacion/filtros |
| POST | `/api/catalogos/{recurso}` | Crear nuevo registro |
| GET | `/api/catalogos/{recurso}/[id]` | Obtener por ID |
| PUT | `/api/catalogos/{recurso}/[id]` | Actualizar registro |
| DELETE | `/api/catalogos/{recurso}/[id]` | Eliminar (soft delete) |

**Recursos disponibles:**
`empleados`, `fallas`, `materiales`, `privadas`, `puestos`, `residencias`, `residentes`, `tarjetas`, `turnos`

### Procesos

| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/procesos/registro-accesos` | Listar accesos (filtros: privadaId, fechas, estatus, search) |
| POST | `/api/procesos/registro-accesos` | Crear registro de acceso |
| GET | `/api/procesos/registro-accesos/[id]` | Obtener acceso por ID |
| PUT | `/api/procesos/registro-accesos/[id]` | Actualizar acceso |
| GET | `/api/procesos/registro-accesos/buscar-residencia` | Buscar residencias por privada (params: privadaId, search) |
| GET | `/api/procesos/registro-accesos/buscar-por-telefono` | Buscar residencia por telefono interfon |
| GET | `/api/procesos/registro-accesos/buscar-solicitante` | Buscar solicitante por nombre |
| POST | `/api/procesos/registro-accesos/registrar-visitante` | Registrar nuevo visitante |
| POST | `/api/procesos/registro-accesos/registrar-general` | Registrar solicitante general |
| GET | `/api/procesos/registro-accesos/resolver-nombre` | Resolver nombre de solicitante por ID |
| GET/POST | `/api/procesos/asignacion-tarjetas` | CRUD de asignaciones |
| GET/POST | `/api/procesos/ordenes-servicio` | CRUD de ordenes de servicio |
| GET/POST | `/api/procesos/supervision-llamadas` | CRUD de supervisiones |
| GET/POST | `/api/procesos/gastos` | CRUD de gastos |

### Reportes

| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/reportes/accesos-consultas` | Consulta de accesos con filtros |
| GET | `/api/reportes/accesos-graficas` | Datos agregados para graficas |
| GET | `/api/reportes/supervision-llamadas` | Reporte de supervisiones |

### Seguridad

| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET/POST | `/api/seguridad/usuarios` | CRUD de usuarios |
| GET/POST | `/api/seguridad/grupos-usuarios` | CRUD de grupos |
| GET | `/api/seguridad/permisos` | Gestion de permisos |
| GET | `/api/seguridad/mis-permisos` | Permisos del usuario autenticado |
| POST | `/api/seguridad/sync-procesos` | Sincronizacion de procesos/menu |

### Camera Proxy (Sistema de Videovigilancia)

| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/camera-proxy` | Proxy de snapshot de camara IP con autenticacion HTTP Digest |
| GET | `/api/camera-proxy/lookup` | Descubrimiento de camaras por telefono o privada_id |
| GET | `/api/camera-proxy/diag` | Diagnosticos del sistema de camaras (memoria, version Node) |
| GET | `/api/camera-proxy/order` | Guardar orden de camaras (drag-and-drop) |

**Parametros de `/api/camera-proxy`:**
- `telefono` o `privada_id` - Identifica la privada
- `cam` - Indice de camara (1, 2 o 3)

**Caracteristicas del proxy:**
- Autenticacion HTTP Digest con cache de nonce (60s TTL)
- Semaforo por host (max 2 concurrentes) para evitar saturar el DVR
- Placeholder SVG en caso de error ("Sin senal")
- Soporte de cancelacion por desconexion del cliente
- Diagnosticos por request (auth, fetch, retry)

### Camera Frames (Agentes de Captura)

| Metodo | Endpoint | Descripcion |
|---|---|---|
| POST | `/api/camera-frames` | Recepcion de frames JPEG desde agentes (auth: Bearer token) |
| POST | `/api/camera-frames/command` | Enviar comando MQTT al agente (start_stream, stop_stream) |
| GET | `/api/camera-frames/channels` | Listar canales descubiertos por agente |
| GET | `/api/camera-frames/poll` | Agente consulta comandos pendientes (fallback sin MQTT) |

### Gate Monitor (Monitoreo de Portones)

| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/gate-monitor/status` | Estado actual de todas las zonas monitoreadas |
| GET | `/api/gate-monitor/config` | Obtener configuracion de monitoreo por siteId+camId |
| PUT | `/api/gate-monitor/config` | Crear/actualizar configuracion de monitoreo |
| DELETE | `/api/gate-monitor/config` | Eliminar configuracion de monitoreo |
| GET | `/api/gate-monitor/alerts` | Historial de alertas con estadisticas |
| GET | `/api/gate-monitor/comparisons` | Log de lecturas/comparaciones por zona |
| GET | `/api/gate-monitor/agents` | Estado de conexion MQTT y agentes online/offline |
| POST | `/api/gate-monitor/reference` | Capturar imagen de referencia para una zona |
| GET | `/api/gate-monitor/reference` | Obtener imagen de referencia de una zona |

### Privadas

| Metodo | Endpoint | Descripcion |
|---|---|---|
| GET | `/api/privadas/list` | Listar privadas disponibles (para selectores) |

---

## 10. Sistema VoIP/SIP - AccesPhone

### Descripcion

**AccesPhone** (`src/components/AccesPhone.tsx`) es un softphone WebRTC completo integrado directamente en la pagina de Registro de Accesos. Permite al operador recibir y realizar llamadas SIP desde el navegador web.

### Arquitectura de Comunicacion

```
+-------------------+     WebSocket (WSS:8089)     +-------------------+
|                   |<---------------------------->|                   |
|  Navegador Web    |     SIP Signaling            |  PBX Asterisk     |
|  (AccesPhone)     |                              |  accessbotpbx     |
|                   |<---------------------------->|  .info             |
|  JsSIP 3.13       |     WebRTC (SRTP)            |                   |
|  + WebRTC API     |     Audio Media              |  Extensiones:     |
|                   |                              |  1000-1099        |
+-------------------+                              +---+---------------+
                                                       |
                                               +-------v-------+
                                               |  Interfones   |
                                               |  IP de las    |
                                               |  privadas     |
                                               +---------------+
```

### Configuracion SIP (AccesPhoneConfig)

La configuracion se almacena en `localStorage` bajo la clave `accesphone_config`.

| Parametro | Valor Default | Descripcion |
|---|---|---|
| `wsServer` | `wss://accessbotpbx.info:8089/ws` | Servidor WebSocket SIP |
| `sipDomain` | `accessbotpbx.info` | Dominio SIP |
| `extension` | *(configurado por operador)* | Numero de extension (ej: 1001) |
| `sipPassword` | *(configurado por operador)* | Contrasena SIP |
| `displayName` | `Monitoreo` | Nombre para CallerID |
| `micDeviceId` | `""` (default del navegador) | ID del dispositivo de microfono seleccionado |
| `cameraProxyUrl` | `camera_proxy.php` | URL del proxy PHP para imagenes de camaras |
| `cameraRefreshMs` | `500` | Intervalo de refresco de imagen de camara (ms) |
| `videoAutoOnCall` | `true` | Mostrar video automaticamente al iniciar/recibir llamada |

### Funcionalidades del Softphone

1. **Registro SIP:** Conexion automatica al PBX via WebSocket con auto-reconexion
2. **Llamadas entrantes:** Deteccion automatica, timbre visual, boton de contestar
3. **Llamadas salientes:** Marcador numerico integrado
4. **Control de audio:**
   - Mute/Unmute de microfono
   - Control de volumen del altavoz
   - **Selector de microfono:** Lista de dispositivos de audio disponibles en el panel de configuracion, evitando seleccionar dispositivos no validos como "Stereo Mix"
5. **Identificacion de llamadas:** Al recibir una llamada, busca automaticamente la residencia por `telefono_interfon` via API
6. **Panel de configuracion:** Organizado en secciones:
   - **SIP:** Extension, password, servidor WebSocket, dominio SIP
   - **Audio:** Selector de microfono con lista de dispositivos disponibles
   - **Video/Camaras:** URL proxy camaras, intervalo de refresco, video automatico en llamadas
7. **Integracion con video:** Opcion de mostrar automaticamente el feed de camara al recibir/realizar llamada, usando proxy PHP (`camera_proxy.php`) para obtener imagenes de camaras IP
8. **Sistema de diagnosticos:** Herramientas de debugging accesibles desde la consola del navegador:
   - `window.__sipDiag()` - Muestra tabla completa de eventos diagnosticos
   - `window.__sipDiagSummary()` - Resumen con timeline de eventos
   - Registra hasta 200 entradas con timestamps y tiempos relativos

### Auto-Reconexion

El softphone implementa reconexion automatica con backoff exponencial:
- **Delay base:** 2 segundos
- **Delay maximo:** 30 segundos
- **Intentos maximos:** Ilimitados (0)
- **Formula:** `min(base * 2^intento, max_delay)`

### Flujo de Llamada Entrante

```
1. Interfon de residencia marca al PBX
2. PBX rutea la llamada a la extension del operador
3. JsSIP recibe evento "newRTCSession" (incoming)
4. AccesPhone muestra alerta visual con numero entrante
5. AccesPhone llama API buscar-por-telefono con el CallerID
6. Si encuentra residencia: pre-selecciona privada y residencia en el formulario
7. Operador contesta -> WebRTC establece flujo de audio bidireccional
8. Operador gestiona el acceso y registra en el sistema
9. Al colgar, se calcula la duracion de la llamada
```

### Manejo de Audio

- **Pre-adquisicion de stream:** Antes de contestar o llamar, se solicita `getUserMedia()` para evitar errores `NotReadableError`
- **Seleccion de microfono:** Si el operador configuro un `micDeviceId`, se usa `{ deviceId: { exact: id } }` como constraint; de lo contrario se usa el microfono default del navegador
- **Enumeracion de dispositivos:** Antes de adquirir el microfono, se enumeran todos los dispositivos de audio y se registran en consola para diagnostico
- **Fallback silencioso:** Si el microfono no esta disponible, se genera un stream silencioso con `AudioContext` para mantener la llamada funcional
- **ICE/STUN:** No se configuran servidores ICE/STUN explicitamente en las opciones de llamada; se usan los defaults del navegador y del PBX

### CameraGrid - Visualizacion de Camaras

**Archivo:** `src/components/CameraGrid.tsx`

Componente React que muestra un grid de hasta 3 camaras IP por privada, obteniendo snapshots via el proxy `/api/camera-proxy`.

**Caracteristicas:**
- Refresco automatico configurable (default 500ms)
- Navegacion entre camaras disponibles
- Vista a pantalla completa (fullscreen) por camara
- Placeholder SVG cuando no hay senal
- Deteccion automatica de camaras disponibles via `/api/camera-proxy/lookup`
- **Sistema de diagnosticos** accesible desde consola:
  - `window.__camDiag()` - Log completo de eventos de camara con timestamps
  - Registra hasta 300 entradas por camara (fetch, error, timeout, etc.)

---

## 11. Sistema MQTT y Agentes de Captura

### 11.1 Arquitectura MQTT

El sistema utiliza un broker **Mosquitto** para comunicacion bidireccional en tiempo real entre el servidor Next.js y los agentes de captura remotos (Windows).

**Archivo principal:** `src/lib/mqtt-client.ts`

#### Configuracion del Broker

| Parametro | Valor | Variable de entorno |
|---|---|---|
| URL | `mqtt://50.62.182.131:1883` | `MQTT_BROKER_URL` |
| Usuario | `admin` | `MQTT_USER` |
| Contrasena | `v1de0acces0s` | `MQTT_PASSWORD` |

#### Topicos MQTT

| Topico | Direccion | Proposito |
|---|---|---|
| `videoaccesos/{site_id}/cmd` | Servidor -> Agente | Comandos (start_stream, stop_stream) |
| `videoaccesos/{site_id}/channels` | Agente -> Servidor | Canales descubiertos en el DVR |
| `videoaccesos/{site_id}/status` | Agente -> Servidor | Heartbeat cada 30s + LWT offline |
| `videoaccesos/{site_id}/alert` | Servidor -> Suscriptores | Alertas de portones abiertos |

#### Formato de Comandos

```json
{
  "cmd": "start_stream",
  "cam_id": 3,
  "fps": 10,
  "duration": 0,
  "quality": 55,
  "width": 640,
  "mode": "snapshot"
}
```

#### Funciones Exportadas

| Funcion | Descripcion |
|---|---|
| `initMqtt()` | Inicializa conexion al broker (llamado al arrancar el servidor) |
| `publishCommand(siteId, cmd)` | Envia comando start/stop stream al agente |
| `publishAlert(siteId, alert)` | Publica alerta de porton abierto |
| `isAgentOnline(siteId)` | Verifica si el agente esta activo (timeout 90s) |
| `getAgentStatuses()` | Array de todos los agentes con estado online/offline |
| `isMqttConnected()` | Health check de la conexion al broker |

### 11.2 Frame Store (Almacen de Frames)

**Archivo:** `src/lib/frame-store.ts`

Almacen en memoria del ultimo frame JPEG de cada camara de cada agente:

- **Limpieza automatica** de frames con mas de 15 segundos de antiguedad
- **Reference counting** de viewers (saber cuantos operadores ven cada sitio)
- **Persistencia de orden** de camaras (drag-and-drop) en `data/camera-order.json`
- **Cola de comandos** pendientes para agentes (fallback sin MQTT)
- **Tracking de canales** descubiertos por agente

| Funcion | Descripcion |
|---|---|
| `putFrame(siteId, camId, buffer)` | Almacena frame JPEG entrante |
| `getFrame(siteId, camId)` | Obtiene ultimo frame (si < 15s) |
| `getFrameAge(siteId, camId)` | Edad del frame en milisegundos |
| `setSiteChannels(siteId, channels)` | Registra canales del DVR |
| `getCameraOrder(siteId)` / `setCameraOrder()` | Orden de camaras persistido |
| `addViewer(siteId)` / `removeViewer(siteId)` | Tracking de operadores activos |

### 11.3 Agentes de Captura (CaptureAgent)

**Archivos:**
- `agent-windows/CaptureAgent.ps1` - PowerShell 7+ (948 lineas)
- `agent-windows/CaptureAgent-PS5.ps1` - PowerShell 5.1 compatible (1200+ lineas)

Los agentes son scripts PowerShell que corren en PCs Windows en cada privada, conectados al DVR local via red LAN.

#### Flujo de Operacion

```
1. Agente inicia -> lee config.json (site_id, DVR IP, MQTT broker)
2. Conecta al broker MQTT -> suscribe a videoaccesos/{site_id}/cmd
3. Publica heartbeat cada 30s en videoaccesos/{site_id}/status
4. Configura LWT (Last Will Testament) para notificar desconexion
5. Al recibir "start_stream":
   a. Descubre canales del DVR (API ISAPI/Hikvision o Dahua)
   b. Publica canales en videoaccesos/{site_id}/channels
   c. Captura snapshots JPEG en paralelo de cada camara
   d. Envia frames via HTTP POST a /api/camera-frames (Bearer token)
6. Al recibir "stop_stream": detiene captura
```

#### Configuracion del Agente (`config.json`)

```json
{
  "site_id": "72",
  "dvr_ip": "192.168.1.64",
  "dvr_username": "admin",
  "dvr_password": "...",
  "backend_url": "https://accesoswhatsapp.info/api/camera-frames",
  "agent_token": "b7f9dee88d...",
  "mqtt_broker": "50.62.182.131",
  "mqtt_port": 1883,
  "mqtt_user": "admin",
  "mqtt_password": "..."
}
```

#### Caracteristicas

- **Auto-instalacion** como Tarea Programada de Windows (se ejecuta al iniciar sesion)
- **Wizard interactivo** de configuracion en primer inicio
- **DVRs soportados:** Hikvision (ISAPI), Dahua, camaras RTSP/HTTP genericas
- **Auto-recovery:** watchdog timer reinicia si el proceso muere
- **Operacion 24/7** probada con uptime de 90+ dias
- **Dos versiones:** PS7+ (usa -shr/-shl) y PS5.1 (usa [math]::Floor para compatibilidad)

#### Token de Autenticacion

| Parametro | Valor |
|---|---|
| Variable de entorno | `AGENT_TOKEN` o `CAMERA_AGENT_TOKEN` |
| Configuracion servidor | `src/lib/agent-config.ts` |
| Metodo de auth | Header `Authorization: Bearer {token}` |

### 11.4 MQTT Relay (Softphone)

**Archivo:** `softphone/mqtt_relay.php`

Bridge HTTP para activacion de relays (portones/plumas) desde el softphone:

| Accion | Metodo | Descripcion |
|---|---|---|
| `activate` | POST/GET | Activa relay via bot orquestador (PULSE/ON/OFF/TOGGLE) |
| `status` | GET | Estado de todos los relays |
| `relays` | GET | Lista relays filtrados por residencial |
| `health` | GET | Health check del bot orquestador |
| `mqtt_direct` | POST/GET | Publicacion directa a MQTT (fallback) |

**Dispositivos soportados:** ESP32, ESP32 Legacy, Dingtian

---

## 12. Sistema de Monitoreo de Portones

### 12.1 Motor de Deteccion (Gate Monitor)

**Archivo:** `src/lib/gate-monitor.ts` (727 lineas)

Sistema de deteccion automatica de portones abiertos basado en comparacion de histogramas de imagen. No requiere GPU ni IA - usa la libreria **sharp** (~2ms por frame).

#### Algoritmo de Deteccion

```
1. Solicita snapshot al agente via MQTT (start_stream temporal)
2. Espera hasta 15 segundos por frame del agente
3. Extrae region de interes (ROI) del frame usando coordenadas normalizadas
4. Calcula histograma RGB de la region (bins de 16)
5. Compara con histograma de referencia usando distancia Bhattacharyya
6. Si diferencia > umbral (default 30%): marca como "abierto"
7. Si N lecturas consecutivas son "abierto" (default 4): dispara alerta
8. Alerta se publica via MQTT y HTTP al bot para WhatsApp
```

#### Modelo de Datos

**Configuracion por zona:**
```typescript
interface GateZone {
  id: string;                    // UUID unico por zona
  roi: { x, y, width, height }; // Coordenadas 0-1 normalizadas
  alias: string;                 // "Porton vehicular", "Puerta peatonal"
  threshold: number;             // 0-1, default 0.3 (30%)
  consecutiveThreshold: number;  // Lecturas para alerta (default 4)
  referenceHistogram: number[];  // Histograma de referencia
  referenceImageB64: string;     // Thumbnail de referencia (base64)
  enabled: boolean;
}
```

**Estados de zona:** `closed` | `open` | `unknown` | `no-signal`

#### Persistencia (Archivos JSON)

| Archivo | Contenido | Limite |
|---|---|---|
| `data/gate-monitors.json` | Configuracion de todos los monitores | Sin limite |
| `data/gate-alerts.json` | Historial de alertas disparadas | Sin limite |
| `data/gate-comparisons.json` | Log de todas las lecturas | Max 2000 registros |

#### Ciclo de Monitoreo

- El motor corre en background con intervalo de 30 segundos
- Cada configuracion define su propio intervalo (default 300s = 5 min)
- Con 4 lecturas consecutivas necesarias: ~20 min para disparar alerta
- Evidencia fotografica guardada en `public/static/gate-alerts/`

### 12.2 Enrutamiento de Alertas

```
Gate Monitor detecta porton abierto
        |
        +---> MQTT: videoaccesos/{siteId}/alert
        |         |
        |         +---> Bot Plugin Vision (Python)
        |                   |
        |                   +---> WhatsApp via Twilio
        |                         (a telefonos configurados + supervisores)
        |
        +---> HTTP POST: http://localhost:5501/api/vision/alert
                  |
                  +---> Bot Orquestador (Flask)
```

#### Payload de Alerta

```json
{
  "type": "gate_alert",
  "site_id": "72",
  "cam_id": 3,
  "zone_id": "uuid-xxx",
  "alias": "Porton Principal",
  "privada": "Privada Los Pinos",
  "state": "open",
  "held_seconds": 120,
  "difference": 45,
  "message": "Porton 'Porton Principal' lleva 2 min abierto (diferencia: 45%)",
  "image_url": "/static/gate-alerts/alert-72-3-uuid-2026-04-01.jpg",
  "notify_phones": ["5216672639025"],
  "ts": "2026-04-01T12:00:00.000Z"
}
```

### 12.3 Bot Plugin Vision

**Archivo:** `bot-plugin-vision/plugin_vision.py`

Plugin para el bot orquestador (Flask) que:

1. **Suscribe a MQTT** topico `videoaccesos/+/alert` para recibir alertas
2. **Envia WhatsApp** con foto evidencia via Twilio a supervisores
3. **Throttling:** Maximo 1 alerta por porton cada 5 minutos
4. **Intent de consulta:** Responde a "portones", "estado portones" con estado actual
5. **Health check** para verificar conexion MQTT

**Dependencias Python:** `paho-mqtt`, `requests`, `mysql-connector-python`, `twilio`

---

## 13. Sistema de Autenticacion y Seguridad

### Autenticacion

**Archivo:** `src/lib/auth.ts`

El sistema utiliza **NextAuth.js v4** con estrategia JWT:

1. **Proveedor:** `CredentialsProvider` (usuario + contrasena)
2. **Verificacion de contrasena:** Compatibilidad con hash DES crypt del sistema PHP legacy
   - El sistema PHP original usa: `substr(crypt($password, 0), 0, 10)`
   - Se replica con la libreria `unix-crypt-td-js`
   - Se extrae el salt (primeros 2 caracteres del hash) y se compara
3. **Sesion JWT:** Duracion de 2 horas
4. **Datos en sesion:** usuarioId, empleadoId, puestoId, nroOperador, privadaId, modificarFechas

### Proteccion de Rutas

**Archivo:** `src/middleware.ts`

Todas las rutas estan protegidas excepto:
- `/login` - Pagina de login
- `/api/auth/*` - Endpoints de NextAuth
- `/_next/*` - Assets estaticos de Next.js
- `/favicon.ico`

### Modelo de Permisos

```
Usuario (N) <---> (N) GrupoUsuario (N) <---> (N) Subproceso
                        via                        via
                  GrupoUsuarioDetalle         PermisoAcceso

Proceso (padre)
   |
   +-- Proceso (hijo) -- jerarquia de menu
         |
         +-- Subproceso (accion individual)
```

- Los **Usuarios** pertenecen a uno o mas **Grupos de Usuario**
- Cada **Grupo** tiene **Permisos de Acceso** a **Subprocesos**
- Los **Procesos** representan items del menu y forman una jerarquia padre-hijo
- Los **Subprocesos** son las acciones individuales (ver, crear, editar, eliminar)

### Bitacora de Sesiones

Cada inicio de sesion se registra en `BitacoraInicio`:
- Usuario, fecha/hora de inicio, fecha/hora de cierre
- Direccion IP y hostname

---

## 14. Flujo Operativo Principal

### Escenario Tipico: Visitante Solicita Acceso

```
                     CASETA DE ACCESO

Visitante            Interfon             Operador (Navegador)
    |                    |                        |
    |  Presiona boton    |                        |
    |------------------->|                        |
    |                    |   Llamada SIP          |
    |                    |----------------------->|
    |                    |                        |
    |                    |              [AccesPhone suena]
    |                    |              [Identifica residencia]
    |                    |              [Pre-carga datos en formulario]
    |                    |                        |
    |                    |   Operador contesta    |
    |                    |<-----------------------|
    |                    |                        |
    |  "Soy Juan,       |                        |
    |   vengo a ver      |                        |
    |   al Sr. Garcia"   |                        |
    |------------------->|----------------------->|
    |                    |                        |
    |                    |              [Busca solicitante]
    |                    |              [Selecciona tipo: Visita]
    |                    |              [Verifica con residente]
    |                    |                        |
    |                    |   "Puede pasar"        |
    |                    |<-----------------------|
    |                    |                        |
    |   Porton abre      |              [Registra acceso: ACCESO]
    |<-------------------|              [Guarda duracion llamada]
    |                    |                        |
    |                    |              [Acceso visible en dashboard]
```

### Escenario: Acceso Rechazado

1. Visitante llama desde interfon
2. Operador contesta e identifica
3. Residente no autoriza o no contesta
4. Operador registra acceso con estatus **"Rechazado"**
5. Visitante no puede ingresar

### Escenario: Solo Informacion

1. Residente llama para preguntar algo (horarios, contactos, etc.)
2. Operador atiende la consulta
3. Se registra con estatus **"Informo"** (sin acceso fisico)

---

## 15. Configuracion y Despliegue

### Variables de Entorno Requeridas (v2)

```env
# Base de datos
DATABASE_URL="mysql://usuario:contrasena@host:3306/wwwvideo_video_accesos"

# NextAuth
NEXTAUTH_SECRET="clave-secreta-aleatoria"
NEXTAUTH_URL="http://dominio-o-ip:3000"

# MQTT (comunicacion con agentes)
MQTT_BROKER_URL="mqtt://50.62.182.131:1883"
MQTT_USER="admin"
MQTT_PASSWORD="..."

# Agentes de captura
AGENT_TOKEN="token-secreto-para-autenticacion-de-agentes"
```

### Comandos de Desarrollo

```bash
# Instalar dependencias
cd video-accesos-app
npm install

# Generar cliente Prisma
npm run db:generate

# Ejecutar en desarrollo
npm run dev

# Construir para produccion
npm run build

# Iniciar en produccion
npm run start

# Abrir Prisma Studio (explorador visual de BD)
npm run db:studio

# Sincronizar esquema desde BD existente
npm run db:pull
```

### Despliegue en Produccion

1. **Sistema Legacy (v1):**
   - Servido por Apache en puerto 80
   - URL: `http://50.62.182.131/syscbctlmonitoreo/`
   - Configurado via `.htaccess` con `mod_rewrite`

2. **Sistema Moderno (v2):**
   - Servido por Node.js (Next.js) en puerto 3000
   - Se recomienda usar un reverse proxy (Nginx/Apache) para HTTPS
   - Requiere Node.js 18+ en el servidor

### Requisitos del Servidor

| Componente | Requisito Minimo |
|---|---|
| OS | Linux (Ubuntu/CentOS) o Windows Server |
| Node.js | 18.x o superior |
| MySQL | 5.7 o superior |
| PHP | 7.x (para sistema legacy) |
| Apache | 2.4 con mod_rewrite |
| RAM | 2 GB minimo |
| Almacenamiento | 10 GB minimo |

### Requisitos del Cliente (Navegador)

| Requisito | Detalle |
|---|---|
| Navegador | Chrome 90+, Firefox 90+, Edge 90+ |
| WebRTC | Soporte nativo requerido para softphone |
| Microfono | Requerido para llamadas SIP |
| Altavoz/Audifonos | Requerido para recibir audio |
| HTTPS | Recomendado (requerido para WebRTC en produccion) |
| Resolucion | 1280x720 minimo recomendado |

---

## 16. Diagrama de Arquitectura

### Arquitectura de Red

```
                        INTERNET
                           |
                    +------v------+
                    |  Router/    |
                    |  Firewall   |
                    +------+------+
                           |
     +------------+--------+--------+-------------+
     |            |                  |             |
+----v------+ +---v----------+ +----v--------+ +--v-----------+
| Servidor  | | PBX SIP      | | PC Privada  | | PC Privada   |
| Web       | | accessbotpbx | | (Agente 1)  | | (Agente N)   |
| 50.62.182 | | .info        | |             | |              |
| .131      | |              | | CaptureAgent| | CaptureAgent |
|           | | - WSS :8089  | | PowerShell  | | PowerShell   |
| - Apache  | | - SIP :5060  | |      |      | |      |       |
|   :80     | |              | |  +---v---+  | |  +---v---+   |
| - Node.js | +------+-------+ |  | DVR   |  | |  | DVR   |   |
|   :3000   |        |         |  | Hikv/ |  | |  | Hikv/ |   |
| - MySQL   | +------v-------+ |  | Dahua |  | |  | Dahua |   |
|   :3306   | | Interfones   | |  +-------+  | |  +-------+   |
| - MQTT    | | IP (privada) | +-------------+ +--------------+
|   :1883   | +--------------+
| - Bot     |
|   :5501   |
+-----------+
```

### Flujo de Datos

```
[Navegador] --HTTPS--> [Next.js App Router] --Prisma--> [MySQL]
     |                        |
     |--WSS (SIP)----------> [PBX Asterisk]
     |                        |
     |--HTTP (frames)------> [Frame Store (memoria)]
     |                        |
     |                  [MQTT Broker :1883]
     |                   /          \
     |          [Agente 1]    ...  [Agente N]  (CaptureAgent PowerShell)
     |              |                  |
     |          [DVR/Camaras]    [DVR/Camaras]  (LAN privada)
     |
     |          [Gate Monitor] --sharp--> [Deteccion histograma]
     |                |
     |          [Bot Plugin Vision] --Twilio--> [WhatsApp alertas]
```

---

## 17. Glosario

| Termino | Definicion |
|---|---|
| **Privada** | Fraccionamiento residencial cerrado (condominio/colonia privada) |
| **Residencia** | Domicilio individual dentro de una privada |
| **Residente** | Persona que habita en una residencia |
| **Visitante** | Persona que frecuenta una residencia (registrado) |
| **Registro General** | Solicitante que no es residente ni visitante |
| **Operador** | Empleado que atiende la caseta de acceso |
| **Tipo de Gestion** | Clasificacion del motivo de acceso (visita, proveedor, etc.) |
| **Estatus de Acceso** | Resultado de la gestion (acceso, rechazo, informe) |
| **Interfon** | Dispositivo de comunicacion en la entrada de la privada |
| **Telefono Interfon** | Numero telefonico asignado al interfon de una residencia |
| **Folio H** | Folio de asignacion de tarjeta con renovacion |
| **Folio B** | Folio de asignacion de tarjeta sin renovacion |
| **RFID** | Radio-Frequency Identification (tarjetas de acceso) |
| **PBX** | Private Branch Exchange (central telefonica) |
| **SIP** | Session Initiation Protocol (protocolo de telefonia IP) |
| **WebRTC** | Web Real-Time Communication (comunicacion en tiempo real) |
| **JsSIP** | Libreria JavaScript para SIP sobre WebSocket |
| **AccesPhone** | Componente softphone integrado en el sistema |
| **Relay** | Dispositivo electromecanico para abrir portones/plumas |
| **DNS (en Privada)** | Direccion del dispositivo de red del interfon |
| **Supervision de Llamada** | Evaluacion de calidad del servicio del operador |
| **Orden de Servicio** | Solicitud de mantenimiento tecnico |
| **Recuperacion Patrimonial** | Registro de danos o incidentes patrimoniales |
| **MQTT** | Message Queuing Telemetry Transport - protocolo de mensajeria ligero |
| **Mosquitto** | Broker MQTT open-source utilizado para comunicacion servidor-agentes |
| **CaptureAgent** | Script PowerShell que corre en PCs Windows para capturar frames de DVRs |
| **DVR** | Digital Video Recorder - grabador de video que conecta multiples camaras |
| **Frame** | Imagen JPEG individual capturada de una camara |
| **Frame Store** | Almacen en memoria del servidor para los ultimos frames de cada camara |
| **Gate Monitor** | Sistema de deteccion automatica de portones abiertos por histograma |
| **ROI** | Region of Interest - area rectangular seleccionada para analisis de imagen |
| **Histograma** | Distribucion de colores en una imagen, usado para comparar frames |
| **Distancia Bhattacharyya** | Metrica estadistica para comparar histogramas de imagen |
| **LWT** | Last Will Testament - mensaje MQTT automatico al desconectarse un agente |
| **Heartbeat** | Mensaje periodico (cada 30s) que indica que un agente esta activo |
| **Video Web** | Modulo de visualizacion en vivo de camaras con reordenamiento drag-and-drop |
| **Bot Orquestador** | Servicio Python/Flask que gestiona WhatsApp, relays y alertas |
| **Bot Plugin Vision** | Plugin del bot que recibe alertas MQTT y envia WhatsApp via Twilio |
| **Twilio** | Servicio cloud para envio de mensajes WhatsApp programaticos |
| **sharp** | Libreria Node.js de procesamiento de imagenes de alto rendimiento |
| **ISAPI** | Protocolo HTTP de Hikvision para control y captura de camaras/DVRs |

---

## Historial del Proyecto

| Fecha | Evento |
|---|---|
| Enero 2013 | Inicio del proyecto con PHP/CodeIgniter + jQuery |
| 2013-2024 | Desarrollo y operacion del sistema legacy (v1) |
| 2025 | Inicio de migracion a Next.js/React (v2) |
| 2025 | Integracion con BD de produccion MySQL |
| 2025 | Implementacion de softphone JsSIP/WebRTC |
| 2025-2026 | Desarrollo de modulos CRUD, reportes y graficas |
| Febrero 2026 | Comunicacion SIP funcional entre extensiones |
| Febrero 2026 | Documentacion tecnica completa (manual v1.0) |
| Marzo 2026 | Selector de microfono en panel de configuracion del softphone |
| Marzo 2026 | Sistema de diagnosticos SIP (`window.__sipDiag()`) |
| Marzo 2026 | Eliminacion de configuracion TURN Server (no necesaria) |
| Marzo 2026 | Actualizacion de documentacion tecnica v2.1 |
| Marzo-Abril 2026 | Sistema de monitoreo de portones (gate monitor) con deteccion por histograma |
| Marzo-Abril 2026 | Alertas WhatsApp automaticas via bot plugin vision + Twilio |
| Abril 2026 | Migracion de comunicacion agentes de HTTP polling a MQTT |
| Abril 2026 | CaptureAgent PowerShell con soporte MQTT (start/stop stream, heartbeat, LWT) |
| Abril 2026 | CaptureAgent-PS5 compatible con PowerShell 5.1 (Windows built-in) |
| Abril 2026 | Video Web: visualizacion en vivo de camaras con drag-and-drop |
| Abril 2026 | Monitoreo de portones: multi-zona (hasta 3 ROI por camara) |
| Abril 2026 | Consola monitorista integrada (softphone + camaras + registro de accesos) |
| Abril 2026 | Indicadores de estado MQTT y agentes en todas las interfaces |
| Abril 2026 | Frame Store en memoria con limpieza automatica (15s TTL) |
| Abril 2026 | MQTT Relay para activacion de relays desde softphone |
| Abril 2026 | Actualizacion de documentacion tecnica v3.0 |

---

*Este manual fue generado como parte del desarrollo del sistema Video Accesos v2.*
*Ultima actualizacion: 12 de abril de 2026.*
