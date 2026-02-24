  <form id="frmSearch" action="#" method="post" onsubmit="return(false)">
        <div style="display:inline-block;">
        <label for="dtFechaIni"><h5>Fecha Inicio</h5></label>
        <div class="input-append datepicker" >
          <input id="dtFechaIni" name="strFechaIni" class="span2" data-format="yyyy-MM-dd" type="text" tabindex="1"></input>
          <span class="add-on">
            <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
          </span>
        </div>
      &nbsp;&nbsp;&nbsp;&nbsp;
      </div>
      <div style="display:inline-block;">
        <label for="dtFechaFin"><h5>Fecha Final</h5></label>
          <div class="input-append datepicker" >
            <input id="dtFechaFin" name="strFechaFin" class="span2" data-format="yyyy-MM-dd" type="text" tabindex="2"></input>
            <span class="add-on">
              <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
            </span>
          </div>
      &nbsp;&nbsp;&nbsp;&nbsp;
      </div> 
      <div style="display:inline-block;">
        <label for="cmbGraficas"><h5>Dashboard</h5></label>
        <select id="cmbGraficas" class="span3" tabindex="3" >
          <option value="1">Ingresos</option>
          <option value="2">Folios H</option>
          <option value="3">Folios B</option>
          <option value="4">Folios A</option>
          <option value="5">Llamadas por Monitorista</option>
        </select>
      </div>
        <div style="display:inline-block;">
            <button style="margin-left:30px; margin-top: -10px;" class="btn btn-primary" onclick="javascript_to_php()" tabindex="4">Generar
              <i class="icon-refresh icon-white"></i>
            </button>
        </div>           
    
    </form>

<script type="text/javascript">
var strFecha = "<?php $fecha=date('Y-m-d');echo $fecha;?>";
  $( document ).ready(function() {
    $('.datepicker').datetimepicker({
          language: 'es',
          pickTime: false
      });

     $('#dtFechaIni').val(strFecha);
     $('#dtFechaFin').val(strFecha);

     $('#dtFechaIni').focus();
  }); 
</script>

<script type="text/javascript">
function javascript_to_php() {
    var fechaInicial = $('#dtFechaIni').val();
    var fechaFinal = $('#dtFechaFin').val();
    var grafica = $('#cmbGraficas').val();
    window.open("http://www.videoaccesos.com/syscbctlmonitoreo/catalogos/dashgenerado?grafica="+ grafica +"&fechaInicial=" + fechaInicial + "&fechaFinal=" + fechaFinal);
}
</script>