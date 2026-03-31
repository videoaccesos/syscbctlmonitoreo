# Manual Tecnico - ZK MQTT Bridge
## Integracion ZKTeco C3-400 con MQTT para Sistema de Control de Accesos

**Proyecto:** syscbctlmonitoreo
**Rama:** `claude/c3-4000-sdk-integration-aDyDu`
**Fecha:** 2026-03-24
**Ubicacion en servidor:** `/home/wwwvideoaccesos/public_html/syscbctlmonitoreo/zk_mqtt_bridge/`

---

## 1. Contexto del Proyecto

### 1.1 Que es esto

Un **puente (bridge) en Python** que conecta paneles de control de acceso ZKTeco C3-400 con un broker MQTT (Mosquitto). Permite:

- Leer eventos de acceso en tiempo real (tarjetazos, puertas abiertas/forzadas)
- Sincronizar tablas de usuarios y transacciones del panel
- Controlar puertas remotamente via comandos MQTT
- Publicar estado del bridge (heartbeat)

### 1.2 Entorno de produccion

| Componente | Detalle |
|---|---|
| Servidor | @131 (`wwwaccessbot@131`) |
| Ruta del sistema | `/home/wwwvideoaccesos/public_html/syscbctlmonitoreo/` |
| Ruta del bridge | `/home/wwwvideoaccesos/public_html/syscbctlmonitoreo/zk_mqtt_bridge/` |
| Panel ZK | ZKTeco C3-400, firmware v18+, puerto TCP 4370 |
| Broker MQTT | Mosquitto en `accesoswhatsapp.info:1883` |
| Python requerido | 3.8+ |
| Panel serial verificado | `ODG6120016121800008` |
| IP del panel (ejemplo) | `192.168.1.201` |

### 1.3 Repositorio

- **Repo:** `videoaccesos/syscbctlmonitoreo`
- **Rama de desarrollo:** `claude/c3-4000-sdk-integration-aDyDu`
- **Base:** se bifurco desde `main` (commit `9ac29be`)
- **Total de commits en la rama:** 20
- **Archivos fuera de `zk_mqtt_bridge/` modificados:** Solo `.gitignore` (1 linea: `__pycache__/`)
- **Impacto en el sistema principal (video-accesos-app):** NINGUNO

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    ZK MQTT Bridge                        │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌────────────────┐     │
│  │config.yaml│───>│bridge.py │───>│mqtt_publisher.py│    │
│  └──────────┘    │ (main)   │    └───────┬────────┘     │
│                  └────┬─────┘            │               │
│                       │                  │               │
│                  ┌────┴─────┐            │               │
│                  │ zk_c3.py │            │               │
│                  └────┬─────┘            │               │
└───────────────────────┼──────────────────┼───────────────┘
                        │                  │
                   TCP:4370           MQTT:1883
                        │                  │
                   ┌────┴─────┐    ┌───────┴────────┐
                   │ ZK C3-400│    │   Mosquitto     │
                   │  Panel   │    │   Broker        │
                   └──────────┘    └────────────────┘
```

### 2.1 Archivos del proyecto

| Archivo | Tipo | Descripcion |
|---|---|---|
| `bridge.py` | Core | Orquestador principal. Modos: bridge, sync, test |
| `zk_c3.py` | Core | Comunicacion con el panel C3-400 (3 backends) |
| `mqtt_publisher.py` | Core | Publicacion MQTT y recepcion de comandos |
| `config.yaml` | Config | Configuracion del sitio, panel, MQTT y logging |
| `requirements.txt` | Config | Dependencias Python |
| `install.sh` | Deploy | Instalacion en Linux (venv + deps) |
| `install_service.sh` | Deploy | Servicio systemd para ejecucion continua |
| `build_exe.bat` | Deploy | Compilacion .exe para Windows (PyInstaller) |
| `instalar_tarea.bat` | Deploy | Tarea programada en Windows |
| `desinstalar_tarea.bat` | Deploy | Desinstalar tarea programada de Windows |
| `test_connection.py` | Test | Prueba de conectividad basica (5 pasos) |
| `test_panel_data.py` | Test | Exploracion de datos del panel |
| `test_panel_full.py` | Test | Prueba completa con lectura de tablas |
| `test_raw_diagnosis.py` | Test | Diagnostico de protocolo a bajo nivel |
| `read_panel_tables.py` | Test | Lectura directa de tablas con multiples estrategias |

---

## 3. Guia de Instalacion

### 3.1 Requisitos previos

```bash
# Verificar Python 3.8+
python3 --version

