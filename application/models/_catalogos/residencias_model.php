<?php 
class Residencias_Model extends CI_model
{
	public function autocompleteNroCasa($q, $limit, $intPrivadaID = 0){
	    $this->db->select('residencia_id,nro_casa,calle,estatus_id');
	    $this->db->where('estatus_id <', 4);
	    if($intPrivadaID > 0)
	    	$this->db->where('privada_id',$intPrivadaID);
	    $this->db->like('nro_casa', $q);
	    $this->db->limit($limit, 0);
	    $this->db->order_by('nro_casa','asc');
	    $query = $this->db->get('residencias');
	    if($query->num_rows > 0){
	      foreach ($query->result_array() as $row){
	        $new_row['value'] = $row['nro_casa'].", ".$row['calle']; //Valor a Mostrar en lista
	        $new_row['data'] = $row['residencia_id']; //Valor del ID
	        $new_row['estatus_id'] = $row['estatus_id'];
	        $row_set[] = $new_row; //build an array
	      }
	    }else {
	    	$row_set[0]['value'] = "No se encontraron coincidencias!!!";
	    	$row_set[0]['data'] = "";
	    }
	    return $row_set; //format the array into json data
	}

	public function autocompleteResidente($q, $limit, $intPrivadaID = 0){
		$this->db->select("R.residencia_id,CONCAT_WS(' ',RR.nombre,RR.ape_paterno,' ',RR.ape_materno) AS residente,R.nro_casa,R.calle,R.estatus_id",FALSE);
		$this->db->from('residencias AS R');
		$this->db->join('residencias_residentes AS RR','R.residencia_id = RR.residencia_id');
		if($intPrivadaID > 0)
			$this->db->where('R.privada_id', $intPrivadaID);
		$this->db->where("(CONCAT_WS(' ',RR.nombre,(CASE RR.ape_paterno WHEN '' THEN null ELSE RR.ape_paterno END),RR.ape_materno) LIKE '%$q%') ");  
		$this->db->where('R.estatus_id <', 4);
		$this->db->where('RR.estatus_id', 1);
		$this->db->order_by('residente','asc');
		$this->db->limit($limit,0);
	    $query = $this->db->get();
	    if($query->num_rows > 0){
	      foreach ($query->result_array() as $row){
	        $new_row['value'] = $row['residente'].", ".$row['nro_casa'].", ".$row['calle']; //Valor a Mostrar en lista
	        $new_row['data'] = $row['residencia_id']; //Valor del ID
	        $row_set[] = $new_row; //build an array
	      }
	    }else {
	    	$row_set[0]['value'] = "No se encontraron coincidencias!!!";
	    	$row_set[0]['data'] = "";
	    }
	    return $row_set; //format the array into json data
	}

	public function filtro($strBusqueda, $strPrivada, $intNumRows, $intPos){
		$this->db->from('residencias AS R');
		$this->db->join('privadas AS P', 'R.privada_id = P.privada_id', 'inner');
		$this->db->where("CONCAT_WS(' ',R.nro_casa,R.calle) LIKE '%$strBusqueda%'");  
		$this->db->like('P.descripcion',$strPrivada);   
		$this->db->where('R.estatus_id <', 4);
	
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("R.residencia_id,R.nro_casa, R.calle, 
							(   CASE R.estatus_id
									WHEN 1 THEN 'Activo'
									WHEN 2 THEN 'Inactivo'
									WHEN 3 THEN 'Moroso'
								END) AS estatus, P.descripcion AS privada, R.estatus_id ", FALSE);
		$this->db->from('residencias AS R');
		$this->db->join('privadas AS P', 'R.privada_id = P.privada_id', 'inner');
		$this->db->where("CONCAT_WS(' ',R.nro_casa,R.calle) LIKE '%$strBusqueda%'");  
		$this->db->like('P.descripcion',$strPrivada);   
		$this->db->where('R.estatus_id <', 4);
		$this->db->order_by("privada,R.nro_casa,R.calle",'asc');

		$this->db->limit($intNumRows,$intPos);
		$res["residencias"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('R.*,P.descripcion AS privada');
		$this->db->from('residencias AS R');
		$this->db->join('privadas AS P', 'R.privada_id = P.privada_id', 'inner');
		$this->db->where("R.residencia_id",$id);  
		$this->db->where('R.estatus_id <', 4);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function guardar($intPrivadaID,$strNroCasa,$strCalle,$strTelefono1,$strTelefono2,$strInterfon,$strObservaciones,$intEstatusID){
		$datos = array(
			'privada_id' => $intPrivadaID, 
			'nro_casa' => $strNroCasa,
			'calle' => $strCalle,
			'telefono1' => $strTelefono1,
			'telefono2' => $strTelefono2,
			'interfon' => $strInterfon,
			'observaciones' => $strObservaciones,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('residencias',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intResidenciaID,$intPrivadaID,$strNroCasa,$strCalle,$strTelefono1,$strTelefono2,$strInterfon,$strObservaciones,$intEstatusID){
		$datos = array(
			'privada_id' => $intPrivadaID, 
			'nro_casa' => $strNroCasa,
			'calle' => $strCalle,
			'telefono1' => $strTelefono1,
			'telefono2' => $strTelefono2,
			'interfon' => $strInterfon,
			'observaciones' => $strObservaciones,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('residencia_id',$intResidenciaID);
		$this->db->limit(1);
		$this->db->update('residencias',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intResidenciaID,$intEstatus){
		$datos = array(
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('residencia_id',$intResidenciaID);
		$this->db->limit(1);
		$this->db->update('residencias',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intResidenciaID = null){
		$this->db->trans_begin();

		$datos = array(
			'estatus_id' => 4, // se manda porque 1.-Activo 2.-Inactivo 3.-Moroso 4.-Eliminado
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where("residencia_id", $intResidenciaID);
		$this->db->update('residencias',$datos);
        
		$datos = array(
			'estatus_id' => 3, // se manda porque 1.-Activo 3.- Eliminado
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where("residencia_id", $intResidenciaID);
		$this->db->update('residencias_residentes',$datos);
		
		$datos = array(
			'estatus_id' => 3, // se manda porque 1.-Activo 2.-Baja 3.- Eliminado
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where("residencia_id", $intResidenciaID);
		$this->db->update('residencias_visitantes',$datos);
		
		if ($this->db->trans_status() === FALSE)
		    $this->db->trans_rollback();
		else
		    $this->db->trans_commit();
		return $this->db->_error_message();
	}

	public function info($id = null){
		$this->db->select("(CASE estatus_id
							  WHEN 1 THEN 'Activo'
							  WHEN 2 THEN 'Inactivo'
							  WHEN 3 THEN 'Moroso'
							END) AS estado, interfon, observaciones",FALSE);
		$this->db->from('residencias');
		$this->db->where("residencia_id",$id);
		$this->db->where('estatus_id <', 4);  
		$this->db->limit(1);
		return $this->db->get()->row();
	}
}	
?>