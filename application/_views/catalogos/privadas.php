
<form id="frmSearch" action="#" method="post" onsubmit="return(false)">
      <div style="display:inline-block;">
        <label for="txtBusqueda"><h5>Descripcion</h5></label>
        <div class="input-append">
            <input id ="txtBusqueda" name="strBusqueda" value="" type="text" placeholder="Ingresa Descripción" tabindex="-4">
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

<table class="table table-stripped" id="dgPrivadas">
    <thead>
        <tr><th>Descripción</th>
            <th>Contacto</th>
		        <th width="100px">Celular</th>
          	<th width="20px">Estatus</th>
		   	    <th width="20px"></th>
          	<th width="20px"></th>
            <th width="20px"></th>
        </tr>
    </thead>
    <tbody>
    </tbody>
   		<script id="plantilla_privadas" type="text/template">
          {{#rows}}
          <tr>  <td>{{descripcion}}</td>
          		<td>{{contacto}}</td>
          		<td>{{celular}}</td>
    				  <td>{{estatus}}</td>
    				  <td><a onclick="fnCambiarEstado({{privada_id}},{{estatus_id}})" class="btn btn-mini" title="Cambiar de Estado"><i class="icon icon-eye-open"></i></a></td>
    				  <td><a onclick="fnEditar({{privada_id}})" class="btn btn-mini" title="Editar"><i class="icon icon-pencil"></i></a></td>
              <td><a onclick="fnEliminar({{privada_id}})" class="btn btn-mini" title="Eliminar"><i class="icon icon-trash"></i></a></td>
            </tr>
          {{/rows}}
          {{^rows}}
          <tr> 
            <td colspan="7"> No se Encontraron Resultados!!</td>
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
<div id="myModal" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="width: 520px;">
  <div class="modal-header">
	<button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="1">×</button>
	<h3 id="myModalLabel">Privada</h3>
  </div>
  <div class="modal-body" style="padding-bottom:5px;">
	  <form name="frmPrivadas" id="frmPrivadas" action="#" method="post" onsubmit="return(false)" autocomplete="off" style="margin-bottom:5px;">
	  	<input id="txtPrivadaID" type="hidden" value="">
		  	<div style="display: inline-block; margin-right:15px;">
				<label for="txtDescripcion">Descripción</label>
				<input class="span4" id="txtDescripcion" type="text" placeholder="Ingresa Descripción" tabindex="2">
			</div>
			<div style="display: inline-block;">
				<label for="cmbEstatusID">Estatus</label>
				<div class="input">
					<select id="cmbEstatusID" class="span2" tabindex="3" >
						<option value="1">Activo</option>
						<option value="2">Baja</option>
					</select>
				</div>
			</div>
      <div style="display: inline-block; margin-right:15px;">
        <label for="txtHistorial">Historial</label>
        <input class="span4" id="txtHistorial" type="text" placeholder="E-mail Historial" style="display: inline-block;" tabindex="4">
      </div>
			<div>
				<label for="txtApePaterno">Contacto</label>
        <input class="span2" id="txtNombre" type="text" placeholder="Nombre(s)" style="display: inline-block; margin-right:15px;" tabindex="5">
				<input class="span2" id="txtApePaterno" type="text" placeholder="Apellido Paterno" style="display: inline-block; margin-right:15px;" tabindex="6">
				<input class="span2" id="txtApeMaterno" type="text" placeholder="Apellido Materno" style="display: inline-block;"  tabindex="7">
			</div>
			<div>
				<div style="display: inline-block; margin-right:15px;">
					<div class="input">
						<select id="cmbTipoContactoID" name="intModificaFechas" class="span2" tabindex="8" >
							<option value="1">Residente</option>
							<option value="2">Externo</option>
						</select>
					</div>
				</div>
				<div style="display: inline-block;">
					<input class="span2" id="txtTelefono" type="text" placeholder="Télefono" style="display: inline-block; margin-right:15px;" tabindex="9">
					<input class="span2" id="txtCelular" type="text" placeholder="Celular" style="display: inline-block;" tabindex="10">
				</div>
			</div>
			<div>
				<input class="span4" id="txtEmail" type="text" placeholder="E-mail" style="display: inline-block;" tabindex="11">
			</div>
			<div>
				<label for="txtContacto">Observaciones</label>
				<textarea class="span6" id="txtObservaciones" type="text" placeholder="Ingresa Observaciones" rows="4" style="display: inline-block; resize: none;" tabindex="12"></textarea>
			</div>
		</form>
  </div>
  <div class="modal-footer">
	<button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="13">Cancelar</button>
    <button class="btn btn-primary" tabindex="14" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>
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
      
    $.post('catalogos/privadas/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgPrivadas tbody').empty();
                    var temp = Mustache.render($('#plantilla_privadas').html(),data);
                    $('#dgPrivadas tbody').html(temp);
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
    $('#frmPrivadas')[0].reset();
    $('#txtPrivadaID').val('');
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','catalogos/privadas/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','catalogos/privadas');        
  }
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('catalogos/privadas/guardar',
                  { intPrivadaID: $('#txtPrivadaID').val(), 
                    strDescripcion: $('#txtDescripcion').val(),
                    strApePaterno: $('#txtApePaterno').val(),
                    strApeMaterno: $('#txtApeMaterno').val(),
                    strNombre: $('#txtNombre').val(),
                    intTipoContactoID: $('#cmbTipoContactoID').val(),
                    strTelefono: $('#txtTelefono').val(),
                    strCelular: $('#txtCelular').val(),
                    strEmail: $('#txtEmail').val(),
                    strHistorial: $('#txtHistorial').val(),
                    strObservaciones: $('#txtObservaciones').val(),
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
      $.post('catalogos/privadas/cambiar_estado',
                  { intPrivadaID: id,
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
    $.post('catalogos/privadas/editar',
                  { intPrivadaID:id
                  },
                  function(data) {
	                $('#divMensajes').html(data.mensajes);
	                if(data.row){
	                    $('#txtPrivadaID').val(data.row.privada_id);
	                    $('#txtDescripcion').val(data.row.descripcion);
	                    $('#txtApePaterno').val(data.row.ape_paterno);
	                    $('#txtApeMaterno').val(data.row.ape_materno);
	                    $('#txtNombre').val(data.row.nombre);
	                    $('#cmbTipoContactoID').val(data.row.tipo_contacto_id);
	                    $('#txtTelefono').val(data.row.telefono);
	                    $('#txtCelular').val(data.row.celular);
	                    $('#txtEmail').val(data.row.email);
                      $('#txtHistorial').val(data.row.historial);
	                    $('#txtObservaciones').val(data.row.observaciones);
                      $('#cmbEstatusID').val(data.row.estatus_id.toString());
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
   function fnEliminar(id){
      if(confirm('¡El siguiente movimiento, también se eliminara a las residencias, así como a sus respectivos residentes y visitantes vinculados! \n\n Esta seguro que desea eliminar el registro ?'))
        $.post('catalogos/privadas/eliminar',
                  { intPrivadaID:id
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
       $('#txtDescripcion').focus();
     });

     $('#myModal').on('hidden', function () {
     	fnNuevo();
        $('#txtBusqueda').focus();
     });

     $("#btnGuardar").click(fnGuardar);


//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmPrivadas');    
     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 