# Verificar que el panel sea accesible por red
ping 192.168.1.201

# Verificar que el puerto 4370 responda
nc -zv 192.168.1.201 4370
```

### 3.2 Instalacion automatica (Linux)

```bash
cd /home/wwwvideoaccesos/public_html/syscbctlmonitoreo/zk_mqtt_bridge
bash install.sh
```

Esto hace:
1. Crea un virtualenv en `venv/`
2. Instala `paho-mqtt`, `PyYAML`, `zkaccess-c3`
3. Copia `config.yaml` a `config.local.yaml`

### 3.3 Instalacion manual

```bash
cd zk_mqtt_bridge
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp config.yaml config.local.yaml
```

### 3.4 Configuracion

Editar `config.local.yaml`:

```yaml
site_id: "privada_ejemplo"        # Identificador unico del sitio

zk_panel:
  ip: "192.168.1.201"             # IP real del panel C3-400
  port: 4370                      # Puerto del panel (no cambiar)
  timeout: 5                      # Timeout TCP en segundos
  poll_interval: 2                # Frecuencia de lectura de eventos (seg)
  sync_interval: 300              # Frecuencia de sync de tablas (seg)

mqtt:
  broker: "accesoswhatsapp.info"  # Hostname del broker MQTT
  port: 1883                      # Puerto (1883=normal, 8883=TLS)
  use_tls: false
  username: ""                    # Dejar vacio si no requiere auth
  password: ""
  qos: 1                         # 0=fire-and-forget, 1=at-least-once
  keepalive: 60
  topic_prefix: "videoaccesos"

doors:
  - id: 1
    name: "Entrada Principal"
    relay: 1
  - id: 2
    name: "Entrada Vehicular"
    relay: 2
  - id: 3
    name: "Salida Peatonal"
    relay: 3
  - id: 4
    name: "Salida Vehicular"
    relay: 4

logging:
  level: "INFO"                   # DEBUG para depuracion
  file: "zk_bridge.log"
  max_size_mb: 10
  backup_count: 5
```

---

## 4. Guia de Uso

### 4.1 Modo Test (verificar conectividad)

```bash
source venv/bin/activate
python3 bridge.py -c config.local.yaml --test
```

**Que hace:** Prueba conexion TCP al panel y conexion al broker MQTT. Sale con codigo 0 (exito) o 1 (fallo).

### 4.2 Modo Bridge (operacion continua)

```bash
source venv/bin/activate
python3 bridge.py -c config.local.yaml
```

**Que hace:**
1. Conecta al panel y al broker MQTT
2. Sincroniza tablas de usuarios y transacciones
3. Cada 2 segundos: lee eventos nuevos y los publica
4. Cada 5 minutos: re-sincroniza tablas
5. Cada 60 segundos: publica heartbeat
6. Escucha comandos MQTT (abrir puerta, sync, etc.)

**Para detener:** `Ctrl+C` (cierre limpio)

### 4.3 Modo Sync (una sola vez)

```bash
source venv/bin/activate
python3 bridge.py -c config.local.yaml --sync
```

**Que hace:** Conecta, lee eventos pendientes, sincroniza usuarios y transacciones, desconecta. Util para batch/cron.

### 4.4 Instalar como servicio systemd

```bash
sudo bash install_service.sh
```

Despues:
```bash
sudo systemctl start zk-mqtt-bridge     # Iniciar
sudo systemctl stop zk-mqtt-bridge      # Detener
sudo systemctl status zk-mqtt-bridge    # Ver estado
sudo journalctl -u zk-mqtt-bridge -f    # Ver logs en vivo
```

---

## 5. Scripts de Diagnostico

### 5.1 test_connection.py - Prueba basica de conectividad

```bash
python3 test_connection.py
```

Ejecuta 5 pruebas secuenciales:
1. Resolucion DNS del panel
2. Conectividad TCP a IP:4370
3. Handshake de protocolo con libreria zkaccess-c3
4. Lectura de numero de serie
5. Escucha de eventos en tiempo real (10 segundos)

### 5.2 test_panel_data.py - Exploracion de datos

```bash
python3 test_panel_data.py
```

Lee y muestra:
- Serial, firmware, hardware del panel
- Configuracion de puertas
- Tablas disponibles y sus campos
- Muestras de datos de cada tabla
- Parametros del dispositivo

### 5.3 test_panel_full.py - Prueba completa

```bash
python3 test_panel_full.py
```

Prueba completa incluyendo lectura de tablas con estrategia campo-por-campo.

### 5.4 test_raw_diagnosis.py - Diagnostico de protocolo

```bash
python3 test_raw_diagnosis.py
```

Herramienta de bajo nivel para depurar problemas de protocolo TCP/C3.

### 5.5 read_panel_tables.py - Lectura directa de tablas

```bash
# Leer todas las tablas (limite 100 registros)
python3 read_panel_tables.py 192.168.1.201

