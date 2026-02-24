<?php 
if(!isset($_SESSION['UsuarioID']))
{
?>
<!DOCTYPE html>
<html lang="es">
    <head>
        <title>ENS | Control de pagos</title>
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
    <body>
        <div class="container-fluid">
            <div class="page-header">
                   <h2>ENS Control de pagos</h2>
                   <h4>Iniciar Sesion</h4>
            </div>       
            <div class="row-fluid">
                <div class="span4">
                    <form id="frmLogin" method="post" action="<?php echo base_url()?>index.php/sistema/login" class="form-horizontal">
                        <div class="control-group">
                            <div class="controls">
                            <input type="text" id="txtUsuario" name="strUsuario" placeholder="Usuario">
                            </div>
                        </div>
                        <div class="control-group">
                            <div class="controls">
                            <input type="password" id="txtPassword" name="strPassword" placeholder="Password">
                            </div>
                        </div>
                        <div class="control-group">
                            <div class="controls">
                            <button type="submit" class="btn">Ingresar</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
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