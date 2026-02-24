<form id="frmReporte" action="reports/relaysactivacion/historial.php" method="post" target="_blank" style="margin:0px;" accept-charset="ISO-8859-1">
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
          <select id="cmbPrivadaID" name="intPrivadaID" style="width:170px;" tabindex="3"></select>
      </div>
      <div style="display:inline-block;padding-right:17px;">
        <label for="txtUsuario">Usuario</label>
        <div class="input-append">
          <input type="hidden" id="txtUsuarioID" name="intUsuarioID" value="0">
          <input type="text" id="txtUsuario" name="strUsuario" style="width:300px;" class="span3" tabindex="4">
        </div>
      </div>
      <div style="display:inline-block; padding-right:17px;">
        <label for="cmbTiempoActivacionRelays">Tiempo de Activación</label>
        <select id="cmbTiempoActivacionRelays" name="strTiempo" style="width:120px;"  tabindex="5" >
          <option value="0" selected>[ Todos ]</option>
          <option value="5 segundos">5 segundos</option>
          <option value="2 minutos">2 minutos</option>
          <option value="Indefinido">Indefinido</option>
        </select>
      </div>
      
      <div style="display:inline-block; padding-right:17px;">
          <label for="cmbConcepto">Concepto</label>
          <div class="input">
            <select id="cmbConcepto" name="strConcepto"  style="width:380px;" tabindex="6" >
              <option value="" selected>[ Todas ]</option>
                <option value="Automatización">Automatización</option>
                <option value="Abrir Porton Visitas">Abrir Porton Visitas</option>
                <option value="Abrir Porton Residentes">Abrir Porton Residentes</option>
                <option value="Abrir Porton Salida">Abrir Porton Salida</option>
                <option value="Abrir Pluma Visitas">Abrir Pluma Visitas</option>
                <option value="Abrir Pluma Residentes">Abrir Pluma Residentes</option>
                <option value="Abrir Todas las Puertas">Abrir Todas las Puertas</option>
                <option value="Reiniciar Computadora">Reiniciar Computadora</option>
                <option value="Reiniciar Camaras,Control de Acceso y Frente de Calle">Reiniciar Camaras,Control de Acceso y Frente de Calle</option>
                <option value="Reiniciar Portones y Plumas">Reiniciar Portones y Plumas</option>
                <option value="Reinicio de Frente de Calle">Reinicio de Frente de Calle</option>
                <option value="Reinicio de Control de Acceso">Reinicio de Control de Acceso</option>
                <option value="Abrir Segunda Pluma Residente">Abrir Segunda Pluma Residente</option>
                <option value="Abrir Segunda Pluma Visitas">Abrir Segunda Pluma Visitas</option>
                <option value="Abrir solo Primera Pluma Visitas">Abrir solo Primera Pluma Visitas</option>
                <option value="Definido por Administrador">Definido por Administrador</option>
            </select>
          </div>
      </div>
      <div style="display:inline-block; padding-right:17px;">
        <button type="button" class="btn" tabindex="7" onClick="paginacion();" style="margin-top:-7px;"> Filtrar <i class="icon-search"></i></button>
      </div>
      <div style="display:inline-block; padding-right:17px;">
        <button type="button" class="btn" tabindex="8" onClick="fnNuevo();" style="margin-top:-7px;"> Limpiar <i class="icon-file"></i></button>
      </div>
      <div style="display:inline-block; padding-right:17px;">
          <button type="submit" class="btn btn-primary" tabindex="9" style="margin-top:-7px;">
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
          <table class="table table-stripped" id="dgRelaysActivacion">
              <thead>
                  <tr>
                    <th width="250px">Privada</th>
                    <th width="160px">Fecha</th>
                    <th >Usuario</th>
                    <th >DNS</th>
                    <th width="200px">Concepto</th>
                    <th >Relays</th>
                    <th width="80px">Estado</th>
                    <th width="80px">Tiempo</th>
                  </tr>
              </thead>
              <tbody>
              </tbody>
              <script id="plantilla_relaysactivacion" type="text/template">
                {{#rows}}
                <tr><td>{{privada}}</td>
                    <td>{{fecha}}</td>
                    <td>{{usuario}}</td>
                    <td>{{dns}}</td>
                    <td>{{concepto}}</td>   
                    <td>{{relays}}</td>
                    <td>{{estado}}</td>
                    <td>{{tiempo}}</td>
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
  var strFecha = "<?php echo $fecha;?>";

  function fnNuevo(){
    $('#frmReporte')[0].reset();
    $('#txtUsuarioID').val(0);
    $('#txtSolicitanteID').val("");
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

    var strNuevaBusqueda =($('#dtFechaIni').val()+$('#dtFechaFin').val()+$('#cmbPrivadaID').val()+$('#txtUsuarioID').val()+$('#cmbTiempoActivacionRelays').val()+$('#cmbConcepto').val());
    //Si la descripción de la residencia esta vacia
    if($('#txtUsuario').val()=="")
    {
      $('#txtUsuarioID').val(0);
    }
    if(strNuevaBusqueda != strUltimaBusqueda)
    {
      pagina = 0;
      strUltimaBusqueda = strNuevaBusqueda;
    }
    //Hacer un llamado a la función para mostrar la barra de progreso
    fnMostrarBarCirculoCarga();
    $.post('catalogos/relaysactivacion/paginacion_consulta',
         {
           strFechaInicio: $('#txtFechaInicio').val(), 
           strFechaFin: $('#txtFechaFin').val(),
           intPrivadaID: $('#cmbPrivadaID').val(),
           intUsuarioID: $('#txtUsuarioID').val(),
           strTiempo: $('#cmbTiempoActivacionRelays').val(),
           strConcepto: $('#cmbConcepto').val(),
           intPagina:pagina},
          function(data) {
             $('#dgRelaysActivacion tbody').empty();
             var temp = Mustache.render($('#plantilla_relaysactivacion').html(),data);
             $('#dgRelaysActivacion tbody').html(temp);
             $('#pagLinks').html(data.paginacion);
             $('#numElementos').html(data.total_rows);
             pagina = data.pagina;

             //Hacer un llamado a la función para ocultar el div que contiene la barra de circulo de carga
             fnOcultarBarCirculoCarga();
          }
         ,'json');
  }
  //---------Función para cargar las privadas en el combobox
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
     
    $("#txtUsuario").autocomplete("seguridad/usuarios/autocomplete", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:100,selectOnly:0,remoteDataType:"json"} 
     );
    
    $('#pagLinks').on('click','a',function(event){
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