# Leer tabla especifica
python3 read_panel_tables.py 192.168.1.201 --table user
python3 read_panel_tables.py 192.168.1.201 --table transaction --limit 50

# Modo debug (volcados hexadecimales)
python3 read_panel_tables.py 192.168.1.201 --debug
```

---

## 6. Topicos MQTT

### 6.1 Estructura de topicos

```
videoaccesos/{site_id}/events/door{N}       → Eventos de acceso
videoaccesos/{site_id}/data/users           → Tabla de usuarios
videoaccesos/{site_id}/data/transactions    → Tabla de transacciones
videoaccesos/{site_id}/cmd/#                → Comandos (el bridge escucha)
videoaccesos/{site_id}/bridge/status        → Estado del bridge (retenido)
```

### 6.2 Ejemplo de evento publicado

Topico: `videoaccesos/privada_ejemplo/events/door1`

```json
{
  "site_id": "privada_ejemplo",
  "source": "zk_c3_400",
  "card_no": "12345",
  "door_id": 1,
  "door_name": "Entrada Principal",
  "event_type": 0,
  "event_name": "normal_punch",
  "entry_exit": 0,
  "direction": "entry",
  "verify_mode": 4,
  "verify_name": "card",
  "timestamp": "2026-03-24T16:56:12.345678",
  "published_at": "2026-03-24T16:56:12.345678"
}
```

### 6.3 Comandos disponibles via MQTT

Publicar en: `videoaccesos/{site_id}/cmd/`

```json
{"command": "open_door", "door_id": 1, "duration": 5}
{"command": "sync_users"}
{"command": "sync_transactions"}
{"command": "sync_table", "table": "timezone"}
{"command": "sync_all"}
```

### 6.4 Tipos de evento del panel

| Codigo | Nombre | Descripcion |
|---|---|---|
| 0 | normal_punch | Tarjeta valida, acceso concedido |
| 1 | punch_during_open | Tarjeta mientras puerta ya abierta |
| 20 | remote_open | Apertura remota |
| 200 | door_open_correct | Puerta abierta (sensor) |
| 201 | door_close_correct | Puerta cerrada (sensor) |
| 204 | card_denied | Tarjeta no autorizada |
| 208 | access_denied | Acceso denegado |
| 209 | anti_passback | Violacion anti-passback |
| 215 | door_forced_open | Puerta forzada (alarma) |

### 6.5 Modos de verificacion

| Codigo | Nombre |
|---|---|
| 1 | fingerprint (huella) |
| 3 | password (contrasena) |
| 4 | card (tarjeta) |
| 11 | card + fingerprint |
| 200 | other |

---

## 7. Detalles Tecnicos del Protocolo C3-400

### 7.1 Backends soportados (auto-deteccion)

El sistema intenta 3 backends en orden:

1. **zkaccess-c3** (preferido) - Libreria Python pura, funciona en Linux
   - `pip install zkaccess-c3`
   - Import: `from c3 import C3`
   - Puerto fijo: 4370

2. **pyzkaccess** - Wrapper del PULL SDK (DLL), solo Windows
   - `pip install pyzkaccess`
   - Requiere DLL del SDK de ZKTeco

3. **Raw TCP** - Protocolo directo, universal
   - No requiere librerias externas
   - Funcional para eventos y control de puerta
   - Limitado para tablas grandes

### 7.2 Lectura de tablas grandes (firmware v18+)

**Problema:** Las tablas con muchos registros (usuarios, transacciones) no caben en un solo frame TCP.

**Solucion implementada - Estrategia campo-por-campo:**

```
1. Enviar GETDATA con todos los campos
2. Si respuesta[0] == 0x00 (data_stat):
   a. Parsear total_size del header (bytes 1-5)
   b. Enviar FREE_DATA para liberar buffer del panel
   c. Para CADA campo individualmente:
      - Enviar GETDATA([tabla, 1, campo_idx, 0, 0])
      - Parsear valores del campo
   d. Reconstruir registros combinando campos por indice
