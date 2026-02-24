<form id="frmSearch" action="#" method="post" onsubmit="return(false)">
    <div class="btn-group" style="display:inline-block;float:right; margin-bottom:">
   		<!-- Button to trigger modal -->
   		<a href="" type="button" class="btn btn-success" data-toggle="modal"><i class="icon-plus icon-white"></i> Nuevo</a>		
   		<a href="" type="button" class="btn btn-primary" data-toggle="modal"><i class="icon-plus icon-white"></i>Guardar</a>
		<a href="supervision_llamadas_buscar.html" type="button" class="btn btn-inverse"><i class="icon-search icon-white"></i>Buscar</a>                                             
    </div>    
</form>
 
<div style="width:960px; display:inline-block; padding-right:25px;">     
	<div>
		<div style="display:inline-block; padding-right:17px;">
		  <label for="txtMonitorista">Operador/Monitorista</label>
		  <input class="span4" id="txtMonitorista" type="text" placeholder="Ingresa Operador/Monitorista">
		</div>
	
		<div style="display:inline-block; padding-right:17px;">
		  <label for="txtPrivada">Privada</label>
		  <input class="span4" id="txtPrivada" type="text" placeholder="Ingresa Privada">
		</div>
	</div>
	
	<div>
		<div style="display:inline-block; padding-right:17px;">
		  <label for="txtGuardia">Guardia</label>
		  <input class="span4" id="txtGuardia" type="text" placeholder="Ingresa Privada">
		</div>
	
		<div style="display:inline-block; margin-top: 10px;">
			<label for="cmbAsunto">Turno</label>
			<select class="span3" id="cmbAsunto">
				<option>Matutino</option>
				<option>Verpestino</option>
				<option>Nocturno</option>
			</select>
		</div>
	</div>
	<div>
		<div>
			<label for="txtMotivo">Obsevaciones</label>
			<textarea id="txtMotivo" class="span8" rows="6" placeholder=""></textarea>
		</div>
	</div>
</div>