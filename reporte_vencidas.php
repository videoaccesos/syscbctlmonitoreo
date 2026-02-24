<?php
// Habilitar la visualización de errores en PHP
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Configuración de la conexión a la base de datos
$servername = "localhost";
$username = "wwwvideo_root";
$password = "V1de0@cces0s";
$dbname = "wwwvideo_video_accesos";

// Crear conexión
$conn = new mysqli($servername, $username, $password, $dbname);

// Verificar conexión
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Obtener parámetros de fecha desde la URL
$fechaInicial = isset($_GET['fechaInicial']) ? $_GET['fechaInicial'] : '2023-06-03';
$fechaFinal = isset($_GET['fechaFinal']) ? $_GET['fechaFinal'] : '2024-06-06';

// Validación básica de los parámetros de fecha (puedes agregar más validaciones según tus necesidades)
if (empty($fechaInicial) || empty($fechaFinal)) {
    die("Por favor, proporcione ambas fechas en el formato correcto.");
}

// Preparar y ejecutar la consulta SQL
$stmt = $conn->prepare("SELECT privada, tarjeta_id, tarjeta_id2, tarjeta_id3, tarjeta_id4, fecha_vencimiento, observaciones 
                        FROM residencias_residentes_tarjetas 
                        WHERE fecha_vencimiento BETWEEN ? AND ? 
                        ORDER BY descripcion");
$stmt->bind_param("ss", $fechaInicial, $fechaFinal);
$stmt->execute();
$result = $stmt->get_result();

// Generar el reporte (ejemplo en HTML)
echo "<html><head><title>Reporte de Ventas</title></head><body>";
echo "<h2>Reporte de Venta de Tarjetas</h2>";
echo "<table border='1'>";
echo "<tr><th>Privada</th><th>Tarjeta ID</th><th>Tarjeta ID2</th><th>Tarjeta ID3</th><th>Tarjeta ID4</th><th>Fecha de Vencimiento</th><th>Observaciones</th></tr>";

while ($row = $result->fetch_assoc()) {
    echo "<tr>";
    echo "<td>" . htmlspecialchars($row['privada']) . "</td>";
    echo "<td>" . htmlspecialchars($row['tarjeta_id']) . "</td>";
    echo "<td>" . htmlspecialchars($row['tarjeta_id2']) . "</td>";
    echo "<td>" . htmlspecialchars($row['tarjeta_id3']) . "</td>";
    echo "<td>" . htmlspecialchars($row['tarjeta_id4']) . "</td>";
    echo "<td>" . htmlspecialchars($row['fecha_vencimiento']) . "</td>";
    echo "<td>" . htmlspecialchars($row['observaciones']) . "</td>";
    echo "</tr>";
}

echo "</table>";
echo "</body></html>";

// Cerrar la conexión
$stmt->close();
$conn->close();
?>
