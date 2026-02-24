

<link class="include" rel="stylesheet" type="text/css" href="css/jquery.jqplot.min.css" />
<link type="text/css" rel="stylesheet" href="js/syntaxhighlighter/styles/shCoreDefault.min.css" />
<link type="text/css" rel="stylesheet" href="js/syntaxhighlighter/styles/shThemejqPlot.min.css" /> 


<form id="frmReporte" action="#" method="post" target="_blank" style="margin:0px;" accept-charset="ISO-8859-1">
      <div style="display:inline-block;">
        <label for="dtFechaIni">Fecha/Hora Inicio</label>
    <!--<div class="input-append date datepicker">
            <input id="dtFechaIni"  name="strFechaIni" class="span2" type="text" tabindex="1"><span class="add-on"><i class="icon-th"></i></span>
        </div>-->
        <div class="input-append datetimepicker" >
          <input id="dtFechaIni" name="strFechaHoraInicio" class="span2" data-format="dd-MM-yyyy hh:mm" type="text" tabindex="1"></input>
          <span class="add-on">
            <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
          </span>
        </div>
      &nbsp;&nbsp;&nbsp;&nbsp;
      </div>
      <div style="display:inline-block;padding-right:17px;">
        <label for="dtFechaFin">Fecha/Hora Final</label>
        <!--<div class="input-append date datepicker">
            <input id="dtFechaFin" name="strFechaFin" class="span2" type="text" tabindex="2"><span class="add-on"><i class="icon-th"></i></span>
          </div> -->
          <div class="input-append datetimepicker" >
            <input id="dtFechaFin" name="strFechaHoraFin" class="span2" data-format="dd-MM-yyyy hh:mm" type="text" tabindex="2"></input>
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
        <label for="txtResidencia">Residencia</label>
        <div class="input-append">
          <input type="hidden" id="txtResidenciaID" name="intResidenciaID" value="0">
          <input type="text" id="txtResidencia" name="strResidencia" class="span3" tabindex="4">
          <span class="add-on" style="padding-left:12px;padding-right:12px;"><i class="icon-search"></i></span>
        </div>
      </div>
      <div style="display:inline-block;padding-right:17px;">
        <label for="txtSolicitante">Solicitante</label>
        <div class="input-append">
          <input type="hidden" id="txtSolicitanteID" name ="strSolicitanteID">
          <input type="text" id="txtSolicitante" name="strSolicitante" class="span3" tabindex="5">
          <span class="add-on" style="padding-left:12px;padding-right:12px;"><i class="icon-search"></i></span>
        </div>
      </div>

      <div style="display:inline-block;padding-right:17px;">
          <label for="cmbOperadorID">Operador</label>
          <input type="hidden" id="txtOperador" name ="strOperador">
          <select id="cmbOperadorID" name="intOperadorID" style="width:167px;" tabindex="6"></select>
      </div>
      <div  style="display:inline-block; padding-right:17px;">
        <label for="cmbTipoGestion">Tipo de Gestión</label>
          <input type="hidden" id="txtTipoGestion" name ="strTipoGestion">
          <select id="cmbTipoGestionID" name="intTipoGestionID" style="width:170px;"  tabindex="7">
            <option value="0" selected>[ Todas ]</option>
            <option value="1">No concluida</option>
            <option value="2">Moroso</option>
            <option value="3">Proveedor</option>
            <option value="4">Residente</option>
            <option value="5">Técnico</option>
            <option value="6">Trabajador de Obra</option>
            <option value="7">Trabajador de Servicio</option>
            <option value="8">Visita</option>
            <option value="9">Visita de Morosos</option>
          </select>
      </div>
       <div  style="display:inline-block; padding-right:17px;">
        <input type="hidden" id="txtEstado" name ="strEstatus">
        <label for="cmbEstadoID">Estado</label>
          <select id="cmbEstadoID" name="intEstatusID" style="width:170px;"  tabindex="8">
            <option value="0" selected>[ Todos ]</option>
            <option value="1">Acceso</option>
            <option value="2">Rechazado</option>
            <option value="3">Infomrado</option>
          </select>
      </div>
      <div style="display:inline-block;padding-right:17px;">
        <label for="txtTitulo">Titulo</label>
        <input type="text" id="txtTitulo"style="width:250px;" tabindex="4">
      </div>
      <div style="display:inline-block;padding-right:17px;">
        <label for="txtIntervalo">Intervalo</label>
        <input type="text" id="txtIntervalo" style="width:40px;text-align:right;" tabindex="4" value="0" onBlur="fnFormato(this,0);">
        <input type="text" id="txtIntervaloMax" style="width:70px;text-align:right;" tabindex="4" value="0" onBlur="fnFormato(this,0);">
      </div>
      <div style="display:inline-block; padding-right:17px;">
        <button type="button" class="btn" tabindex="9" onClick="paginacion();" style="margin-top:-7px;"> Generar <i class="icon-refresh"></i></button>
      </div>
