<?php 
class Residencias_Model extends CI_model
{
	
   public function autocompleteNroCasa($q, $limit,$intPrivadaID){
	    $this->db->select("CONCAT(R.residencia_id,'_','N') AS residencia_id,R.estatus_id,
	    				   CONCAT_WS(' ',R.nro_casa,R.calle,', Priv.',P.descripcion ) AS residencia",FALSE);
        $this->db->from('residencias AS R');
        $this->db->join('privadas AS P', 'P.privada_id = R.privada_id', 'inner');
        if($intPrivadaID != 0)//buscar coincidencias por privada
        {
        	  $this->db->where('R.privada_id',$intPrivadaID);

        }
        if(is_numeric($q))//buscar por número de residencia
		{
		    	$this->db->where('R.nro_casa',$q);
		  
		}
		else
		{
		    	$this->db->where("(CONCAT_WS(' ',R.nro_casa,R.calle,P.descripcion ) LIKE  '%$q%' 
		    		              OR CONCAT_WS(' ',R.nro_casa,P.descripcion ) LIKE  '%$q%')"); 
		} 
      
	    $this->db->where('R.estatus_id <>', 5);
	    $this->db->order_by('R.nro_casa','asc');
	    $this->db->limit($limit, 0);
	    $query =$this->db->get();
	    if($query->num_rows > 0){
	      foreach ($query->result_array() as $row){
	        $new_row['value'] = $row['residencia']; //Valor a Mostrar en lista
	        $new_row['data'] = $row['residencia_id']; //Valor del ID
	        $new_row['estatus_id'] = $row['estatus_id'];
	        $row_set[] = $new_row; //build an array
	      }
	    }else {
	    	$row_set[0]['value'] = "";
	    	$row_set[0]['data'] = "";
	    }
	    return $row_set; //format the array into json data
	}

    public function autocompleteNroCasaReportes($q, $limit,$intPrivadaID){
	    $this->db->select("R.residencia_id,R.estatus_id,
	    				   CONCAT_WS(' ',R.nro_casa,R.calle,', Priv.',P.descripcion ) AS residencia",FALSE);
        $this->db->from('residencias AS R');
        $this->db->join('privadas AS P', 'P.privada_id = R.privada_id', 'inner');
        if($intPrivadaID != 0)//buscar coincidencias por privada
        {
        	  $this->db->where('R.privada_id',$intPrivadaID);

        }
        if(is_numeric($q))//buscar por número de residencia
		{
		    	$this->db->where('R.nro_casa',$q);
		  
		}
		else
		{
		    	$this->db->where("(CONCAT_WS(' ',R.nro_casa,R.calle,P.descripcion ) LIKE  '%$q%' 
		    		              OR CONCAT_WS(' ',R.nro_casa,P.descripcion ) LIKE  '%$q%')"); 
		} 
      
	    $this->db->where('R.estatus_id <>', 5);
	    $this->db->order_by('R.nro_casa','asc');
	    $this->db->limit($limit, 0);
	    $query =$this->db->get();
	    if($query->num_rows > 0){
	      foreach ($query->result_array() as $row){
	        $new_row['value'] = $row['residencia']; //Valor a Mostrar en lista
	        $new_row['data'] = $row['residencia_id']; //Valor del ID
	        $new_row['estatus_id'] = $row['estatus_id'];
	        $row_set[] = $new_row; //build an array
	      }
	    }else {
	    	$row_set[0]['value'] = "";
	    	$row_set[0]['data'] = "";
	    }
	    return $row_set; //format the array into json data
	}
     //Método para regresar los datos de la privada que coincide con el id
    //de la residencia seleccionada.
	public function buscarPrivada($strResidencia = null){
		//Se quita el guion  de la cadena ejemplo:113_N (id_tipo)
        list($intResidenciaID,$strTipo) = explode("_", $strResidencia); //devuelve "113N" donde N-Es el tipo de autocomplete 
                                                                       //(N-por número de casa o Maria Lopez-Por residente) y 113 es el identificador
      
       //Si el tipo es N significa que el autocomplete de donde se selecciono la residencia fue el de Nro de casa
       if($strTipo =='N')//Recuperar los datos del Nro de casa seleccionado
       {
          $this->db->select("R.residencia_id,CONCAT_WS(' ',R.nro_casa,R.calle) AS residencia,P.privada_id", FALSE);
		  $this->db->from('residencias AS R');
		  $this->db->join('privadas AS P','P.privada_id = R.privada_id','inner');
		  $this->db->where('R.residencia_id',$intResidenciaID);

       }
       else //Recuperar los datos del residente seleccionado
       {
       	  //Quitar espacio en blanco
          //$strTipo=trim($strTipo);
       	  $this->db->select("R.residencia_id,CONCAT_WS(' ',RR.nombre,RR.ape_paterno,RR.ape_materno,', ',R.nro_casa,', ',R.calle) AS residencia,
       	  					 P.privada_id", FALSE);
		  $this->db->from('residencias AS R');
		  $this->db->join('privadas AS P','P.privada_id = R.privada_id','inner');
		  $this->db->join('residencias_residentes AS RR','R.residencia_id = RR.residencia_id','inner');
          $this->db->where('R.residencia_id',$intResidenciaID);
          $this->db->where('RR.residente_id',$strTipo);
         
       }
		
		$this->db->limit(1);
		return $this->db->get()->row();
	}
    
    public function autocompleteResidente($q, $limit,$intPrivadaID){
		$this->db->select("CONCAT(R.residencia_id,'_',RR.residente_id) AS residencia_id,
						   CONCAT_WS(' ',RR.nombre,RR.ape_paterno,RR.ape_materno) AS residente,
						   R.nro_casa,R.calle,P.descripcion AS privada,R.estatus_id",FALSE);
		$this->db->from('residencias AS R');
		$this->db->join('privadas AS P','P.privada_id = R.privada_id','inner');
		$this->db->join('residencias_residentes AS RR','R.residencia_id = RR.residencia_id','inner');
		//Si el id de la privada es diferente de cero, buscar por privada
        if($intPrivadaID != 0)
        {
        	 $this->db->where('R.privada_id', $intPrivadaID);

        }	
		$this->db->where("(CONCAT_WS(' ',RR.nombre,(CASE RR.ape_paterno WHEN '' THEN null ELSE RR.ape_paterno END),RR.ape_materno) LIKE '%$q%'
			               OR CONCAT_WS(' ',R.nro_casa,R.calle,P.descripcion ) LIKE  '%$q%' ) "); 
	    
		$this->db->where('R.estatus_id <>', 5);
		$this->db->where('RR.estatus_id', 1);
		$this->db->order_by('residente','asc');
		$this->db->limit($limit,0);
	    $query = $this->db->get();
	    if($query->num_rows > 0){
	      foreach ($query->result_array() as $row){
	        $new_row['value'] = $row['residente'].", ".$row['nro_casa'].", ".$row['calle'].", Priv.".$row['privada']; //Valor a Mostrar en lista
	        $new_row['data'] = $row['residencia_id']; //Valor del ID
	        $row_set[] = $new_row; //build an array
	      }
	    }else {
	    	$row_set[0]['value'] = "";
	    	$row_set[0]['data'] = "";
	    }
	    return $row_set; //format the array into json data
	}

	  public function autocompleteResidenteReportes($q, $limit,$intPrivadaID){
		$this->db->select("R.residencia_id,CONCAT_WS(' ',RR.nombre,RR.ape_paterno,RR.ape_materno) AS residente,
						   R.nro_casa,R.calle,P.descripcion AS privada,R.estatus_id",FALSE);
		$this->db->from('residencias AS R');
		$this->db->join('privadas AS P','P.privada_id = R.privada_id','inner');
		$this->db->join('residencias_residentes AS RR','R.residencia_id = RR.residencia_id','inner');
		//Si el id de la privada es diferente de cero, buscar por privada
        if($intPrivadaID != 0)
        {
        	 $this->db->where('R.privada_id', $intPrivadaID);

        }	
		$this->db->where("(CONCAT_WS(' ',RR.nombre,(CASE RR.ape_paterno WHEN '' THEN null ELSE RR.ape_paterno END),RR.ape_materno) LIKE '%$q%'
			               OR CONCAT_WS(' ',R.nro_casa,R.calle,P.descripcion ) LIKE  '%$q%' ) "); 
		$this->db->where('R.estatus_id <>', 5);
		$this->db->where('RR.estatus_id', 1);
		$this->db->order_by('residente','asc');
		$this->db->limit($limit,0);
	    $query = $this->db->get();
	    if($query->num_rows > 0){
	      foreach ($query->result_array() as $row){
	        $new_row['value'] = $row['residente'].", ".$row['nro_casa'].", ".$row['calle'].", Priv.".$row['privada']; //Valor a Mostrar en lista
	        $new_row['data'] = $row['residencia_id']; //Valor del ID
	        $row_set[] = $new_row; //build an array
	      }
	    }else {
	    	$row_set[0]['value'] = "";
	    	$row_set[0]['data'] = "";
	    }
	    return $row_set; //format the array into json data
	}

	public function filtro($strBusqueda, $strPrivada, $intNumRows, $intPos){
		$this->db->from('residencias AS R');
		$this->db->join('privadas AS P', 'R.privada_id = P.privada_id', 'inner');
		$this->db->where("CONCAT_WS(' ',R.nro_casa,R.calle) LIKE '%$strBusqueda%'");  
		$this->db->like('P.descripcion',$strPrivada);   
		$this->db->where('R.estatus_id <>', 5);
	
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("R.residencia_id,R.nro_casa, R.calle, 
							(   CASE R.estatus_id
									WHEN 1 THEN 'Interfon Activo'
									WHEN 2 THEN 'Sin Interfon'
									WHEN 3 THEN 'Moroso'
									WHEN 4 THEN 'Sin Derechos'
								END) AS estatus, P.descripcion AS privada, R.estatus_id ", FALSE);
		$this->db->from('residencias AS R');
		$this->db->join('privadas AS P', 'R.privada_id = P.privada_id', 'inner');
		$this->db->where("CONCAT_WS(' ',R.nro_casa,R.calle) LIKE '%$strBusqueda%'");  
		$this->db->like('P.descripcion',$strPrivada);   
		$this->db->where('R.estatus_id <>', 5);
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
		$this->db->where('R.estatus_id <>', 5);
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
			'estatus_id' => 5, // se manda porque 1.-Interfon Activo 2.-Sin Interfon 3.-Moroso 4.-Sin Derechos 5.-Eliminado
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
							  WHEN 1 THEN 'Interfon Activo'
							  WHEN 2 THEN 'Sin Interfon'
							  WHEN 3 THEN 'Moroso'
							  WHEN 4 THEN 'Sin Derechos'
							END) AS estado, interfon, observaciones",FALSE);
		$this->db->from('residencias');
		$this->db->where("residencia_id",$id);
		$this->db->where('estatus_id <>', 5);  
		$this->db->limit(1);
		return $this->db->get()->row();
	}
}	
?>