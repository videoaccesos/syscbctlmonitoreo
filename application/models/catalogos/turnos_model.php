<?php
class Turnos_Model extends CI_model
{
	public function guardar($strDescripcion,$intPuesto,$intEstatus){
		$datos = array(
			'descripcion' => $strDescripcion,
			'puesto_id' => $intPuesto,
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('turnos',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intTurnoID,$strDescripcion,$intPuesto,$intEstatus){
		$datos = array(
			'descripcion' => $strDescripcion, 
			'puesto_id' => $intPuesto,
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('turno_id',$intTurnoID);
		$this->db->limit(1);
		$this->db->update('turnos',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intTurnoID,$intEstatus){
		$datos = array(
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('turno_id',$intTurnoID);
		$this->db->limit(1);
		$this->db->update('turnos',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intTurnoID = null){
		$datos = array(
			'estatus_id' => 3,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('turno_id',$intTurnoID);
		$this->db->limit(1);
		$this->db->update('turnos',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('descripcion',$strBusqueda);
		$this->db->from('turnos');
		$this->db->where('estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("T.turno_id,T.descripcion, P.descripcion as puesto,
							(CASE T.estatus_id
										WHEN 1 THEN 'Activo'
										WHEN 2 THEN 'Baja'
									END) AS estatus, T.estatus_id ");
		$this->db->from('turnos as T inner join puestos as P on P.puesto_id = T.puesto_id');
		$this->db->where('T.estatus_id <>', 3);
		$this->db->like('T.descripcion',$strBusqueda);  
		$this->db->order_by('T.descripcion','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["turnos"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('turnos');
		$this->db->where('turno_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function turnos_cmb(){
		$this->db->select('turno_id AS value, descripcion AS nombre ');
		$this->db->from('turnos');
		$this->db->where('estatus_id',1);
		$this->db->order_by('descripcion','asc');
		return $this->db->get()->result();
	}
}	
?>