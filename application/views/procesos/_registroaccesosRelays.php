<?php
    //Recuperar valores de la pagina registro de accesos
    $strDatos = $_GET['strDatos'];
    $strDatosRelays = $_GET['strDatosRelays'];
    //Nombre de la ventana
    $strVentanaPrincipal= $_GET['strVentanaPrincipal'];
       
    //Separar cadena que contiene los datos del DNS
    $arrElementos = explode('%',$strDatos);

    //Separar cadena que contiene los datos del Relays
    $arrElementosRelays = explode('%',$strDatosRelays);

    //Asignar valor a las siguientes variables
    //Datos para la privada seleccionada desde la pagina registro de accesos
    $intPrivadaID=$arrElementos[0];
    $strPrivada=$arrElementos[1];
    //Datos de la residencia
    $intResidenciaID=$arrElementos[2];
    $strResidencia=$arrElementos[3];
    //Datos del solicitante
    $intSolicitanteID=$arrElementos[4];
    $strSolicitante=$arrElementos[5];
    //Datos del DNS
    $intDNSID=$arrElementos[6];
    $strAliasDNS=$arrElementos[7];
    $strDNS=$arrElementos[8];


    //Datos del Relays para su activación
    $intRenglon=$arrElementosRelays[0];
    $intIndice=$arrElementosRelays[1];
    $strTiempoActivacion=$arrElementosRelays[2];
    $intEstadoRelay=$arrElementosRelays[3];

    
    ECHO 'EL nombre de la ventana es '.$strVentanaPrincipal;

     /*ECHO 'intRenglon '.$arrElementosRelays[0].' intIndice '.$arrElementosRelays[1];
     ECHO 'strTiempoSel '.$arrElementosRelays[2].' intEstadoRelaySel '.$arrElementosRelays[3];


     echo "Privada es : ".$arrElementos[0]. ' '.$arrElementos[1] ;
     echo "Residencia es : ".$arrElementos[2]. ' '.$arrElementos[3];
     echo "Solicitante es : ".$arrElementos[4]. ' '.$arrElementos[5];
     echo "DNSID es : ".$arrElementos[6]. ' '.$arrElementos[7].' '.$arrElementos[8] ;
    
*/

    
?>


