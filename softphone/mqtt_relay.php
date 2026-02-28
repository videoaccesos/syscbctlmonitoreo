<?php
/**
 * MQTT Relay Proxy para Access Phone
 * Actúa como bridge entre el AccessPhone (frontend) y el Bot Orquestador (backend)
 *
 * El Bot Orquestador ya tiene toda la lógica MQTT implementada:
 * - Manejo de device_types (esp32, esp32_legacy, dingtian)
 * - Topics correctos por tipo de dispositivo
 * - Protección de race conditions en estados
 * - Logging en escenario_log
 *
 * Endpoints:
 *   POST ?action=activate   -> Activa relay via Bot Orquestador API
 *   GET  ?action=status     -> Estado de relays desde Bot Orquestador
 *   GET  ?action=relays     -> Lista relays de una residencial
 *   GET  ?action=health     -> Health check del Bot Orquestador
 */

// Capturar errores fatales y devolver JSON válido
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => "PHP Error: {$errstr}",
        'file'    => basename($errfile),
        'line'    => $errline
    ]);
    exit;
});

register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (ob_get_level()) ob_end_clean();
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error'   => "Fatal: {$error['message']}",
            'file'    => basename($error['file']),
            'line'    => $error['line']
        ]);
    }
});

// Configuración del Bot Orquestador
$bot_config = [
    'base_url' => 'https://accesoswhatsapp.info',  // Dominio del Bot Orquestador
    'admin_user' => '',
    'admin_pass' => '',
    'timeout' => 10
];

// Intentar leer config del .env del bot si existe
$env_path = '/opt/bot-multitarea/.env';
if (file_exists($env_path)) {
    $lines = file($env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $val) = explode('=', $line, 2);
        $env[trim($key)] = trim($val);
    }
    if (isset($env['DOMAIN'])) $bot_config['base_url'] = $env['DOMAIN'];
    if (isset($env['ADMIN_USER'])) $bot_config['admin_user'] = $env['ADMIN_USER'];
    if (isset($env['ADMIN_PASS'])) $bot_config['admin_pass'] = $env['ADMIN_PASS'];
}

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

$action = $_GET['action'] ?? $input['action'] ?? 'activate';

// Sesión de admin para las APIs del bot (cookie-based)
$session_cookie = null;

