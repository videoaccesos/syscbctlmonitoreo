    <form id="frmSearch" action="#" method="post" onsubmit="return(false)">
            <div style="display:inline-block;">
              <label for="txtPrivada"><h5>Privada</h5></label>
              <div class="input-append">
                  <input  id="txtPrivada" type="text" placeholder="Ingresa Privada">
                  <div class="btn-group" >
                    <button class="btn dropdown-toggle" onclick="paginacion();" tabindex="-1">
                      <i class="icon-search"></i>
                    </button>
                  </div>
              </div>
            </div>
            &nbsp;&nbsp;
            <div style="display:inline-block;">
              <label for="txtBusqueda"><h5>Nro. Casa ó Calle</h5></label>
              <div class="input-append">
                <input  id="txtBusqueda" type="text" placeholder="Número de Casa" >
                <div class="btn-group" >
                  <button class="btn dropdown-toggle" onclick="paginacion();" tabindex="-1">
                    <i class="icon-search"></i>
                  </button>
                </div>
              </div>
            </div> 
          <div class="btn-group" style="display:inline-block;float:right;padding-top:40px;">
			<!-- Button to trigger modal -->
			<a href="#myModal_Residencias" role="button" class="btn btn-primary" data-toggle="modal"><i class="icon-plus icon-white"></i> Nuevo</a>		
    		<button class="btn btn-inverse" >
    			<i class="icon-print icon-white"></i> Imprimir
    		</button>	
          </div>    
    </form>

	<!-- Modal -->
	<div id="myModal_Residencias" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
	  <div class="modal-header">
		<button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="-1">×</button>
		<h3 id="myModalLabel">Residencia</h3>
	  </div>
	  <div class="modal-body">
		  <form name="frmResidencias" id="frmResidencias" action="#" method="post" onsubmit="return(false)" autocomplete="off" style="margin-bottom:0px;">
		  	<input type="hidden" id="txtResidenciaID" value="">
			<input type="hidden" id="txtPrivada_ResidenciasID" value="">
			<label for="txtPrivada_Residencias">Privada</label>
			<input class="span6" id="txtPrivada_Residencias" type="text" placeholder="Ingresa Nombre de Privada" tabindex="1">
			
			<label for="txtNroCasa_Residencias" style="float:left; margin:0px 160px 0px 0px;">No. de Casa</label>
			<label for="cmbEstatus_Residencias">Estatus</label>
			
			<input class="span3" id="txtNroCasa_Residencias" type="text" placeholder="Ingrese Número" tabindex="2" style="float:left; margin-right: 17px;" maxlength="10">
			<select class="span3" id="cmbEstatus_Residencias" tabindex="3">
				<option value="1">Activo</option>
				<option value="2">Inactivo</option>
				<option value="3">Moroso</option>
			</select>
			
			
			<label for="txtCalle_Residencias">Calle</label>
			<input class="span6" id="txtCalle_Residencias" type="text" placeholder="Ingresa Calle" tabindex="4" maxlength="60">
			
			
			<label for="txtTel1_Residencias" style="width:315px;display:inline-block;">Telefonos</label> <label style="width:30px;display:inline;" for="txtInterfon">Interfón</label>
			
			
			<div class="input">
				<input class="span2" id="txtTel1_Residencias" type="text" placeholder="Ingrese Número" style="float:left; margin-right: 20px;" tabindex="5" maxlength="14">
				<input class="span2" id="txtTel2_Residencias" type="text" placeholder="Ingrese Número" style="float:left; margin-right: 20px;" tabindex="6" maxlength="14">
				<input class="span2" id="txtInterfon" type="text" placeholder="Interfón" tabindex="7" maxlength="5">
			</div>

			<label for="txtObservaciones_Residencias">Observaciones</label>
			<textarea class="span6" id="txtObservaciones_Residencias" rows="2" tabindex="8"></textarea> 
		  </form>
	  </div>
	  <div class="modal-footer">
		<button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="10" onblur="$('#txtPrivada_Residencias').focus()">Cancelar</button>
		<button class="btn btn-primary" tabindex="9" onclick="fnGuardar()"><i class="icon-hdd icon-white" ></i> Guardar</button>
		<button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtResidenciaID','residencias');"><i class="icon-calendar"></i> Historial</button>
	  </div>
	</div>
                 		
	<!-- Modal -->
	<div id="myModal_Residentes" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="top:15%; width:990px; left:37%;" >
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="-1">×</button>
			<h3 id="myModalLabel">Residentes</h3>
		</div>
		<div class="modal-body" style="max-height:100%; height:100%;">
			<form name="frmResidentes" id="frmResidentes" action="#" method="post" onsubmit="return(false)" autocomplete="off">
				<input type="hidden" id="auto_save" value="fnGuardar_Residentes()">
				<input type="hidden" id="txtResidenciaID_Residentes">  
				<input type="hidden" id="txtResidenteID" value="">
				<div style="display:inline-block;">
					<div style="max-width:470px; widht:90%; display:inline-block; padding-right:17px;">     
						<div>
							<div style="display:inline-block; padding-right:17px;">
								<label for="txtNumCasa">No. Casa</label>
								<input class="span1" id="txtNumCasa_Residentes" type="text" disabled>
							</div>
							<div style="display:inline-block;">
								<label for="txtCalle_Residentes">Calle</label>
								<input class="span5" id="txtCalle_Residentes" type="text"  disabled>
							</div>
						</div> 
						<div>
							<label for="txtContacto">Datos de Residentes</label>
							<input class="span2" id="txtNombres_Residentes" type="text"  tabindex="11" placeholder="Nombre(s)" style="display: inline-block; margin-right:15px;">
							<input class="span2" id="txtApePaterno_Residentes" type="text" tabindex="12" placeholder="Apellido Paterno" style="display: inline-block; margin-right:15px;">
							<input class="span2" id="txtApeMaterno_Residentes" type="text" tabindex="13" placeholder="Apellido Materno" style="display: inline-block;">
							
							<input class="span2" id="txtCelular_Residentes" type="text" tabindex="14" placeholder="Celular" style="display: inline-block;">
							<label class="checkbox" style="display: inline-block;margin-left:15px;" >
						      <input id="chkNotificacion" type="checkbox" tabindex="15"> Notificar por <i class="icon-envelope"></i>
						    </label>
							<input class="span6" id="txtEmail_Residentes" type="text" tabindex="16" placeholder="Ingresa Email">
						</div>
						<button class="btn" tabindex="18" onclick="fnNuevo_Residente()"><i class="icon-file"></i> Nuevo</button>
						<button class="btn btn-primary" tabindex="17" style="float:right;margin-right:10px;" onclick="fnGuardar_Residentes()"><i class="icon-hdd icon-white"></i> Guardar</button>			
					</div>

					<div style="display:inline-block; vertical-align: top;">
						<div>
							<div style="display:inline-block; padding-right:25px;">
							  <label for="txtPrivada_Residentes">Privada</label>
							  <input class="span3" id="txtPrivada_Residentes" type="text"  disabled>
							</div>
							<div style="display:inline-block;">
							  <label for="txtTelefonos_Residentes">Teléfono(s)</label>
							  <input class="span3" id="txtTelefonos_Residentes" type="text"  disabled>
							</div>
						</div>
						<div>
							<label for="txtMotivo">Lista de Residentes</label>
							<div class= "well" style="margin: 0px; padding: 0px 0px 0px 0px; height:300px;">
								<table class="table table-stripped" id="dgResidentes" style="margin: 0px;">
									<tbody>
									</tbody>
								</table>
							</div>
							<div style="dysplay: inline-block;margin-top:10px;">
						      <div id="pagLinks_Residentes"  style="float:left;margin-right:10px;"></div>
						      <div style="float:right;margin-right:10px;"><strong id="numElementos_Residentes">0</strong> Encontrados</div>
						      <br>
						   </div>
						</div>
					</div>
				</div>
			</form>
			<script id="plantilla_residentes" type="text/template">
		          {{#rows}}
		          	<tr>
						<td>{{residente}} {{#reportar_acceso}}<i class="icon-envelope"></i>{{/reportar_acceso}}<br>Cel. {{celular}}
						    <a onclick="fnEliminar_Residente('{{residente_id}}')" class="btn btn-mini" style="float:right;" title="Eliminar"><i class="icon icon-trash"></i></a>
						    <a onclick="fnEditar_Residente('{{residente_id}}')" class="btn btn-mini" style="float:right;margin-right:10px;" title="Editar"><i class="icon icon-pencil"></i></a> 
						</td>
					</tr>
		          {{/rows}}
		          {{^rows}}
		          <tr> 
		            <td> No se Encontraron Resultados!!</td>
		          </tr> 
		          {{/rows}}
		    </script>
		</div>
		<div class="modal-footer">
		  <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="19" onblur="$('#txtApePaterno_Residentes').focus()">Cerrar</button>
		  <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtResidenteID','residencias_residentes');"><i class="icon-calendar"></i> Historial</button>
		</div>
	</div>

	<!-- Modal -->
	<div id="myModal_Visitantes" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="top:15%; width:990px; left:37%;" >
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
			<h3 id="myModalLabel">Visitantes</h3>
		</div>
		<div class="modal-body" style="max-height:100%; height:100%;">
			<form name="frmVisitantes" id="frmVisitantes" action="#" method="post" onsubmit="return(false)" autocomplete="off">
				<input type="hidden" id="auto_save" value="fnGuardar_Visitantes()">
				<input type="hidden" id="txtResidenciaID_Visitantes">  
				<input type="hidden" id="txtVisitanteID" value="">
				<div style="display:inline-block;">
					<div style="max-width:470px; widht:90%; display:inline-block; padding-right:17px;">     
						<div>
							<div style="display:inline-block; padding-right:17px;">
								<label for="txtNumCasa">No. Casa</label>
								<input class="span1" id="txtNumCasa_Visitantes" type="text" disabled>
							</div>
							<div style="display:inline-block;">
								<label for="txtCalle">Calle</label>
								<input class="span5" id="txtCalle_Visitantes" type="text" disabled>
							</div>
						</div> 
							<div style="display:inline-block; padding-right:17px;">
								<label for="txtNombres_Visitantes">Datos de Visitante</label>
								<input class="span2" id="txtNombres_Visitantes" type="text" tabindex="21" maxlength="50" placeholder="Nombre(s)" style="display: inline-block; margin-right:15px;">
								<input class="span2" id="txtApaterno_Visitantes" type="text" tabindex="22" maxlength="50" placeholder="Apellido Paterno" style="display: inline-block; margin-right:15px;">
								<input class="span2" id="txtAmaterno_Visitantes" type="text" tabindex="23" maxlength="50" placeholder="Apellido Materno" style="display: inline-block;">
								
								<input class="span2" id="txtTelefono_Visitantes" type="text" tabindex="24" maxlength="14" placeholder="Télefono" style="display: inline-block; margin-right:15px;">
								<input class="span2" id="txtCelular_Visitantes" type="text" tabindex="25" maxlength="14" placeholder="Celular" style="display: inline-block; margin-right:15px;">
								 <select class="span2" id="cmbEstatus_Visitantes" tabindex="26">  
								 	<option value="1">Activo</option>
								 	<option value="2">Baja</option>
								 </select>
								<input class="span6" id="txtEmail_Visitantes" type="text" tabindex="27" maxlength="100" placeholder="Ingresa Email">
							</div>
						<div>
							<div style="display:inline-block; padding-right:17px;">
								<div>
									<label for="txtObservaciones_Visitantes">Observaciones</label>
									<textarea id="txtObservaciones_Visitantes" class="span6" rows="5" tabindex="28" placeholder="Ingrese Observaciones" style="resize:none;"></textarea>
								</div>
							</div>
							<button class="btn" tabindex="30" onclick="fnNuevo_Visitante()"><i class="icon-file"></i> Nuevo</button>
						    <button class="btn btn-primary" tabindex="29" onclick="fnGuardar_Visitantes()" style="float:right;margin-right:10px;"><i class="icon-hdd icon-white"></i> Guardar</button>
						</div>
					</div>

					<div style="display:inline-block; vertical-align: top;">
						<div>
							<div style="display:inline-block; padding-right:25px;">
								  <label for="txtPrivada_Visitantes">Privada</label>
								  <input class="span3" id="txtPrivada_Visitantes" type="text" disabled>
							</div>
							<div style="display:inline-block;">
								  <label for="txtTelefonos_Visitantes">Teléfono(s)</label>
								  <input class="span3" id="txtTelefonos_Visitantes" type="text" disabled>
							</div>
						</div>

						<div>
							<label>Lista de Visitantes</label>
							<div class="well" style="margin: 0px; padding: 0px 0px 0px 0px; height:300px;">
								<table class="table table-stripped" id="dgVisitantes">
									<tbody>
									</tbody>
								</table>
							</div>
							<div style="dysplay: inline-block;margin-top:10px;">
						      <div id="pagLinks_Visitantes"  style="float:left;margin-right:10px;"></div>
						      <div style="float:right;margin-right:10px;"><strong id="numElementos_Visitantes">0</strong> Encontrados</div>
						      <br>
						   </div>
						</div>
					</div>
				</div> 
			</form>
			<script id="plantilla_visitantes" type="text/template">
		          {{#rows}}
		          	<tr>
						<td>{{visitante}}<span style="float:right;">{{estatus}}</span><br>Cel. {{celular}}
							<a onclick="fnEliminar_Visitante('{{visitante_id}}')" class="btn btn-mini" style="float:right;" title="Eliminar"><i class="icon icon-trash"></i></a>
							<a onclick="fnEditar_Visitante('{{visitante_id}}')" class="btn btn-mini" style="float:right;margin-right:10px;" title="Editar"><i class="icon icon-pencil"></i></a>
						</td>
					</tr>
		          {{/rows}}
		          {{^rows}}
		          <tr> 
		            <td> No se Encontraron Resultados!!</td>
		          </tr> 
		          {{/rows}}
		    </script>
		</div>
		<div class="modal-footer">
		  <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="31">Cerrar</button>
		  <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtVisitanteID','residencias_visitantes');"><i class="icon-calendar"></i> Historial</button>
		</div>
	</div>

	<table class="table table-stripped" id="dgResidencias">
		<thead>
			<tr>
			 <th width="40px" >#Casa</th>
			 <th>Privada, Calle</th>
			 <th width="30px" style="text-align:center;">Estatus</th>
			 <th width="20px" style="text-align:center;">Res.</th>
			 <th width="20px" style="text-align:center;">Vis.</th>
			 <th width="20px" ></th>
			 <th width="20px" ></th>
			 <th width="20px" ></th>
			</tr>
		</thead>
		<tbody>
		</tbody>
	</table>
	<script id="plantilla_residencias" type="text/template">
          {{#rows}}
          <tr>
			<td>{{nro_casa}}</td>
			<td>{{privada}}, {{calle}}</td>
			<td>{{estatus}}</td>		
			<td style="text-align:center;"><a onclick="fnMostrarResVis({{residencia_id}},1)" role="button" class="btn btn-mini" data-toggle="modal" title="Residentes"><i class="icon-user"></i></a></td>
			<td style="text-align:center;"><a onclick="fnMostrarResVis({{residencia_id}},2)" role="button" class="btn btn-mini" data-toggle="modal" title="Visitantes"><i class="icon-user"></i></a></td>
			<td ><a onclick="fnCambiarEstado({{residencia_id}},{{estatus_id}})" class="btn btn-mini" title="Cambiar de Estado"><i class="icon-eye-open"></i></a></td>
			<td ><a onclick="fnEditar({{residencia_id}})" class="btn btn-mini"><i class="icon icon-pencil" title="Editar"></i></a></td>
			<td ><a onclick="fnEliminar({{residencia_id}})" class="btn btn-mini"><i class="icon icon-trash" title="Eliminar"></i></a></td>
		  </tr>
          {{/rows}}
          {{^rows}}
          <tr> 
            <td colspan="8"> No se Encontraron Resultados!!</td>
          </tr> 
          {{/rows}}
    </script>

    <div style="dysplay: inline-block;">
      <div id="pagLinks"  style="float:left;margin-right:10px;"></div>
      <div style="float:right;margin-right:10px;"><strong id="numElementos">3</strong> Encontrados</div>
      <br>
   </div>

<script type="text/javascript">
  var pagina = 0;
  var pagina_Residentes = 0;
  var pagina_Visitantes = 0;
  var strUltimaBusqueda= "";
  var bolPagina = false;
  
//---------- Funciones para la Busqueda

  function paginacion() {
    if($('#txtBusqueda').val()+$('#txtPrivada').val() != strUltimaBusqueda){
      pagina = 0;
      strUltimaBusqueda = $('#txtBusqueda').val()+$('#txtPrivada').val();
    }
      
	    $.post('catalogos/residencias/paginacion',
	                 {strBusqueda:$('#txtBusqueda').val(), strPrivada:$('#txtPrivada').val(), intPagina:pagina},
	                  function(data) {
	                    $('#dgResidencias tbody').empty();
	                    var temp = Mustache.render($('#plantilla_residencias').html(),data);
	                    $('#dgResidencias tbody').html(temp);
	                    $('#pagLinks').html(data.paginacion);
	                    $('#numElementos').html(data.total_rows);
	                    pagina = data.pagina;
	                  }
	                 ,
	          'json');
  }

  function paginacion_Residentes() {
    if($('#txtApePaterno_Residentes').val()+$('#txtApeMaterno_Residentes').val()+$('#txtNombres_Residentes').val() != strUltimaBusqueda){
      pagina_Residentes = 0;
      bolPagina = true;
    }
    if(bolPagina)
    $.post('catalogos/residencias_residentes/paginacion',
                 {intResidenciaID:$('#txtResidenciaID_Residentes').val(),
                  strApePaterno:$('#txtApePaterno_Residentes').val(), 
                  strApeMaterno:$('#txtApeMaterno_Residentes').val(), 
                  strNombre:$('#txtNombres_Residentes').val(), 
                  intPagina:pagina_Residentes},
                  function(data) {
                    $('#dgResidentes tbody').empty();
                    var temp = Mustache.render($('#plantilla_residentes').html(),data);
                    $('#dgResidentes tbody').html(temp);
                    $('#pagLinks_Residentes').html(data.paginacion);
                    $('#numElementos_Residentes').html(data.total_rows);
                    pagina_Residentes = data.pagina;
                    strUltimaBusqueda = $('#txtApePaterno_Residentes').val()+$('#txtApeMaterno_Residentes').val()+$('#txtNombres_Residentes').val();
                    bolPagina = false;
                  }
                 ,
          'json');
  }

  function paginacion_Visitantes() {
    if($('#txtApaterno_Visitantes').val()+$('#txtAmaterno_Visitantes').val()+$('#txtNombres_Visitantes').val() != strUltimaBusqueda){
      pagina_Visitantes = 0;
      bolPagina = true;
    }
    if(bolPagina)
    $.post('catalogos/residencias_visitantes/paginacion',
                 {intResidenciaID:$('#txtResidenciaID_Visitantes').val(),
                  strApePaterno:$('#txtApaterno_Visitantes').val(), 
                  strApeMaterno:$('#txtAmaterno_Visitantes').val(), 
                  strNombre:$('#txtNombres_Visitantes').val(), 
                  intPagina:pagina_Visitantes},
                  function(data) {
                    $('#dgVisitantes tbody').empty();
                    var temp = Mustache.render($('#plantilla_visitantes').html(),data);
                    $('#dgVisitantes tbody').html(temp);
                    $('#pagLinks_Visitantes').html(data.paginacion);
                    $('#numElementos_Visitantes').html(data.total_rows);
                    pagina_Visitantes = data.pagina;
                    strUltimaBusqueda = $('#txtApaterno_Visitantes').val()+$('#txtAmaterno_Visitantes').val()+$('#txtNombres_Visitantes').val();
                    bolPagina = false;
                  }
                 ,
          'json');
  }

  function cmbPuestoID_set() {
    $.post('catalogos/puestos/opciones',
                  {},
                  function(data) {
                    $('#cmbPuestoID').empty();
                    var temp = Mustache.render($('#plantilla_puestos').html(),data);
                    $('#cmbPuestoID').html(temp);
                  }
                  ,'json');
  }


//--------- Funciones para el Modal

  function fnNuevo (){
    $('#divMensajes').html('');
    $('#frmResidencias')[0].reset();
    $('#frmResidentes')[0].reset();
    $('#frmVisitantes')[0].reset();
    $('#txtPrivada_ResidenciasID').val('');
    $('#txtResidenciaID').val('');
    paginacion();
  }

  function fnNuevo_Residente(){
  	  $('#txtResidenteID').val('');
  	  $('#txtApePaterno_Residentes').val('');
  	  $('#txtApeMaterno_Residentes').val('');
  	  $('#txtNombres_Residentes').val('');
  	  $('#txtCelular_Residentes').val('');
  	  $('#chkNotificacion').attr('checked',false);
  	  $('#txtEmail_Residentes').val('');
	  $('#txtNombres_Residentes').focus();  
	  pagina_Residentes = 0;
      paginacion_Residentes();
  }

  function fnNuevo_Visitante(){
  	  $('#txtVisitanteID').val('');
  	  $('#txtNombres_Visitantes').val('');
  	  $('#txtApaterno_Visitantes').val('');
  	  $('#txtAmaterno_Visitantes').val('');
  	  $('#txtTelefono_Visitantes').val('');
  	  $('#txtCelular_Visitantes').val('');
  	  $('#cmbEstatus_Visitantes').val(1);
  	  $('#txtEmail_Visitantes').val('');
  	  $('#txtObservaciones_Visitantes').val('');
	  $('#txtNombres_Visitantes').focus();  
	  pagina_Visitantes = 0;
      paginacion_Visitantes();
  }

  function fnValidar(){
    return true;
  }

  function fnGuardar(){
    if(fnValidar()) {
      $.post('catalogos/residencias/guardar',
                  { intResidenciaID: $('#txtResidenciaID').val(), 
                    intPrivadaID: $('#txtPrivada_ResidenciasID').val(),
                    strNroCasa: $('#txtNroCasa_Residencias').val(),
                    strCalle: $('#txtCalle_Residencias').val(),
                    strTelefono1: $('#txtTel1_Residencias').val(),
                    strTelefono2: $('#txtTel2_Residencias').val(),
                    strInterfon: $('#txtInterfon').val(),
                    strObservaciones: $('#txtObservaciones_Residencias').val(),
                    intEstatusID: $('#cmbEstatus_Residencias').val()
                  },
                  function(data) {
                    if(data.resultado){
                      //fnNuevo();
                      $('#txtPrivada').val($('#txtPrivada_Residencias').val());
                      $('#txtBusqueda').val($('#txtNroCasa_Residencias').val());
                      paginacion();
                      $('#myModal_Residencias').modal('hide');
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
    }
  }

  function fnGuardar_Residentes(){
  	if(fnValidar()) {
  	  var intNoti = 0;
  	  if($('#chkNotificacion').is(':checked'))
  	  	intNoti = 1;
      $.post('catalogos/residencias_residentes/guardar',
                  { strResidenteID: $('#txtResidenteID').val(),
                  	intResidenciaID: $('#txtResidenciaID_Residentes').val(), 
                    strApePaterno: $('#txtApePaterno_Residentes').val(),
                    strApeMaterno: $('#txtApeMaterno_Residentes').val(),
                    strNombre: $('#txtNombres_Residentes').val(),
                    strCelular: $('#txtCelular_Residentes').val(),
                    intNotificar: intNoti,
                    strEmail: $('#txtEmail_Residentes').val()
                  },
                  function(data) {
                    if(data.resultado){
                      fnNuevo_Residente();
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
    }
  }

   function fnGuardar_Visitantes(){
  	if(fnValidar()) {
      $.post('catalogos/residencias_visitantes/guardar',
                  { strVisitanteID: $('#txtVisitanteID').val(),
                  	intResidenciaID: $('#txtResidenciaID_Visitantes').val(), 
                    strApePaterno: $('#txtApaterno_Visitantes').val(),
                    strApeMaterno: $('#txtAmaterno_Visitantes').val(),
                    strNombre: $('#txtNombres_Visitantes').val(),
                    strTelefono: $('#txtTelefono_Visitantes').val(),
                    strCelular: $('#txtCelular_Visitantes').val(),
                    intEstatusID: $('#cmbEstatus_Visitantes').val(),
                    strEmail: $('#txtEmail_Visitantes').val(),
                    strObservaciones: $('#txtObservaciones_Visitantes').val()
                  },
                  function(data) {
                    if(data.resultado){
                    	fnNuevo_Visitante();
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
    }
  }

  function fnCambiarEstado(id,estado){
      $.post('catalogos/residencias/cambiar_estado',
                  { intResidenciaID: id,
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
    $.post('catalogos/residencias/editar',
                  { intResidenciaID:id
                  },
                  function(data) {
                  $('#divMensajes').html(data.mensajes);
                  if(data.row){
                      $('#txtResidenciaID').val(data.row.residencia_id);
                      $('#txtPrivada_ResidenciasID').val(data.row.privada_id);
                      $('#txtPrivada_Residencias').val(data.row.privada);
                      $('#txtNroCasa_Residencias').val(data.row.nro_casa);
                      $('#cmbEstatus_Residencias').val(data.row.estatus_id);
                      $('#txtCalle_Residencias').val(data.row.calle);
                      $('#txtTel1_Residencias').val(data.row.telefono1);
                      $('#txtTel2_Residencias').val(data.row.telefono2);
                      $('#txtInterfon').val(data.row.interfon);
                      $('#txtObservaciones_Residencias').val(data.row.observaciones);
                      $('#myModal_Residencias').modal('show');
                    }
                  }
                 ,
          'json');
  }

  function fnEditar_Residente(id){
    $.post('catalogos/residencias_residentes/editar',
                  { strResidenteID:id
                  },
                  function(data) {
                  $('#divMensajes').html(data.mensajes);
                  if(data.row){
                      $('#txtResidenteID').val(data.row.residente_id);
                      $('#txtApePaterno_Residentes').val(data.row.ape_paterno);
                      $('#txtApeMaterno_Residentes').val(data.row.ape_materno);
                      $('#txtNombres_Residentes').val(data.row.nombre);
                      $('#txtCelular_Residentes').val(data.row.celular);
                      if(data.row.reportar_acceso == "1")
                      	$('#chkNotificacion').attr('checked', true);
                      else
                      	$('#chkNotificacion').attr('checked', false);
                      $('#txtEmail_Residentes').val(data.row.email);
                      $('#txtNombres_Residentes').focus();
                      paginacion_Residentes();
                    }
                  }
                 ,
          'json');
  }

  function fnEditar_Visitante(id){
    $.post('catalogos/residencias_visitantes/editar',
                  { strVisitanteID:id
                  },
                  function(data) {
                  $('#divMensajes').html(data.mensajes);
                  if(data.row){
                      $('#txtVisitanteID').val(data.row.visitante_id);
                      $('#txtApaterno_Visitantes').val(data.row.ape_paterno);
                      $('#txtAmaterno_Visitantes').val(data.row.ape_materno);
                      $('#txtNombres_Visitantes').val(data.row.nombre);
                      $('#txtTelefono_Visitantes').val(data.row.telefono);
                      $('#txtCelular_Visitantes').val(data.row.celular);
                      $('#cmbEstatus_Visitantes').val(data.row.estatus_id);
                      $('#txtEmail_Visitantes').val(data.row.email);
                      $('#txtObservaciones_Visitantes').val(data.row.observaciones);
                      $('#txtNombres_Visitantes').focus();
                      paginacion_Visitantes();
                    }
                  }
                 ,
          'json');
  }


  function fnMostrarResVis(id,tipo){
    $.post('catalogos/residencias/editar',
                  { intResidenciaID:id
                  },
                  function(data) {
                  $('#divMensajes').html(data.mensajes);
                  if(data.row){
                  	    if(tipo == 1) {//Residentes
	                    	$('#txtResidenciaID_Residentes').val(data.row.residencia_id);
	                    	$('#txtPrivada_Residentes').val(data.row.privada);
	                    	$('#txtNumCasa_Residentes').val(data.row.nro_casa);
	                    	$('#txtCalle_Residentes').val(data.row.calle);
	                    	$('#txtTelefonos_Residentes').val(data.row.telefono1+', '+data.row.telefono2),
	                    	$('#myModal_Residentes').modal('show');
                  		}else {  //Visitantes
	                    	$('#txtResidenciaID_Visitantes').val(data.row.residencia_id);
	                    	$('#txtPrivada_Visitantes ').val(data.row.privada);
	                    	$('#txtNumCasa_Visitantes').val(data.row.nro_casa);
	                    	$('#txtCalle_Visitantes').val(data.row.calle);
	                    	$('#txtTelefonos_Visitantes').val(data.row.telefono1+', '+data.row.telefono2),
	                    	$('#myModal_Visitantes').modal('show');
                  		}
                    }
                  }
                 ,
          'json');
  }

   function fnEliminar(id){
   	if(confirm('¡El siguiente movimiento, también se eliminara a sus respectivos residentes y visitantes vinculados! \n Esta seguro que desea eliminar el registro ?'))
	    $.post('catalogos/residencias/eliminar',
	                  { intResidenciaID:id
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

  function fnEliminar_Residente(id){
   	if(confirm('Esta seguro que desea eliminar el registro ?'))
	    $.post('catalogos/residencias_residentes/eliminar',
	                  { strResidenteID:id
	                  },
	                  function(data) {
	                    $('#divMensajes').html(data.mensajes);
	                    if(data.resultado){
	                      bolPagina = true;
	                      paginacion_Residentes();
	                    }
	                  }
	                 ,
	          'json');
  }

  function fnEliminar_Visitante(id){
   	if(confirm('Esta seguro que desea eliminar el registro ?'))
	    $.post('catalogos/residencias_visitantes/eliminar',
	                  { strVisitanteID:id
	                  },
	                  function(data) {
	                    $('#divMensajes').html(data.mensajes);
	                    if(data.resultado){
	                      bolPagina = true;
	                      paginacion_Visitantes();
	                    }
	                  }
	                 ,
	          'json');
  }

  $( document ).ready(function() {

  	$("#txtPrivada_Residencias").autocomplete("catalogos/privadas/autocomplete", 
     	 	{ minChars:1,matchSubset:1,matchContains:1,cacheLength:6,onItemSelect:null,selectOnly:0,remoteDataType:"json"} 
     );
   
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

     $('#pagLinks_Residentes').on('click','a',function(event){
        event.preventDefault();
        pagina_Residentes = $(this).attr('href').replace('/','');
        bolPagina = true;
        paginacion_Residentes();
     });

      $('#pagLinks_Visitantes').on('click','a',function(event){
        event.preventDefault();
        pagina_Visitantes = $(this).attr('href').replace('/','');
        bolPagina = true;
        paginacion_Visitantes();
     });

	//---- Script para el Modal
     $('#myModal_Residencias').on('shown', function () {
       $('#txtPrivada_Residencias').focus();
     });

     $('#myModal_Residentes').on('shown', function () {
     	bolPagina = true;
       fnNuevo_Residente();
     });

     $('#myModal_Visitantes').on('shown', function () {
     	bolPagina = true;
       fnNuevo_Visitante();
     });

     $('#myModal_Residencias,#myModal_Residentes').on('hidden', function () {
      	fnNuevo();
        $('#txtPrivada').focus();
     });

   /* $("#cmbEstatusID").change(function(){
        if(this.value == 1)
          $('#dtFechaBaja').attr('disabled', 'disabled');
        else
          $('#dtFechaBaja').removeAttr('disabled');
      });*/

     $("#txtApePaterno_Residentes,#txtApeMaterno_Residentes,#txtNombres_Residentes").blur(paginacion_Residentes);
     $("#txtApaterno_Visitantes,#txtAmaterno_Visitantes,#txtNombres_Visitantes").blur(paginacion_Visitantes);
  
     //$('#dtFechaIngreso').val(strFecha);
     //$('#dtFechaBaja').val(strFecha);
     //$('#dtFechaBaja').attr('disabled', 'disabled');

//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmResidencias');    
     fnGeneralForm('#frmResidentes');    
     fnGeneralForm('#frmVisitantes');
     $('#txtPrivada').focus();
     paginacion();
     //cmbPuestoID_set();
  });
</script> 