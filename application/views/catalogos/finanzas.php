<?php
$server     = 'localhost'; //servidor
$username   = 'videoacc_root'; //usuario de la base de datos
$password   = 'a1b2c3d4'; //password del usuario de la base de datos
$database   = 'videoacc_video_accesos'; //nombre de la base de datos

$totalTarjetas=0;
$totalVehicularesH=0;
$totalPeatonalesH=0;
$totalVehicularesB=0;
$totalPeatonalesB=0;
$totalVehiculares=0;
$totalPeatonales=0;
$fechaActual= date('Y-m-d');
$totalEfectivo=0;
$totalBancos=0;
$totalEfectivoGastos=0;
$totalBancosGastos=0;
$totalGastosFijos=0;
$totalGastosVariables=0;
$totalGeneralFolios=0;

$conexion = @new mysqli($server, $username, $password, $database);
 
if ($conexion->connect_error) //verificamos si hubo un error al conectar, recuerden que pusimos el @ para evitarlo
{
    die('Error de conexi贸n: ' . $conexion->connect_error); //si hay un error termina la aplicaci贸n y mostramos el error
}

$contadorPeatonalesH="SELECT COUNT(*) FROM residencias_residentes_tarjetas_detalle AS RRTD INNER JOIN tarjetas AS T ON RRTD.lectura = T.lectura INNER JOIN residencias_residentes_tarjetas as RRT on RRTD.asignacion_id = RRT.asignacion_id where RRT.fecha_modificacion LIKE '%".$fechaActual."%' AND T.tipo_id = 1" ;
$resultadoContadorPeatonalesH = $conexion->query($contadorPeatonalesH);
while($rowContadorPeatonalesH=$resultadoContadorPeatonalesH->fetch_assoc()){
$totalPeatonalesH = $rowContadorPeatonalesH['COUNT(*)'];
}

$contadorVehicularesH="SELECT COUNT(*) FROM residencias_residentes_tarjetas_detalle AS RRTD INNER JOIN tarjetas AS T ON RRTD.lectura = T.lectura INNER JOIN residencias_residentes_tarjetas as RRT on RRTD.asignacion_id = RRT.asignacion_id where RRT.fecha_modificacion LIKE '%".$fechaActual."%' AND T.tipo_id = 2" ;
$resultadoContadorVehicularesH = $conexion->query($contadorVehicularesH);
while($rowContadorVehicularesH=$resultadoContadorVehicularesH->fetch_assoc()){
$totalVehicularesH = $rowContadorVehicularesH['COUNT(*)'];
}

$contadorPeatonalesB="SELECT COUNT(*) FROM residencias_residentes_tarjetas_detalle_no AS RRTD INNER JOIN tarjetas AS T ON RRTD.lectura = T.lectura INNER JOIN residencias_residentes_tarjetas_no_renovacion as RRT on RRTD.asignacion_id = RRT.asignacion_id where RRT.fecha_modificacion LIKE '%".$fechaActual."%' AND T.tipo_id = 1" ;
$resultadoContadorPeatonalesB = $conexion->query($contadorPeatonalesB);
while($rowContadorPeatonalesB=$resultadoContadorPeatonalesB->fetch_assoc()){
$totalPeatonalesB = $rowContadorPeatonalesB['COUNT(*)'];
}

$contadorVehicularesB="SELECT COUNT(*) FROM residencias_residentes_tarjetas_detalle_no AS RRTD INNER JOIN tarjetas AS T ON RRTD.lectura = T.lectura INNER JOIN residencias_residentes_tarjetas_no_renovacion as RRT on RRTD.asignacion_id = RRT.asignacion_id where RRT.fecha_modificacion LIKE '%".$fechaActual."%' AND T.tipo_id = 2" ;
$resultadoContadorVehicularesB = $conexion->query($contadorVehicularesB);
while($rowContadorVehicularesB=$resultadoContadorVehicularesB->fetch_assoc()){
$totalVehicularesB = $rowContadorVehicularesB['COUNT(*)'];
}

$totalPeatonales = $totalPeatonalesH + $totalPeatonalesB;
$totalVehiculares = $totalVehicularesH + $totalVehicularesB;
$totalTarjetas = $totalPeatonales+$totalVehiculares;

