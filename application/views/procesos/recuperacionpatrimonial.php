<form id="frmRecuperacionPatrimonial" action="#" method="post" onsubmit="return(false)" style="margin-bottom:50px;margin:0px;">
				<div style="width:465px; display:inline-block; padding-right:17px;">     
					<div>
              <div style="display:inline-block;padding-right:15px;">
                <input id="txtRecuperacionPatrimonialID" type="hidden">
                <label for="txtFolio">Folio</label>
                <div class="input-append">
                      <input id="txtFolio" style="width:75px;"  type="text" maxlength="20" tabindex="1" placeholder="[ AUTO ]" onFocus="txtFolio_onFocus(this);" onBlur="txtFolio_onBlur(this);">
                      <div class="btn-group">
                        <button class="btn dropdown-toggle"  >
                          <i class="icon-search"></i>
                        </button>
                      </div>
                    </div>
              </div>

						  <div style="display:inline-block;padding-right:15px;">
                <label>Fecha/Hora</label>
                <div class="input-append datetimepicker">
                  <input id="txtFechaHora" class="span2" data-format="dd-MM-yyyy hh:mm" type="text" tabindex="2">
                  <span class="add-on">
                    <i data-time-icon="icon-time" data-date-icon="icon-calendar" class="icon-calendar"></i>
                  </span>
                </div>
              </div>

              <div style="display:inline-block;">
                <label for="cmbEstatusID">Estado</label>
                <select id="cmbEstatusID" style="width:130px;" tabindex="3"> 
                  <option value="1">PENDIENTE</option>
                  <option value="2">RECUPERADO</option>
                </select>
              </div>
					</div>
					
					<div>
						<div style="display:inline-block; padding-right:17px;">
                <label for="txtEmpleado">Empleado</label>
                <div class="input-append">
                  <input id="txtEmpleadoID" type="hidden">
                  <input id="txtEmpleado" style="width:408px;"  type="text" maxlength="20" tabindex="4">
                  <div class="btn-group">
                    <button class="btn dropdown-toggle"  >
                      <i class="icon-search"></i>
                    </button>
                  </div>
                </div>
						</div>
					</div>
					
					<div>
            <div style="display:inline-block;padding-right:17px;">
                <label for="txtOrdenServicio">Orden de Servicio</label>
                <div class="input-append">
                  <input id="txtOrdenServicioID" type="hidden">
                  <input id="txtOrdenServicio" class="span2"  type="text" maxlength="20" tabindex="5" onFocus="txtOrdenServicio_onFocus(this);" onBlur="txtOrdenServicio_onBlur(this);">
                  <div class="btn-group">
                    <button class="btn dropdown-toggle"  >
                      <i class="icon-search"></i>
                    </button>
                  </div>
                </div>
            </div>
						<div style="display:inline-block";>
						  <label for="txtTecnico">Técnico</label>
						  <input id="txtTecnico" style="width:246px;" type="text" disabled>
						</div>
					</div>

          <div>
            <div style="display:inline-block; padding-right:17px;">
                <label for="cmbPrivadaID">Privada</label>
                <select id="cmbPrivadaID" style="width:460px;" tabindex="6"> </select>
            </div>
          </div>
				
					<div>
					  <div>
						<label for="txtRelato">Relato de los Hechos</label>
						<textarea id="txtRelato" class="span6" rows="4" tabindex="7"></textarea>
					  </div>
					</div>
					<div style="display: inline-block;">
            <label for="cmbTipoDano">Tipo de Daño</label>
            <div class="input">
              <select id="cmbTipoDano" class="span2" tabindex="8" >
                <option value="Patrimonial">Patrimonial</option>
                <option value="Operativo">Operativo</option>
              </select>
            </div>
          </div>
					<div>
						<div style="display:inline-block;">
						  <label for="txtNombreResponsable">Nombre del Involucrado</label>
						  <input class="span6" id="txtNombreResponsable" type="text" placeholder="Nombre" tabindex="9" maxlength="80">
						  <input class="span6" id="txtDomicilioResponsable" type="text" placeholder="Domicilio" tabindex="10">
						</div>
					</div>

					<div>
					  <div style="display:inline-block; padding-right:17px;">
						<input class="span3" id="txtTelefonoResponsable" type="text" placeholder="Teléfono" tabindex="11" maxlength="14">
					  </div>
					  <div style="display:inline-block;">
						<input class="span3" id="txtCelularResponsable" type="text" placeholder="Celular" tabindex="12" maxlength="14">
					  </div>
					</div> 
					<div>
					  <input class="span3" id="txtRelacionResponsable" type="text" placeholder="Relación" tabindex="13" maxlength="40">
					</div>
          <button class="btn" tabindex="-1" style="float:left;margin-top:10px;" onclick="fnShowBitacora('#txtRecuperacionPatrimonialID','recuperacion_patrimonial');"><i class="icon-calendar"></i> Historial</button>
				</div>

				<div style="display:inline-block; vertical-align: top;">
          <div class="btn-group" style="float:right;padding-right:17px;padding-top:20px;">
              <a type="button" class="btn" tabindex="28" onClick="fnNuevo()"><i class="icon-file"></i> Nuevo</a>   
              <a type="button"  class="btn" tabindex="29" onClick="fnSeguimiento()"><i class="icon-time"></i>  Seguimiento</a> 
              <a href="#myModal" type="button" data-toggle="modal" class="btn btn-inverse" tabindex="30" onBlur="$('#txtFolio').focus();"><i class="icon-search icon-white"></i>  Buscar</a> 
          </div>
					<div style="padding-top:65px;">
						 <label for="txtResponsable">Características del Vehículo</label>
						<div style="display:inline-block; padding-right:17px;">
							<input class="span2" id="txtPlacas" type="text" placeholder="Placas" tabindex="14" maxlength="20">
						</div>
							<div style="display:inline-block; padding-right:17px;">
								<input class="span2" id="txtModelo" type="text" placeholder="Modelo" tabindex="15" maxlength="20">
							</div>
						<div style="display:inline-block;">
							<input class="span2" id="txtColor" type="text" placeholder="Color" tabindex="16" maxlength="20">
						</div>
					</div>
					<div>
						<div style="display:inline-block; padding-right:17px;">
							<input class="span4" id="txtMarca" type="text" placeholder="Marca o Tipo" tabindex="17" maxlength="20">
						</div>
					</div>

          <div style="display:inline-block; padding-right:17px;">
            <label class="checkbox">
              <input type="checkbox" id="chkSeguro" tabindex="18"> <h5>Fue con Seguro<h5>
            </label>
          </div>
          <div>
            <div style="display:inline-block; padding-right:17px;">
              <input class="span6" id="txtSeguro" type="text" placeholder="Nombre del Seguro" tabindex="19">
            </div>
          </div>

					
					<div style="display:inline-block; padding-right:17px;">
						<label class="checkbox">
							<input type="checkbox" id="chkHuboTestigos" tabindex="20"> <h5>Hubo Testigos<h5>
						</label>
					</div>
					<div>
						<div style="display:inline-block; padding-right:17px;">
							<input class="span6" id="txtTestigo" type="text" placeholder="Nombre del Testigo" tabindex="21">
						</div>
					</div>
					
					<div style="display:inline-block; padding-right:17px;">
						<label class="checkbox">
							<input type="checkbox" id="chkHuboVideo" tabindex="22"> <h5>Hubo Videos<h5>
						</label>
					</div>
					<div>
						<div style="display:inline-block; padding-right:17px;">
							<input class="span6" id="txtNumMaq" type="text" placeholder="Número Máquina, Dirección" tabindex="23">
						</div>
					</div>
					<div style="display:inline-block; padding-right:17px;">
						<label class="checkbox">
							<input type="checkbox" id="chkAvisoAdmin" tabindex="24"> <h5>Se Avisó al Administrador<h5>
						</label>
					</div>
					<div style="display:inline-block;float:right;padding-right:17px;">
            <div class="input-append datetimepicker">
              <input id="txtAvisoFechaHora" class="span2" data-format="dd-MM-yyyy hh:mm" type="text" tabindex="25">
              <span class="add-on">
                <i data-time-icon="icon-time" data-date-icon="icon-calendar" class="icon-calendar"></i>
              </span>
            </div>
          </div>
				
					<div>
						<label for="txtObservaciones">Observaciones Generales</label>
						<textarea id="txtObservaciones" class="span6" rows="4" placeholder="Ingrese Observaciones" tabindex="26"></textarea>
					</div>

            <div class="btn-group" style="float:right;padding-right:17px;padding-top:10px;">
                <a type="button" class="btn btn-primary" data-toggle="modal" onClick="fnGuardar()" tabindex="27"><i class="icon-hdd icon-white"></i>  Guardar</a>
            </div>
				</div>
