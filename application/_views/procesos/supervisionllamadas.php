<form id="frmSupervicion" action="#" method="post" onsubmit="return(false)" style="margin-bottom:0px;" >    
	<div style="width:510px; display:inline-block;">     
		<div>
			<div class="input-append" style="display:inline-block;padding-right:17px;">
				<input id="txtSupervisorID" type="hidden">
				<label for="txtSupervisor">Supervisor</label>
				<input style="width:265px;" id="txtSupervisor" type="text" placeholder="Ingresa Supervisor" tabindex="1">
				<span class="add-on"><i class="icon-search"></i></span>
			</div>
			<div class="input-append datetimepicker" style="display:inline-block;" >
			  	<label for="dtFechaHora">Fecha / Hora</label>
	            <input id="dtFechaHora" class="span2" data-format="dd-MM-yyyy hh:mm" type="text" tabindex="2"></input>
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
				<label for="txtPrivada">Privada</label>
				<input class="span3" id="txtPrivada" type="text" disabled>
			</div>
		</div>
		<div>
			<div style="display:inline-block; padding-right:17px;">
				<label for="txtOperador">Operador</label>
				<input style="width:240px;" id="txtOperador" type="text" disabled>
			</div>

			<div style="display:inline-block;">
				<label for="txtTipoGestion">Tipo de Gestión</label>
				<input class="span3" id="txtTipoGestion" type="text" disabled>
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

	<div style="display:inline-block; vertical-align: top; margin-top:25px;">
		<div class="btn-group" style="display:inline-block;margin-bottom:20px;">
			<!-- Button to trigger modal -->
			<a type="button" class="btn btn-success" data-toggle="modal" onClick="fnGuardar()"><i class="icon-hdd icon-white"></i> Guardar</a>
			<a href="supervision_llamadas_buscar.html" type="button" class="btn btn-inverse"><i class="icon-search icon-white"></i></a>                                             
		</div>
		<label>¿Encuesta?</label>
		<div style="display:inline-block; padding-right:17px;">
			
			<label class="checkbox">
				<input type="checkbox" id="chkSaludo" tabindex="3"> Saludo
			</label>
			<label class="checkbox">
				<input type="checkbox" id="chkIdentificoEmpresa" tabindex="4"> Se Identificó como Empresa
			</label>
			<label class="checkbox">
				<input type="checkbox" id="chkIdentificoOperador" tabindex="5"> Se Identificó el Operador
			</label>
			<label class="checkbox">
				<input type="checkbox" id="chkAmable" tabindex="6"> Fue Amable
			</label>
			<label class="checkbox">
				<input type="checkbox" id="chkGracias" tabindex="7"> Gracias
			</label>
			<label class="checkbox">
				<input type="checkbox" id="chkResolvio" tabindex="8"> Se Resolvió la Demanda
			</label>
		</div>
		<div style="margin-top: 23px;">
			<label for="cmbAsuntoID">Asunto</label>
			<select style="width:140px;" id="cmbAsuntoID" tabindex="10">
				<option value="1">Información</option>
				<option value="2">Apertura</option>
				<option value="3">Reporte</option>
			</select>
		</div>
		<div>
			  <label for="dtTiempoGestion">Tiempo de Gestión</label>
			  <div id="dtTiemporGestionDiv" class="input-append timepicker" >
	            <input id="dtTiempoGestion" style="width:100px;" data-format="hh:mm:ss" type="text" tabindex="11"></input>
	            <span class="add-on">
	              <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
	            </span>
	          </div>
		</div>
	</div>
</form>

<script type="text/javascript">
var strFecha = "<?php echo $fecha;?>";
var intRegistroAccesoID = <?php echo $RegistroAccesoID;?>;
var dtTiempoGestion = null;
var intExisteRegistro = 0;

function fnNuevo(){
  dtTiempoGestion = $('#dtTiemporGestionDiv').data('datetimepicker');
  $('#frmSupervicion')[0].reset();
  $('#dtFechaHora').val(strFecha+' 00:00');
  dtTiempoGestion.setDate(new Date(Date.UTC(1999,9,9,0,0,0)));
  $('#txtSupervisor').focus();
}

function fnBuscar(id){
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
	                    $('#txtPrivada').val(data.row.privada);
	                    $('#txtOperador').val(data.row.operador);
	                    $('#txtTipoGestion').val(data.row.tipo_gestion);
	                    $('#txtObservacionOperador').val(data.row.observaciones_llamada);
                    }
                  }
                 ,
          'json');
  }

  function fnGuardar(){
    $.post('procesos/supervisionllamadas/guardar',
	          { intTipo : intExisteRegistro,
				intRegistroAccesoID : intRegistroAccesoID,
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

	            }
	            $('#divMensajes').html(data.mensajes);
	          }
	         ,
	  'json');
  }


$( document ).ready(function() {
	$("#txtSupervisor").autocomplete("catalogos/empleados/autocomplete", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:6,onItemSelect:null,selectOnly:0,remoteDataType:"json"} 
     );

	$('.timepicker').datetimepicker({
      language: 'es',
      pick12HourFormat: false,
      pickDate: false
  	});

  	$('.datetimepicker').datetimepicker({
      language: 'es',
      pick12HourFormat: true
  	});

 	$('#wellContenido').removeClass("span10").addClass("span20");
 	
 	fnNuevo();
 	fnBuscar(intRegistroAccesoID);
});
</script>