<form name="frmTarjetas" id="frmTarjetas" action="#" method="post" onsubmit="return(false)" autocomplete="off">
		<input type="hidden" id="auto_save" value="fnGuardar()">
		<input type="hidden" id="txtTarjetaID" value="">
		<div style="display:inline-block;">
			<div style="max-width:275px;display:inline-block; padding-right:17px;">     

				<div>
					<div style="display:inline-block; padding-right:17px;">
                        <label for="cmbTipoID">Tipo</label>
                        <select style="width:120px;" id="cmbTipoID" tabindex="1">
                          <option value='1'>PEATONAL</option>
                          <option value='2'>VEHICULAR</option>
                        </select>
                    </div>
					<div style="display:inline-block;">
                        <label for="cmbEstatusID">Estado</label>
                        <select style="width:120px;" id="cmbEstatusID" tabindex="2">
                          <option value='1'>ACTIVA</option>
                     <!-- <option value='2'>ASIGNADA</option> -->
                          <option value='3'>DAÑADA</option>
                        </select>
                    </div>
				</div>
				<div>
					<div style="display:inline-block;">
					  <label for="txtLecturaIni">Lectura Inicial</label>
					  <div class="input-append">
			            <input id="txtLecturaIni" type="text" maxlength="20" tabindex="3">
			            <div class="btn-group">
			              <button class="btn dropdown-toggle"  >
			                <i class="icon-search"></i>
			              </button>
			          	</div>
        			  </div>
					</div>
					<div style="display:inline-block;">
					  <label for="txtLecturaFin">Lectura Final</label>
					  <input style="width:248px;" id="txtLecturaFin" type="text" maxlength="20" tabindex="4">
					</div>
				</div>
				<!--
				<div style="margin-bottom:12px;">
					<div style="display:inline-block;padding-right:17px;">
					  <label for="txtFolioContrato_Tarjetas">Folio del Contrato</label>
					  <input style="width:110px;" id="txtFolioContrato_Tarjetas" type="text" maxlength="20" tabindex="8">
					</div>
					<div style="display:inline-block;">
					  <label for="txtPrecio_Tarjetas">Precio</label>
					  <div class="input-prepend">
					  	 <span class="add-on">
					  	 	$
                         </span>
					  	<input style="width:80px;text-align:right;" id="txtPrecio_Tarjetas" type="text" value="0.00" onBlur="fnFormato(this,2);" tabindex="9">
					  </div>
					</div>
				</div> -->
				<button class="btn" tabindex="6" onclick="fnNuevo()"><i class="icon-file"></i> Nuevo</button>
				<button class="btn btn-primary" tabindex="5" style="float:right;margin-right:12px;" onclick="fnGuardar()"><i class="icon-hdd icon-white"></i> Guardar</button>
				<div style="margin-top:50px;margin-right:17px;" class="well">
					<div>
						<div style="width:90px;text-align:right;display:inline-block;">
							<strong id="numActivas">0</strong>
						</div> &nbsp; &nbsp; Activas
					</div>
					<div style="">
						<div style="width:90px;text-align:right;display:inline-block;">
							<strong id="numAsignadas">0</strong>
						</div> &nbsp; &nbsp; Asignadas
					</div>
					<div style="">
						<div style="width:90px;text-align:right;display:inline-block;">
							<strong id="numDanadas">0</strong>
						</div> &nbsp; &nbsp; Dañadas
					</div>
				</div>

			</div>

			<div style="display:inline-block; vertical-align: top;">
				<div>
					<div style="display:inline-block; padding-right:17px;">
						<label for="txtFechaIni">Fecha Inicio</label>
						<div class="input-append datepicker">
                            <input id="txtFechaIni" style="width:80px;" data-format="dd-MM-yyyy" type="text" tabindex="-1">
                            <span class="add-on">
                              <i data-time-icon="icon-time" data-date-icon="icon-calendar" class="icon-calendar"></i>
                            </span>
                         </div>
                    </div>
                    <div style="display:inline-block; padding-right:17px;">
                        <label for="txtFechaFin">Fecha Final</label>
						<div class="input-append datepicker">
                            <input id="txtFechaFin" style="width:80px;" data-format="dd-MM-yyyy" type="text" tabindex="-1">
                            <span class="add-on">
                              <i data-time-icon="icon-time" data-date-icon="icon-calendar" class="icon-calendar"></i>
                            </span>
                         </div>
                    </div>
                    <button class="btn" style="margin-bottom:10px;margin-right:17px;" tabindex="-1" onclick="pagina = 0;paginacion()">Buscar</button>
                    <button class="btn" style="margin-bottom:10px;" tabindex="-1" onclick="fnQuitarFiltro();paginacion();">Limpiar Filtro</button>
				</div>
				<!--
				<div>
					<div style="display:inline-block; padding-right:25px;">
					  <label for="txtPrivada_Tarjetas">Privada</label>
					  <input class="span3" id="txtPrivada_Tarjetas" type="text"  disabled>
					</div>
					<div style="display:inline-block;">
					  <label for="txtTelefonos_Tarjetas">Teléfono(s)</label>
					  <input class="span3" id="txtTelefonos_Tarjetas" type="text"  disabled>
					</div>
				</div>
				<div> -->
					<label>Lista de Tarjetas</label>
					<div class= "well" style="margin: 0px; padding: 0px 0px 0px 0px; height:425px; width:480px;">
						<table class="table table-stripped" id="dgTarjetas" style="margin: 0px;">
							<thead>
								<tr>
									<th width="75px;">Fecha</th>
									<th width="120px;">Lectura</th>
									<th width="20px;">Tipo</th>
									<th width="50px;">Estado</th>
									<th width="25px;">Opciones</th>
								</tr>
							</thead>
							<tbody>
							</tbody>
						</table>
					</div>
					<div style="dysplay: inline-block;margin-top:10px;">
				      <div id="pagLinks"  style="float:left;margin-right:10px;"></div>
				      <div style="float:right;margin-right:10px;"><strong id="numElementos">0</strong> Encontrados</div>
				      <br>
				   </div>
				</div>
			</div>
		</div>
	</form>

	<script id="plantilla_tarjetas" type="text/template">
          {{#rows}}
          	<tr>
				<td>{{fecha_formato}}</td>
				<td>{{lectura}}</td>
				<td>{{tipo}}</td>
				<td>{{estatus}}</td>
				<td><a onclick="fnCambiarEstadoTarjetas({{tarjeta_id}},{{estatus_id}})" class="btn btn-mini"><i class="icon icon-eye-open"></i></a>
				    <a onclick="fnEditar({{tarjeta_id}},{{estatus_id}})" class="btn btn-mini"><i class="icon icon-pencil"></i></a></td>
			</tr>
          {{/rows}}
          {{^rows}}
          <tr> 
            <td colspan="5"> No se Encontraron Resultados!!</td>
          </tr> 
          {{/rows}}
    </script>    		
	<!-- Modal -->
	<!--
	<div id="myModal_Tarjetas" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="top:10%; width:985px; left:35%;" >
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="-1">×</button>
			<h3 id="myModalLabel">Tarjetas de Acceso</h3>
		</div>
		<div class="modal-body" style="max-height:100%; height:100%;">
			<form name="frmTarjetas" id="frmTarjetas" action="#" method="post" onsubmit="return(false)" autocomplete="off">
				<input type="hidden" id="auto_save" value="fnGuardar()">
				<input type="hidden" id="txtResidenteID" value="">
				<input type="hidden" id="txtTarjetaID" value="">
				<div style="display:inline-block;">
					<div style="max-width:470px; widht:90%; display:inline-block; padding-right:17px;">     
						<div>
							<div style="display:inline-block; padding-right:17px;">
								<label for="txtNumCasa_Tarjetas">No. Casa</label>
								<input class="span1" id="txtNumCasa_Tarjetas" type="text" disabled>
							</div>
							<div style="display:inline-block;">
								<label for="txtCalle_Tarjetas">Calle</label>
								<input class="span5" id="txtCalle_Tarjetas" type="text"  disabled>
							</div>
						</div> 
						<div>
							<label for="txtResidente_Tarjetas">Residente</label>
							<input class="span6" id="txtResidente_Tarjetas" type="text" tabindex="16" disabled>
							<label><b>Detalle de la Tarjeta</b></label>
							<div style="display:inline-block; padding-right:17px;">
								<label for="dtFecha_Tarjetas">Fecha</label>
								<div class="input-append datepicker">
		                            <input id="dtFecha_Tarjetas" style="width:80px;" data-format="dd-MM-yyyy" type="text" value="00-00-0000" tabindex="1">
		                            <span class="add-on">
		                              <i data-time-icon="icon-time" data-date-icon="icon-calendar" class="icon-calendar"></i>
		                            </span>
		                         </div>
		                    </div>
		                    <div style="display:inline-block; padding-right:17px;">
		                        <label for="dtFechaVencimiento_Tarjetas">Fecha Vencimiento</label>
								<div class="input-append datepicker">
		                            <input id="dtFechaVencimiento_Tarjetas" style="width:80px;" data-format="dd-MM-yyyy" type="text" tabindex="2">
		                            <span class="add-on">
		                              <i data-time-icon="icon-time" data-date-icon="icon-calendar" class="icon-calendar"></i>
		                            </span>
		                         </div>
		                    </div>
		                    <div style="display:inline-block;">
		                        <label for="cmbEstatusID_Tarjetas">Estado</label>
	                            <select style="width:170px;" id="cmbEstatusID_Tarjetas" tabindex="3">
	                              <option value='1'>Activo</option>
	                              <option value='2'>Baja</option>
	                            </select>
		                    </div>
		                    
						</div>
						<div>
							<div style="display:inline-block; padding-right:17px;">
		                        <label for="cmbTipoID_Tarjetas">Tipo</label>
	                            <select style="width:120px;" id="cmbTipoID_Tarjetas" tabindex="4">
	                              <option value='1'>PEATONAL</option>
	                              <option value='2'>VEHICULAR</option>
	                            </select>
		                    </div>
							<div style="display:inline-block; padding-right:17px;">
		                        <label for="cmbLecturaID_Tarjetas">Lectura</label>
	                            <select style="width:120px;" id="cmbLecturaID_Tarjetas" tabindex="6">
	                              <option value='1'>EPC</option>
	                              <option value='2'>TID</option>
	                            </select>
		                    </div>
		                    
							<div style="display:inline-block;">
							  <label for="txtCodigo_Tarjetas">Codigo</label>
							  <input style="width:157px;" id="txtCodigo_Tarjetas" type="text" maxlength="20" tabindex="7">
							</div>
						</div>
						<div style="margin-bottom:12px;">
							<div style="display:inline-block;padding-right:17px;">
							  <label for="txtFolioContrato_Tarjetas">Folio del Contrato</label>
							  <input style="width:110px;" id="txtFolioContrato_Tarjetas" type="text" maxlength="20" tabindex="8">
							</div>
							<div style="display:inline-block;">
							  <label for="txtPrecio_Tarjetas">Precio</label>
							  <div class="input-prepend">
							  	 <span class="add-on">
							  	 	$
		                         </span>
							  	<input style="width:80px;text-align:right;" id="txtPrecio_Tarjetas" type="text" value="0.00" onBlur="fnFormato(this,2);" tabindex="9">
							  </div>
							</div>
						</div>
						<button class="btn" tabindex="11" onclick="fnNuevo()"><i class="icon-file"></i> Nuevo</button>
						<button class="btn btn-primary" tabindex="10" style="float:right;margin-right:10px;" onclick="fnGuardar()"><i class="icon-hdd icon-white"></i> Guardar</button>
					</div>

					<div style="display:inline-block; vertical-align: top;">
						<div>
							<div style="display:inline-block; padding-right:25px;">
							  <label for="txtPrivada_Tarjetas">Privada</label>
							  <input class="span3" id="txtPrivada_Tarjetas" type="text"  disabled>
							</div>
							<div style="display:inline-block;">
							  <label for="txtTelefonos_Tarjetas">Teléfono(s)</label>
							  <input class="span3" id="txtTelefonos_Tarjetas" type="text"  disabled>
							</div>
						</div>
						<div>
							<label for="txtMotivo">Lista de Tarjetas</label>
							<div class= "well" style="margin: 0px; padding: 0px 0px 0px 0px; height:275px;">
								<table class="table table-stripped" id="dgTarjetas" style="margin: 0px;">
									<thead>
										<tr>
											<th width="75px;">Fecha</th>
											<th >Codigo</th>
											<th width="70px;">Tipo</th>
											<th width="10px;">E</th>
											<th width="30px;">Opciones</th>
										</tr>
									</thead>
									<tbody>
									</tbody>
								</table>
							</div>
							<div style="dysplay: inline-block;margin-top:10px;">
						      <div id="pagLinks_Tarjetas"  style="float:left;margin-right:10px;"></div>
						      <div style="float:right;margin-right:10px;"><strong id="numElementos_Tarjetas">0</strong> Encontrados</div>
						      <br>
						   </div>
						</div>
					</div>
				</div>
			</form>
			<script id="plantilla_tarjetas2" type="text/template">
		          {{#rows}}
		          	<tr>
						<td>{{fecha}}</td>
						<td>{{numero}}</td>
						<td>{{tipo}}</td>
						<td>{{estatus}}</td>
						<td><a onclick="fnCambiarEstadoTarjetas({{tarjeta_id}},{{estatus_id}})" class="btn btn-mini"><i class="icon icon-eye-open"></i></a>
						    <a onclick="fnEditar({{tarjeta_id}},{{estatus_id}})" class="btn btn-mini"><i class="icon icon-pencil"></i></a></td>
					</tr>
		          {{/rows}}
		          {{^rows}}
		          <tr> 
		            <td colspan="5"> No se Encontraron Resultados!!</td>
		          </tr> 
		          {{/rows}}
		    </script>
		</div>
		<div class="modal-footer">
		  <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="11" onblur="$('#txtApePaterno_Residentes').focus()">Cerrar</button>
		</div>
	</div>
	-->
<script type="text/javascript">
  var pagina = 0;
  var strFecha = "<?php echo $fecha;?>";
  var pagina_tarjetas = 0;
  var strUltimaBusqueda= "";
  var bolPagina = false;
  
//---------- Funciones para la Busqueda

  function paginacion() {
    if($('#txtLecturaIni').val()+$('#dtFechaIni').val()+$('#dtFechaFin').val() != strUltimaBusqueda){
      pagina = 0;
      strUltimaBusqueda = $('#txtLecturaIni').val()+$('#dtFechaIni').val()+$('#dtFechaFin').val();
    }
      
    $.post('catalogos/tarjetas/paginacion',
                 {	strLectura:$('#txtLecturaIni').val(),
                 	strFechaIni: fnInvFecha($('#txtFechaIni').val()),
                 	strFechaFin: fnInvFecha($('#txtFechaFin').val()), 
                 	intPagina:pagina},
                  function(data) {
                    $('#dgTarjetas tbody').empty();
                    var temp = Mustache.render($('#plantilla_tarjetas').html(),data);
                    $('#dgTarjetas tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    $('#numActivas').html(data.total_activas);
                    $('#numAsignadas').html(data.total_asignadas);
                    $('#numDanadas').html(data.total_danadas);
                    pagina = data.pagina;
                  }
                 ,
          'json');
  }

  function paginacion_tarjetas() {
    if($('#txtCodigo_Tarjetas').val() != strUltimaBusqueda){
      pagina_tarjetas = 0;
      bolPagina = true;
    }
    if(bolPagina)
    $.post('procesos/asignaciontarjetas/paginacion',
                 {strResidenteID:$('#txtResidenteID').val(),
                  strBusqueda:$('#txtCodigo_Tarjetas').val(), 
                  intPagina:pagina_tarjetas},
                  function(data) {
                    $('#dgTarjetas tbody').empty();
                    var temp = Mustache.render($('#plantilla_tarjetas').html(),data);
                    $('#dgTarjetas tbody').html(temp);
                    $('#pagLinks_Tarjetas').html(data.paginacion);
                    $('#numElementos_Tarjetas').html(data.total_rows);
                    pagina_Residentes = data.pagina;
                    strUltimaBusqueda = $('#txtCodigo_Tarjetas').val();
                    bolPagina = false;
                  }
                 ,
          'json');
  }

//--------- Funciones para el Modal

  function fnNuevo (){
  	  $('#txtTarjetaID').val('');
  	  $('#cmbEstatusID').val(1);
  	  $('#cmbTipoID').val(1);
  	  $('#txtLecturaIni').val('');
  	  $('#txtLecturaFin').val('');
	  $('#txtLecturaFin').focus();  
	  fnQuitarFiltro();
	  bolPagina = true;
      paginacion();
  }

  function fnQuitarFiltro(){
  	$('#txtFechaIni').val('');
  	$('#txtFechaFin').val('');
  }

  function fnEditar(id){
  	$.post('catalogos/tarjetas/editar',
		          { intTarjetaID:id
		          },
		          function(data) {
		          	$('#divMensajes').html(data.mensajes);
		            if(data.row){
		            	$('#txtTarjetaID').val(id);
		            	$('#cmbTipoID').val(data.row.tipo_id);
		            	$('#cmbEstatusID').val(data.row.estatus_id);
		            	$('#txtLecturaIni').val(data.row.lectura);
		            	$('#txtLecturaIni').focus();
		            	paginacion();
		            }
		          }
		         ,
		  'json');
  }

  function fnValidar(){
    return true;
  }

  function fnGuardar(){
    if(fnValidar()) {
        if($('#txtLecturaFin').val() == '' || $('#txtTarjetaID').val() != ''){
	        $.post('catalogos/tarjetas/guardar',
	                  { intTarjetaID: $('#txtTarjetaID').val(),
	                    intTipo: $('#cmbTipoID').val(),
	                    strLectura: $('#txtLecturaIni').val(),
	                    intEstatusID: $('#cmbEstatusID').val()
	                  },
	                  function(data) {
	                    if(data.resultado){
	                      fnNuevo();
	                      paginacion();
	                    }
	                    $('#divMensajes').html(data.mensajes);
	                  }
	                 ,
	          'json');
  		}else {
	        $.post('catalogos/tarjetas/guardar_lote',
	                  { intTarjetaID: $('#txtTarjetaID').val(),
	                    intTipo: $('#cmbTipoID').val(),
	                    strLecturaIni: $('#txtLecturaIni').val(),
	                    strLecturaFin: $('#txtLecturaFin').val(),
	                    intEstatusID: $('#cmbEstatusID').val()
	                  },
	                  function(data) {
	                    if(data.resultado){
	                      fnNuevo();
	                      paginacion();
	                    }
	                    $('#divMensajes').html(data.mensajes);
	                  }
	                 ,
	          'json');
  		}
    }
  }

  function fnCambiarEstadoTarjetas(id,estado){
      $.post('catalogos/tarjetas/cambiar_estado',
                  { intTarjetaID: id,
                    intEstatusID: estado
                  },
                  function(data) {
                    if(data.resultado){
                      bolPagina = true;
                      paginacion();
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
  }

  function fnMostrarResidenteTarjetas(id){
  		$('#txtResidenteID').val(id);
  		fnNuevo();
		$.post('catalogos/residencias_residentes/editar_asignacion_tarjetas',
		          { strResidenteID:id
		          },
		          function(data) {
		          $('#divMensajes').html(data.mensajes);
		            if(data.row){
		            	bolPagina = true;
		            	paginacion_tarjetas();
		            	$('#txtPrivada_Tarjetas').val(data.row.privada)
		            	$('#txtNumCasa_Tarjetas').val(data.row.nro_casa);
		            	$('#txtCalle_Tarjetas').val(data.row.calle);
		            	$('#txtTelefonos_Tarjetas').val(data.row.telefono1+', '+data.row.telefono2),
		            	$('#txtResidente_Tarjetas').val(data.row.residente);
		            	$('#myModal_Tarjetas').modal('show');
		            }
		          }
		         ,
		  'json');
  }

  $( document ).ready(function() {
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

	//---- Script para el Modal
     $('#wellContenido').removeClass("span10");
     $('#wellContenido').css("width", "820px");

     $("#txtLecturaIni").blur(paginacion);
//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmTarjetas');    
     $('#txtLecturaIni').focus();
     paginacion();
  });
</script> 