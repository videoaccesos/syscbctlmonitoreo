# Analisis del Sistema de Control de Acceso - Video Accesos

**Fecha:** 2026-02-28
**Alcance:** Analisis completo de arquitectura, seguridad y recomendaciones

---

## 1. Resumen Ejecutivo

**Video Accesos** es un sistema de control de acceso y videomonitoreo para fraccionamientos residenciales privados, en operacion desde enero 2013. Actualmente conviven dos arquitecturas:

| Componente | Tecnologia | Estado |
|------------|-----------|--------|
| App Legacy (v1) | PHP/CodeIgniter 2.x en Apache (puerto 80) | Activo, en fase de retiro |
| App Moderna (v2) | Next.js 16 / React 19 / Prisma 5 (puerto 3000) | Activo, reemplazando v1 |
| Base de Datos | MySQL 5.7 (`wwwvideo_video_accesos`) | Compartida por ambas apps |
| VoIP | JsSIP 3.13 + Asterisk PBX (`accessbotpbx.info`) | Softphone integrado |
| Servidor | 50.62.182.131 | Produccion |

---

## 2. Arquitectura del Sistema

### 2.1 Stack de Infraestructura

```
Servidor: 50.62.182.131
+-- App Legacy: PHP/CodeIgniter en Apache (Puerto 80)
+-- App Moderna: Next.js en Node.js (Puerto 3000)
+-- Base de Datos: MySQL 5.7 (wwwvideo_video_accesos)
+-- PBX: Asterisk/FreePBX en accessbotpbx.info:8089/ws (SIP/WebRTC)
+-- Camaras IP: RTSP/HTTP con proxy camera_proxy.php
```

### 2.2 Tecnologias (App Moderna v2)

- **Frontend:** Next.js 16.1.6 (App Router), React 19.2.3, TailwindCSS 4, React Hook Form + Zod, Recharts, Lucide React
- **Backend:** Next.js API Routes, Prisma 5.22 ORM, NextAuth.js 4.24 (JWT), ExcelJS, Nodemailer
- **VoIP:** JsSIP 3.13.5 (WebRTC/SIP)
- **Base de datos:** MySQL 5.7, Prisma `relationMode: "prisma"` (foreign keys virtuales)

### 2.3 Esquema de Base de Datos

30+ modelos organizados en dominios funcionales:

**Seguridad:** `Usuario`, `GrupoUsuario`, `GrupoUsuarioDetalle`, `Proceso`, `Subproceso`, `PermisoAcceso`, `BitacoraInicio`

**Catalogos:** `Empleado`, `Puesto`, `Turno`, `Falla`, `CodigoServicio`, `Diagnostico`, `Material`, `TipoGasto`, `Folio`, `Tarjeta`

**Gestion de Comunidades:** `Privada`, `PrivadaRelay`, `Residencia`, `Residente`, `ResidenteTarjeta`, `ResidenteTarjetaNoRenovacion`, `Visita`, `RegistroGeneral`

**Procesos de Negocio:** `RegistroAcceso`, `SupervisionLlamada`, `OrdenServicio`, `OrdenServicioSeguimiento`, `Gasto`, `RecuperacionPatrimonial`, `RecuperacionPatrimonialSeguimiento`

### 2.4 Relaciones Principales

```
Privada (fraccionamiento) --> [N] Residencias
                          --> [N] RegistrosAcceso
                          --> [N] OrdenesServicio
                          --> [N] Gastos

Residencia --> [N] Residentes
           --> [N] Visitas
           --> [N] RegistrosAcceso

Residente --> [N] ResidenteTarjeta (tarjetas renovables)
          --> [N] ResidenteTarjetaNoRenovacion

RegistroAcceso <-> SupervisionLlamada (1-a-1)

Empleado --> [N] RegistrosAcceso (como operador)
         --> [N] OrdenesServicio (3 roles: solicitante, tecnico, cierre)

Usuario --> [1] Empleado
        --> [1] Privada
        --> [N] GrupoUsuarioDetalle
        --> [N] BitacoraInicio
```

---

## 3. Modulos Funcionales

### 3.1 Registro de Accesos (Modulo Principal)

**Flujo operativo:**
1. Visitante llega a la caseta de vigilancia
2. Operador busca residencia/visitante en el sistema
3. Softphone SIP realiza llamada al interfon del residente via PBX
4. Operador registra resultado: Autorizado (1), Denegado (2), Informativo (3)
5. Sistema registra todo en `RegistroAcceso` con pista de auditoria

**Componentes clave:**
- `AccesPhone.tsx` - Softphone SIP integrado (600+ lineas)
- `/procesos/registro-accesos` - Pagina principal de registro
- `/api/procesos/registro-accesos` - API con busquedas por residencia, solicitante, telefono

