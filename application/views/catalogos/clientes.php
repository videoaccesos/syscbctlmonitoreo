	<form id="frmSearch" action="#" method="post" onsubmit="return(false)">
			<div style="display:inline-block;">
	          <label for="txtBusqueda"><h5>Nombre</h5></label>
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
          </div>    
    </form>

	<table class="table table-stripped" id="dgClientes">
		<thead>
			<tr>
        <th width="30px">Código</th>
			 <th width="60px">Nombre</th>
       <th width="40px">Apellido Paterno</th>
       <th width="40px">Apellido Materno</th>
       <th width="40px">RFC</th>
			 <th width="20px">Estado</th>
			 <th width="20px">A/B</th>
			 <th width="15px">Editar</th>
			 <th width="15px">Eliminar</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
        <script id="plantilla_clientes" type="text/template">
          {{#rows}}
          <tr><td>{{cliente_id}}</td>
          <td>{{nombre}}</td>
				<td>{{apellido_paterno}}</td>
				<td>{{apellido_materno}}</td>
        <td>{{rfc}}</td>
        <td>{{estatus}}</td>
				<td><a onclick="fnCambiarEstado({{cliente_id}},{{estatus_id}})" class="btn btn-mini"><i class="icon icon-eye-open"></i></a></td>
				<td><a onclick="fnEditar({{cliente_id}})" class="btn btn-mini"><i class="icon icon-pencil"></i></a></td>
                <td><a onclick="fnEliminar({{cliente_id}})" class="btn btn-mini"><i class="icon icon-trash"></i></a></td>
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


     <!-- Modal -->
	<div id="myModal" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="1">×</button>
			<h3 id="myModalLabel">Registro de Cliente</h3>
		</div>
		<div class="modal-body">
			<form name="frmClientes" id="frmClientes" action="#" method="post" onsubmit="return(false)" autocomplete="off">
				<input id="txtClienteID" type="hidden" value="">
				<label for="txtNombre"><h5>Nombre</h5></label>
				<input class="span4" id="txtNombre" type="text" placeholder="Ingrese Nombre" tabindex="2">
        <label for="txtApellidoPaterno"><h5>Apellido Paterno</h5></label>
        <input class="span4" id="txtApellidoPaterno" type="text" placeholder="Ingrese Apellido Paterno" tabindex="3">
        <label for="txtApellidoMaterno"><h5>Apellido Materno</h5></label>
        <input class="span4" id="txtApellidoMaterno" type="text" placeholder="Ingrese Apellido Materno" tabindex="4">
        <label for="txtRFC"><h5>RFC</h5></label>
        <input class="span4" id="txtRFC" type="text" placeholder="Ingrese RFC" tabindex="5">
        <div>
        <div style="display:inline-block;">
  				<label for="cmbEstatusID"><h5>Estado</h5></label>
  				<select id="cmbEstatusID" class="span3" tabindex="6" >
  					<option value="1">Activo</option>
  					<option value="2">Inactivo</option>
  				</select>
        </div>
        </div>
			</form>
		</div>
		<div class="modal-footer">
			<button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="7">Cancelar</button>
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
      
    $.post('catalogos/clientes/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgClientes tbody').empty();
                    var temp = Mustache.render($('#plantilla_clientes').html(),data);
                    $('#dgClientes tbody').html(temp);
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
    $('#frmClientes')[0].reset();
    $('#txtClienteID').val('');
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','catalogos/clientes/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','catalogos/clientes');        
  }
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('catalogos/clientes/guardar',
                  { intClienteID: $('#txtClienteID').val(), 
                  	strNombre: $('#txtNombre').val(),
                    strApellidoPaterno: $('#txtApellidoPaterno').val(),
                    strApellidoMaterno: $('#txtApellidoMaterno').val(),
                    strRFC: $('#txtRFC').val(),
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
      $.post('catalogos/clientes/cambiar_estado',
                  { intClienteID: id,
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
    $.post('catalogos/clientes/editar',
                  { intClienteID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
                      $('#txtClienteID').val(data.row.cliente_id);
                      $('#txtNombre').val(data.row.nombre);
                      $('#txtApellidoPaterno').val(data.row.apellido_paterno);
                      $('#txtApellidoMaterno').val(data.row.apellido_materno);
                      $('#txtRFC').val(data.row.rfc);
                      $('#cmbEstatusID').val(data.row.estatus_id.toString());
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
   function fnEliminar(id){
    $.post('catalogos/clientes/eliminar',
                  { intClienteID: id
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
       $('#txtNombre').focus();
     });

     $('#myModal').on('hidden', function () {
        fnNuevo();
        $('#txtBusqueda').focus();
     });

     $("#btnGuardar").click(fnGuardar);


//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmClientes');    
     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 

               