<form id="frmRegistroAccesoRelays" action="#" method="post" onsubmit="return(false)" autocomplete="off" >
  <!-- Campo oculto que se utiliza para asignar la url (concatenada) que corresponde al alias del dns seleccionado -->
  <input id="txtURLDNS" type="hidden" value="">
  <!-- Campo oculto que se utiliza para asignar el id del dns seleccionado -->
  <input id="txtDNSID" type="hidden" value="<?php echo $intDNSID; ?>">
	<div style=" display:inline-block; padding-right:50px; width:100%;">   
    <div  style="position: absolute; left:430px;margin-top:-10px; width: 350px; z-index:1060;" id="divRelasyDNS2">
        <h4> Activación de Relays</h4>
        <!--DNS´S de la privada que se utilizan para la activación de relays  -->
        <div>
              <input id="cmbRADNSID" type="hidden" value="<?php echo $strDNS; ?>">
              <label for="txtRADNS">DNS</label>
              <input type="text" id="txtRADNS" style="width:330px;" tabindex="-1" value="<?php echo $strAliasDNS; ?>" disabled>
        </div>
        <div id="divActivacionRelays2">
            <!-- Campo oculto que se utiliza para verificar si ya se cambio el estado del relays-->
            <input type="hidden" id="txtValidarActivacion" value="">
             <!-- Campo oculto que se utiliza para asignar el indice del combobox
              que corresponde al tiempo seleccionado-->
            <input type="hidden" id="txtIndiceTiempoActivacion" value="">
             <!-- Campo oculto que se utiliza para asignar el indice del combobox
              que corresponde al tiempo de cierre -->
            <input type="hidden" id="txtIndiceTiempoCierre" value="">
            <!-- Campo oculto que se utiliza para asignar la descripción de la opción del tiempo de activación
                 seleccionada-->
            <input type="hidden" id="txtDescripcionTiempoActivacion" value="">
            <input type="hidden" id="txtContadorTiempoActivacion" value="">
            <!-- Campo oculto que se utiliza para asignar el indice del relays 
                 seleccionado desde la pagina registro de accesos (se utiliza para la activación del relays)-->
             <input type="hidden" id="txtIndiceRelays" value="<?php echo $intIndice; ?>">

             <!-- Campo oculto que se utiliza para asignar el renglon del relays 
                 seleccionado desde la pagina registro de accesos (se utiliza para la activación del relays)-->
             <input type="hidden" id="txtRenglonRelays" value="<?php echo $intRenglon; ?>">

            <!-- Campo oculto que se utiliza para asignar el tiempo de activación del relays
                 seleccionado desde la pagina registro de accesos (se utiliza para la activación del relays)-->
             <input type="hidden" id="txtTiempoActivacionRelays" value="<?php echo $strTiempoActivacion; ?>">

             <!-- Campo oculto que se utiliza para asignar el estado (Activo/Inactivo) del relays
                 seleccionado desde la pagina registro de accesos (se utiliza para la activación del relays)-->
             <input type="hidden" id="txtEstadoRelays" value="<?php echo $intEstadoRelay; ?>">

             <!-- Campo oculto que se utiliza para asignar el nombre de la ventana y así poder cerrarla al terminar
                  el proceso de activación de relays-->
             <input type="hidden" id="txtVentanaPrincipal" value="<?php echo $strVentanaPrincipal; ?>">

             <!--Estilo para el tamaño de los td para la tabla que contiene los botones de relays-->
             <style type="text/css">   
                .tdTamTexto {
                    width: 150px;
                    overflow: hidden;
                    display: inline-block;
                    white-space: nowrap;
                    margin-top:6px;
                }
                .tdBlanco {
                    width: 10px;
                    overflow: hidden;
                    display: inline-block;
                    white-space: nowrap;
                    margin-top:6px;
                }
                .tdBlancoD {
                    width: 226px;
                    overflow: hidden;
                    display: inline-block;
                    white-space: nowrap;
                    margin-top:6px;
                }
             </style>
              <br>
              <!--Div que va a contener los botones (relays del DNS seleccionado) -->
              <div id="divContenedorCamposRA">
             </div>
        </div> <!--Cerrar div de activación de relays -->
      </div><!--Cerrar div de activación de relays -->
		<div>
			<!-- Button to trigger modal -->
			<a id="btnActivacionRelays" type="button" class="btn btn-inverse"><i class="icon-retweet icon-white"></i> Relays</a>                                             
	   
    </div>    
	</div>
	<div style=" display:inline-block; padding-right:15px; ">     
		<div>
			<div class="input" style="display:inline-block; padding-right:17px;">
				<label for="txtOperador">Operador</label>
				<input type="hidden" id="txtOperadorID" value ="<?php echo $empleado_id;?>">
				<input type="text" id="txtOperador" style="width:330px;" tabindex="-1" value="<?php echo $empleado; ?>" disabled>
			</div>
		</div>
		<div>
			<div style="display:inline-block; padding-right:17px;">
			  	<label for="txtPrivadaID">Privada</label>
          <input type="hidden" id="txtPrivadaID" value ="<?php echo $intPrivadaID;?>">
          <input type="text" id="txtPrivada" style="width:330px;" tabindex="-1" value="<?php echo $strPrivada; ?>" disabled>
        		  
			</div>
		</div>
		<div>
			<div style="display:inline-block; padding-right:17px;">
				<label for="txtResidenciaID">Residencia</label>
				 <input type="hidden" id="txtResidenciaID" value ="<?php echo $intResidenciaID;?>">
         <input type="text" id="txtResidencia" style="width:330px;" tabindex="-1" value="<?php echo $strResidencia; ?>" disabled>
			</div>
		</div>
		<div>
      <label for="txtSolicitanteID">Solicitante</label>
			<input type="hidden" id="txtSolicitanteID" value ="<?php echo $intSolicitanteID;?>">
      <input type="text" id="txtSolicitante" style="width:330px;" tabindex="-1" value="<?php echo $strSolicitante; ?>" disabled>
		</div>
	</div>
  <div>  
