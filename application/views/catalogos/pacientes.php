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

	<table class="table table-stripped" id="dgPacientes">
		<thead>
			<tr>
        <th width="30px">Código</th>
			 <th width="60px">Nombre</th>
       <th width="40px">Apellido Paterno</th>
       <th width="40px">Apellido Materno</th>
<th width="40px">Dirección</th>
       <th width="40px">Teléfono</th>
       <th width="40px">Correo Electrónico</th>
       <th width="40px">Fecha Nacimiento</th>
       <th width="40px">Edad</th>
       <th width="40px">Sexo</th>
			 <th width="20px">Estado</th>
			 <th width="20px">A/B</th>
			 <th width="15px">Editar</th>
			 <th width="15px">Eliminar</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
        <script id="plantilla_pacientes" type="text/template">
          {{#rows}}
          <tr><td>{{paciente_id}}</td>
          <td>{{nombre}}</td>
				<td>{{apellido_paterno}}</td>
				<td>{{apellido_materno}}</td>
<td>{{direccion}}</td>
        <td>{{telefono}}</td>
        <td>{{correo_electronico}}</td>
        <td>{{fecha_nacimiento}}</td>
        <td>{{edad}}</td>
        <td>{{sexo}}</td>
        <td>{{estatus}}</td>
				<td><a onclick="fnCambiarEstado({{paciente_id}},{{estatus_id}})" class="btn btn-mini"><i class="icon icon-eye-open"></i></a></td>
				<td><a onclick="fnEditar({{paciente_id}})" class="btn btn-mini"><i class="icon icon-pencil"></i></a></td>
                <td><a onclick="fnEliminar({{paciente_id}})" class="btn btn-mini"><i class="icon icon-trash"></i></a></td>
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
			<h3 id="myModalLabel">Registro de Paciente</h3>
		</div>
		<div class="modal-body">
			<form name="frmPacientes" id="frmPacientes" action="#" method="post" onsubmit="return(false)" autocomplete="off">
				<input id="txtPacienteID" type="hidden" value="">
				<label for="txtNombre"><h5>Nombre Completo:</h5></label>
				<input class="span3" id="txtNombre" type="text" placeholder="Nombre" tabindex="2">
        <input class="span2" id="txtApellidoPaterno" type="text" placeholder="Apellido Paterno" tabindex="3">
        <input class="span2" id="txtApellidoMaterno" type="text" placeholder="Apellido Materno" tabindex="4">
        <label for="txtNombre"><h5>Direccion:</h5></label>
				<input class="span6" id="txtDireccion" type="text" placeholder="Direccion" tabindex="5">
        <label class="span6"><h5>Teléfono:</h5></label>
        <input class="span3" id="txtTelefono" type="text" placeholder="Ingrese Teléfono" tabindex="6">
        <label class="span6"><h5>Correo:</h5></label>
        <input class="span3" id="txtCorreo" type="text" placeholder="Ingrese Correo" tabindex="7">
        <label class="span6"><h5>Fecha Nacimiento:</h5></label>
        <input class="span3" id="dtFechaNacimiento" type="date" placeholder="DD/MM/YYY" tabindex="8">
        <label class="span6"><h5>Edad:</h5></label>
        <input class="span3" id="txtEdad" type="text" placeholder="Edad" tabindex="8">
        <div>
        <select id="cmbSexo" class="span3" tabindex="11" >
            <option value="1">Masculino</option>
            <option value="2">Femenino</option>
          </select>
          <select id="cmbEstatusID" class="span3" tabindex="11" >
  					<option value="1">Activo</option>
  					<option value="2">Inactivo</option>
  				</select>
        </div>
        </div>
			</form>
		</div>
		<div class="modal-footer">
			<button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="12">Cancelar</button>
      <button class="btn btn-primary" tabindex="13" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>
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
      
    $.post('../../catalogos/pacientes/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgPacientes tbody').empty();
                    var temp = Mustache.render($('#plantilla_pacientes').html(),data);
                    $('#dgPacientes tbody').html(temp);
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
    $('#frmPacientes')[0].reset();
    $('#txtPacienteID').val('');
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','../../catalogos/pacientes/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','../../catalogos/pacientes');        
  }
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('../../catalogos/pacientes/guardar',
                  { intPacienteID: $('#txtPacienteID').val(), 
                  	strNombre: $('#txtNombre').val(),
                    strApellidoPaterno: $('#txtApellidoPaterno').val(),
                    strApellidoMaterno: $('#txtApellidoMaterno').val(),
                    strDireccion: $('#txtDireccion').val(),
                    strTelefono: $('#txtTelefono').val(),
                    strCorreo: $('#txtCorreo').val(),
                    dtFechaNacimiento: $('#dtFechaNacimiento').val(),
                    intEdad: $('#txtEdad').val(),
                    intSexoID: $('#cmbSexo').val(),
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
      $.post('../../catalogos/pacientes/cambiar_estado',
                  { intPacienteID: id,
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
    $.post('../../catalogos/pacientes/editar',
                  { intPacienteID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
                      $('#txtPacienteID').val(data.row.paciente_id);
                      $('#txtNombre').val(data.row.nombre);
                      $('#txtApellidoPaterno').val(data.row.apellido_paterno);
                      $('#txtApellidoMaterno').val(data.row.apellido_materno);
                      $('#txtDireccion').val(data.row.direccion);
                      $('#txtTelefono').val(data.row.telefono);
                      $('#txtCorreo').val(data.row.correo_electronico);
                      $('#dtFechaNacimiento').val(data.row.fecha_nacimiento.toString());
                      $('#txtEdad').val(data.row.edad.toString());
                      $('#cmbSexo').val(data.row.tipo_pago_id.toString());
                      $('#cmbEstatusID').val(data.row.estatus_id.toString());
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
   function fnEliminar(id){
    $.post('../../catalogos/pacientes/eliminar',
                  { intPacienteID: id
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
     fnGeneralForm('#frmPacientes');    
     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 

               