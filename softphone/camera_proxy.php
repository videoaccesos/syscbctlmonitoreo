<?php
/**
 * Camera Proxy para Access Phone
 * Maneja autenticación HTTP Digest/Basic de cámaras Hikvision
 *
 * Modos de uso:
 *   camera_proxy.php?channel=701                          -> Canal estático (config local)
 *   camera_proxy.php?privada_id=1&cam=1                   -> Cámara de privada (BD)
 *   camera_proxy.php?action=list                          -> Listar cámaras estáticas
 *   camera_proxy.php?action=list_privada&privada_id=1     -> Listar cámaras de privada
 */

// Configuración de cámaras estáticas - EDITAR SEGÚN TU INSTALACIÓN
$cameras = [
    '702' => [
        'host' => 'estancia5.ddns.accessbot.net',
        'port' => 8081,
        'user' => 'admin',
        'pass' => 'v1de0acces0s',
        'name' => 'Rostro'
    ],
    '502' => [
        'host' => 'estancia5.ddns.accessbot.net',
        'port' => 8081,
        'user' => 'admin',
        'pass' => 'v1de0acces0s',
        'name' => 'ID'
    ],
    '802' => [
        'host' => 'estancia5.ddns.accessbot.net',
        'port' => 8081,
        'user' => 'admin',
        'pass' => 'v1de0acces0s',
        'name' => 'Vehiculo'
    ],
    '102' => [
        'host' => 'estancia5.ddns.accessbot.net',
        'port' => 8081,
        'user' => 'admin',
        'pass' => 'v1de0acces0s',
        'name' => 'Entrada'
    ],
    '202' => [
        'host' => 'estancia5.ddns.accessbot.net',
        'port' => 8081,
        'user' => 'admin',
        'pass' => 'v1de0acces0s',
        'name' => 'salida'
    ],
];

// Credenciales por defecto para cámaras Hikvision (usadas cuando la BD no tiene credenciales propias)
$default_cam_credentials = [
    'user' => 'admin',
    'pass' => 'v1de0acces0s'
];

// Mapeo de extensiones/números a canales de cámara
$extension_to_camera = [
    '1001' => '701',
    '1002' => '702',
    '101'  => '701',
    '102'  => '702',
];

// --- Configuración de BD (reutiliza config de CodeIgniter si existe) ---
$db_config = [
    'host'    => 'localhost',
    'user'    => 'wwwvideo',
    'pass'    => '',
    'dbname'  => 'wwwvideo_video_accesos',
    'charset' => 'utf8'
];

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

// Headers CORS para permitir acceso desde el softphone
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Obtener parámetros
$channel = $_GET['channel'] ?? null;
$extension = $_GET['extension'] ?? null;
$action = $_GET['action'] ?? 'snapshot';
$privada_id = isset($_GET['privada_id']) ? (int)$_GET['privada_id'] : 0;
$cam_index = isset($_GET['cam']) ? (int)$_GET['cam'] : 0; // 1, 2 o 3

// Si se proporciona extensión, buscar el canal correspondiente
if ($extension && !$channel) {
    $channel = $extension_to_camera[$extension] ?? '701';
}

// ==============================================
// ACCIÓN: Listar cámaras de una privada desde BD
// ==============================================
if ($action === 'list_privada' && $privada_id > 0) {
    header('Content-Type: application/json');
    $privada = getPrivadaFromDB($privada_id);
    if (!$privada) {
        echo json_encode(['success' => false, 'error' => 'Privada no encontrada']);
        exit;
    }
    $list = [];
    for ($i = 1; $i <= 3; $i++) {
        $videoUrl = trim($privada["video_{$i}"] ?? '');
        $alias = trim($privada["alias_video{$i}"] ?? '');
        if (!empty($videoUrl)) {
            $list[] = [
                'cam'     => $i,
                'name'    => $alias ?: "Cámara {$i}",
                'has_url' => true
            ];
        }
    }
    echo json_encode([
        'success' => true,
        'privada' => $privada['descripcion'] ?? '',
        'cameras' => $list
    ]);
    exit;
}

// Acción: listar cámaras estáticas
if ($action === 'list') {
    header('Content-Type: application/json');
    $list = [];
    foreach ($cameras as $ch => $cam) {
        $list[] = [
            'channel' => $ch,
            'name' => $cam['name']
        ];
    }
    echo json_encode([
        'success' => true,
        'cameras' => $list,
        'mapping' => $extension_to_camera
    ]);
    exit;
}

