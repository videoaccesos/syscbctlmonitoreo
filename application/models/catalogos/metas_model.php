<?php
class Metas_Model extends CI_model
{
	public function guardar($intMesID,$intAnoID,$dblMeta,$intTipoMetaID,$intEstatus){
		$datos = array(
			'mes' => $intMesID,
			'ano' => $intAnoID,
			'meta' => $dblMeta,
			'tipo_meta_id' => $intTipoMetaID,
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('metas',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intMetaID,$intMesID,$intAnoID,$dblMeta,$intTipoMetaID,$intEstatus){
		$datos = array(
			'mes' => $intMesID, 
			'ano' => $intAnoID,
			'meta' => $dblMeta,
			'tipo_meta_id' => $intTipoMetaID,
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('meta_id',$intMetaID);
		$this->db->limit(1);
		$this->db->update('metas',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intMetaID,$intEstatus){
		$datos = array(
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('meta_id',$intMetaID);
		$this->db->limit(1);
		$this->db->update('metas',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intMetaID = null){
		$datos = array(
			'estatus_id' => 3,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('meta_id',$intMetaID);
		$this->db->limit(1);
		$this->db->update('metas',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->select("M.meta_id, M.ano, M.meta, U.usuario,
							(CASE M.mes
										WHEN 1 THEN 'Enero'
										WHEN 2 THEN 'Febrero'
										WHEN 3 THEN 'Marzo'
										WHEN 4 THEN 'Abril'
										WHEN 5 THEN 'Mayo'
										WHEN 6 THEN 'Junio'
										WHEN 7 THEN 'Julio'
										WHEN 8 THEN 'Agosto'
										WHEN 9 THEN 'Septiembre'
										WHEN 10 THEN 'Octubre'
										WHEN 11 THEN 'Noviembre'
										WHEN 12 THEN 'Diciembre'
									END) AS mes, TM.meta AS tipo_meta,
							(CASE M.estatus_id
										WHEN 1 THEN 'Activo'
										WHEN 2 THEN 'Baja'
									END) AS estatus, M.estatus_id", FALSE);
		$this->db->from('metas as M INNER JOIN tipos_metas as TM on M.tipo_meta_id = TM.meta_id INNER JOIN usuarios as U on M.usuario_id = U.usuario_id');
		$this->db->where('M.estatus_id <>', 3);
		$this->db->like('M.mes',$strBusqueda);  
		$this->db->order_by('M.mes','asc');
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("M.meta_id, M.ano, M.meta, U.usuario, TM.meta as tipo_meta,
							(CASE M.mes
										WHEN 1 THEN 'Enero'
										WHEN 2 THEN 'Febrero'
										WHEN 3 THEN 'Marzo'
										WHEN 4 THEN 'Abril'
										WHEN 5 THEN 'Mayo'
										WHEN 6 THEN 'Junio'
										WHEN 7 THEN 'Julio'
										WHEN 8 THEN 'Agosto'
										WHEN 9 THEN 'Septiembre'
										WHEN 10 THEN 'Octubre'
										WHEN 11 THEN 'Noviembre'
										WHEN 12 THEN 'Diciembre'
									END) AS mes,
							(CASE M.estatus_id
										WHEN 1 THEN 'Activo'
										WHEN 2 THEN 'Baja'
									END) AS estatus, M.estatus_id", FALSE);
		$this->db->from('metas as M INNER JOIN tipos_metas as TM on M.tipo_meta_id = TM.meta_id INNER JOIN usuarios as U on M.usuario_id = U.usuario_id');
		$this->db->where('M.estatus_id <>', 3);
		$this->db->like('M.mes',$strBusqueda);  
		$this->db->order_by('M.mes','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["metas"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('metas');
		$this->db->where('meta_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function metas_cmb(){
		$this->db->select('meta_id AS value, mes AS nombre ');
		$this->db->from('metas');
		$this->db->where('estatus_id',1);
		$this->db->order_by('mes','asc');
		return $this->db->get()->result();
	}
}	
?>