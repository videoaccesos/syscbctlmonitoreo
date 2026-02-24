  <form id="frmSearch" action="#" method="post" onsubmit="return(false)">
			<div style="display:inline-block;">
	          <label for="txtBusqueda"><h5>Usuario</h5></label>
	          <div class="input-append">
	              <input id ="txtBusqueda" name="strBusqueda" value="" type="text" placeholder="Teclea el Nombre" tabindex="-4">
	              <div class="btn-group" >
	                <button class="btn dropdown-toggle" onclick="paginacionInicio();" tabindex="-3">
	                  <i class="icon-search"></i>
	                </button>
	              </div>
	          </div>
	        </div>
<div style="display:inline-block; margin-left:30px">
        <input type="hidden" id="txtFechaInicio" name="dteFechaInicio" value="">
        <label for="dtFechaInicial"><h5>Fecha Inicio:</h5></label>
        <div class="input-append datetimepicker" >
         <input id="dtFechaInicial" name="strFechaInicio" class="span2" data-format="dd-MM-yyyy hh:mm" type="text" tabindex="1"></input>
          <span class="add-on">
            <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
          </span>
        </div>
</div>
      <div style="display:inline-block;margin-left:30px">
        <input type="hidden" id="txtFechaFin" name="dteFechaFin" value="">
        <label for="dtFechaFinal"><h5>Fecha Fin:</h5></label>
          <div class="input-append datetimepicker" >
            <input id="dtFechaFinal" name="strFechaFin" class="span2" data-format="dd-MM-yyyy hh:mm" type="text" tabindex="2"></input>
            <span class="add-on">
              <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
            </span>
          </div>
      </div>
		<div class="btn-group" >
            <button style="margin-left:400px;" class="btn dropdown-toggle" onclick="paginacion();" tabindex="-3">Buscar por Fecha
              <i class="icon-search"></i>
            </button>
        </div>           
    
    </form>

	<table class="table table-stripped" id="dgRegistros">
		<thead>
			<tr>
			 <th style="width:2px;"></th>
			 <th width="60px">Nombre</th>
                         <th width="60px">Apellido Paterno</th>
                         <th width="60px">Apellido Materno</th>
                         <th width="60px">Privada</th>
                         <th width="80px">Fecha/Hora Generado</th>
                         <th width="80px">Fecha/Hora Revisado</th>
                         <th width="80px">Comentarios</th>
                         <th width="60px">Estatus</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
        <script id="plantilla_registros" type="text/template">
          {{#rows}}
          	<tr>
			<td class='{{estatus}}'></td>
          		<td>{{nombre}}</td>
          		<td>{{ape_paterno}}</td>
          		<td>{{ape_materno}}</td>
          		<td>{{descripcion}}</td>
          		<td>{{fecha_generado}}</td>
          		<td>{{fecha_revisado}}</td>
          		<td>{{comentarios}}</td>
          		<td>{{estatus}}</td>
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
      <!--<div style="float:right;margin-right:10px;"><strong id="numElementos">0</strong> Encontrados</div>-->
      <br>
   </div>

<script type="text/javascript">
  var pagina = 0;
  var strUltimaBusqueda= "";
//---------- Funciones para la Busqueda

  function paginacion(){
    if($('#txtBusqueda').val() != strUltimaBusqueda){
      pagina = 0;
      strUltimaBusqueda = $('#txtBusqueda').val();
      dtFechaInicial = $('#dtFechaInicial').val();
      dtFechaFinal = $('#dtFechaFinal').val();
    }
      
    $.post('catalogos/registros/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), dtFechaInicial:$('#dtFechaInicial').val(), dtFechaFinal:$('#dtFechaFinal').val(), intPagina:pagina},
                  function(data) {
                    $('#dgRegistros tbody').empty();
                    var temp = Mustache.render($('#plantilla_registros').html(),data);
                    $('#dgRegistros tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
  }

function paginacionInicio(){
    if($('#txtBusqueda').val() != strUltimaBusqueda){
      pagina = 0;
      strUltimaBusqueda = $('#txtBusqueda').val();
    }
      
    $.post('catalogos/registros/paginacionInicio',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgRegistros tbody').empty();
                    var temp = Mustache.render($('#plantilla_registros').html(),data);
                    $('#dgRegistros tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
  }

  $( document ).ready(function() {
//setInterval(function(){
//paginacionInicio(); 
//}, 3000);
$('.datetimepicker').datetimepicker({
        language: 'es',
        pick12HourFormat: true
    });

   $('.datepicker').datetimepicker({
        language: 'es',
        pick12HourFormat: true
    });
    var now = new Date();
    var utc = new Date(Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes()
    ));

    $('.datetimepicker').datetimepicker("setDate",utc);

//---- Script para la Busqueda
     $("#btnBuscar").click(function(event){
        event.preventDefault();
        paginacion();
      });

     $('#pagLinks').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacionInicio();
     });

//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmCitas');    
     $('#txtBusqueda').focus();
     paginacionInicio();
  });
</script> 

               