</form>
<script id="plantilla_privadas" type="text/template"> 
 <option value="0" selected>[ Todas ]</option>
  {{#privadas}}
    <option value="{{value}}">{{nombre}}</option>
  {{/privadas}} 
</script>
<script id="plantilla_empleados" type="text/template"> 
  <option value="0" selected>[ Todos ]</option>
  {{#empleados}}
    <option value="{{value}}">{{nombre}}</option>
  {{/empleados}} 
</script>

<script type="text/javascript">
  var pagina = 0;
  var strUltimaBusqueda = "";
  var bolPagina = false;
  var strFecha = "<?php echo $fecha;?>";
  var dtTiempoGestion = null;
  var intExisteRegistro = null;

  function fnNuevo(){
    $('#frmReporte')[0].reset();
    $('#txtResidenciaID').val(0);
    $('#txtSolicitanteID').val("");
    $('#dtFechaIni').val(strFecha+' 00:00');
    $('#dtFechaFin').val(strFecha+' 00:00');
    paginacion();
    $('#dtFechaIni').focus();
  }

  function paginacion() {
    //if($('#dtFechaIni').val()+$('#dtFechaFin').val()+$('#cmbPrivadaID').val()+$('#txtResidenciaID').val()+
    //   $('#txtSolicitanteID').val()+$('#cmbOperadorID').val()+$('#cmbTipoGestionID').val()+$('#cmbEstadoID').val() != strUltimaBusqueda){
    //  pagina = 0;
      bolPagina = true;
    //}
    x = $('#dtFechaIni').val().substr(4,10);
    if(bolPagina){
      intFiltro = 1;
      fechaMin = fnInvFecha($('#dtFechaIni').val().substr(0,10)) + $('#dtFechaIni').val().substr(10,$('#dtFechaIni').val().length) + ":00";
      fechaMax = fnInvFecha($('#dtFechaFin').val().substr(0,10)) + $('#dtFechaFin').val().substr(10,$('#dtFechaFin').val().length) + ":00";
      if($('#dtFechaIni').val().substr(0,10) == $('#dtFechaFin').val().substr(0,10))
      {
        intFiltro = 0;
        formatInterval = "%H hrs";
        interval = 3600; // 1 Hour
      }
      else if($('#dtFechaIni').val().substr(3,7) == $('#dtFechaFin').val().substr(3,7)){
        intFiltro = 1;
        formatInterval = "%b %e";
        interval = "1 Days";
      }
      else if($('#dtFechaIni').val().substr(6,4) == $('#dtFechaFin').val().substr(6,4)){
        intFiltro = 1;
        formatInterval = "%b %e";
        interval = "1 month";
      }
      else {
        intFiltro = 2;
        formatInterval = "%b %Y";
        interval = "1 month"; 
      }
      

      $.post('procesos/registroaccesos/consulta_grafica',
                   { strFechaHoraInicio: $('#dtFechaIni').val(),
                     strFechaHoraFin: $('#dtFechaFin').val(),
                     intPrivadaID: $('#cmbPrivadaID').val(),
                     intResidenciaID: $('#txtResidenciaID').val(),
                     strSolicitanteID: $('#txtSolicitanteID').val(),
                     intOperadorID: $('#cmbOperadorID').val(),
                     intTipoGestionID: $('#cmbTipoGestionID').val(),
                     intEstatusID: $('#cmbEstadoID').val(),
                     intFiltro: intFiltro },
                    function(data) {
                      $('#chart1').empty();
                      totalMax = 0;
                      if(data.length > 0){
                        currYear.splice(0,currYear.length);
                        for(i = 0; i < data.length; i++) {
                          if(totalMax < data[i]["total"]) 
                            totalMax = parseInt(data[i]["total"]);
                          currYear.push([data[i]["fecha"],data[i]["total"]]);
                        }  
                      }

                       objYaxis = new Object();
                      if($('#txtIntervalo').val() == "0" && $('#txtIntervaloMax').val() == "0"){
                        objYaxis = {
                          //renderer: $.jqplot.LogAxisRenderer,
                          //pad: 0,
                          //rendererOptions: {
                          //    minorTicks: 0
                          //},
                          tickOptions: {
                              formatString: "%'d",
                              showMark: true
                          },
                          max: totalMax+1,
                          min: 0
                        };
                      }else  {
                        intIntervalo = parseInt($('#txtIntervalo').val());
                        intCierraIntervalo = 0;
                        while(intCierraIntervalo <= totalMax || intCierraIntervalo < $('#txtIntervaloMax').val()){
                          intCierraIntervalo += intIntervalo;
                        }
                        $('#txtIntervaloMax').val(intCierraIntervalo);
                        objYaxis = {
                          tickInterval: intIntervalo,
                          tickOptions: {
                              formatString: "%'d",
                              showMark: true
                          },
                          max: intCierraIntervalo,
                          min: 0 
                        };
                      }


                      generar_grafico();
                      pagina = data.pagina;
                      strUltimaBusqueda = $('#dtFechaIni').val()+$('#dtFechaFin').val()+$('#cmbPrivadaID').val()+$('#txtResidenciaID').val()+
                                          $('#txtSolicitanteID').val()+$('#cmbOperadorID').val()+$('#cmbTipoGestionID').val()+$('#cmbEstadoID').val();
                      bolPagina = false;
                    }
                   ,
            'json');
      }
  }

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

  function cmbOperador_set() {
    $.post('catalogos/empleados/opciones',
                  { intPuestoID: 1},
                  function(data) {
                    $('#cmbOperadorID').empty();
                    var temp = Mustache.render($('#plantilla_empleados').html(),data);
                    $('#cmbOperadorID').html(temp);
                  }
                  ,'json');
  }

  //--------- Funciones para las Graficas
  var plot1 = null;
  var currYear = null;
  var fechaMin = fnInvFecha(strFecha);
  var fechaMax = fnInvFecha(strFecha);
  var interval = "1 Days";
  var formatInterval = "%b %e"
  var totalMax = 1;
  var objYaxis = new Object();

  function generar_grafico(){
            plot1 = $.jqplot("chart1", [currYear], {
                seriesColors: ["rgb(0, 95, 195)"],
                title: $('#txtTitulo').val(),
                highlighter: {
                    show: true,
                    sizeAdjust: 1,
                    tooltipOffset: 7
                },
                grid: {
                    background: 'rgba(57,57,57,0.0)',
                    drawBorder: false,
                    shadow: false,
                    gridLineColor: '#ddddd0',
                    gridLineWidth: 2
                },
                legend: {
                    show: false,
                    placement: 'outside'
                },
                seriesDefaults: {
                    rendererOptions: {
                        smooth: true,
                        animation: {
                            show: true
                        }
                    },
                    showMarker: false
                },
                axesDefaults: {
                    rendererOptions: {
                        baselineWidth: 1,
                        baselineColor: '#666666',
                        drawBaseline: false
                    }
                },
                axes: {
                    xaxis: {
                        renderer: $.jqplot.DateAxisRenderer,
                        tickRenderer: $.jqplot.CanvasAxisTickRenderer,
                        tickOptions: {
                            formatString: formatInterval,
                            angle: 90,
                            textColor: '#000000'
                        },
                        min: fechaMin,
                        max: fechaMax,
                        tickInterval: interval,
                        drawMajorGridlines: true
                    },
                    yaxis: objYaxis
                }
            });
        //$('.jqplot-highlighter-tooltip').addClass('ui-corner-all');
  }

  $( document ).ready(function() {
      currYear = [["2011-08-01",796.01], ["2011-08-02",510.5], ["2011-08-03",527.8], ["2011-08-04",308.48], 
                  ["2011-08-05",420.36], ["2011-08-06",219.47], ["2011-08-07",333.82], ["2011-08-08",660.55], ["2011-08-09",1093.19], 
                  ["2011-08-10",521], ["2011-08-11",660.68], ["2011-08-12",928.65], ["2011-08-13",864.26], ["2011-08-14",395.55], 
                  ["2011-08-15",623.86], ["2011-08-16",1300.05], ["2011-08-17",972.25], ["2011-08-18",661.98], ["2011-08-19",1008.67], 
                  ["2011-08-20",1546.23], ["2011-08-21",593], ["2011-08-22",560.25], ["2011-08-23",857.8], ["2011-08-24",939.5], 
                  ["2011-08-25",1256.14], ["2011-08-26",1033.01], ["2011-08-27",811.63], ["2011-08-28",735.01], ["2011-08-29",985.35], 
                  ["2011-08-30",1401.58], ["2011-08-31",1177], ["2011-09-01",1023.66], ["2011-09-02",1442.31], ["2011-09-03",1299.24], 
                  ["2011-09-04",1306.29], ["2011-09-06",1800.62], ["2011-09-07",1607.18], ["2011-09-08",1702.38], 
                  ["2011-09-09",4118.48], ["2011-09-10",1988.11], ["2011-09-11",1485.89], ["2011-09-12",2681.97], 
                  ["2011-09-13",1679.56], ["2011-09-14",3538.43], ["2011-09-15",3118.01], ["2011-09-16",4198.97], 
                  ["2011-09-17",3020.44], ["2011-09-18",3383.45], ["2011-09-19",2148.91], ["2011-09-20",3058.82], 
                  ["2011-09-21",3752.88], ["2011-09-22",3972.03], ["2011-09-23",2923.82], ["2011-09-24",2920.59], 
                  ["2011-09-25",2785.93], ["2011-09-26",4329.7], ["2011-09-27",3493.72], ["2011-09-28",4440.55], 
                  ["2011-09-29",5235.81], ["2011-09-30",6473.25]];

     cmbPrivada_set();
     cmbOperador_set();
     fnGeneralForm('#frmReporte');    

    $( "select" ).change(function () {
      $( "#cmbEstadoID option:selected" ).each(function() {
        $("#txtEstado").val($( this ).text());
      });
      $( "#cmbOperadorID option:selected" ).each(function() {
        $("#txtOperador").val($( this ).text());
      });
      $( "#cmbPrivadaID option:selected" ).each(function() {
        $("#txtPrivada").val($( this ).text());
      });
      $( "#cmbTipoGestionID option:selected" ).each(function() {
        $("#txtTipoGestion").val($( this ).text());
      });
    });
     
    $("#txtResidencia").autocomplete("catalogos/residencias/autocomplete", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:15,selectOnly:0,remoteDataType:"json",extraParams:['#cmbPrivadaID']} 
     );

    $("#txtSolicitante").autocomplete("procesos/registroaccesos/autocompleteSolicitantes", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:15,selectOnly:0,remoteDataType:"json",extraParams:['#txtResidenciaID']} 
     );

    $("#txtSupervisor").autocomplete("catalogos/empleados/autocomplete", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:6,onItemSelect:null,selectOnly:0,remoteDataType:"json"} 
     );

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


<!-- Example scripts go here -->
    <link class="include" rel="stylesheet" type="text/css" href="http://ajax.googleapis.com/ajax/libs/jqueryui/1.10.0/themes/smoothness/jquery-ui.css" />

    <style type="text/css">
        .jqplot-target {
            margin: 20px;
            height: 450px;
            width: 800px;
            /*color: #dddddd;*/
        }

        .ui-widget-content {
           /* background: rgb(57,57,57); */
        }

        table.jqplot-table-legend {
            border: 0px;
            background-color: rgba(100,100,100, 0.0); 
        }

        .jqplot-highlighter-tooltip {
            background-color: rgba(57,57,57, 0.9); 
            padding: 7px;
            color: #dddddd;
        }



    </style>
    <br><br>
    <div class="ui-widget ui-corner-all" >
      <center>
        <div class="ui-widget-content ui-corner-bottom" >
            
              <div class="jqplot-target" id="chart1"></div>
            
        </div>
        </center>
    </div>

<!-- Don't touch this! -->
    <script class="include" type="text/javascript" src="js/jquery.jqplot.min.js"></script>
    <script type="text/javascript" src="js/syntaxhighlighter/scripts/shCore.min.js"></script>
    <script type="text/javascript" src="js/syntaxhighlighter/scripts/shBrushJScript.min.js"></script>
    <script type="text/javascript" src="js/syntaxhighlighter/scripts/shBrushXml.min.js"></script>
<!-- End Don't touch this! -->

<!-- Additional plugins go here -->
    <script class="include" type="text/javascript" src="js/plugins/jqplot.dateAxisRenderer.min.js"></script>
    <script class="include" type="text/javascript" src="js/plugins/jqplot.logAxisRenderer.min.js"></script>
    <script class="include" type="text/javascript" src="js/plugins/jqplot.canvasTextRenderer.min.js"></script>
    <script class="include" type="text/javascript" src="js/plugins/jqplot.canvasAxisTickRenderer.min.js"></script>
    <script class="include" type="text/javascript" src="js/plugins/jqplot.highlighter.min.js"></script>


    <script type="text/javascript">
      $(document).ready(function(){
        if(!$.jqplot._noCodeBlock){
          $("script.code").each( 
            function(c){
              if($("pre.code").eq(c).length){
                $("pre.code").eq(c).text($(this).html())
              }else{
                var d=$('<pre class="code prettyprint brush: js"></pre>');
                $("div.jqplot-target").eq(c).after(d);
                d.text($(this).html());
                d=null
              }
            }
          );
          $("script.common").each(function(c){$("pre.common").eq(c).text($(this).html())});
          var b="";
          if($("script.include, link.include").length>0){
            if($("pre.include").length==0){
              var a=['<div class="code prettyprint include">','<p class="text">The charts on this page depend on the following files:</p>','<pre class="include prettyprint brush: html gutter: false"></pre>',"</div>"];
              a=$(a.join("\n"));
              $("div.example-content").append(a);
              a=null
            }
            $("script.include").each(function(c){
                if(b!==""){b+="\n"}
                b+='<script type="text/javascript" src="'+$(this).attr("src")+'"><\/script>'}
            );
            $("link.include").each(function(c){
              if(b!==""){
                b+="\n"
              }
              b+='<link rel="stylesheet" type="text/css" hrf="'+$(this).attr("href")+'" />'
            });
            $("pre.include").text(b)
          }else{
            $("pre.include").remove();
            $("div.include").remove()
          }
        }
        if(!$.jqplot.use_excanvas){
          $("div.jqplot-target").each(function(){
            var d=$(document.createElement("div"));
            var g=$(document.createElement("div"));
            var f=$(document.createElement("div"));
            d.append(g);
            d.append(f);
            d.addClass("jqplot-image-container");
            g.addClass("jqplot-image-container-header");
            f.addClass("jqplot-image-container-content");
            g.html("<br>Click Derecho, para Guardar Imagen. . .");
            var e=$(document.createElement("a"));
            e.addClass("jqplot-image-container-close");
            e.html(" (x)Cerrar<br>");
            e.attr("href","#");
            e.click(function(){
              event.preventDefault();
              $(this).parents("div.jqplot-image-container").hide(500)
            });
            g.append(e);
            $(this).after(d);
            d.hide();
            d=g=f=e=null;
            if(!$.jqplot._noToImageButton){
              var c=$(document.createElement("button"));
              c.text("Generar Imagen");
              c.addClass("jqplot-image-button");
              c.bind("click",{chart:$(this)},function(h){
                var j=h.data.chart.jqplotToImageElem();
                var i=$(this).nextAll("div.jqplot-image-container").first();
                i.children("div.jqplot-image-container-content").empty();
                i.children("div.jqplot-image-container-content").append(j);
                i.show(300);
                i=null
              });
              $(this).after(c);
              c.after("<br />");
              c.before("<br />");
              c=null;
            }
          });
        }
        SyntaxHighlighter.defaults.toolbar=true;
        SyntaxHighlighter.all();
        $(document).unload(function(){$("*").unbind()})});
    </script>