<?php
/**
 * Camera Proxy para Access Phone
 * Maneja autenticación HTTP Digest/Basic de cámaras Hikvision
 *
 * Uso: camera_proxy.php?channel=701
 */

// Configuración de cámaras - EDITAR SEGÚN TU INSTALACIÓN
$cameras = [
    // Canal => [host, puerto, usuario, contraseña, nombre]
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

    // Agregar más cámaras según necesites
];

// Mapeo de extensiones/números a canales de cámara
$extension_to_camera = [
    '1001' => '701',  // Extensión 1001 -> Canal 701
    '1002' => '702',  // Extensión 1002 -> Canal 702
    '101'  => '701',  // Extensión 101 -> Canal 701
    '102'  => '702',
    // Agregar más mapeos según necesites
];

// Headers CORS para permitir acceso desde el softphone
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Obtener parámetros
$channel = $_GET['channel'] ?? null;
$extension = $_GET['extension'] ?? null;
$action = $_GET['action'] ?? 'snapshot';

// Si se proporciona extensión, buscar el canal correspondiente
if ($extension && !$channel) {
    $channel = $extension_to_camera[$extension] ?? '701'; // Default a 701
}

// Acción: listar cámaras disponibles
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

// Validar canal
if (!$channel || !isset($cameras[$channel])) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Canal no válido o no configurado',
        'available_channels' => array_keys($cameras)
    ]);
    exit;
}

// Obtener configuración de la cámara
$cam = $cameras[$channel];
$url = "http://{$cam['host']}:{$cam['port']}/ISAPI/Streaming/channels/{$channel}/picture";

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
$result = getSnapshotWithDigestAuth($url, $cam['user'], $cam['pass']);

if ($result['success'] && $result['data']) {
    // Enviar imagen
    header('Content-Type: image/jpeg');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    header('X-Camera-Channel: ' . $channel);
    header('X-Camera-Name: ' . $cam['name']);

    echo $result['data'];
} else {
    // Error - enviar imagen de error o JSON
    if (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false) {
        header('Content-Type: application/json');
        http_response_code(502);
        echo json_encode([
            'success' => false,
            'error' => 'No se pudo obtener snapshot',
            'details' => [
                'http_code' => $result['http_code'],
                'curl_error' => $result['error'],
                'channel' => $channel
            ]
        ]);
    } else {
        // Enviar imagen de placeholder con error
        header('Content-Type: image/svg+xml');
        http_response_code(502);
        echo '<?xml version="1.0" encoding="UTF-8"?>
<svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#1e1b4b"/>
    <text x="50%" y="45%" text-anchor="middle" fill="#ff6b35" font-size="24" font-family="sans-serif">📹 Sin señal</text>
    <text x="50%" y="55%" text-anchor="middle" fill="#94a3b8" font-size="14" font-family="sans-serif">Canal: '.$channel.'</text>
    <text x="50%" y="65%" text-anchor="middle" fill="#64748b" font-size="12" font-family="sans-serif">Error: '.$result['http_code'].'</text>
</svg>';
    }
}