</form>

    <!-- Modal Seguimiento -->
    <div id="myModalSeguimiento" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="top:5%; margin-left:5%; width:775px; left:15%;" >
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
        <h3 id="myModalLabel">Seguimiento</h3>
      </div>
      <div class="modal-body" style="max-height:100%; height:100%;">
          <div style="display:inline-block;">
            <div style="width:100%; display:inline-block;">     
              <div>
                <div style="display:inline-block; padding-right:17px;">
                  <label for="txtNombre_Buscar">Comentario</label>
                  <input class="span8" id="txtComentario" type="text" placeholder="Ingresa Comentario">
                </div>
                <div style="display:inline-block; margin-top: -15px;"> 
                  <button type="button" class="btn" tabindex="9" onclick="fnGuardarSeguimiento();" style="margin-top:-7px;"><i class="icon-plus"></i> Agregar </button>
                </div>
              </div>
            </div>
            <div style="width:100%; display:inline-block;">
              <div class= "well" style="margin: 0px; padding: 0px 0px 0px 0px; min-height:250px; ">
                <table class="table table-stripped" id="dgSeguimientos" style="margin:0px;">
                  <thead>
                    <tr>
                      <th width="570px;">Comentario</th>
                      <th width="120px;">Fecha/Hora</th>
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
      <div class="modal-footer">
              <button class="btn" data-dismiss="modal" aria-hidden="true">Cerrar</button>
              <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtRecuperacionPatrimonialID','recuperacion_patrimonial_seguimiento');"><i class="icon-calendar"></i> Historial</button>
      </div>
    </div> 

    <!-- Modal Busqueda -->
    <div id="myModal" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="top:10%; margin-left:5%; width:886px; left:10%;" >
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
        <h3 id="myModalLabel">Buscar</h3>
      </div>
      <div class="modal-body" style="max-height:150%; height:150%;">
          <div style="display:inline-block;">
            <div style="width:100%; display:inline-block;">     
              <div>
                <div style="display:inline-block; padding-right:17px;">
                  <label for="txtNombre_Buscar">Responsable</label>
                  <input class="span4" id="txtNombre_Buscar" type="text" placeholder="Ingresa Nombre">
                </div>
                <div style="display:inline-block; padding-right:17px;">
                  <label for="txtFechaIni_Buscar">Fecha Inicial</label>
                   <div class="input-append datepicker">
                      <input id="txtFechaIni_Buscar" style="width:80px;" data-format="dd-MM-yyyy" type="text">
                      <span class="add-on">
                        <i data-time-icon="icon-time" data-date-icon="icon-calendar" class="icon-calendar"></i>
                      </span>
                   </div>  
                </div>
                <div style="display:inline-block; padding-right:17px;">
                  <label for="txtFechaFin_Buscar">Fecha Final</label>
                   <div class="input-append datepicker">
                      <input id="txtFechaFin_Buscar" style="width:80px;" data-format="dd-MM-yyyy" type="text">
                      <span class="add-on">
                        <i data-time-icon="icon-time" data-date-icon="icon-calendar" class="icon-calendar"></i>
                      </span>
                   </div> 
                </div>
                <div style="display:inline-block; padding-right:17px;">
                    <label for="cmbPrivadaBusquedaID">Privada</label>
                    <select id="cmbPrivadaBusquedaID" style="width:130%;"> </select>
                </div>
                <div style="display:inline-block; padding-right:17px;">
                    <label for="cmbEstatusID_Buscar">Estado</label>
                    <select id="cmbEstatusID_Buscar" style="width:140px;"> 
                      <option value="0">[TODAS]</option>
                      <option value="1">PENDIENTE</option>
                      <option value="2">RECUPERADO</option>
                    </select>
                </div>
                <div style="display:inline-block; margin-top: -15px;"> 
                  <button type="button" class="btn" onclick="paginacion();" style="margin-top:-7px;"> Buscar <i class="icon-search"></i></button>
                </div>
              </div>
            </div>
            <div style="width:100%; display:inline-block;">
              <div class= "well" style="margin: 0px; padding: 0px 0px 0px 0px; height:250px; ">
                <table class="table table-stripped" id="dgRecuperaciones" style="margin:0px;">
                  <thead>
                    <tr>
                      <th width="80px;">Fecha</th>
                      <th width="70px;">Folio</th>
                      <th >Tipo de Daño</th>
                      <th >Responsable</th>
                      <th >Privada</th>
                      <th width="50px;">Estado</th>
                      <th width="25px;">Opciones</th>
                    </tr>
                  </thead>
                  <tbody>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
      </div>
      <div style="dysplay: inline-block;margin-top:10px;">
        <div id="pagLinksBusqueda"  style="float:left;margin-right:10px;"></div>
        <div style="float:right;margin-right:10px;"><strong id="numElementosBusqueda">0</strong> Encontrados</div>
        <br>
      </div>
      <div class="modal-footer">
              <button class="btn" data-dismiss="modal" aria-hidden="true">Cancelar</button>
      </div>
    </div>  

