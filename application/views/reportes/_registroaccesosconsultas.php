
<form id="frmReporte" action="reports/registros_accesos_consultas/historial.php" method="post" target="_blank" style="margin:0px;" accept-charset="ISO-8859-1">
      <div style="display:inline-block;">
        <label for="dtFechaIni">Fecha/Hora Inicio</label>
    <!--<div class="input-append date datepicker">
            <input id="dtFechaIni"  name="strFechaIni" class="span2" type="text" tabindex="1"><span class="add-on"><i class="icon-th"></i></span>
        </div>-->
        <div class="input-append datetimepicker" >
          <input id="dtFechaIni" name="strFechaHoraInicio" class="span2" data-format="dd-MM-yyyy hh:mm" type="text" tabindex="1"></input>
          <span class="add-on">
            <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
          </span>
        </div>
      &nbsp;&nbsp;&nbsp;&nbsp;
      </div>
      <div style="display:inline-block;padding-right:17px;">
        <label for="dtFechaFin">Fecha/Hora Final</label>
        <!--<div class="input-append date datepicker">
            <input id="dtFechaFin" name="strFechaFin" class="span2" type="text" tabindex="2"><span class="add-on"><i class="icon-th"></i></span>
          </div> -->
          <div class="input-append datetimepicker" >
            <input id="dtFechaFin" name="strFechaHoraFin" class="span2" data-format="dd-MM-yyyy hh:mm" type="text" tabindex="2"></input>
            <span class="add-on">
              <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
            </span>
          </div>
      </div>
      <div style="display:inline-block;padding-right:17px;">
          <label for="cmbPrivadaID">Privada</label>
          <input type="hidden" id="txtPrivada" name="strPrivada">
          <select id="cmbPrivadaID" name="intPrivadaID" style="width:170px;" tabindex="3"></select>
      </div>
      <div style="display:inline-block;padding-right:17px;">
        <label for="txtResidencia">Residencia</label>
        <div class="input-append">
          <input type="hidden" id="txtResidenciaID" name="intResidenciaID" value="0">
          <input type="text" id="txtResidencia" name="strResidencia" class="span3" tabindex="4">
          <span class="add-on" style="padding-left:12px;padding-right:12px;"><i class="icon-search"></i></span>
        </div>
      </div>
      <div style="display:inline-block;padding-right:17px;">
        <label for="txtSolicitante">Solicitante</label>
        <div class="input-append">
          <input type="hidden" id="txtSolicitanteID" name ="strSolicitanteID">
          <input type="text" id="txtSolicitante" name="strSolicitante" class="span3" tabindex="5">
          <span class="add-on" style="padding-left:12px;padding-right:12px;"><i class="icon-search"></i></span>
        </div>
      </div>

      <div style="display:inline-block;padding-right:17px;">
          <label for="cmbOperadorID">Operador</label>
          <input type="hidden" id="txtOperador" name ="strOperador">
          <select id="cmbOperadorID" name="intOperadorID" style="width:167px;" tabindex="6"></select>
      </div>
      <div  style="display:inline-block; padding-right:17px;">
        <label for="cmbTipoGestion">Tipo de Gestión</label>
          <input type="hidden" id="txtTipoGestion" name ="strTipoGestion">
          <select id="cmbTipoGestionID" name="intTipoGestionID" style="width:170px;"  tabindex="7">
            <option value="0" selected>[ Todas ]</option>
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
       <div  style="display:inline-block; padding-right:17px;">
        <input type="hidden" id="txtEstado" name ="strEstatus">
        <label for="cmbEstadoID">Estado</label>
          <select id="cmbEstadoID" name="intEstatusID" style="width:170px;"  tabindex="8">
            <option value="0" selected>[ Todos ]</option>
            <option value="1">Acceso</option>
            <option value="2">Rechazado</option>
            <option value="3">Infomrado</option>
          </select>
      </div>
      <div style="display:inline-block; padding-right:17px;">
        <button type="button" class="btn" tabindex="9" onClick="paginacion();" style="margin-top:-7px;"> Filtrar <i class="icon-search"></i></button>
      </div>
      <div style="display:inline-block; padding-right:17px;">
        <button type="button" class="btn" tabindex="10" onClick="fnNuevo();" style="margin-top:-7px;"> Limpiar <i class="icon-file"></i></button>
      </div>
      <div style="display:inline-block; padding-right:17px;">
          <button type="submit" class="btn btn-primary" tabindex="11" style="margin-top:-7px;">
            Exportar a XLS  <i class="icon-download-alt icon-white"></i> 
          </button> 
      </div> 
