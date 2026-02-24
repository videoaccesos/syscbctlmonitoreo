<script type="text/javascript" src="//cdn.jsdelivr.net/jquery/1/jquery.min.js"></script>
<script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js"></script>
<link href="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css" rel="stylesheet">
<?php $usuarioID = ($this->session->userdata('usuario_id')); ?>
	<form id="frmSearch" action="#" method="post" onsubmit="return(false)">
	<div style="display:inline-block; margin-left:30px">
        <input type="hidden" id="txtFechaInicio" name="dteFechaInicio" value="">
        <label for="dtFechaInicial"><h5>Fecha Inicio:</h5></label>
        <div class="input-append datetimepicker" >
         <input id="dtFechaInicial" name="strFechaInicio" class="span3" data-format="yyyy-MM-dd hh:mm:ss" type="text" tabindex="1"></input>
          <span class="add-on">
            <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
          </span>
        </div>
	</div>
	  <div style="display:inline-block;margin-left:30px">
	    <input type="hidden" id="txtFechaFin" name="dteFechaFin" value="">
	    <label for="dtFechaFinal"><h5>Fecha Fin:</h5></label>
	      <div class="input-append datetimepicker" >
	        <input id="dtFechaFinal" name="strFechaFin" class="span3" data-format="yyyy-MM-dd hh:mm:ss" type="text" tabindex="2"></input>
	        <span class="add-on">
	          <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
	        </span>
	      </div>
	  </div>
		<div class="btn-group" style="margin-left:30px; margin-top:-10px">
	        <button class="btn dropdown-toggle" onclick="paginacion();" tabindex="-3">Buscar
	          <i class="icon-search"></i>
	        </button>
	    </div>
	    <!--  Barra de progreso-->
	      <div id="divBarraProgreso" class="load-container load5 no-mostrar" style="position:relative; top:350px;">
	        <div class="loader">Loading...</div>
	        <br><br>
	        <div align=center style="color:#000; "><b>Espere un momento por favor.</b></div>
	      </div>   
    </form>

	<table class="table table-stripped" id="dgTecnicos">
		<thead>
			<tr>
			 <th style="text-align:center;" width="60px">Nombre</th>
       <th style="text-align:center;" width="40px"># Reportes</th>
       <th style="text-align:center;" width="40px">Tiempo Total</th>
       <th style="text-align:center;" width="40px">Ver Detalle</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
        <script id="plantilla_tecnicos" type="text/template">
          {{#rows}}
          <tr>
          <td style="text-align:center;">{{usuario}}</td>
          <td style="text-align:center;">{{total_reportes}}</td>
          <td style="text-align:center;">{{tiempo_acumulado}} Min.</td>        
			<td style="text-align:center;"><a onclick="fnMostrarDetalle({{empleado_id}})" class="btn btn-mini"><i class="icon icon-eye-open"></i></a></td>
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
      
    $.post('catalogos/tecnicos/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), dtFechaInicial:$('#dtFechaInicial').val(), dtFechaFinal:$('#dtFechaFinal').val(), intPagina:pagina},
                  function(data) {
                    $('#dgTecnicos tbody').empty();
                    var temp = Mustache.render($('#plantilla_tecnicos').html(),data);
                    $('#dgTecnicos tbody').html(temp);
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
  function fnMostrarDetalle(id){
    var fechaInicial = $('#dtFechaInicial').val();
    var fechaFinal = $('#dtFechaFinal').val();
    var tecnicoID = id;
    window.open("http://www.videoaccesos.com/syscbctlmonitoreo/catalogos/tecnicodetalle?tecnicoID="+ tecnicoID +"&fechaInicial=" + fechaInicial + "&fechaFinal=" + fechaFinal);
  }
  $( document ).ready(function() {

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
        now.getMinutes(),
        now.getSeconds()
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
     });
  });
</script> 

               