switch ($action) {

    // =========================================
    // ACTIVATE: Activar relay via Bot Orquestador
    // Usa POST /api/admin/relay/activate
    // =========================================
    case 'activate':
        $relay_id    = (int)($_GET['relay_id']    ?? $input['relay_id']    ?? 0);
        $relay_action = $_GET['relay_action'] ?? $input['relay_action'] ?? 'PULSE';
        $duration_ms  = (int)($_GET['duration_ms'] ?? $input['duration_ms'] ?? 500);

        if ($relay_id <= 0) {
            echo json_encode(['success' => false, 'error' => 'relay_id requerido']);
            break;
        }

        // Validar acción permitida
        $valid_actions = ['PULSE', 'ON', 'OFF', 'TOGGLE', 'PULSE_LONG'];
        $relay_action = strtoupper($relay_action);
        if (!in_array($relay_action, $valid_actions)) {
            echo json_encode(['success' => false, 'error' => "Acción no válida: {$relay_action}"]);
            break;
        }

        // Autenticar con el Bot Orquestador
        $session = bot_login($bot_config);
        if (!$session) {
            // Fallback: intentar MQTT directo si el bot no está disponible
            $result = fallback_mqtt_activate($input);
            echo json_encode($result);
            break;
        }

        // Llamar API del Bot Orquestador
        $api_data = [
            'relay_id'    => $relay_id,
            'action'      => $relay_action,
            'duration_ms' => $duration_ms
        ];

        $result = bot_api_call(
            $bot_config['base_url'] . '/api/admin/relay/activate',
            'POST',
            $api_data,
            $session
        );

        if ($result !== null && isset($result['ok']) && $result['ok']) {
            echo json_encode([
                'success'      => true,
                'relay'        => $result['relay'] ?? '',
                'device'       => $result['device'] ?? '',
                'relay_number' => $result['relay_number'] ?? 0,
                'action'       => $result['action'] ?? $relay_action,
                'topic'        => $result['topic'] ?? '',
                'message'      => "{$relay_action} enviado a " . ($result['relay'] ?? "relay {$relay_id}"),
                'timestamp'    => date('Y-m-d H:i:s')
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error'   => $result['error'] ?? 'Error activando relay via Bot Orquestador'
            ]);
        }

        // Log local
        log_relay_activation($relay_id, $relay_action, $result['ok'] ?? false);
        break;

    // =========================================
    // STATUS: Estado de todos los relays
    // Usa GET /api/admin/relay/status
    // =========================================
    case 'status':
        $session = bot_login($bot_config);
        if (!$session) {
            echo json_encode(['success' => false, 'error' => 'No se pudo conectar al Bot Orquestador']);
            break;
        }

        $result = bot_api_call(
            $bot_config['base_url'] . '/api/admin/relay/status',
            'GET',
            null,
            $session
        );

        if ($result !== null) {
            echo json_encode([
                'success'        => true,
                'mqtt_connected' => $result['mqtt_connected'] ?? false,
                'grupos'         => $result['grupos'] ?? []
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Error obteniendo estado de relays']);
        }
        break;

    // =========================================
    // RELAYS: Listar relays de una residencial
    // =========================================
    case 'relays':
        $residencial_id = $_GET['residencial_id'] ?? $input['residencial_id'] ?? '';

        $session = bot_login($bot_config);
        if (!$session) {
            echo json_encode(['success' => false, 'error' => 'No se pudo conectar al Bot Orquestador']);
            break;
        }

        $result = bot_api_call(
            $bot_config['base_url'] . '/api/admin/relay/status',
            'GET',
            null,
            $session
        );

        if ($result !== null && isset($result['grupos'])) {
            $relays = [];
            foreach ($result['grupos'] as $grupo_name => $grupo_relays) {
                foreach ($grupo_relays as $r) {
                    // Si se filtró por residencial, solo incluir esa
                    if ($residencial_id && isset($r['residencial_id']) && $r['residencial_id'] !== $residencial_id) {
                        continue;
                    }
                    $relays[] = [
                        'id'            => $r['id'],
                        'mqtt_device'   => $r['mqtt_device'],
                        'relay_number'  => $r['relay_number'],
                        'funcion'       => $r['funcion_relay'] ?? '',
                        'tipo'          => $r['tipo_funcion'] ?? '',
                        'device_type'   => $r['device_type'] ?? 'esp32',
                        'nombre'        => $r['relay_nombre'] ?? $r['funcion_relay'] ?? "Relay {$r['relay_number']}",
                        'pulse_ms'      => $r['pulse_duration_ms'] ?? 500,
                        'state'         => $r['state'] ?? 'unknown',
                        'grupo'         => $grupo_name,
                        'notas'         => $r['notas'] ?? ''
                    ];
                }
            }

            echo json_encode([
                'success'        => true,
                'mqtt_connected' => $result['mqtt_connected'] ?? false,
                'relays'         => $relays
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Error obteniendo relays']);
        }
        break;

    // =========================================
    // HEALTH: Health check del Bot Orquestador
    // =========================================
    case 'health':
        $result = bot_api_call($bot_config['base_url'] . '/health', 'GET');

        if ($result !== null) {
            echo json_encode([
                'success'      => true,
                'bot_status'   => $result['status'] ?? 'unknown',
                'mqtt_status'  => $result['relay']['status'] ?? 'unknown',
                'bot_url'      => $bot_config['base_url']
            ]);
        } else {
            echo json_encode([
                'success'    => false,
                'error'      => 'Bot Orquestador no accesible',
                'bot_url'    => $bot_config['base_url']
            ]);
        }
        break;

    default:
        echo json_encode([
            'success' => false,
            'error'   => 'Acción no válida',
            'actions' => ['activate', 'status', 'relays', 'health']
        ]);
        break;
}

// =========================================
// Bot Orquestador HTTP Client
// =========================================

function bot_login($config) {
    if (empty($config['admin_user']) || empty($config['admin_pass'])) {
        return null;
    }

    $cookie_file = sys_get_temp_dir() . '/accessphone_bot_session_' . md5($config['base_url']);

    // Si ya tenemos cookie reciente (< 30 min), reusar
    if (file_exists($cookie_file) && (time() - filemtime($cookie_file)) < 1800) {
        return $cookie_file;
    }

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $config['base_url'] . '/admin/login',
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'username' => $config['admin_user'],
            'password' => $config['admin_pass']
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_COOKIEJAR      => $cookie_file,
        CURLOPT_COOKIEFILE     => $cookie_file,
        CURLOPT_TIMEOUT        => $config['timeout'],
        CURLOPT_SSL_VERIFYPEER => false
    ]);

    curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ($code >= 200 && $code < 400) ? $cookie_file : null;
}

function bot_api_call($url, $method = 'GET', $data = null, $cookie_file = null) {
    $ch = curl_init();

    $opts = [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json']
    ];

    if ($cookie_file) {
        $opts[CURLOPT_COOKIEFILE] = $cookie_file;
    }

    if ($method === 'POST' && $data !== null) {
        $opts[CURLOPT_POST] = true;
        $opts[CURLOPT_POSTFIELDS] = json_encode($data);
    }

    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code >= 200 && $code < 300 && $response) {
        return json_decode($response, true);
    }

    return null;
}

// =========================================
// Fallback: MQTT directo si el Bot no responde
// Usa la implementación MQTT raw como respaldo
// =========================================
function fallback_mqtt_activate($input) {
    $host    = $input['dns']    ?? $input['host']    ?? '50.62.182.131';
    $port    = (int)($input['puerto'] ?? $input['port'] ?? 1883);
    $topic   = $input['topic']  ?? '';
    $payload = $input['payload'] ?? 'PULSE';

    if (empty($topic)) {
        // Construir topic genérico si no se proporcionó
        $device = $input['mqtt_device'] ?? '';
        $relay  = $input['relay_number'] ?? 0;
        if ($device) {
            $topic = "home/relays/{$device}/{$relay}/set";
        } else {
            return ['success' => false, 'error' => 'No se pudo conectar al Bot Orquestador y no hay topic MQTT configurado'];
        }
    }

    return mqtt_publish_raw($host, $port, $topic, $payload);
}

function mqtt_publish_raw($host, $port, $topic, $payload) {
    $client_id = 'accesphone_' . substr(md5(uniqid()), 0, 8);

    $socket = @fsockopen($host, $port, $errno, $errstr, 5);
    if (!$socket) {
        return [
            'success' => false,
            'error'   => "Fallback MQTT: No se pudo conectar a {$host}:{$port}: {$errstr}",
            'mode'    => 'fallback_mqtt'
        ];
    }

    stream_set_timeout($socket, 5);

    // CONNECT
    $var_header = chr(0x00) . chr(0x04) . 'MQTT' . chr(0x04) . chr(0x02) . chr(0x00) . chr(0x3C);
    $connect_payload = mqtt_encode_str($client_id);
    $connect_packet = $var_header . $connect_payload;
    fwrite($socket, chr(0x10) . mqtt_encode_remaining(strlen($connect_packet)) . $connect_packet);

    $response = fread($socket, 4);
    if (strlen($response) < 4 || ord($response[0]) !== 0x20 || ord($response[3]) !== 0) {
        fclose($socket);
        return ['success' => false, 'error' => 'Fallback MQTT: CONNACK falló', 'mode' => 'fallback_mqtt'];
    }

    // PUBLISH
    $pub_header = mqtt_encode_str($topic);
    $pub_packet = $pub_header . $payload;
    fwrite($socket, chr(0x30) . mqtt_encode_remaining(strlen($pub_packet)) . $pub_packet);

    // DISCONNECT
    fwrite($socket, chr(0xE0) . chr(0x00));
    fclose($socket);

    return [
        'success'   => true,
        'message'   => "Fallback MQTT: Publicado en {$topic}",
        'topic'     => $topic,
        'mode'      => 'fallback_mqtt',
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

function mqtt_encode_str($str) {
    $len = strlen($str);
    return chr(($len >> 8) & 0xFF) . chr($len & 0xFF) . $str;
}

function mqtt_encode_remaining($length) {
    $encoded = '';
    do {
        $digit = $length % 128;
        $length = (int)($length / 128);
        if ($length > 0) $digit |= 0x80;
        $encoded .= chr($digit);
    } while ($length > 0);
    return $encoded;
}

function log_relay_activation($relay_id, $action, $success) {
    $log_dir = __DIR__ . '/logs';
    if (!is_dir($log_dir)) {
        @mkdir($log_dir, 0755, true);
    }
    $log_file = $log_dir . '/relay_activations.log';
    $entry = date('Y-m-d H:i:s') . " | RelayID: {$relay_id} | Action: {$action} | " .
             ($success ? 'OK' : 'FAIL') . "\n";
    @file_put_contents($log_file, $entry, FILE_APPEND | LOCK_EX);
}
