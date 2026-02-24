
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
      <div style="float:right;margin-right:10px;"><strong id="numElementos"></strong> Encontrados</div>
      <br>
   </div>


<!-- Modal -->
<div id="myModal" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="width: 550px;">
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
        <div style="display:inline-block; padding-right:17px;">
            <label for="dtFechaVencimiento">Fecha Vencimiento</label>
              <div class="input-append datepicker">
                <input id="dtFechaVencimiento" style="width:100px;" data-format="dd-MM-yyyy" type="text" tabindex="5">
                <span class="add-on">
                  <i data-time-icon="icon-time" data-date-icon="icon-calendar" class="icon-calendar"></i>
                </span>
             </div>
        </div>
			<div>
				<label for="txtApePaterno">Contacto</label>
        <input class="span2" id="txtNombre" type="text" placeholder="Nombre(s)" style="display: inline-block; margin-right:15px;" tabindex="6">
				<input class="span2" id="txtApePaterno" type="text" placeholder="Apellido Paterno" style="display: inline-block; margin-right:15px;" tabindex="7">
				<input class="span2" id="txtApeMaterno" type="text" placeholder="Apellido Materno" style="display: inline-block;"  tabindex="8">
			</div>
			<div>
				<div style="display: inline-block; margin-right:15px;">
					<div class="input">
						<select id="cmbTipoContactoID" name="intModificaFechas" class="span2" tabindex="9" >
							<option value="1">Residente</option>
							<option value="2">Externo</option>
						</select>
					</div>
				</div>
				<div style="display: inline-block;">
					<input class="span2" id="txtTelefono" type="text" placeholder="Télefono" style="display: inline-block; margin-right:15px;" tabindex="10">
					<input class="span2" id="txtCelular" type="text" placeholder="Celular" style="display: inline-block;" tabindex="11">
				</div>
			</div>
			<div>
				<input class="span4" id="txtEmail" type="text" placeholder="E-mail" style="display: inline-block;" tabindex="12">
			</div>
			<div>
				<label for="txtContacto">Observaciones</label>
				<textarea class="span6" id="txtObservaciones" type="text" placeholder="Ingresa Observaciones" rows="4" style="display: inline-block; resize: none;" tabindex="13"></textarea>
			</div>

        <!--TABS para los DNS de la privada-->
      <div style="display:inline-block; vertical-align: top; margin-top:15px;">
        <div  class="tabbable"> <!-- Only required for left/right tabs -->
          <ul  class="nav nav-tabs" style="margin-bottom: 5px;">
            <li id="liTab1" class="active"><a href="#tabDNS1" data-toggle="tab" tabindex="14">DNS1  <button class="btn btn-mini" type="button" onClick="paginacionRelays();"><i class="icon-refresh"></i></button></a></li>
            <li id="liTab2" ><a href="#tabDNS2" data-toggle="tab" tabindex="14">DNS2  <button class="btn btn-mini" type="button" onClick="paginacionRelays();"><i class="icon-refresh"></i></button></a></li>
            <li id="liTab3" ><a href="#tabDNS3" data-toggle="tab" tabindex="14">DNS3  <button class="btn btn-mini" type="button" onClick="paginacionRelays();"><i class="icon-refresh"></i></button></a></li>
          </ul>
          <!-- TAB para DNS1 -->
          <div    class="tab-content" style="width:500px">
            <div class="tab-pane active" id="tabDNS1">
               <div style="display: inline-block; margin-right:15px;">
                <!-- Campo oculto que contiene el dns1 anterior (se utiliza para evitar duplicación de dns por privada) -->
                <input type="hidden" id="txtDNS1Anterior" name="strDNS1Anterior" value=""> 
                <label for="txtDNS1">DNS</label>
                <input class="span5" id="txtDNS1" type="text" placeholder="Ingresa DNS" tabindex="15">
               </div>
                &nbsp;&nbsp;&nbsp;
               <div style="display: inline-block;">
                <label for="txtPuerto1">Puerto</label>
                <input style='width:65px;' id="txtPuerto1" type="text" placeholder="Ingresa Puerto" tabindex="16">
               </div>
               <div  style="display: inline-block; ">
                <label for="txtAlias1">Alias</label>
                <input class="span5" id="txtAlias1" type="text" placeholder="Ingresa Alias" tabindex="17">
                     &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <button   style='margin-top:-11px;' id="btnAgregarRelayDNS1" class="btn btn-primary" tabindex="18"><i class="icon-plus icon-white"></i> Relay</button>  
               </div>

              <table class="table table-stripped" id="dgPrivadasRelays">
                <thead>
                    <tr><th>Concepto</th>
                        <th>Relays</th>
                        <!--<th>Estado</th>-->
                        <th width="20px"></th>
                        <th width="20px"></th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
              </table>
               
            </div><!-- CIERRE TAB para DNS1 -->
             <!-- TAB para DNS2 -->
            <div class="tab-pane" id="tabDNS2">
              <div style="display: inline-block; margin-right:15px;">
                <!-- Campo oculto que contiene el dns2 anterior (se utiliza para evitar duplicación de dns por privada) -->
                <input type="hidden" id="txtDNS2Anterior" name="strDNS2Anterior" value=""> 
                <label for="txtDNS2">DNS</label>
                <input class="span5" id="txtDNS2" type="text" placeholder="Ingresa DNS" tabindex="15">
              </div>
               &nbsp;&nbsp;&nbsp;
               <div style="display: inline-block;">
                <label for="txtPuerto2">Puerto</label>
                <input style='width:65px;' id="txtPuerto2" type="text" placeholder="Ingresa Puerto" tabindex="16">
               </div>
               <div  style="display: inline-block; ">
                <label for="txtAlias2">Alias</label>
                <input class="span5" id="txtAlias2" type="text" placeholder="Ingresa Alias" tabindex="17">
                     &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <button   style='margin-top:-11px;' id="btnAgregarRelayDNS2" class="btn btn-primary" tabindex="18"><i class="icon-plus icon-white"></i> Relay</button>  
               </div>
              <table class="table table-stripped" id="dgPrivadasRelays">
                 <thead>
                    <tr><th>Concepto</th>
                        <th>Relays</th>
                         <!--<th>Estado</th>-->
                        <th width="20px"></th>
                        <th width="20px"></th>
                    </tr>
                </thead>
                <tbody>
                </tbody>  
              </table>
            </div>
             <!-- TAB para DNS3 -->
            <div class="tab-pane" id="tabDNS3">
              <div style="display: inline-block; margin-right:15px;">
                <!-- Campo oculto que contiene el dns3 anterior (se utiliza para evitar duplicación de dns por privada) -->
                <input type="hidden" id="txtDNS3Anterior" name="strDNS3Anterior" value=""> 
                <label for="txtDNS3">DNS</label>
                <input class="span5" id="txtDNS3" type="text" placeholder="Ingresa DNS" tabindex="15">
              </div>
               &nbsp;&nbsp;&nbsp;
               <div style="display: inline-block;">
                <label for="txtPuerto3">Puerto</label>
                <input style='width:65px;' id="txtPuerto3" type="text" placeholder="Ingresa Puerto" tabindex="16">
               </div>
               <div  style="display: inline-block; ">
                <label for="txtAlias3">Alias</label>
                <input class="span5" id="txtAlias3" type="text" placeholder="Ingresa Alias" tabindex="17">
                     &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <button   style='margin-top:-11px;' id="btnAgregarRelayDNS3" class="btn btn-primary" tabindex="18"><i class="icon-plus icon-white"></i> Relay</button>  
               </div>

              <table class="table table-stripped" id="dgPrivadasRelays">
                 <thead>
                    <tr><th>Concepto</th>
                        <th>Relays</th>
                        <!--<th>Estado</th>-->
                        <th width="20px"></th>
                        <th width="20px"></th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
               

              </table>
               
            </div>
            <div style="dysplay: inline-block;">
                  <div id="pagLinksRelays"  style="float:left;margin-right:10px;"></div>
                  <div style="float:right;margin-right:10px;"><strong id="numElementosRelays">0</strong> Encontrados</div>
                  <br>
               </div>
          </div><!-- CIERRE DE CONTENEDOR TAB para DNS´S -->
        </div>
      </div>
		</form>
  </div>
  <div class="modal-footer">
	  <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="20">Cancelar</button>
    <button id="btnGuardarPrivada"class="btn btn-primary" tabindex="19" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>
    <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtPrivadaID','privadas');"><i class="icon-calendar"></i> Historial</button>
  </div>