### 3.2 Ordenes de Servicio

Gestion de solicitudes de mantenimiento con asignacion de tecnicos, seguimiento de estatus y cierre tecnico.

### 3.3 Asignacion de Tarjetas RFID

Gestion de tarjetas RFID para residentes: asignacion, precios, seguros, renovacion y contratos.

### 3.4 Control de Gastos

Registro y seguimiento de gastos operativos por fraccionamiento y tipo de gasto.

### 3.5 Supervision de Llamadas

Evaluacion de calidad de atencion del operador: saludo, identificacion de empresa, amabilidad, gestion de demanda, etc.

### 3.6 Reportes

- Consulta de accesos con filtros y exportacion a Excel
- Graficas de tendencias (accesos diarios, por fraccionamiento, horas pico)
- Metricas de calidad de llamadas

### 3.7 Seguridad y Permisos

- CRUD de usuarios del sistema
- Grupos de usuarios con asignacion de permisos
- Modelo de permisos basado en procesos/subprocesos

---

## 4. Endpoints de la API

**Total:** 40+ endpoints REST organizados por dominio

### Autenticacion
- `POST /api/auth/signin` - Login (NextAuth)
- `GET /api/auth/session` - Sesion activa

### Catalogos (CRUD completo)
- `/api/catalogos/empleados` - Empleados
- `/api/catalogos/puestos` - Puestos
- `/api/catalogos/privadas` - Fraccionamientos
- `/api/catalogos/residencias` - Residencias
- `/api/catalogos/residentes` - Residentes
- `/api/catalogos/tarjetas` - Tarjetas RFID
- `/api/catalogos/fallas` - Codigos de falla
- `/api/catalogos/materiales` - Materiales
- `/api/catalogos/turnos` - Turnos

### Procesos
- `/api/procesos/registro-accesos` - Registros de acceso + busquedas auxiliares
- `/api/procesos/ordenes-servicio` - Ordenes de servicio
- `/api/procesos/asignacion-tarjetas` - Asignacion de tarjetas
- `/api/procesos/gastos` - Gastos
- `/api/procesos/supervision-llamadas` - Supervision de llamadas

### Reportes
- `/api/reportes/accesos-consultas` - Reporte de accesos (con exportacion)
- `/api/reportes/accesos-graficas` - Graficas de accesos
- `/api/reportes/supervision-llamadas` - Reporte de supervision

### Seguridad
- `/api/seguridad/usuarios` - Usuarios
- `/api/seguridad/grupos-usuarios` - Grupos de usuarios
- `/api/seguridad/permisos` - Permisos de acceso

### Dashboard
- `/api/dashboard` - Estadisticas del dia

---

## 5. Auditoria de Seguridad

### 5.1 Hallazgos CRITICOS

#### C1. Contrasenas almacenadas en texto plano (CWE-256)
**Archivo:** `api/seguridad/usuarios/route.ts`, lineas 110-114

Los usuarios nuevos creados mediante la API v2 almacenan la contrasena **sin ningun hash**. Un acceso no autorizado a la base de datos expone inmediatamente todas las credenciales.

```typescript
contrasena: contrasena,  // TEXTO PLANO
```

#### C2. Hashing DES Crypt debil para autenticacion (CWE-328)
**Archivo:** `lib/auth.ts`, lineas 8-16

El sistema legacy usa DES crypt (algoritmo de los anos 70) con salt de 2 caracteres y truncamiento a 10 caracteres. Es trivialmente crackeable con GPUs modernas.

#### C3. Hashes y salts de contrasena enviados a logs (CWE-532)
**Archivo:** `lib/auth.ts`, lineas 69-72

Cada intento de login registra en consola el hash almacenado, el salt y el hash calculado. En produccion esto es un riesgo grave.

```typescript
console.log("[AUTH] Hash almacenado:", usuario.contrasena, ...);
console.log("[AUTH] Salt:", salt, "Hash calculado:", hashCalculado, ...);
```

#### C4. NEXTAUTH_SECRET con valor placeholder
**Archivo:** `.env`

Si el secreto de JWT es predecible, los tokens de sesion pueden ser forjados por cualquier atacante.

#### C5. Contrasena SIP almacenada en localStorage (CWE-922)
**Archivo:** `components/AccesPhone.tsx`, lineas 68-90

La configuracion SIP completa (incluyendo `sipPassword`) se serializa a `localStorage` sin cifrado. Cualquier vulnerabilidad XSS puede leerla.

---

### 5.2 Hallazgos ALTOS

#### A1. Politica de contrasenas extremadamente debil (CWE-521)
Contrasenas limitadas a 6-10 caracteres sin requisitos de complejidad, dictado por la columna legacy `varchar(10)`.

