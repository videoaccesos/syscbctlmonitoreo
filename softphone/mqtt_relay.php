<?php
/**
 * MQTT Relay Proxy para Access Phone
 * Publica mensajes MQTT en el broker Mosquitto para activar relays
 *
 * Uso: POST mqtt_relay.php
 *   Body JSON: { "topic": "relay/privada/1/dns1", "payload": "ON", "dns": "192.168.1.100", "puerto": "1883" }
 *
 * O con GET para pruebas:
 *   mqtt_relay.php?action=publish&topic=relay/open&payload=ON&host=localhost&port=1883
 *   mqtt_relay.php?action=status  -> Verifica conexión con el broker
 */

// Configuración por defecto del broker MQTT
$mqtt_config = [
    'host'     => 'localhost',
    'port'     => 1883,
    'username' => '',
    'password' => '',
    'client_id' => 'accessphone_relay_' . getmypid()
];

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Obtener parámetros (POST JSON o GET)
$input = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?: [];
}

$action  = $_GET['action'] ?? $input['action'] ?? 'publish';
$topic   = $_GET['topic']   ?? $input['topic']   ?? '';
$payload = $_GET['payload'] ?? $input['payload'] ?? 'ON';
$host    = $_GET['host']    ?? $input['host']    ?? $input['dns'] ?? $mqtt_config['host'];
$port    = (int)($_GET['port'] ?? $input['port'] ?? $input['puerto'] ?? $mqtt_config['port']);
$username = $_GET['username'] ?? $input['username'] ?? $mqtt_config['username'];
$password = $_GET['password'] ?? $input['password'] ?? $mqtt_config['password'];

switch ($action) {

    // =========================================
    // PUBLISH: Publicar mensaje MQTT
    // =========================================
    case 'publish':
        if (empty($topic)) {
            echo json_encode(['success' => false, 'error' => 'Topic MQTT requerido']);
            break;
        }

        $result = mqtt_publish($host, $port, $topic, $payload, $username, $password);
        echo json_encode($result);
        break;

    // =========================================
    // STATUS: Verificar conectividad con broker
    // =========================================
    case 'status':
        $result = mqtt_check_connection($host, $port);
        echo json_encode($result);
        break;

    // =========================================
    // ACTIVATE: Activar relay específico
    // Simplifica la llamada desde el frontend
    // =========================================
    case 'activate':
        $privada_id = (int)($_GET['privada_id'] ?? $input['privada_id'] ?? 0);
        $relay_id   = (int)($_GET['relay_id']   ?? $input['relay_id']   ?? 0);
        $dns        = $_GET['dns']    ?? $input['dns']    ?? '';
        $alias      = $_GET['alias']  ?? $input['alias']  ?? "relay_{$relay_id}";
        $duration   = (int)($_GET['duration'] ?? $input['duration'] ?? 3);

        if (empty($dns)) {
            echo json_encode(['success' => false, 'error' => 'DNS/host del relay requerido']);
            break;
        }

        // Construir topic basado en la estructura: accesos/privada/{id}/relay/{n}
        $mqtt_topic = "accesos/privada/{$privada_id}/relay/{$relay_id}";
        $mqtt_payload = json_encode([
            'action'   => 'open',
            'relay'    => $relay_id,
            'alias'    => $alias,
            'duration' => $duration,
            'timestamp' => date('Y-m-d H:i:s')
        ]);

        // El DNS de la privada se usa como host del broker MQTT
        // Si el DNS tiene formato de dominio/IP, usarlo directamente
        // Si no, usar el broker por defecto
        $mqtt_host = $dns;
        $mqtt_port = $port ?: 1883;

        $result = mqtt_publish($mqtt_host, $mqtt_port, $mqtt_topic, $mqtt_payload, $username, $password);
        $result['topic'] = $mqtt_topic;
        $result['relay_alias'] = $alias;

        // Registrar activación en log
        log_relay_activation($privada_id, $relay_id, $alias, $result['success']);

        echo json_encode($result);
        break;

    default:
        echo json_encode([
            'success' => false,
            'error'   => 'Acción no válida',
            'actions' => ['publish', 'status', 'activate']
        ]);
        break;
}

// =========================================
// MQTT Functions (usando sockets TCP raw)
// Implementación mínima del protocolo MQTT 3.1.1
// =========================================

