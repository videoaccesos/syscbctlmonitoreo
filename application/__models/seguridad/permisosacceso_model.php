<?php 
class PermisosAcceso_Model extends CI_model
{
    public function agregar_subproceso($intGrupoUsuarioID,$intSubprocesoID)
    {
        $datos = array(
            'grupo_usuario_id' => $intGrupoUsuarioID, 
            'subproceso_id' => $intSubprocesoID );
        $this->db->insert('permisos_acceso',$datos);
        return $this->db->_error_message();
    }

    public function eliminar_subproceso($intGrupoUsuarioID,$intSubprocesoID)
    {        
        $this->db->where('grupo_usuario_id',$intGrupoUsuarioID);  
        $this->db->where('subproceso_id',$intSubprocesoID);  
		$this->db->limit(1);
		$this->db->delete('permisos_acceso');
		return $this->db->_error_message();
    }

    public function buscar_permisos($intGrupoUsuarioID,$intProcesoID){
        if($intGrupoUsuarioID == "")
            $intGrupoUsuarioID = 0;
        $this->db->select('SP.proceso_id, SP.subproceso_id, SP.nombre, SP.funcion, PA.grupo_usuario_id');
        $this->db->from('subprocesos AS SP');
        $this->db->join('permisos_acceso AS PA', "SP.subproceso_id = PA.subproceso_id AND PA.grupo_usuario_id = $intGrupoUsuarioID", 'left');
        $this->db->where('SP.proceso_id',$intProcesoID);
        //$this->db->order_by('SP.nombre','asc');
        return $this->db->get()->result();
    }
}   
?>