<ul id="ulMenu" class="nav"> 

                          
<?php 
    $CadenaSQL = "SELECT proceso_id, nombre, ruta_acceso, proceso_padre_id
                  FROM   procesos 
                  WHERE  proceso_id IN (SELECT P.proceso_padre_id AS proceso_id 
                                        FROM   procesos AS P, subprocesos AS SP, 
                                               permisos_acceso AS PA, grupos_usuarios AS GU, 
                                               grupos_usuarios_detalles AS GUD, usuarios AS U 
                                        WHERE  U.usuario_id = ".$this->session->userdata('usuario_id').@" 
                                        AND    GUD.usuario_id = U.usuario_id 
                                        AND    GUD.grupo_usuario_id = GU.grupo_usuario_id 
                                        AND    GU.estatus_id = 1 
                                        AND    PA.grupo_usuario_id = GU.grupo_usuario_id 
                                        AND    PA.subproceso_id = SP.subproceso_id 
                                        AND    P.proceso_id = SP.proceso_id)  
                 AND    proceso_padre_id = 0 
                 ORDER BY nombre             ";
    $menus = $this->db->query($CadenaSQL);
    $sub_menus = null;
    foreach ($menus->result() as $row){
       echo '<li   class="dropdown">
               <a  href="#" class="dropdown-toggle" data-toggle="dropdown">'.$row->nombre.'<b class="caret"></b></a> 
                  <ul class="dropdown-menu"> ';
       $strCadenaSQL = "SELECT proceso_id, nombre, ruta_acceso, proceso_padre_id
                        FROM   procesos
                        WHERE  proceso_padre_id = ".$row->proceso_id." 
                        AND    proceso_id in (SELECT P.proceso_id 
                                              FROM   procesos AS P, subprocesos AS SP, 
                                                     permisos_acceso AS PA, grupos_usuarios AS GU, 
                                                     grupos_usuarios_detalles AS GUD, usuarios AS U 
                                              WHERE  U.usuario_id = ".$this->session->userdata('usuario_id').@" 
                                              AND    GUD.usuario_id = U.usuario_id 
                                              AND    GUD.grupo_usuario_id = GU.grupo_usuario_id 
                                              AND    GU.estatus_id = 1 
                                              AND    PA.grupo_usuario_id = GU.grupo_usuario_id
                                                AND    PA.subproceso_id = SP.subproceso_id 
                                              AND    P.proceso_id = SP.proceso_id)  ";
       $sub_menus = $this->db->query($strCadenaSQL);
       foreach ($sub_menus->result() as $row){
          echo '<li><a href="'.$row->ruta_acceso.'">'.$row->nombre.'</a></li>';
       }
       echo '    </ul>
            </li>';
    }
    if($menus)
      $menus->free_result();
    if($sub_menus)
    $sub_menus->free_result();
?>                    
  <!-- LOGOUT -->
  <li  class="dropdown">
    <a href="#" class="dropdown-toggle" data-toggle="dropdown"><i class="icon-user icon-white" style="margin-right: 10px;"></i><?php echo  strtoupper($this->session->userdata('usuario')); ?><b class="caret"></b></a>
    <ul class="dropdown-menu">
      <li><a onclick="fnShowCambioPassword()" style="cursor: pointer;"><i class="icon-lock icon-white" style="margin-right: 10px;"></i>CAMBIAR PASSWORD</a></li>
      <li><a href="<?php echo base_url()?>index.php/login/logout" onclick="cerrarLogueado()"><i class="icon-share-alt icon-white" style="margin-right: 10px;"></i>SALIR</a></li>
    </ul>
  </li>
</ul>
<input type="hidden" id="txtUsuario" value="<?php echo  strtoupper($this->session->userdata('usuario')); ?>">
<input type="hidden" id="txtUsuarioID" value="<?php echo  strtoupper($this->session->userdata('usuario_id')); ?>">
<script type="text/javascript">
 //Función que se utiliza para verificar el cierre de sesión (en caso de que el usuario haya iniciado sesión en otro equipo)
 //y poder destruir la sesion actual
  function  fnVerificarCierreSesion(){
      $.post("<?php echo base_url()?>login/regresarCierreSesion",
              { },
                function(data) {
                    var dteCierreSesion=data.cierre_sesion;
                    if(dteCierreSesion!='')
                    {
                      $.post("<?php echo base_url()?>login/destruirSesion",
                            { },
                              function(data) { 
                                  var strPagina=data.login;
                                  location.href=strPagina;
                              },'json');

                    }
                  
                },'json');
      
     
  }
function  cerrarLogueado(){

var logueado=0;
    var usuario= $("#txtUsuario").val();
    var usuarioID= $("#txtUsuarioID").val();
    $.ajax({                           
      url: '../cambiarLogueado.php',
      data: "logueado="+logueado+"&usuario="+usuario+"&usuarioID="+usuarioID,
                       type: "post",
      dataType: 'json',     
      success: function(data)
      {
        ;
      } 
    });
     
  }
  $( document ).ready(function() {
     //Asignar id al dns1, al dar clic en la lista
     $("#ulMenu").click(function(event){
        fnVerificarCierreSesion();
    });
   
    
  });
</script> 