3. Si respuesta[0] == indice_tabla: datos directos (tabla pequena)
```

**Por que campo-por-campo:** Cada campo individual genera una respuesta pequena que cabe en un frame. Se evita el problema de transferencia multi-frame.

### 7.3 Formato de registro de evento (32 bytes)

```
Bytes 0-3:   card_no (uint32, little-endian)
Byte 4:      door_id
Byte 5:      entry_exit (0=entrada, 1=salida)
Byte 6:      event_type (ver tabla en seccion 6.4)
Byte 7:      verify_mode (ver tabla en seccion 6.5)
Bytes 8-13:  timestamp (year, month, day, hour, minute, second)
Bytes 14-31: padding
```

### 7.4 Reconexion automatica

| Escenario | Estrategia |
|---|---|
| Panel desconectado | Backoff exponencial: 5s → 10s → 20s → ... → 120s max |
| MQTT desconectado | Reconexion automatica via paho-mqtt |
| Fallo en lectura de tabla | Log error, saltar sync, continuar polling eventos |
| Fallo en lectura de evento | Marcar offline, intentar reconectar |

---

## 8. Lo que Funciona y lo que Falta

### 8.1 Verificado funcionando

- Conexion TCP al panel C3-400 via zkaccess-c3
- Lectura de numero de serie (`ODG6120016121800008`)
- Lectura de eventos en tiempo real
- Parseo de eventos (tarjeta, puerta, tipo, timestamp)
- Publicacion de eventos a MQTT por topico de puerta
- Sincronizacion de tabla de usuarios (campo-por-campo)
- Sincronizacion de tabla de transacciones (campo-por-campo)
- Control remoto de puerta (abrir relay via MQTT)
- Heartbeat/status del bridge
- Servicio systemd
- Compilacion .exe para Windows

### 8.2 Parcialmente funcional

- Transferencia two-phase directa (funciona via campo-por-campo, no via chunking directo)
- Backend Raw TCP (eventos y serial OK, tablas grandes limitado)
- Backend pyzkaccess (solo Windows, no probado en produccion)

### 8.3 Pendiente / No probado en produccion

- **Integracion con el sistema PHP** (video-accesos-app): El bridge publica a MQTT pero el sistema PHP aun no consume estos topicos
- **Prueba de carga**: No se ha probado con paneles con miles de transacciones
- **TLS en MQTT**: Configurado pero no probado
- **Multiples paneles**: El bridge maneja 1 panel. Para multiples, se necesitarian multiples instancias con diferentes config
- **Monitoreo del servicio**: No hay alertas si el bridge se cae

---

## 9. Procedimiento de Pruebas Recomendado

### Paso 1: Verificar red

```bash
# Desde el servidor @131
ping -c 3 192.168.1.201
nc -zv 192.168.1.201 4370
```

### Paso 2: Instalar dependencias

```bash
cd /home/wwwvideoaccesos/public_html/syscbctlmonitoreo/zk_mqtt_bridge
bash install.sh
```

### Paso 3: Probar conexion al panel

```bash
source venv/bin/activate
python3 test_connection.py
```

Esperado:
```
[1/5] DNS resolution... OK
[2/5] TCP connectivity... OK
[3/5] Protocol handshake... OK
[4/5] Serial number... ODG6120016121800008
[5/5] Real-time events... (waiting 10s)
```

### Paso 4: Explorar datos del panel

```bash
python3 test_panel_data.py
```

### Paso 5: Leer tablas

```bash
python3 read_panel_tables.py 192.168.1.201 --table user
python3 read_panel_tables.py 192.168.1.201 --table transaction --limit 20
```

### Paso 6: Probar bridge completo

```bash
cp config.yaml config.local.yaml
nano config.local.yaml   # Ajustar IP del panel y broker MQTT
python3 bridge.py -c config.local.yaml --test
python3 bridge.py -c config.local.yaml --sync
python3 bridge.py -c config.local.yaml   # Modo continuo
```

### Paso 7: Verificar MQTT (desde otra terminal)

```bash
# Suscribirse a todos los topicos del sitio
mosquitto_sub -h accesoswhatsapp.info -t "videoaccesos/#" -v
```

### Paso 8: Probar comando remoto

```bash
# Abrir puerta 1 por 5 segundos
mosquitto_pub -h accesoswhatsapp.info \
  -t "videoaccesos/privada_ejemplo/cmd/open" \
  -m '{"command": "open_door", "door_id": 1, "duration": 5}'
