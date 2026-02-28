# Manual Tecnico - Sistema de Control de Acceso y Videomonitoreo (Video Accesos)

**Version:** 2.0
**Fecha:** Febrero 2026
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
11. [Sistema de Autenticacion y Seguridad](#11-sistema-de-autenticacion-y-seguridad)
12. [Flujo Operativo Principal](#12-flujo-operativo-principal)
13. [Configuracion y Despliegue](#13-configuracion-y-despliegue)
14. [Diagrama de Arquitectura](#14-diagrama-de-arquitectura)
15. [Glosario](#15-glosario)

---

## 1. Resumen Ejecutivo

**Video Accesos** es un sistema integral de control de acceso y videomonitoreo disenado para administrar comunidades residenciales privadas (fraccionamientos cerrados). El sistema permite a operadores de caseta gestionar el ingreso de visitantes, residentes y proveedores mediante un flujo que integra:

- **Registro de accesos** con identificacion de solicitante
- **Comunicacion VoIP/SIP** (softphone integrado) para contactar residentes via interfon
- **Videomonitoreo** de camaras en accesos de las privadas
- **Gestion de tarjetas RFID** para acceso vehicular y peatonal
- **Reportes y graficas** de actividad operativa
- **Supervision de calidad** de llamadas de operadores
- **Ordenes de servicio** para mantenimiento de equipos
- **Control de gastos** operativos por privada

El proyecto inicio en enero de 2013 como una aplicacion PHP con CodeIgniter (v1) y fue migrado en 2025-2026 a una arquitectura moderna con **Next.js 16, React 19, Prisma ORM y TailwindCSS** (v2), conservando la misma base de datos MySQL de produccion.

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
|  +------------+--------------+   +---------------+---------------+  |
|               |                                  |                  |
|               +----------------------------------+                  |
|                              |                                      |
|                   +----------v----------+                           |
|                   |   MySQL 5.7         |                           |
|                   |   wwwvideo_video_   |                           |
|                   |   accesos           |                           |
|                   +---------------------+                           |
+---------------------------------------------------------------------+
              |                                    |
    +---------v---------+              +-----------v-----------+
    |   PBX SIP         |              |   Camaras IP          |
    |   accessbotpbx    |              |   (RTSP/HTTP)         |
    |   .info:8089/ws   |              |   via proxy camara    |
    +-------------------+              +-----------------------+
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
| Camaras | IP Cameras + Proxy HTTP | Videovigilancia en accesos de privadas |
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
- **STUN servers:** Google STUN (`stun.l.google.com:19302`)

---

## 4. Estructura del Proyecto

```
syscbctlmonitoreo/
|
|-- index.php                    # Entry point del sistema legacy (CodeIgniter)
|-- .htaccess                    # Rewrite rules para Apache + CORS
|-- LEEME.txt                    # Nota historica del proyecto (inicio 2013)
|-- Manual tecnico.pdf           # Manual tecnico anterior (referencia)
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
|   +-- jssip.min.js             # JsSIP v3.10 (version standalone)
|
+-- video-accesos-app/           # === APLICACION MODERNA (v2) ===
    |-- package.json             # Dependencias Node.js
    |-- tsconfig.json            # Configuracion TypeScript
    |-- prisma/
    |   |-- schema.prisma        # Esquema de BD (734 lineas, 30+ modelos)
    |   +-- seed.ts              # Datos semilla para desarrollo
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
        |   |   |-- procesos/      # Paginas de procesos (5 modulos)
        |   |   |-- reportes/      # Paginas de reportes (3 modulos)
        |   |   +-- seguridad/     # Paginas de seguridad (3 modulos)
        |   +-- api/               # API Routes (endpoints REST)
        |       |-- auth/          # Autenticacion NextAuth
        |       |-- dashboard/     # Estadisticas dashboard
        |       |-- catalogos/     # APIs de catalogos
        |       |-- procesos/      # APIs de procesos
        |       |-- reportes/      # APIs de reportes
        |       +-- seguridad/     # APIs de seguridad
        |-- components/
        |   |-- AccesPhone.tsx     # Softphone SIP/WebRTC integrado
        |   +-- layout/
        |       |-- sidebar.tsx    # Barra lateral de navegacion
        |       |-- header.tsx     # Encabezado con info de usuario
        |       +-- providers.tsx  # SessionProvider de NextAuth
        |-- lib/
        |   |-- auth.ts           # Configuracion NextAuth + DES crypt
        |   +-- prisma.ts         # Singleton del cliente Prisma
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
   - Procesos (5 submenus)
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
| Gastos | `/procesos/gastos` | Control de gastos por privada |

#### Reportes (Consulta y analisis)

| Pagina | Ruta | Descripcion |
|---|---|---|
| Accesos Consultas | `/reportes/accesos-consultas` | Busqueda y filtrado de accesos |
| Accesos Graficas | `/reportes/accesos-graficas` | Graficas por tipo, estatus, dia y hora |
| Supervision Llamadas | `/reportes/supervision-llamadas` | Reporte de evaluaciones |

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

### Configuracion SIP

| Parametro | Valor Default | Descripcion |
|---|---|---|
| `wsServer` | `wss://accessbotpbx.info:8089/ws` | Servidor WebSocket SIP |
| `sipDomain` | `accessbotpbx.info` | Dominio SIP |
| `extension` | *(configurado por operador)* | Numero de extension (ej: 1001) |
| `sipPassword` | *(configurado por operador)* | Contrasena SIP |
| `displayName` | *(nombre del operador)* | Nombre para CallerID |

### Funcionalidades del Softphone

1. **Registro SIP:** Conexion automatica al PBX via WebSocket con auto-reconexion
2. **Llamadas entrantes:** Deteccion automatica, timbre visual, boton de contestar
3. **Llamadas salientes:** Marcador numerico integrado
4. **Control de audio:**
   - Mute/Unmute de microfono
   - Control de volumen del altavoz
5. **Identificacion de llamadas:** Al recibir una llamada, busca automaticamente la residencia por `telefono_interfon` via API
6. **Panel de configuracion:** El operador puede ajustar extension, contrasena, servidor, etc.
7. **Integracion con video:** Opcion de mostrar automaticamente el feed de camara al recibir/realizar llamada

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
- **Fallback silencioso:** Si el microfono no esta disponible, se genera un stream silencioso con `AudioContext` para mantener la llamada funcional
- **Servidores ICE/STUN configurados:**
  - `stun:stun.l.google.com:19302`
  - `stun:stun1.l.google.com:19302`

---

## 11. Sistema de Autenticacion y Seguridad

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

## 12. Flujo Operativo Principal

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

## 13. Configuracion y Despliegue

### Variables de Entorno Requeridas (v2)

```env
# Base de datos
DATABASE_URL="mysql://usuario:contrasena@host:3306/wwwvideo_video_accesos"

# NextAuth
NEXTAUTH_SECRET="clave-secreta-aleatoria"
NEXTAUTH_URL="http://dominio-o-ip:3000"
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

## 14. Diagrama de Arquitectura

### Arquitectura de Red

```
                        INTERNET
                           |
                    +------v------+
                    |  Router/    |
                    |  Firewall   |
                    +------+------+
                           |
              +------------+------------+
              |                         |
      +-------v-------+       +--------v--------+
      | Servidor Web   |       | PBX SIP         |
      | 50.62.182.131  |       | accessbotpbx    |
      |                |       | .info           |
      | - Apache :80   |       |                 |
      |   (PHP/CI)     |       | - WSS :8089     |
      |                |       | - SIP :5060     |
      | - Node.js :3000|       |                 |
      |   (Next.js)    |       +--------+--------+
      |                |                |
      | - MySQL :3306  |       +--------v--------+
      |                |       | Interfones IP   |
      +----------------+       | (por privada)   |
                               +-----------------+

                               +------------------+
                               | Camaras IP       |
                               | (RTSP/HTTP)      |
                               | Por privada:     |
                               | video_1, 2, 3    |
                               +------------------+
```

### Flujo de Datos

```
[Navegador] --HTTPS--> [Next.js App Router] --Prisma--> [MySQL]
     |                        |
     |--WSS (SIP)----------> [PBX Asterisk]
     |                        |
     |--HTTP (proxy)-------> [Camaras IP]
```

---

## 15. Glosario

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
| Febrero 2026 | Documentacion tecnica completa (este manual) |

---

*Este manual fue generado como parte del desarrollo del sistema Video Accesos v2.*
*Ultima actualizacion: 28 de febrero de 2026.*
