
<form id="frmReporte" action="reports/recuperacionpatrimonial/historial.php" method="post" target="_blank" style="margin:0px;" accept-charset="ISO-8859-1">
      <div style="display:inline-block;">
        <input type="hidden" id="txtFechaInicio" name="dteFechaInicio" value="">
        <label for="dtFechaIni">Fecha Inicio</label>
        <div class="input-append datetimepicker" >
          <input id="dtFechaIni" name="strFechaInicio" class="span2" data-format="dd-MM-yyyy" type="text" tabindex="1"></input>
          <span class="add-on">
            <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
          </span>
        </div>
      &nbsp;&nbsp;&nbsp;&nbsp;
      </div>
      <div style="display:inline-block;padding-right:17px;">
        <input type="hidden" id="txtFechaFin" name="dteFechaFin" value="">
        <label for="dtFechaFin">Fecha Final</label>
          <div class="input-append datetimepicker" >
            <input id="dtFechaFin" name="strFechaFin" class="span2" data-format="dd-MM-yyyy" type="text" tabindex="2"></input>
            <span class="add-on">
              <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
            </span>
          </div>
      </div>
      <div style="display:inline-block;padding-right:17px;">
          <label for="cmbPrivadaID">Privada</label>
          <input type="hidden" id="txtPrivada" name="strPrivada">
          <select id="cmbPrivadaID" name="intPrivadaID" style="width:250px;" tabindex="3"></select>
      </div>
      <div style="display: inline-block; margin-right:15px;">
        <label for="txtResponsable">Involucrado</label>
        <input class="span4" id="txtResponsable"  name="strResposable" type="text" style="width:300px;"  tabindex="4">
      </div>
     <div  style="display:inline-block; padding-right:17px;">
        <label for="cmbTipoDano">Tipo de Daño</label>
          <select id="cmbTipoDanoID" name="strTipoDano" style="width:120px;"  tabindex="4">
            <option value="0" selected>[ Todos ]</option>
            <option value="Patrimonial">Patrimonial</option>
            <option value="Operativo">Operativo</option>
          </select>
      </div>
      <div style="display:inline-block;padding-right:17px;">
        <label for="txtFolio">No.Folio</label>
          <input type="text" id="txtFolio" name="strFolio" class="span3"  style="width:80px;" tabindex="4">
         
      </div>
      <div style="display:inline-block; padding-right:17px;">
        <button type="button" class="btn" tabindex="6" onClick="paginacion();" style="margin-top:-7px;"> Filtrar <i class="icon-search"></i></button>
      </div>
      <div style="display:inline-block; padding-right:17px;">
        <button type="button" class="btn" tabindex="7" onClick="fnNuevo();" style="margin-top:-7px;"> Limpiar <i class="icon-file"></i></button>
      </div>
      <div style="display:inline-block; padding-right:17px;">
          <button type="submit" class="btn btn-primary" tabindex="8" style="margin-top:-7px;">
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
          <table class="table table-stripped" id="dgRecuperacionPatrimonial">
              <thead>
                  <tr>
                    <th width="170px">Fecha</th>
                    <th width="300px">Privada</th>
                    <th width="700px">Involucrado</th>
                    <th width="150px">Tipo de Daño</th>
                    <th width="150px">No. de Folio</th>
                  </tr>
              </thead>
              <tbody>
              </tbody>
              <script id="plantilla_recuperacionpatrimonial" type="text/template">
                {{#rows}}
                <tr><td>{{fecha}}</td>
                    <td>{{privada}}</td>
                    <td>{{responsable}}</td>
                    <td>{{tipo_dano}}</td>   
                    <td>{{folio}}</td>
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
  var strFecha = "<?php echo $fecha;?>";

  function fnNuevo(){
    $('#frmReporte')[0].reset();
    $('#dtFechaIni').val(strFecha);
    $('#dtFechaFin').val(strFecha);
    paginacion();
    $('#dtFechaIni').focus();
    //Hacer un llamado a la función para ocultar el div que contiene la barra de circulo de carga
    fnOcultarBarCirculoCarga();
  }

 //Convierte el formato de fecha de d-m-Y a el formato Y-m-d 
  function fnformatoFechaMySql(strFecha){
      var elem = strFecha.split('-');
      var intDia = elem[0];
      var intMes = elem[1];
      var intAnio = elem[2];
      var strFechaConv= intAnio+'-'+intMes+'-'+intDia;
      return strFechaConv;
  }

  function paginacion() {
    //Cambiar el formato de fecha a mysql
    var strFechaInicial=fnformatoFechaMySql($('#dtFechaIni').val());
    $('#txtFechaInicio').val(strFechaInicial)

    var strFechaFinal=fnformatoFechaMySql($('#dtFechaFin').val());
    $('#txtFechaFin').val(strFechaFinal);

    if($('#dtFechaIni').val()+$('#dtFechaFin').val()+$('#cmbPrivadaID').val()+$('#txtResponsable').val()+
       $('#cmbTipoDano').val()+$('#txtFolio').val() != strUltimaBusqueda){
      pagina = 0;
      bolPagina = true;
    }
    if(bolPagina){
       //Hacer un llamado a la función para mostrar la barra de progreso
      fnMostrarBarCirculoCarga();
      $.post('reportes/recuperacionpatrimonial/paginacion_consulta',
                   { strFechaInicio: $('#txtFechaInicio').val(),
                     strFechaFin: $('#txtFechaFin').val(),
                     intPrivadaID: $('#cmbPrivadaID').val(),
                     strResponsable: $('#txtResponsable').val(),
                     strTipoDano: $('#cmbTipoDanoID').val(),
                     strFolio: $('#txtFolio').val(),
                     intPagina: pagina },
                    function(data) {
                      $('#dgRecuperacionPatrimonial tbody').empty();
                      var temp = Mustache.render($('#plantilla_recuperacionpatrimonial').html(),data);
                      $('#dgRecuperacionPatrimonial tbody').html(temp);
                      $('#pagLinks').html(data.paginacion);
                      $('#numElementos').html(data.total_rows);
                      pagina = data.pagina;
                      strUltimaBusqueda = $('#dtFechaIni').val()+$('#dtFechaFin').val()+$('#cmbPrivadaID').val()+$('#txtResponsable').val()+
                                          $('#cmbTipoDano').val()+$('#txtFolio').val();
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
     
    $("#txtResponsable").autocomplete("reportes/recuperacionpatrimonial/autocompleteResponsable", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:100,selectOnly:0,remoteDataType:"json",extraParams:['#cmbPrivadaID']} 
     );

    $("#txtFolio").autocomplete("reportes/recuperacionpatrimonial/autocompleteFolio", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:100,selectOnly:0,remoteDataType:"json",extraParams:['#txtResidenciaID']} 
     );


    $('#pagLinks').on('click','a',function(event){
        bolPagina = true;
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacion();
     });

   
    $('#wellContenido').removeClass("span10");
    
    $('.timepicker').datetimepicker({
      language: 'es',
      pick12HourFormat: false,
      pickDate: false
    });

    $('.datetimepicker').datetimepicker({
          language: 'es',
          pick12HourFormat: true
      });
     //---- Codigo Inicial para el Primer form
     fnNuevo();
  });
</script> 