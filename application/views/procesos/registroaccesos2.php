 <!--Descargar un Canvas a una imagen con HTML5
  Esta página de un amigo es la mejor referencia acerca de GD que puedo darte:
  http://www.sargentoweb.com/php_gd/

  http://stackoverflow.com/questions/20996421/how-to-convert-div-content-into-image-in-php


  http://stackoverflow.com/questions/13252773/converting-contents-of-a-div-into-an-image

  http://ca.php.net/manual/es/book.image.php
  http://jsfiddle.net/8ypxW/3/

  http://jsfiddle.net/roimergarcia/xxV2W/

http://www.lawebdelprogramador.com/foros/JQuery/1434785-Camara-web-Guardar-Imagen.html

http://www.lawebdelprogramador.com/foros/JQuery/1434785-Camara-web-Guardar-Imagen.html

http://www.returngis.net/2013/06/enviar-imagenes-desde-html-5-canvas-a-servidor/
  

http://base64.wutils.com/encoding-online/

http://blog.unijimpe.net/forzar-descarga-con-php/

http://www.taringa.net/posts/info/11562306/Recurso-Forzar-descarga-de-imagenes-en-HTML.html

revisar 
Enviar y guardar foto en el servidor
https://github.com/gestech/HayCultura/blob/master/index.html
  -->
<?php 
if(isset($_POST['x']) && !empty($_POST['x'])){
    $file=base64_decode($_POST['x']);
    $ctype="image/png";
    header("Pragma: public"); 
    header("Expires: 0"); 
    header("Cache-Control: must-revalidate, post-check=0, pre-check=0"); 
    header("Cache-Control: private",false);
    header("Content-Type: $ctype"); 
    header("Content-Disposition: attachment; filename=\"archivo.png\";" ); 
    header("Content-Transfer-Encoding: binary"); 
    header("Content-Length: ".strlen($file))/1024; 
    echo $file;
    exit;
}
?>
<form id="frmRegistroAcceso" action="#" method="post" onsubmit="return(false)" autocomplete="off" style="margin-bottom:0px;">
  <input id="txtRegistroAccesoID" type="hidden" value="">
  <!-- Campo oculto que se utiliza para asignar la url (concatenada) que corresponde al alias del dns seleccionado -->
  <input id="txtURLDNS" type="hidden" value="">
  <!-- Campo oculto que se utiliza para asignar el id del dns seleccionado -->
  <input id="txtDNSID" type="hidden" value="">
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
			<a id="btnActivacionRelays" type="button" class="btn btn-inverse"><i class="icon-retweet icon-white"></i> Relays</a>                                             
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
          <div class="input-append" style="display:inline-block;"
             id ="txtPrivadaPop"
             data-toggle="popover"
             data-placement="right"
             data-html="true" 
             data-content=""
             data-trigger="manual">
            <select id="cmbPrivadaID"  name="cmbPrivadaID" style="width:339px;"  tabindex="1"  onChange="cmbDNS_set();"></select>
        </div>
			  
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
    <!--VIDEOS DE LA PRIVADA-->
    <div>
          <label for="cmbVideos">Video</label>
          <select id="cmbVideos" name="cmbVideos" style="width:360px;"  tabindex="4"></select>
    </div>
    
   <!-- Div que se utiliza para mostrar el video de la privada -->
    <div id="divVideoPriv">   
    </div>

    <br>
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
  <div> 

