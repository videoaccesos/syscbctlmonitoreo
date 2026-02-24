<?php
include("../fusioncharts.php");
$server     = 'localhost'; //servidor
$username   = 'videoacc_root'; //usuario de la base de datos
$password   = 'a1b2c3d4'; //password del usuario de la base de datos
$database   = 'videoacc_video_accesos'; //nombre de la base de datos

if (isset($_GET["fechaInicial"]) && isset($_GET["fechaFinal"])) {
    $grafica = $_GET["grafica"];
    $fechaInicial = $_GET["fechaInicial"];
    $fechaFinal = $_GET["fechaFinal"];
  }
$total=0;
$totalGeneral=0;
$conexion = @new mysqli($server, $username, $password, $database);
 
if ($conexion->connect_error)
{
    die('Error de conexi贸n: ' . $conexion->connect_error);
}
?>
<html>
   <head>
    <title>Gráfica 3D</title>
    <link  rel="stylesheet" type="text/css" href="css/style.css" />

    <!-- You need to include the following JS file to render the chart.
    When you make your own charts, make sure that the path to this JS file is correct.
    Else, you will get JavaScript errors. -->

    <script src="../fusioncharts/fusioncharts.js"></script>
  </head>

   <body>
<?php
if ($grafica == 1)
{
$query="SELECT SUM(precio) as folios_h, IFNULL((SELECT SUM(precio) FROM residencias_residentes_tarjetas_no_renovacion WHERE fecha >= '".$fechaInicial."' and fecha <= '".$fechaFinal."'),0) as folios_b, IFNULL((SELECT SUM(total) FROM folios_mensualidades WHERE fecha >= '".$fechaInicial."' and fecha <= '".$fechaFinal."'),0) as folios_a FROM residencias_residentes_tarjetas WHERE fecha >= '".$fechaInicial."' and fecha <= '".$fechaFinal."'" ;
$result = $conexion->query($query);

while($row=$result->fetch_assoc()){
$foliosH = $row['folios_h'];
$foliosB = $row['folios_b'];
$foliosA = $row['folios_a'];
$totalGeneral = $row['folios_h'] + $row['folios_b'] + $row['folios_a'];
}
  // If the query returns a valid response, prepare the JSON string
  if ($result) {
    // The `$arrData` array holds the chart attributes and data
    $arrData = array(
      "chart" => array(
          "caption" => "Ingresos",
          "subcaption" => "Del ".$fechaInicial." al ".$fechaFinal,
          "formatnumberscale" => "0",
          "showborder" => "0"
        )
    );
    $arrData["data"] = array();

    // Push the data into the array
    array_push($arrData["data"], array(
        "label" => "Folios H",
        "value" => $foliosH
        )
    );
    array_push($arrData["data"], array(
        "label" => "Folios B",
        "value" => $foliosB
        )
    );
    array_push($arrData["data"], array(
        "label" => "Folios A",
        "value" => $foliosA
        )
    );

    $jsonEncodedData = json_encode($arrData);

    $columnChart = new FusionCharts("pie3d", "ex2", 740,490, "chart-1", "json", $jsonEncodedData);

    $columnChart->render();

    }
  }

  if ($grafica == 2)
  {
    // The `$arrData` array holds the chart attributes and data
    $arrData = array(
      "chart" => array(
          "caption" => "Venta Folios H (Comparativa)",
          "subcaption" => "Del ".$fechaInicial." al ".$fechaFinal,
          "paletteColors" => "#0075c2",
          "bgColor" => "#ffffff",
          "borderAlpha"=> "20",
          "canvasBorderAlpha"=> "0",
          "usePlotGradientColor"=> "0",
          "plotBorderAlpha"=> "10",
          "showXAxisLine"=> "1",
          "xAxisLineColor" => "#999999",
          "showValues" => "0",
          "divlineColor" => "#999999",
          "divLineIsDashed" => "1",
          "showAlternateHGridColor" => "0"
        )
    );

    $arrData["data"] = array();

    for($i=$fechaInicial;$i<=$fechaFinal;$i = date("Y-m-d", strtotime($i ."+ 1 days"))){
      //echo $i . "<br />";
      $query="SELECT SUM(precio) as total FROM residencias_residentes_tarjetas WHERE fecha ='".$i."'";
      $result = $conexion->query($query);
      while($row=$result->fetch_assoc()){
      $total = $row['total'];
      //echo $total;
      }
      $queryTotal="SELECT FORMAT(SUM(precio),2) as totalGeneral FROM residencias_residentes_tarjetas WHERE fecha >='".$fechaInicial."' and fecha >='".$fechaFinal."'";
      $resultTotal = $conexion->query($queryTotal);
      while($row2=$resultTotal->fetch_assoc()){
      $totalGeneral = $row2['totalGeneral'];
      //echo $total;
      }
      array_push($arrData["data"], array(
          "label" => $i,
          "value" => $total
          )
      );

    }
    $jsonEncodedData = json_encode($arrData);

    $columnChart = new FusionCharts("column2D", "myFirstChart" , 740,490, "chart-1", "json", $jsonEncodedData);

    // Render the chart
    $columnChart->render();
  }

  if ($grafica == 3)
  {
    // The `$arrData` array holds the chart attributes and data
    $arrData = array(
      "chart" => array(
          "caption" => "Venta Folios B (Comparativa)",
          "subcaption" => "Del ".$fechaInicial." al ".$fechaFinal,
          "paletteColors" => "#0075c2",
          "bgColor" => "#ffffff",
          "borderAlpha"=> "20",
          "canvasBorderAlpha"=> "0",
          "usePlotGradientColor"=> "0",
          "plotBorderAlpha"=> "10",
          "showXAxisLine"=> "1",
          "xAxisLineColor" => "#999999",
          "showValues" => "0",
          "divlineColor" => "#999999",
          "divLineIsDashed" => "1",
          "showAlternateHGridColor" => "0"
        )
    );

    $arrData["data"] = array();

    for($i=$fechaInicial;$i<=$fechaFinal;$i = date("Y-m-d", strtotime($i ."+ 1 days"))){
      //echo $i . "<br />";
      $query="SELECT SUM(precio) as total FROM residencias_residentes_tarjetas_no_renovacion WHERE fecha ='".$i."'";
      $result = $conexion->query($query);
      while($row=$result->fetch_assoc()){
      $total = $row['total'];
      //echo $total;
      }
      $queryTotal="SELECT FORMAT(SUM(precio),2) as totalGeneral FROM residencias_residentes_tarjetas_no_renovacion WHERE fecha >='".$fechaInicial."' and fecha >='".$fechaFinal."'";
      $resultTotal = $conexion->query($queryTotal);
      while($row2=$resultTotal->fetch_assoc()){
      $totalGeneral = $row2['totalGeneral'];
      //echo $total;
      }
      array_push($arrData["data"], array(
          "label" => $i,
          "value" => $total
          )
      );

    }
    $jsonEncodedData = json_encode($arrData);

    $columnChart = new FusionCharts("column2D", "myFirstChart" , 740,490, "chart-1", "json", $jsonEncodedData);

    // Render the chart
    $columnChart->render();
  }

  if ($grafica == 4)
  {
    // The `$arrData` array holds the chart attributes and data
    $arrData = array(
      "chart" => array(
          "caption" => "Venta Folios A (Comparativa)",
          "subcaption" => "Del ".$fechaInicial." al ".$fechaFinal,
          "paletteColors" => "#0075c2",
          "bgColor" => "#ffffff",
          "borderAlpha"=> "20",
          "canvasBorderAlpha"=> "0",
          "usePlotGradientColor"=> "0",
          "plotBorderAlpha"=> "10",
          "showXAxisLine"=> "1",
          "xAxisLineColor" => "#999999",
          "showValues" => "0",
          "divlineColor" => "#999999",
          "divLineIsDashed" => "1",
          "showAlternateHGridColor" => "0"
        )
    );

    $arrData["data"] = array();

    for($i=$fechaInicial;$i<=$fechaFinal;$i = date("Y-m-d", strtotime($i ."+ 1 days"))){
      //echo $i . "<br />";
      $query="SELECT SUM(total) as total FROM folios_mensualidades WHERE fecha LIKE '%".$i."%'";
      $result = $conexion->query($query);
      while($row=$result->fetch_assoc()){
      $total = $row['total'];
      //echo $total;
      }
      $queryTotal="SELECT FORMAT(SUM(total),2) as totalGeneral FROM folios_mensualidades WHERE fecha >='".$fechaInicial."' and fecha >='".$fechaFinal."'";
      $resultTotal = $conexion->query($queryTotal);
      while($row2=$resultTotal->fetch_assoc()){
      $totalGeneral = $row2['totalGeneral'];
      //echo $total;
      }
      array_push($arrData["data"], array(
          "label" => $i,
          "value" => $total
          )
      );

    }
    $jsonEncodedData = json_encode($arrData);

    $columnChart = new FusionCharts("column2D", "myFirstChart" , 740,490, "chart-1", "json", $jsonEncodedData);

    // Render the chart
    $columnChart->render();
  }