</div>

 <!-- Plantilla para mostrar los relays del DNS seleccionado-->
 <script id="plantilla_Relays" type="text/template">
        {{#rows}}
        <tr> <td>{{concepto}}</td>
            <td>{{relays}}</td>
            <td><a onclick="fnEditarRelays({{renglon}})" class="btn btn-mini" title="Editar"><i class="icon icon-pencil"></i></a></td>
            <td><a onclick="fnEliminarRelays({{renglon}})" class="btn btn-mini" title="Eliminar"><i class="icon icon-trash"></i></a></td>
          </tr>
        {{/rows}}
        {{^rows}}
        <tr> 
          <td colspan="7"> No se Encontraron Resultados!!</td>
        </tr> 
        {{/rows}}
 </script>

<!-- Modal Relay -->
<div id="myModalRelay" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalRelayLabel" aria-hidden="true" style="width: 550px;">
  <div class="modal-header">
  <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="1">×</button>
  <h3 id="myModalRelayLabel">Relays</h3>
  </div>
  <div class="modal-body" style="padding-bottom:5px;">
    <form name="frmRelayPrivadas" id="frmRelayPrivadas" action="#" method="post" onsubmit="return(false)" autocomplete="off" style="margin-bottom:5px;">
          <div style="margin:0 5px 5px 5px;">
                <div id="divMensajesRelays"></div>              
         </div>
           <!-- Campo oculto que contiene el id del dns seleccionado -->
          <input type="hidden" id="txtDNSID" name="intDNSID" value="">
          <!-- Campo oculto que contiene la descripción del dns seleccionado -->
          <input type="hidden" id="txtDNS" name="strDNS" value="">
          <!-- Campo oculto que contiene el número del puerto del dns seleccionado -->
          <input type="hidden" id="txtPuerto" name="strPuerto" value="">
          <!-- Campo oculto que contiene la descripción del alias del dns seleccionado -->
          <input type="hidden" id="txtAlias" name="strAlias" value="">
          <!-- Campo oculto que contiene el id del renglon del relay seleccionado -->
          <input type="hidden" id="txtRenglonID" name="intRenglon" value="">
          <div style="display: inline-block; margin-right:15px;">
            <!-- Campo oculto que contiene el concepto anterior (se utiliza para evitar duplicación de relays por DNS) -->
            <input type="hidden" id="txtConceptoAnterior" name="strConceptoAnterior" value=""> 
            <label for="cmbConcepto">Concepto</label>
            <div class="input">
              <select id="cmbConcepto" name="strConcepto" class="span6" tabindex="19" >
                <option value="Automatización">Automatización</option>
                <option value="Abrir Porton Visitas">Abrir Porton Visitas</option>
                <option value="Abrir Porton Residentes">Abrir Porton Residentes</option>
                <option value="Abrir Porton Salida">Abrir Porton Salida</option>
                <option value="Abrir Pluma Visitas">Abrir Pluma Visitas</option>
                <option value="Abrir Pluma Residentes">Abrir Pluma Residentes</option>
                <option value="Abrir Todas las Puertas">Abrir Todas las Puertas</option>
                <option value="Reiniciar Computadora">Reiniciar Computadora</option>
                <option value="Reiniciar Camaras,Control de Acceso y Frente de Calle">Reiniciar Camaras,Control de Acceso y Frente de Calle</option>
                <option value="Reiniciar Portones y Plumas">Reiniciar Portones y Plumas</option>
                <option value="Reinicio de Frente de Calle">Reinicio de Frente de Calle</option>
                <option value="Reinicio de Control de Acceso">Reinicio de Control de Acceso</option>
                <option value="Abrir Segunda Pluma Residente">Abrir Segunda Pluma Residente</option>
                <option value="Abrir Segunda Pluma Visitas">Abrir Segunda Pluma Visitas</option>
                <option value="Abrir solo Primera Pluma Visitas">Abrir solo Primera Pluma Visitas</option>
                <option value="Definido por Administrador">Definido por Administrador</option>
              </select>
            </div>
          </div>
  
         <div style="display: inline-block; margin-right:15px;">
          <!-- Campo oculto que contiene el relay(o relays) anterior (se utiliza para evitar duplicación de relays por DNS) -->
          <input type="hidden" id="txtRelaysAnterior" name="strRelaysAnterior" value=""> 
          <label for="txtRelays">Relays</label>
          <input class="span6" id="txtRelays" type="text" placeholder="Ingresa Relay's,si es mas de uno separarlos con una coma '1,5'" style="display: inline-block;" tabindex="20" onkeypress="fnValidaSoloNumerico();">
        </div>
        <!--Se comentó por petición del usuario
          <div style="display: inline-block;">
          <label for="cmbEstadoRelay">Estado</label>
          <div class="input">
            <select id="cmbEstadoRelay" class="span2" tabindex="21" >
              <option value="Inactivo">Inactivo</option>
              <option value="Activo">Activo</option>
            </select>
          </div>
      </div>-->
    </form>
  </div>
  <div class="modal-footer">
    <button class="btn"  onclick="fnCerrarModalRelay();" tabindex="22">Cancelar</button>
    <button id="btnGuardarRelays" class="btn btn-primary" tabindex="21" onclick="fnGuardarRelay();"><i class="icon-hdd icon-white"></i> Guardar</button>
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
    //Si no existe privada_id, limpiar los datos del formulario al cerrar el modal
    if($('#txtPrivadaID').val()=="")
    {
      $('#frmPrivadas')[0].reset();
      $('#txtPrivadaID').val('');
     
    }
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
                    strFechaVence: fnInvFecha($('#dtFechaVencimiento').val()),
                    strObservaciones: $('#txtObservaciones').val(),
                    strDNS1:$('#txtDNS1').val(),
                    strPuerto1:$('#txtPuerto1').val(),
                    strAlias1:$('#txtAlias1').val(),
                    strDNS2:$('#txtDNS2').val(),
                    strPuerto2:$('#txtPuerto2').val(),
                    strAlias2:$('#txtAlias2').val(),
                    strDNS3:$('#txtDNS3').val(),
                    strPuerto3:$('#txtPuerto3').val(),
                    strAlias3:$('#txtAlias3').val(),
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
                      $('#dtFechaVencimiento').val(data.row.vence_contrato);
	                    $('#txtObservaciones').val(data.row.observaciones);
                      $('#cmbEstatusID').val(data.row.estatus_id.toString());
                      //Recuperar valor de los dns´s
                      //DNS1
                      $('#txtDNS1').val(data.row.dns_1);
                      $('#txtPuerto1').val(data.row.puerto_1);
                      $('#txtAlias1').val(data.row.alias_1);
                      //DNS2
                      $('#txtDNS2').val(data.row.dns_2);
                      $('#txtPuerto2').val(data.row.puerto_2);
                      $('#txtAlias2').val(data.row.alias_2);
                      //DNS3
                      $('#txtDNS3').val(data.row.dns_3);
                      $('#txtPuerto3').val(data.row.puerto_3);
                      $('#txtAlias3').val(data.row.alias_3);
                      //Recuperar valores para validación (evitar duplicación)
                      $('#txtDNS1Anterior').val(data.row.dns_1);
                      $('#txtDNS2Anterior').val(data.row.dns_2);
                      $('#txtDNS3Anterior').val(data.row.dns_3);
                      //Abrir modal de privadas
                      $('#myModal').modal('show');
                      //Mostrar boton para agregar los relays de la privada
                      $("#btnAgregarRelay").css({'visibility': 'visible'}); 
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

  //Función que se utiliza para modificar los datos del dns de la privada seleccionado
  function fnModificarDNS(){
    if(fnValidar()) {
      $.post('catalogos/privadas/modificarDNSS',
                  { 
                    intPrivadaID: $('#txtPrivadaID').val(), 
                    intDNSID: $("#txtDNSID").val(),
                    strDNS: $("#txtDNS").val(),
                    strPuerto: $("#txtPuerto").val(),
                    strAlias: $("#txtAlias").val()
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.resultado){
                      fnAbrirModalRelay();
                    }
                  }
                 ,
          'json');
    }
  }

 //Función que se utiliza para validar la url 
  function fnValidaURL(url,strCajaID) {
      //Expresion regular para validar url
      var regex=/^(ht|f)tps?:\/\/\w+([\.\-\w]+)?\.([a-z]{2,4}|travel)(:\d{2,5})?(\/.*)?$/i;
      //regex.test(url);
      //Recuperar id de la caja y hacer enfoque en caso de que la url no sea valida
      var focusElementId = strCajaID
      var textBox = document.getElementById(focusElementId);
      //Asignar la ultima posicición de la cadena para verificar si es una diagonal o un asterisco
      var intUltimaPosicion=url.length-1;  
     //Asignar el valor de la última posición para quitarla de la cadena
      var strUltimoValor = url.substring(intUltimaPosicion, url.length);
      //Si el último valor de la cadena es una diagonal o un asterisco quitarla
      if(strUltimoValor=='/'  || strUltimoValor=='*')
      {  //Cortar la cadena
         url = url.substring(0, intUltimaPosicion);
         //Asignar el valor a la caja de texto 
         document.getElementById(strCajaID).value = url;
         //enfocar caja de texto
         textBox.focus();
         //Deshabilitar el boton (Guardar Relays)
         $('#btnGuardarRelays').attr('disabled','-1');
         //Deshabilitar el boton (Guardar Privada)
         $('#btnGuardarPrivada').attr('disabled','-1');
      }
      else
      {
          //Si la url es valida abrir modal para agregar relays
          if(regex.test(url)== false)
          { 
             alert('URL  ' + url +' es invalida, favor de escribirla correctamente por ejemplo: https://www.google.com.mx' );
             textBox.focus();
             //Deshabilitar el boton (Guardar Relays)
             $('#btnGuardarRelays').attr('disabled','-1');
             //Deshabilitar el boton (Guardar Privada)
             $('#btnGuardarPrivada').attr('disabled','-1');
          }
          else
          {
             //Habilitar el boton (Guardar Relays)
             $('#btnGuardarRelays').removeAttr('disabled');
             //Habilitar el boton (Guardar Privada)
             $('#btnGuardarPrivada').removeAttr('disabled');

          }

      }
    
  }

  //Función que se utiliza para validar que el dns no exista en la privada
  function fnValidaDNS(url,strCajaID) {
      //Recuperar id de la caja y hacer enfoque en caso de que la url exista
     var focusElementId = strCajaID;
     //Caja de texto
     var textBox = document.getElementById(focusElementId);
     //Realizar consulta para saber si existen coincidencias, y poder evitar duplicidad
     $.post('catalogos/privadas/checkExistenciaDNS',
                  { intPrivadaID: $('#txtPrivadaID').val(),
                    strDNS: url,
                  },
                  function(data) {
                    //Recuperar valor de resultado 0(TRUE)
                    // --Existe DNS en la privada Y 1(FALSE) NO existe DNS en la privada
                    //Si el resultado es cero, significa que ya existe dns en la privada
                    //mostrar mensaje al usuario
                    if(data.resultado == 0){
                       $('#divMensajes').html(data.mensajes);
                       textBox.focus();
                       //Deshabilitar el boton (Guardar Relays)
                       $('#btnGuardarRelays').attr('disabled','-1');
                       //Deshabilitar el boton (Guardar Privada)
                       $('#btnGuardarPrivada').attr('disabled','-1');
                       

                    }
                    else
                    {
                      $('#divMensajes').html('');
                      //Habilitar el boton (Guardar Relays)
                       $('#btnGuardarRelays').removeAttr('disabled');
                       //Habilitar el boton (Guardar Privada)
                       $('#btnGuardarPrivada').removeAttr('disabled');
                    }
                   
                  }
                 ,
          'json');

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


 //--------- Funciones para el Modal Relays
//---------- Funciones para la Busqueda de relays
//Búsqueda de registros (relays) del dns seleccionado
  function paginacionRelays(){
    //Si el dns1 esta activo y el id esta vacio asignar el valor de 1
    if($('#txtDNSID').val()=="")
    {
      $('#txtDNSID').val('1');
    }
    var strNuevaBusqueda=$('#txtPrivadaID').val()+$('#txtDNSID').val();
    if(strNuevaBusqueda != strUltimaBusqueda){
      pagina = 0;
      strUltimaBusqueda= strNuevaBusqueda;
    }
    $.post('catalogos/privadasrelays/paginacion',
                 {intPrivadaID:$('#txtPrivadaID').val(),
                  intDNSID:$('#txtDNSID').val(),
                  intPagina:pagina},
                  function(data) {
                    $('#dgPrivadasRelays tbody').empty();
                    var temp = Mustache.render($('#plantilla_Relays').html(),data);
                    $('#dgPrivadasRelays tbody').html(temp);
                    $('#pagLinksRelays').html(data.paginacion);
                    $('#numElementosRelays').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
  }


   //---------- Funciones para la Busqueda de Comandas
 
 //Función que se utiliza para abrir el modal de captura de relays del dns seleccionado
 function fnAbrirModalRelay(){
   $('#myModalRelay').modal('show');
   fnNuevoRelay();
   $('#divMensajesRelays').html('');
   

  }
  //Función que se utiliza para cerrar el modal de captura de relays del dns seleccionado
  function fnCerrarModalRelay(){
    $('#myModalRelay').modal('hide');
    paginacionRelays();
 
   
  }
  //Función que se utiliza para limpiar los campos edl modal de captura de relays del dns seleccionado
  function fnNuevoRelay(){
    $('#txtRelays').val('');
    $("#txtRenglonID").val('');
    $('#txtRelaysAnterior').val('');
    $('#txtConceptoAnterior').val('');
    //$('#cmbEstadoRelay').val(0);
    $('#cmbConcepto').val(0);
    $('#cmbConcepto').focus();


  }

 /* Función que valida si la cadena contiene solo números.
 *  Ejemplo de uso:
 *   Al usar fnValidaSoloNumerico(“1234,″) : retorna True.
 *   Al usar fnValidaSoloNumerico(“a123″) : retorna False.
 */
  function fnValidaSoloNumerico() {
     if((event.keyCode < 48 && event.keyCode != 44) || (event.keyCode > 57)) 
     {
        event.returnValue = false;
     }

  }

 //Función que se utiliza para guardar los datos del relay del dns de la privada
  function fnGuardarRelay(){
    if(fnValidar()) {
      $.post('catalogos/privadasrelays/guardar',
                  { 
                    intPrivadaID: $('#txtPrivadaID').val(), 
                    intDNSID: $("#txtDNSID").val(),
                    intRenglonID: $("#txtRenglonID").val(),
                    strConcepto: $('#cmbConcepto').val(),
                    strConceptoAnterior: $('#txtConceptoAnterior').val(),
                    strRelays: $('#txtRelays').val(),
                    strRelaysAnterior: $('#txtRelaysAnterior').val(),
                    strEstado: 'Activo'
                  },
                  function(data) {
                    $('#divMensajesRelays').html(data.mensajes);
                    if(data.resultado){
                      fnNuevoRelay();
                      paginacionRelays();
                    }
                  }
                 ,
          'json');
    }
  }
   function fnEditarRelays(renglon){
    $.post('catalogos/privadasrelays/editar',
                  { 
                    intPrivadaID: $('#txtPrivadaID').val(),
                    intDNSID: $("#txtDNSID").val(), 
                    intRenglonID: renglon

                  },
                  function(data) {
                  $('#divMensajesRelays').html(data.mensajes);
                  if(data.row){
                      $('#txtRenglonID').val(data.row.renglon);
                      $('#txtRelays').val(data.row.relays);
                      $('#cmbConcepto').val(data.row.concepto);
                      $('#cmbEstadoRelay').val(data.row.estado);
                      //Recuperar valores para validación (evitar duplicación)
                      $('#txtConceptoAnterior').val(data.row.concepto);
                      $('#txtRelaysAnterior').val(data.row.relays);
                      //Abrir modal de relays del dns (para la privada)
                      $('#myModalRelay').modal('show');
                    }
                  }
                 ,
          'json');
  }

  function fnEliminarRelays(renglon){
      if(confirm('Esta seguro que desea eliminar el registro ?'))
        $.post('catalogos/privadasrelays/eliminar',
                  { intPrivadaID: $('#txtPrivadaID').val(),
                    intDNSID: $("#txtDNSID").val(), 
                    intRenglonID: renglon
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.resultado){
                      paginacionRelays();
                    }
                  }
                 ,
          'json');
  }
  

  $( document ).ready(function() {
   var strDNS='';
    //Llamar metodo fnValidaURL  cuando se pierda el enfoque de la caja de texto
    $("#txtDNS1").focusout(function(e){
         strDNS=$("#txtDNS1").val();
          if (strDNS.length >= 3) {
               //Validar que la url del dns1 sea correcta (este bien escrita)
               //fnValidaURL(strDNS, 'txtDNS1');
               //Si el dns1 es diferente al anterior, validar dns para evitar (duplicidad)
                if(strDNS!= $("#txtDNS1Anterior").val())
                {
                  //Validar que la descripción del dns1 no exista en la privada
                 //y así evitar duplicación
                  fnValidaDNS(strDNS, 'txtDNS1');
                }
          }
     });

     //Llamar metodo fnValidaURL  cuando se pierda el enfoque de la caja de texto
    $("#txtDNS2").focusout(function(e){
          strDNS=$("#txtDNS2").val();
          if (strDNS.length >= 3) {
               //Validar que la url del dns2 sea correcta (este bien escrita)
               //fnValidaURL(strDNS,'txtDNS2');
               //Si el dns2 es diferente al anterior, validar dns para evitar (duplicidad)
                if(strDNS!= $("#txtDNS2Anterior").val())
                {
                  //Validar que la descripción del dns2 no exista en la privada
                  //y así evitar duplicación
                  fnValidaDNS(strDNS, 'txtDNS2');
                }
          }
       
     });
     //Llamar metodo fnValidaURL cuando se pierda el enfoque de la caja de texto
    $("#txtDNS3").focusout(function(e){
          strDNS=$("#txtDNS3").val();
          if (strDNS.length >= 3) {
               //Validar que la url del dns3 sea correcta (este bien escrita)
               //fnValidaURL(strDNS,'txtDNS3');
                //Si el dns3 es diferente al anterior, validar dns para evitar (duplicidad)
                if(strDNS!= $("#txtDNS3Anterior").val())
                {
                   //Validar que la descripción del dns3 no exista en la privada
                  //y así evitar duplicación
                  fnValidaDNS(strDNS, 'txtDNS3');

                }
               
          }
       
     });

    $('.datepicker').datetimepicker({
          language: 'es',
          pickTime: false
      });
   
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

      $('#pagLinksRelays').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacionRelays();

     });
    
    
     //Asignar id al dns1, al dar clic en la lista
     $("#liTab1").click(function(event){
        //identificador del dns1
        $('#txtDNSID').val('1');
        //Enfocar la caja de texto txtDNS1
        $("#txtDNS1").focus();
    });
    //Asignar id al dns2, al dar clic en la lista
    $("#liTab2").click(function(event){
      //identificador del dns2 
       $('#txtDNSID').val('2');
       //Enfocar la caja de texto txtDNS2
       $("#txtDNS2").focus();
    });

    //Asignar id al dns3, al dar clic en la lista
     $("#liTab3").click(function(event){
       //identificador del dns3  
       $('#txtDNSID').val('3');
       //Enfocar la caja de texto txtDNS3
       $("#txtDNS3").focus();
    });


//---- Script para el Modal
     $('#myModal').on('shown', function () {
       $('#txtDescripcion').focus();
       paginacionRelays();
       
        
     });

     $('#myModal').on('hidden', function () {
        $('#txtPrivadaID').val('');
        fnNuevo();
        $('#txtBusqueda').focus();

     });

     $("#btnGuardar").click(fnGuardar);

//---- Script para el Modal Relays
     //Funciones de los controles del modal Relay
      //Abrir modal para agregar relay del dns cuando la caja de texto del dns1 sea 
      //diferente de vacia
      $("#btnAgregarRelayDNS1").click(function(event){
        var strDNS=$("#txtDNS1").val();
        var strPuerto=$("#txtPuerto1").val();
        var strAlias=$("#txtAlias1").val();
        //Si el dns es diferente de vacio abrir modal para agregar relays
         if(strDNS !="" && strAlias !="" && strPuerto !="" )
         {
           //descripción del dns1
           $("#txtDNS").val(strDNS);
           //puerto del dns1
           $("#txtPuerto").val(strPuerto);
           //alias del dns1
           $("#txtAlias").val(strAlias);
           //Hacer llamado a la función para modificar los datos del DNS seleccionado
           fnModificarDNS();
         }
         else
         {
            alert('Favor de ingresar la Descripción, Alias y Puerto del DNS1.');
         }
      });
      //Abrir modal para agregar relay del dns cuando la caja de texto del dns2 sea 
      //diferente de vacia
      $("#btnAgregarRelayDNS2").click(function(event){
        var strDNS2=$("#txtDNS2").val();
        var strPuerto2=$("#txtPuerto2").val();
        var strAlias2=$("#txtAlias2").val();
        //Si el dns es diferente de vacio abrir modal para agregar relays
         if(strDNS2!=""  && strAlias2 !="" && strPuerto2 !="")
         {
            //descripción del dns2
           $("#txtDNS").val(strDNS2);
            //puerto del dns2
           $("#txtPuerto").val(strPuerto2);
           //alias del dns2
           $("#txtAlias").val(strAlias2);
           //Hacer llamado a la función para modificar los datos del DNS seleccionado
           fnModificarDNS();
          
         }
         else
         {
            alert('Favor de ingresar la Descripción, Alias y Puerto del DNS2.');
         }
      });
       //Abrir modal para agregar relay del dns cuando la caja de texto del dns3 sea 
      //diferente de vacia
      $("#btnAgregarRelayDNS3").click(function(event){
         var strDNS3=$("#txtDNS3").val();
         var strPuerto3=$("#txtPuerto3").val();
         var strAlias3=$("#txtAlias3").val();
         //Si el dns es diferente de vacio abrir modal para agregar relays
         if(strDNS3!=""  && strAlias3 !="" && strPuerto3!="")
         {
           //descripción del dns3
           $("#txtDNS").val(strDNS3);
            //puerto del dns2
           $("#txtPuerto").val(strPuerto3);
           //alias del dns2
           $("#txtAlias").val(strAlias3);
           //Hacer llamado a la función para modificar los datos del DNS seleccionado
           fnModificarDNS();
         
         }
         else
         {
           alert('Favor de ingresar la Descripción, Alias y Puerto del DNS3.');
         }
      });

//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmPrivadas');    
      //Ocultar el siguiente boton(solo mostrarlo cuando exista la privada)
      $("#btnAgregarRelay").css({'visibility': 'hidden'});     
      $('#txtBusqueda').focus();
      paginacion();
    
  });
</script> 