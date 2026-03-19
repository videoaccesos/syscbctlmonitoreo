# Project Analysis: Video Accesos (syscbctlmonitoreo)

## Overview

**Video Accesos** is a gated community access management and video surveillance system. It uses a **dual-stack architecture** — a legacy PHP/CodeIgniter v1 system (started in 2013) being progressively modernized with a Next.js v2 frontend.

---

## Technology Stack

### Legacy System (v1)
| Component | Technology |
|-----------|-----------|
| Framework | CodeIgniter 2.x (PHP) |
| Frontend | jQuery 2.1.4, Bootstrap, FusionCharts, jqPlot |
| Server | Apache with mod_rewrite |
| Port | 80 (HTTP) |

### Modern System (v2)
| Component | Technology |
|-----------|-----------|
| Framework | Next.js 16.1.6 (App Router) |
| Frontend | React 19.2.3, TailwindCSS 4, Recharts 3.7 |
| ORM | Prisma 5.22 |
| Auth | NextAuth.js 4.24 (JWT, 2h sessions) |
| Forms | React Hook Form 7 + Zod 4 |
| Tables | @tanstack/react-table 8 |
| Reports | ExcelJS 4.4, Nodemailer 7 |
| Port | 3000 (Node.js) |

### Shared Infrastructure
| Component | Technology |
|-----------|-----------|
| Database | MySQL 5.7 (`wwwvideo_video_accesos`) |
| VoIP | JsSIP 3.13.5 (WebRTC), Asterisk/FreePBX |
| PBX | `wss://accessbotpbx.info:8089/ws` |
| Server IP | 50.62.182.131 |

---

## Project Structure

```
syscbctlmonitoreo/
├── index.php                    # CodeIgniter entry point
├── .htaccess                    # Apache rewrite rules
├── application/                 # CodeIgniter v1 (MVC)
│   ├── controllers/             # ~40 controllers
│   │   ├── catalogos/           # CRUD (privadas, empleados, tarjetas...)
│   │   ├── procesos/            # Business logic (accesos, ordenes, gastos...)
│   │   ├── reportes/            # Report generation
│   │   └── seguridad/           # Users & permissions
│   ├── models/                  # Data access layer
│   ├── views/                   # PHP templates
│   └── config/                  # CI configuration
├── system/                      # CodeIgniter framework core
├── js/                          # Legacy JS (jQuery, Bootstrap, FusionCharts)
├── css/                         # Stylesheets
├── less/                        # LESS preprocessor
├── img/                         # Static assets
├── bd/                          # Database schema (2013 dump)
├── reports/                     # Legacy report system (PHPExcel, FPDF)
├── softphone/                   # Standalone softphone & camera APIs
│   ├── api_privada.php          # Community/video/relay lookup API
│   ├── camera_proxy.php         # IP camera proxy (Hikvision, HTTP Digest)
│   └── mqtt_relay.php           # MQTT relay control
└── video-accesos-app/           # === Modern v2 (Next.js) ===
    ├── prisma/schema.prisma     # 30+ models, 733 lines
    └── src/
        ├── app/
        │   ├── (auth)/login/    # Login page
        │   ├── (dashboard)/     # Dashboard + all modules
        │   └── api/             # 30+ REST API route groups
        ├── components/
        │   ├── AccesPhone.tsx   # WebRTC softphone (62KB)
        │   ├── CameraGrid.tsx   # Camera grid viewer (18KB)
        │   └── layout/          # Sidebar, header, providers
        └── lib/
            ├── auth.ts          # NextAuth + DES crypt compat
            ├── prisma.ts        # Prisma singleton
            └── logger.ts        # File-based logger
```

---

## Functional Modules

### Catalogs (CRUD)
- **Privadas** — Gated communities with DNS/video/relay config
- **Residencias** — Individual homes with intercom phone numbers
- **Empleados** — Operators and staff with shift assignments
- **Tarjetas** — RFID card inventory management
- **Puestos / Turnos / Fallas / Materiales** — Supporting catalogs

### Processes (Core Operations)
- **Registro de Accesos** — Main module: incoming intercom calls, visitor/resident access logging, approval/rejection workflows, call duration tracking
- **Asignación de Tarjetas** — RFID card allocation (Folio H renewable, Folio B non-renewable)
- **Órdenes de Servicio** — Maintenance tracking with automatic folio numbering
- **Supervisión de Llamadas** — Operator call quality evaluation
- **Monitoristas** — Operator/shift management
- **Gastos** — Operational expense tracking by community

