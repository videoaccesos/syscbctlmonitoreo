<?php
class Tarjetas_Model extends CI_model
{
	public function guardar($strLectura,$intTipoID,$intEstatusID){
		$datos = array(
			'lectura' => $strLectura,
			'tipo_id' => $intTipoID,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->set('fecha', 'NOW()', FALSE);
		$this->db->insert('tarjetas',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intTarjetaID,$strLectura,$intTipoID,$intEstatusID){
		$datos = array(
			'lectura' => $strLectura,
			'tipo_id' => $intTipoID,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('tarjeta_id',$intTarjetaID);
		$this->db->limit(1);
		$this->db->update('tarjetas',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intTarjetaID,$intEstatusID){
		$datos = array(
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('tarjeta_id',$intTarjetaID);
		$this->db->limit(1);
		$this->db->update('tarjetas',$datos);
		return $this->db->_error_message();
	}

	//Pendiente Primero realizare la parte de Registros
	public function filtro($strBusqueda,$strFechaIni,$strFechaFin,$intNumRows,$intPos){
		$this->db->from('tarjetas');
		if($strFechaIni != "" && $strFechaFin != ""){
			$this->db->where('DATE(fecha) >=', $strFechaIni);
			$this->db->where('DATE(fecha) <=', $strFechaFin);
		}
		$this->db->like('lectura', $strBusqueda);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select(" tarjeta_id,fecha, lectura, (CASE tipo_id
														 WHEN 1 THEN 'P'
														 WHEN 2 THEN 'V'
												   		END) AS tipo,
							(CASE estatus_id
								WHEN 1 THEN 'ACTIVA'
								WHEN 2 THEN 'ASIGNADA'
								WHEN 3 THEN 'DAÑADA'
						  	END) AS estatus, estatus_id,
		 					DATE_FORMAT(fecha,'%d-%m-%Y') AS fecha_formato ", FALSE);
		$this->db->from('tarjetas');
		if($strFechaIni != "" && $strFechaFin != ""){
			$this->db->where('DATE(fecha) >=', $strFechaIni);
			$this->db->where('DATE(fecha) <=', $strFechaFin);
		}
		$this->db->like('lectura', $strBusqueda);
		$this->db->order_by('fecha','desc');
		$this->db->order_by('lectura','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["tarjetas"] =$this->db->get()->result();
		//echo $this->db->last_query();
		return $res;
	}

	public function totales($strBusqueda,$strFechaIni,$strFechaFin){
		$this->db->from('tarjetas');
		if($strFechaIni != "" && $strFechaFin != ""){
			$this->db->where('DATE(fecha) >=', $strFechaIni);
			$this->db->where('DATE(fecha) <=', $strFechaFin);
		}
		$this->db->like('lectura', $strBusqueda);
		$this->db->like('estatus_id', 1);
		$res["total_activas"] = $this->db->count_all_results();

		$this->db->from('tarjetas');
		if($strFechaIni != "" && $strFechaFin != ""){
			$this->db->where('DATE(fecha) >=', $strFechaIni);
			$this->db->where('DATE(fecha) <=', $strFechaFin);
		}
		$this->db->like('lectura', $strBusqueda);
		$this->db->like('estatus_id', 2);
		$res["total_asignadas"] = $this->db->count_all_results();

		$this->db->from('tarjetas');
		if($strFechaIni != "" && $strFechaFin != ""){
			$this->db->where('DATE(fecha) >=', $strFechaIni);
			$this->db->where('DATE(fecha) <=', $strFechaFin);
		}
		$this->db->like('lectura', $strBusqueda);
		$this->db->like('estatus_id', 3);
		$res["total_danadas"] = $this->db->count_all_results();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select("tarjeta_id,lectura,tipo_id,estatus_id ",FALSE);
		$this->db->from('tarjetas');
		$this->db->where('tarjeta_id', $id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function autocomplete($q, $limit){
			$row_set = array();
			$this->db->select("tarjeta_id, lectura");
			$this->db->from('tarjetas');
			$this->db->where('estatus_id', 1);
			$this->db->where("lectura LIKE '%$q%'");  
			$this->db->order_by('lectura','asc');
			$this->db->limit($limit,0);
		    $query = $this->db->get();
		    if($query->num_rows > 0){
		      foreach ($query->result_array() as $row){
		        $new_row['value'] = $row['lectura']; //Valor a Mostrar en lista
		        $new_row['data'] = $row['tarjeta_id']; //Valor del ID
		        $row_set[] = $new_row; //build an array
		      }
		    }
		    return $row_set; //format the array into json data
		}
}
?>