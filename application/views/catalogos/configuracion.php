<?php

$tasaFinanciamiento = '';
$enganche= '';
$plazoMaximo= '';

$sql = "SELECT * FROM configuracion";
	$result = mysql_query($sql);

	if(mysql_num_rows($result)>0){
$query= mysql_query("SELECT tasa_financiamiento, enganche, plazo_maximo FROM configuracion");

while($registro= mysql_fetch_array($query)){
$tasaFinanciamiento = $registro['tasa_financiamiento'];
$enganche= $registro['enganche'];
$plazoMaximo= $registro['plazo_maximo'];
}

}



?>
    <!-- Modal -->
	<div id="myModal" tabindex="0" role="dialog" aria-labelledby="myModalLabel">
		<div class="modal-header">
			<h3 id="myModalLabel">Configuración General</h3>
		</div>
		<div class="modal-body">
			<form name="frmConfiguracion" id="frmConfiguracion" action="#" method="post" onsubmit="return(false)" autocomplete="off">
				<label for="txtTasaFinanciamiento"><h5>Tasa Financiamiento</h5></label>
				<input class="span3" id="txtTasaFinanciamiento" type="text" value="<?php echo $tasaFinanciamiento;?>" tabindex="2">
        <label for="txtEnganche"><h5>% Enganche</h5></label>
        <input class="span3" id="txtEnganche" type="text" value="<?php echo $enganche;?>" tabindex="3">
        <label for="txtPlazoMaximo"><h5>Plazo Máximo</h5></label>
        <input class="span3" id="txtPlazoMaximo" type="text" value="<?php echo $plazoMaximo;?>" tabindex="4">
			</form>
		</div>
		<div class="modal-footer">
			<button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="5">Cancelar</button>
      <button class="btn btn-primary" tabindex="6" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>
		</div>
	</div>

<script type="text/javascript">

  function fnGuardar(){
      $.post('catalogos/configuracion/guardar',
                  { 
                  	dblTasaFinanciamiento: $('#txtTasaFinanciamiento').val(),
                    dblEnganche: $('#txtEnganche').val(),
                    dblPlazoMaximo: $('#txtPlazoMaximo').val(),
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

     $("#btnGuardar").click(fnGuardar);


//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmConfiguracion');   
  });
</script> 

               