</form>




 <script id="plantilla_DNS" type="text/template"> 
  {{#dns}}
    <option id="opDNS1" value="{{dns1_id}}|{{dns1}}|{{puerto1}}">{{alias1}}</option>
    <option id="opDNS2" value="{{dns2_id}}|{{dns2}}|{{puerto2}}">{{alias2}}</option>
    <option id="opDNS3" value="{{dns3_id}}|{{dns3}}|{{puerto3}}">{{alias3}}</option>
  {{/dns}} 
</script>



<script type="text/javascript">
  var bolProcesando = false;


  //http://www.comolohago.cl/como-anadir-campos-a-un-formulario-dinamicamente/
  //Variable que se utiliza para concatenar los indices de los combobox de tiempo de activacion seleccionados
  var strIndices='';
  var strIndices2='';
  //Variable que se utiliza para concatenar los indices de los combobox de tiempo de activacion y el número de veces
  //que se realiza el registro de activación de relays en la bd 
  var strIndicesContador='';
  var strIndicesContador2='';
  //Variable que se utiliza para concatenar las descripciones de los combobox de tiempo de activacion seleccionados
  var strValoresTiempos='';
  var strValoresTiempos2='';
  function fnLimpiarVariables()
  {
    strIndices='';
    strIndices2='';
    strIndicesContador='';
    strIndicesContador2='';
    strValoresTiempos='';
    strValoresTiempos2='';
  }

//--------- Funciones para el Modal Registro General
  function fnNuevo(){
   var intDNSIDC=$('#txtDNSID').val();
    fnLimpiarVariables();
    bolProcesando = false;
    $("#divMensajes").html('');
   /* $('#txtIndiceTiempoActivacion').val('');
    $('#txtIndiceTiempoCierre').val('');
    $('#txtValidarActivacion').val('');
    $("#txtContadorTiempoActivacion").val('');
    $("#txtDescripcionTiempoActivacion").val('');*/


    fnMostrarRelays();
    fnAbrirVentanaRelayR($("#txtRenglonRelays").val(),$("#txtIndiceRelays").val());
  
    fnHabilitarFormulario(true);
    //Ocultar el div que contiene los relays de la privada
    $("#divActivacionRelays").css({'visibility': 'hidden'}); 
    
                                             
  }


  function fnMostrarRelays()
  {
     //Si el id de la privada es diferente de 0
        if($("#txtPrivadaID").val()!=0)
        {  
              //Borrar contenido del div al cambiar de DNS
              document.getElementById("divContenedorCamposRA").innerHTML="";
              //Separar cadena que contiene los valores del DNS
              var stCadenasDNS=$("#cmbRADNSID").val(). split('|');

              //Variables que se utilizan para recuperar el id,el puerto y la descripción del dns seleccionado
              var strPuerto=stCadenasDNS[2];
              //variable que se utiliza para acceder al dns seleccionado, en caso de que se realice ping
              var strURL=stCadenasDNS[1];
              //Asignar el valor de la url
              $("#txtURLDNS").val(strURL+':'+strPuerto);
              //Asignar el valor del id del dns 
              $("#txtDNSID").val(stCadenasDNS[0]);
              //Si DNS es diferente de cadena vacia hacer ping a url
              /*if(strURL!="")
              {   
                  $("#divMensajes").html('Espere un momento por favor, verificando que el DNS este en linea (en caso de que el tiempo de espera exceda los 3 segundos significa que el servidor no ha encontrado nada que coincida con el DNS dado, favor de verificar )...');
                  //Verificar (hacer ping) la url, en caso de que el estatus sea 200, significa que el DNS esta disponible
                  $.ajax({ 
                      url:$("#txtURLDNS").val(), 
                      dataType:'script',  
                      complete: function(e, xhr, settings){
                          if(e.status === 200){
                             //Regresar relays del dns seleccionado
                              $.ajax('procesos/registroaccesos/regresarRelays',{
                                      "type" : "post",
                                      cache:false,
                                      "data": { intPrivadaID:$("#txtPrivadaID").val(),
                                                intDNSID:$("#txtDNSID").val(),
                                                strDNS: $("#txtURLDNS").val()
                                               },
                                      beforeSend: function () {},
                                      success: function(data){
                                        //Si el resultado es undefined Div con los relays para su activación 
                                        if(data.resultado=='1'){
                                            //Mostrar el div que contiene los relays de la privada
                                            $("#divActivacionRelays").css({'visibility': 'visible'});
                                            //Hacer llamada a la función para agregar los botones de relays
                                            fnAgregarRelaysDNSR(data.row.detalles_renglones,data.row.detalles_relays, data.row.detalles_conceptos,data.row.detalles_estados, data.row.detalles_tiempos);
                                         }
                                         $("#divMensajes").html(data.mensajes);
                                      },
                                      "async": true,
                               });
                          }
                      }
                  });//cerrar ajax
              }*/
              if(strURL!="")
              {
                //Regresar relays del dns seleccionado
                $.ajax('procesos/registroaccesos/regresarRelays',{
                        "type" : "post",
                        cache:false,
                        "data": { intPrivadaID:$("#txtPrivadaID").val(),
                                  intDNSID:$("#txtDNSID").val(),
                                  strDNS: $("#txtURLDNS").val()
                                 },
                        beforeSend: function () {},
                        success: function(data){
                          //Si el resultado es undefined Div con los relays para su activación 
                          if(data.resultado=='1'){
                             //Borrar contenido del div al cambiar de DNS
                              document.getElementById("divContenedorCamposRA").innerHTML="";
                               //Mostrar el div que contiene los relays de la privada
                              $("#divActivacionRelays").css({'visibility': 'visible'});
                              //Hacer llamada a la función para agregar los botones de relays
                              fnAgregarRelaysDNSR(data.row.detalles_renglones,data.row.detalles_relays, data.row.detalles_conceptos,data.row.detalles_estados, data.row.detalles_tiempos);
                           }
                           $("#divMensajes").html(data.mensajes);
                        },
                        "async": true,
                 });

              }
              else
              {
                 $('#divMensajes').html( '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Es necesario seleccionar un DNS!</div>');

              }
             
        }
        else
        {
           $('#divMensajes').html( '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Es necesario seleccionar una privada!</div>');
        }
  }

  function fnHabilitarFormulario(bolBlok){
    if(bolBlok){
      $('#txtPrivadaID').removeAttr('disabled');
      $('#cmbTipoGestion').removeAttr('disabled');
      $('#txtResidencia').removeAttr('disabled');
      $('#txtSolicitante').removeAttr('disabled');
      $('#txtObservaciones').removeAttr('disabled');

    }else {
      $('#txtPrivadaID').attr('disabled','disabled');
      $('#cmbTipoGestion').attr('disabled','disabled');
      $('#txtResidencia').attr('disabled','disabled');
      $('#txtSolicitante').attr('disabled','disabled');
      $('#txtObservaciones').attr('disabled','disabled');
    }

  }

 //---------Agregar Campos (Relays del DNS seleccionado) dinamicamente
 function fnAgregarRelaysDNSR(strDetallesRenglones,strDetallesRelays, strDetallesConceptos,strDetallesEstados,strDetallesTiempos){
      //Asignar a la variable la cadena concatenada con los renglones del DNS
      //separa los renglones con '|' (por cada renglon)
      // ejemplo:1|2|3...
      //Separar la cadena 
       var strRenglones = strDetallesRenglones.split('|');
      //Asignar a la variable la cadena concatenada con los conceptos del DNS
      //separa los conceptos con '|' (por cada renglon)
      // ejemplo:Bajar Pluma|Automotriz|Subir Pluma...
      //Separar la cadena 
       var strConceptos = strDetallesConceptos.split('|');
       //Asignar a la variable la cadena concatenada con los relays del DNS
      //separa los conceptos con '|' (por cada renglon)
      // ejemplo:1,2,3|5,7|17...
      //Separar la cadena 
       var strRelays = strDetallesRelays.split('|');
      //Asignar a la variable la cadena concatenada con los estados del DNS
      //separa los estados con '|' (por cada renglon)  ejemplo:Encendido|Apagado|Encendido...
      //Separar la cadena 
       var strEstados = strDetallesEstados.split('|');
       //Asignar a la variable la cadena concatenada con los tiempos del DNS
      //separa los tiempos con '|' (por cada renglon)
      // ejemplo:5 segundod|2 minutos|indefinido...
      //Separar la cadena 
       var strTiemposActivacion= strDetallesTiempos.split('|');
       //Variable que se utiliza para cambiar el estado del relay dependiendo del estado
       //recuperado si el estado es encendido el estado del relay se cambiara a apagado (asignar el valor 0),
       //de lo contrario se cambiara a encendido (asignar el valor1)
       var intEstadoRelay=0;
       //Hacer recorrido para agregar botones por concepto
       for (var intCont=0; intCont < strRenglones.length; intCont++) {
          //Variable (clase) que se utiliza  para definir el color del botón
           var strClase="";

          strClase='btn btn-default';
          //Dependiendo del tiempo de activación actual del relays cambiar las opciones a mostrar en 
          //el combobox
           var strOpcionesTiempo='';
           if(strTiemposActivacion[intCont]=='Indefinido')
           {
             //Se cambiara las opciones del tiempo a mostrar 
             strOpcionesTiempo='<option>5 segundos </option> <option>2 minutos</option></select>';
            
           }
           else if(strTiemposActivacion[intCont]=='5 segundos')
           {
             //Se cambiara las opciones del tiempo a mostrar 
             strOpcionesTiempo='<option>2 minutos </option> <option value=indefinido>Indefinido</option></select>';
           }
           else
           {
              //Se cambiara las opciones del tiempo a mostrar 
              strOpcionesTiempo='<option>5 segundos </option> <option value=indefinido>Indefinido</option></select>';
           }

          
           //Agregar campos en la tabla
            var NvoCampo= document.createElement("div");
            NvoCampo.id= "divcampo_"+(intCont);
            //Si el relays es 17
            if(strRelays[intCont]=='17')
            {
              //Agregar Campos
              NvoCampo.innerHTML= 
                 "<table >" +
                 "   <tr>" +
                  "     <td class='tdTamTexto'>" +strConceptos[intCont]+
                 "     </td>" +
                 "     </td><td class='tdBlancoD'>" +
                 "     <td><td class='tdBlancoD'>" +
                 "     <td>" +
                 "        <input type='button' class='"+strClase + "' style='width:70px;height:30px;margin-bottom:5px;'  name='intRelay_" + intCont + 
                           "' id='btnRelay_" + intCont+ "'  onclick='fnAbrirVentanaRelayR("+strRenglones[intCont]+
                           ','+intCont+" )"+"'value='Enviar'>" +
                 "   </tr>" +
                 "</table>";

            }
            else
            {
              //Agregar Campos
              NvoCampo.innerHTML= 
                 "<table >" +
                 "   <tr>" +
                  "     <td class='tdTamTexto'>" +strConceptos[intCont]+
                 "     </td>" +
                 "     <td>" +        
                 "          <select id='cmbEstadoRelays_"+intCont+ "'style='width:90px;margin-bottom:5px;'>" +
                 "          <option value='1'>Activo</option>" +
                 "          <option value='0'>Inactivo</option>"+
                 
                 "     </td>" +
                
                           
                 "     </td><td class='tdBlanco'>" +
                 "     </td>" +
                 "     <td>" +        
                 "          <select id='cmbTiempoActivacionRelays_"+intCont+ "'style='width:112px;margin-bottom:5px;'>" +
                 "          <option value='"+strTiemposActivacion[intCont]+"'>" +strTiemposActivacion[intCont]+ "</option>" +
                            strOpcionesTiempo+
                 
                 "     </td>" +
                 "     </td><td class='tdBlanco'>" +
                 "     <td>" +
                 "        <input type='button' class='"+strClase + "' style='width:70px;height:30px;margin-bottom:5px;'  name='intRelay_" + intCont + 
                           "' id='btnRelay_" + intCont+ "'  onclick='fnAbrirVentanaRelayR("+strRenglones[intCont]+
                           ','+intCont+" )"+"'value='Enviar'>" +
                 "   </tr>" +
                 "</table>";

            }
            

            var contenedor= document.getElementById("divContenedorCamposRA");
            contenedor.appendChild(NvoCampo);

      }//cerrar for 

      

  }

  //Función que se utiliza para abrir ventanas emergentes por relays del concepto seleccionado
  function fnAbrirVentanaRelayR(intRenglon,intIndice){
     var strRelaysConcepto='';
     var strRelaysSel='';
       //Regresar relays que le pertenecen al renglon seleccionado
       $.ajax('catalogos/privadasrelays/regresarRelaysPorRenglon',{
                          "type" : "post",
                          "data": {intPrivadaID:$("#txtPrivadaID").val(),
                                   intDNSID: $("#txtDNSID").val(),
                                   intRenglonID: intRenglon,
                                  },
                          success: function(data){
                            //Si se recuperaron los relays
                            if(data.row)
                            {
                              strRelaysConcepto=data.row.relays;
                               //Variable que se utiliza para recuperar los relays del concepto seleccionado
                               strRelaysSel=strRelaysConcepto;
                               //Reemplazar , por |, para identificar que es mas de un relay (ejemplo:8.9 a 8|9),
                               //se abrirá una ventana por cada relay 
                               strRelaysConcepto=replaceAll(strRelaysConcepto, ",", "|" );
                              
                              
                            } 
                          },
                          "async": false,});

     
      //Variable que se utiliza para saber el número de relays a modificar
      var intNumeroRelays=0;
      //Verificar si la cadena tiene caracter |,y así poder separar la cadena
      if(fnBuscaCarater(strRelaysConcepto)==false){
        intNumeroRelays=1;
        
      }
      else
      {
        //Separa la cadena quita '|' (por cada relays)  ejemplo:1|2|3...
        strRelaysConcepto = strRelaysConcepto.split('|');
        //Asignar el número de relays (ejemplo:8|9 son 2)
        intNumeroRelays=strRelaysConcepto.length;
       
        
      }
     
      //Cadena concatenada con el id del boton y el indice seleccionado
      var strBotonRelayID="#btnRelay_"+intIndice;

      //Cadena concatenada con el id del combobox (tiempo de activación del Relays)y el indice seleccionado
      var strComboboxID="#cmbTiempoActivacionRelays_"+intIndice;

      
      //Asignar el valor del  tiempo de activación seleccionado
      //var strValor=$(strComboboxID).val();
      //Si el valor del relays es indefinido
      strValor=$("#txtTiempoActivacionRelays").val();
      

     
       //Cadena concatenada con el id del combobox (estado del Relays) y el indice seleccionado
      var strComboboxEstadoID="#cmbEstadoRelays_"+intIndice;

      
      //Asignar el valor del estado del relay seleccionado
      //var intEstadoRelay=$(strComboboxEstadoID).val();
      //Si el estado del relays es indefinido
      var intEstadoRelay=$("#txtEstadoRelays").val();
     
      //Varible que se utiliza para asignar el tiempo en milisegundos dependiendo de la opción seleccionada
      var strTiempoActivacion='';//Si el tiempo seleccionado es Indefinido el valor de la variable sera cadena vacia
      var strTiempoCerrar='';
      //Si el tiempo seleccionado es 2 minutos cambiar el valor del tiempo
      //de activación a 120000 milisegundos
      if(strValor=='2 minutos' )
      { 
          strTiempoActivacion='120000';
          strTiempoCerrar='120000';

      }
      else if(strValor=='5 segundos')//Si el tiempo seleccionado es 5 segundos
      {
            //Cambiar el valor del tiempo de activación a 5000 milisegundos
            strTiempoActivacion='5000';
            strTiempoCerrar='5000';
            //Incrementar tiempo para encender todos los relays
            var intTiempoActivacion=intNumeroRelays*3000;
          
            //Comparar tiempo cierre con tiempo de activación
            if(parseInt(strTiempoCerrar)<intTiempoActivacion)
            {
              strTiempoCerrar=String(intTiempoActivacion);
            }

      }

      //Variable que se utiliza para saber cuantas veces se abriran las ventanas emergentes
      //y asi poder modificar el estado del relays (dependiendo del tiempo seleccionado), 
      //en caso de que el tiempo sea diferente de indefinido se abrirán dos veces, 
      //debido a que se cambiara el estado por un determinado tiempo;por ejemplo:si seleccionamos
      //2 minutos y el estado actual del relays es apagado,la primera vez que se abran las ventanas
      //se cambiara el estado a encendido y cuando hayan transcurrido los 2 minutos volveran a apagado.
      //Hacer llamada a la función  fnActivarRelaysR para cambiar estado de relays
      fnActivarRelaysR(intRenglon,strRelaysSel,intNumeroRelays,strRelaysConcepto,intEstadoRelay,strTiempoActivacion,intIndice,1);
      //Si el estado del relay es 0-Apagado cambiarlo a 1-Activo
      if(intEstadoRelay==0) 
      {  
        //Cambiar estado a Activo
        intEstadoRelay=1;
          
      }
      else
      {
        //Cambiar estado a Inactivo
        intEstadoRelay=0;
      }
      //Si el tiempo seleccionado es diferente de indefinido(cadena vacia), realizar llamada a la función fnActivarRelaysR
      //para modificar el estado del relays
      if(strTiempoActivacion!='' && $("#txtValidarActivacion").val()=='1')
      {
        //Hacer llamada al método para cambiar de nuevo el estado del relays
        //dependiendo del tiempo seleccionado (despúes de que se cierra la ventana)
        setTimeout( function() {fnActivarRelaysR(intRenglon,strRelaysSel,intNumeroRelays,strRelaysConcepto,intEstadoRelay,strTiempoActivacion,intIndice,2);},  strTiempoCerrar);   
      }
    
      //Asignar valor del tiempo de cierre
      $('#txtIndiceTiempoCierre').val(strTiempoCerrar);
     
  }  
  var intContR=0;

  //Función que se utiliza para cambiar el estado del relay seleccionado (por medio de la  url)
  function fnActivarRelaysR(intRenglon,strRelaysSel,intNumeroRelays,strRelaysConcepto,intEstadoRelay,strTiempoActivacion,intIndice,intNumeroVeces)
  {
      //Si el tiempo seleccionado es de 120000 milisegundos cambiar el valor del tiempo
      //de activación a 2 minutos  y de esta manera poder registrarlo en la bd
      if(strTiempoActivacion=='120000')
      { 
          strTiempoActivacion='2 minutos';
                 
      }
      else if(strTiempoActivacion=='5000')//Si el tiempo seleccionado es  5000 milisegundos 
      {
            //Cambiar el valor del tiempo de activación a 5 segundos y de esta manera poder registrarlo en la bd
            strTiempoActivacion='5 segundos';
            
          
      }
      else
      {
         //Cambiar el valor del tiempo de activación a Indefinido  y de esta manera poder registrarlo en la bd
          strTiempoActivacion='Indefinido';
      }

      //Variable que se utiliza para crear la url y cambiar el estado del relay
      var strUrl="";
      //Cambiar el valor de la activación a 1 para poder hacer (de nuevo) la llamada  al metodo 
      //en caso de que el tiempo seleccionado sea diferente de Indefinido
      $("#txtValidarActivacion").val('1');
      //Variables que se utilizan para calcular el tiempo de carga (de la pagina)
      var  intSegundos=0;
      var  intCont=0;
      var  dteInicio = new Date;
      //Si el número de relays es mas de uno
      if(intNumeroRelays>1)
      {
       
          //Llamar función para abrir ventana por relays y cambiar su estado 
          //cada 3 seg
          fnVentanaR(strRelaysConcepto,intEstadoRelay,intCont,intNumeroRelays,intNumeroVeces);
          var dteFin = new Date;
          intSegundos = (dteFin-dteInicio)/1000;
      }
      else
      {
          //Si el número de relays es el 17 (apagar todos)
          //cambiar el estatus a 0 (siempre para indicar el apagado de todos
          //los relays)
          if(strRelaysConcepto=='17')
          {
            intEstadoRelay=0;
         
          }
          //Si el número de relays por concepto es 1
          //cambiar la url y enviar como parametro el id de un relay
          //Concatenar dns con los parametros a enviar por url 
          //(y asi poder cambiar el estado del relay)
          strUrl=$("#txtURLDNS").val()+"?relay="+strRelaysConcepto+";st="+intEstadoRelay+"";
          //var url="http://videoaccesos5.sytes.net:9999?relay="+id+";st="+intEstadoRelay+"";
          eval('ventana'+ intCont + "=window.open(strUrl,'ventana'+intCont,'width=120px,height=80px,top=1800px,left=1500px,location=no,resizable=no')")

          //Calcular el tiempo en que se carga la pagina que contiene los relay
          var dteFin1 = new Date;
          intSegundos = (dteFin1-dteInicio)/1000;
          //Cerrar ventana(s) en 2 segundos después de que se cargo la página (para que se realicen los cambios sin inconvenientes) 
          setTimeout( function() {fnCerrarVentanasR(1)}, 2000);
         
      }
      
      //Si se cargo la pagina de relay
      if(intSegundos>0)
      {       
           //Si el número de relays es el 17 (apagar todos los relay)
           //cambiar el estatus a 0 (siempre para indicar el apagado de todos
           //los relays)
           if(strRelaysConcepto=='17')
           {
             intEstadoRelay=0;//Para ponerlo siempre en rojo (esto con el fin de indicarle
              //al usuario que los relays estan encendidos y se necesitan apagar)
         
            }
              //Cerrar ventana(s) en 2 segundos después de que se cargo la página (para que se realicen los cambios sin inconvenientes) 
              setTimeout( function() { 
                                         //Función que se utiliza para guardar la activación del relays
                                          $.ajax('catalogos/relaysactivacion/guardar',{
                                            "type" : "post",
                                            "data": {intPrivadaID:$("#txtPrivadaID").val(),
                                                     intDNSID: $("#txtDNSID").val(),
                                                     intRenglonID: intRenglon,
                                                     strRelays:strRelaysSel,
                                                     strEstado:intEstadoRelay,
                                                     strTiempo:strTiempoActivacion
                                                     },
                                            beforeSend: function () {
                                              $("#divMensajes").html("Procesando, espere por favor...");
                                            },
                                            success: function(data){
                                              //Si los datos se guardaron correctamente
                                              if(data.resultado==1)
                                              {
                                                  //Borrar contenido del div al cambiar de DNS
                                                  document.getElementById("divContenedorCamposRA").innerHTML="";
                            
                                                 //Dar clic al boton activación de relays (para mostar los cambios realizados)
                                                 document.getElementById('btnActivacionRelays').click();
                                                
                                                 
                                              }
                                             
                                              $("#divMensajes").html(data.mensajes);
                                            },
                                            "async": false,
                                          });}, 2000); 

            if(strTiempoActivacion!='Indefinido')
            {
                //Cadena concatenada con el id del combobox y el indice seleccionado
                var strComboboxID="#cmbTiempoActivacionRelays_"+intIndice;
                var strDescripcionCombobox=$(strComboboxID+" option:selected").html();
               
                strIndices=strIndices+intIndice+'|';


                //Asignar valores 
                $('#txtDescripcionTiempoActivacion').val(strDescripcionCombobox);
                $('#txtIndiceTiempoActivacion').val(intIndice);
                
            }    
             
             
      }

  }
  //Variable que se utiliza para verificar si los contadores son diferentes
  //y cerrar la ventana actual de un relay y abrir otra
  var intContadorA=0;
  //Función que se utiliza para abrir ventana de relays y poder cambiar el estatus
  //Se utiliza cuando son mas de uno
  function fnVentanaR(strRelaysConcepto,intEstadoRelay,intCont,intNumeroRelays,intNumeroVeces)
  {
    //Si es mas de un relay cambiar la url y enviar como parametro el indice(id) del relay
    strUrl=$("#txtURLDNS").val()+"?relay="+strRelaysConcepto[intCont]+";st="+intEstadoRelay+"";
    //Abrir ventana emergente para pasar los valores del relay por url, de esta manera se accedera a la pagina
    //que contiene los relay y se cambiara el estado
    //var url="http://videoaccesos5.sytes.net:9999?relay="+id+";st="+intEstadoRelay+"";
    eval('ventana'+ intCont + "=window.open(strUrl,'ventana'+intCont,'width=120px,height=80px,top=1800px,left=1500px,location=no,resizable=no')")
    
    //Cerrar ventana de un  relays y abrir ventana para otro despues de 3 segundos
    setTimeout(function() {fnCerrarVentanasR(intCont+1); intCont++;
               if(intContadorA<intCont && intCont<intNumeroRelays)
                {
                  //Abrir ventana para cambiar el estatus del siguiente relays
                  fnVentanaR(strRelaysConcepto,intEstadoRelay,intCont,intNumeroRelays,intNumeroVeces);
                }}, 3000);

    //Variable que se utiliza para saber el número de ventanas por relays
    var intContCierre=parseInt(intCont)+1;
    //Si es la segunda vez que se efectúan los cambios para la activación de relays
    //y se cargaron todas las ventanas, esperar 5 segundos para cerrar la página principal
    if(intNumeroVeces==2 && intContCierre==intNumeroRelays)
    {
         //Cerrar ventana principal después de 5 segundos 
         setTimeout(function() {
               //var strVentanaPrincipal=$("#txtVentanaPrincipal").val();
               //alert('la '+strVentanaPrincipal);
               //eval(strVentanaPrincipal+ ".close()");
                this.window.close();
               }, 5000);
    }
      
  }


  
  //Función que se utiliza para cerrar una o varias ventanas (emergentes) al mismo tiempo
  function fnCerrarVentanasR(intCont)
  {
    //Hacer recorrido para cerrar las ventanas
    for(m=0;m<intCont;m++)
      {
      if(eval('ventana' + m))
        {
        eval('ventana' + m + ".close()")
        }
      }
    //Cambiar el valor a cero (para reiniciar contador)
    intCont=0
  }

  
 //Función que se utiliza para buscar carater | en la cadena de texto
  function fnBuscaCarater(texto)
  {
    //Hacer recorrido para buscar caracter en la cadena
    for(i=0;i<texto.length;i++)
    {
      //Si se encuentra | regresa true, de lo contrario regresa false.
      if(texto.charAt(i)=="|") return true;
    }
    return false;

  }
  //Función que se utiliza para reemplazar caracteres
  function replaceAll( text, busca, reemplaza ){
       while (text.toString().indexOf(busca) != -1)
         text = text.toString().replace(busca,reemplaza);
       return text;

  }
 
  
  $( document ).ready(function() {

     fnNuevo();

     //Evento que se utiliza para realizar ping del dns y saber si esta activo o no
     $("#btnActivacionRelays").click(function(event){
        fnMostrarRelays();
        
     });

   
     //---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmRegistroAccesoRelays');   
     fnHabilitarFormulario(false);
     //Ocultar el div que contiene los relays de la privada
     $("#divActivacionRelays").css({'visibility': 'hidden'}); 
     //Ocultar el div que contiene los relays de la privada
     $("#divRelasyDNS").css({'visibility': 'hidden'}); 

  });


</script> 