$sumaEfectivoH="SELECT  SUM( precio ) as efectivo_h FROM residencias_residentes_tarjetas WHERE fecha_modificacion LIKE  '%".$fechaActual."%' and tipo_pago = 1 " ;
$resultadoSumaEfectivoH = $conexion->query($sumaEfectivoH);
while($rowSumaEfectivoH=$resultadoSumaEfectivoH->fetch_assoc()){
$efectivoH = $rowSumaEfectivoH['efectivo_h'];
  if ($efectivoH == NULL)
  {
    $efectivoH = 0;
  }
}

$sumaBancosH="SELECT SUM( precio ) as bancos_h FROM residencias_residentes_tarjetas WHERE fecha_modificacion LIKE  '%".$fechaActual."%' and tipo_pago = 2 " ;
$resultadoSumaBancosH = $conexion->query($sumaBancosH);
while($rowSumaBancosH=$resultadoSumaBancosH->fetch_assoc()){
$bancosH = $rowSumaBancosH['bancos_h'];
  if ($bancosH == NULL)
  {
    $bancosH = 0;
  }
}

$sumaEfectivoB="SELECT SUM(precio) as efectivo_b FROM residencias_residentes_tarjetas_no_renovacion WHERE fecha_modificacion LIKE  '%".$fechaActual."%' and tipo_pago = 1 " ;
$resultadoSumaEfectivoB = $conexion->query($sumaEfectivoB);
while($rowSumaEfectivoB=$resultadoSumaEfectivoB->fetch_assoc()){
$efectivoB = $rowSumaEfectivoB['efectivo_b'];
  if ($efectivoB == NULL)
  {
    $efectivoB = 0;
  }
}

$sumaBancosB="SELECT SUM(precio) as bancos_b FROM residencias_residentes_tarjetas_no_renovacion WHERE fecha_modificacion LIKE  '%".$fechaActual."%' and tipo_pago = 2 " ;
$resultadoSumaBancosB = $conexion->query($sumaBancosB);
while($rowSumaBancosB=$resultadoSumaBancosB->fetch_assoc()){
$bancosB = $rowSumaBancosB['bancos_b'];
  if ($bancosB == NULL)
  {
    $bancosB = 0;
  }
}

$sumaEfectivoA="SELECT SUM(total) as efectivo_a FROM folios_mensualidades WHERE fecha LIKE  '%".$fechaActual."%' and tipo_pago = 1" ;
$resultadoSumaEfectivoA = $conexion->query($sumaEfectivoA);
while($rowSumaEfectivoA=$resultadoSumaEfectivoA->fetch_assoc()){
$efectivoA = $rowSumaEfectivoA['efectivo_a'];
  if ($efectivoA == NULL)
  {
    $efectivoA = 0;
  }
}

$sumaBancosA="SELECT SUM(total) as bancos_a FROM folios_mensualidades WHERE fecha LIKE  '%".$fechaActual."%' and tipo_pago = 2" ;
$resultadoSumaBancosA = $conexion->query($sumaBancosA);
while($rowSumaBancosA=$resultadoSumaBancosA->fetch_assoc()){
$bancosA = $rowSumaBancosA['bancos_a'];
  if ($bancosA == NULL)
  {
    $bancosA = 0;
  }
}

$sumaGastosGeneral="SELECT SUM(G.total) as total FROM gastos as G INNER JOIN tipos_gastos as TG on G.tipo_gasto = TG.gasto_id WHERE G.fecha LIKE '%".$fechaActual."%' " ;
$resultadoSumaGastosGeneral = $conexion->query($sumaGastosGeneral);
while($rowSumaGastosGeneral=$resultadoSumaGastosGeneral->fetch_assoc()){
$gastosGeneral = $rowSumaGastosGeneral['total'];
  if ($gastosGeneral == NULL)
  {
    $gastosGeneral = 0;
  }
}

