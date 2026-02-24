<?php
class Residencias_Visitantes_Model extends CI_model
{
	public function guardar($strVisitanteID,$intResidenciaID,$strApePaterno,$strApeMaterno,$strNombre,$strTelefono,$strCelular,$strEmail,$strObservaciones,$intEstatusID){
		$datos = array(
			'visitante_id' => $strVisitanteID,
			'residencia_id' => $intResidenciaID,
			'ape_paterno' => $strApePaterno,
			'ape_materno' => $strApeMaterno,
			'nombre' => $strNombre, 
			'telefono' => $strTelefono,
			'celular' => $strCelular,
			'email' => $strEmail,
			'observaciones' => $strObservaciones,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('residencias_visitantes',$datos);
		return $this->db->_error_message();
	}

	public function modificar($strVisitanteID,$intResidenciaID,$strApePaterno,$strApeMaterno,$strNombre,$strTelefono,$strCelular,$strEmail,$strObservaciones,$intEstatusID){
		$datos = array(
			'residencia_id' => $intResidenciaID,
			'ape_paterno' => $strApePaterno,
			'ape_materno' => $strApeMaterno,
			'nombre' => $strNombre, 
			'telefono' => $strTelefono,
			'celular' => $strCelular,
			'email' => $strEmail,
			'observaciones' => $strObservaciones,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('visitante_id',$strVisitanteID);
		$this->db->limit(1);
		$this->db->update('residencias_visitantes',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($strVisitanteID = null){
		$datos = array(
			'estatus_id' => 3,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('visitante_id',$strVisitanteID);
		$this->db->limit(1);
		$this->db->update('residencias_visitantes',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->where("(RV.nombre LIKE '%$strBusqueda%' OR RV.ape_paterno LIKE '%$strBusqueda%' OR RV.ape_materno LIKE  '%$strBusqueda%') ");  
		$this->db->from('residencias_visitantes AS RV');
		//$this->db->join('residencias AS R', 'R.residencia_id = RV.residencia_id', 'inner');
		$this->db->where('RV.estatus_id <', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("RV.visitante_id, CONCAT(RV.nombre,' ',RV.ape_paterno,' ',RV.ape_materno) AS visitante, 
							(CASE RV.estatus_id
								WHEN 1 THEN 'Activo'
								WHEN 2 THEN 'Baja'
							 END) AS estatus ", FALSE);
		$this->db->from('residencias_visitantes AS RV');
		//$this->db->join('residencias AS R', 'R.residencia_id = RV.residencia_id', 'inner');
		$this->db->where('RV.estatus_id <', 3);
		$this->db->where("(RV.nombre LIKE '%$strBusqueda%' OR RV.ape_paterno LIKE '%$strBusqueda%' OR RV.ape_materno LIKE  '%$strBusqueda%') ");  
		$this->db->order_by("visitante",'asc');
		$this->db->limit($intNumRows,$intPos);
		$res["residencias_visitantes"] =$this->db->get()->result();
		return $res;
	}

	public function filtro_separado($intResidenciaID,$strApePaterno,$strApeMaterno,$strNombre, $intNumRows, $intPos){
		
		$this->db->from('residencias_visitantes AS RV');
		//$this->db->join('residencias AS R', 'R.residencia_id = RR.residencia_id', 'inner');
		$this->db->where('RV.residencia_id', $intResidenciaID);
		$this->db->where("(RV.nombre LIKE '%$strNombre%' AND RV.ape_paterno LIKE '%$strApePaterno%' AND RV.ape_materno LIKE  '%$strApeMaterno%') ");  
		$this->db->where('RV.estatus_id <', 3);

		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("RV.visitante_id, CONCAT(RV.nombre,' ',RV.ape_paterno,' ',RV.ape_materno) AS visitante, 
							(CASE RV.estatus_id
								WHEN 1 THEN 'Activo'
								WHEN 2 THEN 'Baja'
							 END) AS estatus, RV.celular ", FALSE);
		$this->db->from('residencias_visitantes AS RV');
		//$this->db->join('residencias AS R', 'R.residencia_id = RR.residencia_id', 'inner');
		$this->db->where('RV.residencia_id', $intResidenciaID);
		$this->db->where("(RV.nombre LIKE '%$strNombre%' AND RV.ape_paterno LIKE '%$strApePaterno%' AND RV.ape_materno LIKE  '%$strApeMaterno%') ");  
		$this->db->where('RV.estatus_id <', 3);
		$this->db->order_by("visitante",'asc');
		$this->db->limit($intNumRows,$intPos);
		$res["visitantes"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($strVisitanteID = null){
		$this->db->select('*');
		$this->db->from('residencias_visitantes');
		$this->db->where('visitante_id',$strVisitanteID);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function autocomplete($q, $limit, $intResidenciaID = 0){
		$row_set = array();
		$this->db->select("RV.visitante_id,CONCAT_WS(' ','V -',RV.nombre,RV.ape_paterno,RV.ape_materno) AS visitante",FALSE);
		$this->db->from('residencias_visitantes AS RV');
		if($intResidenciaID > 0)
			$this->db->where('RV.residencia_id', $intResidenciaID);
		$this->db->where("(CONCAT_WS(' ',RV.nombre,(CASE RV.ape_paterno WHEN '' THEN null ELSE RV.ape_paterno END),RV.ape_materno) LIKE  '%$q%') ");  
		$this->db->where('RV.estatus_id',1); 
		$this->db->order_by('visitante','asc');
		$this->db->limit($limit,0);
	    $query = $this->db->get();
	    if($query->num_rows > 0){
	      foreach ($query->result_array() as $row){
	        $new_row['value'] = $row['visitante']; //Valor a Mostrar en lista
	        $new_row['data'] = $row['visitante_id']; //Valor del ID
	        $row_set[] = $new_row; //build an array
	      }
	    }
	    return $row_set; //format the array into json data
	}

	public function info($id = null){
		$this->db->select("1 AS tipo, (CASE estatus_id
							  WHEN 1 THEN 'Activo'
							  WHEN 2 THEN 'Baja'
							END) AS estado, observaciones",FALSE);
		$this->db->from('residencias_visitantes');
		$this->db->where("visitante_id",$id);  
		$this->db->limit(1);
		return $this->db->get()->row();
	}
}	
?>