<?php
/**
 * API Privada para Access Phone
 * Obtiene datos de video y DNS/relay de una privada para el softphone
 *
 * Endpoints:
 *   ?action=lookup_caller&telefono=7131494  -> Busca privada por telefono
 *   ?action=get_videos&privada_id=1         -> Obtiene URLs de video de la privada
 *   ?action=get_relays&privada_id=1         -> Obtiene config DNS/relay de la privada
 *   ?action=list_privadas                   -> Lista privadas activas
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
        // Limpiar output previo si hay alguno
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

// Configuración de base de datos
$db_config = [
    'host'    => 'localhost',
    'user'    => 'wwwvideo',
    'pass'    => '',
    'dbname'  => 'wwwvideo_video_accesos',
    'charset' => 'utf8'
];

// Intentar leer config de CodeIgniter si existe
// Definir BASEPATH para evitar que el security check de CI haga exit
if (!defined('BASEPATH')) {
    define('BASEPATH', __DIR__ . '/../system/');
}
$ci_config_path = __DIR__ . '/../application/config/database.php';
if (file_exists($ci_config_path)) {
    $db = [];
    @include($ci_config_path);
    if (isset($db['default'])) {
        $db_config['host']   = $db['default']['hostname'] ?? $db_config['host'];
        $db_config['user']   = $db['default']['username'] ?? $db_config['user'];
        $db_config['pass']   = $db['default']['password'] ?? $db_config['pass'];
        $db_config['dbname'] = $db['default']['database'] ?? $db_config['dbname'];
    }
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

// Conexión a BD
$conn = new mysqli(
    $db_config['host'],
    $db_config['user'],
    $db_config['pass'],
    $db_config['dbname']
);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Error de conexión a BD'
    ]);
    exit;
}

$conn->set_charset($db_config['charset']);

$action = $_GET['action'] ?? '';

switch ($action) {

    // =========================================
    // LOOKUP: Buscar privada por teléfono
    // Usa el campo 'telefono' como caller ID
    // =========================================
    case 'lookup_caller':
        $telefono = $conn->real_escape_string($_GET['telefono'] ?? '');
        if (empty($telefono)) {
            echo json_encode(['success' => false, 'error' => 'Teléfono requerido']);
            break;
        }

        // Limpiar el teléfono: quitar guiones, espacios, paréntesis
        $tel_clean = preg_replace('/[^0-9]/', '', $telefono);

        // Buscar coincidencia exacta o parcial (últimos dígitos)
        $sql = "SELECT privada_id, descripcion, telefono, celular,
                       CONCAT(nombre, ' ', ape_paterno, ' ', ape_materno) AS contacto,
                       video_1, video_2, video_3,
                       alias_video1, alias_video2, alias_video3,
                       dns_1, dns_2, dns_3,
                       puerto_1, puerto_2, puerto_3,
                       alias_1, alias_2, alias_3
                FROM privadas
                WHERE estatus_id = 1
                  AND (
                    REPLACE(REPLACE(REPLACE(telefono, '-', ''), ' ', ''), '(', '') LIKE '%{$tel_clean}%'
                    OR REPLACE(REPLACE(REPLACE(celular, '-', ''), ' ', ''), '(', '') LIKE '%{$tel_clean}%'
                  )
                LIMIT 1";

        $result = $conn->query($sql);

        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            echo json_encode([
                'success'    => true,
                'privada_id' => (int)$row['privada_id'],
                'nombre'     => $row['descripcion'],
                'contacto'   => trim($row['contacto']),
                'telefono'   => $row['telefono'],
                'videos'     => buildVideos($row),
                'relays'     => buildRelays($row)
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error'   => 'No se encontró privada con ese teléfono'
            ]);
        }
        break;

    // =========================================
    // VIDEOS: Obtener URLs de video de privada
    // Campos: video_1, video_2, video_3
    // =========================================
    case 'get_videos':
        $privada_id = (int)($_GET['privada_id'] ?? 0);
        if ($privada_id <= 0) {
            echo json_encode(['success' => false, 'error' => 'privada_id requerido']);
            break;
        }

        $sql = "SELECT video_1, video_2, video_3,
                       alias_video1, alias_video2, alias_video3
                FROM privadas
                WHERE privada_id = {$privada_id}
                  AND estatus_id = 1
                LIMIT 1";

        $result = $conn->query($sql);

        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            echo json_encode([
                'success' => true,
                'videos'  => buildVideos($row)
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Privada no encontrada']);
        }
        break;

    // =========================================
    // RELAYS: Obtener config DNS/relay de privada
    // Campos: dns_1, dns_2, dns_3
    // =========================================
    case 'get_relays':
        $privada_id = (int)($_GET['privada_id'] ?? 0);
        if ($privada_id <= 0) {
            echo json_encode(['success' => false, 'error' => 'privada_id requerido']);
            break;
        }

        $sql = "SELECT dns_1, dns_2, dns_3,
                       puerto_1, puerto_2, puerto_3,
                       alias_1, alias_2, alias_3,
                       tipo_tarjeta1, tipo_tarjeta2, tipo_tarjeta3,
                       contrasena_1, contrasena_2, contrasena_3
                FROM privadas
                WHERE privada_id = {$privada_id}
                  AND estatus_id = 1
                LIMIT 1";

        $result = $conn->query($sql);

        if ($result && $result->num_rows > 0) {
            $row = $result->fetch_assoc();
            echo json_encode([
                'success' => true,
                'relays'  => buildRelays($row)
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Privada no encontrada']);
        }
        break;

    // =========================================
    // LIST: Listar privadas activas
    // =========================================
    case 'list_privadas':
        $sql = "SELECT privada_id, descripcion, telefono
                FROM privadas
                WHERE estatus_id = 1
                ORDER BY descripcion ASC";

        $result = $conn->query($sql);
        $privadas = [];

        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $privadas[] = [
                    'id'        => (int)$row['privada_id'],
                    'nombre'    => $row['descripcion'],
                    'telefono'  => $row['telefono']
                ];
            }
        }

        echo json_encode([
            'success'  => true,
            'privadas' => $privadas
        ]);
        break;

    // =========================================
    // BOT RELAYS: Obtener relays reales del Bot Orquestador
    // Consulta tabla device_relays de la BD del bot
    // =========================================
    case 'get_bot_relays':
        $residencial_id = $conn->real_escape_string($_GET['residencial_id'] ?? '');

        // Conectar a la BD del Bot Orquestador
        $bot_conn = connectBotDB();
        if (!$bot_conn) {
            echo json_encode(['success' => false, 'error' => 'No se pudo conectar a BD del Bot Orquestador']);
            break;
        }

        $where_clause = $residencial_id ? "AND dr.residencial_id = '{$residencial_id}'" : '';

        $sql = "SELECT dr.id, dr.mqtt_device, dr.relay_number, dr.funcion_relay,
                       dr.tipo_funcion, dr.device_type, dr.nombre, dr.pulse_duration_ms,
                       dr.notas, dr.activo,
                       r.nombre AS residencial_nombre, r.residencial AS residencial_code
                FROM device_relays dr
                LEFT JOIN residenciales r ON dr.residencial_id = r.residencial
                WHERE dr.activo = 1 {$where_clause}
                ORDER BY r.nombre, dr.relay_number";

        $result = $bot_conn->query($sql);
        $relays = [];

        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $relays[] = [
                    'id'            => (int)$row['id'],
                    'mqtt_device'   => $row['mqtt_device'],
                    'relay_number'  => (int)$row['relay_number'],
                    'funcion'       => $row['funcion_relay'],
                    'tipo'          => $row['tipo_funcion'],
                    'device_type'   => $row['device_type'],
                    'nombre'        => $row['nombre'] ?: $row['funcion_relay'],
                    'pulse_ms'      => (int)($row['pulse_duration_ms'] ?: 500),
                    'notas'         => $row['notas'] ?: '',
                    'grupo'         => $row['residencial_nombre'] ?: 'Sin asignar',
                    'residencial'   => $row['residencial_code'] ?: ''
                ];
            }
        }

        $bot_conn->close();

        echo json_encode([
            'success' => true,
            'relays'  => $relays
        ]);
        break;

    // =========================================
    // BOT ESCENARIOS: Obtener escenarios disponibles
    // =========================================
    case 'get_escenarios':
        $residencial_id = $conn->real_escape_string($_GET['residencial_id'] ?? '');

        $bot_conn = connectBotDB();
        if (!$bot_conn) {
            echo json_encode(['success' => false, 'error' => 'No se pudo conectar a BD del Bot Orquestador']);
            break;
        }

        $where_clause = $residencial_id ? "AND e.residencial_id = '{$residencial_id}'" : '';

        $sql = "SELECT e.id, e.nombre, e.descripcion, e.trigger_type, e.trigger_value,
                       e.residencial_id,
                       r.nombre AS residencial_nombre
                FROM escenarios e
                LEFT JOIN residenciales r ON e.residencial_id = r.residencial
                WHERE e.activo = 1 {$where_clause}
                ORDER BY r.nombre, e.nombre";

        $result = $bot_conn->query($sql);
        $escenarios = [];

        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $escenarios[] = [
                    'id'             => (int)$row['id'],
                    'nombre'         => $row['nombre'],
                    'descripcion'    => $row['descripcion'] ?: '',
                    'trigger_type'   => $row['trigger_type'],
                    'trigger_value'  => $row['trigger_value'],
                    'residencial'    => $row['residencial_id'],
                    'grupo'          => $row['residencial_nombre'] ?: 'Sin asignar'
                ];
            }
        }

        $bot_conn->close();

        echo json_encode([
            'success'    => true,
            'escenarios' => $escenarios
        ]);
        break;

    default:
        echo json_encode([
            'success' => false,
            'error'   => 'Acción no válida',
            'actions' => ['lookup_caller', 'get_videos', 'get_relays', 'list_privadas']
        ]);
        break;
}

$conn->close();

// =========================================
// HELPERS
// =========================================

function buildVideos($row) {
    $videos = [];
    for ($i = 1; $i <= 3; $i++) {
        $url = trim($row["video_{$i}"] ?? '');
        $alias = trim($row["alias_video{$i}"] ?? '');
        if (!empty($url)) {
            $videos[] = [
                'id'    => $i,
                'url'   => $url,
                'alias' => $alias ?: "Cámara {$i}"
            ];
        }
    }
    return $videos;
}

function buildRelays($row) {
    $relays = [];
    for ($i = 1; $i <= 3; $i++) {
        $dns = trim($row["dns_{$i}"] ?? '');
        $puerto = trim($row["puerto_{$i}"] ?? '');
        $alias = trim($row["alias_{$i}"] ?? '');
        if (!empty($dns)) {
            $relays[] = [
                'id'     => $i,
                'dns'    => $dns,
                'puerto' => $puerto,
                'alias'  => $alias ?: "Relay {$i}"
            ];
        }
    }
    return $relays;
}

/**
 * Conectar a la BD del Bot Orquestador (wwwvideo_acceso_codigo)
 * Lee credenciales del .env del bot si existe
 */
function connectBotDB() {
    $bot_db = [
        'host'   => 'localhost',
        'user'   => 'wwwvideo_qr',
        'pass'   => '',
        'dbname' => 'wwwvideo_acceso_codigo'
    ];

    // Leer .env del bot para credenciales
    $env_path = '/opt/bot-multitarea/.env';
    if (file_exists($env_path)) {
        $lines = file($env_path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '#') === 0) continue;
            if (strpos($line, '=') === false) continue;
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val);
            switch ($key) {
                case 'DB_HOST': $bot_db['host'] = $val; break;
                case 'DB_USER': $bot_db['user'] = $val; break;
                case 'DB_PASS': $bot_db['pass'] = $val; break;
                case 'DB_NAME': $bot_db['dbname'] = $val; break;
            }
        }
    }

    $conn = @new mysqli($bot_db['host'], $bot_db['user'], $bot_db['pass'], $bot_db['dbname']);
    if ($conn->connect_error) {
        return null;
    }
    $conn->set_charset('utf8');
    return $conn;
}
