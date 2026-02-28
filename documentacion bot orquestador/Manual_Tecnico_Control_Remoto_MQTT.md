# Manual Tecnico: Sistema VideoAccesos - Control Remoto de Relays MQTT

**Version:** 2.0
**Fecha:** 2026-02-28
**Sistema:** Bot Orquestador VideoAccesos
**Autor:** Equipo VideoAccesos

---

## Indice

1. [Vision General del Sistema](#1-vision-general-del-sistema)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Base de Datos](#4-base-de-datos)
5. [Servicio MQTT (mqtt_service.py)](#5-servicio-mqtt)
6. [Plugin de Control de Relays (plugin_mqtt_relay.py)](#6-plugin-de-control-de-relays)
7. [Motor de Escenarios](#7-motor-de-escenarios)
8. [Tipos de Dispositivo Soportados](#8-tipos-de-dispositivo-soportados)
9. [Panel de Administracion Web](#9-panel-de-administracion-web)
10. [Control Remoto - Interfaz Web](#10-control-remoto-interfaz-web)
11. [App Movil (PWA)](#11-app-movil-pwa)
12. [Integracion WhatsApp (Twilio)](#12-integracion-whatsapp-twilio)
13. [Integracion DTMF (FreePBX)](#13-integracion-dtmf-freepbx)
14. [Integracion Camaras Hikvision](#14-integracion-camaras-hikvision)
15. [Flujos de Operacion](#15-flujos-de-operacion)
16. [Configuracion y Despliegue](#16-configuracion-y-despliegue)
17. [API REST](#17-api-rest)
18. [Seguridad](#18-seguridad)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. Vision General del Sistema

VideoAccesos es un sistema de control de accesos para residenciales que permite operar plumas, portones y otros dispositivos electromagneticos mediante relays controlados por protocolo MQTT. El sistema ofrece multiples interfaces de control:

- **WhatsApp** (via Twilio) - Residentes, supervisores y operadores
- **Panel Web** (Flask + Bootstrap 5) - Administradores
- **App Movil PWA** - Operadores en campo
- **DTMF** (via FreePBX) - Activacion por teclado telefonico
- **API REST** - Integraciones externas

### Componentes Principales

```
+------------------+     +------------------+     +------------------+
|   WhatsApp       |     |   Panel Admin    |     |    App Movil     |
|   (Twilio)       |     |   (Web Browser)  |     |    (PWA)         |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
+--------+------------------------+------------------------+---------+
|                    Bot Orquestador (Flask)                          |
|                      bot_orquestador.py                            |
|                                                                    |
|  +------------------+  +------------------+  +------------------+  |
|  | ModuleRegistry   |  |  routes_admin.py |  | modulo_contexto  |  |
|  |  (registry.py)   |  |  (Blueprint)     |  |  (sesiones)      |  |
|  +--------+---------+  +--------+---------+  +------------------+  |
|           |                      |                                  |
|  +--------v---------+           |                                  |
|  | PluginMQTTRelay  |<----------+                                  |
|  | plugin_mqtt_relay |                                             |
|  +--------+---------+                                              |
|           |                                                        |
|  +--------v---------+                                              |
|  |  mqtt_service.py |                                              |
|  |  (paho-mqtt)     |                                              |
+--+--------+----------------------------------------------------------+
            |
            v
   +--------+---------+
   |   Broker MQTT     |
   |   (Mosquitto)     |
   +--------+---------+
            |
   +--------+------------------------------------------+
   |                    |                               |
   v                    v                               v
+--+-------+   +-------+--------+   +-----------------+--+
|  ESP32   |   |  ESP32 Legacy  |   |  Dingtian DT-R008  |
| (8 relay)|   | (8 relay)      |   |  (8/16 relay)      |
+----------+   +----------------+   +--------------------+
```

---

## 2. Arquitectura del Sistema

### 2.1 Arquitectura de Plugins

El sistema utiliza una arquitectura de plugins donde cada funcionalidad es un modulo independiente que se registra en el `ModuleRegistry`:

```
modulo_base.py (ABC)
    |
    +-- PluginQR          (Generacion de codigos QR de acceso)
    +-- PluginGPS         (Rastreo GPS via Traccar)
    +-- PluginEstado      (Estado del sistema)
    +-- PluginTurno       (Gestion de turnos)
    +-- PluginMQTTRelay   (Control de relays MQTT) <-- Este manual
```

Cada plugin implementa la clase abstracta `ModuloBase` y declara:

| Metodo              | Descripcion                                           |
|---------------------|-------------------------------------------------------|
| `get_name()`        | Nombre unico del modulo                               |
| `get_intents()`     | Intenciones que maneja (keywords + prioridad)         |
| `get_menu_entries()` | Entradas de menu por rol                             |
| `handle_intent()`   | Logica principal de procesamiento                     |
| `get_routes()`      | Rutas HTTP opcionales                                 |
| `init()`            | Inicializacion con contexto compartido (Twilio, etc.) |
| `health_check()`    | Estado de salud para /health                          |

### 2.2 Patron de Comunicacion

```
Usuario -> WhatsApp -> Twilio Webhook -> Flask /whatsapp
    -> ModuleRegistry.detect_intent()
    -> PluginMQTTRelay.handle_intent()
    -> mqtt_service.publish()
    -> Broker MQTT
    -> ESP32/Dingtian
    -> Relay fisico se activa
```

### 2.3 Stack Tecnologico

| Componente       | Tecnologia                                |
|------------------|-------------------------------------------|
| Backend          | Python 3.10+ / Flask 2.3+                |
| Base de Datos    | MySQL 8.0 (mysql-connector-python)        |
| MQTT             | Mosquitto Broker + paho-mqtt 1.6+         |
| Mensajeria       | Twilio (WhatsApp Business API)            |
| Frontend Admin   | Bootstrap 5.3 + Jinja2                    |
| Frontend Movil   | PWA standalone (HTML/CSS/JS nativo)       |
| Autenticacion    | WebAuthn (passkeys) + sesion Flask        |
| Hardware Relays  | ESP32 (custom firmware) + Dingtian DT-R008|
| Camaras          | Hikvision DVR (ISAPI)                     |
| GPS              | Traccar Server                            |

---

## 3. Estructura del Proyecto

```
bot-multitarea/
|-- bot_orquestador.py          # Punto de entrada principal (Flask app)
|-- config.py                   # Configuracion no sensible
|-- db.py                       # Pool de conexiones MySQL
|-- registry.py                 # Registro central de modulos
|-- modulo_base.py              # ABC para plugins
|-- modulo_contexto.py          # Motor de sesiones conversacionales
|-- modulo_menus.py             # Traductor de comandos numericos
|-- mqtt_service.py             # Cliente MQTT compartido
|-- routes_admin.py             # Blueprint Flask panel admin
|-- manager_turno.py            # Gestion de turnos operadores
|
|-- plugins/
|   |-- __init__.py
|   |-- plugin_mqtt_relay.py    # *** PLUGIN PRINCIPAL DE RELAYS ***
|   |-- plugin_qr.py           # Generacion de QR
|   |-- plugin_gps.py          # Rastreo GPS
|   |-- plugin_estado.py       # Estado del sistema
|   |-- plugin_turno.py        # Turnos operadores
|
|-- migrations/
|   |-- 001_mqtt_tables.sql     # Tablas: device_relays, escenarios, pasos, logs
|   |-- 002_seed_estancia5.sql  # Datos de prueba (8 relays reales)
|   |-- 003_residencial_mqtt_devices.sql  # Columnas mqtt_device_1/2
|   |-- 004_arcadia_device_type.sql       # Soporte Dingtian/Arcadia
|   |-- 005_relay_nombre_pulse_duration.sql  # Nombre amigable + duracion
|   |-- 006_webauthn_credentials.sql      # Tabla WebAuthn
|
|-- templates/admin/
|   |-- base_admin.html         # Layout base con sidebar
|   |-- dashboard.html          # Panel principal
|   |-- devices.html            # CRUD devices (DVRs, etc.)
|   |-- residenciales.html      # CRUD residenciales
|   |-- escenarios.html         # CRUD escenarios
|   |-- relays.html             # CRUD relays
|   |-- control_remoto.html     # *** CONTROL REMOTO INTERACTIVO ***
|   |-- control_movil.html      # *** APP MOVIL PWA ***
|   |-- logs.html               # Visor de logs de ejecucion
|   |-- login.html              # Login admin
|
|-- static/
|   |-- icons/relay-192.svg     # Icono PWA 192px
|   |-- icons/relay-512.svg     # Icono PWA 512px
|   |-- manifest_relay.json     # Manifest PWA
|   |-- sw_relay.js             # Service Worker PWA
|   |-- qr_codes/               # Imagenes generadas (QRs, evidencias)
|
|-- scripts/
|   |-- crear_template_abrir.py # Crea Content Template en Twilio
|   |-- dump_schema.py          # Utilidad para exportar schema BD
|
|-- requirements.txt            # Dependencias Python
|-- .env / .env.example         # Variables de entorno
```

---

## 4. Base de Datos

### 4.1 Modelo Entidad-Relacion (Tablas MQTT)

```
+-------------------+       +-------------------+       +-------------------+
|  residenciales    |       |   device_relays   |       |    escenarios     |
|-------------------|       |-------------------|       |-------------------|
| id (PK, INT)     |       | id (PK, INT)      |       | id (PK, INT)      |
| residencial (VCH) |<--+  | mqtt_device       |   +-->| nombre            |
| nombre            |   |  | relay_number      |   |   | descripcion       |
| mqtt_device_1     |   |  | funcion_relay     |   |   | residencial_id ---+-->
| mqtt_device_2     |   +--| residencial_id    |   |   | trigger_type      |
| canal_vista_entr  |      | device_type       |   |   | trigger_value     |
| canal_evid_apert  |      | tipo_funcion      |   |   | activo            |
| canal_evid_qr     |      | nombre            |   |   +-------------------+
| activo            |      | pulse_duration_ms |   |           |
+-------------------+      | activo            |   |           |
                           | notas             |   |   +-------v-----------+
                           +-------------------+   |   | escenario_pasos   |
                                                   |   |-------------------|
+-------------------+                              |   | id (PK, INT)      |
|  autorizados      |                              |   | escenario_id (FK) |
|-------------------|       +-------------------+  |   | orden             |
| registro (PK)     |      |  escenario_log    |  |   | accion            |
| telefono          |      |-------------------|  |   | funcion_relay ---->|
| residencial ------+----->| id (PK, INT)      |  |   | duracion_ms       |
| nivel             |      | escenario_id -----+--+   | parametros (JSON) |
| calle             |      | residencial_id    |      +-------------------+
| estatus           |      | trigger_source    |
+-------------------+      | trigger_type      |
                           | trigger_value     |
                           | imagen_antes      |
                           | imagen_despues    |
                           | resultado         |
                           | duracion_ms       |
                           | detalles (JSON)   |
                           | created_at        |
                           +-------------------+
```

### 4.2 Tabla: device_relays

Catalogo maestro de relays fisicos. Cada fila representa un relay individual en una tarjeta controladora.

| Columna            | Tipo          | Descripcion                                      |
|--------------------|---------------|--------------------------------------------------|
| `id`               | INT PK AI     | Identificador unico                              |
| `mqtt_device`      | VARCHAR(100)  | Nombre del dispositivo MQTT (ej: `Estancia5`, `arcadia/relay42365`) |
| `relay_number`     | TINYINT       | Numero fisico del relay (0-15)                   |
| `funcion_relay`    | VARCHAR(50)   | Funcion logica: `pluma_visitas`, `porton_salida` |
| `tipo_funcion`     | ENUM          | `pluma`, `porton`, `alimentacion`, `reinicio`, `otro` |
| `device_type`      | VARCHAR(20)   | `esp32`, `esp32_legacy`, `dingtian`              |
| `nombre`           | VARCHAR(100)  | Nombre amigable ("Puerta principal")             |
| `pulse_duration_ms`| INT           | Duracion por defecto del pulso (ms). Default: 500 |
| `residencial_id`   | VARCHAR(5)    | Codigo de la residencial                         |
| `activo`           | TINYINT(1)    | 1=activo, 0=deshabilitado                        |
| `notas`            | TEXT          | Notas descriptivas                               |

**Constraint:** `UNIQUE (mqtt_device, relay_number)` - No puede haber dos relays con el mismo device y numero.

### 4.3 Tabla: escenarios

Define secuencias de acciones que se ejecutan como unidad atomica.

| Columna           | Tipo          | Descripcion                                       |
|-------------------|---------------|----------------------------------------------------|
| `id`              | INT PK AI     | Identificador unico                                |
| `nombre`          | VARCHAR(100)  | Nombre descriptivo ("Abrir visitas")               |
| `descripcion`     | TEXT          | Descripcion detallada                              |
| `residencial_id`  | VARCHAR(5)    | Residencial a la que pertenece                     |
| `trigger_type`    | ENUM          | `dtmf`, `whatsapp`, `api`, `vision`, `manual`      |
| `trigger_value`   | VARCHAR(100)  | Valor que dispara: "9" (DTMF), "abrir visitas" (WA)|
| `activo`          | TINYINT(1)    | 1=activo, 0=deshabilitado                          |

### 4.4 Tabla: escenario_pasos

Pasos ordenados dentro de un escenario.

| Columna         | Tipo          | Descripcion                                        |
|-----------------|---------------|----------------------------------------------------|
| `id`            | INT PK AI     | Identificador unico                                |
| `escenario_id`  | INT FK        | Referencia al escenario padre                      |
| `orden`         | TINYINT       | Orden de ejecucion (1, 2, 3...)                    |
| `accion`        | ENUM          | `PULSE`, `PULSE_LONG`, `ON`, `OFF`, `TOGGLE`, `WAIT`, `CAPTURA` |
| `funcion_relay` | VARCHAR(50)   | Referencia a `device_relays.funcion_relay`         |
| `duracion_ms`   | INT           | Duracion para WAIT o PULSE_LONG (milisegundos)     |
| `parametros`    | JSON          | Parametros adicionales                             |

### 4.5 Tabla: escenario_log

Registro historico de todas las ejecuciones de escenarios.

| Columna           | Tipo          | Descripcion                                       |
|-------------------|---------------|----------------------------------------------------|
| `id`              | INT PK AI     | Identificador unico                                |
| `escenario_id`    | INT           | Escenario ejecutado                                |
| `residencial_id`  | VARCHAR(5)    | Residencial                                        |
| `trigger_source`  | VARCHAR(100)  | Quien disparo (telefono, usuario)                  |
| `trigger_type`    | VARCHAR(20)   | Tipo de trigger (whatsapp, dtmf, api)              |
| `trigger_value`   | VARCHAR(100)  | Valor del trigger                                  |
| `imagen_antes`    | VARCHAR(255)  | URL imagen capturada antes de la apertura          |
| `imagen_despues`  | VARCHAR(255)  | URL imagen capturada despues de la apertura        |
| `resultado`       | ENUM          | `exitoso`, `parcial`, `fallido`, `timeout`         |
| `duracion_ms`     | INT           | Tiempo total de ejecucion                          |
| `detalles`        | JSON          | Log detallado de cada paso ejecutado               |
| `created_at`      | TIMESTAMP     | Fecha/hora de ejecucion                            |

---

## 5. Servicio MQTT

**Archivo:** `mqtt_service.py`

Servicio singleton que gestiona la conexion al broker MQTT Mosquitto. Todos los plugins publican y se suscriben a traves de este modulo.

### 5.1 Inicializacion

```python
# bot_orquestador.py
import mqtt_service
mqtt_service.init_mqtt()
```

La funcion `init_mqtt()` lee las variables de entorno:

| Variable       | Default     | Descripcion                    |
|----------------|-------------|--------------------------------|
| `MQTT_BROKER`  | `localhost` | IP o hostname del broker       |
| `MQTT_PORT`    | `1883`      | Puerto TCP del broker          |
| `MQTT_USER`    | (vacio)     | Usuario de autenticacion       |
| `MQTT_PASS`    | (vacio)     | Password de autenticacion      |

El cliente se conecta con:
- **client_id:** `bot-orquestador`
- **protocol:** MQTTv311
- **keepalive:** 60 segundos
- **loop:** background thread (`loop_start()`)

### 5.2 Funciones Publicas

#### `publish(topic, payload, qos=1) -> bool`

Publica un mensaje al broker. El payload puede ser:
- `str` - Se envia tal cual (ej: `"PULSE"`, `"ON"`, `"OFF"`)
- `dict/list` - Se serializa a JSON

#### `subscribe(topic, callback) -> None`

Suscribe a un topic con soporte para wildcards MQTT:
- `+` - Matchea un nivel exacto
- `#` - Matchea todo lo restante

```python
# Ejemplos de suscripcion
mqtt_service.subscribe("home/relays/+/+/status", callback)    # ESP32 nuevo
mqtt_service.subscribe("home/relays/+/status", callback)       # ESP32 legacy
mqtt_service.subscribe("/+/+/out/+", callback)                 # Dingtian
mqtt_service.subscribe("accessbot/dtmf/event", callback)       # DTMF
```

#### `is_connected() -> bool`

Retorna `True` si el cliente esta conectado al broker.

### 5.3 Sistema de Estado de Relays (Race Condition Protection)

El servicio mantiene un cache thread-safe del estado de cada relay:

```python
_relay_states: dict[str, str]       # "device/relay_num" -> "ON"|"OFF"
_command_pending: dict[str, tuple]  # "device/relay_num" -> (expected_state, timestamp)
```

**Problema resuelto:** Cuando el usuario envia un comando (ej: ON), el dispositivo tarda ~100-500ms en confirmar. Durante ese tiempo, el broker puede enviar el estado anterior ("OFF") que sobrescribiria incorrectamente el cache.

**Solucion:** Ventana de proteccion de 10 segundos:

```
1. Usuario envia ON  -> set_relay_state_from_command("device", 3, "ON")
   Cache: device/3 = "ON" (protegido 10s)

2. Broker reporta OFF (estado viejo, en transito)
   update_relay_state("device", 3, "OFF")
   -> IGNORADO (proteccion activa, estado no coincide)

3. Broker reporta ON (confirmacion real)
   update_relay_state("device", 3, "ON")
   -> ACEPTADO (coincide con estado esperado, se elimina proteccion)
```

---

## 6. Plugin de Control de Relays

**Archivo:** `plugins/plugin_mqtt_relay.py`
**Clase:** `PluginMQTTRelay(ModuloBase)`

### 6.1 Intenciones Registradas

| Intent         | Keywords                                    | Prioridad | Roles                |
|----------------|---------------------------------------------|-----------|----------------------|
| `abrir_puerta` | abrir, puerta, porton, barrera, pluma, apertura | 10     | Todos                |
| `reiniciar`    | reiniciar, reinicia, reset, ciclo           | 8         | supervisor, operador |
| `relay_status` | relay, relays, estado relay, estado acceso  | 6         | supervisor, operador |

### 6.2 Inicializacion del Plugin

Al llamar `init(app_context)`, el plugin:

1. Guarda referencias a Twilio client y phone
2. Carga cache de relays conocidos desde BD (`_load_known_relays`)
3. Se suscribe a 4 topics MQTT:

```
accessbot/dtmf/event        -> _on_dtmf_event()       (eventos DTMF)
home/relays/+/+/status      -> _on_relay_status()      (ESP32 nuevo)
home/relays/+/status         -> _on_relay_status_legacy() (ESP32 legacy)
/+/+/out/+                   -> _on_dingtian_status()   (Dingtian)
```

### 6.3 Auto-Descubrimiento de Relays

El plugin descubre automaticamente nuevos relays cuando un dispositivo registrado en `residenciales.mqtt_device_1` o `mqtt_device_2` publica su estado.

**Flujo:**

```
1. ESP32 publica -> home/relays/Estancia5/3/status {"state":"ON","name":"Porton"}
2. _on_relay_status() parsea: device="Estancia5", relay=3
3. Verifica si (Estancia5, 3) esta en _known_relays -> NO
4. Consulta BD: SELECT FROM residenciales WHERE mqtt_device_1='Estancia5'
5. Si existe -> INSERT INTO device_relays (auto-registro)
6. Agrega a _known_relays cache
```

El cache de devices tiene TTL de 60 segundos para no sobrecargar la BD.

### 6.4 Flujo de Apertura via WhatsApp

```
1. Usuario escribe "abrir" en WhatsApp
2. detect_intent() -> "abrir_puerta"
3. handle_intent():
   a. Verificar MQTT conectado
   b. Obtener residencial_id del telefono (tabla autorizados)
   c. Buscar escenario whatsapp que matchee el texto
   d. Si NO hay match exacto:
      - Capturar preview de camara (canal_vista_entrada)
      - Enviar imagen + botones interactivos (Content Template)
      - Usuario selecciona: "Abrir Visitas" o "Abrir Residentes"
   e. Si HAY match:
      - Ejecutar escenario en thread background
      - Enviar "Apertura exitosa" + evidencia fotografica
```

---

## 7. Motor de Escenarios

### 7.1 Concepto

Un **escenario** es una secuencia ordenada de pasos que se ejecutan en orden. Cada paso puede ser una accion sobre un relay, una espera o una captura de imagen.

### 7.2 Acciones Soportadas

| Accion       | Descripcion                                          | Parametros          |
|--------------|------------------------------------------------------|---------------------|
| `PULSE`      | Pulso corto (500ms para ESP32, JOGGING 500ms Dingtian)| funcion_relay       |
| `PULSE_LONG` | Pulso largo configurable                             | funcion_relay, duracion_ms |
| `ON`         | Enciende relay (permanece encendido)                 | funcion_relay       |
| `OFF`        | Apaga relay                                          | funcion_relay       |
| `TOGGLE`     | Cambia estado (ON->OFF, OFF->ON)                     | funcion_relay       |
| `WAIT`       | Pausa entre pasos                                    | duracion_ms         |
| `CAPTURA`    | Captura snapshot de camara DVR                       | -                   |

### 7.3 Ejemplo de Escenario: "Abrir Visitas"

```sql
-- Escenario
INSERT INTO escenarios (nombre, residencial_id, trigger_type, trigger_value)
VALUES ('Abrir visitas', '5', 'whatsapp', 'abrir visitas');

-- Pasos (ejecutados en orden)
-- Paso 1: Activar pluma de visitas (pulso 500ms)
INSERT INTO escenario_pasos (escenario_id, orden, accion, funcion_relay)
VALUES (@esc_id, 1, 'PULSE', 'pluma_visitas');

-- Paso 2: Activar porton de visitas (pulso 500ms)
INSERT INTO escenario_pasos (escenario_id, orden, accion, funcion_relay)
VALUES (@esc_id, 2, 'PULSE', 'porton_visitas');
```

### 7.4 Ejecucion del Escenario

La funcion `ejecutar_escenario()` sigue esta secuencia:

```
1. Obtener pasos ordenados de la BD
2. Capturar imagen ANTES (canal_evidencia_apertura)
3. Para cada paso:
   a. Si WAIT -> time.sleep(duracion_ms / 1000)
   b. Si CAPTURA -> capturar snapshot DVR
   c. Si PULSE/ON/OFF/TOGGLE/PULSE_LONG:
      - Resolver funcion_relay -> (topic, payload) segun device_type
      - Publicar via mqtt_service.publish()
      - Actualizar cache de estado
4. Capturar imagen DESPUES
5. Determinar resultado: exitoso | parcial | fallido
6. Guardar log en escenario_log (JSON con detalle de cada paso)
7. Retornar resultado
```

### 7.5 Resolucion de Comandos por Tipo de Device

La funcion `_resolve_relay_command()` genera el topic y payload correcto segun el `device_type`:

#### ESP32 (nuevo formato)
```
Topic:   home/relays/{mqtt_device}/{relay_number}/set
Payload: "PULSE" | "ON" | "OFF" | "TOGGLE"
         {"action": "PULSE_LONG", "duration": 8000}  (para PULSE_LONG)
```

#### ESP32 Legacy
```
Topic:   home/relays/{relay_number}/set
Payload: "PULSE" | "ON" | "OFF" | "TOGGLE"
```

#### Dingtian (DT-R008)
```
Topic:   /{mqtt_device}/in/control
Payload: JSON segun accion:

PULSE:      {"type": "JOGGING", "idx": "3", "status": "ON", "time": "5", "pass": "0"}
ON:         {"type": "ON/OFF",  "idx": "3", "status": "ON", "time": "0", "pass": "0"}
OFF:        {"type": "ON/OFF",  "idx": "3", "status": "OFF","time": "0", "pass": "0"}
PULSE_LONG: {"type": "JOGGING", "idx": "3", "status": "ON", "time": "80", "pass": "0"}
            (<=25.5s: JOGGING en unidades de 100ms)
            {"type": "DELAY",   "idx": "3", "status": "ON", "time": "30", "pass": "0"}
            (>25.5s: DELAY en segundos)
```

---

## 8. Tipos de Dispositivo Soportados

### 8.1 ESP32 (Custom Firmware)

- **device_type:** `esp32`
- **Topics de status:** `home/relays/{device}/{relay_number}/status`
- **Topics de comando:** `home/relays/{device}/{relay_number}/set`
- **Payload de status:** JSON `{"state": "ON/OFF", "name": "Pluma Visitas"}`
- **Payload de comando:** String raw: `"PULSE"`, `"ON"`, `"OFF"`, `"TOGGLE"`
- **Relays:** Tipicamente 8 (0-7)

**Ejemplo hardware real (Estancia5):**

| Relay | Funcion               | Tipo          |
|-------|-----------------------|---------------|
| 0     | Automatizacion        | alimentacion  |
| 1     | Pluma Visitas         | pluma         |
| 2     | Porton y Pluma Salida | porton        |
| 3     | Porton Visitas        | porton        |
| 4     | Pluma Residentes      | pluma         |
| 5     | Porton Residentes     | porton        |
| 6     | Reinicio fuente       | reinicio      |
| 7     | Reinicio came         | reinicio      |

### 8.2 ESP32 Legacy

- **device_type:** `esp32_legacy`
- **Topics de status:** `home/relays/{relay_number}/status` (device name en payload JSON)
- **Topics de comando:** `home/relays/{relay_number}/set`
- **Payload de status:** JSON `{"device": "villalogrono", "state": "ON", "name": "..."}`
- Mismo protocolo de comando que ESP32 nuevo

### 8.3 Dingtian DT-R008 / Arcadia

- **device_type:** `dingtian`
- **mqtt_device:** Path completo, ej: `arcadia/relay42365`
- **Topics de status:** `/{prefix}/{sn}/out/relay{N}` o `/{prefix}/{sn}/out/r{N}`
- **Topics de comando:** `/{mqtt_device}/in/control`
- **Payload de comando:** JSON con campos `type`, `idx`, `status`, `time`, `pass`
- **Tipos de comando Dingtian:**
  - `ON/OFF` - Encender/apagar permanente
  - `JOGGING` - Pulso con duracion (unidades de 100ms, max 25.5s)
  - `DELAY` - Encender por tiempo (unidades de 1s)

---

## 9. Panel de Administracion Web

**Archivo:** `routes_admin.py` (Blueprint Flask)
**URL base:** `/admin`

### 9.1 Autenticacion

- Login con usuario/password (variables `ADMIN_USER` / `ADMIN_PASS`)
- Soporte WebAuthn (passkeys biometricas) opcional
- Sesion Flask con `secret_key`

### 9.2 Secciones del Panel

| Seccion       | URL                    | Descripcion                              |
|---------------|------------------------|------------------------------------------|
| Dashboard     | `/admin/dashboard`     | Estadisticas, ultimas activaciones       |
| Devices       | `/admin/devices`       | CRUD de DVRs, camaras                    |
| Residenciales | `/admin/residenciales` | CRUD de residenciales                    |
| Escenarios    | `/admin/escenarios`    | CRUD de escenarios y sus pasos           |
| Relays        | `/admin/relays`        | CRUD de relays (device_relays)           |
| Control Remoto| `/admin/control`       | Activacion directa de relays via MQTT    |
| Logs          | `/admin/logs`          | Historial de ejecuciones                 |
| App Movil     | `/admin/control-movil` | PWA para operadores                      |

### 9.3 APIs REST del Panel Admin

Todas las APIs requieren sesion autenticada (cookie de Flask).

#### GET `/api/admin/relay/status`

Retorna todos los relays agrupados por residencial con estado actual.

**Response:**
```json
{
  "mqtt_connected": true,
  "grupos": {
    "Estancia Residencial": [
      {
        "id": 1,
        "mqtt_device": "Estancia5",
        "relay_number": 0,
        "funcion_relay": "automatizacion",
        "tipo_funcion": "alimentacion",
        "device_type": "esp32",
        "relay_nombre": "Automatizacion",
        "pulse_duration_ms": 500,
        "notas": "Alimentacion general",
        "state": "OFF"
      }
    ]
  }
}
```

#### POST `/api/admin/relay/activate`

Activa un relay directamente.

**Request:**
```json
{
  "relay_id": 3,
  "action": "PULSE",
  "duration_ms": 2000
}
```

**Acciones validas:** `PULSE`, `ON`, `OFF`, `TOGGLE`, `PULSE_LONG`

**Response:**
```json
{
  "ok": true,
  "relay": "Porton Visitas",
  "device": "Estancia5",
  "relay_number": 3,
  "action": "PULSE",
  "topic": "home/relays/Estancia5/3/set"
}
```

---

## 10. Control Remoto - Interfaz Web

**Archivo:** `templates/admin/control_remoto.html`
**URL:** `/admin/control`

### 10.1 Caracteristicas

- Vista de relays agrupados por residencial
- Indicador de estado MQTT en tiempo real (auto-refresh cada 30s)
- Filtro por residencial
- Botones de accion por relay: **Pulso**, **ON**, **OFF**, **Toggle**, **Delay**
- Modal de confirmacion antes de ejecutar
- Campo de duracion personalizable para PULSE_LONG
- Toast de feedback (exito/error)
- Badges por tipo de funcion (pluma, porton, alimentacion, reinicio)
- Indicador de tipo de tarjeta (DT = Dingtian)

### 10.2 Flujo de Uso

```
1. Administrador navega a /admin/control
2. Se cargan relays desde GET /api/admin/relay/status
3. Se muestran agrupados por residencial con estado MQTT
4. Admin hace click en "Pulso" en un relay
5. Modal de confirmacion: "Enviar PULSE a Pluma Visitas?"
6. Admin confirma -> POST /api/admin/relay/activate
7. Toast: "PULSE enviado a Pluma Visitas (Estancia5/1)"
```

---

## 11. App Movil (PWA)

**Archivo:** `templates/admin/control_movil.html`
**URL:** `/admin/control-movil`

### 11.1 Caracteristicas

- Aplicacion web progresiva (PWA) instalable en movil
- Tema oscuro optimizado para uso nocturno
- Diseno responsive con cards tactiles
- Funciona sin barra de navegacion del navegador (standalone)
- Service Worker para cache offline del shell
- Iconos SVG propios
- Safe area support para iPhone (notch)

### 11.2 Manifest PWA

```json
{
  "name": "Control Relays",
  "short_name": "Relays",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a"
}
```

### 11.3 Funcionalidad

Misma funcionalidad que el control remoto web pero optimizada para dispositivos moviles:
- Cards mas grandes para toque con dedo
- Confirmacion simplificada
- Feedback haptico visual (animacion de spinner en boton)
- Auto-refresh de estado MQTT

---

## 12. Integracion WhatsApp (Twilio)

### 12.1 Flujo de Apertura con Botones Interactivos

```
Usuario escribe "abrir"
    |
    v
Bot captura preview de camara (canal 801)
    |
    v
Bot envia imagen de preview via REST API
    |
    v (3 segundos despues)
Bot envia botones interactivos (Content Template)
    Opciones: [Abrir Visitas] [Abrir Residentes]
    |
    v
Usuario presiona boton (dentro de 30s TTL)
    |
    v
Bot ejecuta escenario correspondiente en background
    |
    v
Bot envia "Apertura exitosa"
    |
    v (5 segundos totales desde presionar boton)
Bot envia imagen de evidencia (canal 101/301)
```

### 12.2 Content Templates (Twilio)

Los botones interactivos de WhatsApp requieren Content Templates pre-aprobados en Twilio.

**Variable:** `CONTENT_SID_ABRIR` (ej: `HX1234567890abcdef`)

**Script de creacion:** `scripts/crear_template_abrir.py`

### 12.3 TTL de Botones

- **Variable:** `BUTTON_TTL_SECONDS` (default: 30)
- Si el usuario presiona un boton despues del TTL, recibe: *"Este boton ha expirado (Xs). Escribe abrir para obtener nuevos botones."*
- Si presiona un segundo boton del mismo grupo: *"Ya se selecciono una opcion."*

---

## 13. Integracion DTMF (FreePBX)

### 13.1 Flujo

```
1. Residente llama al numero del interfon
2. FreePBX detecta tonos DTMF
3. FreePBX publica en MQTT: accessbot/dtmf/event
   Payload: {"telefono": "5216621234567", "dtmf": "9"}
4. Plugin recibe evento via _on_dtmf_event()
5. Resuelve residencial_id desde telefono
6. Busca escenario con trigger_type='dtmf' y trigger_value='9'
7. Ejecuta escenario (ej: abrir pluma + porton)
8. Notifica resultado via WhatsApp
```

### 13.2 Configuracion de Escenario DTMF

```sql
INSERT INTO escenarios (nombre, residencial_id, trigger_type, trigger_value)
VALUES ('Apertura DTMF 9', '5', 'dtmf', '9');
```

---

## 14. Integracion Camaras Hikvision

### 14.1 Proposito

El sistema captura imagenes del DVR Hikvision en dos momentos:
1. **Preview** - Antes de que el usuario decida abrir (muestra quien esta en la entrada)
2. **Evidencia** - Despues de la apertura (registro visual del acceso)

### 14.2 Canales DVR por Residencial

| Columna en residenciales    | Proposito                      | Default |
|-----------------------------|--------------------------------|---------|
| `canal_vista_entrada`       | Preview (camara de entrada)    | 801     |
| `canal_evidencia_apertura`  | Evidencia despues de abrir     | 101     |
| `canal_evidencia_qr`        | Evidencia de acceso QR         | 701     |

### 14.3 Protocolo de Captura

```
URL: {protocol}://{dvr_url}:{port}/ISAPI/Streaming/channels/{canal}/picture
Auth: HTTP Digest
Timeout: 10 segundos
Cache-bust: ?_t={timestamp_ms}
```

La configuracion del DVR se obtiene de la tabla `devices`:
```sql
SELECT protocol, url, port, username, password
FROM devices
WHERE residencial_id = %s
  AND device_type = 'hikvision_dvr'
  AND registration_status = 'approved'
```

---

## 15. Flujos de Operacion

### 15.1 Flujo Completo: Apertura via WhatsApp

```
                     [Residente]
                         |
                    "abrir" via WA
                         |
                         v
              +---------------------+
              | Webhook /whatsapp   |
              | bot_orquestador.py  |
              +----------+----------+
                         |
              obtener_o_crear_contexto(tel)
                         |
              detect_intent("abrir") -> "abrir_puerta"
                         |
                         v
              +---------------------+
              | PluginMQTTRelay     |
              | handle_intent()     |
              +----------+----------+
                         |
              _obtener_residencial(tel)
              -> residencial_id = "5"
                         |
              _buscar_escenario_whatsapp("5", "abrir")
              -> None (no hay match exacto)
                         |
              _capturar_vista_entrada("5")
              -> URL de imagen preview
                         |
                         v
              Retorna CommandResult(
                text="Vista actual de la entrada:",
                media_url=preview_url,
                content_sid="HX..."
              )
                         |
                         v
              bot_orquestador envía:
              1) Imagen preview (REST API)
              2) Botones interactivos (Content Template)
                         |
                         v
                   [Residente]
              Presiona [Abrir Visitas]
                         |
                         v
              ButtonPayload = "abrir visitas"
                         |
              _buscar_escenario_whatsapp("5", "abrir visitas")
              -> {id: 1, nombre: "Abrir visitas"}
                         |
              Thread background:
              _ejecutar_y_notificar()
                         |
              ejecutar_escenario(id=1, ...)
                |
                +-- Captura imagen ANTES
                +-- Paso 1: PULSE pluma_visitas
                |   -> publish("home/relays/Estancia5/1/set", "PULSE")
                +-- Paso 2: PULSE porton_visitas
                |   -> publish("home/relays/Estancia5/3/set", "PULSE")
                +-- Captura imagen DESPUES
                +-- Guardar log
                         |
              _enviar_mensaje(tel, "Apertura exitosa.")
                         |
              wait(5s - tiempo_ejecucion)
                         |
              _enviar_evidencia_diferida(tel, "5", delay)
              -> Captura + envia foto de evidencia
```

### 15.2 Flujo: Activacion desde Panel Admin

```
[Admin] -> Click "Pulso" -> Modal confirmacion -> "Ejecutar"
    |
    v
POST /api/admin/relay/activate
    {"relay_id": 3, "action": "PULSE"}
    |
    v
routes_admin.py:
    1. Buscar relay por ID en device_relays
    2. Determinar device_type (esp32, dingtian, etc.)
    3. Construir topic + payload
    4. mqtt_service.publish(topic, payload)
    5. set_relay_state_from_command() (proteger cache)
    6. Retornar JSON con resultado
    |
    v
[Admin] <- Toast "PULSE enviado a Porton Visitas"
```

### 15.3 Flujo: Auto-Descubrimiento de Relay

```
[ESP32 nuevo] publica:
    Topic: home/relays/NuevaResidencial/0/status
    Payload: {"state": "OFF", "name": "Puerta Principal"}
    |
    v
_on_relay_status() callback:
    1. Parsear: device="NuevaResidencial", relay=0
    2. (NuevaResidencial, 0) en _known_relays? -> NO
    3. _get_registered_device("NuevaResidencial")
       -> SELECT FROM residenciales WHERE mqtt_device_1='NuevaResidencial'
       -> {id: 10, residencial: "7", nombre: "Nueva Residencial"}
    4. _auto_register_relay("NuevaResidencial", 0, "7", "esp32", "Puerta Principal")
       -> INSERT INTO device_relays (...)
    5. _known_relays.add(("NuevaResidencial", 0))
    6. _named_relays.add(("NuevaResidencial", 0))
    |
    v
[Panel Admin] -> Relay aparece automaticamente en Control Remoto
```

---

## 16. Configuracion y Despliegue

### 16.1 Variables de Entorno

```bash
# Base de datos MySQL
DB_HOST=localhost
DB_USER=wwwvideo_qr
DB_PASS=<password>
DB_NAME=wwwvideo_acceso_codigo

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=<sid>
TWILIO_AUTH_TOKEN=<token>
TWILIO_PHONE_NUMBER=+1234567890

# Content Templates (botones interactivos WhatsApp)
CONTENT_SID_ABRIR=HX...

# TTL de botones interactivos (segundos)
BUTTON_TTL_SECONDS=30

# MQTT Broker (Mosquitto)
MQTT_BROKER=50.62.182.131
MQTT_PORT=1883
MQTT_USER=admin
MQTT_PASS=<password>

# Dominio publico (para URLs de imagenes)
DOMAIN=https://accesoswhatsapp.info

# Puerto Flask
PORT=5501

# Panel admin
ADMIN_USER=admin
ADMIN_PASS=<password>
SECRET_KEY=<random_string>

# Traccar GPS (opcional)
TRACCAR_SERVER=http://localhost:8082/api
TRACCAR_EMAIL=<email>
TRACCAR_PASSWORD=<password>

# Google Maps (opcional)
GOOGLE_MAPS_API_KEY=<key>
```

### 16.2 Dependencias Python

```
flask>=2.3
twilio>=8.0
mysql-connector-python>=8.0
requests>=2.28
qrcode[pil]>=7.4
Pillow>=9.0
pytz>=2023.3
python-dotenv>=1.0
paho-mqtt>=1.6
webauthn>=2.0
```

### 16.3 Migraciones de Base de Datos

Ejecutar en orden:

```bash
mysql -u root wwwvideo_acceso_codigo < migrations/001_mqtt_tables.sql
mysql -u root wwwvideo_acceso_codigo < migrations/002_seed_estancia5.sql
mysql -u root wwwvideo_acceso_codigo < migrations/003_residencial_mqtt_devices.sql
mysql -u root wwwvideo_acceso_codigo < migrations/004_arcadia_device_type.sql
mysql -u root wwwvideo_acceso_codigo < migrations/005_relay_nombre_pulse_duration.sql
mysql -u root wwwvideo_acceso_codigo < migrations/006_webauthn_credentials.sql
```

### 16.4 Arranque del Servicio

```bash
# Desarrollo
python bot_orquestador.py

# Produccion (systemd)
# Archivo: /etc/systemd/system/bot-orquestador.service
[Unit]
Description=VideoAccesos Bot Orquestador
After=network.target mysql.service mosquitto.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/bot-multitarea
EnvironmentFile=/opt/bot-multitarea/.env
ExecStart=/usr/bin/python3 bot_orquestador.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 16.5 Arquitectura de Red

```
Internet
    |
    v
[Nginx reverse proxy :443]
    |
    +-- /whatsapp      -> Flask :5501  (webhook Twilio)
    +-- /admin/*       -> Flask :5501  (panel admin)
    +-- /api/*         -> Flask :5501  (APIs REST)
    +-- /static/*      -> Flask :5501  (archivos estaticos)
    +-- /health        -> Flask :5501  (health check)

[Red local]
    |
    +-- Mosquitto :1883  (MQTT broker)
    +-- MySQL :3306      (base de datos)
    +-- DVR Hikvision    (camaras ISAPI)
    +-- ESP32 x N        (tarjetas relay WiFi)
    +-- Dingtian x N     (tarjetas relay Ethernet)
```

---

## 17. API REST

### 17.1 APIs Publicas (requieren autenticacion Twilio)

| Metodo | Ruta                    | Descripcion                     |
|--------|-------------------------|---------------------------------|
| POST   | `/whatsapp`             | Webhook Twilio WhatsApp         |
| POST   | `/api/relay/ejecutar`   | Ejecutar escenario (API key)    |
| GET    | `/health`               | Health check                    |

### 17.2 APIs Admin (requieren sesion)

| Metodo | Ruta                           | Descripcion                          |
|--------|--------------------------------|--------------------------------------|
| GET    | `/api/admin/relay/status`      | Estado de todos los relays           |
| POST   | `/api/admin/relay/activate`    | Activar relay individual             |
| GET    | `/api/admin/devices`           | Listar devices                       |
| POST   | `/api/admin/devices`           | Crear device                         |
| PUT    | `/api/admin/devices/<id>`      | Actualizar device                    |
| DELETE | `/api/admin/devices/<id>`      | Eliminar device                      |
| GET    | `/api/admin/residenciales`     | Listar residenciales                 |
| POST   | `/api/admin/residenciales`     | Crear residencial                    |
| PUT    | `/api/admin/residenciales/<id>`| Actualizar residencial               |
| DELETE | `/api/admin/residenciales/<id>`| Eliminar residencial                 |
| GET    | `/api/admin/escenarios`        | Listar escenarios                    |
| POST   | `/api/admin/escenarios`        | Crear escenario                      |
| PUT    | `/api/admin/escenarios/<id>`   | Actualizar escenario                 |
| DELETE | `/api/admin/escenarios/<id>`   | Eliminar escenario                   |
| GET    | `/api/admin/relays`            | Listar relays                        |
| POST   | `/api/admin/relays`            | Crear relay                          |
| PUT    | `/api/admin/relays/<id>`       | Actualizar relay                     |
| DELETE | `/api/admin/relays/<id>`       | Eliminar relay                       |
| GET    | `/api/admin/logs`              | Consultar logs de ejecucion          |

---

## 18. Seguridad

### 18.1 Autenticacion y Autorizacion

| Capa             | Mecanismo                                         |
|------------------|----------------------------------------------------|
| WhatsApp         | Twilio firma cada webhook (HMAC)                   |
| Panel Admin      | Usuario/password + sesion Flask                    |
| Panel Admin      | WebAuthn/FIDO2 (passkeys biometricas) opcional     |
| MQTT             | Usuario/password en Mosquitto                      |
| DVR Hikvision    | HTTP Digest Auth                                   |
| Base de datos    | Pool con credenciales en variables de entorno      |

### 18.2 Roles de Usuario (WhatsApp)

| Rol         | Permisos                                           |
|-------------|-----------------------------------------------------|
| residente   | Abrir puertas (su residencial)                      |
| operador    | Abrir puertas + ver relays + reiniciar              |
| supervisor  | Todo lo anterior + gestion avanzada                 |

Los roles se determinan desde la tabla `autorizados` (campos `nivel` y `calle`).

### 18.3 Proteccion de Datos Sensibles

- Credenciales en variables de entorno (`.env`), nunca en codigo
- `.env` en `.gitignore`
- Pool de conexiones BD con reconexion automatica
- Sesiones Flask con `secret_key` configurable
- TTL de botones interactivos para evitar replay

---

## 19. Troubleshooting

### 19.1 MQTT no conecta

```bash
# Verificar que Mosquitto esta corriendo
systemctl status mosquitto

# Probar conexion manual
mosquitto_sub -h 50.62.182.131 -p 1883 -u admin -P <pass> -t '#' -v

# Verificar desde el bot
curl http://localhost:5501/health
# Revisar: "relay": {"status": "ok"} vs "disconnected"
```

### 19.2 Relay no responde a comandos

```bash
# Monitorear mensajes MQTT en tiempo real
mosquitto_sub -h 50.62.182.131 -t 'home/relays/#' -v

# Verificar que el relay esta registrado
mysql -e "SELECT * FROM device_relays WHERE mqtt_device='Estancia5'"

# Publicar comando manual
mosquitto_pub -h 50.62.182.131 -t 'home/relays/Estancia5/1/set' -m 'PULSE'
```

### 19.3 Escenario no se ejecuta desde WhatsApp

1. Verificar que el telefono esta en `autorizados` con `estatus='activo'`
2. Verificar que el escenario tiene `trigger_type='whatsapp'` y `activo=1`
3. Verificar que el `trigger_value` esta contenido en el texto del usuario
4. Revisar logs del bot: `journalctl -u bot-orquestador -f`

### 19.4 Imagenes de evidencia no se capturan

1. Verificar DVR accesible: `curl -v http://<dvr_ip>:<port>/ISAPI/System/status`
2. Verificar canal configurado en `residenciales.canal_vista_entrada`
3. Verificar device en tabla `devices` con `registration_status='approved'`
4. Verificar permisos de escritura en `static/qr_codes/`

### 19.5 Auto-descubrimiento no registra relays

1. Verificar que `mqtt_device_1` o `mqtt_device_2` en `residenciales` coincide **exactamente** con el device name en el topic MQTT
2. Para Dingtian: `mqtt_device` debe ser el path completo (ej: `arcadia/relay42365`)
3. Verificar que la residencial tiene `activo=1`
4. Cache de devices tiene TTL de 60s; esperar o reiniciar el bot

---

*Documento generado para el sistema VideoAccesos v2.0 - Bot Orquestador con arquitectura de plugins.*
