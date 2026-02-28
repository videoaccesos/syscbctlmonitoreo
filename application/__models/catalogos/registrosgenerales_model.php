<?php
class RegistrosGenerales_Model extends CI_model
{
	public function guardar($strRegistroGeneralID,$strApePaterno,$strApeMaterno,$strNombre,$strTelefono,$strCelular,$strFechanac,$strEmail,$strObservaciones,$intEstatusID){
		$datos = array(
			'registro_general_id' => $strRegistroGeneralID,
			'ape_paterno' => strtoupper($strApePaterno),
			'ape_materno' => strtoupper($strApeMaterno),
			'nombre' => strtoupper($strNombre),
			'telefono' => $strTelefono,
			'celular' => $strCelular,
			'fechanac' => $strFechanac,
			'email' => strtoupper($strEmail),
			'observaciones' => strtoupper($strObservaciones),
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('registros_generales',$datos);
		return $this->db->_error_message();
	}

	public function modificar($strRegistroGeneralID,$strApePaterno,$strApeMaterno,$strNombre,$strTelefono,$strCelular,$strFechanac,$strEmail,$strObservaciones,$intEstatusID){
		$datos = array(
			'ape_paterno' => strtoupper($strApePaterno),
			'ape_materno' => strtoupper($strApeMaterno),
			'nombre' => strtoupper($strNombre),
			'telefono' => $strTelefono,
			'celular' => $strCelular,
			'fechanac' => $strFechanac,
			'email' => strtoupper($strEmail),
			'observaciones' => strtoupper($strObservaciones),
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('registro_general_id',$strRegistroGeneralID);
		$this->db->limit(1);
		$this->db->update('registros_generales',$datos);
		if(!$this->db->_error_message())
			$this->bitacora->guardar($strRegistroGeneralID,$this->session->userdata('usuario_id'),'registros_generales');
		return $this->db->_error_message();
	}

	public function eliminar($strRegistroGeneralID = null){
		$datos = array(
			'estatus_id' => 3,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('registro_general_id',$strRegistroGeneralID);
		$this->db->limit(1);
		$this->db->update('registros_generales',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strNombre,$strApePaterno,$strApeMaterno,$intNumRows,$intPos){
		$this->db->where("(nombre LIKE '%$strNombre%' AND ape_paterno LIKE '%$strApePaterno%' AND ape_materno LIKE '%$strApeMaterno%') ");  
		$this->db->from('registros_generales');
		$this->db->where('estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("registro_general_id, CONCAT(nombre,' ',ape_paterno,' ',ape_materno) AS persona, 
							(CASE estatus_id
								WHEN 1 THEN 'Activo'
								WHEN 2 THEN 'Baja'
							 END) AS estatus ", FALSE);
		$this->db->from('registros_generales');
		$this->db->where('estatus_id <>', 3);
		$this->db->where("(nombre LIKE '%$strNombre%' AND ape_paterno LIKE '%$strApePaterno%' AND ape_materno LIKE '%$strApeMaterno%') ");  
		$this->db->order_by("persona",'asc');
		$this->db->limit($intNumRows,$intPos);
		$res["registros_generales"] =$this->db->get()->result();
		return $res;
	}

	public function copia_filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->where("(nombre LIKE '%$strBusqueda%' OR ape_paterno LIKE '%$strBusqueda%' OR ape_materno LIKE '%$strBusqueda%') ");  
		$this->db->from('registros_generales');
		$this->db->where('estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("registro_general_id, CONCAT(nombre,' ',ape_paterno,' ',ape_materno) AS persona, 
							(CASE estatus_id
								WHEN 1 THEN 'Activo'
								WHEN 2 THEN 'Baja'
							 END) AS estatus ", FALSE);
		$this->db->from('registros_generales');
		$this->db->where('estatus_id <>', 3);
		$this->db->where("(nombre LIKE '%$strBusqueda%' OR ape_paterno LIKE '%$strBusqueda%' OR ape_materno LIKE '%$strBusqueda%') ");  
		$this->db->order_by("persona",'asc');
		$this->db->limit($intNumRows,$intPos);
		$res["registros_generales"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($strRegistroGeneralID = null){
		$this->db->select('*');
		$this->db->from('registros_generales');
		$this->db->where('registro_general_id',$strRegistroGeneralID);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function autocomplete($q, $limit){
		$row_set = array();
		$this->db->select("RG.registro_general_id,CONCAT_WS(' ','G -',RG.nombre,RG.ape_paterno,RG.ape_materno) AS persona",FALSE);
		$this->db->from('registros_generales AS RG');
		$this->db->where("(CONCAT_WS(' ',RG.nombre,(CASE RG.ape_paterno WHEN '' THEN null ELSE RG.ape_paterno END),RG.ape_materno)) LIKE  '%$q%' ");  
		$this->db->order_by('persona','asc');
		$this->db->limit($limit,0);
	    $query = $this->db->get();
	    if($query->num_rows > 0){
	      foreach ($query->result_array() as $row){
	        $new_row['value'] = $row['persona']; //Valor a Mostrar en lista
	        $new_row['data'] = $row['registro_general_id']; //Valor del ID
	        $row_set[] = $new_row; //build an array
	      }
	    }
	    return $row_set; //format the array into json data
	}

	public function info($id = null){
		$this->db->select("2 AS tipo, (CASE estatus_id
							  WHEN 1 THEN 'Activo'
							  WHEN 2 THEN 'Baja'
							END) AS estado, observaciones",FALSE);
		$this->db->from('registros_generales');
		$this->db->where("registro_general_id",$id);  
		$this->db->limit(1);
		return $this->db->get()->row();
	}
}	
?>