if ($grafica == 5)
{
    // The `$arrData` array holds the chart attributes and data
    $arrData = array(
      "chart" => array(
          "caption" => "Llamadas por monitorista",
          "subcaption" => "Del ".$fechaInicial." al ".$fechaFinal,
          "formatnumberscale" => "0",
          "showborder" => "0"
        )
    );
    $arrData["data"] = array();

    $query="SELECT u.usuario, (SELECT COUNT( * ) FROM registros_accesos WHERE usuario_id = u.usuario_id AND fecha_modificacion >= '".$fechaInicial."' and fecha_modificacion <='".$fechaFinal."') AS total_llamadas FROM usuarios as u INNER JOIN empleados as e on u.empleado_id = e.empleado_id WHERE e.puesto_id=1" ;
    $result = $conexion->query($query);

    while($row=$result->fetch_assoc()){
    $llamadas = $row['total_llamadas'];
    $usuario = $row['usuario'];
      if($llamadas > 0)
      {
        array_push($arrData["data"], array(
            "label" => $usuario,
            "value" => $llamadas
            )
        );
      }
    }
    // Push the data into the array

    $jsonEncodedData = json_encode($arrData);

    $columnChart = new FusionCharts("pie3d", "ex2", 740,490, "chart-1", "json", $jsonEncodedData);

    $columnChart->render();

  }

  $conexion->close();
?>
    
    <!--<h5><?php echo "Total General: $". $totalGeneral;?></h5>-->
    <div id="chart-1"><!-- Fusion Charts will render here-->
    </div>
   </body>

</html>