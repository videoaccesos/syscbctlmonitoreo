<form id="frmOrdensServicio" action="#" method="post" onsubmit="return(false)" style="margin-bottom:5px;">
				<div style="width:465px; display:inline-block; padding-right:17px;">     
					<div>
              <div style="display:inline-block;padding-right:15px;">
                <input id="txtOrdenServicioID" type="hidden">
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
                <input id="txtFechaHora" type="text" tabindex="2" style="width:150px;" disabled>
              </div>

              <div style="display:inline-block;">
                <label for="cmbEstatusID">Estado</label>
                <input id="txtEstadoID" type="hidden" value="0">
                <input id="txtEstado" type="text" style="width:110px;text-align:center;" tabindex="3" value="NUEVO" disabled> 
              </div>
					</div>
					
					<div>
						<div style="display:inline-block; padding-right:17px;">
                <label for="txtEmpleado">Empleado</label>
                  <input id="txtEmpleadoID" type="hidden" value="<?php echo $empleado_id;?>">
                  <input id="txtEmpleado" style="width:446px;" value="<?php echo $empleado; ?>"  type="text" disabled>
						</div>
					</div>
         
          <div>
            <div style="display:inline-block; padding-right:17px;">
                <label for="cmbPrivadaID">Privada</label>
                <select id="cmbPrivadaID" style="width:460px;" tabindex="4"> </select>
            </div>
          </div>
          <div>
            <div style="display:inline-block; padding-right:17px;">
                <label for="cmbTecnicoID">Tecnico</label>
                <select id="cmbTecnicoID" style="width:460px;" tabindex="5"> </select>
            </div>
          </div>

          <div>
            <div style="display:inline-block; padding-right:17px;">
                <label for="cmbCodigoServicioID">Codigo de Servicio</label>
                <select id="cmbCodigoServicioID" style="width:460px;" tabindex="6"> </select> 
            </div>
          </div>

          <div>
            <div>
            <label for="txtDetalleServicio">Detalle del Servicio</label>
            <textarea id="txtDetalleServicio" class="span6" rows="4" tabindex="7"></textarea>
            </div>
          </div>

          <div>
              <div style="display:inline-block;padding-right:15px;">
                <label>Fecha/Hora de Asistencia</label>
                <div class="input-append datetimepicker">
                  <input id="txtFechaHoraAsistio" class="span2" data-format="dd-MM-yyyy hh:mm" type="text" tabindex="8">
                  <span class="add-on">
                    <i data-time-icon="icon-time" data-date-icon="icon-calendar" class="icon-calendar"></i>
                  </span>
                </div>
              </div>
              <div style="display:inline-block;float:right;padding-right:5px;">
                <label for="txtTiempo">Tiempo</label>
                <div class="input-append">
                  <input id="txtTiempo" style="width:80px;" value="0" onblur="fnFormato(this,0);" type="text" tabindex="9">
                  <span class="add-on"> Min. </span>
                </div>
              </div>
          </div>
				</div>
				<div style="display:inline-block; vertical-align: top;">
          <div class="btn-group" style="float:right;padding-right:17px;padding-top:20px;">
              <a type="button" class="btn" tabindex="14" onClick="fnNuevo()"><i class="icon-file"></i> Nuevo</a>   
              <a type="button"  class="btn" tabindex="15" onClick="fnSeguimiento()"><i class="icon-time "></i>  Seguimiento</a> 
              <a type="button"  class="btn" tabindex="16" onClick="fnMaterial()"><i class="icon-list"></i>  Materiales</a> 
              <a href="#myModal" type="button" data-toggle="modal" class="btn btn-inverse" tabindex="17" onBlur="$('#txtFolio').focus();"><i class="icon-search icon-white"></i>  Buscar</a>                                             
          </div>
					<div style="padding-top:65px;">
					<div style="display:inline-block; padding-right:17px;">
                <label for="cmbDiagnosticoID">Diagnostico</label>
                <select id="cmbDiagnosticoID" style="width:460px;" tabindex="10"> </select> 
            </div>
          </div>
        
          <div>
            <div>
            <label for="txtDetalleDiagnostico">Detalle del Diagnostico</label>
            <textarea id="txtDetalleDiagnostico" class="span6" rows="4" tabindex="11"></textarea>
            </div>
          </div>
          <?php 
            if($puesto_id == 6)
            echo '<div id="btnCerrar" class="btn-group" style="float:left;padding-top:3px;display:none;">
                    <a href="#myModalCerrarOrden" type="button" data-toggle="modal" class="btn btn-success" tabindex="13"><i class="icon-lock icon-white"></i>  Cerrar Orden</a>
                   </div>';
           ?>
           
          <div id="btnGuardar" class="btn-group" style="float:right;padding-right:17px;padding-top:3px;">
              <a type="button" class="btn btn-primary" data-toggle="modal" onClick="fnGuardar()" tabindex="12"><i class="icon-hdd icon-white"></i>  Guardar</a>
          </div>

          <div id="btnSolucionar" class="btn-group" style="float:right;padding-right:17px;padding-top:3px;display:none;">
              <a type="button" class="btn btn-success" data-toggle="modal" onClick="fnSolucionar()" tabindex="12"><i class="icon-ok icon-white"></i>  Solucionada</a>
          </div>
        
          <div id="divCerrarOrden" style="display:none;margin-top:30px;">
            <label><h5>Detalles del Cierre</h5></label>
            <div style="display:inline-block;padding-right:15px;">
              <label >Tecnico de Cierre</label>
              <input id="txtTecnicoCierre" style="width:280px;" value="" type="text" disabled>
            </div>
            <div style="display:inline-block">
                <label>Fecha/Hora</label>
                <input id="txtFechaHoraCierre" type="text" style="width:130px;" disabled="">
              </div>
            <label>Comentario del Cierre</label>
            <textarea id="txtComentarioCierre" class="span6" rows="4" disabled></textarea>
          </div>
				</div>
