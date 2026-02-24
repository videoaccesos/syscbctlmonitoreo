
<form id="frmReporte" action="reports/supervision_llamadas/historial.php" method="post" target="_blank"> <!-- onsubmit="setAction(this)" -->
      <div style="display:inline-block;">
        <label for="dtFechaIni"><h5>Fecha Inicio</h5></label>
    <!--<div class="input-append date datepicker">
            <input id="dtFechaIni"  name="strFechaIni" class="span2" type="text" tabindex="1"><span class="add-on"><i class="icon-th"></i></span>
        </div>-->
        <div class="input-append datepicker" >
          <input id="dtFechaIni" name="strFechaIni" class="span2" data-format="dd-MM-yyyy" type="text" tabindex="1"></input>
          <span class="add-on">
            <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
          </span>
        </div>
      &nbsp;&nbsp;&nbsp;&nbsp;
      </div>
      <div style="display:inline-block;">
        <label for="dtFechaFin"><h5>Fecha Final</h5></label>
        <!--<div class="input-append date datepicker">
            <input id="dtFechaFin" name="strFechaFin" class="span2" type="text" tabindex="2"><span class="add-on"><i class="icon-th"></i></span>
          </div> -->
          <div class="input-append datepicker" >
            <input id="dtFechaFin" name="strFechaFin" class="span2" data-format="dd-MM-yyyy" type="text" tabindex="2"></input>
            <span class="add-on">
              <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
            </span>
          </div>
      </div> 
    <!--
    <div style="display:inline;">
      <label><h5>Reportes:</h5></label>
      <p>
        <label class="radio">
          <input type="radio" name="rdgReporte" id="rbtMonitorias" tabindex="3" value="reports/accesos_atendidos/monitoristas.php" checked>
          Rendimiento por Monitoristas
        </label>
        <label class="radio">
          <input type="radio" name="rdgReporte" id="rbtPrivadas" value="reports/accesos_atendidos/privadas.php">
          Rendimiento por Privadas
        </label>
      </div> -->
      <br>
      <br>
      <div style="display:inline;">
          <button class="btn btn-primary" tabindex="4">
            Generar Reporte  <i class="icon-download-alt icon-white"></i> 
          </button> 
      </div> 
    </p>
    <br>
    <br>
    <br>
    <br>
</form>
                
<script type="text/javascript">
  var strFecha = "<?php echo $fecha;?>";
//--------- Funciones para el Modal

  function setAction (frmRep){
      frmRep.action = $('input[name=rdgReporte]:checked', '#frmReporte').val();
  }

  $( document ).ready(function() {
    $('.datepicker').datetimepicker({
          language: 'es',
          pickTime: false
      });

     $('#dtFechaIni').val(strFecha);
     $('#dtFechaFin').val(strFecha);
     //---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmReporte');    
     $('#dtFechaIni').focus();
  });
</script> 