$sumaGastosFijos="SELECT SUM(G.total) as total FROM gastos as G INNER JOIN tipos_gastos as TG on G.tipo_gasto = TG.gasto_id WHERE TG.tipo_gasto = 1 AND G.fecha LIKE '%".$fechaActual."%'" ;
$resultadoSumaGastosFijos = $conexion->query($sumaGastosFijos);
while($rowSumaGastosFijos=$resultadoSumaGastosFijos->fetch_assoc()){
$gastosFijos = $rowSumaGastosFijos['total'];
  if ($gastosFijos == NULL)
  {
    $gastosFijos = 0;
  }
}

$sumaGastosVariables="SELECT SUM(G.total) as total FROM gastos as G INNER JOIN tipos_gastos as TG on G.tipo_gasto = TG.gasto_id WHERE TG.tipo_gasto = 2 AND G.fecha LIKE '%".$fechaActual."%'" ;
$resultadoSumaGastosVariables = $conexion->query($sumaGastosVariables);
while($rowSumaGastosVariables=$resultadoSumaGastosVariables->fetch_assoc()){
$gastosVariables = $rowSumaGastosVariables['total'];
  if ($gastosVariables == NULL)
  {
    $gastosVariables = 0;
  }
}

$sumaGastosEfectivo="SELECT SUM(G.total) as total FROM gastos as G INNER JOIN tipos_gastos as TG on G.tipo_gasto = TG.gasto_id WHERE G.tipo_pago = 1 AND G.fecha LIKE '%".$fechaActual."%'" ;
$resultadoSumaGastosEfectivo = $conexion->query($sumaGastosEfectivo);
while($rowSumaGastosEfectivo=$resultadoSumaGastosEfectivo->fetch_assoc()){
$gastosEfectivo = $rowSumaGastosEfectivo['total'];
  if ($gastosEfectivo == NULL)
  {
    $gastosEfectivo = 0;
  }
}

$sumaGastosBancos="SELECT SUM(G.total) as total FROM gastos as G INNER JOIN tipos_gastos as TG on G.tipo_gasto = TG.gasto_id WHERE G.tipo_pago = 2 AND G.fecha LIKE '%".$fechaActual."%'" ;
$resultadoSumaGastosBancos = $conexion->query($sumaGastosBancos);
while($rowSumaGastosBancos=$resultadoSumaGastosBancos->fetch_assoc()){
$gastosBancos = $rowSumaGastosBancos['total'];
  if ($gastosBancos == NULL)
  {
    $gastosBancos = 0;
  }
}


$totalEfectivo = $efectivoH + $efectivoB + $efectivoA;
$totalBancos = $bancosH + $bancosB + $bancosA;
$totalGeneralEfectivo = $totalEfectivo - $gastosEfectivo;
$totalGeneralBancos = $totalBancos - $gastosBancos;
$totalGeneralFolios = $totalEfectivo+$totalBancos;
$totalGeneralTodo = ($totalEfectivo+$totalBancos)-$gastosGeneral;

$totalGeneralEfectivo = number_format($totalGeneralEfectivo, 2, '.', '');
$totalGeneralBancos = number_format($totalGeneralBancos, 2, '.', '');
$totalGeneralTodo = number_format($totalGeneralTodo, 2, '.', '');
$totalEfectivo = number_format($totalEfectivo, 2, '.', '');
$totalBancos = number_format($totalBancos, 2, '.', '');
$totalGeneralFolios = number_format($totalGeneralFolios, 2, '.', '');

$conexion->close(); //cerramos la conexi贸n
?>