</form>

        <table class="table table-stripped" id="dgAccesos">
            <thead>
                <tr>
                  <th width="120px">Fecha / Hora</th>
                  <th width="150px">Privada</th>
                  <th >Residencia</th>
                  <th >Solicitante</th>
                  <th >Operador</th>
                  <th width="100px">Gestion</th>
                  <th width="80px">Estado</th>
                  <th width="20px"></th>
                </tr>
            </thead>
            <tbody>
            </tbody>
            <script id="plantilla_accesos" type="text/template">
              {{#rows}}
              <tr><td>{{fecha}}</td>
                  <td>{{privada}}</td>
                  <td>{{nro_casa}}, {{calle}}</td>
                  <td>
                    {{#imagen}}
                      {{#subida}}<i class="icon-picture icon-white"></i>{{/subida}}{{^subida}}<i class="icon-picture"></i>{{/subida}}
                      <a href="http://www.videoaccesos.com/detalles_notificacion.php?img={{imagen}}" target="_blank" style="text-decoration: underline;">
                    {{/imagen}}
                    {{solicitante}}
                    {{#imagen}}
                      <a>
                    {{/imagen}}
                  </td>
                  <td>{{operador}}</td>
                  <td>{{tipo_gestion}}</td>   
                  <td>{{estado}}</td>
                  <td> <button class="btn btn-mini" type="button" onClick="fnLoadSupervision({{registro_acceso_id}})"><i class="icon-eye-open {{^supervicion}}icon-white{{/supervicion}} icon-black"></i></button></td>
              </tr>
              {{/rows}}
              {{^rows}}
              <tr> 
                <td colspan="8"> No se Encontraron Resultados!!</td>
              </tr> 
              {{/rows}}

            </script>
        </table>

        <div style="dysplay: inline-block;">
          <div id="pagLinks"  style="float:left;margin-right:10px;"></div>
          <div style="float:right;margin-right:10px;"><strong id="numElementos">3</strong> Encontrados</div>
          <br>
       </div>

<script id="plantilla_privadas" type="text/template"> 
 <option value="0" selected>[ Todas ]</option>
  {{#privadas}}
    <option value="{{value}}">{{nombre}}</option>
  {{/privadas}} 
</script>
<script id="plantilla_empleados" type="text/template"> 
  <option value="0" selected>[ Todos ]</option>
  {{#empleados}}
    <option value="{{value}}">{{nombre}}</option>
  {{/empleados}} 
</script>
         
<!-- Modal -->
<div id="myModalSupervision" class="modal hide fade" role="dialog" aria-labelledby="myModalLabelSupervision" aria-hidden="true" style="top:15%; width:770px; left:43%;" >
  <div class="modal-header">
    <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="12">×</button>
    <h3 id="myModalLabelSupervision">Supervision de Llamada</h3>
  </div>
  <div class="modal-body" style="max-height:100%; height:100%;">
      <form id="frmSupervicion" action="#" method="post" onsubmit="return(false)" style="margin-bottom:0px;" >    
        <div style="width:510px; display:inline-block;">     
          <div>
            <div class="input-append" style="display:inline-block;padding-right:17px;">
              <input id="txtSupervisorID" type="hidden">
              <label for="txtSupervisor">Supervisor</label>
              <input style="width:265px;" id="txtSupervisor" type="text" placeholder="Ingresa Supervisor" tabindex="13">
              <span class="add-on"><i class="icon-search"></i></span>
            </div>
            <div class="input-append datetimepicker" style="display:inline-block;" >
                <label for="dtFechaHora">Fecha / Hora</label>
                    <input id="dtFechaHora" class="span2" data-format="dd-MM-yyyy hh:mm" type="text" tabindex="14"></input>
                    <span class="add-on">
                      <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
                    </span>
                </div>
          </div>
          <div>
            <div style="display:inline-block;padding-right:17px;">
              <label for="txtRegistroAccesoID">Folio</label>
              <input class="span2"  id="txtRegistroAccesoID" type="text" style="width:100px;" disabled>
            </div>
            <div style="display:inline-block;padding-right:17px;">
              <label for="txtFechaHorallamada">Fecha / Hora </label>
              <input id="txtFechaHorallamada" type="text" style="width:105px" disabled>
            </div>
            <div style="display:inline-block;">
              <label for="txtPrivada_SupervisionLlamadas">Privada</label>
              <input class="span3" id="txtPrivada_SupervisionLlamadas" type="text" disabled>
            </div>
          </div>
          <div>
            <div style="display:inline-block; padding-right:17px;">
              <label for="txtOperador_SupervisionLlamadas">Operador</label>
              <input style="width:240px;" id="txtOperador_SupervisionLlamadas" type="text" disabled>
            </div>

            <div style="display:inline-block;">
              <label for="txtTipoGestion_SupervisionLlamadas">Tipo de Gestión</label>
              <input class="span3" id="txtTipoGestion_SupervisionLlamadas" type="text" disabled>
            </div>
          </div>
          <div>
            <div>
              <label for="txtObservacionOperador">Observaciones de Operador</label>
              <textarea id="txtObservacionOperador" style="width:487px" rows="3" disabled></textarea>
            </div>
          </div>

          <div>
            <div>
              <label for="txtObservacion">Observaciones</label>
              <textarea id="txtObservacion" style="width:487px" rows="3" tabindex="9"></textarea>
            </div>
          </div>
        </div>

        <div style="display:inline-block; vertical-align:top;">
          <label>¿Encuesta?</label>
          <div style="display:inline-block; padding-right:17px;">
            <label class="checkbox">
              <input type="checkbox" id="chkSaludo" tabindex="15"> Saludo
            </label>
            <label class="checkbox">
              <input type="checkbox" id="chkIdentificoEmpresa" tabindex="16"> Se Identificó como Empresa
            </label>
            <label class="checkbox">
              <input type="checkbox" id="chkIdentificoOperador" tabindex="17"> Se Identificó el Operador
            </label>
            <label class="checkbox">
              <input type="checkbox" id="chkAmable" tabindex="18"> Fue Amable
            </label>
            <label class="checkbox">
              <input type="checkbox" id="chkGracias" tabindex="19"> Gracias
            </label>
            <label class="checkbox">
              <input type="checkbox" id="chkResolvio" tabindex="20"> Se Resolvió la Demanda
            </label>
          </div>
          <div style="margin-top: 23px;">
            <label for="cmbAsuntoID">Asunto</label>
            <select style="width:140px;" id="cmbAsuntoID" tabindex="21">
              <option value="1">Información</option>
              <option value="2">Apertura</option>
              <option value="3">Reporte</option>
            </select>
          </div>
          <div>
              <label for="dtTiempoGestion">Tiempo de Gestión</label>
              <div id="dtTiemporGestionDiv" class="input-append timepicker" >
                    <input id="dtTiempoGestion" style="width:100px;" data-format="hh:mm:ss" type="text" tabindex="22"></input>
                    <span class="add-on">
                      <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
                    </span>
                  </div>
          </div>
        </div>
      </form>
  </div>
  <div class="modal-footer">
    <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="23">Cancelar</button>
    <button id="btnGuardarRegistroGeneral" class="btn btn-primary" tabindex="24" onblur="$('#txtSupervisor').focus()" onClick="fnGuardarSupervicion()"><i class="icon-hdd icon-white"></i> Guardar</button>
    <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtRegistroAccesoID','supervicion_llamadas');"><i class="icon-calendar"></i> Historial</button>
  </div>
</div>

<script type="text/javascript">
  var pagina = 0;
  var strUltimaBusqueda = "";
  var bolPagina = false;
  var strFecha = "<?php echo $fecha;?>";
  var dtTiempoGestion = null;
  var intExisteRegistro = null;

  function fnNuevo(){
    $('#frmReporte')[0].reset();
    $('#txtResidenciaID').val(0);
    $('#txtSolicitanteID').val("");
    $('#dtFechaIni').val(strFecha+' 00:00');
    $('#dtFechaFin').val(strFecha+' 00:00');
    paginacion();
    $('#dtFechaIni').focus();
  }

  function fnNuevoSupervicion(){
    intExisteRegistro = 0;
    dtTiempoGestion = $('#dtTiemporGestionDiv').data('datetimepicker');
    $('#frmSupervicion')[0].reset();
    $('#dtFechaHora').val(strFecha+' 00:00');
    $("input:checkbox").removeAttr("checked");
    dtTiempoGestion.setDate(new Date(Date.UTC(1999,9,9,0,0,0)));
  }

  function paginacion() {
    //Si la descripción de la residencia esta vacia
    if($('#txtResidencia').val()=="")
    {
      $('#txtResidenciaID').val(0);
    }
    

    if($('#dtFechaIni').val()+$('#dtFechaFin').val()+$('#cmbPrivadaID').val()+$('#txtResidenciaID').val()+
       $('#txtSolicitante').val()+$('#cmbOperadorID').val()+$('#cmbTipoGestionID').val()+$('#cmbEstadoID').val() != strUltimaBusqueda){
      pagina = 0;
      bolPagina = true;
    }
    if(bolPagina){
      $.post('procesos/registroaccesos/paginacion_consulta',
                   { strFechaHoraInicio: $('#dtFechaIni').val(),
                     strFechaHoraFin: $('#dtFechaFin').val(),
                     intPrivadaID: $('#cmbPrivadaID').val(),
                     intResidenciaID: $('#txtResidenciaID').val(),
                     strSolicitante: $('#txtSolicitante').val(),
                     intOperadorID: $('#cmbOperadorID').val(),
                     intTipoGestionID: $('#cmbTipoGestionID').val(),
                     intEstatusID: $('#cmbEstadoID').val(),
                     intPagina: pagina },
                    function(data) {
                      $('#dgAccesos tbody').empty();
                      var temp = Mustache.render($('#plantilla_accesos').html(),data);
                      $('#dgAccesos tbody').html(temp);
                      $('#pagLinks').html(data.paginacion);
                      $('#numElementos').html(data.total_rows);
                      pagina = data.pagina;
                      strUltimaBusqueda = $('#dtFechaIni').val()+$('#dtFechaFin').val()+$('#cmbPrivadaID').val()+$('#txtResidenciaID').val()+
                                          $('#txtSolicitante').val()+$('#cmbOperadorID').val()+$('#cmbTipoGestionID').val()+$('#cmbEstadoID').val();
                      bolPagina = false;
                    }
                   ,
            'json');
      }
  }
  //--------- Funciones para el Modal
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

  function cmbOperador_set() {
    $.post('catalogos/empleados/opciones',
                  { intPuestoID: 1},
                  function(data) {
                    $('#cmbOperadorID').empty();
                    var temp = Mustache.render($('#plantilla_empleados').html(),data);
                    $('#cmbOperadorID').html(temp);
                  }
                  ,'json');
  }

  function fnLoadSupervision(id){
    fnNuevoSupervicion();
    $.post('procesos/supervisionllamadas/buscar',
                  { intRegistroAccesoID: id
                  },
                  function(data) {
                  $('#divMensajes').html(data.mensajes);
                  if(data.row){
                    $('#txtRegistroAccesoID').val(id);
                      if(data.row.supervisor_id){
                        intExisteRegistro = 1;
                        $('#txtSupervisorID').val(data.row.supervisor_id);
                        $('#txtSupervisor').val(data.row.supervisor);
                        $('#dtFechaHora').val(data.row.fecha);

                        if(data.row.saludo == 1) $("#chkSaludo").attr("checked","checked");
                        if(data.row.identifico_empresa == 1) $("#chkIdentificoEmpresa").attr("checked","checked");
                        if(data.row.identifico_operador == 1) $("#chkIdentificoOperador").attr("checked","checked");
                        if(data.row.amable == 1) $("#chkAmable").attr("checked","checked");
                        if(data.row.gracias == 1) $("#chkGracias").attr("checked","checked");
                        if(data.row.demanda == 1) $("#chkResolvio").attr("checked","checked");

                        $('#cmbAsuntoID').val(data.row.Asunto); 
                        $('#dtTiempoGestion').val(data.row.tiempo_gestion); 
                        $('#txtObservacion').val(data.row.observaciones);
                      }
                      $('#txtFechaHorallamada').val(data.row.fecha_llamada);
                      $('#txtPrivada_SupervisionLlamadas').val(data.row.privada);
                      $('#txtOperador_SupervisionLlamadas').val(data.row.operador);
                      $('#txtTipoGestion_SupervisionLlamadas').val(data.row.tipo_gestion);
                      $('#txtObservacionOperador').val(data.row.observaciones_llamada);
                      $('#myModalSupervision').modal('show');
                    }
                  }
                 ,
          'json');
  }

  function fnGuardarSupervicion(){
    $.post('procesos/supervisionllamadas/guardar',
            { intTipo : intExisteRegistro,
        intRegistroAccesoID : $('#txtRegistroAccesoID').val(),
        intSupervisorID : $('#txtSupervisorID').val(),
        strFecha : $('#dtFechaHora').val(),
        intSaludo : $("#chkSaludo").prop("checked") ? 1 : 0,
        intIdentificoEmpresa : $("#chkIdentificoEmpresa").prop("checked") ? 1 : 0,
        intIdentificoOperador : $("#chkIdentificoOperador").prop("checked") ? 1 : 0,
        intAmable : $("#chkAmable").prop("checked") ? 1 : 0,
        intGracias : $("#chkGracias").prop("checked") ? 1 : 0,
        intDemanda : $("#chkResolvio").prop("checked") ? 1 : 0,
        intAsunto : $("#cmbAsuntoID").val(),
        strTiempoGestion : $("#dtTiempoGestion").val(),
        strObservaciones : $("#txtObservacion").val()
            },
            function(data) {
              if(data.resultado){
                $('#myModalSupervision').modal('hide');
                bolPagina = true;
                paginacion();
              }
              $('#divMensajes').html(data.mensajes);
            }
           ,
    'json');
  }



  $( document ).ready(function() {
     cmbPrivada_set();
     cmbOperador_set();
     fnGeneralForm('#frmReporte');    

    $( "select" ).change(function () {
      $( "#cmbEstadoID option:selected" ).each(function() {
        $("#txtEstado").val($( this ).text());
      });
      $( "#cmbOperadorID option:selected" ).each(function() {
        $("#txtOperador").val($( this ).text());
      });
      $( "#cmbPrivadaID option:selected" ).each(function() {
        $("#txtPrivada").val($( this ).text());
      });
      $( "#cmbTipoGestionID option:selected" ).each(function() {
        $("#txtTipoGestion").val($( this ).text());
      });
    });
     
    $("#txtResidencia").autocomplete("catalogos/residencias/autocompleteReportes", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:100,selectOnly:0,remoteDataType:"json",extraParams:['#cmbPrivadaID']} 
     );

    $("#txtSolicitante").autocomplete("procesos/registroaccesos/autocompleteSolicitantesReportes", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:100,selectOnly:0,remoteDataType:"json",extraParams:['#txtResidenciaID']} 
     );

    $("#txtSupervisor").autocomplete("catalogos/empleados/autocomplete", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:6,onItemSelect:null,selectOnly:0,remoteDataType:"json"} 
     );

    $('#pagLinks').on('click','a',function(event){
        bolPagina = true;
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacion();
     });

    $('#myModalSupervision').on('shown', function () {
        $('#txtSupervisor').focus();
     });

    $('#wellContenido').removeClass("span10");
    
    $('.timepicker').datetimepicker({
      language: 'es',
      pick12HourFormat: false,
      pickDate: false
    });

    $('.datetimepicker').datetimepicker({
          language: 'es',
          pick12HourFormat: true
      });
     //---- Codigo Inicial para el Primer form
     fnNuevo();
  });
</script> 