<!DOCTYPE html>
<html lang="es">
    <head>
        <title>Video Accesos System</title>
        <!-- Bootstrap -->
        <base href="<?php echo base_url();?>"/>
        <link href="css/bootstrap.min.css" rel="stylesheet" media="screen">
        <link href="css/datepicker.css" rel="stylesheet">
        <link href="css/jquery.autocomplete.css" rel="stylesheet">
        <link href="js/google-code-prettify/prettify.css" rel="stylesheet" >
        <!-- Barra de progreso -->
        <link href="css/barloading.css" rel="stylesheet">
        <link rel="stylesheet" href="http://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css">

        <meta charset="UTF-8">
        <style type="text/css">
            body { color:#004182;}
            .table td { border-top:1px solid rgb(157, 201, 214); }
            .table tbody tr:hover { background: rgb(230,230,230); }
             #divMensaje{ position: absolute; right: 15px; width: 300px; z-index:1060; }
             #divRelasyDNS{position: absolute; left:900px;margin-top:45px; width: 350px; z-index:1060; }
             /*Quitar div divRelasyDNS */
             .no-mostrar {display: none;}

            /*.datepicker{z-index: 2000;margin: 0;padding-top: 0;}*/
        </style>
    </head>
    <body>
        <script src="js/jquery.js"></script>
        <script src="js/jquery.autocomplete.js"></script>
        <script src="js/sistema_form_general.js"></script>
        
        <script src="js/easeljs-0.5.0.min.js"></script>
        <script src="js/base64.js"></script>
        <script src="js/html2canvas.js"></script>
        <script src="js/canvas2image.js"></script>

        <script src="js/jspdf.min.js"></script>
        <script src="http://cdnjs.cloudflare.com/ajax/libs/toastr.js/2.0.2/js/toastr.min.js"></script>
        
       
       

        <div class="navbar ">
            <div class="navbar-inner">
                <a class="brand" href="#"><!--<img src="img/logo.png" alt="" style="width:150px;">--></a> 
                <img src="img/logo.png" alt="" style="width:140px; float:left;margin-top:3px;margin-bottom:3px;">
                <a class="brand" href="#" style="width: 25px;"></a>
                <?php      //se imprime el menu
                      $this->load->view('sistema/menu.php');
                ?>
            </div>
        </div>
        <div class="container-fluid"> 
            <div class="no-mostrar" id="divRelasyDNS">
                     <h4> Activación de Relays</h4>
                    <!--DNS´S de la privada que se utilizan para la activación de relays  -->
                      <div>
                            <label for="cmbDNSID">DNS</label>
                            <select id="cmbDNSID" name="cmbDNSID" style="width:380px;"  tabindex="1"></select>
                      </div>
                      <div id="divActivacionRelays">
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
                           <!--Estilo para el tamaño de los td para la tabla que contiene los botones de relays-->
                           <style type="text/css">   
                              .tdTamTexto {
                                  width: 380px;
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
                            <div id="divContenedorCampos">
                           </div>
                      </div> <!--Cerrar div de activación de relays -->
            </div><!--Cerrar div de activación de relays -->
            <div id="divMensaje">
                <div id="divMensajes"></div>
                <div id="divMensajesRevision"></div>
            </div>
            <div id="wellContenido" class="span10">
                <h4><?php echo $formulario; ?></h4>  
                <div  class="well">
                    <?php echo $contenido; ?>
                </div>               
            </div>
        </div>
    <!-- Cambio de Contraseña -->
    <div id="myModalCambioPassword" class="modal hide fade" tabindex="100" role="dialog" aria-labelledby="myModalCambioPassword" aria-hidden="true"  style="width:250px;left:60%;max-height:100%;" >
        <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="101" onclick="">×</button>
        <h3 id="myModalCambioPasswordLabel">Cambiar Password</h3>
        </div>
        <div class="modal-body " style="max-height:100%; height:85%;">
            <form id="frmCambiarPassword" action="#" method="post" onsubmit="return(false)" autocomplete="off">
                <label for="txtPassActual">Password Actual</label>
                <input class="span3" id="txtPassActual" type="password" value="" tabindex="102" placeholder="Teclee el Password Actual">

                <label for="txtPassNuevo">Nuevo</label>
                <input class="span3" id="txtPassNuevo" type="password" value="" tabindex="104" placeholder="Teclea el Password">

                <label for="txtPassConfirm"></label>
                <input class="span3" id="txtPassConfirm" type="password" placeholder="Confirmar" value="" tabindex="105">   
            </form>
        </div>
        <div class="modal-footer">
            <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="106">Cancelar</button>
            <button class="btn btn-primary" tabindex="107" onclick="fnGuardar_CambioPassword()"><i class="icon-hdd icon-white"></i> Guardar</button>
        </div>
    </div>  

     <!-- Bitacora de Modificaciones -->
    <div id="myModalBitacora" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalBitacora" aria-hidden="false"  style="width:85%;left:350px;" >
        <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="-1" onclick="">×</button>
        <h3 id="myModalBitacora">Bitácora de Modificación</h3>
        </div>
        <div class="modal-body " style="max-height:100%;" >
            <table class="table table-stripped" id="dgBitacoraModificacion" style="height: 390PX;">
                <thead>
                    <tr>
                      <th width="100px">Usuario</th>
                      <th>Empleado</th>
                      <th width="130px">Fecha</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
            <div style="margin-top:10px;">
              <div id="pagLinks_bitacora_modificacion"  style="float:left;margin-right:10px;"></div>
              <div style="float:right;margin-right:10px;"><strong id="numElementos_bitacora_modificacion">0</strong> Encontrados</div>
              <br>
           </div>
        </div>
        <div class="modal-footer">
            <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="-1">Cerrar</button>
        </div>
    </div>  
    <script id="plantilla_bitacora_modificacion" type="text/template">
          {{#rows}}
          <tr><td>{{usuario}}</td>
              <td>{{empleado}}</td>
              <td>{{fecha}}</td>
          </tr>
          {{/rows}}
          {{^rows}}
          <tr> 
            <td colspan="3"> No se Encontraron Resultados!!</td>
          </tr> 
          {{/rows}}
    </script>
                        
    <script type="text/javascript">
        //Funcion para la ejecucion de un doble modal
        var $antModal;
        var showModal = function ($dialog) {
            var $currentModals = $('.modal.in');
            if ($currentModals.length > 0) { // if we have active modals
                $antModal = $currentModals;
                $currentModals.one('hidden', function () { 
                    // when they've finished hiding
                    $dialog.modal('show');
                    $dialog.one('hidden', function () {
                        // when we close the dialog
                        //$currentModals.one('shown', function () {
                        //    $currentModals = $antModal;
                        //}).modal('show');
                    });
                }).modal('hide');
            } else { // otherwise just simply show the modal
                $dialog.modal('show');
            }
        };

        //Funciones para Cambiar Password
        function fnShowCambioPassword(){
            $('#frmCambiarPassword')[0].reset();
            $('#myModalCambioPassword').modal('show');
        }

        function fnGuardar_CambioPassword(){
            $.post('seguridad/usuarios/cambiarpassword',
                  { strPassActual: $('#txtPassActual').val(),
                    strPassNuevo: $('#txtPassNuevo').val(),
                    strPassConfirm: $('#txtPassConfirm').val()
                  },
                  function(data) {
                    if(data.resultado){
                      $('#myModalCambioPassword').modal('hide');
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
        }
        //Funciones para Bitacora
        var pagina_bitacora = 0;
        var id_bitacora = '';
        var tabla_bitacora = '';
        function fnPaginacionBitacora(){
            if(id_bitacora != '' && tabla_bitacora != ''){
                $.post('catalogos/bitacora/paginacion',
                      { id: id_bitacora,
                        tabla: tabla_bitacora,
                        pagina: pagina_bitacora
                      },
                      function(data) {
                        $('#dgBitacoraModificacion tbody').empty();
                        var temp = Mustache.render($('#plantilla_bitacora_modificacion').html(),data);
                        $('#dgBitacoraModificacion tbody').html(temp);
                        $('#pagLinks_bitacora_modificacion').html(data.paginacion);
                        $('#numElementos_bitacora_modificacion').html(data.total_rows);
                        pagina_bitacora = data.pagina;
                        if(id_bitacora != '' && tabla_bitacora != ''){
                            showModal($('#myModalBitacora'));
                        }

                      }
                     ,
                'json');
            } else  {
                $('#dgBitacoraModificacion tbody').empty();
                var temp = new Array();
                temp['rows'] = new Array();
                temp = Mustache.render($('#plantilla_bitacora_modificacion').html(), temp);
                $('#dgBitacoraModificacion tbody').html(temp);
                $('#pagLinks_bitacora_modificacion').html('');
                $('#numElementos_bitacora_modificacion').html('0');
                if(id_bitacora != '' && tabla_bitacora != ''){
                        $('#myModalBitacora').modal('show');
                }
            }
        }

        function fnShowBitacora(idElemento,strTabla){
                if($(idElemento).length)
                    id_bitacora = $(idElemento)[0].value; 
                else
                    id_bitacora = '';
                tabla_bitacora = strTabla;
                if(id_bitacora != '' && tabla_bitacora != ''){
                    fnPaginacionBitacora();
                }
        }

        $( document ).ready(function() {
            $('#pagLinks_bitacora_modificacion').on('click','a',function(event){
                event.preventDefault();
                pagina_bitacora = $(this).attr('href').replace('/','');
                fnPaginacionBitacora();
             });

            $('#myModalCambioPassword').on('shown', function () {
                $('#txtPassActual').focus();
            });
        });

    </script>
    <!-- ========================================================== -->
    <!-- Placed at the end of the document so the pages load faster -->
    <!--  Bootstrap JS -->
    <script src="js/bootstrap.js"></script>
    <!-- DatePicker JS -->
    <script src="js/bootstrap-datepicker.js"></script>
    <script src="js/locales/bootstrap-datetimepicker.es.js"></script>
    <script src="js/mustache.js"></script>
    
    </body>
</html>