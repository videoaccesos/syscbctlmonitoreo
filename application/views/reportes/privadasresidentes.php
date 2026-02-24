
<form id="frmReporte" action="reports/privadasresidentes/historial.php" method="post" target="_blank" style="margin:0px;" accept-charset="ISO-8859-1">
      <div style="display:inline-block;padding-right:17px;">
          <label for="cmbPrivadaID">Privada</label>
          <input type="hidden" id="txtPrivada" name="strPrivada">
          <select id="cmbPrivadaID" name="intPrivadaID" style="width:250px;" tabindex="1"></select>
      </div>
      <div  style="display:inline-block; padding-right:17px;">
        <label for="cmbEstatusResidencia">Estado</label>
          <select class="span3" id="cmbEstatusResidencia"  name="strEstatus" style="width:130px;" tabindex="2">
              <option value="0" selected>[ Todos ]</option>
              <option value="1">Interfon Activo</option>
              <option value="2">Sin Interfon</option>
              <option value="3">Moroso</option>
              <option value="4">Sin Derechos</option>
          </select>
      </div>
      <div style="display:inline-block; padding-right:17px;">
        <button type="button" class="btn" tabindex="3" onClick="paginacion();" style="margin-top:-7px;"> Filtrar <i class="icon-search"></i></button>
      </div>
      <div style="display:inline-block; padding-right:17px;">
        <button type="button" class="btn" tabindex="4" onClick="fnNuevo();" style="margin-top:-7px;"> Limpiar <i class="icon-file"></i></button>
      </div>
      <div style="display:inline-block; padding-right:17px;">
          <button type="submit" class="btn btn-primary" tabindex="5" style="margin-top:-7px;">
            Exportar a XLS  <i class="icon-download-alt icon-white"></i> 
          </button> 
      </div>
       <!--  Barra de progreso-->
      <div id="divBarraProgreso" class="load-container load5 no-mostrar" style="position:relative; top:350px;">
        <div class="loader">Loading...</div>
        <br><br>
        <div align=center style="color:#000; "><b>Espere un momento por favor.</b></div>
      </div>
      <div>
          <table class="table table-stripped" id="dgResidentes">
              <thead>
                  <tr>
                    <th width="170px">Privada</th>
                    <th width="20px">Residente</th>
                    <th width="150px">Calle</th>
                    <th width="20px">No. de Casa</th>
                    <th width="20px">No. de Interfon</th>
                    <th width="100px">Correo Electrónico</th>
                    <th width="30px">Teléfono(s)</th>
                    <th width="20px">Con Tarjeta</th>
                   <th width="20px">Estado</th>
                  </tr>
              </thead>
              <tbody>
              </tbody>
              <script id="plantilla_residentes" type="text/template">
                {{#rows}}
                <tr><td>{{privada}}</td>
                    <td>{{residente}}</td>
                    <td>{{calle}}</td>
                    <td>{{nro_casa}}</td>
                    <td>{{interfon}}</td>
                    <td>{{email}}</td>   
                    <td>Tel.{{telefono1}},Cel.{{celular}}</td>
                    <td>{{no_tarjetas}}</td>
                    <td>{{estatus_id}}</td>
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
      </div>
</form>
<script id="plantilla_privadas" type="text/template"> 
 <option value="0" selected>[ Todas ]</option>
  {{#privadas}}
    <option value="{{value}}">{{nombre}}</option>
  {{/privadas}} 
</script>



<script type="text/javascript">
  var pagina = 0;
  var strUltimaBusqueda = "";
  var bolPagina = false;

  function fnNuevo(){
    $('#frmReporte')[0].reset();
    paginacion();
    $('#cmbPrivadaID').focus();
    //Hacer un llamado a la función para ocultar el div que contiene la barra de circulo de carga
    fnOcultarBarCirculoCarga();
  }

  function paginacion() {
    if($('#cmbPrivadaID').val()+$('#cmbEstatusResidencia').val()!= strUltimaBusqueda){
      pagina = 0;
      bolPagina = true;
    }
    if(bolPagina){
      //Hacer un llamado a la función para mostrar la barra de progreso
      fnMostrarBarCirculoCarga();
      $.post('reportes/privadasresidentes/paginacion_consulta',
                   { 
                     intPrivadaID: $('#cmbPrivadaID').val(),
                     intEstatusResidenciaID: $('#cmbEstatusResidencia').val(),
                     intPagina: pagina },
                    function(data) {
                      $('#dgResidentes tbody').empty();
                      var temp = Mustache.render($('#plantilla_residentes').html(),data);
                      $('#dgResidentes tbody').html(temp);
                      $('#pagLinks').html(data.paginacion);
                      $('#numElementos').html(data.total_rows);
                      pagina = data.pagina;
                      strUltimaBusqueda =$('#cmbPrivadaID').val()+$('#cmbEstatusResidencia').val();
                      bolPagina = false;
                      //Hacer un llamado a la función para ocultar el div que contiene la barra de circulo de carga
                      fnOcultarBarCirculoCarga();
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

  //Función que se utiliza para mostrar el div que contiene el  bar de círculo carga
  //al momento de recuperar registros de la consulta
  function fnMostrarBarCirculoCarga()
  {
      //Remover clase para mostrar div que contiene la barra de carga
      $("#divBarraProgreso").removeClass('no-mostrar');
  }

  //Función que se utiliza para ocultar el div que contiene el  bar de círculo carga
  //al momento de recuperar registros de la consulta
  function fnOcultarBarCirculoCarga()
  {
      //Agregar clase para ocultar div que contiene la barra de carga
      $("#divBarraProgreso").addClass('no-mostrar');
  }

  $( document ).ready(function() {
     cmbPrivada_set();
     fnGeneralForm('#frmReporte');    

    $( "select" ).change(function () {
     
      $( "#cmbPrivadaID option:selected" ).each(function() {
        $("#txtPrivada").val($( this ).text());
      });
     
    });
     
    $('#pagLinks').on('click','a',function(event){
        bolPagina = true;
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacion();
     });

   
    $('#wellContenido').removeClass("span10");
    
     //---- Codigo Inicial para el Primer form
     fnNuevo();
  });
</script> 