function mqtt_publish($host, $port, $topic, $payload, $username = '', $password = '') {
    $client_id = 'accesphone_' . substr(md5(uniqid()), 0, 8);

    // Abrir conexión TCP
    $socket = @fsockopen($host, $port, $errno, $errstr, 5);
    if (!$socket) {
        return [
            'success' => false,
            'error'   => "No se pudo conectar al broker MQTT ({$host}:{$port}): {$errstr}",
            'errno'   => $errno
        ];
    }

    stream_set_timeout($socket, 5);

    // 1. Enviar CONNECT
    $connect_packet = mqtt_build_connect($client_id, $username, $password);
    fwrite($socket, $connect_packet);

    // 2. Leer CONNACK
    $response = fread($socket, 4);
    if (strlen($response) < 4 || ord($response[0]) !== 0x20) {
        fclose($socket);
        return [
            'success' => false,
            'error'   => 'Respuesta CONNACK inválida del broker'
        ];
    }

    $return_code = ord($response[3]);
    if ($return_code !== 0) {
        fclose($socket);
        $errors = [
            1 => 'Protocolo no aceptado',
            2 => 'Client ID rechazado',
            3 => 'Servidor no disponible',
            4 => 'Usuario/contraseña incorrectos',
            5 => 'No autorizado'
        ];
        return [
            'success' => false,
            'error'   => 'Conexión rechazada: ' . ($errors[$return_code] ?? "código {$return_code}")
        ];
    }

    // 3. Enviar PUBLISH (QoS 0)
    $publish_packet = mqtt_build_publish($topic, $payload);
    fwrite($socket, $publish_packet);

    // 4. Enviar DISCONNECT
    fwrite($socket, chr(0xE0) . chr(0x00));
    fclose($socket);

    return [
        'success'   => true,
        'message'   => "Mensaje publicado en {$topic}",
        'host'      => $host,
        'port'      => $port,
        'topic'     => $topic,
        'payload'   => $payload,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

function mqtt_build_connect($client_id, $username = '', $password = '') {
    // Variable header
    $var_header = '';
    // Protocol Name "MQTT"
    $var_header .= chr(0x00) . chr(0x04) . 'MQTT';
    // Protocol Level (4 = MQTT 3.1.1)
    $var_header .= chr(0x04);

    // Connect Flags
    $flags = 0x02; // Clean Session
    if (!empty($username)) $flags |= 0x80; // Username flag
    if (!empty($password)) $flags |= 0x40; // Password flag
    $var_header .= chr($flags);

    // Keep Alive (60 seconds)
    $var_header .= chr(0x00) . chr(0x3C);

    // Payload
    $payload = mqtt_encode_string($client_id);
    if (!empty($username)) $payload .= mqtt_encode_string($username);
    if (!empty($password)) $payload .= mqtt_encode_string($password);

    $packet = $var_header . $payload;
    return chr(0x10) . mqtt_encode_remaining_length(strlen($packet)) . $packet;
}

function mqtt_build_publish($topic, $payload, $qos = 0) {
    $var_header = mqtt_encode_string($topic);
    $packet = $var_header . $payload;
    $cmd = 0x30 | ($qos << 1);
    return chr($cmd) . mqtt_encode_remaining_length(strlen($packet)) . $packet;
}

function mqtt_encode_string($str) {
    $len = strlen($str);
    return chr(($len >> 8) & 0xFF) . chr($len & 0xFF) . $str;
}

function mqtt_encode_remaining_length($length) {
    $encoded = '';
    do {
        $digit = $length % 128;
        $length = (int)($length / 128);
        if ($length > 0) $digit |= 0x80;
        $encoded .= chr($digit);
    } while ($length > 0);
    return $encoded;
}

function mqtt_check_connection($host, $port) {
    $socket = @fsockopen($host, $port, $errno, $errstr, 3);
    if (!$socket) {
        return [
            'success'   => false,
            'connected' => false,
            'error'     => "No se pudo conectar a {$host}:{$port}: {$errstr}"
        ];
    }
    fclose($socket);
    return [
        'success'   => true,
        'connected' => true,
        'host'      => $host,
        'port'      => $port,
        'message'   => "Broker MQTT accesible en {$host}:{$port}"
    ];
}

function log_relay_activation($privada_id, $relay_id, $alias, $success) {
    $log_dir = __DIR__ . '/logs';
    if (!is_dir($log_dir)) {
        @mkdir($log_dir, 0755, true);
    }
    $log_file = $log_dir . '/relay_activations.log';
    $entry = date('Y-m-d H:i:s') . " | Privada: {$privada_id} | Relay: {$relay_id} | Alias: {$alias} | " .
             ($success ? 'OK' : 'FAIL') . "\n";
    @file_put_contents($log_file, $entry, FILE_APPEND | LOCK_EX);
}