</form>

    <!-- Modal -->
    <div id="myModal" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="top:10%; margin-left:5%; width:886px; left:10%;" >
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
        <h3 id="myModalLabel">Buscar</h3>
      </div>
      <div class="modal-body" style="max-height:100%; height:100%;">
          <div style="display:inline-block;">
            <div style="width:100%; display:inline-block;">     
              <div>
                <div style="display:inline-block; padding-right:17px;">
                  <label for="txtFechaIni_Buscar">Fecha Inicial</label>
                   <div class="input-append datepicker">
                      <input id="txtFechaIni_Buscar" style="width:80px;" data-format="dd-MM-yyyy" type="text" tabindex="21">
                      <span class="add-on">
                        <i data-time-icon="icon-time" data-date-icon="icon-calendar" class="icon-calendar"></i>
                      </span>
                   </div>  
                </div>
                <div style="display:inline-block; padding-right:17px;">
                  <label for="txtFechaFin_Buscar">Fecha Final</label>
                   <div class="input-append datepicker">
                      <input id="txtFechaFin_Buscar" style="width:80px;" data-format="dd-MM-yyyy" type="text" tabindex="22">
                      <span class="add-on">
                        <i data-time-icon="icon-time" data-date-icon="icon-calendar" class="icon-calendar"></i>
                      </span>
                   </div> 
                </div>
                <div style="display:inline-block; padding-right:17px;">
                    <label for="cmbEstatusID_Buscar">Estado</label>
                    <select id="cmbEstatusID_Buscar" style="width:140px;" tabindex="23"> 
                      <option value="0">[TODAS]</option>
                      <option value="1">ABIERTA</option>
                      <option value="2">SOLUCIONADA</option>
                      <option value="3">CERRADA</option>
                    </select>
                </div>
                <div style="display:inline-block; margin-top: -15px;"> 
                  <button type="button" class="btn" tabindex="24" onclick="paginacion();" style="margin-top:-7px;"> Buscar <i class="icon-search"></i></button>
                </div>
              </div>
            </div>
            <div style="width:100%; display:inline-block;">
              <div class= "well" style="margin: 0px; padding: 0px 0px 0px 0px; height:270px; ">
                <table class="table table-stripped" id="dgOrdenes" style="margin:0px;">
                  <thead>
                    <tr>
                      <th width="80px;">Fecha</th>
                      <th width="70px;">Folio</th>
                      <th >Privada</th>
                      <th >Tecnico</th>
                      <th >Tecnico de Cierre</th>
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
        <div class="modal-footer">
                <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="25" onBlur="$('#txtFechaIni_Buscar').focus();">Cancelar</button>
        </div>
    </div>  

    <script id="plantilla_ordenes" type="text/template">
      {{#rows}}
      <tr>
        <td>{{fecha}}</td>
        <td>{{folio}}</td>
        <td>{{privada}}</td>
        <td>{{tecnico}}</td>
        <td>{{tecnico_cierre}}</td>
        <td>{{estatus}}</td>
        <td><a onclick="fnEditar({{orden_servicio_id}})" class="btn btn-mini"><i class="icon icon-pencil"></i></a></td>
      </tr>
      {{/rows}}
      {{^rows}}
      <tr> 
        <td colspan="6"> No se Encontraron Resultados!!</td>
      </tr> 
      {{/rows}}
    </script>     

    <!-- Modal Seguimiento -->
    <div id="myModalSeguimiento" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="top:5%; margin-left:5%; width:775px; left:15%;" >
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
        <h3 id="myModalLabel">Seguimiento</h3>
      </div>
      <div class="modal-body" style="max-height:100%; height:100%;">
          <div style="display:inline-block;">
            <div id="divAgregarSeguimiento" style="width:100%; display:inline-block;">     
              <div>
                <div style="display:inline-block; padding-right:17px;">
                  <label for="txtNombre_Buscar">Comentario</label>
                  <input class="span8" id="txtComentario" tabindex="26" type="text" placeholder="Ingresa Comentario">
                </div>
                <div style="display:inline-block; margin-top: -15px;"> 
                  <button type="button" class="btn" tabindex="27" onclick="fnGuardarSeguimiento();" style="margin-top:-7px;"><i class="icon-plus"></i> Agregar </button>
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
                <div id="pagLinks_seguimiento"  style="float:left;margin-right:10px;"></div>
                <div style="float:right;margin-right:10px;"><strong id="numElementos_seguimiento">0</strong> Encontrados</div>
                <br>
             </div>
            </div>
          </div>
      </div>
      <div class="modal-footer">
              <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="28" onBlur="$('#txtComentario').focus()">Cerrar</button>
      </div>
    </div> 
    
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

    <!-- Modal Material -->
    <div id="myModalMaterial" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="top:5%; margin-left:5%; width:615px; left:20%;" >
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
        <h3 id="myModalLabel">Materiales</h3>
      </div>
      <div class="modal-body" style="max-height:100%; height:100%;">
          <div style="display:inline-block;width: 100%;">
            <div id="divAgregarMaterial" style="display:inline-block;">     
              <div>
                <div style="display:inline-block;padding-right:15px;">
                  <label for="txtCantidad">Cantidad</label>
                    <input id="txtCantidad" style="width:80px;" value="1" onblur="fnFormato(this,0);" type="text" tabindex="31">
                </div>
                <div style="display:inline-block; padding-right:17px;">
                  <label for="cmbMaterialID">Material</label>
                  <select style="width:350px;" id="cmbMaterialID" tabindex="32">
                  </select>
                </div>
                <div style="display:inline-block; margin-top: -15px;"> 
                  <button type="button" class="btn" tabindex="33" onclick="fnGuardarMaterial();" style="margin-top:-7px;"><i class="icon-plus"></i> Agregar </button>
                </div>
              </div>
            </div>
            <div style="width:100%; display:inline-block;">
              <div class= "well" style="margin: 0px; padding: 0px 0px 0px 0px; min-height:250px; ">
                <table class="table table-stripped" id="dgMateriales" style="margin:0px;">
                  <thead>
                    <tr>
                      <th width="40px;">Cant.</th>
                      <th >Material</th>
                      <th width="30px;"></th>
                    </tr>
                  </thead>
                  <tbody>
                  </tbody>
                </table>
              </div>
              <div style="dysplay: inline-block;margin-top:10px;">
                <div id="pagLinks_materiales"  style="float:left;margin-right:10px;"></div>
                <div style="float:right;margin-right:10px;"><strong id="numElementos_materiales">0</strong> Encontrados</div>
                <br>
             </div>
            </div>
          </div>
      </div>
      <div class="modal-footer">
              <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="34" onBlur="$('#txtCantidad').focus()">Cerrar</button>
      </div>
    </div> 
    
    <script id="plantilla_materiales" type="text/template">
      {{#rows}}
      <tr>
        <td>{{cantidad}}</td>
        <td>{{descripcion}}</td>
        <td><a onclick="fnEliminarMaterial({{material_id}})" class="btn btn-mini"><i class="icon icon-trash"></i></a></td>
      </tr>
      {{/rows}}
      {{^rows}}
      <tr> 
        <td colspan="3"> No se Encontraron Resultados!!</td>
      </tr> 
      {{/rows}}
    </script> 

    <script id="plantilla_materiales_undelete" type="text/template">
      {{#rows}}
      <tr>
        <td>{{cantidad}}</td>
        <td>{{descripcion}}</td>
        <td></td>
      </tr>
      {{/rows}}
      {{^rows}}
      <tr> 
        <td colspan="3"> No se Encontraron Resultados!!</td>
      </tr> 
      {{/rows}}
    </script> 

    <script id="plantilla_material" type="text/template"> 
      {{#materiales}}
        <option value="{{value}}">{{nombre}}</option>
      {{/materiales}} 
    </script>  

    <!-- Modal Cerrar Orden -->
    <div id="myModalCerrarOrden" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="top:15%; margin-left:15%; width:350px; left:20%;" >
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
        <h3 id="myModalLabel">Cerrar Orden de Servicio</h3>
      </div>
      <div class="modal-body" style="max-height:100%; height:100%;">
          <div style="display:inline-block;">
              <div style="display:inline-block;padding-right:15px;">
                  <label >Tecnico de Cierre</label>
                  <input id="txtTecnicoCierreID_Cierre" type="hidden" value="<?php echo $empleado_id;?>">
                  <input id="txtTecnicoCierre_Cierre" style="width:290px;" value="<?php echo $empleado; ?>" type="text" disabled>
              </div>
              <div style="width:100%; display:inline-block;">     
                <div style="display:inline-block; padding-right:17px;">
                  <label for="txtComentarioCierre_Cierre">Comentario</label>
                  <textarea id="txtComentarioCierre_Cierre" class="span4" rows="5" tabindex="41"></textarea>
                </div>
              </div>
          </div>
          <a type="button" class="btn btn-success" tabindex="42" style="margin-left: 175px;" onClick="fnCerrarOrden();"><i class="icon-ok icon-white"></i>  Cerrar Orden</a>
      </div>
      <div class="modal-footer">
              <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="43" onBlur="$('#txtComentarioCierre_Cierre').focus()">Cancelar</button>
      </div>
    </div>

<script id="plantilla_privadas" type="text/template"> 
  {{#privadas}}
    <option value="{{value}}">{{nombre}}</option>
  {{/privadas}} 
</script>

<script id="plantilla_codigos_servicio" type="text/template"> 
  {{#codigosservicio}}
    <option value="{{value}}">{{nombre}}</option>
  {{/codigosservicio}} 
</script>  

<script id="plantilla_diagnosticos" type="text/template"> 
  <option value="0" selected>[ Pendiente ]</option>
  {{#diagnosticos}}
    <option value="{{value}}">{{nombre}}</option>
  {{/diagnosticos}} 
</script>  

<script id="plantilla_empleados" type="text/template"> 
  <option value="0" selected>[ Pendiente ]</option>
  {{#empleados}}
    <option value="{{value}}">{{nombre}}</option>
  {{/empleados}} 
</script>

         
<script type="text/javascript">
var bolPagina = false;
var strUltimaBusqueda = "";
var strFollioAnt = "";
var pagina = 0;
var bolGuardando = false;

function paginacion(varP) {
    if(varP) bolPagina = varP;
    if($('#txtFechaIni_Buscar').val()+$('#txtFechaFin_Buscar').val()+$('#cmbEstatusID_Buscar').val() != strUltimaBusqueda){
      bolPagina = true;
      pagina = 0;
    }
    if(bolPagina)
    $.post('procesos/ordenesservicio/paginacion',
                 {strFechaIni: fnInvFecha($('#txtFechaIni_Buscar').val()),
                  strFechaFin: fnInvFecha($('#txtFechaFin_Buscar').val()),
                  intEstatusID: $('#cmbEstatusID_Buscar').val(),
                  intPagina: pagina
                 },
                  function(data) {
                    $('#dgOrdenes tbody').empty();
                    var temp = Mustache.render($('#plantilla_ordenes').html(),data);
                    $('#dgOrdenes tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                    strUltimaBusqueda = $('#txtFechaIni_Buscar').val()+$('#txtFechaFin_Buscar').val()+$('#cmbEstatusID_Buscar').val();
                    bolPagina = false;
                  }
                 ,
          'json');
}

// Seguimiento
//*********************************
function paginacion_seguimiento() {
    $.post('procesos/ordenesservicio/paginacion_seguimiento',
                 {intOrdenServicioID:$('#txtOrdenServicioID').val(),
                  intPagina:pagina},
                  function(data) {
                    $('#dgSeguimientos tbody').empty();
                    var temp = Mustache.render($('#plantilla_seguimiento').html(),data);
                    $('#dgSeguimientos tbody').html(temp);
                    $('#pagLinks_seguimiento').html(data.paginacion);
                    $('#numElementos_seguimiento').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
}

function fnSeguimiento(){
  res = parseInt($('#txtOrdenServicioID').val());
  if(!isNaN(res)){
    $('#myModalSeguimiento').modal('show');
    paginacion_seguimiento();
  }
}

function fnGuardarSeguimiento(){
      $.post('procesos/ordenesservicio/guardar_seguimiento',
                { intOrdenServicioID: $('#txtOrdenServicioID').val(),
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

// Materiales
//************************************
function paginacion_material() {
    $.post('procesos/ordenesservicio/paginacion_material',
                 {intOrdenServicioID:$('#txtOrdenServicioID').val(),
                  intPagina:pagina},
                  function(data) {
                    $('#dgMateriales tbody').empty();
                    if($('#txtEstadoID').val() == 3)
                      var temp = Mustache.render($('#plantilla_materiales_undelete').html(),data);
                    else
                      var temp = Mustache.render($('#plantilla_materiales').html(),data);
                    $('#dgMateriales tbody').html(temp);
                    $('#pagLinks_materiales').html(data.paginacion);
                    $('#numElementos_materiales').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
}

function fnGuardarMaterial(){
      $.post('procesos/ordenesservicio/guardar_material',
                { intOrdenServicioID: $('#txtOrdenServicioID').val(),
                  intMaterialID: $('#cmbMaterialID').val(),
                  dblCantidad: $('#txtCantidad').val()
                },
                function(data) {
                  if(data.resultado){
                    paginacion_material();
                    $('#txtCantidad').val('1');
                    $('#cmbMaterialID').val('0');
                    $('#txtCantidad').focus();
                  }
                  $('#divMensajes').html(data.mensajes);
                }
               ,
        'json');
}

function fnEliminarMaterial(id){
      $.post('procesos/ordenesservicio/eliminar_material',
                { intOrdenServicioID: $('#txtOrdenServicioID').val(),
                  intMaterialID: id
                },
                function(data) {
                  if(data.resultado){
                    paginacion_material();
                    $('#txtCantidad').val('0');
                    $('#cmbMaterialID').val('0');
                    $('#txtCantidad').focus();
                  }
                  $('#divMensajes').html(data.mensajes);
                }
               ,
        'json');
}

function fnMaterial(){
  res = parseInt($('#txtOrdenServicioID').val());
  if(!isNaN(res)){
    $('#myModalMaterial').modal('show');
    paginacion_material();
  }
}

// Form
//***********************************
function fnNuevo() {
  $('#frmOrdensServicio')[0].reset();
  $('#txtOrdenServicioID').val('');
  if($('#btnCerrar').length) $('#btnCerrar')[0].style.display = 'none' ;
  $('#txtComentarioCierre_Cierre').val('');
  $('#divCerrarOrden')[0].style.display = 'none';
  $('#divAgregarMaterial')[0].style.display = 'inline-block';
  $('#divAgregarSeguimiento')[0].style.display = 'inline-block';
  $('#btnGuardar')[0].style.display = '';
  $('#btnSolucionar')[0].style.display = 'none';
  var now = new Date();
  var utc = new Date(Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes()
  ));
  $('.datetimepicker').datetimepicker("setDate",utc);
  $('#cmbPrivadaID').focus();
}

function fnEditar(id){
    $.post('procesos/ordenesservicio/editar',
              { intOrdenServicioID:id
              },
              function(data) {
                $('#divMensajes').html(data.mensajes);
                if(data.row){
                  fnSetOrdenes(data);
                }
              }
             ,
      'json');
}

function fnSetOrdenes(data){
    fnNuevo();
    $('#txtOrdenServicioID').val(data.row.orden_servicio_id);
    strFollioAnt = data.row.folio;
    $('#txtFolio').val(data.row.folio);
    $('#txtFechaHora').val(data.row.fecha);
    $('#txtEstadoID').val(data.row.estatus_id);
    $('#txtEstado').val(data.row.estatus);
    $('#txtEmpleadoID').val(data.row.empleado_id);
    $('#txtEmpleado').val(data.row.empleado);
    $('#cmbPrivadaID').val(data.row.privada_id);
    $('#cmbTecnicoID').val(data.row.tecnico_id);
    $('#txtFechaHoraAsistio').val(data.row.fecha_asistio);
    $('#txtTiempo').val(data.row.tiempo);
    $('#cmbCodigoServicioID').val(data.row.codigo_servicio_id);
    $('#txtDetalleServicio').val(data.row.detalle_servicio);
    $('#cmbDiagnosticoID').val(data.row.diagnostico_id);
    $('#txtDetalleDiagnostico').val(data.row.detalle_diagnostico);
    $('#txtTecnicoCierre').val(data.row.cierre_tecnico);
    $('#txtFechaHoraCierre').val(data.row.cierre_fecha);
    $('#txtComentarioCierre').val(data.row.cierre_comentario);
    if(data.row.estatus_id == 1)
      if($('#btnSolucionar').length) $('#btnSolucionar')[0].style.display = '';
    if(data.row.estatus_id == 2){
      if($('#btnCerrar').length) $('#btnCerrar')[0].style.display = '';
      $('#btnGuardar')[0].style.display = 'none'; 
    }
    if(data.row.estatus_id == 3){
      $('#divCerrarOrden')[0].style.display = 'inline-block'; 
      $('#btnGuardar')[0].style.display = 'none'; 
      $('#btnSolucionar')[0].style.display = 'none'; 
      $('#divAgregarMaterial')[0].style.display = 'none';
      $('#divAgregarSeguimiento')[0].style.display = 'none';
    }
    $('#myModal').modal('hide');
    $('#cmbPrivadaID').focus();
}

function txtFolio_onFocus(obj){
   strFollioAnt = obj.value;
}

function txtFolio_onBlur(obj){
  if(strFollioAnt != obj.value){
    $.post('procesos/ordenesservicio/editar',
          { strFolio: obj.value
          },
          function(data) {
            $('#divMensajes').html(data.mensajes);
            if(data.row){
              fnSetOrdenes(data);
            }
            else {
              fnNuevo();
            }
          }
         ,
      'json');
  }
}

function fnValidar(){
  if(bolGuardando){
    return false
  }
  return true;
}

function fnValidarCierre(){

}

function fnGuardar(){
  if(fnValidar()) {
      bolGuardando = true;
      $.post('procesos/ordenesservicio/guardar',
                { intOrdenServicioID: $('#txtOrdenServicioID').val(),
                  strFecha: $('#txtFechaHora').val(),
                  intEmpleadoID: $('#txtEmpleadoID').val(),
                  intPrivadaID: $('#cmbPrivadaID').val(),
                  intTecnicoID: $('#cmbTecnicoID').val(),
                  strFechaAsistio: $('#txtFechaHoraAsistio').val(),
                  intTiempo: $('#txtTiempo').val(),
                  intCodigoServicioID: $('#cmbCodigoServicioID').val(),
                  strDetalleServicio: $('#txtDetalleServicio').val(),
                  intDiagnosticoID: $('#cmbDiagnosticoID').val(),
                  strDetalleDiagnostico: $('#txtDetalleDiagnostico').val()
                },
                function(data) {
                  if(data.resultado){
                    fnNuevo();
                  }
                  $('#divMensajes').html(data.mensajes);
                  bolGuardando = false;
                }
               ,
        'json');
  }
}

function fnSolucionar(){
  if(fnValidar()) {
      bolGuardando = true;
      $.post('procesos/ordenesservicio/solucionar',
                { intOrdenServicioID: $('#txtOrdenServicioID').val(),
                  strFecha: $('#txtFechaHora').val(),
                  intEmpleadoID: $('#txtEmpleadoID').val(),
                  intPrivadaID: $('#cmbPrivadaID').val(),
                  intTecnicoID: $('#cmbTecnicoID').val(),
                  strFechaAsistio: $('#txtFechaHoraAsistio').val(),
                  intTiempo: $('#txtTiempo').val(),
                  intCodigoServicioID: $('#cmbCodigoServicioID').val(),
                  strDetalleServicio: $('#txtDetalleServicio').val(),
                  intDiagnosticoID: $('#cmbDiagnosticoID').val(),
                  strDetalleDiagnostico: $('#txtDetalleDiagnostico').val(),
                  intEstatusID: $('#txtEstadoID').val(),
                },
                function(data) {
                  if(data.resultado){
                    fnNuevo();
                  }
                  $('#divMensajes').html(data.mensajes);
                  bolGuardando = false;
                }
               ,
        'json');
  }
}

<?php if($puesto_id == 6) { ?>
  function fnCerrarOrden(){
    $.post('procesos/ordenesservicio/cerrar',
              {   intOrdenServicioID: $('#txtOrdenServicioID').val(),
                  strFecha: $('#txtFechaHora').val(),
                  intEmpleadoID: $('#txtEmpleadoID').val(),
                  intPrivadaID: $('#cmbPrivadaID').val(),
                  intTecnicoID: $('#cmbTecnicoID').val(),
                  strFechaAsistio: $('#txtFechaHoraAsistio').val(),
                  intTiempo: $('#txtTiempo').val(),
                  intCodigoServicioID: $('#cmbCodigoServicioID').val(),
                  strDetalleServicio: $('#txtDetalleServicio').val(),
                  intDiagnosticoID: $('#cmbDiagnosticoID').val(),
                  strDetalleDiagnostico: $('#txtDetalleDiagnostico').val(),
                  intEstatusID: $('#txtEstadoID').val(),
                  strComentario: $('#txtComentarioCierre_Cierre').val()
              },
              function(data) {
                if(data.resultado){
                  fnNuevo();
                  $('#myModalCerrarOrden').modal('hide');
                }
                $('#divMensajes').html(data.mensajes);
              }
             ,
      'json');
  }
<?php } ?>

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

function cmbTecnico_set() {
    $.post('catalogos/empleados/opciones',
        { intPuestoID: 6},
        function(data) {
          $('#cmbTecnicoID').empty();
          var temp = Mustache.render($('#plantilla_empleados').html(),data);
          $('#cmbTecnicoID').html(temp);
        }
        ,'json');
}

function cmbCodigoServicio_set() {
    $.post('catalogos/codigosservicio/opciones',
        {},
        function(data) {
          $('#cmbCodigoServicioID').empty();
          var temp = Mustache.render($('#plantilla_codigos_servicio').html(),data);
          $('#cmbCodigoServicioID').html(temp);
        }
        ,'json');
}

function cmbDiagnostico_set() {
    $.post('catalogos/diagnosticos/opciones',
        {},
        function(data) {
          $('#cmbDiagnosticoID').empty();
          var temp = Mustache.render($('#plantilla_diagnosticos').html(),data);
          $('#cmbDiagnosticoID').html(temp);
        }
        ,'json');
}

function cmbMaterial_set() {
    $.post('catalogos/materiales/opciones',
        {},
        function(data) {
          $('#cmbMaterialID').empty();
          var temp = Mustache.render($('#plantilla_material').html(),data);
          $('#cmbMaterialID').html(temp);
        }
        ,'json');
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
       paginacion(true);
       $('#cmbEstatusID_Buscar').focus();
     });

    $('#myModalSeguimiento').on('shown', function () {
       pagina = 0;
       paginacion_seguimiento();
       $('#txtComentario').focus();
     });

    $('#myModalMaterial').on('shown', function () {
       pagina = 0;
       paginacion_material();
       $('#txtCantidad').focus();
     });

    $('#pagLinks').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacion(true);
     });

    $('#pagLinks_seguimiento').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacion_seguimiento();
     });

    $('#pagLinks_materiales').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacion_material();
     });
    
   cmbPrivada_set();
   cmbTecnico_set();
   cmbCodigoServicio_set();
   cmbDiagnostico_set();
   cmbMaterial_set();
   $('#cmbPrivadaID').focus();
});
</script>