// Acción: obtener mapeo de extensión
if ($action === 'mapping') {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'extension' => $extension,
        'channel' => $extension_to_camera[$extension] ?? null,
        'camera' => isset($extension_to_camera[$extension]) ? $cameras[$extension_to_camera[$extension]]['name'] ?? 'Desconocida' : null
    ]);
    exit;
}

// ==============================================
// SNAPSHOT: Determinar URL de la cámara
// ==============================================

$cam_user = $default_cam_credentials['user'];
$cam_pass = $default_cam_credentials['pass'];
$cam_name = '';

// --- Modo 1: Cámara de privada (BD) ---
if ($privada_id > 0 && $cam_index >= 1 && $cam_index <= 3) {
    $privada = getPrivadaFromDB($privada_id);
    if (!$privada) {
        sendErrorResponse('Privada no encontrada', 404);
        exit;
    }

    $videoUrl = trim($privada["video_{$cam_index}"] ?? '');
    $cam_name = trim($privada["alias_video{$cam_index}"] ?? '') ?: "Cámara {$cam_index}";

    if (empty($videoUrl)) {
        sendErrorResponse("Cámara {$cam_index} no configurada para esta privada", 404);
        exit;
    }

    // La URL de video_1/2/3 puede ser:
    //   a) URL completa ISAPI: http://host:port/ISAPI/Streaming/channels/702/picture
    //   b) Solo canal (ej: "702") -> construir URL con dns de la privada
    //   c) URL MJPEG directa
    if (preg_match('/^\d+$/', $videoUrl)) {
        // Solo es un número de canal - usar dns_1 de la privada como host
        $host = trim($privada['dns_1'] ?? '');
        $port = trim($privada['puerto_1'] ?? '8081');
        if (empty($host)) {
            sendErrorResponse('DNS no configurado para esta privada', 400);
            exit;
        }
        $url = "http://{$host}:{$port}/ISAPI/Streaming/channels/{$videoUrl}/picture";
    } elseif (preg_match('#^https?://#i', $videoUrl)) {
        // URL completa - si es ISAPI, hacer proxy; si no, redirigir
        if (stripos($videoUrl, '/ISAPI/') !== false || stripos($videoUrl, '/picture') !== false) {
            $url = $videoUrl;
        } else {
            // URL directa (MJPEG/JPEG) - intentar proxy con auth por si la necesita
            $url = $videoUrl;
        }
    } else {
        // Tratar como host:port/channel con formato "host:port/canal"
        // o como un path relativo
        $url = $videoUrl;
    }
} elseif ($channel && isset($cameras[$channel])) {
    // --- Modo 2: Canal estático (config local) ---
    $cam_data = $cameras[$channel];
    $cam_user = $cam_data['user'];
    $cam_pass = $cam_data['pass'];
    $cam_name = $cam_data['name'];
    $url = "http://{$cam_data['host']}:{$cam_data['port']}/ISAPI/Streaming/channels/{$channel}/picture";
} else {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Parámetros insuficientes. Use channel=X o privada_id=X&cam=N',
        'available_channels' => array_keys($cameras)
    ]);
    exit;
}

// Función para obtener snapshot con autenticación Digest
function getSnapshotWithDigestAuth($url, $user, $pass) {
    $ch = curl_init();

    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_HTTPAUTH => CURLAUTH_DIGEST | CURLAUTH_BASIC,
        CURLOPT_USERPWD => "{$user}:{$pass}",
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_USERAGENT => 'AccessPhone/2.0',
        // Headers adicionales para Hikvision
        CURLOPT_HTTPHEADER => [
            'Accept: image/jpeg, image/*',
            'Cache-Control: no-cache'
        ]
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $error = curl_error($ch);

    curl_close($ch);

    return [
        'success' => $httpCode === 200 && $response !== false,
        'data' => $response,
        'http_code' => $httpCode,
        'content_type' => $contentType,
        'error' => $error
    ];
}

// Obtener snapshot
$result = getSnapshotWithDigestAuth($url, $cam_user, $cam_pass);

