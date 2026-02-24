<?php
if(is_null($this->session->userdata('login')) || $this->session->userdata('login') == "") {
    $this->load->view('sistema/login.php');
}
else{
?>
<!DOCTYPE html>
<html lang="es">
    <head>
        <title>ZHS|Video Accesos System</title>
        <!-- Bootstrap -->
        <base href="<?php echo base_url();?>"/>
        <link href="css/bootstrap.min.css" rel="stylesheet" media="screen">
        <link href="css/datepicker.css" rel="stylesheet">
        <link href="css/jquery.autocomplete.css" rel="stylesheet">
        <link href="js/google-code-prettify/prettify.css" rel="stylesheet" >
        <meta charset="UTF-8">
    </head>
    <body>
        <script src="js/jquery.js"></script>
        <div class="navbar ">
            <div class="navbar-inner">
                <a class="brand" href="#">Video Accesos System</a>
                <?php      //se imprime el menu
                      $this->load->view('sistema/menu.php');?>
            </div>
        </div>
        <div id="divMensaje">
            <?php 
                echo validation_errors('<div class="alert alert-error">','</div>');
            ?> 
        </div>   
        <div class="container-fluid"> 
            <div class="row-fluid">
                <div class="span2">
                    <?php
                        $sub_data['strProceso'] = $strProceso;
                        $this->load->view('sistema/sub_menu.php',$sub_data);    
                    ?>
                </div>
                <div class="span10">
                    <h4><?php echo $formulario; ?></h4>  
                    <div class="well">
                        <?php echo $contenido; ?>
                    </div>               
                </div>
            </div>
        </div>
    <!-- ========================================================== -->
    <!-- Placed at the end of the document so the pages load faster -->
    <!--  Bootstrap JS -->
    <script src="js/bootstrap.js"></script>
    <!-- DatePicker JS -->
    <script src="js/bootstrap-datepicker.js"></script>
    <script src="js/google-code-prettify/prettify.js"></script>
    <script src="js/mustache.js"></script>
    </body>
</html>
<?php 
}    ?>