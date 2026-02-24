<!DOCTYPE html>
<html lang="es">
    <head>
        <title>Video Accesos System - Subir Archivo</title>
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
            .datepicker{z-index: 2000;margin: 0;padding-top: 0;}
        </style>
    </head>
    <body>
        <script src="js/jquery.js"></script>
        <script src="js/ajaxfileupload.js"></script>
        <div id="divEjecutando"style="width:100%;height:100%;background-color:rgb(247, 247, 247);position:fixed;" hidden>
            <img id="imgProceso" src="img/loading.gif" alt="Cargando archivo..." style="margin-left: 43%;margin-top: 10%;">
            <div id="divResultado" style="text-align: center;"></div>
        </div>

        <div class="navbar ">
            <div class="navbar-inner">
                <img src="img/logo.png" alt="" style="width:140px; float:left;margin-top:3px;margin-bottom:3px;">
                <a class="brand" style="float:right;"> Subir Imagen</a>
            </div>
        </div>
       
        <div id="wellContenido" class="span4">
                <label for="userfile">Envié la Imagen Capturada, Por Favor !!!</label>
                <form method="post" action="" id="upload_file" style="margin: 0; padding: 0;">
                  <input type="file" name="userfile" id="userfile" size="20" />
                </form>
                         
        </div>
       
    <script type="text/javascript">

        var bolActivarPregunta = true;
        var bolError = false;
      
        window.onbeforeunload = function(e){ 
            if(bolActivarPregunta){
              return 'Si cierras este dialogo no podras subir la imagen relacionada con el Acceso...';
            }
        };

        window.onunload = function(e){ 
            strMensaje = "";
            if(bolActivarPregunta){
                $.post('procesos/registroaccesos/no_upload',
                     {intRegistroAccesoID:<?php echo $intRegistroAccesoID;?>,strImagen:'No fue subida!'},
                      function(data) {
                      }
                     ,'json');
            }  
        };

        $( document ).ready(function() {
            window.onresize = function() {
                window.resizeTo(420,200); 
            }

            $('#upload_file').change(function() {
                $('#divEjecutando').removeAttr("hidden");
                $('#upload_file').submit();
            });

            $('#upload_file').submit(function(e) {
                  e.preventDefault();
                  $.ajaxFileUpload({
                     url          : 'procesos/registroaccesos/upload_file/', 
                     secureuri    : false,
                     fileElementId: 'userfile',
                     dataType     : 'json',
                     data         : {'intRegistroAccesoID': <?php echo $intRegistroAccesoID;?>,
                                     'strImagen': '<?php echo $strImagen;?>'},
                     success      : function (data, status)
                     {
                        if(data.status != 'error')
                        {
                            bolActivarPregunta = false;
                            $('#imgProceso').attr('src','img/icon_success.gif');
                            $('#divResultado').html('La imagen fue subida!!!');
                              var imagen = "syscbctlmonitoreo/uploads/<?php echo $strImagen;?>";
                        		$.post('../visionPrueba.php', {img: imagen}, function(data){
                        			if( data != ""){
                        				var ocr= data;
                        				var registroID = "<?php echo $intRegistroAccesoID;?>"; 
                                        $.ajax({                           
                                          url: '../agregarOCR.php',
                                          data: "ocr="+ocr+"&registroID="+registroID,
                                                           type: "post",
                                          dataType: 'json',     
                                          success: function(data)
                                          {
                                            ;
                                          } 
                                        });
                        			}
                        			else{
                        				alert("ERRORSH");
                        			}
                        			
                        		});
                        }
                        else{
                          $('#imgProceso').attr('src','img/icon_error.gif');
                          $('#divResultado').html("La imagen no fue subida<br> <a onClick=\"$('#divEjecutando').attr('hidden','hidden');\" style=\"cursor:pointer;\">Reintentar!</a>");
                          bolError = true;
                        }
                     }
                });
                return false;
            });
        });
    </script>
    <!-- ========================================================== -->
    <!-- Placed at the end of the document so the pages load faster -->
    <!--  Bootstrap JS -->
    <script src="js/bootstrap.js"></script>
    <!-- DatePicker JS -->
    <script src="js/bootstrap-datepicker.js"></script>
    <script src="js/locales/bootstrap-datepicker.es.js"></script>
    <script src="js/google-code-prettify/prettify.js"></script>
    <script src="js/mustache.js"></script>
    </body>
</html>