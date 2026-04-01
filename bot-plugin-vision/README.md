# Plugin Vision - Alertas de Portones

Plugin para el bot orquestador que integra el sistema de video vigilancia con las notificaciones WhatsApp. Recibe alertas MQTT cuando un porton permanece abierto mas tiempo del permitido y notifica automaticamente a todos los supervisores activos.

## Funcionalidades

- **Alertas automaticas**: Se suscribe al topic MQTT `videoaccesos/+/alert` y envia un mensaje WhatsApp a cada supervisor cuando se detecta un porton abierto.
- **Throttling**: Maximo 1 alerta por porton cada 5 minutos para evitar spam.
- **Intent WhatsApp**: Los supervisores y operadores pueden escribir "portones" o "estado portones" para consultar el estado actual de todos los portones.
- **Endpoint de pruebas**: `POST /api/vision/alert` permite disparar alertas manualmente enviando un JSON con la misma estructura que el payload MQTT.
- **Health check**: Reporta las ultimas 20 alertas enviadas.

## Instalacion

1. Copiar `plugin_vision.py` al directorio `bot-multitarea/plugins/`:

   ```bash
   cp plugin_vision.py /ruta/a/bot-multitarea/plugins/
   ```

2. Agregar el import y registro en `bot_orquestador.py`:

   ```python
   from plugins.plugin_vision import PluginVision

   # En la seccion donde se registran los modulos:
   registry.register(PluginVision())
   ```

3. Instalar dependencias (si no estan ya en el entorno):

   ```bash
   pip install paho-mqtt requests mysql-connector-python twilio
   ```

4. Reiniciar el bot orquestador.

## Variables de entorno

El plugin utiliza las mismas variables de entorno que el bot orquestador:

| Variable | Descripcion |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | SID de la cuenta Twilio |
| `TWILIO_AUTH_TOKEN` | Token de autenticacion Twilio |
| `TWILIO_PHONE` | Numero de telefono Twilio (formato WhatsApp) |
| `MQTT_BROKER` | Host del broker MQTT (Mosquitto) |
| `MQTT_PORT` | Puerto del broker MQTT (default: 1883) |
| `DB_HOST` | Host de la base de datos MySQL |
| `DB_USER` | Usuario de MySQL |
| `DB_PASSWORD` | Password de MySQL |
| `DB_NAME` | Nombre de la base de datos |

## Topics MQTT

| Topic | Direccion | Descripcion |
|-------|-----------|-------------|
| `videoaccesos/+/alert` | Suscripcion | Recibe alertas de portones abiertos del sistema de video vigilancia |

### Estructura del payload MQTT

```json
{
  "type": "gate_alert",
  "site_id": "72",
  "cam_id": 3,
  "alias": "Porton Principal",
  "state": "open",
  "held_seconds": 120,
  "difference": 45,
  "message": "Porton \"Porton Principal\" lleva 2 min abierto (diferencia: 45%)",
  "ts": "2026-04-01T12:00:00.000Z"
}
```

## Consulta de estado

El intent "estado portones" realiza un GET a `http://localhost:3000/api/gate-monitor/status` (servidor Next.js) y formatea la respuesta para mostrar el estado de cada porton con indicadores visuales (rojo = abierto, verde = cerrado).

## Endpoint de pruebas

```bash
curl -X POST http://localhost:5000/api/vision/alert \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "72",
    "cam_id": 3,
    "alias": "Porton Principal",
    "state": "open",
    "held_seconds": 120,
    "difference": 45
  }'
```

Respuesta exitosa (HTTP 202):

```json
{
  "status": "ok",
  "message": "Alerta en proceso de envio"
}
```