### Reports & Analytics
- **Accesos Consultas** — Search/filter/export access records
- **Accesos Gráficas** — Charts by type, status, day, hourly distribution (Recharts)
- **Supervisión Llamadas** — Quality evaluation reports

### Security & Administration
- **Usuarios** — Account management (DES crypt password compatibility)
- **Grupos Usuarios** — Permission grouping
- **Permisos Acceso** — Granular access control per subprocess

### Dashboard
- Real-time statistics (30s refresh)
- Today's access cards (allowed, rejected, info-only)
- Active communities count, total residences, recent accesses

---

## Specialized Systems

### AccesPhone Softphone (`AccesPhone.tsx` — 62KB)
- WebRTC-based via JsSIP
- Auto-registration to PBX via WSS
- Incoming call detection with automatic residence lookup
- Microphone selection, call duration tracking
- Auto-reconnection with exponential backoff
- Diagnostic system: `window.__sipDiag()`

### Camera Proxy System
- HTTP Digest authentication proxy for Hikvision IP cameras
- Rate limiting (max 2 concurrent per host), nonce caching (60s TTL)
- SVG placeholder for signal loss
- Static channel config (701–802) + database-driven configs
- Grid display of up to 3 cameras per community with auto-refresh

### Legacy Report System
- PDF via FPDF, Excel via PHPExcel
- Templates: accesos_atendidos, asignacion_tarjetas, supervision_llamadas, recuperacionpatrimonial, privadasresidentes, relaysactivacion

---

## Database Schema (Prisma — 30+ Models)

**Security:** Usuario, GrupoUsuario, GrupoUsuarioDetalle, Proceso, Subproceso, PermisoAcceso, BitacoraInicio

**Catalogs:** Puesto, Empleado, Turno, Privada, PrivadaRelay, Residencia, Residente, Visita, RegistroGeneral, Tarjeta, ResidenteTarjeta, Falla, Material, Clasificacion, CodigoServicio, Diagnostico, Folio

**Operations:** RegistroAcceso, SupervisionLlamada, OrdenServicio, OrdenServicioSeguimiento, Gasto, TipoGasto, RecuperacionPatrimonial

---

## Authentication & Authorization

- **Auth Provider:** NextAuth.js CredentialsProvider
- **Password Compat:** DES crypt (`unix-crypt-td-js`) matching PHP's `substr(crypt($password, 0), 0, 10)`
- **Sessions:** JWT tokens, 2-hour duration
- **Authorization:** Users → Groups → Subprocesses (hierarchical menu permissions)
- **Route Protection:** All `/dashboard/*` routes protected via middleware

---

## REST API Endpoints (v2)

| Group | Path | Purpose |
|-------|------|---------|
| Auth | `/api/auth/[...nextauth]` | NextAuth endpoints |
| Dashboard | `/api/dashboard` | Daily statistics |
| Catalogos | `/api/catalogos/{resource}[/id]` | CRUD operations |
| Procesos | `/api/procesos/{module}/*` | Business operations |
| Reportes | `/api/reportes/{type}` | Report data |
| Seguridad | `/api/seguridad/{resource}` | User/group/permission mgmt |
| Camera | `/api/camera-proxy[/lookup\|diag]` | Camera snapshot proxy |

---

## Deployment Requirements

- Node.js 18+, MySQL 5.7+, PHP 7.x (legacy), Apache 2.4
- Minimum: 2GB RAM, 10GB storage
- Environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Timezone: America/Mazatlan

---

## Key Observations

1. **Active Migration**: The project is transitioning from CodeIgniter to Next.js while both systems coexist sharing the same MySQL database
2. **Legacy Password Compatibility**: The v2 system maintains backward compatibility with PHP DES crypt passwords
3. **No Foreign Keys**: Prisma uses `relationMode = "prisma"` (application-level relations) — the legacy database lacks native foreign keys
4. **Comprehensive Feature Set**: Access control, VoIP softphone, IP camera surveillance, RFID cards, maintenance orders, expense tracking, quality supervision, and reporting
5. **Long History**: Project started in June 2013, with the modern rewrite beginning in 2025–2026
