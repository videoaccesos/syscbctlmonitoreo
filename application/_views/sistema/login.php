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
            $(document).ready(function()
            {
                // Validate signup form
                $("#frmLogin").validate({
                    rules: {
                        txtUsuario: "required email",
                        txtPassword: "required password",
                    },
                });
            });
        </script>
    </head>
    <body style="color:#004182;">
       
                <div class="container-fluid" style="padding-left:0px; padding-right:0px;">
                    <CENTER>

                    <div class="page-header" style="background-color: #004c78;">
                           <br>
                           <img src="img/logo.png" alt="" width="220px"><br>
                    </div>       
                    
                    <div class="row-fluid">
                            <form id="frmLogin" method="post" action="<?php echo base_url()?>login/login_" class="form-horizontal">
                               <div style="width:221px; text-align:left;">
                                    <label for="txtUsuario">Usuario</label>
                                    <input type="text" id="txtUsuario" name="strUsuario" placeholder="Teclear Usuario">
                                    <label for="txtPassword">Password</label>
                                    <input type="password" id="txtPassword" name="strPassword" placeholder="Teclear Password">                       
                                    <label for="btnIngresar">&nbsp;</label>
                                    <button id="btnIngresar" type="submit" class="btn" style="float:right;">Ingresar</button>
                                </div>
                            </form>
                    </div>
                    <div class="page-header">
                    </div>       
                    </CENTER>
                </div>

        <script src="http://code.jquery.com/jquery-latest.js"></script>
        <script src="http://demos.9lessons.info/jquery.validate.js" type="text/javascript"></script>
        <script src="<?php echo base_url();?>js/bootstrap.min.js"></script>
    </body>
</html>
<?php 
}
else
    $this->load->view('sistema/sistema.php');  ?>