<form name="frmCambiarPassword" id="frmCambiarPassword" action="./guardar/" method="post" autocomplete="off">
	<label for="txtOldPassword">Password</label>
    		<div class="input">
      			<input class="span3" id="txtOldPassword" name="strOldPassword" type="password" tabindex="0">
    		</div>
	<br>
	<label for="txtPassword">Nuevo Password</label>
		<div class="input">
  			<input class="span3" id="txtPassword" name="strPassword" type="password" value="" tabindex="1">
		</div>
		<br>
		<div class="input">
  			<input class="span3" id="txtConfirmar" name="strConfirmacion" type="password" placeholder="Confirmar" value="" tabindex="2">
  		</div>
</form>	
<script src="<?php echo base_url();?>js/jquery.autocomplete.js"></script>
<script src="<?php echo base_url();?>js/sistema_form_general.js"></script>
<script type="text/javascript">
	function fnNuevo (){
		$('#divMensaje').html('');
		$('#frmCambiarPassword')[0].reset();
		$('#txtOldPassword').focus();
	}

	function fnValidar(){
		if($('#txtOldPassword').val() == ""){
			fnMsg(2,'El Password no puede quedar vacio.');
			$('#txtOldPassword').focus();		
			return false;
		}
		if($('#txtPassword').val() == ""){
			fnMsg(2,'El nuevo password no puede quedar vacio.');
			$('#txtPassword').focus();		
			return false;
		}
		if($('#txtConfirmar').val() == ""){
			fnMsg(2,'La confirmacion no puede quedar vacia.');
			$('#txtConfirmar').focus();		
			return false;
		}
		if($('#txtConfirmar').val() != $('#txtPassword').val()){
			fnMsg(2,'La confirmacion no puede ser distinta al password.');
				$('#txtConfirmar').val("");		
				$('#txtConfirmar').focus();		
			return false;
		}
		return true;
	}

	function fnGuardar(){
		if(fnValidar()) $('#frmCambiarPassword')[0].submit();
	}

	$( document ).ready(function() {
		$("#btnNuevo").click(function(){
	        fnNuevo();
	    });

    	$("#btnGuardar").click(fnGuardar);

		fnGeneralForm();
		$('#txtOldPassword').focus();
	});
</script> 