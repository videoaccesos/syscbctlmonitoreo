<?php
class Subprocesos_Model extends CI_model
{
	public function guardar($intProcesoID,$strNombre,$strFuncion)
	{
		$datos = array(
			'proceso_id' => $intProcesoID, 
			'nombre' => $strNombre,
			'funcion' => $strFuncion,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('subprocesos',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intSubprocesoID,$intProcesoID,$strNombre,$strFuncion)
	{
		$datos = array(
			'proceso_id' => $intProcesoID, 
			'nombre' => $strNombre,
			'funcion' => $strFuncion,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('subproceso_id',$intSubprocesoID);
		$this->db->limit(1);
		$this->db->update('nombre',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intSubprocesoID = null){
		$this->db->trans_begin();
		
		$this->db->where('subproceso_id',$intSubprocesoID);  
		$this->db->limit(1);
		$this->db->delete('subprocesos');

		$this->db->where('subproceso_id',$intSubprocesoID);  
		$this->db->delete('permisos_acceso');

		$this->db->trans_complete();
		if ($this->db->trans_status() === FALSE)
			$this->db->trans_rollback();
		else
			$this->db->trans_commit();
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('nombre',$strBusqueda);
		$this->db->from('subprocesos');
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select('S.nombre, S.funcion, P.nombre AS proceso');
		$this->db->from('subprocesos AS S');
		$this->db->join('procesos AS P','S.proceso_id = P.proceso_id');
		$this->db->like('S.nombre',$strBusqueda);
		$this->db->order_by('S.nombre','asc');
		$this->db->limit($intNumRows,$intPos);
		
		$res["subprocesos"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('subprocesos');
		$this->db->where('subproceso_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function buscar_subprocesos($id = null){
        $this->db->select('subproceso_id,nombre,funcion');
        $this->db->from('subprocesos');
        $this->db->where('proceso_id',$id);
        $this->db->order_by('nombre');
        return $this->db->get()->result();
    }
}
?>