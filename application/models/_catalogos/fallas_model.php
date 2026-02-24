<?php
class Fallas_Model extends CI_model
{
	public function guardar($strCodigo,$strDescripcion,$intEstatus){
		$datos = array(
			'codigo' => $strCodigo, 
			'descripcion' => $strDescripcion,
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('fallas',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intFallaID,$strCodigo,$strDescripcion,$intEstatus){
		$datos = array(
			'codigo' => $strCodigo, 
			'descripcion' => $strDescripcion, 
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('falla_id',$intFallaID);
		$this->db->limit(1);
		$this->db->update('fallas',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intFallaID,$intEstatus){
		$datos = array(
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('falla_id',$intFallaID);
		$this->db->limit(1);
		$this->db->update('fallas',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intFallaID = null){
		$datos = array(
			'estatus_id' => 3,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('falla_id',$intFallaID);
		$this->db->limit(1);
		$this->db->update('fallas',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('descripcion',$strBusqueda);
		$this->db->from('fallas');
		$this->db->where('estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("falla_id,codigo,descripcion, 
							(   CASE estatus_id
									WHEN 1 THEN 'Activo'
									WHEN 2 THEN 'Baja'
								END) AS estatus,estatus_id ");
		$this->db->from('fallas');
		$this->db->where('estatus_id <>', 3);
		$this->db->like('descripcion',$strBusqueda);  
		$this->db->order_by('codigo','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["fallas"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('fallas');
		$this->db->where('falla_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function fallas_cmb(){
		$this->db->select('falla_id AS value,descripcion AS nombre');
		$this->db->from('fallas');
		$this->db->where('estatus_id',1);
		$this->db->order_by('descripcion','asc');
		return $this->db->get()->result();
	}
}	
?>