<form name="frmUsuarios" id="frmUsuarios" action="<?php if(@$usuario_id) echo ".";?>./guardar/" method="post" autocomplete="off">
	<input type="hidden" id="txtUsuarioID" name="intUsuarioID" value="<?php echo @$usuario_id;?>">
	<label for="txtUsuario">Usuario</label>
    		<div class="input">
      			<input class="span3" id="txtUsuario" name="strUsuario" type="text" value="<?php echo @$usuario;?>" tabindex="0">
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
  				<option value="1" <?php if(!isset($modificar_fechas)) echo "selected";
  										if(@$modificar_fechas == 1) echo "selected";?>>Si</option>
  				<option value="2" <?php if(@$modificar_fechas == 2) echo "selected";?>>No</option>
  			</select>
		</div>
		<br>
		
	<label for="cmbEstatus">Estatus</label>
		<div class="input">
  			<select id="cmbEstatus" name="intEstatus" class="span3" tabindex="4" >
  				<option value="1" <?php if(!isset($estatus_id)) echo "selected";
  										if(@$estatus_id == 1) echo "selected";?>>Activo</option>
  				<option value="2" <?php if(@$estatus_id == 2) echo "selected";?>>Baja</option>
  			</select>
		</div>
</form>	
<script src="<?php echo base_url();?>js/jquery.autocomplete.js"></script>
<script src="<?php echo base_url();?>js/sistema_form_general.js"></script>
<script type="text/javascript">
	function fnNuevo (){
		$('#divMensaje').html('');
		$('#frmUsuarios')[0].reset();
		$('#txtUsuario').focus();
	}
	function fnBuscar(item){
	  if (item.data) {
	  	$(location).attr('href','<?php echo base_url();?>index.php/seguridad/usuarios/buscar/'+item.data[0]);			
	  }
	}
	function fnValidar(){
		if($('#txtUsuario').val() == ""){
			fnMsg(2,'El usuario no puede quedar vacio.');
			$('#txtUsuario').focus();		
			return false;
		}
		if($('#txtPassword').val() == ""){
			fnMsg(2,'El password no puede quedar vacio.');
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
		if(fnValidar()) $('#frmUsuarios')[0].submit();
	}

	$( document ).ready(function() {
		$("#btnNuevo").click(function(){
	      if($('#txtUsuarioID').val())
	        $(location).attr('href','<?php echo base_url();?>index.php/seguridad/usuarios/');     
	      else
	        fnNuevo();
	    });

    	$("#btnGuardar").click(fnGuardar);

		$("#txtUsuario").autocomplete("<?php echo base_url();?>index.php?d=seguridad&c=usuarios&m=filtrar", 
     	 	{ minChars:1,matchSubset:1,matchContains:1,cacheLength:5,onItemSelect:fnBuscar,selectOnly:0 } 
     	 );
		fnGeneralForm();
		$('#txtUsuario').focus();
	});
</script>