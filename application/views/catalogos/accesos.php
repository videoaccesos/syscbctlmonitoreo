<script type="text/javascript" src="//cdn.jsdelivr.net/jquery/1/jquery.min.js"></script>
<script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js"></script>
<link href="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css" rel="stylesheet">
<?php $usuarioID = ($this->session->userdata('usuario_id')); ?>
  <form id="frmSearch" action="#" method="post" onsubmit="return(false)">
      <div style="display:inline-block;">
        <label for="dtFechaIni">Fecha/Hora Inicio</label>
        <div class="input-append datetimepicker" >
          <input id="dtFechaIni" name="strFechaHoraInicio" class="span3" data-format="yyyy-MM-dd hh:mm:ss" type="text" tabindex="1"></input>
          <span class="add-on">
            <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
          </span>
        </div>
      &nbsp;&nbsp;&nbsp;&nbsp;
      </div>
      <div style="display:inline-block;padding-right:17px;">
        <label for="dtFechaFin">Fecha/Hora Final</label>
          <div class="input-append datetimepicker" >
            <input id="dtFechaFin" name="strFechaHoraFin" class="span3" data-format="yyyy-MM-dd hh:mm:ss" type="text" tabindex="2"></input>
            <span class="add-on">
              <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
            </span>
          </div>
      </div>
        <div style="display:inline-block; padding-right:17px;">
        <button type="button" class="btn" tabindex="5" onclick="paginacion();" style="margin-top:-7px;"> Filtrar <i class="icon-search"></i></button>
        </div>
        <!--  Barra de progreso-->
      <div id="divBarraProgreso" class="load-container load5 no-mostrar" style="position:relative; top:350px;">
        <div class="loader">Loading...</div>
        <br><br>
        <div align=center style="color:#000; "><b>Espere un momento por favor.</b></div>
      </div>      
  </form>

	<table class="table table-stripped" id="dgAccesos">
		<thead>
			<tr>
			 <!--<th style="text-align:center;" width="60px">ID</th>-->
       <th style="text-align:center;" width="40px">Placa</th>
       <th style="text-align:center;" width="40px">Color</th>
       <th style="text-align:center;" width="40px">Marca</th>
       <!--<th style="text-align:center;" width="40px">Texto ID</th>-->
       <!--<th style="text-align:center;" width="40px">ID Rostro</th>-->
       <th style="text-align:center;" width="40px">Nombre</th>
       <!--<th style="text-align:center;" width="40px">E_Placa</th>-->
       <!--<th style="text-align:center;" width="40px">E_ID</th>-->
       <!--<th style="text-align:center;" width="40px">E_Rostro</th>-->
       <th style="text-align:center;" width="40px">Img_Placa</th>
       <th style="text-align:center;" width="40px">Img_ID</th>
       <th style="text-align:center;" width="40px">Img_Rostro</th>
       <!--<th style="text-align:center;" width="40px">E_Correo</th>-->
       <th style="text-align:center;" width="40px">Calle</th>
       <th style="text-align:center;" width="40px">Nro Casa</th>
       <th style="text-align:center;" width="40px">Fecha/Hora</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
        <script id="plantilla_accesos" type="text/template">
          {{#rows}}
          <tr>
          <!--<td style="text-align:center;">{{id}}</td>-->
          <td style="text-align:center;">{{placa}}</td>
          <td style="text-align:center;">{{color}}</td>
          <td style="text-align:center;">{{marca}}</td>
          <!--<td style="text-align:center;">{{texto_identificacion}}</td>-->
          <!--<td style="text-align:center;">{{id_rostro}}%</td>-->
          <td style="text-align:center;">{{nombre_rostro}}</td>   
          <!--<td style="text-align:center;">{{estatus_placa}}</td>-->
          <!--<td style="text-align:center;">{{estatus_identificacion}}</td>-->
          <!--<td style="text-align:center;">{{estatus_rostro}}</td>-->
          <td style="text-align:center;"><img src="data:image/png;base64, {{img_placa}}"/></td>
          <td style="text-align:center;"><img src="data:image/png;base64, {{img_identificacion}}"/></td>
          <td style="text-align:center;"><img src="data:image/png;base64, {{img_rostro}}"/></td>
          <!--<td style="text-align:center;">{{correo_enviado}}</td>-->
          <td style="text-align:center;">{{calle}}</td>
          <td style="text-align:center;">{{nro_casa}}</td>
          <td style="text-align:center;">{{fecha_modificacion}}</td>
            </tr>
          {{/rows}}
          {{^rows}}
          <tr> 
            <td colspan="7">No se encontraron resultados</td>
          </tr> 
          {{/rows}}
        </script>
	</table>

    <div style="dysplay: inline-block;">
      <div id="pagLinks"  style="float:left;margin-right:10px;"></div>
      <div style="float:right;margin-right:10px;"><strong id="numElementos">0</strong> Encontrados</div>
      <br>
   </div>

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
    $.post('catalogos/accesos/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(),
                 strFechaHoraInicio: $('#dtFechaIni').val(),
                  strFechaHoraFin: $('#dtFechaFin').val(),
                  intPagina:pagina},
                  function(data) {
                    $('#dgAccesos tbody').empty();
                    var temp = Mustache.render($('#plantilla_accesos').html(),data);
                    $('#dgAccesos tbody').html(temp);
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

    var strFecha = "<?php $fecha= date('Y-m-d'); echo $fecha;?>";
    $('#dtFechaIni').val(strFecha+' 00:00:00');
    $('#dtFechaFin').val(strFecha+' 00:00:00');

     $('#pagLinks').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacion();
     });
  
  $('.timepicker').datetimepicker({
      language: 'es',
      pick12HourFormat: false,
      pickDate: false
    });

    $('.datetimepicker').datetimepicker({
          language: 'es',
          pick12HourFormat: true
      });

  });

</script> 

               