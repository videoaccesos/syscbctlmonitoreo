<?php 
if(!isset($_SESSION['UsuarioID']))
{
?>
<!DOCTYPE html>
<html lang="es">
    <head>
        <title>Video Accesos System</title>
        <base href="<?php echo base_url();?>"/>
        <!-- Bootstrap -->
        <link rel="stylesheet" href="<?php echo base_url();?>css/bootstrap.min.css" type="text/css" media="screen" charset="utf8">
        <script type="text/javascript">
        </script>
        <style type="text/css">   
          .tdTamTexto {
              overflow: hidden;
              display: inline-block;
              white-space: nowrap;
          }
       </style>
    </head>
    <body style="color:#004182;">
                <div class="container-fluid" style="padding-left:0px; padding-right:0px;">
                    <center>

                    <div class="page-header" style="background-color: #004c78;">
                           <br>
                           <img src="img/logo.png" alt="" width="220px"><br>
                    </div>       
                    
                    <div class="row-fluid">
                            <form id="frmLogin" method="post"  action="#"  class="form-horizontal" onsubmit="return(false)"> 
                               <!-- Campo oculto que se utiliza para asignar la lista de ips recuperadas-->
                               <input type="hidden" id="txtListaIPs" name="strListaIps" value="">
                               <!-- Campo oculto que se utiliza para asignar la fecha anterior (bitacora_inicio del usuario)-->
                               <input type="hidden" id="txtFechaAnterior" name="dteFechaAnterior" value="">
                               <!-- Campo oculto que se utiliza para asignar el estatus de verificacion (se utiliza para saber si el usuario trata de acceder desde otro equipo)-->
                               <input type="hidden" id="txtEstatusVerificacion" name="dteFechaAnterior" value="">
                             
                               <div style="width:221px; text-align:left;">
                                    <label for="txtUsuario">Usuario</label>
                                    <input class='tdTamTexto' style='height:6.5%;' type="text" id="txtUsuario" name="strUsuario" placeholder="Teclear Usuario">
                                    <label for="txtPassword">Password</label>
                                    <input class='tdTamTexto' style='height:6.5%;' type="password" id="txtPassword" name="strPassword" placeholder="Teclear Password">                       
                                    <label for="btnIngresar">&nbsp;</label>
                                    <button id="btnIngresar" onclick="fnModalCodigo()"  type="submit" class="btn" style="float:right;">Solicitar Código</button>
                                   <!-- <h1 id="list"></h1>-->
                                </div>
                            </form>
                    </div>
                    <div class="page-header">
                    </div>       
                    </center>
                </div>

                <!-- AGREGAMOS EL MODAL QUE SE ABRIRÁ PARA PONER EL CÓDIGO DE VERIFICACIÓN -->
                <div id="myModal" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
                  <div class="modal-header">
                    <h3 id="myModalLabel">Código de Verificación</h3>
                  </div>
                  <div class="modal-body">
                      <form name="frmCodigo" id="frmCodigo" action="#" method="post" onsubmit="return(false)" autocomplete="off">
                        <input type="hidden" id="process_name" name="process_name" value="verify_code" />
                        <input type="hidden" id="user_id" name="user_id" />
                          <label for="scan_code">Código de Verificación</label>
                          <input class="span6" id="scan_code" name="scan_code" type="text" placeholder="Ingrese el código de verificación" tabindex="2">
                    </form>
                  </div>
                  <div class="modal-footer">
                    <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="5">Cancelar</button>
                    <button id="btnValidarCodigo" class="btn btn-primary" tabindex="6"><i class="
 icon-arrow-right icon-white"></i> Ingresar</button>
                  </div>
                </div>

        <!-- Script para Obtener la IP (privada del equipo) referencia http://net.ipcalf.com/-->
        <script>
          var strListaIP='';
            // NOTE: window.RTCPeerConnection is "not a constructor" in FF22/23
            var RTCPeerConnection = /*window.RTCPeerConnection ||*/ window.webkitRTCPeerConnection || window.mozRTCPeerConnection;

            if (RTCPeerConnection) (function () {
                var rtc = new RTCPeerConnection({iceServers:[]});
                if (1 || window.mozRTCPeerConnection) {      // FF [and now Chrome!] needs a channel/stream to proceed
                    rtc.createDataChannel('', {reliable:false});
                };
                
                rtc.onicecandidate = function (evt) {
                    // convert the candidate to SDP so we can run it through our general parser
                    // see https://twitter.com/lancestout/status/525796175425720320 for details
                    if (evt.candidate) grepSDP("a="+evt.candidate.candidate);
                };
                rtc.createOffer(function (offerDesc) {
                    grepSDP(offerDesc.sdp); 
                    rtc.setLocalDescription(offerDesc);
                }, function (e) { console.warn("offer failed", e); });
                
                
                var addrs = Object.create(null);
                addrs["0.0.0.0"] = false;

                function updateDisplay(newAddr) {
                    if (newAddr in addrs) return;
                    else addrs[newAddr] = true;
                    var displayAddrs = Object.keys(addrs).filter(function (k) { return addrs[k]; });
                   //Asignar a la variable IP´s encontradas (IPv4 del adaptador de LAN conexión e  IP FÍSICA)
                    strListaIP=displayAddrs.join("IP fisica") || "n/a";
                    var strPalabra="IP fisica";
                    var intNumeroCa=strPalabra.length;
                    //Si existe la palabra en la cadena
                    //separar datos de la lista donde la segunda dirección ip
                    //es la dirección física ejemplo:'192.168.56.1IP fisica192.168.1.252'
                    if (strListaIP.indexOf(strPalabra)!=-1){
                      //Cortar la cadena hasta la palabra IP fisica ejemplo:'192.168.56.1IP fisica'
                      //para asignar a la caja de texto la (segunda)ip  que en este caso  es la IPv4 del adaptador de LAN conexión 
                      //de red inalámbrica
                      // Asignar la posición actual de la palabra IP fisica en la cadena ejemplo: En la cadena:192.168.56.1IP fisica 192.168.1.252 
                      // la posición de la palabra es 12
                      var intPosicionPalabra=strListaIP.indexOf(strPalabra);
                      //Quitar los caracteres de la cadena que se encuentran antes de la posición de la palabra ejemplo:192.168.56.1 esta antes de IP fisica
                      //da como resultado IP fisica 192.168.1.252 
                      var strResultado = strListaIP.slice(intPosicionPalabra);

                      //Quitar los caracteres de la palabra  da como resultado 192.168.1.252 
                      strResultado=strResultado.slice(intNumeroCa);
                      $('#txtListaIPs').val(strResultado);
                    }
                    
                    //Si la ip no es la física
                    if($('#txtListaIPs').val()=="")
                    {
                       //Asignar la IPv4 del adaptador de LAN conexión
                       $('#txtListaIPs').val(strListaIP);

                    }
                    //document.getElementById('list').textContent = displayAddrs.join(" or perhaps ") || "n/a";
                }
                
                function grepSDP(sdp) {
                    var hosts = [];
                    sdp.split('\r\n').forEach(function (line) { // c.f. http://tools.ietf.org/html/rfc4566#page-39
                        if (~line.indexOf("a=candidate")) {     // http://tools.ietf.org/html/rfc4566#section-5.13
                            var parts = line.split(' '),        // http://tools.ietf.org/html/rfc5245#section-15.1
                                addr = parts[4],
                                type = parts[7];
                            if (type === 'host') updateDisplay(addr);
                           
                            
                        } else if (~line.indexOf("c=")) {       // http://tools.ietf.org/html/rfc4566#section-5.7
                            var parts = line.split(' '),
                                addr = parts[2];
                            updateDisplay(addr);

                        }
                    });
                }
            })(); else {
                document.getElementById('list').innerHTML = "<code>ifconfig | grep inet | grep -v inet6 | cut -d\" \" -f2 | tail -n1</code>";
                document.getElementById('list').nextSibling.textContent = "In Chrome and Firefox your IP should display automatically, by the power of WebRTCskull.";
            }
        </script>

        <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
        <!-- Optional theme -->
        <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap-theme.min.css">

        <!-- Latest compiled and minified JavaScript -->
        <script src="//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js"></script>
        

    </body>
</html>




<script type="text/javascript">
  //CUANDO EL MODAL SE ABRA EL CAMPO DONDE VA EL CÓDIGO DE VERIFICACIÓN VA A TENER FOCUS
  $('#myModal').on('show', function () {
       $('#scan_code').focus();
     });
  //FUNCION QUE SE EJECTURA AL DARLE CLIC "SOLICITAR CÓDIGO"
  function fnModalCodigo(){
    //AL DARLE CLIC A SOLICITAR CÓDIGO SE EJECUTA EL SERVICIO QUE VALIDA SI EL USUARIO Y LA CONTRASEÑA SON CORRECTOS
    $.post("<?php echo base_url()?>login/validarUsuario",
      { 
        //PARAMETROS QUE SE ENVÍAN AL WEBSERVICE PARA VALIDAR EL USUARIO Y CONTRASEÑA
        strUsuario: $('#txtUsuario').val(),
        strPassword: $('#txtPassword').val()
      },
      function(data) {
        //CACHAMOS EL VALOR QUE NOS DEVOLVIÓ EL WEBSERVICE (ID DEL EMPLEADO PARA PODER REALIZAR LAS SIGUIENTES TAREAS)
        var empleadoID= data.empleado_id;
        //SI NOS REGRESÓ UN ID ES PORQUE SI LO ENCONTRÓ CORRECTAMENTE
        if (empleadoID != "")
        {
          //SI VALIDÓ CORRECTAMENTE ENTONCES ABRE EL MODAL Y ASIGNAMOS EL VALOR DEL ID
          $('#myModal').modal('show');
          $('#user_id').val(empleadoID);
        }
        else{
          //SI NO SE ENCONTRÓ EL USUARIO Y CONTRASEÑA ENVIAMOS MENSAJE DE ERROR
          alert("El nombre de usuario o contraseña son incorrectos.");
        }        
      }
     ,
    'json');
  }
  //FUNCION QUE SE EJECUTA AL DAR CLIC EN VALIDAR CÓDIGO (BOTÓN DENTRO DEL MODAL)
  $(document).on('click', '#btnValidarCodigo', function(ev){
          var data = $("#frmCodigo").serialize();
          //EJECUTAMOS EL WEBSERVICE CHECK_USER.PHP Y LE ENVIAMOS COMO PARÁMETRO EL CÓDIGO QUE COLOCÓ EL USUARIO
          $.post('../google/check_user.php', data, function(data,status){
            //console.log("submitnig result ====> Data: " + data + "\nStatus: " + status);
            //CACHAMOS LA RESPUESTA DEL WEB SERVICE PARA SABER SI EL CÓDIGO COLOCADO ES CORRECTO O INCORRECTO
            if( data == "done"){
              //SI FUE CORRECTO EL CÓDIGO COLOCADO ENTONCES INICIAMOS SESIÓN
              fnVerificarExistenciaSesion();
            }
            else{
              //SI FUE INCORRECTO ENTONCES MANDAMOS MENSAJE DE ERROR
              alert("Código Incorrecto");
            }
            
          });
      });
  //Función que se utiliza para regresar la ip anterior del usuario que intenta logearse en el sistema (de esta manera se verifica si el usuario tiene
  // sesión iniciada en otra máquina).
  function  fnVerificarExistenciaSesion(){
    var logueado=1;
    var usuario= $("#txtUsuario").val();
    $.ajax({                           
      url: '../cambiarLogueado.php',
      data: "logueado="+logueado+"&usuario="+usuario,
                       type: "post",
      dataType: 'json',     
      success: function(data)
      {
        ;
      } 
    });
      var dteFechaInicioAnterior='';
      if($('#txtUsuario').val()!="" && $('#txtPassword').val()!="" )
      {
            $.post("<?php echo base_url()?>login/regresarSesionAnterior",
                  { 
                   strUsuario: $('#txtUsuario').val(),
                   strPassword: $('#txtPassword').val()
                  
                  },
                  function(data) {
                         var strIPAnterior= data.direccion_ip;
                         $('#txtFechaAnterior').val(data.inicio_sesion);
                          //Si el usuario ya ha iniciado sesión en otro equipo
                          //preguntar si desea continuar y cerrar sesión anterior
                          if( $('#txtFechaAnterior').val() !='')
                          {   
                             if(confirm('El usuario ya ha iniciado sesi\u00f3n en otro equipo, desea cerrar la sesi\u00f3n anterior para poder acceder al sistema?'))
                             {    
                                   //Asignar valor Si, para actualizar la bitacora de inicio del usuario
                                   //(dar salida al inicio de sesión del otro equipo)
                                   $('#txtEstatusVerificacion').val('Si');
                                   fnLogin();
                             }
                         }
                         else
                         {       $('#txtEstatusVerificacion').val('No');
                                 fnLogin();
                         }
                       }

                 ,
                'json');

      }
      else
      {
        alert('Favor de ingresar usuario y password.');
      }  
     
  }
  //Función que se utiliza para iniciar sesión (acceder al sistema)
  function  fnLogin(){
     $.post("<?php echo base_url()?>login/login_",
        { 
           strUsuario: $('#txtUsuario').val(),
           strPassword: $('#txtPassword').val(),
           strIPActual: $('#txtListaIPs').val(),
           dteFechaInicioSesAnt: $('#txtFechaAnterior').val(),
           strEstatusVerificacion:$('#txtEstatusVerificacion').val()
        },
        function(data) {
            var strPagina=data.sistema;
            location.href=strPagina;
            //Limpiar cajas de texto
            $('#txtListaIPs').val('');
            $('#txtFechaAnterior').val('');
            $('#txtEstatusVerificacion').val('');

        },'json'); 
  }
</script> 

<?php 
}
else
    $this->load->view('sistema/sistema.php');  ?>