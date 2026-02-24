<?php

	if (isset($_GET["fechaInicial"]) && isset($_GET["fechaFinal"])) 
	{
	    $tecnicoID = $_GET["tecnicoID"];
	    $fechaInicial = $_GET["fechaInicial"];
	    $fechaFinal = $_GET["fechaFinal"];
	}

$server     = 'localhost'; //servidor
$username   = 'videoacc_root'; //usuario de la base de datos
$password   = 'a1b2c3d4'; //password del usuario de la base de datos
$database   = 'videoacc_video_accesos'; //nombre de la base de datos

$conexion = @new mysqli($server, $username, $password, $database);
 
if ($conexion->connect_error) //verificamos si hubo un error al conectar, recuerden que pusimos el @ para evitarlo
{
    die('Error de conexi贸n: ' . $conexion->connect_error); //si hay un error termina la aplicaci贸n y mostramos el error
}

$sql="SELECT usuario FROM usuarios WHERE empleado_id = $tecnicoID";
$resultado = $conexion->query($sql);
while($row=$resultado->fetch_assoc()){
$nombreTecnico = $row['usuario'];
}

$conexion->close(); //cerramos la conexi贸n

?>

<script type="text/javascript" src="//cdn.jsdelivr.net/jquery/1/jquery.min.js"></script>
<script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js"></script>
<link href="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css" rel="stylesheet">
<?php $usuarioID = ($this->session->userdata('usuario_id')); ?>
<h4><?php echo "Reportes de: ".$nombreTecnico;?></h4>
	<form id="frmSearch" action="#" method="post" onsubmit="return(false)">
	<div style="display:inline-block; margin-left:30px">
        <input type="hidden" id="tecnicoID" name="tecnicoID" value="<?php echo $tecnicoID;?>">
        <input type="hidden" id="dtFechaInicial" name="dtFechaInicial" value="<?php echo $fechaInicial;?>">
	    <input type="hidden" id="dtFechaFinal" name="dtFechaFinal" value="<?php echo $fechaFinal;?>">
	</div>
	    <!--  Barra de progreso-->
	      <div id="divBarraProgreso" class="load-container load5 no-mostrar" style="position:relative; top:350px;">
	        <div class="loader">Loading...</div>
	        <br><br>
	        <div align=center style="color:#000; "><b>Espere un momento por favor.</b></div>
	      </div>   
    </form>

	<table class="table table-stripped" id="dgTecnicodetalle">
		<thead>
			<tr>
			 <th style="text-align:center;" width="60px">Folio</th>
       <th style="text-align:center;" width="40px">Privada</th>
       <th style="text-align:center;" width="40px">Diagn&oacute;stico</th>
       <th style="text-align:center;" width="40px">Soluci&oacute;n</th>
       <th style="text-align:center;" width="40px">Tiempo</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
        <script id="plantilla_tecnicodetalle" type="text/template">
          {{#rows}}
          <tr>
          <td style="text-align:center;">{{folio}}</td>
          <td style="text-align:center;">{{privada}}</td>
          <td style="text-align:center;">{{falla}}</td>
          <td style="text-align:center;">{{solucion}}</td>
          <td style="text-align:center;">{{tiempo}} Min.</td>
            </tr>
          {{/rows}}
          {{^rows}}
          <tr> 
            <td colspan="7">No se encontraron resultados</td>
          </tr> 
          {{/rows}}
        </script>
	</table>

    <!--<div style="dysplay: inline-block;">
      <div id="pagLinks"  style="float:left;margin-right:10px;"></div>
      <div style="float:right;margin-right:10px;"><strong id="numElementos">0</strong> Encontrados</div>
      <br>
   </div>-->

<script type="text/javascript">
  var pagina = 0;
  var strUltimaBusqueda= "";
//---------- Funciones para la Busqueda

function fnMostrarBarCirculoCarga()
{
  //Remover clase para mostrar div que contiene la barra de carga
  $("#divBarraProgreso").removeClass('no-mostrar');
}

//Función que se utiliza para ocultar el div que contiene el  bar de círculo carga
//al momento de recuperar registros de la consulta
function fnOcultarBarCirculoCarga()
{
  //Agregar clase para ocultar div que contiene la barra de carga
  $("#divBarraProgreso").addClass('no-mostrar');
}

function paginacion(){
	fnMostrarBarCirculoCarga();
    if($('#txtBusqueda').val() != strUltimaBusqueda){
      pagina = 0;
      strUltimaBusqueda = $('#txtBusqueda').val();
    }
      
    $.post('catalogos/tecnicodetalle/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), tecnicoID:$('#tecnicoID').val(), dtFechaInicial:$('#dtFechaInicial').val(), dtFechaFinal:$('#dtFechaFinal').val(), intPagina:pagina},
                  function(data) {
                    $('#dgTecnicodetalle tbody').empty();
                    var temp = Mustache.render($('#plantilla_tecnicodetalle').html(),data);
                    $('#dgTecnicodetalle tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                    fnOcultarBarCirculoCarga();
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

	paginacion();

     $('#pagLinks').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
     });
  });
</script> 