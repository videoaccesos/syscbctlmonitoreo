<?php
class CodigosServicio_Model extends CI_model
{
	public function guardar($strCodigo,$strDescripcion,$intEstatus){
		$datos = array(
			'codigo' => $strCodigo, 
			'descripcion' => $strDescripcion,
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('codigos_servicio',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intCodigoServicioID,$strCodigo,$strDescripcion,$intEstatus){
		$datos = array(
			'codigo' => $strCodigo, 
			'descripcion' => $strDescripcion, 
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('codigo_servicio_id',$intCodigoServicioID);
		$this->db->limit(1);
		$this->db->update('codigos_servicio',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intCodigoServicioID,$intEstatus){
		$datos = array(
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('codigo_servicio_id',$intCodigoServicioID);
		$this->db->limit(1);
		$this->db->update('codigos_servicio',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intCodigoServicioID = null){
		$datos = array(
			'estatus_id' => 3,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('codigo_servicio_id',$intCodigoServicioID);
		$this->db->limit(1);
		$this->db->update('codigos_servicio',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('descripcion',$strBusqueda);
		$this->db->from('codigos_servicio');
		$this->db->where('estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("codigo_servicio_id,codigo,descripcion, 
							(   CASE estatus_id
									WHEN 1 THEN 'Activo'
									WHEN 2 THEN 'Baja'
								END) AS estatus,estatus_id ");
		$this->db->from('codigos_servicio');
		$this->db->where('estatus_id <>', 3);
		$this->db->like('descripcion',$strBusqueda);  
		$this->db->order_by('codigo','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["codigosservicio"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('codigos_servicio');
		$this->db->where('codigo_servicio_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function codigosservicio_cmb(){
		$this->db->select('codigo_servicio_id AS value,descripcion AS nombre');
		$this->db->from('codigos_servicio');
		$this->db->where('estatus_id',1);
		$this->db->order_by('descripcion','asc');
		return $this->db->get()->result();
	}
}	
?>