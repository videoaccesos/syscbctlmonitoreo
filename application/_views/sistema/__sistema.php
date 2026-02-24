
<?php 
if(is_null($this->session->userdata('login')) || $this->session->userdata('login') == ""){
    $this->load->view('sistema/login.php');
}
else {
?>
<!DOCTYPE html>
<html lang="es">
    <head>
        <title>ZHS|Video Accesos System</title>
        <!-- Bootstrap -->
        <link href="<?php echo base_url();?>css/bootstrap.css" rel="stylesheet" media="screen">
        <link href="<?php echo base_url();?>css/datepicker.css" rel="stylesheet">
         <link href="<?php echo base_url();?>css/jquery.autocomplete.css" rel="stylesheet">
        <link href="<?php echo base_url();?>js/google-code-prettify/prettify.css" rel="stylesheet" >
    </head>
    <body>
        <script src="<?php echo base_url();?>js/jquery.js"></script>
        <div class="navbar ">
            <div class="navbar-inner">
                <a class="brand" href="#">Video Accesos System</a>
                <?php      //se imprime el menu
                      $this->load->view('sistema/menu.php');?>
            </div>
        </div>
        <div id="divMensaje">
            <?php 
            if(!is_null($this->session->userdata('mensaje'))){
                 $this->session->userdata('mensaje');
                $this->session->set_userdata('mensaje','');
            }
            ?> 
        </div>   
        <div class="container-fluid"> 
            <div class="row-fluid">
                <div class="span2">
                    <?php
                        $sub_data['strProceso'] = $strProceso;
                        $this->load->view('sistema/sub_menu.php',$sub_data);?>
                </div>
                <div class="span10">
                    <h4><?php echo $formulario;?></h4>  
                    <div class="well">
                        <?php echo $contenido;?>
                    </div>               
                </div>
            </div>
        </div>
    <!-- ========================================================== -->
    <!-- Placed at the end of the document so the pages load faster -->
    <!--  Bootstrap JS -->
    <script src="<?php echo base_url();?>js/bootstrap-transition.js"></script>
    <script src="<?php echo base_url();?>js/bootstrap-dropdown.js"></script>   
    <script src="<?php echo base_url();?>js/bootstrap-button.js"></script>
    <script src="<?php echo base_url();?>js/bootstrap-collapse.js"></script>
    <script src="<?php echo base_url();?>js/bootstrap-alert.js"></script>
    <!-- DatePicker JS -->
    <script src="<?php echo base_url();?>js/bootstrap-datepicker.js"></script>
    <script src="<?php echo base_url();?>js/google-code-prettify/prettify.js"></script>
    </body>
</html>
<?php 
}
?>