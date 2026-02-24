<ul class="nav"> 
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
    foreach ($menus->result() as $row){
       echo '<li class="dropdown">
               <a href="#" class="dropdown-toggle" data-toggle="dropdown">'.$row->nombre.'<b class="caret"></b></a> 
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
          echo '<li><a href="'.base_url().'index.php/'.$row->ruta_acceso.'">'.$row->nombre.'</a></li>';
       }
       echo '    </ul>
            </li>';
    }
    $menus->free_result();
    $sub_menus->free_result();
?>                    
  <!-- LOGOUT -->
  <li><a href="<?php echo base_url()?>index.php/sistema/logout">SALIR </b></a></li>
</ul>