if ($result['success'] && $result['data']) {
    // Enviar imagen
    header('Content-Type: image/jpeg');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    header('X-Camera-Channel: ' . ($channel ?: "privada_{$privada_id}_cam{$cam_index}"));
    header('X-Camera-Name: ' . $cam_name);
    if ($privada_id > 0) {
        header('X-Privada-Id: ' . $privada_id);
    }

    // --- Guardar snapshot para registro de accesos ---
    if ($privada_id > 0 && isset($_GET['save']) && $_GET['save'] === '1') {
        saveAccessSnapshot($privada_id, $cam_index, $cam_name, $result['data']);
    }

    echo $result['data'];
} else {
    // Error - enviar imagen de error o JSON
    $label = $cam_name ?: ($channel ?: "Cam {$cam_index}");
    if (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false) {
        header('Content-Type: application/json');
        http_response_code(502);
        echo json_encode([
            'success' => false,
            'error' => 'No se pudo obtener snapshot',
            'details' => [
                'http_code' => $result['http_code'],
                'curl_error' => $result['error'],
                'camera' => $label
            ]
        ]);
    } else {
        header('Content-Type: image/svg+xml');
        http_response_code(502);
        $safeLabel = htmlspecialchars($label, ENT_XML1);
        echo '<?xml version="1.0" encoding="UTF-8"?>
<svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1e1b4b"/>
    <text x="50%" y="45%" text-anchor="middle" fill="#ff6b35" font-size="24" font-family="sans-serif">Sin señal</text>
    <text x="50%" y="55%" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="sans-serif">'.$safeLabel.'</text>
    <text x="50%" y="65%" text-anchor="middle" fill="#64748b" font-size="12" font-family="sans-serif">Error: '.$result['http_code'].'</text>
</svg>';
    }
}

// ==============================================
// FUNCIONES AUXILIARES
// ==============================================

/**
 * Obtener datos de una privada desde la BD
 */
function getPrivadaFromDB($privada_id) {
    global $db_config;
    static $cache = [];

    if (isset($cache[$privada_id])) return $cache[$privada_id];

    $conn = new mysqli($db_config['host'], $db_config['user'], $db_config['pass'], $db_config['dbname']);
    if ($conn->connect_error) return null;
    $conn->set_charset($db_config['charset']);

    $stmt = $conn->prepare(
        "SELECT privada_id, descripcion,
                video_1, video_2, video_3,
                alias_video1, alias_video2, alias_video3,
                dns_1, dns_2, dns_3,
                puerto_1, puerto_2, puerto_3
         FROM privadas
         WHERE privada_id = ? AND estatus_id = 1
         LIMIT 1"
    );
    $stmt->bind_param('i', $privada_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();
    $conn->close();

    if ($row) $cache[$privada_id] = $row;
    return $row;
}

/**
 * Enviar respuesta de error como SVG o JSON
 */
function sendErrorResponse($message, $code = 400) {
    if (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false) {
        header('Content-Type: application/json');
        http_response_code($code);
        echo json_encode(['success' => false, 'error' => $message]);
    } else {
        header('Content-Type: image/svg+xml');
        http_response_code($code);
        $safe = htmlspecialchars($message, ENT_XML1);
        echo '<?xml version="1.0" encoding="UTF-8"?>
<svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1e1b4b"/>
    <text x="50%" y="50%" text-anchor="middle" fill="#ff6b35" font-size="18" font-family="sans-serif">'.$safe.'</text>
</svg>';
    }
}

/**
 * Guardar snapshot de acceso para bitácora
 */
function saveAccessSnapshot($privada_id, $cam_index, $cam_name, $jpegData) {
    $dir = __DIR__ . '/snapshots/' . date('Y-m-d');
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $filename = sprintf('p%d_cam%d_%s.jpg', $privada_id, $cam_index, date('His'));
    $filepath = $dir . '/' . $filename;
    @file_put_contents($filepath, $jpegData);

    // Registrar en log JSON
    $logFile = $dir . '/access_log.json';
    $entry = [
        'timestamp'  => date('c'),
        'privada_id' => $privada_id,
        'camera'     => $cam_name,
        'cam_index'  => $cam_index,
        'snapshot'   => $filename
    ];
    @file_put_contents($logFile, json_encode($entry) . "\n", FILE_APPEND | LOCK_EX);
}
