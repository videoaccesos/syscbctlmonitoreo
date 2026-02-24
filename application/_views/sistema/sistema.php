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
        <meta charset="UTF-8">
        <style type="text/css">
            body { color:#004182;}
            .table td { border-top:1px solid rgb(157, 201, 214); }
            .table tbody tr:hover { background: rgb(230,230,230); }
            #divMensajes{ position: absolute; right: 15px; width: 300px; z-index:1060; }
            /*.datepicker{z-index: 2000;margin: 0;padding-top: 0;}*/
        </style>
    </head>
    <body>
        <script src="js/jquery.js"></script>
        <script src="js/jquery.autocomplete.js"></script>
        <script src="js/sistema_form_general.js"></script>
        <div class="navbar ">

            <div class="navbar-inner">
                <a class="brand" href="#"><!--<img src="img/logo.png" alt="" style="width:150px;">--></a>
                <img src="img/logo.png" alt="" style="width:140px; float:left;margin-top:3px;margin-bottom:3px;">
                <a class="brand" href="" style="width: 25px;"></a>
                <?php      //se imprime el menu
                      $this->load->view('sistema/menu.php');
                ?>
            </div>
        </div>
        <div class="container-fluid"> 
            <div id="divMensajes"></div>
            <div id="wellContenido" class="span10">
                <h4><?php echo $formulario; ?></h4>  
                <div  class="well">
                    <?php echo $contenido; ?>
                </div>               
            </div>
        </div>
    <!-- Cambio de Contraseña -->
    <div id="myModalCambioPassword" class="modal hide fade" tabindex="100" role="dialog" aria-labelledby="myModalCambioPassword" aria-hidden="true"  style="width:250px;left:60%;" >
        <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="101" onclick="">×</button>
        <h4 id="myModalCambioPasswordLabel">Cambiar Password</h4>
        </div>
        <div class="modal-body " style="max-height:100%; height:100%;">
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
    <script type="text/javascript">
        function fnShowCambioPassword(){
            $('#frmCambiarPassword')[0].reset();
            $('#myModalCambioPassword').modal('show');
        }

        function fnGuardar_CambioPassword(){
            $.post('seguridad/usuarios/cambiarpassword',
                  { strPassActual: $('#txtPassActual').val(),
                    strPassNuevo: $('#txtPassNuevo').val(),
                    strPassConfirm: $('#txtPassConfirm').val(),
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

        $( document ).ready(function() {
            $('#myModalCambioPassword').on('shown', function () {
                $('#txtPassActual').focus();
            });
            /*
            $('.datepicker').datepicker({
                language:'es',
                format:'dd-mm-yyyy',
                autoclose:true
            });
            
            $('.datepicker').datetimepicker({
                language: 'es',
                pickTime: false
            });
            $('.datetimepicker').datetimepicker({
                language: 'es',
                pick12HourFormat: true
            });
            $('.timepicker').datetimepicker({
                language: 'es',
                pickDate: false,
                pick12HourFormat: true
            }); */
        });

    </script>
    <!-- ========================================================== -->
    <!-- Placed at the end of the document so the pages load faster -->
    <!--  Bootstrap JS -->
    <script src="js/bootstrap.js"></script>
    <!-- DatePicker JS -->
    <script src="js/bootstrap-datepicker.js"></script>
    <script src="js/locales/bootstrap-datetimepicker.es.js"></script>
    <script src="js/google-code-prettify/prettify.js"></script>
    <script src="js/mustache.js"></script>
    </body>
</html>