<script id="plantilla_privadas" type="text/template"> 
  {{#privadas}}
    <option value="{{value}}">{{nombre}}</option>
  {{/privadas}} 
</script>

<script id="plantilla_privadas_busqueda" type="text/template"> 
  <option value="0" selected>[ Todas ]</option>
  {{#privadas}}
    <option value="{{value}}">{{nombre}}</option>
  {{/privadas}} 
</script>



<script id="plantilla_recuperacion" type="text/template">
      {{#rows}}
      <tr>
        <td>{{fecha}}</td>
        <td>{{folio}}</td>
        <td>{{tipo_dano}}</td>
        <td>{{responsable_nombre}}</td>
        <td>{{privada}}</td>
        <td>{{estatus}}</td>
        <td><a onclick="fnEditar({{recuperacion_patrimonial_id}})" class="btn btn-mini"><i class="icon icon-pencil"></i></a></td>
      </tr>
      {{/rows}}
      {{^rows}}
      <tr> 
        <td colspan="6"> No se Encontraron Resultados!!</td>
      </tr> 
      {{/rows}}
</script>

<script id="plantilla_seguimiento" type="text/template">
      {{#rows}}
      <tr>
        <td><div style="overflow:overlay;width:630px;height:40px;overflow-x:hidden;">{{comentario}}</div></td>
        <td>{{fecha}}</td>
      </tr>
      {{/rows}}
      {{^rows}}
      <tr> 
        <td colspan="2"> No se Encontraron Resultados!!</td>
      </tr> 
      {{/rows}}
</script>        


<script type="text/javascript">
var bolPagina = false;
var strUltimaBusqueda = "";
var strFollioAnt = "";
var pagina = 0;
var paginaBusqueda = 0;
var strUltimaBusquedaMod = "";

function paginacion(){
   var strNuevaBusqueda =($('#txtNombre_Buscar').val()+$('#txtFechaIni_Buscar').val()+$('#txtFechaFin_Buscar').val()+$('#cmbPrivadaBusquedaID').val()+$('#cmbEstatusID_Buscar').val());
    if(strNuevaBusqueda != strUltimaBusqueda)
    {
      strUltimaBusquedaMod = strNuevaBusqueda;
    }
      
    $.post('procesos/recuperacionpatrimonial/paginacion',
                 {strResponsable:$('#txtNombre_Buscar').val(),
                  strFechaInicio:fnInvFecha($('#txtFechaIni_Buscar').val()), 
                  strFechaFinal:fnInvFecha($('#txtFechaFin_Buscar').val()), 
                  intPrivadaID:$('#cmbPrivadaBusquedaID').val(), 
                  intEstatusID:$('#cmbEstatusID_Buscar').val(), 
                  intPagina:paginaBusqueda},
                  function(data) {
                    $('#dgRecuperaciones tbody').empty();
                    var temp = Mustache.render($('#plantilla_recuperacion').html(),data);
                    $('#dgRecuperaciones tbody').html(temp);
                    $('#pagLinksBusqueda').html(data.paginacion);
                    $('#numElementosBusqueda').html(data.total_rows);
                    paginaBusqueda = data.pagina;
                  }
                 ,
          'json');
  }

function paginacion_seguimiento() {
    $.post('procesos/recuperacionpatrimonial/paginacion_seguimiento',
                 {intRecuperacionID:$('#txtRecuperacionPatrimonialID').val(),
                  intPagina:pagina},
                  function(data) {
                    $('#dgSeguimientos tbody').empty();
                    var temp = Mustache.render($('#plantilla_seguimiento').html(),data);
                    $('#dgSeguimientos tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
}

function fnSeguimiento(){
  res = parseInt($('#txtRecuperacionPatrimonialID').val());
  if(!isNaN(res)){
    $('#myModalSeguimiento').modal('show');
    paginacion_seguimiento();
  }
}

function fnNuevo() {
  $('#frmRecuperacionPatrimonial')[0].reset();
  $("#chkSeguro").removeAttr('checked');
  $("#chkHuboTestigos").removeAttr('checked');
  $("#chkHuboVideo").removeAttr('checked');
  $('#txtEmpleadoID').val('');
  $('#txtOrdenServicioID').val('');
  $('#txtRecuperacionPatrimonialID').val('');

  var now = new Date();
  var utc = new Date(Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes()
  ));

  $('.datetimepicker').datetimepicker("setDate",utc);
  $('#txtEmpleado').focus();
}

function fnEditar(id){
    $.post('procesos/recuperacionpatrimonial/editar',
              { intRecuperacionID:id
              },
              function(data) {
                $('#divMensajes').html(data.mensajes);
                if(data.row){
                  fnSetRecuperacion(data);
                }
              }
             ,
      'json');
}

function fnSetRecuperacion(data){
    $('#txtRecuperacionPatrimonialID').val(data.row.recuperacion_patrimonial_id);
    $('#txtFolio').val(data.row.folio);
    $('#txtFechaHora').val(data.row.fecha);
    $('#cmbEstatusID').val(data.row.estatus_id);
    $('#txtEmpleadoID').val(data.row.empleado_id);
    $('#txtEmpleado').val(data.row.empleado);
    $('#txtOrdenServicioID').val(data.row.orden_servicio_id);
    $('#txtOrdenServicio').val(data.row.orden_folio);
    $('#txtTecnico').val(data.row.tecnico);
    $('#cmbPrivadaID').val(data.row.privada_id);
    $('#txtRelato').val(data.row.relato_hechos);
    $('#cmbTipoDano').val(data.row.tipo_dano);
    $('#txtNombreResponsable').val(data.row.responsable_nombre);
    $('#txtDomicilioResponsable').val(data.row.responsable_domicilio);
    $('#txtTelefonoResponsable').val(data.row.responsable_telefono);
    $('#txtCelularResponsable').val(data.row.responsable_celular);
    $('#txtRelacionResponsable').val(data.row.responsable_relacion);
    $('#txtPlacas').val(data.row.vehiculo_placas);
    $('#txtModelo').val(data.row.vehiculo_modelo);
    $('#txtColor').val(data.row.vehiculo_color);
    $('#txtMarca').val(data.row.vehiculo_marca);

    if(data.row.seguro == 1) $("#chkSeguro").attr("checked","checked");
    else $("#chkSeguro").removeAttr('checked');
    $('#txtSeguro').val(data.row.seguro_nombres);

    if(data.row.testigos == 1) $("#chkHuboTestigos").attr("checked","checked");
    else $("#chkHuboTestigos").removeAttr('checked');
    $('#txtTestigo').val(data.row.testigos_nombres);

    if(data.row.videos == 1) $("#chkHuboVideo").attr("checked","checked");
    else $("#chkHuboVideo").removeAttr('checked');
    $('#txtNumMaq').val(data.row.videos_direccion);

    if(data.row.aviso_administrador == 1) $("#chkAvisoAdmin").attr("checked","checked");
    else $("#chkAvisoAdmin").removeAttr('checked');
    $('#txtAvisoFechaHora').val(data.row.fecha_aviso);

    $('#txtObservaciones').val(data.row.observaciones);
    $('#myModal').modal('hide');
    $('#txtEmpleado').focus();
}

function txtFolio_onFocus(obj){
   strFollioAnt = obj.value;
}

function txtFolio_onBlur(obj){
  if(strFollioAnt != obj.value){
    $.post('procesos/recuperacionpatrimonial/editar',
          { strFolio: obj.value
          },
          function(data) {
            $('#divMensajes').html(data.mensajes);
            if(data.row){
              fnSetRecuperacion(data);
            }
            else {
              fnNuevo();
            }
          }
         ,
      'json');
  }
}

function txtOrdenServicio_onFocus(obj){
   strFollioAnt = obj.value;
}

function txtOrdenServicio_onBlur(obj){
  if(strFollioAnt != obj.value){
    $.post('procesos/ordenesservicio/editar_buscar',
          { strFolio: obj.value
          },
          function(data) {
            $('#divMensajes').html(data.mensajes);
            if(data.row){
              $('#txtOrdenServicioID').val(data.row.orden_servicio_id);
              $('#txtOrdenServicio').val(data.row.folio);
              if(data.row.cierre_tecnico && data.row.cierre_tecnico != "")
                $('#txtTecnico').val(data.row.cierre_tecnico);
              else
                $('#txtTecnico').val("Orden sin cerrar!");
            }
            else {
              $('#txtOrdenServicioID').val('');
              $('#txtOrdenServicio').val('');
              $('#txtTecnico').val('');
            }
          }
         ,
      'json');
  }
}

function fnValidar(){
  return true;
}

function fnGuardar(){
  if(fnValidar()) {
      $.post('procesos/recuperacionpatrimonial/guardar',
                { intRecuperacionID: $('#txtRecuperacionPatrimonialID').val(),
                  strFecha: $('#txtFechaHora').val(),
                  intEmpleadoID: $('#txtEmpleadoID').val(),
                  intPrivadaID: $('#cmbPrivadaID').val(),
                  intOrdenServicioID: $('#txtOrdenServicioID').val(),
                  strRelatoHechos: $('#txtRelato').val(),
                  strTipoDano: $('#cmbTipoDano').val(),
                  strResponsable: $('#txtNombreResponsable').val(),
                  strResponsableDomicilio: $('#txtDomicilioResponsable').val(),
                  strResponsableTelefono: $('#txtTelefonoResponsable').val(),
                  strResponsableCelular: $('#txtCelularResponsable').val(),
                  strResponsableRelacion: $('#txtRelacionResponsable').val(),
                  strVehiculoPlacas: $('#txtPlacas').val(),
                  strVehiculoModelo: $('#txtModelo').val(),
                  strVehiculoColor: $('#txtColor').val(),
                  strVehiculoMarca: $('#txtMarca').val(),
                  bolSeguro: $("#chkSeguro").prop("checked") ? 1 : 0,
                  strSeguro: $('#txtSeguro').val(),
                  bolTestigos: $("#chkHuboTestigos").prop("checked") ? 1 : 0,
                  strTestigos: $('#txtTestigo').val(),
                  bolVideos: $("#chkHuboVideo").prop("checked") ? 1 : 0,
                  strVideos: $('#txtNumMaq').val(),
                  bolAvisoAdministrador: $("#chkAvisoAdmin").prop("checked") ? 1 : 0,
                  strAvisoAdministradorFecha: $('#txtAvisoFechaHora').val(),
                  strObservaciones: $('#txtObservaciones').val(),
                  intEstatusID: $('#cmbEstatusID').val()
                },
                function(data) {
                  if(data.resultado){
                    fnNuevo();
                  }
                  $('#divMensajes').html(data.mensajes);
                }
               ,
        'json');
  }
}

function fnGuardarSeguimiento(){
  if(fnValidar()) {
      $.post('procesos/recuperacionpatrimonial/guardar_seguimiento',
                { intRecuperacionID: $('#txtRecuperacionPatrimonialID').val(),
                  strComentario: $('#txtComentario').val()
                },
                function(data) {
                  if(data.resultado){
                    paginacion_seguimiento();
                    $('#txtComentario').val('');
                    $('#txtComentario').focus();
                  }
                  $('#divMensajes').html(data.mensajes);
                }
               ,
        'json');
  }
}
//Filtro de privadas se utiliza en el formulario principal
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
//Filtro de privadas se utiliza en el modal de búsqueda
function cmbPrivadaBusqueda_set(){
    $.post('catalogos/privadas/opciones',
        {},
        function(data) {
          $('#cmbPrivadaBusquedaID').empty();
          var temp = Mustache.render($('#plantilla_privadas_busqueda').html(),data);
          $('#cmbPrivadaBusquedaID').html(temp);
        }
        ,'json');
}
 //Función que se utiliza para regresar la fecha actual
 function fnRegresarFechaActual()
 {
      var dteFecha = new Date();
      var dd = dteFecha.getDate();
      var mm = dteFecha.getMonth()+1; //January is 0!
      var yyyy = dteFecha.getFullYear();

      if(dd<10) {
          dd='0'+dd
      } 

      if(mm<10) {
          mm='0'+mm
      } 
      //La fecha actual será dia/mes/año
      dteFecha = dd+'-'+mm+'-'+yyyy;

      //Regresar fecha actual
      return dteFecha;

 }


$( document ).ready(function() {
   $('#wellContenido').removeClass("span10").addClass("span20");

   $("#txtEmpleado").autocomplete("catalogos/empleados/autocomplete", 
      { minChars:1,matchSubset:1,matchContains:1,cacheLength:6,onItemSelect:null,selectOnly:0,remoteDataType:"json"} 
   );

   $('.datetimepicker').datetimepicker({
        language: 'es',
        pick12HourFormat: true
    });

   $('.datepicker').datetimepicker({
        language: 'es',
        pick12HourFormat: true
    });
    var now = new Date();
    var utc = new Date(Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes()
    ));

    $('.datetimepicker').datetimepicker("setDate",utc);

    $('#myModal').on('shown', function () {
       cmbPrivadaBusqueda_set();
       $('#txtNombre_Buscar').focus();
       $('#txtFechaIni_Buscar').val(fnRegresarFechaActual());
       $('#txtFechaFin_Buscar').val(fnRegresarFechaActual());
        paginacion(true);
       
     });

    $('#myModalSeguimiento').on('shown', function () {
       pagina = 0;
       paginacion_seguimiento();
       $('#txtComentario').focus();
     });

    $('#pagLinks').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacion_seguimiento();
     });

  

    $('#pagLinksBusqueda').on('click','a',function(event){
        event.preventDefault();
        paginaBusqueda = $(this).attr('href').replace('/','');
        paginacion();
     });


   cmbPrivada_set();

    $("#txtEmpleado").focus();

});
</script>