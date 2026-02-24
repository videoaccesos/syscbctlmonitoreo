<form name="frmUsuarios" id="frmUsuarios" action="seguridad/usuarios/guardar" method="post" autocomplete="off">
	<input type="hidden" id="txtUsuarioID" name="intUsuarioID" value="<?php echo set_value('intUsuarioID','');?>">
	<label for="txtUsuario">Usuario</label>
    		<div class="input">
      			<input class="span3" id="txtUsuario" name="strUsuario" type="text" value="<?php echo set_value('strUsuario','');?>" tabindex="0">
    		</div>
	<br>
	<label for="txtPassword">Password</label>
		<div class="input">
  			<input class="span3" id="txtPassword" name="strPassword" type="password" value="" tabindex="1">
		</div>
		<br>
		<div class="input">
  			<input class="span3" id="txtConfirmar" name="strConfirmacion" type="password" placeholder="Confirmar" value="" tabindex="2">
  		</div>
  	<br>
  	
	<label for="cmbModificaFechas">Modifica Fechas</label>
		<div class="input">
			<select id="cmbModificaFechas" name="intModificaFechas" class="span3" tabindex="3" >
  				<option value="1" <?php echo set_select('intModificaFechas',1); ?>>Si</option>
  				<option value="2" <?php echo set_select('intModificaFechas',2); ?>>No</option>
  			</select>
		</div>
		<br>
		
	<label for="cmbEstatus">Estatus</label>
		<div class="input">
  			<select id="cmbEstatus" name="intEstatus" class="span3" tabindex="4" >
  				<option value="1" <?php echo set_select('intEstatus',1); ?> >Activo</option>
  				<option value="2" <?php echo set_select('intEstatus',2); ?>>Baja</option>
  			</select>
		</div>
<script src="js/jquery.autocomplete.js"></script>
<script src="js/sistema_form_general.js"></script>
		<script type="text/javascript">
	function fnNuevo (){
		$('#divMensaje').html('');
		$('#frmUsuarios')[0].reset();
		$('#txtUsuario').focus();
	}
	function fnBuscar(item){
	  if (item.data) {
	  	$(location).attr('href','seguridad/usuarios/editar/'+item.data[0]);			
	  }
	  else
	  	$(location).attr('href','seguridad/usuarios');				
	}
	function fnValidar(){
		return true;
	}
	function fnGuardar(){
		if(fnValidar()) $('#frmUsuarios')[0].submit();
	}

	$( document ).ready(function() {
		$("#btnNuevo").click(function(){
	      if($('#txtUsuarioID').val())
	        $(location).attr('href','seguridad/usuarios');     
	      else
	        fnNuevo();
	    });

    	$("#btnGuardar").click(fnGuardar);
    	$("#btnBuscar").click(fnBuscar);

		$("#txtUsuario").autocomplete("seguridad/usuarios/filtrar", 
     	 	{ minChars:1,matchSubset:1,matchContains:1,cacheLength:5,onItemSelect:fnBuscar,selectOnly:0} 
     	 );
		//fnGeneralForm();
		$('#txtUsuario').focus();
	});
</script> 
</form>	