<script type="text/javascript" src="//cdn.jsdelivr.net/jquery/1/jquery.min.js"></script>
<script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js"></script>
<link href="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css" rel="stylesheet">
  <div class="btn-group" style="display:inline-block;float:right;">
        <button class="btn btn-inverse" tabindex="-2" onclick="printDiv('wellContenido')">
          <i class="icon-print icon-white"></i> Imprimir
        </button> 
  </div>
  <br>
	<table class="table table-stripped" id="dgFinanzas">
  <h3>Ventas</h3>
		<thead>
			<tr>
			 <th style="text-align:center;" width="60px">Folios A</th>
       <th style="text-align:center;" width="60px">Folios H</th>
       <th style="text-align:center;" width="60px">Folios B</th>
       <th style="text-align:center;" width="60px">Total General</th>
       <th style="text-align:center;" width="60px">Efectivo</th>
       <th style="text-align:center;" width="60px">Bancos</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
        <script id="plantilla_finanzas" type="text/template">
          {{#rows}}
          <tr>
          <td style="text-align:center;">${{folios_a}}</td>
          <td style="text-align:center;">${{folios_h}}</td>
          <td style="text-align:center;">${{folios_b}}</td>
          <td style="text-align:center;color:black;font-weight:bold;"><?php echo '$'.$totalGeneralFolios ?></td>
          <td style="text-align:center;"><?php echo '$'.$totalEfectivo ?></td>
          <td style="text-align:center;"><?php echo '$'.$totalBancos ?></td>
          </tr>
          {{/rows}}
          {{^rows}}
          <tr> 
            <td colspan="7">No se encontraron resultados</td>
          </tr> 
          {{/rows}}
        </script>
	</table>
  <table class="table table-stripped" id="dgGastos">
  <h3>Gastos</h3>
    <thead>
      <tr>
       <th style="text-align:center;" width="60px">Gastos Fijos</th>
       <th style="text-align:center;" width="60px">Gastos Variables</th>
       <th style="text-align:center;" width="60px">Total General</th>
       <th style="text-align:center;" width="60px">Efectivo</th>
       <th style="text-align:center;" width="60px">Bancos</th>
       <th style="text-align:center;" width="60px"></th>
      </tr>
    </thead>
    <tbody>
    </tbody>
        <script id="plantilla_gastos" type="text/template">
          {{#rows}}
          <tr>
          <td style="text-align:center;"><?php echo '$'.$gastosFijos ?></td>
          <td style="text-align:center;"><?php echo '$'.$gastosVariables ?></td>
          <td style="text-align:center;color:black;font-weight:bold;"><?php echo '$'.$gastosGeneral ?></td>
          <td style="text-align:center;"><?php echo '$'.$gastosEfectivo ?></td>
          <td style="text-align:center;"><?php echo '$'.$gastosBancos ?></td>
          <td style="text-align:center;"></td>
          </tr>
          {{/rows}}
          {{^rows}}
          <tr> 
            <td colspan="7">No se encontraron resultados</td>
          </tr> 
          {{/rows}}
        </script>
  </table>
  <br>
  <div style="dysplay: inline-block;">
    <div id="pagLinks"  style="float:left;margin-right:10px;"></div>
    <div style="float:right;margin-right:10px;"><b><?php echo 'Total Folios: $'.$totalGeneralFolios.' (+)<br>'.'Total Gastos: $'.$gastosGeneral.' (-)<br>'. 'Total General: $'.$totalGeneralTodo.'<br><br>'.'En Efectivo: $'.$totalGeneralEfectivo.'<br>'.'En Bancos: $'.$totalGeneralBancos ?></b></div>
  </div>


<script type="text/javascript">
  var pagina = 0;
  var strUltimaBusqueda= "";
//---------- Funciones para la Busqueda

function paginacion(){
    if($('#txtBusqueda').val() != strUltimaBusqueda){
      pagina = 0;
      strUltimaBusqueda = $('#txtBusqueda').val();
    }
      
    $.post('catalogos/finanzas/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgFinanzas tbody').empty();
                    var temp = Mustache.render($('#plantilla_finanzas').html(),data);
                    $('#dgFinanzas tbody').html(temp);
                    $('#dgGastos tbody').empty();
                    var temp = Mustache.render($('#plantilla_gastos').html(),data);
                    $('#dgGastos tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                    //toastr.success('!Si está funcionando!', 'SUCCESS', {timeOut: 4000});
                    if(data.total_rows > 0)
                    {
                    //toastr.error('!Favor de revisar las privadas que se le asignaron!', 'AVISO IMPORTANTE', {timeOut: 4000});
                    }
                  }
                 ,
          'json');
  }
  $( document ).ready(function() {

     $('#pagLinks').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacionInicio();
     });
     paginacion();
  });

  function printDiv(nombreDiv) {
     var contenido= document.getElementById(nombreDiv).innerHTML;
     var contenidoOriginal= document.body.innerHTML;

     document.body.innerHTML = contenido;

     window.print();

     document.body.innerHTML = contenidoOriginal;
  }
</script> 

               