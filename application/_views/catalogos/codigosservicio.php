	<form id="frmSearch" action="#" method="post" onsubmit="return(false)">
			<div style="display:inline-block;">
	          <label for="txtBusqueda"><h5>Descripcion</h5></label>
	          <div class="input-append">
	              <input id ="txtBusqueda" name="strBusqueda" value="" type="text" placeholder="Teclea Nombre" tabindex="-4">
	              <div class="btn-group" >
	                <button class="btn dropdown-toggle" onclick="paginacion();" tabindex="-3">
	                  <i class="icon-search"></i>
	                </button>
	              </div>
	          </div>
	        </div>
                                                        
          <div class="btn-group" style="display:inline-block;float:right;padding-top:40px;">
			<!-- Button to trigger modal -->
			<a href="#myModal" role="button" class="btn btn-primary" data-toggle="modal"><i class="icon-plus icon-white"></i> Nuevo</a>		
            		<button class="btn btn-inverse">
            			<i class="icon-print icon-white"></i> Imprimir
            		</button>	
          </div>    
    </form>

	<table class="table table-stripped" id="dgCodigosServicio">
		<thead>
			<tr>
			 <th width="50px">Codigo</th>
			 <th>Descripción</th>
			 <th width="40px">Estado</th>
			 <th width="20px"></th>
			 <th width="20px"></th>
			 <th width="20px"></th>
			</tr>
		</thead>
		<tbody>
		</tbody>
        <script id="plantilla_codigosservicio" type="text/template">
          {{#rows}}
          <tr><td>{{codigo}}</td>
				<td>{{descripcion}}</td>
				<td>{{estatus}}</td>
				<td><a onclick="fnCambiarEstado({{codigo_servicio_id}},{{estatus_id}})" class="btn btn-mini" title="Cambiar de Estado"><i class="icon icon-eye-open"></i></a></td>
				<td><a onclick="fnEditar({{codigo_servicio_id}})" class="btn btn-mini" title="Editar"><i class="icon icon-pencil"></i></a></td>
                <td><a onclick="fnEliminar({{codigo_servicio_id}})" class="btn btn-mini" title="Eliminar"><i class="icon icon-trash"></i></a></td>
            </tr>
          {{/rows}}
          {{^rows}}
          <tr> 
            <td colspan="6"> No se Encontraron Resultados!!</td>
          </tr> 
          {{/rows}}
        </script>
	</table>

    <div style="dysplay: inline-block;">
      <div id="pagLinks"  style="float:left;margin-right:10px;"></div>
      <div style="float:right;margin-right:10px;"><strong id="numElementos">3</strong> Encontrados</div>
      <br>
   </div>


     <!-- Modal -->
	<div id="myModal" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="1">×</button>
			<h3 id="myModalLabel">Codigo de Servicio</h3>
		</div>
		<div class="modal-body">
			<form name="frmCodigosServicio" id="frmCodigosServicio" action="#" method="post" onsubmit="return(false)" autocomplete="off">
				<input id="txtCodigoServicioID" type="hidden" value="">
				<label for="txtCodigo"><h5>Codigo</h5></label>
				<input class="span2" id="txtCodigo" type="text" placeholder="Ingresa Codigo" tabindex="2">
				<label for="txtDescripcion"><h5>Descripción</h5></label>
				<input class="span6" id="txtDescripcion" type="text" placeholder="Ingrese Descirpción" tabindex="3">
				<label for="cmbEstatusID"><h5>Estado</h5></label>
				<select id="cmbEstatusID" class="span3" tabindex="4" >
					<option value="1">Activo</option>
					<option value="2">Inactivo</option>
				</select>
			</form>
		</div>
		<div class="modal-footer">
			<button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="5">Cancelar</button>
            <button class="btn btn-primary" tabindex="6" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>
		</div>
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
      
    $.post('catalogos/codigosservicio/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgCodigosServicio tbody').empty();
                    var temp = Mustache.render($('#plantilla_codigosservicio').html(),data);
                    $('#dgCodigosServicio tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
  }


//--------- Funciones para el Modal

  function fnNuevo (){
    $('#divMensajes').html('');
    $('#frmCodigosServicio')[0].reset();
    $('#txtCodigoServicioID').val('');
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','catalogos/codigosservicio/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','catalogos/codigosservicio');        
  }
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('catalogos/codigosservicio/guardar',
                  { intCodigoServicioID: $('#txtCodigoServicioID').val(), 
                  	strCodigo: $('#txtCodigo').val(),
                    strDescripcion: $('#txtDescripcion').val(),
                    intEstatusID: $('#cmbEstatusID').val()
                  },
                  function(data) {
                    if(data.resultado){
                      fnNuevo();
                      paginacion();
                      $('#myModal').modal('hide');
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
    }
  }
  function fnCambiarEstado(id,estado){
      $.post('catalogos/codigosservicio/cambiar_estado',
                  { intCodigoServicioID: id,
                    intEstatusID: estado
                  },
                  function(data) {
                    if(data.resultado){
                      paginacion();
                      $('#myModal').modal('hide');
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
  }
  function fnEditar(id){
    $.post('catalogos/codigosservicio/editar',
                  { intCodigoServicioID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
                      $('#txtCodigoServicioID').val(data.row.codigo_servicio_id);
                      $('#txtCodigo').val(data.row.codigo);
                      $('#txtDescripcion').val(data.row.descripcion);
                      $('#cmbEstatusID').val(data.row.estatus_id.toString());
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
   function fnEliminar(id){
    if(confirm("Esta seguro que desea eliminar el registro ?"))
      $.post('catalogos/codigosservicio/eliminar',
                    { intCodigoServicioID: id
                    },
                    function(data) {
                      $('#divMensajes').html(data.mensajes);
                      if(data.resultado){
                        paginacion();
                      }
                    }
                   ,
            'json');
  }

  $( document ).ready(function() {
   
//---- Script para la Busqueda
     $("#btnBuscar").click(function(event){
        event.preventDefault();
        paginacion();
      });

     $('#pagLinks').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacion();
     });

//---- Script para el Modal
     $('#myModal').on('shown', function () {
       $('#txtCodigo').focus();
     });

     $('#myModal').on('hidden', function () {
        fnNuevo();
        $('#txtBusqueda').focus();
     });

     $("#btnGuardar").click(fnGuardar);


//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmCodigosServicio');    
     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 

               