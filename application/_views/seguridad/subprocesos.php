<form name="frmSubProcesos" id="frmSubProcesos" action="<?php if(@$subproceso_id) echo ".";?>./guardar/" method="post" autocomplete="off">
	<input type="hidden" id="txtSubProcesoID" name="intSubProcesoID" value="<?php echo @$subproceso_id; ?>">
	<input type="hidden" id="txtProcesoID" name="intProcesoID" value="<?php echo @$proceso_id; ?>">
	<label for="txtProceso">Proceso</label>
    		<div class="input">
      			<input class="span3" id="txtProceso" name="strProceso" type="text" value="<?php echo @$proceso; ?>" tabindex="0">
    		</div>
	<br>
	<label for="cmbFuncion">Funcion</label>
		<div class="input">
			<select id="cmbProcesoPadreID" name="intProcesoPadreID" class="span3" tabindex="1" >
				<?php
					$arrFunciones = array('Nuevo','Guardar','Buscar','Imprimir','Modificar','Cancelar','Eliminar'); 
					foreach ($arrFunciones as $strFunc) {
						echo '<option value="'.$strFunc.'" ';
						if(!isset($funcion) && $strFunc == 'Nuevo') echo "selected";
  						if(@$funcion == $strFunc) echo "selected";
  					    echo '>'.$strFunc.'</option>';
					}
				 ?>
  			</select>
		</div>
		<br>
	<label for="txtNombre">Nombre</label>
    		<div class="input">
      			<input class="span3" id="txtNombre" name="strNombre" type="text" value="<?php echo @$nombre; ?>" tabindex="2">
    		</div>
</form>	
<script src="<?php echo base_url();?>js/jquery.autocomplete.js"></script>
<script src="<?php echo base_url();?>js/sistema_form_general.js"></script>
<script type="text/javascript">
	function fnNuevo (){
		$('#divMensaje').html('');
		$('#frmSubProcesos')[0].reset();
		$('#txtProceso').focus();
	}
	function fnBuscar(item){
	  if (item.data) {
	  	$(location).attr('href','<?php echo base_url();?>index.php/seguridad/subprocesos/buscar/'+item.data[0]);			
	  }
	}
	function fnBuscarProceso(item){
	  if (item.data) {
	  	$('#txtProcesoID').val(item.data[0]);			
	  }
	}
	function fnValidar(){
		if($('#txtProceso').val() == ""){
			fnMsg(2,'Seleccione un proceso, no puede quedar vacio.');
			$('#txtNombre').focus();		
			return false;
		}
		if($('#txtNombre').val() == ""){
			fnMsg(2,'El nombre no puede quedar vacio.');
			$('#txtNombre').focus();		
			return false;
		}
		return true;
	}
	function fnGuardar(){
		if(fnValidar()) $('#frmSubProcesos')[0].submit();
	}

	$( document ).ready(function() {
		$("#btnNuevo").click(function(){
	      if($('#txtNombre').val())
	        $(location).attr('href','<?php echo base_url();?>index.php/seguridad/subprocesos/');     
	      else
	        fnNuevo();
	    });

    	$("#btnGuardar").click(fnGuardar);

		$("#txtProceso").autocomplete("<?php echo base_url();?>index.php?d=seguridad&c=procesos&m=filtrarHijos", 
     	 	{ minChars:1,matchSubset:1,matchContains:1,cacheLength:5,onItemSelect:fnBuscarProceso,selectOnly:0 } 
     	 );

		$("#txtNombre").autocomplete("<?php echo base_url();?>index.php?d=seguridad&c=subprocesos&m=filtrar", 
     	 	{ minChars:1,matchSubset:1,matchContains:1,cacheLength:5,onItemSelect:fnBuscar,selectOnly:0 } 
     	 );

		fnGeneralForm();
		$('#txtProceso').focus();
	});
</script> 