</form>


 <script id="plantilla_privadas" type="text/template"> 
  <option value="0" selected>[ Seleccionar Privada ]</option>
  {{#privadas}}
    <option value="{{value}}">{{nombre}}</option>
  {{/privadas}} 
</script>

 <script id="plantilla_DNS" type="text/template"> 
  {{#dns}}
    <option id="opDNS1" value="{{dns1_id}}|{{dns1}}|{{puerto1}}">{{alias1}}</option>
    <option id="opDNS2" value="{{dns2_id}}|{{dns2}}|{{puerto2}}">{{alias2}}</option>
    <option id="opDNS3" value="{{dns3_id}}|{{dns3}}|{{puerto3}}">{{alias3}}</option>
  {{/dns}} 
</script>


<script id="plantilla_Videos" type="text/template"> 
  {{#video}}
    <option id="opVideo1" value="{{video1}}">{{alias1}}</option>
    <option id="opVideo2" value="{{video2}}">{{alias2}}</option>
    <option id="opVideo3" value="{{video3}}">{{alias3}}</option>
  {{/video}} 
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
    <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtRegistroGeneralID','registros_generales');"><i class="icon-calendar"></i> Historial</button>
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
//http://www.comolohago.cl/como-anadir-campos-a-un-formulario-dinamicamente/
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



  //Variable que se utiliza para concatenar los indices de los combobox de tiempo de activacion seleccionados
  var strIndices='';
  var strIndices2='';
  //Variable que se utiliza para concatenar los indices de los combobox de tiempo de activacion y el número de veces
  //que se realiza el registro de activación de relays en la bd 
  var strIndicesContador='';
  var strIndicesContador2='';
  //Variable que se utiliza para concatenar las descripciones de los combobox de tiempo de activacion seleccionados
  var strValoresTiempos='';
  var strValoresTiempos2='';
  function fnLimpiarVariables()
  {
    strIndices='';
    strIndices2='';
    strIndicesContador='';
    strIndicesContador2='';
    strValoresTiempos='';
    strValoresTiempos2='';
  }

//--------- Funciones para el Modal Registro General
  function fnNuevo(){
    fnLimpiarVariables();
    bolProcesando = false;
    $("#divMensajes").html('');
    $('#txtRegistroAccesoID').val('');
    $('#txtResidenciaID').val('');
    $('#txtResidencia').val('');
    $('#txtURLDNS').val('');
    $('#txtDNSID').val('');
    $('#txtIndiceTiempoActivacion').val('');
    $('#txtIndiceTiempoCierre').val('');
    $('#txtValidarActivacion').val('');
    $("#txtContadorTiempoActivacion").val('');
    $("#txtDescripcionTiempoActivacion").val('');
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
    $('#txtPrivadaPop').attr('data-content','');
    $('#txtResidenciaPop').popover('hide');
    $('#txtSolicitantePop').popover('hide');
    $('#txtPrivadaPop').popover('hide');
    fnHabilitarFormulario(true);
    $('#cmbPrivadaID').focus();
    IniciarCrono();
    //seleccionar el indice 0 de los combobox para la activación de relays
    $('#cmbDNSID').val(0);
    //Ocultar el div que contiene los relays de la privada
    $("#divActivacionRelays").css({'visibility': 'hidden'}); 
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
                      $('#txtPrivadaPop').popover('hide');
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
                    console.log(data.id);
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
                    //Cargar los dns que pertenecen a la privada
                     cmbDNS_set();
                  }
                  ,'json');
  }


 //Carga los DNS de la privada seleccionada
  function cmbDNS_set(){
    $.post('catalogos/privadas/opcionesDNS',
                  {
                    intPrivadaID:$('#cmbPrivadaID').val()
                  },
                  function(data) {
                    $('#cmbDNSID').empty();
                    var temp = Mustache.render($('#plantilla_DNS').html(),data);
                    $('#cmbDNSID').html(temp);
                  }
                  ,'json');

     $.post('catalogos/privadas/opcionesVideos',
                  {
                    intPrivadaID:$('#cmbPrivadaID').val()
                  },
                  function(data) {
                    $('#cmbVideos').empty();
                    var temp = Mustache.render($('#plantilla_Videos').html(),data);
                    $('#cmbVideos').html(temp);
                    fnMostrarVideo();
                  }
                  ,'json');              
  }



 //Función que se utiliza para mostrar el video seleccionado
  function fnMostrarVideo(){
    //Variable que se utiliza para recuperar la descripción (alias del video)
    // de la opción del combobox seleccionada
    var strAlias='';
    //Quitar Video
    $('#divVideoPriv').empty();
    //Asignar la descripción de la opción seleccionada
    strAlias=$("#cmbVideos option:selected").html();

    //Si el alias es diferente de cadena vacia y diferente de indefinido
    if(strAlias!='' && strAlias!=undefined)
    {
      //Cargar Video seleccionado
       //$('#divVideoPriv').append('<img id="imgCamara" src="<? echo base_url(); ?>uploads/Desert.jpg" width="350" height="500"/>');
                         

      $('#divVideoPriv').append('<img id="imgCamara" src="'+$('#cmbVideos').val()+'" height="360" width="360"/>');

    }
  }

  function imprSelec(nombre)
  {
    var ficha = document.getElementById(nombre);
    var ventimp = window.open(' ', 'popimpr');
    ventimp.document.write( ficha.innerHTML );
    ventimp.document.close();
    ventimp.print( );
    ventimp.close();
  }
  //Carga los Residentes y visitantes de la Residencia
  function fnLoadResVis(item){
    //Separar la cadena concatenada para recuperar el id de la residencia 
    //seleccionada ejemplo:1_N--donde 1-corresponde al id de la residencia y 
    //N-Al tipo de autocomplete nro de casa
    var strResidencia=item.split('_');
    //Asignar el valor del id seleccionado
    var intResidenciaID=strResidencia[0];
    //Si existe id de la residencia mostrar la paginación de los visitantes y residentes
    //también mostrar la información de la residencia seleccionada
  	if (intResidenciaID!="") {
      load_info_Residencia(intResidenciaID);
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

  function load_info_Privada(id){
     $.post('catalogos/privadas/info_privada',
                  {intPrivadaID:id},
                  function(data) {
                    if(data){
                      strPop = '';
                      if(data.estado != '')
                      {
                         strPop = "<FONT SIZE=4><b>Estado: </b>" + data.estado +"<br>";
                      }
                      if(data.observaciones != "")
                      {
                         strPop += "<b>Notas: </b>" + data.observaciones +"<br></font>";
                      }
                      /*Agregar boton para cerrar popup*/
                      strPop += "<input type='button' value='Cerrar' onclick='cerrarPopUpPrivada();' style='float:right;' />";
                      strPop += "</br>";
                      $('#txtPrivadaPop').attr('data-content',strPop);
                      $('#txtPrivadaPop').popover('show');
                    }
                  }
                  ,'json');
  }
  //función que permite cerrar el popup de la privada
  function cerrarPopUpPrivada(){
    $('#txtPrivadaPop').popover('hide');
  }

  function load_info_Solicitante(item){
     $.post('procesos/registroaccesos/info_Solicitante',
                  {strSolicitanteID:item.data},
                  function(data) {
                    console.log(data);
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


 //---------Agregar Campos (Relays del DNS seleccionado) dinamicamente
 function fnAgregarRelaysDNS(strDetallesRenglones,strDetallesRelays, strDetallesConceptos,strDetallesEstados,strDetallesTiempos){
      //Asignar a la variable la cadena concatenada con los renglones del DNS
      //separa los renglones con '|' (por cada renglon)
      // ejemplo:1|2|3...
      //Separar la cadena 
       var strRenglones = strDetallesRenglones.split('|');
      //Asignar a la variable la cadena concatenada con los conceptos del DNS
      //separa los conceptos con '|' (por cada renglon)
      // ejemplo:Bajar Pluma|Automotriz|Subir Pluma...
      //Separar la cadena 
       var strConceptos = strDetallesConceptos.split('|');
       //Asignar a la variable la cadena concatenada con los relays del DNS
      //separa los conceptos con '|' (por cada renglon)
      // ejemplo:1,2,3|5,7|17...
      //Separar la cadena 
       var strRelays = strDetallesRelays.split('|');
      //Asignar a la variable la cadena concatenada con los estados del DNS
      //separa los estados con '|' (por cada renglon)  ejemplo:Encendido|Apagado|Encendido...
      //Separar la cadena 
       var strEstados = strDetallesEstados.split('|');
       //Asignar a la variable la cadena concatenada con los tiempos del DNS
      //separa los tiempos con '|' (por cada renglon)
      // ejemplo:5 segundod|2 minutos|indefinido...
      //Separar la cadena 
       var strTiemposActivacion= strDetallesTiempos.split('|');
       //Variable que se utiliza para cambiar el estado del relay dependiendo del estado
       //recuperado si el estado es encendido el estado del relay se cambiara a apagado (asignar el valor 0),
       //de lo contrario se cambiara a encendido (asignar el valor1)
       var intEstadoRelay=0;
       //Hacer recorrido para agregar botones por concepto
       for (var intCont=0; intCont < strRenglones.length; intCont++) {
          //Variable (clase) que se utiliza  para definir el color del botón
           var strClase="";

           /*if(strRelays[intCont]=='17')
           {
            alert('hola');

           }*/
          //Dependiendo del estado del relays cambiar el color del botón 
          //Activo (1) será Rojo e Inactivo(0) será verde
          /* if(strEstados[intCont]=='Activo')
           {
             //Definir color rojo
             strClase='btn btn-danger';
             //Se cambiara el estado del relays a inactivo
             intEstadoRelay=0;
           }
           else //Inactivo
           { 
            //Definir color verde
             strClase='btn btn-success';
            //Se cambiara el estado del relays a activo
             intEstadoRelay=1;

           }*/
          strClase='btn btn-default';
          //Dependiendo del tiempo de activación actual del relays cambiar las opciones a mostrar en 
          //el combobox
           var strOpcionesTiempo='';
           if(strTiemposActivacion[intCont]=='Indefinido')
           {
             //Se cambiara las opciones del tiempo a mostrar 
             strOpcionesTiempo='<option>5 segundos </option> <option>2 minutos</option></select>';
            
           }
           else if(strTiemposActivacion[intCont]=='5 segundos')
           {
             //Se cambiara las opciones del tiempo a mostrar 
             strOpcionesTiempo='<option>2 minutos </option> <option value=indefinido>Indefinido</option></select>';
           }
           else
           {
              //Se cambiara las opciones del tiempo a mostrar 
              strOpcionesTiempo='<option>5 segundos </option> <option value=indefinido>Indefinido</option></select>';
           }

          
           //Agregar campos en la tabla
            var NvoCampo= document.createElement("div");
            NvoCampo.id= "divcampo_"+(intCont);
            //Si el relays es 17
            if(strRelays[intCont]=='17')
            {
              //Agregar Campos
              NvoCampo.innerHTML= 
                 "<table >" +
                 "   <tr>" +
                 "     <td>" +
                 "        <input type='button' class='"+strClase + "' style='width:380px; height:30px;margin-bottom:5px;'  name='intRelay_" + intCont + 
                           "' id='btnRelay_" + intCont+ "'  onclick='fnAbrirVentanaRelay("+strRenglones[intCont]+
                           ','+intCont+" )"+"'value="+strConceptos[intCont]+">" +
                 "   </tr>" +
                 "</table>";
            }
            else
            {
              //Agregar Campos
              NvoCampo.innerHTML= 
                 "<table >" +
                 "   <tr>" +
                 "     <td>" +
                 "        <input type='button'  class='"+strClase + "' style='width:380px; height:30px;margin-bottom:5px;'  name='intRelay_" + intCont + 
                           "' id='btnRelay_" + intCont+ "'  onclick='fnAbrirVentanaRelay("+strRenglones[intCont]+
                           ','+intCont+" )"+"'value='"+strConceptos[intCont]+"'>" +
                 "     </td>" +
                 "     </td><td class='tdBlanco'></td>" +
                 "     <td>" +        
                 "          <select id='cmbTiempoActivacionRelays_"+intCont+ "'style='width:112px;margin-bottom:5px;'>" +
                 "          <option value='"+strTiemposActivacion[intCont]+"'>" +strTiemposActivacion[intCont]+ "</option>" +
                            strOpcionesTiempo+
                 "     </td>" +
                 "     </td><td class='tdBlanco'></td>" +
                 "     <td>" +        
                 "          <select id='cmbEstadoRelays_"+intCont+ "'style='width:90px;margin-bottom:5px;'>" +
                 "          <option value='1'>Activo</option>" +
                 "          <option value='0'>Inactivo</option>"+
                 
                 "     </td>" +
                 
                 "   </tr>" +
                 "</table>";

            }
            

            var contenedor= document.getElementById("divContenedorCampos");
            contenedor.appendChild(NvoCampo);

      }//cerrar for 

      //En caso de que se haya seleccionado tiempo de activación para los relays 
      //deshabilitar el combobox en caso de que el tiempo seleccionado sea diferente de indefinido
    /*  if( $('#txtIndiceTiempoActivacion').val()!='' && $("#txtValidarActivacion").val()=='1')
      {

          
          //Asignar valores para habilitar y deshabilitar el botón del relays
          var strIndicesTiempo = $('#txtIndiceTiempoActivacion').val(); 

        //  alert('strIndicesTiempo '+strIndicesTiempo);
          var strDescripcionTiempo = $('#txtDescripcionTiempoActivacion').val();
          var strTiempoCierreHabilitar= $('#txtIndiceTiempoCierre').val(); 
          //alert('el tiempo es '+strTiempoCierreHabilitar);
          //Cadena concatenada con el id del boton y el indice a cambiar
          var strBotonRelayID="#btnRelay_"+strIndicesTiempo;
          //Deshabilitar el control (boton de relays)
         // $(strBotonRelayID).attr('disabled','-;1');
          //Si el tiempo de activacion es de 5 segundos
          if(strDescripcionTiempo=='5 segundos' && strTiempoCierreHabilitar!='5000')
          {
             strTiempoCierreHabilitar=parseInt(strTiempoCierreHabilitar)*2;
          }
          //Habilitar botón después de hacer cambio de relays
          setTimeout( function() {$(strBotonRelayID).removeAttr('disabled');}, strTiempoCierreHabilitar);
          $("#txtValidarActivacion").val('');
           strIndices='';
      }*/

  }

  //Función que se utiliza para abrir ventanas emergentes por relays del concepto seleccionado
  function fnAbrirVentanaRelay(intRenglon,intIndice){
     var strRelaysConcepto='';
     var strRelaysSel='';
       //Regresar relays que le pertenecen al renglon seleccionado
       $.ajax('catalogos/privadasrelays/regresarRelaysPorRenglon',{
                          "type" : "post",
                          "data": {intPrivadaID:$("#cmbPrivadaID").val(),
                                   intDNSID: $("#txtDNSID").val(),
                                   intRenglonID: intRenglon,
                                  },
                          success: function(data){
                            //Si se recuperaron los relays
                            if(data.row)
                            {
                              strRelaysConcepto=data.row.relays;
                               //Variable que se utiliza para recuperar los relays del concepto seleccionado
                               strRelaysSel=strRelaysConcepto;
                               //Reemplazar , por |, para identificar que es mas de un relay (ejemplo:8.9 a 8|9),
                               //se abrirá una ventana por cada relay 
                               strRelaysConcepto=replaceAll(strRelaysConcepto, ",", "|" );
                              
                              
                            } 
                          },
                          "async": false,});

     
      //Variable que se utiliza para saber el número de relays a modificar
      var intNumeroRelays=0;
      //Verificar si la cadena tiene caracter |,y así poder separar la cadena
      if(fnBuscaCarater(strRelaysConcepto)==false){
        intNumeroRelays=1;
        
      }
      else
      {
        //Separa la cadena quita '|' (por cada relays)  ejemplo:1|2|3...
        strRelaysConcepto = strRelaysConcepto.split('|');
        //Asignar el número de relays (ejemplo:8|9 son 2)
        intNumeroRelays=strRelaysConcepto.length;
       
        
      }
     
      //Cadena concatenada con el id del boton y el indice seleccionado
      var strBotonRelayID="#btnRelay_"+intIndice;
      //Deshabilitar el control (boton de relays)
     // $(strBotonRelayID).attr('disabled','-1');
      //Cadena concatenada con el id del combobox (tiempo de activación del Relays)y el indice seleccionado
      var strComboboxID="#cmbTiempoActivacionRelays_"+intIndice;
      //Asignar el valor del  tiempo de activación seleccionado
      var strValor=$(strComboboxID).val();
       //Cadena concatenada con el id del combobox (estado del Relays) y el indice seleccionado
      var strComboboxEstadoID="#cmbEstadoRelays_"+intIndice;
      //Asignar el valor del estado del relay seleccionado
      var intEstadoRelay=$(strComboboxEstadoID).val();

      //Varible que se utiliza para asignar el tiempo en milisegundos dependiendo de la opción seleccionada
      var strTiempoActivacion='';//Si el tiempo seleccionado es Indefinido el valor de la variable sera cadena vacia
      var strTiempoCerrar='';
      //Si el tiempo seleccionado es 2 minutos cambiar el valor del tiempo
      //de activación a 120000 milisegundos
      if(strValor=='2 minutos' )
      { 
          strTiempoActivacion='120000';
         // strTiempoCerrar='120000';

      }
      else if(strValor=='5 segundos')//Si el tiempo seleccionado es 5 segundos
      {
            //Cambiar el valor del tiempo de activación a 5000 milisegundos
            strTiempoActivacion='5000';
           // strTiempoCerrar='5000';
           /* //Incrementar tiempo para encender todos los relays
            var intTiempoActivacion=intNumeroRelays*3000;
          
            //Comparar tiempo cierre con tiempo de activación
            if(parseInt(strTiempoCerrar)<intTiempoActivacion)
            {
              strTiempoCerrar=String(intTiempoActivacion);
            }*/

      }

      //  
      if(strTiempoActivacion!='')
      {
         //Abrir pagina registroaccesosRelays para continuar con el proceso de activación del relays seleccionado
     
          //PRUEBAS 
          // Definimos un array con los valores para la activación del relays desde otra pagina (esto con el 
          //fin de seguir con el proceso cuando se cambie de privada)
          var strDatos = $('#cmbPrivadaID').val()+'%'+$("#cmbPrivadaID option:selected").html()+'%'+
                          $('#txtResidenciaID').val()+'%'+$('#txtResidencia').val()+'%'+$('#txtSolicitanteID').val()+'%'+
                          $('#txtSolicitante').val()+'%'+$('#txtDNSID').val()+'%'+$('#cmbDNSID option:selected').html()+'%'+$('#cmbDNSID').val();
          
          //Variable que se utiliza para el nombre de la ventana principal (Activación de Relays)
          var strVentanaPrincipal="principal"+intRenglon+$('#cmbPrivadaID').val()+$('#txtDNSID').val();
         
          //Variable que se utiliza para concatenar los datos del relays seleccionado
          var strDatosRelays=intRenglon+'%'+intIndice+'%'+strValor+'%'+intEstadoRelay;
         
          //Variable que se utiliza para asignar la url de  activación de relays
          strUrlPrueba="<? echo base_url(); ?>procesos/registroaccesosRelays?strDatos="+strDatos+"&strDatosRelays="+strDatosRelays+"&strVentanaPrincipal="+strVentanaPrincipal;
          
          //Abrir ventana registro de activación de relays y continuar con el proceso de activación
          // window.open(strUrlPrueba,strVentanaPrincipal, "location=no,menubar=no,titlebar=no,resizable=no,toolbar=no, menubar=no,width=500,height=500")
          mywindow=eval(strVentanaPrincipal+ "=window.open(strUrlPrueba,strVentanaPrincipal,'width=500,height=500,top=1800px,left=1500px,location=no,resizable=no')")
        
      
      }
      else
      {
         //Variable que se utiliza para saber cuantas veces se abriran las ventanas emergentes
          //y asi poder modificar el estado del relays (dependiendo del tiempo seleccionado), 
          //en caso de que el tiempo sea diferente de indefinido se abrirán dos veces, 
          //debido a que se cambiara el estado por un determinado tiempo;por ejemplo:si seleccionamos
          //2 minutos y el estado actual del relays es apagado,la primera vez que se abran las ventanas
          //se cambiara el estado a encendido y cuando hayan transcurrido los 2 minutos volveran a apagado.
          //Hacer llamada a la función  fnActivarRelays para cambiar estado de relays
          fnActivarRelays(intRenglon,strRelaysSel,intNumeroRelays,strRelaysConcepto,intEstadoRelay,strTiempoActivacion,intIndice,1);


      }

      //Si el estado del relay es 0-Apagado cambiarlo a 1-Activo
      if(intEstadoRelay==0) 
      {  
        //Cambiar estado a Activo
        intEstadoRelay=1;
          
      }
      else
      {
        //Cambiar estado a Inactivo
        intEstadoRelay=0;
      }
     
     /* //Si el tiempo seleccionado es diferente de indefinido(cadena vacia), realizar llamada a la función fnActivarRelays
      //para modificar el estado del relays
      if(strTiempoActivacion!='' && $("#txtValidarActivacion").val()=='1')
      {
        
        //Hacer llamada al método para cambiar de nuevo el estado del relays
        //dependiendo del tiempo seleccionado (despúes de que se cierra la ventana)
        setTimeout( function() {fnActivarRelays(intRenglon,strRelaysSel,intNumeroRelays,strRelaysConcepto,intEstadoRelay,strTiempoActivacion,intIndice,2);},  strTiempoCerrar);  
      
       
      }*/
    
      //Asignar valor del tiempo de cierre
      //$('#txtIndiceTiempoCierre').val(strTiempoCerrar);
     
  }  
 var intContR=0;

  //Función que se utiliza para cambiar el estado del relay seleccionado (por medio de la  url)
  function fnActivarRelays(intRenglon,strRelaysSel,intNumeroRelays,strRelaysConcepto,intEstadoRelay,strTiempoActivacion,intIndice,intNumeroVeces)
  {
      //Si el tiempo seleccionado es de 120000 milisegundos cambiar el valor del tiempo
      //de activación a 2 minutos  y de esta manera poder registrarlo en la bd
      if(strTiempoActivacion=='120000')
      { 
          strTiempoActivacion='2 minutos';

      }
      else if(strTiempoActivacion=='5000')//Si el tiempo seleccionado es  5000 milisegundos 
      {
            //Cambiar el valor del tiempo de activación a 5 segundos y de esta manera poder registrarlo en la bd
            strTiempoActivacion='5 segundos';
            
          
      }
      else
      {
         //Cambiar el valor del tiempo de activación a Indefinido  y de esta manera poder registrarlo en la bd
          strTiempoActivacion='Indefinido';
      }

      //Variable que se utiliza para crear la url y cambiar el estado del relay
      var strUrl="";
      //Cambiar el valor de la activación a 1 para poder hacer (de nuevo) la llamada  al metodo 
      //en caso de que el tiempo seleccionado sea diferente de Indefinido
      $("#txtValidarActivacion").val('1');
      //Variables que se utilizan para calcular el tiempo de carga (de la pagina)
      var  intSegundos=0;
      var intCont=0;
      var  dteInicio = new Date;
      //Si el número de relays es mas de uno
      if(intNumeroRelays>1)
      {

          //Llamar función para abrir ventana por relays y cambiar su estado 
          //cada 3 seg
          fnVentana(strRelaysConcepto,intEstadoRelay,intCont,intNumeroRelays);
          var dteFin = new Date;
          intSegundos = (dteFin-dteInicio)/1000;
      }
      else
      {
          //Si el número de relays es el 17 (apagar todos)
          //cambiar el estatus a 0 (siempre para indicar el apagado de todos
          //los relays)
          if(strRelaysConcepto=='17')
          {
            intEstadoRelay=0;
         
          }
          //Si el número de relays por concepto es 1
          //cambiar la url y enviar como parametro el id de un relay
          //Concatenar dns con los parametros a enviar por url 
          //(y asi poder cambiar el estado del relay)
          strUrl=$("#txtURLDNS").val()+"?relay="+strRelaysConcepto+";st="+intEstadoRelay+"";
          //var url="http://videoaccesos5.sytes.net:9999?relay="+id+";st="+intEstadoRelay+"";
          eval('ventana'+ intCont + "=window.open(strUrl,'ventana'+intCont,'width=120px,height=80px,top=1800px,left=1500px,location=no,resizable=no')")

          //Calcular el tiempo en que se carga la pagina que contiene los relay
          var dteFin1 = new Date;
          intSegundos = (dteFin1-dteInicio)/1000;
          //Cerrar ventana(s) en 2 segundos después de que se cargo la página (para que se realicen los cambios sin inconvenientes) 
          setTimeout( function() {fnCerrarVentanas(1)}, 2000);
         
      }
      
      //Si se cargo la pagina de relay
      if(intSegundos>0)
      {       
           //Si el número de relays es el 17 (apagar todos los relay)
           //cambiar el estatus a 0 (siempre para indicar el apagado de todos
           //los relays)
           if(strRelaysConcepto=='17')
           {
             intEstadoRelay=0;//Para ponerlo siempre en rojo (esto con el fin de indicarle
              //al usuario que los relays estan encendidos y se necesitan apagar)
         
            }
              //Cerrar ventana(s) en 2 segundos después de que se cargo la página (para que se realicen los cambios sin inconvenientes) 
              setTimeout( function() { 
                                         //Función que se utiliza para guardar la activación del relays
                                          $.ajax('catalogos/relaysactivacion/guardar',{
                                            "type" : "post",
                                            "data": {intPrivadaID:$("#cmbPrivadaID").val(),
                                                     intDNSID: $("#txtDNSID").val(),
                                                     intRenglonID: intRenglon,
                                                     strRelays:strRelaysSel,
                                                     strEstado:intEstadoRelay,
                                                     strTiempo:strTiempoActivacion
                                                     },
                                            beforeSend: function () {
                                              $("#divMensajes").html("Procesando, espere por favor...");
                                            },
                                            success: function(data){
                                              //Si los datos se guardaron correctamente
                                              if(data.resultado==1)
                                              {
                                                  //Borrar contenido del div al cambiar de DNS
                                                  document.getElementById("divContenedorCampos").innerHTML="";
                            
                                                 //Dar clic al boton activación de relays (para mostar los cambios realizados)
                                                 document.getElementById('btnActivacionRelays').click();
                                                
                                                 
                                              }
                                             
                                              $("#divMensajes").html(data.mensajes);
                                            },
                                            "async": false,
                                          });}, 2000); 

            if(strTiempoActivacion!='Indefinido')
            {
                //Cadena concatenada con el id del combobox y el indice seleccionado
                var strComboboxID="#cmbTiempoActivacionRelays_"+intIndice;
                var strDescripcionCombobox=$(strComboboxID+" option:selected").html();
               
                strIndices=strIndices+intIndice+'|';


                //Asignar valores 
                $('#txtDescripcionTiempoActivacion').val(strDescripcionCombobox);
                $('#txtIndiceTiempoActivacion').val(intIndice);
                
            }    
             
             
      }

  }
  //Variable que se utiliza para verificar si los contadores son diferentes
  //y cerrar la ventana actual de un relay y abrir otra
  var intContadorA=0;
  //Función que se utiliza para abrir ventana de relays y poder cambiar el estatus
  //Se utiliza cuando son mas de uno
  function fnVentana(strRelaysConcepto,intEstadoRelay,intCont,intNumeroRelays)
  {
   // alert('emsnas'+intNumeroRelays);
     //Si es mas de un relay cambiar la url y enviar como parametro el indice(id) del relay
     strUrl=$("#txtURLDNS").val()+"?relay="+strRelaysConcepto[intCont]+";st="+intEstadoRelay+"";
    //Abrir ventana emergente para pasar los valores del relay por url, de esta manera se accedera a la pagina
    //que contiene los relay y se cambiara el estado
    //var url="http://videoaccesos5.sytes.net:9999?relay="+id+";st="+intEstadoRelay+"";
    eval('ventana'+ intCont + "=window.open(strUrl,'ventana'+intCont,'width=120px,height=80px,top=1800px,left=1500px,location=no,resizable=no')")
    


    //Cerrar ventana de un  relays y abrir ventana para otro despues de 2 segundos
    setTimeout(function() {fnCerrarVentanas(intCont+1);intCont++;
               if(intContadorA<intCont && intCont<intNumeroRelays)
                {
                  //Abrir ventana para cambiar el estatus del siguiente relays
                  fnVentana(strRelaysConcepto,intEstadoRelay,intCont,intNumeroRelays);
                }}, 3000);
     
  }
  //Función que se utiliza para cerrar una o varias ventanas (emergentes) al mismo tiempo
  function fnCerrarVentanas(intCont)
  {
    //Hacer recorrido para cerrar las ventanas
    for(m=0;m<intCont;m++)
      {
      if(eval('ventana' + m))
        {
        eval('ventana' + m + ".close()")
        }
      }
    //Cambiar el valor a cero (para reiniciar contador)
    intCont=0
  }
 //Función que se utiliza para buscar carater | en la cadena de texto
  function fnBuscaCarater(texto)
  {
    //Hacer recorrido para buscar caracter en la cadena
    for(i=0;i<texto.length;i++)
    {
      //Si se encuentra | regresa true, de lo contrario regresa false.
      if(texto.charAt(i)=="|") return true;
    }
    return false;

  }
  //Función que se utiliza para reemplazar caracteres
  function replaceAll( text, busca, reemplaza ){
       while (text.toString().indexOf(busca) != -1)
         text = text.toString().replace(busca,reemplaza);
       return text;

  }






  
  $( document ).ready(function() {
    //Evento que se utiliza para realizar ping del dns y saber si esta activo o no
      $("#btnActivacionRelays").click(function(event){
       
       //Si el id de la privada es diferente de 0
        if($("#cmbPrivadaID").val()!=0)
        {  
              //Borrar contenido del div al cambiar de DNS
              document.getElementById("divContenedorCampos").innerHTML="";
              //Separar cadena que contiene los valores del DNS
              var stCadenasDNS=$("#cmbDNSID").val(). split('|');

              //Variables que se utilizan para recuperar el id,el puerto y la descripción del dns seleccionado
              var strPuerto=stCadenasDNS[2];
              //variable que se utiliza para acceder al dns seleccionado, en caso de que se realice ping
              var strURL=stCadenasDNS[1];
              //Asignar el valor de la url
              $("#txtURLDNS").val(strURL+':'+strPuerto);
              //Asignar el valor del id del dns 
              $("#txtDNSID").val(stCadenasDNS[0]);
              //Si DNS es diferente de cadena vacia hacer ping a url
              /*if(strURL!="")
              {   
                  $("#divMensajes").html('Espere un momento por favor, verificando que el DNS este en linea (en caso de que el tiempo de espera exceda los 3 segundos significa que el servidor no ha encontrado nada que coincida con el DNS dado, favor de verificar )...');
                  //Verificar (hacer ping) la url, en caso de que el estatus sea 200, significa que el DNS esta disponible
                  $.ajax({ 
                      url:$("#txtURLDNS").val(), 
                      dataType:'script',  
                      complete: function(e, xhr, settings){
                          if(e.status === 200){
                             //Regresar relays del dns seleccionado
                              $.ajax('procesos/registroaccesos/regresarRelays',{
                                      "type" : "post",
                                      cache:false,
                                      "data": { intPrivadaID:$("#cmbPrivadaID").val(),
                                                intDNSID:$("#txtDNSID").val(),
                                                strDNS: $("#txtURLDNS").val()
                                               },
                                      beforeSend: function () {},
                                      success: function(data){
                                        //Si el resultado es undefined Div con los relays para su activación 
                                        if(data.resultado=='1'){
                                            //Mostrar el div que contiene los relays de la privada
                                            $("#divActivacionRelays").css({'visibility': 'visible'});
                                            //Hacer llamada a la función para agregar los botones de relays
                                            fnAgregarRelaysDNS(data.row.detalles_renglones,data.row.detalles_relays, data.row.detalles_conceptos,data.row.detalles_estados, data.row.detalles_tiempos);
                                         }
                                         $("#divMensajes").html(data.mensajes);
                                      },
                                      "async": true,
                               });
                          }
                      }
                  });//cerrar ajax
              }*/
              if(strURL!="")
              {
                //Regresar relays del dns seleccionado
                $.ajax('procesos/registroaccesos/regresarRelays',{
                        "type" : "post",
                        cache:false,
                        "data": { intPrivadaID:$("#cmbPrivadaID").val(),
                                  intDNSID:$("#txtDNSID").val(),
                                  strDNS: $("#txtURLDNS").val()
                                 },
                        beforeSend: function () {},
                        success: function(data){
                          //Si el resultado es undefined Div con los relays para su activación 
                          if(data.resultado=='1'){
                             //Borrar contenido del div al cambiar de DNS
                              document.getElementById("divContenedorCampos").innerHTML="";
                               //Mostrar el div que contiene los relays de la privada
                              $("#divActivacionRelays").css({'visibility': 'visible'});
                              //Hacer llamada a la función para agregar los botones de relays
                              fnAgregarRelaysDNS(data.row.detalles_renglones,data.row.detalles_relays, data.row.detalles_conceptos,data.row.detalles_estados, data.row.detalles_tiempos);
                           }
                           $("#divMensajes").html(data.mensajes);
                        },
                        "async": true,
                 });

              }
              else
              {
                 $('#divMensajes').html( '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Es necesario seleccionar un DNS!</div>');

              }
             
        }
        else
        {
           $('#divMensajes').html( '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Es necesario seleccionar una privada!</div>');
        }


      });

    $('#txtResidenciaPop').popover();
    $('#txtSolicitantePop').popover();
    $('#txtPrivadaPop').popover();

  	$("#txtPrivada").autocomplete("catalogos/privadas/autocomplete", 
     	 	{ minChars:1,matchSubset:1,matchContains:1,cacheLength:6,onItemSelect:null,selectOnly:0,remoteDataType:"json"} 
     );

  	 $("#txtResidencia").autocomplete("catalogos/residencias/autocomplete", 
        {minChars:1,matchSubset:1,matchContains:1,cacheLength:100,
        onItemSelect: function() {
               fnLoadResVis($('#txtResidenciaID').val()),
               //Llamar funcion para regresar los datos de la residencia seleccionada (autocomplete)
               $.post('catalogos/residencias/regresarPrivada',
                { intResidenciaID:$('#txtResidenciaID').val()
                },
                function(data) {
                  if(data.row){
                    $("#cmbPrivadaID").val(data.row.privada_id);
                    $("#txtResidenciaID").val(data.row.residencia_id);
                    $("#txtResidencia").val(data.row.residencia);
                    load_info_Privada(data.row.privada_id);
                    //Cargar los dns que pertenecen a la privada
                    cmbDNS_set();
                  }
                }
               ,
              'json');
          },selectOnly:0,remoteDataType:"json",extraParams:['#cmbPrivadaID']} 
     );

    $("#txtSolicitante").autocomplete("procesos/registroaccesos/autocompleteSolicitantes", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:100,onItemSelect:load_info_Solicitante,selectOnly:0,remoteDataType:"json",extraParams:['#txtResidenciaID']} 
     );

     //Se utiliza para borrar el contenido del div "divContenedorCampos", cuando se cambia
     //de DNS (quita los botones de los relays)
      $('select[name="cmbDNSID"]').change(function() {
        //Limpiar mensajes y variables correspondientes al DNS
        $("#divMensajes").html('');
        fnLimpiarVariables();
        //Ocultar el div que contiene los relays de la privada
        $("#divActivacionRelays").css({'visibility': 'hidden'}); 
        //Habilitar el boton (Activación de Relays)
        $('#btnActivacionRelays').removeAttr('disabled');
        //Borrar contenido del div al cambiar de DNS
        document.getElementById("divContenedorCampos").innerHTML="";
        //Limpiar las siguientes cajas de texto
        $('#txtIndiceTiempoActivacion').val('');
        $('#txtIndiceTiempoCierre').val('');
        $('#txtValidarActivacion').val('');
       
      });


      //Se utiliza para cargar imagen del video, cuando se cambia
      //de video
      $('select[name="cmbVideos"]').change(function() {
        fnMostrarVideo();
       
      });

      //Se utiliza para cargar los datos de la privada 
      $('select[name="cmbPrivadaID"]').change(function() {
        fnLimpiarVariables();
        //Limpiar los datos de la residencia
        $('#txtResidencia').val('');
        $('#txtResidenciaID').val('');
        $('#txtResidenciaPop').popover('hide');

        //Si se selecciona una privada
        if($('#cmbPrivadaID').val()!=0)
        {
          //Hacer llamado a la función para recuperar las observaciones de la privada
          load_info_Privada($('#cmbPrivadaID').val());

        }
        else //Si la opción es seleccionar todas
        {
          $('#txtPrivadaPop').popover('hide');
        }
        

      });

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
        //Ocultar el div que contiene los relays de la privada
        $("#divRelasyDNS").css({'visibility': 'hidden'}); 
        $("#divActivacionRelays").css({'visibility': 'hidden'});
     });

     $('#myModalRegistroGeneral').on('hidden', function () {
        //Mostrar el div que contiene los relays de la privada
        $("#divRelasyDNS").css({'visibility': 'visible'}); 
        fnNuevoRegistroGeneral();
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
     //Ocultar el div que contiene los relays de la privada
     $("#divActivacionRelays").css({'visibility': 'hidden'}); 
     //Remover clase del div que muestra el apartado de activación de relays  
     $("#divRelasyDNS").removeClass("no-mostrar");

      
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


