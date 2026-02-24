
<form id="frmRegistroAcceso" action="#" method="post" onsubmit="return(false)" autocomplete="off" style="margin-bottom:0px;">
  <input id="txtRegistroAccesoID" type="hidden" value="">
	<div style=" display:inline-block; padding-right:10px; width:100%;">   
    <div style="display:inline-block; font-size:20px; padding-top:5px;">
    Duración: <label id="lblCrono" style="display:inline-block;font-size:20px;">00:00:0</label>, Ult. <label id="lblUltima" style="display:inline-block;font-size:20px;">00:00:0</label>
    </div>
		<div class="btn-group" style="display:inline-block;float:right;padding-bottom:10px;">
			<!-- Button to trigger modal -->
			<a id="btnNuevo" href="" type="button" class="btn btn-primary" data-toggle="modal"><i class="icon-plus icon-white"></i> Nuevo</a>		
			<a onclick="fnGuardar(1)" type="button" class="btn btn-success" data-toggle="modal"><i class="icon-ok icon-white"></i> Acceso</a>
      <a onclick="fnGuardar(3)" type="button" class="btn btn-warning" data-toggle="modal"><i class="icon-bullhorn icon-white"></i> Informo</a>
      <a onclick="fnGuardar(2)" type="button" class="btn btn-danger" data-toggle="modal"><i class="icon-ban-circle icon-white"></i> Rechazo</a>
			<a id="btnComprobar"  type="button" class="btn btn-inverse"><i class="icon-search icon-white"></i> Buscar</a>                                             
	  </div>    
	</div>
	<div style=" display:inline-block; padding-right:15px; ">     
		<div>
			<div class="input" style="display:inline-block; padding-right:17px;">
				<label for="txtOperador">Operador</label>
				<input type="hidden" id="txtOperadorID" value ="<?php echo $empleado_id;?>">
				<input type="text" id="txtOperador" style="width:330px;" tabindex="-1" value="<?php echo $empleado; ?>" disabled>
			</div>
		</div>
		<div>
			<div style="display:inline-block; padding-right:17px;">
			  	<label for="cmbPrivadaID">Privada</label>
			  	<select id="cmbPrivadaID" style="width:339px;"  tabindex="1"></select>
			</div>
		</div>
		<div>
			<div style="display:inline-block;">
				<label for="txtResidencia">Residencia</label>
				<div class="input-append" 
             id ="txtResidenciaPop"
             data-toggle="popover"
             data-placement="top"
             data-html="true" 
             data-content=""
             data-trigger="manual">
					<input type="hidden" id="txtResidenciaID">
          <input type="text" id="txtResidencia" class="span4" tabindex="2">
					<span class="add-on" style="padding-left:12px;padding-right:12px;"><i class="icon-search"></i></span>
				</div>
			</div>
		</div>
		<div>
      <label for="txtSolicitante">Solicitante</label>
			<div class="input-append" style="display:inline-block;"
             id ="txtSolicitantePop"
             data-toggle="popover"
             data-placement="right"
             data-html="true" 
             data-content=""
             data-trigger="manual">
				<input type="hidden" id="txtSolicitanteID">
				<input type="text" id="txtSolicitante" class="span4" placeholder="Ingresa Solicitante" tabindex="3">
				<div class="btn-group">
				<a href="#myModalRegistroGeneral" role="button" data-toggle="modal">
					<button class="btn dropdown-toggle" tabindex="-1" onClick="fnNuevoRegistroGeneral()">
						<i class="icon-plus"></i>
					</button>

				</a>
			</div>
			</div>
		</div>
    <div>
      <div  style="display:inline-block; padding-right:17px;">
        <label for="cmbTipoGestion">Tipo de Gestión</label>
          <select id="cmbTipoGestion" style="width:339px;"  tabindex="4">
            <option value="1">No concluida</option>
            <option value="2">Moroso</option>
            <option value="3">Proveedor</option>
            <option value="4">Residente</option>
            <option value="5">Técnico</option>
            <option value="6">Trabajador de Obra</option>
            <option value="7">Trabajador de Servicio</option>
            <option value="8">Visita</option>
            <option value="9">Visita de Morosos</option>
          </select>
      </div>
    </div>
		<div>
		  	<div>
				<label for="txtObservaciones">Obsevaciones</label>
				<textarea id="txtObservaciones" rows="4" style="width:330px;" tabindex="5"></textarea>
		  	</div>
    </div>
	</div>
    

	<div style="display:inline-block; vertical-align: top; margin-top:15px;">
		<div class="tabbable"> <!-- Only required for left/right tabs -->
			<ul class="nav nav-tabs" style="margin-bottom: 5px;">
				<li class="active"><a href="#tabResidentes" data-toggle="tab" tabindex="7">Residentes  <button class="btn btn-mini" type="button" onClick="pagina_residentes=0; paginacion_residentes();"><i class="icon-refresh"></i></button></a></li>
				<li><a href="#tabVisitantes" data-toggle="tab" tabindex="8">Visitantes  <button class="btn btn-mini" type="button" onClick="pagina_visitantes=0; paginacion_visitantes();"><i class="icon-refresh"></i></button></a></li>
			</ul>
			<div class="tab-content" style="width:360px">
				<div class="tab-pane active" id="tabResidentes">
					<table class="table table-stripped" id="dgResidentes">
						<tbody>
						</tbody>
					</table>
				    <div style="dysplay: inline-block;">
				      <div id="pagLinks_residentes"  style="float:left;margin-right:10px;"></div>
				      <div style="float:right;margin-right:10px;"><strong id="numElementos_residentes">0</strong> Encontrados</div>
				      <br>
				   </div>
				</div>
				<div class="tab-pane" id="tabVisitantes">
					<table class="table table-stripped" id="dgVisitantes">
						<tbody>
						</tbody>
					</table>
					 <div style="dysplay: inline-block;">
				      <div id="pagLinks_visitantes"  style="float:left;margin-right:10px;"></div>
				      <div style="float:right;margin-right:10px;"><strong id="numElementos_visitantes">0</strong> Encontrados</div>
				      <br>
				   </div>
				</div>
			</div>
		</div>
	</div>
