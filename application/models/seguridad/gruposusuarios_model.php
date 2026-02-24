<?php 
class GruposUsuarios_Model extends CI_model
{
    public function guardar($strNombre,$intEstatusID){
        $datos = array(
            'nombre' => $strNombre, 
            'estatus_id' => $intEstatusID,
            'usuario_id' => $this->session->userdata('usuario_id'));
        $this->db->insert('grupos_usuarios',$datos);
        return $this->db->_error_message();
    }

    public function modificar($intGrupoUsuarioID,$strNombre,$intEstatusID){
        if($strNombre)
            $datos = array(
                'nombre' => $strNombre, 
                'estatus_id' => $intEstatusID,
                'usuario_id' => $this->session->userdata('usuario_id'));
        else
            $datos = array(
                'estatus_id' => $intEstatusID,
                'usuario_id' => $this->session->userdata('usuario_id'));
        $this->db->where('grupo_usuario_id',$intGrupoUsuarioID);
        $this->db->limit(1);
        $this->db->update('grupos_usuarios',$datos);
        return $this->db->_error_message();
    }

    public function eliminar($intGrupoUsuarioID){
        $this->db->trans_begin();

        $this->db->where('grupo_usuario_id',$intGrupoUsuarioID);  
        $this->db->delete('grupos_usuarios_detalles');

        $this->db->where('grupo_usuario_id',$intGrupoUsuarioID);  
        $this->db->delete('permisos_acceso');

        $this->db->where('grupo_usuario_id',$intGrupoUsuarioID);  
        $this->db->limit(1);
        $this->db->delete('grupos_usuarios');

        $this->db->trans_complete();

        if ($this->db->trans_status() === FALSE)
            $this->db->trans_rollback();
        else
            $this->db->trans_commit();
        return $this->db->_error_message();
    }

    public function filtro($strBusqueda, $intNumRows, $intPos){
        $this->db->like('nombre',$strBusqueda);
        $this->db->from('grupos_usuarios');
        $res["total_rows"] = $this->db->count_all_results();

        $this->db->select("grupo_usuario_id, nombre, 
                                  (CASE estatus_id 
        							WHEN 1 THEN 'ACTIVO' 
        							WHEN 2 THEN 'BAJA' 
        						  END) AS estado, estatus_id ");
        $this->db->from('grupos_usuarios');
        $this->db->like('nombre',$strBusqueda); 
        $this->db->order_by('nombre','asc');
        $this->db->limit($intNumRows,$intPos);
        $res["grupos_usuarios"] =$this->db->get()->result();
        return $res;
    }

    public function buscar($id = null){
        $this->db->select('*');
        $this->db->from('grupos_usuarios');
        $this->db->where('grupo_usuario_id',$id);
        $this->db->limit(1);
        return $this->db->get()->row();
    }

    public function buscar_usuarios($strBusqueda, $intNumRows, $intPos, $id = null, $tipo = 1){
        //Tipo == 1 -> para los usuarios que pertenecen
        //Tipo == 2 -> para los que no pertenecen
        $this->db->select('U.usuario_id, U.usuario AS nombre');
        $this->db->from('usuarios AS U');
        $this->db->join('grupos_usuarios_detalles AS GUD', "U.usuario_id = GUD.usuario_id AND GUD.grupo_usuario_id = $id",'left');
        if($tipo == 1)
            $this->db->where('GUD.grupo_usuario_id',$id);  
        else
            $this->db->where('GUD.grupo_usuario_id', NULL);  
        $this->db->where('U.estatus_id <', 3);  
        $this->db->like('U.usuario',$strBusqueda); 
        $res["total_rows"] = count($this->db->get()->result());

        $this->db->select('U.usuario_id, U.usuario AS nombre');
        $this->db->from('usuarios AS U');
        $this->db->join('grupos_usuarios_detalles AS GUD', "U.usuario_id = GUD.usuario_id AND GUD.grupo_usuario_id = $id",'left');
        if($tipo == 1)
            $this->db->where('GUD.grupo_usuario_id',$id);  
        else
            $this->db->where('GUD.grupo_usuario_id', NULL);  
        $this->db->where('U.estatus_id <', 3);
        $this->db->like('U.usuario',$strBusqueda);
        $this->db->order_by('U.usuario','asc');
        $this->db->limit($intNumRows,$intPos);
        $res["usuarios"] = $this->db->get()->result();
        return $res;
    }

    public function agregar_usuario($intGrupoUsuarioID,$intUsuarioID){
        $datos = array(
            'grupo_usuario_id' => $intGrupoUsuarioID, 
            'usuario_id' => $intUsuarioID
            );
        $this->db->insert('grupos_usuarios_detalles',$datos);
        return $this->db->_error_message();
    }

    public function eliminar_usuario($intGrupoUsuarioID,$intUsuarioID){
        $this->db->where('grupo_usuario_id',$intGrupoUsuarioID);  
        $this->db->where('usuario_id',$intUsuarioID);  
		$this->db->limit(1);
		$this->db->delete('grupos_usuarios_detalles');
		return $this->db->_error_message();
    }

   
}   
?>