```

---

## 10. Dependencias

### 10.1 Python (requirements.txt)

```
paho-mqtt>=1.6.1,<2.0      # Cliente MQTT
PyYAML>=6.0                  # Parseo de config YAML
zkaccess-c3>=0.0.15         # Comunicacion con panel C3 (preferido)
```

### 10.2 Sistema

```
python3 >= 3.8
mosquitto-clients            # Para pruebas con mosquitto_sub/pub (opcional)
```

---

## 11. Historial de Desarrollo (Cronologico)

| # | Fecha | Commit | Descripcion |
|---|---|---|---|
| 1 | 2026-03-23 23:17 | `a70b233` | Bridge inicial: 3 backends, MQTT, eventos, config |
| 2 | 2026-03-24 01:47 | `4d15442` | Herramienta de diagnostico raw TCP |
| 3 | 2026-03-24 02:12 | `8188cfa` | 10 pruebas de protocolo TCP |
| 4 | 2026-03-24 02:35 | `1285b5f` | Fix import: `from c3 import C3` (verificado conectando) |
| 5 | 2026-03-24 05:31 | `7433891` | Script exploracion de datos del panel |
| 6 | 2026-03-24 05:37 | `37ea5c4` | Test completo con params, tablas, control puerta |
| 7 | 2026-03-24 06:05 | `0f35124` | Fix crashes en door_settings, auto-reconnect |
| 8 | 2026-03-24 06:13 | `3e48df5` | Lector raw de tablas grandes |
| 9 | 2026-03-24 06:16 | `1817a1b` | Monkey-patch recv para fragmentacion TCP |
| 10 | 2026-03-24 06:19 | `2d59f16` | Fix referencia a campo 'size' inexistente |
| 11 | 2026-03-24 06:23 | `6343ba6` | Soporte chunked transfer firmware v18+ |
| 12 | 2026-03-24 06:40 | `855865f` | Transferencia two-phase completa |
| 13 | 2026-03-24 07:25 | `72befd9` | Fix DATA_RDY ACK vacio = exito |
| 14 | 2026-03-24 07:28 | `e7dcb37` | READ_BUFFER pull model (multiples formatos) |
| 15 | 2026-03-24 07:32 | `e4194b6` | Multi-estrategia para two-phase retrieval |
| 16 | 2026-03-24 07:32 | `b8c1ce6` | .gitignore: __pycache__/ |
| 17 | 2026-03-24 07:40 | `61b7d3a` | Estrategia campo-por-campo (LA QUE FUNCIONA) |
| 18 | 2026-03-24 08:13 | `f047bdc` | Integracion campo-por-campo en SDK |
| 19 | 2026-03-24 16:41 | `17eb444` | Sync de tablas integrado en bridge + comandos MQTT |
| 20 | 2026-03-24 16:57 | `b5268a5` | Deployment Windows (.exe + tarea programada) |

---

## 12. Notas Importantes

1. **Esta rama NO modifica el sistema principal.** Todo esta dentro de `zk_mqtt_bridge/`. El unico cambio fuera es 1 linea en `.gitignore`.

2. **El panel tiene IP fija** `192.168.1.201` en la red local. Si cambia, actualizar `config.local.yaml`.

3. **El puerto 4370 es fijo** en el protocolo C3 de ZKTeco. No se puede cambiar.

4. **La libreria `zkaccess-c3`** es la que funciona en Linux. `pyzkaccess` necesita DLLs de Windows.

5. **config.local.yaml** es ignorado por git (si se agrega a .gitignore). Usar este para datos reales de produccion.

6. **Los logs rotan automaticamente** a 10MB con 5 backups.

7. **Para multiples paneles**, ejecutar multiples instancias del bridge con diferentes archivos de configuracion y diferentes `site_id`.
