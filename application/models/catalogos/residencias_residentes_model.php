<?php
class Residencias_Residentes_Model extends CI_model
{
	public function guardar($strResidenteID,$intResidenciaID,$strApePaterno,$strApeMaterno,$strNombre,$strCelular,$strEmail,$intNotificar,$intEstatusID){
		$datos = array(
			'residente_id' => $strResidenteID,
			'residencia_id' => $intResidenciaID,
			'ape_paterno' => $strApePaterno,
			'ape_materno' => $strApeMaterno,
			'nombre' => $strNombre, 
			'celular' => $strCelular,
			'email' => $strEmail,
			'reportar_acceso' => $intNotificar,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('residencias_residentes',$datos);
		return $this->db->_error_message();
	}

	public function modificar($strResidenteID,$intResidenciaID,$strApePaterno,$strApeMaterno,$strNombre,$strCelular,$strEmail,$intNotificar,$intEstatusID){
		$datos = array(
			'residencia_id' => $intResidenciaID,
			'ape_paterno' => $strApePaterno,
			'ape_materno' => $strApeMaterno,
			'nombre' => $strNombre, 
			'celular' => $strCelular,
			'email' => $strEmail,
			'reportar_acceso' => $intNotificar,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('residente_id',$strResidenteID);
		$this->db->limit(1);
		$this->db->update('residencias_residentes',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($strResidenteID = null){
		$datos = array(
			'estatus_id' => 3,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('residente_id',$strResidenteID);
		$this->db->limit(1);
		$this->db->update('residencias_residentes',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		
		$this->db->from('residencias_residentes AS RR');
		$this->db->where("CONCAT_WS(' ',RR.nombre,(CASE RR.ape_paterno WHEN '' THEN null ELSE RR.ape_paterno END),RR.ape_materno) LIKE '%$strBusqueda%') ");  
		//$this->db->join('residencias AS R', 'R.residencia_id = RR.residencia_id', 'inner');
		$this->db->where('RR.estatus_id <', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("RR.residente_id, CONCAT(RR.nombre,' ',RR.ape_paterno,' ',RR.ape_materno) AS residente, 
							(CASE RR.estatus_id
								WHEN 1 THEN 'Activo'
								WHEN 2 THEN 'Baja'
							 END) AS estatus ", FALSE);
		$this->db->from('residencias_residentes AS RR');
		//$this->db->join('residencias AS R', 'R.residencia_id = RR.residencia_id', 'inner');
		$this->db->where("(CONCAT_WS(' ',RR.nombre,(CASE RR.ape_paterno WHEN '' THEN null ELSE RR.ape_paterno END),RR.ape_materno) LIKE '%$strBusqueda%') ");  
		$this->db->where('RR.estatus_id <', 3);		
		$this->db->order_by("residente",'asc');
		$this->db->limit($intNumRows,$intPos);
		$res["residencias_residentes"] =$this->db->get()->result();
		return $res;
	}
	//Método que se utiliza para regresar los datos de los residentes de la tabla privadas 
	//que coincidan con los parametros de búsqueda (para mostrarlos en el grid del reporte residentes)	
	public function filtro_consulta($intPrivadaID,$strEstatus, $intNumRows, $intPos){
        $intNumeroRegistros=0;
        $this->db->select("COUNT(DISTINCT RR.residente_id) AS total_residentes",FALSE);
		$this->db->from('residencias_residentes RR');
	    $this->db->join('residencias R','R.residencia_id=RR.residencia_id','inner');
	    $this->db->join('privadas P','P.privada_id=R.privada_id ','inner');
	    $this->db->join('residencias_residentes_tarjetas RRT','RRT.residente_id = RR.residente_id','left');
		$this->db->join('tarjetas T','RRT.tarjeta_id = T.tarjeta_id','left');
        //Si el id de la privada es diferente de 0, búsca por privada 
		if($intPrivadaID != 0)
		{
			$this->db->where('R.privada_id', $intPrivadaID);
		}
		$this->db->where('R.estatus_id <>', 5);
		//Si el estatus es diferente de 0, búsca por estatus_id
		if($strEstatus!=0)
		{
		  $this->db->where('R.estatus_id', $strEstatus);
		}
		//Si regresa datos
		if ($row = $this->db->get()->row()){
			$intNumeroRegistros=$row->total_residentes;

		}
		$res["total_rows"] =$intNumeroRegistros;

		$this->db->select("T.Tarjeta_id, RR.residente_id, P.descripcion AS privada,R.nro_casa, R.calle, R.interfon,
						   CONCAT_WS(' ',RR.nombre,RR.ape_paterno,RR.ape_materno) AS residente,
						   RR.email,R.telefono1,R.telefono2, RR.celular,
						       (CASE R.estatus_id
									WHEN 1 THEN 'Interfon Activo'
									WHEN 2 THEN 'Sin Interfon'
									WHEN 3 THEN 'Moroso'
									WHEN 4 THEN 'Sin Derechos'
								END) AS estatus_id,
						   (SELECT COUNT( T.tarjeta_id ) 
							FROM ((residencias_residentes_tarjetas RRT LEFT JOIN tarjetas T ON RRT.tarjeta_id = T.tarjeta_id)
								   LEFT JOIN residencias_residentes RR2 ON RRT.residente_id = RR2.residente_id)
								   LEFT JOIN residencias R2 ON R2.residencia_id=RR2.residencia_id
							WHERE R2.residencia_id=R.residencia_id AND RR2.residente_id =RR.residente_id AND R2.estatus_id=R.estatus_id
							) AS no_tarjetas",FALSE);
		 
		$this->db->from('residencias_residentes RR');
	    $this->db->join('residencias R','R.residencia_id=RR.residencia_id','inner');
	    $this->db->join('privadas P','P.privada_id=R.privada_id ','inner');
	    $this->db->join('residencias_residentes_tarjetas RRT','RRT.residente_id = RR.residente_id','left');
		$this->db->join('tarjetas T','RRT.tarjeta_id = T.tarjeta_id','left');
		//Si el id de la privada es diferente de 0, búsca por privada 
		if($intPrivadaID != 0)
		{
			$this->db->where('R.privada_id', $intPrivadaID);
		}
		$this->db->where('R.estatus_id <>', 5);
		//Si el estatus es diferente de 0, búsca por estatus_id
		if($strEstatus!=0)
		{
		  $this->db->where('R.estatus_id', $strEstatus);
		}
		
		$this->db->group_by('RR.residente_id');
		$this->db->order_by('privada,residente','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["rows"] =$this->db->get()->result();
		
		return $res;
	}


	public function filtro_asignacion_tarjetas($strLectura = "",$strResidente, $strNumCalle, $intPrivadaID, $intNumRows, $intPos){
		$this->db->distinct();
		$this->db->select("R.residencia_id,P.descripcion AS privada,R.nro_casa,R.calle,
					   R.estatus_id, (SELECT COUNT(*) 
					   	              FROM  residencias_residentes_tarjetas 
					   	              WHERE residente_id IN (SELECT residente_id FROM residencias_residentes WHERE residencia_id = RR.residencia_id)
					   	              AND   estatus_id = 1) AS activas, ( SELECT COUNT(*) 
														   	              FROM  residencias_residentes_tarjetas 
														   	              WHERE residente_id IN (SELECT residente_id FROM residencias_residentes WHERE residencia_id = RR.residencia_id)
														   	              AND   estatus_id = 2) AS inactivas, (CASE R.estatus_id
																													WHEN 1 THEN 'Interfon Activo'
																													WHEN 2 THEN 'Sin Interfon'
																													WHEN 3 THEN 'Moroso'
																													WHEN 4 THEN 'Sin Derechos'
																												END) AS estatus  ", FALSE);
		$this->db->from('residencias AS R');
		$this->db->join('privadas AS P', 'R.privada_id = P.privada_id', 'inner');
		$this->db->join('residencias_residentes AS RR', 'R.residencia_id = RR.residencia_id', 'left');
		$this->db->where("P.privada_id = $intPrivadaID"); 
		$this->db->where("R.estatus_id <= 3");     
		$this->db->where("CONCAT_WS(' ',R.nro_casa,R.calle) LIKE '%$strNumCalle%'");  
		$this->db->where("CONCAT_WS(' ',TRIM(RR.nombre),TRIM(RR.ape_paterno),TRIM(RR.ape_materno)) LIKE '%$strResidente%' ");  

		$res["total_rows"] = count($this->db->get()->result()); 
		
		$this->db->distinct();
		$this->db->select("R.residencia_id,P.descripcion AS privada,R.nro_casa,R.calle,
						   R.estatus_id, (SELECT COUNT(*) 
						   	              FROM  residencias_residentes_tarjetas 
						   	              WHERE residente_id IN (SELECT residente_id FROM residencias_residentes WHERE residencia_id = RR.residencia_id)
						   	              AND   estatus_id = 1) AS activas, ( SELECT COUNT(*) 
															   	              FROM  residencias_residentes_tarjetas 
															   	              WHERE residente_id IN (SELECT residente_id FROM residencias_residentes WHERE residencia_id = RR.residencia_id)
															   	              AND   estatus_id = 2) AS inactivas, (CASE R.estatus_id
																														WHEN 1 THEN 'Interfon Activo'
																														WHEN 2 THEN 'Sin Interfon'
																														WHEN 3 THEN 'Moroso'
																														WHEN 4 THEN 'Sin Derechos'
																													END) AS estatus  ", FALSE);
		$this->db->from('residencias AS R');
		$this->db->join('privadas AS P', 'R.privada_id = P.privada_id', 'inner');
		$this->db->join('residencias_residentes AS RR', 'R.residencia_id = RR.residencia_id', 'left');
		$this->db->where("P.privada_id = $intPrivadaID"); 
		$this->db->where("R.estatus_id <= 3");     
		$this->db->where("CONCAT_WS(' ',R.nro_casa,R.calle) LIKE '%$strNumCalle%'");  
		$this->db->where("CONCAT_WS(' ',TRIM(RR.nombre),TRIM(RR.ape_paterno),TRIM(RR.ape_materno)) LIKE '%$strResidente%' ");  
		//$this->db->order_by("residente",'asc');
		$this->db->order_by("privada, nro_casa",'asc');

		$this->db->limit($intNumRows,$intPos);
		$res["residentes"] = $this->db->get()->result();
		return $res;
	}

	public function filtro_separado($intResidenciaID,$strApePaterno,$strApeMaterno,$strNombre, $intNumRows, $intPos){
		$this->db->where("(RR.nombre LIKE '%$strNombre%' AND RR.ape_paterno LIKE '%$strApePaterno%' AND RR.ape_materno LIKE  '%$strApeMaterno%') ");  
		$this->db->from('residencias_residentes AS RR');
		//$this->db->join('residencias AS R', 'R.residencia_id = RR.residencia_id', 'inner');
		$this->db->where('RR.residencia_id', $intResidenciaID);
		$this->db->where('RR.estatus_id <', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("RR.residente_id, CONCAT(RR.nombre,' ',RR.ape_paterno,' ',RR.ape_materno) AS residente, 
							(CASE RR.estatus_id
								WHEN 1 THEN 'Activo'
								WHEN 2 THEN 'Baja'
							 END) AS estatus, RR.celular, (CASE RR.reportar_acceso
							 								WHEN 0 THEN null
							 								WHEN 1 THEN true END) AS reportar_acceso ", FALSE);
		$this->db->from('residencias_residentes AS RR');
		//$this->db->join('residencias AS R', 'R.residencia_id = RR.residencia_id', 'inner');
		$this->db->where("(RR.nombre LIKE '%$strNombre%' AND RR.ape_paterno LIKE '%$strApePaterno%' AND RR.ape_materno LIKE  '%$strApeMaterno%') ");  
		$this->db->where('RR.residencia_id', $intResidenciaID);
		$this->db->where('RR.estatus_id <', 3);
		$this->db->order_by("residente",'asc');
		$this->db->limit($intNumRows,$intPos);
		$res["residentes"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($strResidenteID = null){
		$this->db->select('*');
		$this->db->from('residencias_residentes');
		$this->db->where('residente_id',$strResidenteID);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function buscar_asignacion_tarjetas($strResidenciaID = null){
		$this->db->select("R.residencia_id,P.descripcion AS privada,R.nro_casa,R.calle,
						   R.estatus_id, R.telefono1, R.telefono2  ", FALSE);
		$this->db->from('residencias AS R');
		$this->db->join('privadas AS P', 'R.privada_id = P.privada_id', 'inner');
		$this->db->where('R.residencia_id',$strResidenciaID); 
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	//Autocomplete para Registros de Acceso
	public function autocomplete($q, $limit, $intResidenciaID = 0){
		$row_set = array();
		$this->db->select("RR.residente_id,CONCAT_WS(' ','R -',RR.nombre,RR.ape_paterno,RR.ape_materno) AS residente",FALSE);
		$this->db->from('residencias_residentes AS RR');
		if($intResidenciaID > 0)
			$this->db->where('RR.residencia_id', $intResidenciaID);
		$this->db->where("CONCAT_WS(' ',RR.nombre,(CASE RR.ape_paterno WHEN '' THEN null ELSE RR.ape_paterno END),RR.ape_materno) LIKE  '%$q%' ");  
		$this->db->where('RR.estatus_id',1); 
		$this->db->order_by('residente','asc');
		$this->db->limit($limit,0);
	    $query = $this->db->get();
	    if($query->num_rows > 0){
	      foreach ($query->result_array() as $row){
	        $new_row['value'] = $row['residente']; //Valor a Mostrar en lista
	        $new_row['data'] = $row['residente_id']; //Valor del ID
	        $row_set[] = $new_row; //build an array
	      }
	    }
	    return $row_set; //format the array into json data
	}
	//Autocomplete para Asignacion de Tarjetas
	public function autocomplete_residencia($q, $limit, $intResidenciaID = 0){
		$row_set = array();
		$this->db->select("RR.residente_id,CONCAT_WS(' ',RR.nombre,RR.ape_paterno,RR.ape_materno) AS residente",FALSE);
		$this->db->from('residencias_residentes AS RR');
		if($intResidenciaID > 0)
			$this->db->where('RR.residencia_id', $intResidenciaID);
		$this->db->where("CONCAT_WS(' ',RR.nombre,(CASE RR.ape_paterno WHEN '' THEN null ELSE RR.ape_paterno END),RR.ape_materno) LIKE '%$q%' ");  
		$this->db->where('RR.estatus_id',1);
		$this->db->order_by('residente','asc');
		$this->db->limit($limit,0);
	    $query = $this->db->get();
	    if($query->num_rows > 0){
	      foreach ($query->result_array() as $row){
	        $new_row['value'] = $row['residente']; //Valor a Mostrar en lista
	        $new_row['data'] = $row['residente_id']; //Valor del ID
	        $row_set[] = $new_row; //build an array
	      }
	    }
	    return $row_set; //format the array into json data
	}
}	
?>