#### A2. Sin control de acceso basado en roles (RBAC) en la API (CWE-862)
Todas las rutas API verifican unicamente la **existencia** de una sesion. No se verifica si el usuario tiene permisos para la operacion. Cualquier usuario autenticado puede:
- Crear/modificar/eliminar otros usuarios (incluyendo admins)
- Modificar permisos de cualquier grupo
- Acceder a registros de todos los fraccionamientos

El modelo de permisos existe en la BD (`PermisoAcceso`, `GrupoUsuario`) pero **nunca se aplica del lado del servidor**.

#### A3. Sin limitacion de tasa (rate limiting) en ningun endpoint (CWE-307)
No hay proteccion contra ataques de fuerza bruta en login, creacion de usuarios, ni ningun endpoint.

#### A4. Direccion del servidor PBX hardcodeada (CWE-798)
La URL `wss://accessbotpbx.info:8089/ws` esta expuesta en el bundle de JavaScript del cliente.

---

### 5.3 Hallazgos MEDIOS

| # | Hallazgo | CWE |
|---|----------|-----|
| M1 | Sin validacion de longitud en parametros de busqueda | CWE-20 |
| M2 | Paginacion sin limite maximo (DoS potencial) | CWE-770 |
| M3 | Logging verbose con stack traces completos | CWE-209 |
| M4 | Sin proteccion CSRF, CORS ni CSP configurados | CWE-352 |
| M5 | Comparacion de contrasenas no es constant-time | CWE-208 |

### 5.4 Hallazgos BAJOS

| # | Hallazgo |
|---|----------|
| L1 | Debug de JsSIP habilitado incondicionalmente en produccion |
| L2 | Filtrado inconsistente por `estatusId` (soft-delete) en consultas |
| L3 | `parseInt` sin validacion de rangos en IDs |

---

### 5.5 Matriz de Riesgo

| Severidad | Cantidad | Impacto |
|-----------|----------|---------|
| CRITICO | 5 | Compromiso total de credenciales, suplantacion de sesiones |
| ALTO | 4 | Escalacion de privilegios, fuerza bruta, exposicion de infraestructura |
| MEDIO | 5 | DoS, fuga de informacion, CSRF |
| BAJO | 3 | Fuga menor de informacion |

---

## 6. Recomendaciones Prioritarias

### Prioridad 1 - Inmediato

1. **Rotar credenciales:** Cambiar contrasena de BD y NEXTAUTH_SECRET. Asegurar que `.env` no este en el historial de git.
2. **Eliminar logs de contrasenas:** Remover las lineas `console.log` que imprimen hashes y salts en `auth.ts`.
3. **Implementar hashing moderno:** Migrar de DES crypt/texto plano a bcrypt o Argon2. Requiere ampliar la columna `contrasena` en la BD.

### Prioridad 2 - Corto Plazo

4. **Implementar RBAC en la API:** Verificar permisos del usuario en cada endpoint usando el modelo `PermisoAcceso` existente.
5. **Agregar rate limiting:** Al menos en el endpoint de login (ej. 5 intentos por minuto por IP).
6. **Cifrar credenciales SIP:** Mover configuracion SIP a sesion del servidor o cifrar en localStorage.
7. **Limitar paginacion:** Establecer un maximo razonable (ej. 100) para `pageSize`/`limit`.

### Prioridad 3 - Mediano Plazo

8. **Agregar headers de seguridad:** CSP, X-Frame-Options, X-Content-Type-Options via middleware de Next.js.
9. **Mover configuracion de PBX a variables de entorno:** Evitar hardcodear URLs de infraestructura en el codigo cliente.
10. **Ampliar politica de contrasenas:** Minimo 12 caracteres con requisitos de complejidad.
11. **Deshabilitar debug de JsSIP:** Solo activar en modo desarrollo.

---

## 7. Estadisticas del Proyecto

| Metrica | Valor |
|---------|-------|
| Archivos PHP (legacy) | 381 |
| Archivos TypeScript/TSX (v2) | 67 |
| Modelos de base de datos (Prisma) | 30+ |
| Endpoints API | 40+ |
| Paginas UI | 22 |
| Inicio del proyecto | Enero 2013 |
| Migracion a v2 | 2025-2026 |

---

## 8. Conclusion

El sistema Video Accesos es una solucion madura y funcional con 13+ anos de operacion. La migracion a Next.js/React/Prisma es un paso positivo, pero la transicion ha heredado debilidades de seguridad del sistema legacy y agregado algunas nuevas. Los hallazgos criticos (almacenamiento de contrasenas, logging de hashes, falta de RBAC) deben abordarse de inmediato para proteger la informacion de los residentes y la integridad operativa del sistema.

La arquitectura general es solida y escalable. Con las correcciones de seguridad recomendadas, el sistema estara en una posicion mucho mas robusta para su operacion continua.