</form>
 <script id="plantilla_privadas" type="text/template"> 
  {{#privadas}}
    <option value="{{value}}">{{nombre}}</option>
  {{/privadas}} 
</script>

 <script id="plantilla_residentes" type="text/template">
	  {{#rows}}
	     <tr><td>{{residente}}<br>Cel. {{celular}} 
			     <a onclick="fnAsignarSolicitante('{{residente_id}}','{{residente}}')" class="btn btn-mini" style="float:right;"><i class="icon icon-share"></i></a>
	     </tr>
	  {{/rows}}
	  {{^rows}}
		 <tr> 
		    <td colspan="5"> No se Encontraron Resultados!!</td>
		 </tr> 
	  {{/rows}}
</script>
<script id="plantilla_visitantes" type="text/template">
	  {{#rows}}
	    <tr><td>{{visitante}}<br>{{observaciones}} 
			     <a onclick="fnAsignarSolicitante('{{visitante_id}}','{{visitante}}')" class="btn btn-mini" style="float:right;"><i class="icon icon-share"></i></a>
	     </tr>
	  {{/rows}}
	  {{^rows}}
	  <tr> 
	    <td colspan="5"> No se Encontraron Resultados!!</td>
	  </tr> 
	  {{/rows}}
</script>
<!-- Modal -->
<div id="myModalRegistroGeneral" class="modal hide fade" role="dialog" aria-labelledby="myModalLabelRegistroGeneral" aria-hidden="true" style="top:15%; width:900px; left:40%;" >
	<div class="modal-header">
		<button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="-1">×</button>
		<h3 id="myModalLabelRegistroGeneral">Registro General</h3>
	</div>
	<div class="modal-body" style="max-height:100%; height:100%;">
		<form id="frmRegistroGeneral" action="#" method="post" onsubmit="return(false)" autocomplete="off" style="margin-bottom:0px;">
			<div style="display:inline-block;">
				<div style="max-width:470px; widht:90%; display:inline-block; padding-right:17px;">     
						<div style="display:inline-block; padding-right:17px;">
							<label for="txtContacto">Datos del Solicitante</label>
							<input type="hidden" id="txtRegistroGeneralID" value="">
              <input class="span2" id="txtNombre" type="text" placeholder="Nombre" maxlength="50" tabindex="21" style="display: inline-block; margin-right:15px;">
							<input class="span2" id="txtApePaterno" type="text" placeholder="Apellido Paterno" maxlength="50" tabindex="22" style="display: inline-block; margin-right:15px;">
							<input class="span2" id="txtApeMaterno" type="text" placeholder="Apellido Materno" maxlength="50" tabindex="23" style="display: inline-block;">
							<input class="span2" id="txtTelefono" type="text" placeholder="Télefono" maxlength="14" tabindex="24" style="display: inline-block; margin-right:15px;">
							<input class="span2" id="txtCelular" type="text" placeholder="Celular" maxlength="14" tabindex="25" style="display: inline-block;">
							<input class="span6" id="txtEmail" type="text" placeholder="Ingresa Email" maxlength="100" tabindex="26">
						</div>
					<div>
						<div style="display:inline-block; padding-right:17px;">
							<div>
								<label for="txtObservacionesRegistroGeneral">Observaciones</label>
								<textarea id="txtObservacionesRegistroGeneral" class="span6" rows="5" placeholder="Ingrese Observaciones" style="resize:none;" tabindex="27"></textarea>
							</div>
						</div>
					</div>
				</div>
			</div>
      <div style="display:inline-block; vertical-align: top;">
        <div>
          <label>Lista de Registros</label>
          <div class="well" style="margin: 0px; padding: 0px 0px 0px 0px; height:255px; width:355px;">
            <table class="table table-stripped" id="dgRegistrosGenerales">
              <tbody>
                <tr> 
                <td> No se Encontraron Resultados!!</td>
              </tr> 
              </tbody>
            </table>
          </div>
          <div style="dysplay: inline-block;margin-top:10px;">
              <div id="pagLinks_Registros"  style="float:left;margin-right:10px;"></div>
              <div style="float:right;margin-right:10px;"><strong id="numElementos_Registros">0</strong> Encontrados</div>
              <br>
           </div>
        </div>
      </div>
		</form>
      <script id="plantilla_generales" type="text/template">
            {{#rows}}
            <tr>
                <td>{{persona}}
                <a onclick="fnAsignarSolicitante('{{registro_general_id}}','{{persona}}')"  class="btn btn-mini" style="float:right;"><i class="icon icon-share"></i></a>
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
	  <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="28">Cancelar</button>
	  <button id="btnGuardarRegistroGeneral" class="btn btn-primary" tabindex="29" onblur="$('#txtApaterno').focus()"><i class="icon-hdd icon-white"></i> Guardar</button>
	</div>
</div>

<!-- Modal -->
  <div id="myModal_Visitantes" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="top:15%; width:505px; left:50%;" >
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
      <h3 id="myModalLabel">Visitante</h3>
    </div>
    <div class="modal-body" style="max-height:100%; height:100%;">
      <form name="frmVisitantes" id="frmVisitantes" action="#" method="post" onsubmit="return(false)" autocomplete="off">
        <input type="hidden" id="txtVisitanteID" value="">
        <input type="hidden" id="txtResidenciaID_Visitantes" value="">
        <div style="display:inline-block;">
          <div style="max-width:470px; widht:90%; display:inline-block; padding-right:17px;">     
              <div style="display:inline-block; padding-right:17px;">
                <label for="txtNombres_Visitantes">Datos de Visitante</label>
                <input class="span2" id="txtNombres_Visitantes" type="text" tabindex="30" maxlength="50" placeholder="Nombre(s)" style="display: inline-block; margin-right:15px;">
                <input class="span2" id="txtApaterno_Visitantes" type="text" tabindex="31" maxlength="50" placeholder="Apellido Paterno" style="display: inline-block; margin-right:15px;">
                <input class="span2" id="txtAmaterno_Visitantes" type="text" tabindex="32" maxlength="50" placeholder="Apellido Materno" style="display: inline-block;">
                <input class="span2" id="txtTelefono_Visitantes" type="text" tabindex="33" maxlength="14" placeholder="Télefono" style="display: inline-block; margin-right:15px;">
                <input class="span2" id="txtCelular_Visitantes" type="text" tabindex="34" maxlength="14" placeholder="Celular" style="display: inline-block; margin-right:15px;">
                 <select class="span2" id="cmbEstatus_Visitantes" tabindex="26">  
                  <option value="1">Activo</option>
                  <option value="2">Baja</option>
                 </select>
                <input class="span6" id="txtEmail_Visitantes" type="text" tabindex="35" maxlength="100" placeholder="Ingresa Email">
              </div>
            <div>
              <div style="display:inline-block; padding-right:17px;">
                <div>
                  <label for="txtObservaciones_Visitantes">Observaciones</label>
                  <textarea id="txtObservaciones_Visitantes" class="span6" rows="5" tabindex="36" placeholder="Ingrese Observaciones" style="resize:none;"></textarea>
                </div>
              </div>

            </div>
          </div>
        </div> 
      </form>
      <script id="plantilla_visitantes" type="text/template">
              {{#rows}}
                <tr>
            <td>{{visitante}}<span style="float:right;">{{estatus}}</span><br>Cel. {{celular}}<a onclick="fnEditar_Visitante('{{visitante_id}}')" class="btn btn-mini" style="float:right;"><i class="icon icon-pencil"></i></a>
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
      <button class="btn btn-primary" tabindex="37" onclick="fnGuardar_Visitante()" style="float:right;margin-right:10px;"><i class="icon-hdd icon-white"></i> Guardar</button>
    </div>
  </div>

<script type="text/javascript">
  var pagina_residentes = 0;
  var pagina_visitantes = 0;
  var pagina_RegistroGeneral = 0;
  var strUltimaBusqueda = "";
  var tempID = 1;
  var bolPagina = false;
  var bolProcesando = false;
  //---------- Funciones para la Busqueda

  function paginacion_residentes(){
    if($('#txtResidenciaID').val() != strUltimaBusqueda){
      pagina_residentes = 0;
      strUltimaBusqueda = $('#txtResidenciaID').val();
    }
      
    $.post('procesos/registroaccesos/paginacion_residentes',
                 {intBusqueda:$('#txtResidenciaID').val(), intPagina:pagina_residentes},
                  function(data) {
                    $('#dgResidentes tbody').empty();
                    var temp = Mustache.render($('#plantilla_residentes').html(),data);
                    $('#dgResidentes tbody').html(temp);
                    $('#pagLinks_residentes').html(data.paginacion);
                    $('#numElementos_residentes').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
  }

  function paginacion_visitantes(){
    if($('#txtResidenciaID').val() != strUltimaBusqueda){
      pagina_visitantes = 0;
      strUltimaBusqueda = $('#txtResidenciaID').val();
    }
      
    $.post('procesos/registroaccesos/paginacion_visitantes',
                 {intBusqueda:$('#txtResidenciaID').val(), intPagina:pagina_visitantes},
                  function(data) {
                    $('#dgVisitantes tbody').empty();
                    var temp = Mustache.render($('#plantilla_visitantes').html(),data);
                    $('#dgVisitantes tbody').html(temp);
                    $('#pagLinks_visitantes').html(data.paginacion);
                    $('#numElementos_visitantes').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
  }

  function paginacion_RegistrosGenerales() {
    if($('#txtApePaterno').val()+$('#txtApeMaterno').val()+$('#txtNombre').val() != strUltimaBusqueda){
      pagina_RegistroGeneral = 0;
      bolPagina = true;
    }
    if(bolPagina)
    $.post('catalogos/registrosgenerales/paginacion',
                 {strApePaterno:$('#txtApePaterno').val(), 
                  strApeMaterno:$('#txtApeMaterno').val(), 
                  strNombre:$('#txtNombre').val(), 
                  intPagina:pagina_RegistroGeneral},
                  function(data) {
                    $('#dgRegistrosGenerales tbody').empty();
                    var temp = Mustache.render($('#plantilla_generales').html(),data);
                    $('#dgRegistrosGenerales tbody').html(temp);
                    $('#pagLinks_Registros').html(data.paginacion);
                    $('#numElementos_Registros').html(data.total_rows);
                    pagina_RegistroGeneral = data.pagina;
                    strUltimaBusqueda = $('#txtApePaterno').val()+$('#txtApeMaterno').val()+$('#txtNombre').val();
                    bolPagina = false;
                  }
                 ,
          'json');
  }


//--------- Funciones para el Modal Registro General
  function fnNuevo(){
    bolProcesando = false;
    $('#txtRegistroAccesoID').val('');
    $('#txtResidenciaID').val('');
    $('#txtResidencia').val('');
    $('#cmbTipoGestion').val(1);
    $('#txtSolicitanteID').val('');
    $('#txtSolicitante').val('');
    $('#txtObservaciones').val('');
    $('#dgVisitantes tbody').empty();
    $('#pagLinks_visitantes').html('');
    $('#numElementos_visitantes').html('0');
    $('#dgResidentes tbody').empty();
    $('#pagLinks_residentes').html('');
    $('#numElementos_residentes').html('0');
    $('#txtResidenciaPop').attr('data-content','');
    $('#txtSolicitantePop').attr('data-content','');
    $('#txtResidenciaPop').popover('hide');
    $('#txtSolicitantePop').popover('hide');
    fnHabilitarFormulario(true);
    $('#cmbPrivadaID').focus();
    IniciarCrono();
  }

  function fnHabilitarFormulario(bolBlok){
    if(bolBlok){
      $('#cmbPrivadaID').removeAttr('disabled');
      $('#cmbTipoGestion').removeAttr('disabled');
      $('#txtResidencia').removeAttr('disabled');
      $('#txtSolicitante').removeAttr('disabled');
      $('#txtObservaciones').removeAttr('disabled');

    }else {
      $('#cmbPrivadaID').attr('disabled','disabled');
      $('#cmbTipoGestion').attr('disabled','disabled');
      $('#txtResidencia').attr('disabled','disabled');
      $('#txtSolicitante').attr('disabled','disabled');
      $('#txtObservaciones').attr('disabled','disabled');
    }

  }

  function fnNuevoRegistroGeneral (){
    $('#divMensajes').html('');
    $('#txtRegistroGeneralID').val('');
    $('#frmRegistroGeneral')[0].reset();
  }

  function fnValidar(){
    bolValida = true;
    strMensaje = "";
    if($('#txtResidenciaID').val() == '') {
      strMensaje = strMensaje +'<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Seleccione una Residencia!!!</div>'; 
      bolValida = false;
    }
    if($('#cmbTipoGestion').val() == 1) {
      strMensaje = strMensaje +'<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Concluya un Tipo de Gestion!!!</div>'; 
      bolValida = false;
    }
    if($('#txtSolicitanteID').val() == '') {
      strMensaje = strMensaje +'<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Seleccione una Solicitante!!!</div>'; 
      bolValida = false;
    }
    $('#divMensajes').html(strMensaje);
    return bolValida;
  }

  function fnGuardar(intTipoAccion){
    if(fnValidar() && !bolProcesando){
        DetenerCrono();
        $('#divMensajes').html('<div class="alert alert-info"><a class="close" data-dismiss="alert">×</a>El registro se encuentra siendo procesado, por favor espere!!!</div>');
        bolProcesando = true;
        strDuracion = $('#lblCrono').html();
        strDuracion = '00:'+ strDuracion.substr(0,5);
        $.post('procesos/registroaccesos/guardar',
                  { intRegistroAccesoID: $('#txtRegistroAccesoID').val(),
                    intEmpleadoID: $('#txtOperadorID').val(),
                    intPrivadaID: $('#cmbPrivadaID').val(), 
                    intResidenciaID: $('#txtResidenciaID').val(),
                    intTipoGestionID: $('#cmbTipoGestion').val(),
                    strSolicitanteID: $('#txtSolicitanteID').val(),
                    strObservaciones: $('#txtObservaciones').val(),
                    strDuracion: strDuracion,
                    intEstatusID: intTipoAccion
                  },
                  function(data) {
                    if(data.resultado){
                      window.open('procesos/registroaccesos/upload_file_popup/'+data.id+'/'+data.imagen,
                                  'SubirImagen_'+data.id,
                                  'width=350,height=150');
                      $('#txtResidencia').val('');
                      $('#cmbTipoGestion').val(1);
                      $('#txtSolicitante').val('');
                      $('#lblUltima').html($('#lblCrono').html());
                      $('#lblCrono').html('00:00:00');
                      $('#txtObservaciones').val('');
                      $('#dgVisitantes tbody').empty();
                      $('#pagLinks_visitantes').html('');
                      $('#numElementos_visitantes').html('0');
                      $('#dgResidentes tbody').empty();
                      $('#pagLinks_residentes').html('');
                      $('#numElementos_residentes').html('0');
                      $('#txtResidenciaPop').popover('hide');
                      $('#txtSolicitantePop').popover('hide');
                      fnHabilitarFormulario(false);
                    }
                    $('#divMensajes').html(data.mensajes);
                    bolProcesando = false;
                  }
                 ,
          'json');
    }
  }

  function fnGuardarRegistroGeneral(){
    $.post('catalogos/registrosgenerales/guardar',
                { strRegistroGeneralID: $('#txtRegistroGeneralID').val(),
                	strApePaterno: $('#txtApePaterno').val(), 
                  strApeMaterno: $('#txtApeMaterno').val(),
                  strNombre: $('#txtNombre').val(),
                  strTelefono: $('#txtTelefono').val(),
                  strCelular: $('#txtCelular').val(),
                  strEmail: $('#txtEmail').val(),
                  strObservaciones: $('#txtObservacionesRegistroGeneral').val(),
                  intEstatusID: 1
                },
                function(data) {
                  if(data.resultado){
                    $('#myModalRegistroGeneral').modal('hide');
                    fnAsignarSolicitante(data.id, $('#txtNombre').val()+' '+$('#txtApePaterno').val()+' '+$('#txtApeMaterno').val());
                    $('#txtObservaciones').focus();
                  }
                  $('#divMensajes').html(data.mensajes);
                }
               ,
        'json');
  }
 
  function cmbPrivada_set() {
    $.post('catalogos/privadas/opciones',
                  {},
                  function(data) {
                    $('#cmbPrivadaID').empty();
                    var temp = Mustache.render($('#plantilla_privadas').html(),data);
                    $('#cmbPrivadaID').html(temp);
                  }
                  ,'json');
  }

  //Carga los Residentes y visitantes de la Residencia
  function fnLoadResVis(item){
  	if (item.data) {
      load_info_Residencia(item.data);
  		paginacion_residentes();
      paginacion_visitantes();
    }
  }

  function load_info_Residencia(id){
     $.post('catalogos/residencias/info',
                  {intResidenciaID:id},
                  function(data) {
                    if(data){
                      strPop = '';
                      if(data.estado != '')
                       strPop = "<b>Estado: </b>" + data.estado +"<br>";
                      if(data.interfon != '')
                        strPop += "<b>Interfón: </b>" + data.interfon +"<br>" ;
                      if(data.observaciones != "")
                        strPop += "<b>Notas: </b>" + data.observaciones +"<br>";
                      $('#txtResidenciaPop').attr('data-content',strPop);
                      $('#txtResidenciaPop').popover('show');
                    }
                  }
                  ,'json');
  }

  function load_info_Solicitante(item){
     $.post('procesos/registroaccesos/info_Solicitante',
                  {strSolicitanteID:item.data},
                  function(data) {
                    if(data != null){
                      strPop = "";
                      if(data.tipo)
                        strPop = '<a onclick="fnEditar_VisGen('+data.tipo+',\''+item.data+'\')" class="btn btn-mini" style="float:right; margin-left:50px;">Editar <i class="icon icon-pencil"></i></a>';
                      if(data.estado != '')
                       strPop += "<b>Estado: </b>" + data.estado +"<br>";
                      if(data.observaciones != "")
                        strPop += "<b>Notas: </b>" + data.observaciones +"<br>";
                      $('#txtSolicitantePop').attr('data-content',strPop);
                      $('#txtSolicitantePop').popover('show');
                    }
                    else
                      $('#txtSolicitantePop').popover('hide');

                  }
                  ,'json');
  }

  function fnAsignarSolicitante(id,nombre){
    var item = new Object();
    item.data = id;
  	$('#txtSolicitanteID').val(id);
  	$('#txtSolicitante').val(nombre);
    $('#myModalRegistroGeneral').modal('hide');
    load_info_Solicitante(item);
  }

  function fnEditar_VisGen(tipo,id){
    if(tipo == 1)
      fnEditar_Visitante(id);
    else
      fnEditar_RegistroGeneral(id);
  }

  function fnEditar_Visitante(id){
    $.post('catalogos/residencias_visitantes/editar',
                  { strVisitanteID:id
                  },
                  function(data) {
                  $('#divMensajes').html(data.mensajes);
                  if(data.row){
                      $('#txtVisitanteID').val(data.row.visitante_id);
                      $('#txtResidenciaID_Visitantes').val(data.row.residencia_id);
                      $('#txtApaterno_Visitantes').val(data.row.ape_paterno);
                      $('#txtAmaterno_Visitantes').val(data.row.ape_materno);
                      $('#txtNombres_Visitantes').val(data.row.nombre);
                      $('#txtTelefono_Visitantes').val(data.row.telefono);
                      $('#txtCelular_Visitantes').val(data.row.celular);
                      $('#cmbEstatus_Visitantes').val(data.row.estatus_id);
                      $('#txtEmail_Visitantes').val(data.row.email);
                      $('#txtObservaciones_Visitantes').val(data.row.observaciones);
                      $('#myModal_Visitantes').modal('show');                   
                      $('#txtNombres_Visitantes').focus();
                    }
                  }
                 ,
          'json');
  }

  function fnGuardar_Visitante(){
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
                      var item = new Object();
                      item.data = $('#txtVisitanteID').val();
                      load_info_Solicitante(item);
                      $('#myModal_Visitantes').modal('hide');
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
  }

  function fnEditar_RegistroGeneral(id){
    $.post('catalogos/registrosgenerales/editar',
                  { strRegistroGeneralID:id
                  },
                  function(data) {
                  $('#divMensajes').html(data.mensajes);
                  if(data.row){
                      $('#txtRegistroGeneralID').val(data.row.registro_general_id);
                      $('#txtApePaterno').val(data.row.ape_paterno);
                      $('#txtApeMaterno').val(data.row.ape_materno);
                      $('#txtNombre').val(data.row.nombre);
                      $('#txtTelefono').val(data.row.telefono);
                      $('#txtCelular').val(data.row.celular);
                      $('#txtEmail').val(data.row.email);
                      $('#txtObservacionesRegistroGeneral').val(data.row.observaciones);
                      $('#myModalRegistroGeneral').modal('show');
                    }
                  }
                 ,
          'json');
  }

  $( document ).ready(function() {

    $('#txtResidenciaPop').popover();
    $('#txtSolicitantePop').popover();

  	$("#txtPrivada").autocomplete("catalogos/privadas/autocomplete", 
     	 	{ minChars:1,matchSubset:1,matchContains:1,cacheLength:6,onItemSelect:null,selectOnly:0,remoteDataType:"json"} 
     );

  	$("#txtResidencia").autocomplete("catalogos/residencias/autocomplete", 
     	 	{ minChars:1,matchSubset:1,matchContains:1,cacheLength:12,onItemSelect:fnLoadResVis,selectOnly:0,remoteDataType:"json",extraParams:['#cmbPrivadaID']} 
     );

  	$("#txtSolicitante").autocomplete("procesos/registroaccesos/autocompleteSolicitantes", 
     	 	{ minChars:1,matchSubset:1,matchContains:1,cacheLength:5,onItemSelect:load_info_Solicitante,selectOnly:0,remoteDataType:"json",extraParams:['#txtResidenciaID']} 
     );
  		//function fnSetPrivadaID(item){
  		//	$("#txtPrivadaID").val(item.data);
  		//}
   
//---- Script para la Busqueda
    // $("#btnBuscar").click(function(event){
    //   event.preventDefault();
    //   paginacion();
    // });

     $('#pagLinks_visitantes').on('click','a',function(event){
        event.preventDefault();
        pagina_visitantes = $(this).attr('href').replace('/','');
        paginacion_visitantes();
     });

     $('#pagLinks_residentes').on('click','a',function(event){
        event.preventDefault();
        pagina_residentes = $(this).attr('href').replace('/','');
        paginacion_residentes();
     });

     $('#pagLinks_Registros').on('click','a',function(event){
        event.preventDefault();
        pagina_RegistroGeneral = $(this).attr('href').replace('/','');
        bolPagina = true;
        paginacion_RegistrosGenerales();
     });

//---- Script para el Modal
     $('#myModalRegistroGeneral').on('shown', function () {
     	  $('#txtNombre').focus();
     });

     $('#myModal').on('hidden', function () {
     	 fnNuevoRegistroGeneral();
     });

     $("#txtApePaterno,#txtApeMaterno,#txtNombre").blur(paginacion_RegistrosGenerales);

	   $("#btnGuardarRegistroGeneral").click(fnGuardarRegistroGeneral);
     $("#btnNuevo").click(fnNuevo);

     //---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmRegistroAcceso');    
     fnGeneralForm('#frmRegistroGeneral');   
     cmbPrivada_set();
     fnHabilitarFormulario(false);
     //paginacion();
  });

//Codigo Cronometro 
var CronoID = null;
var CronoEjecutandose = false;
var decimas, segundos, minutos; 
  
function DetenerCrono (){  
    if(CronoEjecutandose);
        clearTimeout(CronoID);
    CronoEjecutandose = false;
}  
  
function InicializarCrono () {  
    decimas = 0;
    segundos = 0;
    minutos = 0;
    $("#lblCrono").html('00:00:0');
}  
  
function MostrarCrono () {  
    decimas++;
    if ( decimas > 9 ) {  
        decimas = 0;
        segundos++;
        if ( segundos > 59 ) {  
            segundos = 0;
            minutos++;
            if ( minutos > 99 ) {  
                alert('Fin de la cuenta');
                DetenerCrono();
                return true;
            }  
        }  
    }  

    var ValorCrono = "";
    ValorCrono = (minutos < 10) ? "0" + minutos : minutos;
    ValorCrono += (segundos < 10) ? ":0" + segundos : ":" + segundos;
    ValorCrono += ":" + decimas;
              
    $("#lblCrono").html(ValorCrono);
  
    CronoID = setTimeout("MostrarCrono()", 100);
    CronoEjecutandose = true;
    return true;
}  
  
function IniciarCrono () {  
    DetenerCrono();
    InicializarCrono();
    MostrarCrono();
}  
  
//function ObtenerParcial() {  
//  document.crono.parcial.value = document.crono.display.value  
//}  

</script> 