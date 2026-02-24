<script type="text/javascript" src="//cdn.jsdelivr.net/jquery/1/jquery.min.js"></script>
<script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js"></script>
<link href="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css" rel="stylesheet">
<?php $usuarioID = ($this->session->userdata('usuario_id')); ?>
<form id="frmSearch" action="#" method="post" onsubmit="return(false)">
			<div style="display:inline-block;">
	              <input id ="txtBusqueda" name="strBusqueda" value="" type="hidden" placeholder="Teclea el Nombre" tabindex="-4">
	     </div>
    </form>

	<table class="table table-stripped" id="dgMonitoristas">
		<thead>
			<tr>
			 <th style="width:2px;"></th>
			 <th style="text-align:center;" width="60px">Nombre</th>
       <th style="text-align:center;" width="40px">&Uacute;ltima Llamada</th>
       <th style="text-align:center;" width="40px">Llamadas 06-15 Seg.</th>
       <th style="text-align:center;" width="40px">Llamadas 15-30 Seg.</th>
       <th style="text-align:center;" width="40px">Llamadas M&aacute;s 30 Seg.</th>
       <th style="text-align:center;" width="40px">Total Llamadas</th>
       <th style="text-align:center;" width="40px">Accesos con Fotograf&iacute;a</th>
       <th style="text-align:center;" width="40px">Promedio con Fotograf&iacute;a</th>
       <th style="text-align:center;" width="40px">Total Tiempo</th>
       <th style="text-align:center;" width="40px">Promedio por llamada</th>
       <th style="text-align:center;" width="40px">Reportes Atenci&oacute;n Clientes</th>
       <th style="text-align:center;" width="40px">Desactivar</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
        <script id="plantilla_monitoristas" type="text/template">
          {{#rows}}
          <tr>
          <td style="background-color: green"></td>
          <td style="text-align:center;">{{nombre}}</td>
          <td style="text-align:center;">{{ultima_sesion}}</td>
          <td style="text-align:center;">{{llamadas115}}</td>
          <td style="text-align:center;">{{llamadas1530}}</td>
          <td style="text-align:center;">{{llamadas30mas}}</td>
          <td style="text-align:center;">{{total_llamadas}}</td>
          <td style="text-align:center;">{{total_fotos}}</td>  
          <td style="text-align:center;">{{promedio_fotos}}%</td>  
          <td style="text-align:center;">{{total_minutos}} Min. {{total_segundos}} Seg. </td>   
          <td style="text-align:center;">{{promedio}} Seg.</td>  
          <td style="text-align:center;">{{total_reportes}}</td>  
<td style="text-align:center;"><a onclick="fnDesloguear({{usuario_id}})" class="btn btn-mini"><i class="icon icon-ban-circle"></i></a></td>
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

function paginacion(){
    if($('#txtBusqueda').val() != strUltimaBusqueda){
      pagina = 0;
      strUltimaBusqueda = $('#txtBusqueda').val();
    }
      
    $.post('catalogos/monitoristas/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgMonitoristas tbody').empty();
                    var temp = Mustache.render($('#plantilla_monitoristas').html(),data);
                    $('#dgMonitoristas tbody').html(temp);
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
  function fnDesloguear(id){
      $.post('catalogos/monitoristas/desloguear',
                  { intUsuarioID: id
                  },
                  function(data) {
                    if(data.resultado){
                      paginacion();
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
  }
  $( document ).ready(function() {

setInterval(function(){
paginacion(); 
}, 30000);

     $('#pagLinks').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacionInicio();
     });

//---- Codigo Inicial para el Primer form
     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 

               