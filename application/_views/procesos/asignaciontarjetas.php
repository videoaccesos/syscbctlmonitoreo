    <form id="frmSearch" action="#" method="post" onsubmit="return(false)">
            <div style="display:inline-block;">
              <label for="txtPrivada"><h5>Privada</h5></label>
             <select id="cmbPrivadaID" style="width:260px;" tabindex="-1"> 
			</select>
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

            &nbsp;&nbsp;
            <div style="display:inline-block;">
              <label for="txtResidente"><h5>Residente</h5></label>
              <div class="input-append">
                  <input  id="txtResidente" type="text" placeholder="Ingresa Residente">
                  <div class="btn-group" >
                    <button class="btn dropdown-toggle" onclick="paginacion();" tabindex="-1">
                      <i class="icon-search"></i>
                    </button>
                  </div>
              </div>
            </div>
         
          <div class="btn-group" style="display:inline-block;float:right;padding-top:40px;">
			<!-- Button to trigger modal 
    		<button class="btn btn-inverse" >
    			<i class="icon-print icon-white"></i> Imprimir
    		</button>	-->
          </div>    
    </form>

    <script id="plantilla_privadas" type="text/template"> 
	  {{#privadas}}
	    <option value="{{value}}">{{nombre}}</option>
	  {{/privadas}} 
	</script>
                 		
	<!-- Modal -->
	<div id="myModal_Tarjetas" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="top:10%; width:1000px; left:30%;" >
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="-1">×</button>
			<h3 id="myModalLabel">Tarjetas de Acceso</h3>
		</div>
		<div class="modal-body" style="max-height:100%; height:100%;">
			<form name="frmTarjetas" id="frmTarjetas" action="#" method="post" onsubmit="return(false)" autocomplete="off">
				<input type="hidden" id="auto_save" value="fnGuardar()">
				<input type="hidden" id="txtResidenciaID" value="">
				<input type="hidden" id="txtAsignacionID" value="">
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
	                              <option value='1'>ACTIVA</option>
	                              <option value='2'>CANCELADA</option>
	                            </select>
		                    </div>
		                    <input type="hidden" id="txtResidente_TarjetasID" value="">
		                    <label for="txtResidente_Tarjetas">Residente Responsable</label>
							<input class="span6" id="txtResidente_Tarjetas" type="text" tabindex="4">
						</div>
						<div>
							<div style="display:inline-block;padding-right:17px;">
							  <label for="txtFolioContrato_Tarjetas">Folio del Contrato</label>
							  <input style="width:110px;" id="txtFolioContrato_Tarjetas" type="text" maxlength="10" tabindex="5">
							</div>

							<div style="display:inline-block; padding-right:17px;">
		                        <label for="cmbTipoLecturaID_Tarjetas">Tipo de Lectura</label>
	                            <select style="width:120px;" id="cmbTipoLecturaID_Tarjetas" tabindex="6">
	                              <option value='1'>TID</option>
	                              <option value='2'>EPC</option>
	                            </select>
		                    </div>
		                    
							<div style="display:inline-block;">
							  <label for="txtLectura_Tarjetas">Lectura</label>
							  <input id="txtLectura_TarjetasID" type="hidden">
							  <input style="width:157px;" id="txtLectura_Tarjetas" type="text" maxlength="20" tabindex="7">
							</div>
						</div>
						<div style="margin-bottom:12px;">
							
							<div style="display:inline-block; padding-right:17px;">
							  <label for="txtPrecio_Tarjetas">Precio</label>
							  <div class="input-prepend">
							  	 <span class="add-on">
							  	 	$
		                         </span>
							  	<input style="width:80px;text-align:right;" id="txtPrecio_Tarjetas" type="text" value="0.00" onBlur="fnFormato(this,2);" tabindex="8">
							  </div>
							</div>
							<div style="display:inline-block;width:124px; padding-right:17px;">
								<label class="checkbox">
									<input type="checkbox" id="chkUtilizoSeguro_Tarjetas" tabindex="9"> Utilizó Seguro
								</label>
							</div>
							<div style="display:inline-block;">
							  <label for="txtLecturaEPC_Tarjetas">Lectura EPC</label>
							  <input style="width:157px;" id="txtLecturaEPC_Tarjetas" type="text" maxlength="20" tabindex="10">
							</div>
						</div>
						<button class="btn" tabindex="12" onclick="fnNuevo()"><i class="icon-file"></i> Nuevo</button>
						<button class="btn btn-primary" tabindex="11" style="float:right;margin-right:10px;" onclick="fnGuardar()"><i class="icon-hdd icon-white"></i> Guardar</button>
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
											<th >Lectura</th>
											<th width="10px;">Tipo</th>
											<th width="10px;">E</th>
											<th width="103px;">Opciones</th>
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
			<script id="plantilla_tarjetas" type="text/template">
		          {{#rows}}
		          	<tr>
						<td>{{fecha}}</td>
						<td><div style="overflow:overlay;width:178px;height:20px;">{{lectura}} \ {{lectura_epc}}</div></td>
						<td>{{tipo}}</td>
						<td>{{estatus}}</td>
						<td><a title="Estado" onclick="fnCambiarEstadoTarjetas({{asignacion_id}},{{estatus_id}})" class="btn btn-mini"><i class="icon icon-eye-open"></i></a>
						    <a title="Editar" onclick="fnEditar({{asignacion_id}})" class="btn btn-mini"><i class="icon icon-pencil"></i></a>
						    <a title="Liberar Tarjeta" onclick="fnLiberarTarjeta({{asignacion_id}},{{estatus_id}},{{tarjeta_id}})" class="btn btn-mini"><i class="icon icon-retweet"></i></a>
						</td>
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
		  <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="13" onblur="$('#dtFecha_Tarjetas').focus()">Cerrar</button>
		</div>
	</div>

	<table class="table table-stripped" id="dgResidentes">
		<thead>
			<tr>
			 <th>Privada</th>
			 <th>#Casa</th>
			 <th>Calle</th>
			 <th style="text-align:center;">T. ACT.</th>
			 <th style="text-align:center;">T. CAN.</th>
			 <th style="text-align:center;">Estatus Residente</th>
			 <th width="20px" style="text-align:center;">Tarjetas</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
	</table>
	<script id="plantilla_residencias" type="text/template">
          {{#rows}}
          <tr>
			<td>{{privada}}</td>
			<td>{{nro_casa}}</td>
			<td>{{calle}}</td>
			<td style="text-align:center;">{{activas}}</td>
			<td style="text-align:center;">{{inactivas}}</td>
			<td style="text-align:center;">{{estatus}}</td>
			<td style="text-align:center;"><a onclick="fnMostrarResidenciaTarjetas('{{residencia_id}}')" role="button" class="btn btn-mini" data-toggle="modal"><i class="icon-tasks"></i></a></td>
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
  var strFecha = "<?php echo $fecha;?>";
  var strFecheVencimiento = "<?php echo $fecha_vencimiento;?>";
  var pagina_tarjetas = 0;
  var strUltimaBusqueda= "";
  var bolPagina = false;
  
//---------- Funciones para la Busqueda

  function paginacion() {
    if($('#txtResidente').val()+$('#txtBusqueda').val()+$('#cmbPrivadaID').val() != strUltimaBusqueda){
      pagina = 0;
      strUltimaBusqueda = $('#txtResidente').val()+$('#txtBusqueda').val()+$('#cmbPrivadaID').val();
    }
      
    $.post('catalogos/residencias_residentes/paginacion_asignacion_tarjetas',
                 {	strResidente:$('#txtResidente').val(),
                 	strNumCalle:$('#txtBusqueda').val(), 
                 	intPrivadaID:$('#cmbPrivadaID').val(), 
                 	intPagina:pagina},
                  function(data) {
                    $('#dgResidentes tbody').empty();
                    var temp = Mustache.render($('#plantilla_residencias').html(),data);
                    $('#dgResidentes tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
  }

  function paginacion_tarjetas() {
    if($('#txtLectura_Tarjetas').val() != strUltimaBusqueda){
      pagina_tarjetas = 0;
      bolPagina = true;
    }
    if(bolPagina)
    $.post('procesos/asignaciontarjetas/paginacion',
                 {strResidenciaID:$('#txtResidenciaID').val(),
                  strBusqueda:$('#txtLectura_Tarjetas').val(), 
                  intPagina:pagina_tarjetas},
                  function(data) {
                    $('#dgTarjetas tbody').empty();
                    var temp = Mustache.render($('#plantilla_tarjetas').html(),data);
                    $('#dgTarjetas tbody').html(temp);
                    $('#pagLinks_Tarjetas').html(data.paginacion);
                    $('#numElementos_Tarjetas').html(data.total_rows);
                    pagina_Residentes = data.pagina;
                    strUltimaBusqueda = $('#txtLectura_Tarjetas').val();
                    bolPagina = false;
                  }
                 ,
          'json');
  }

//--------- Funciones para el Modal

  function fnNuevo (){
  	  $('#txtAsignacionID').val('');
  	  $('#dtFecha_Tarjetas').val(strFecha);
  	  $('#dtFechaVencimiento_Tarjetas').val(strFecheVencimiento);
  	  $('#cmbEstatusID_Tarjetas').val(1);
  	  $('#txtFolioContrato_Tarjetas').val('');
  	  $('#cmbTipoLecturaID_Tarjetas').val(1);
  	  $('#txtLectura_Tarjetas').val('');
  	  $('#txtLectura_TarjetasID').val('');
  	  $('#txtPrecio_Tarjetas').val('0.00');
  	  $("#chkUtilizoSeguro_Tarjetas").removeAttr("checked");
  	  $('#txtLecturaEPC_Tarjetas').val('');
  	  $("#txtLectura_Tarjetas").removeAttr('disabled');
  	  $('#txtResidente_Tarjetas').val('');
  	  $('#txtResidente_TarjetasID').val(''); 
	  $('#txtResidente_Tarjetas').focus();  
	  bolPagina = true;
	  pagina_tarjetas = 0;
      paginacion_tarjetas();
  }

  function fnEditar(id){
  	$.post('procesos/asignaciontarjetas/editar',
		          { intAsignacionID: id
		          },
		          function(data) {
		          	$('#divMensajes').html(data.mensajes);
		            if(data.row){
		            	$('#txtAsignacionID').val(id);
		            	$('#dtFecha_Tarjetas').val(data.row.fecha);
		            	$('#dtFechaVencimiento_Tarjetas').val(data.row.fecha_vencimiento);
		            	$('#cmbEstatusID_Tarjetas').val(data.row.estatus_id);
		            	$('#txtResidente_TarjetasID').val(data.row.residente_id);
		            	$('#txtResidente_Tarjetas').val(data.row.residente);
		            	$('#txtFolioContrato_Tarjetas').val(data.row.folio_contrato);
		            	$('#cmbTipoLecturaID_Tarjetas').val(data.row.lectura_tipo_id);
		            	$('#txtLectura_Tarjetas').val(data.row.lectura);
		            	$('#txtLectura_TarjetasID').val(data.row.tarjeta_id);
		            	$('#txtPrecio_Tarjetas').val(data.row.precio);
		            	if(data.row.utilizo_seguro == 1) $("#chkUtilizoSeguro_Tarjetas").attr("checked","checked");
		            	else $("#chkUtilizoSeguro_Tarjetas").removeAttr('checked');
		            	$('#txtLecturaEPC_Tarjetas').val(data.row.lectura_epc);
		            	fnFormato($('#txtPrecio_Tarjetas')[0],2);
		            	$("#txtLectura_Tarjetas").attr('disabled','disabled');
		            	$('#txtResidente_Tarjetas').focus();
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
      $.post('procesos/asignaciontarjetas/guardar',
                  { intAsignacionID: $('#txtAsignacionID').val(),
                  	intTarjetaID: $('#txtLectura_TarjetasID').val(),
                  	strResidenteID: $('#txtResidente_TarjetasID').val(), 
                    strFecha: fnInvFecha($('#dtFecha_Tarjetas').val()),
                    strFechaVencimiento: fnInvFecha($('#dtFechaVencimiento_Tarjetas').val()),
                    intTipoLecturaID: $('#cmbTipoLecturaID_Tarjetas').val(),
                    strLecturaEPC: $('#txtLecturaEPC_Tarjetas').val(),
                    strFolioContrato: $('#txtFolioContrato_Tarjetas').val(),
                    dblPrecio: $('#txtPrecio_Tarjetas').val(),
                    bolUtilizoSeguro: $("#chkUtilizoSeguro_Tarjetas").prop("checked") ? 1 : 0,
                    intEstatusID: $('#cmbEstatusID_Tarjetas').val()
                  },
                  function(data) {
                    if(data.resultado){
                      fnNuevo();
                      paginacion_tarjetas();
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
    }
  }

  function fnCambiarEstadoTarjetas(id,estado){
      $.post('procesos/asignaciontarjetas/cambiar_estado',
                  { intAsignacionID: id,
                    intEstatusID: estado
                  },
                  function(data) {
                    if(data.resultado){
                      bolPagina = true;
                      paginacion_tarjetas();
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
  }

   function fnLiberarTarjeta(id,estado,tarjeta_id){
      $.post('procesos/asignaciontarjetas/liberar_tarjeta',
                  { intAsignacionID: id,
                    intEstatusID: estado,
                    intTarjetaID: tarjeta_id
                  },
                  function(data) {
                    if(data.resultado){
                      bolPagina = true;
                      paginacion_tarjetas();
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
  }

  function fnMostrarResidenciaTarjetas(id){
  		$('#txtResidenciaID').val(id);
  		fnNuevo();
		$.post('catalogos/residencias_residentes/editar_asignacion_tarjetas',
		          { strResidenciaID:id
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

  function cmbPrivada_set() {
    $.post('catalogos/privadas/opciones',
                  {},
                  function(data) {
                    $('#cmbPrivadaID').empty();
                    var temp = Mustache.render($('#plantilla_privadas').html(),data);
                    $('#cmbPrivadaID').html(temp);
                    paginacion();
                  }
                  ,'json');
  }

  $( document ).ready(function() {
  	  $("#txtLectura_Tarjetas").autocomplete("catalogos/tarjetas/autocomplete", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:8,onItemSelect:null,selectOnly:0,remoteDataType:"json"} 
      );

      $("#txtResidente_Tarjetas").autocomplete("catalogos/residencias_residentes/autocomplete_residencia", 
     	 	{ minChars:1,matchSubset:1,matchContains:1,cacheLength:5,onItemSelect:null,selectOnly:0,remoteDataType:"json",extraParams:['#txtResidenciaID']} 
     );

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

     $('#pagLinks_Tarjetas').on('click','a',function(event){
        event.preventDefault();
        pagina_tarjetas = $(this).attr('href').replace('/','');
        bolPagina = true;
        paginacion_tarjetas();
     });

     $("#cmbPrivadaID").blur(function(event){
        paginacion();
      });

     $("#cmbPrivadaID").click(function(event){
        paginacion();
      });

	//---- Script para el Modal
     $('#myModal_Tarjetas').on('shown', function () {
     	$('#txtResidente_Tarjetas').focus();
     });

     $('#myModal_Tarjetas').on('hidden', function () {
     	bolPagina = true;
      	paginacion();
        $('#cmbPrivadaID').focus();
     });

     $('#wellContenido').removeClass("span10").addClass("span14");

     $("#txtLectura_Tarjetas").blur(paginacion_tarjetas);
  
//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmTarjetas');   
     cmbPrivada_set(); 
     $('#cmbPrivadaID').focus();
  });
</script> 