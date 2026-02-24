<?php
class Privadas_Model extends CI_model
{
	public function guardar($strDescripcion,$strApePaterno,$strApeMaterno,$strNombre,$intTipoContactoID,
		                    $strTelefono,$strCelular,$strEmail,$strHistorial,$strObservaciones,$intEstatus)
	{
		$datos = array(
			'descripcion' => $strDescripcion,
			'ape_paterno' => $strApePaterno,
			'ape_materno' => $strApeMaterno,
			'nombre' => $strNombre,
			'tipo_contacto_id' => $intTipoContactoID,
			'telefono' => $strTelefono,
			'celular' => $strCelular,
			'email' => $strEmail,
			'historial' => $strHistorial,
			'observaciones' => $strObservaciones,
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('privadas',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intPrivadaID,$strDescripcion,$strApePaterno,$strApeMaterno,$strNombre,
		                      $intTipoContactoID,$strTelefono,$strCelular,$strEmail,$strHistorial,$strObservaciones,$intEstatus)
	{
		$datos = array(
			'descripcion' => $strDescripcion,
			'ape_paterno' => $strApePaterno,
			'ape_materno' => $strApeMaterno,
			'nombre' => $strNombre,
			'tipo_contacto_id' => $intTipoContactoID,
			'telefono' => $strTelefono,
			'celular' => $strCelular,
			'email' => $strEmail,
			'historial' => $strHistorial,
			'observaciones' => $strObservaciones,
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('privada_id',$intPrivadaID);
		$this->db->limit(1);
		$this->db->update('privadas',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intPrivadaID,$intEstatus){
		$datos = array(
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('privada_id',$intPrivadaID);
		$this->db->limit(1);
		$this->db->update('privadas',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intPrivadaID = null){
		$this->db->trans_begin();

		$datos = array(
			'estatus_id' => 3,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('privada_id',$intPrivadaID);
		$this->db->limit(1);
		$this->db->update('privadas',$datos);

		$datos = array(
			'estatus_id' => 4, // se manda porque 1.-Activo 2.-Inactivo 3.-Moroso 4.-Eliminado
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('privada_id',$intPrivadaID);
		$this->db->update('residencias',$datos);
        
		$datos = array(
			'estatus_id' => 3, // se manda porque 1.-Activo 3.- Eliminado
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where("residencia_id IN (SELECT residencia_id FROM residencias WHERE privada_id = $intPrivadaID)",NULL,FALSE);
		$this->db->update('residencias_residentes',$datos);
		
		$datos = array(
			'estatus_id' => 3, // se manda porque 1.-Activo 2.-Baja 3.- Eliminado
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where("residencia_id IN (SELECT residencia_id FROM residencias WHERE privada_id = $intPrivadaID)",NULL,FALSE);
		$this->db->update('residencias_visitantes',$datos);
		
		if ($this->db->trans_status() === FALSE)
		    $this->db->trans_rollback();
		else
		    $this->db->trans_commit();
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('descripcion',$strBusqueda);
		$this->db->from('privadas');
		$this->db->where('estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("privada_id,descripcion, CONCAT(nombre,' ',ape_paterno,' ',ape_materno ) AS contacto, celular,
							(CASE estatus_id
										WHEN 1 THEN 'Activo'
										WHEN 2 THEN 'Baja'
									END) AS estatus,estatus_id",FALSE);
		$this->db->from('privadas');
		$this->db->where('estatus_id <>', 3);
		$this->db->like('descripcion',$strBusqueda);  
		$this->db->order_by('descripcion','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["privadas"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('privadas');
		$this->db->where('privada_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function autocomplete($q, $limit){
	    $this->db->select('*');
	    $this->db->like('descripcion', $q);
	    $this->db->limit($limit, 0);
	    $this->db->order_by('descripcion','asc');
	    $query = $this->db->get('privadas');
	    if($query->num_rows > 0){
	      foreach ($query->result_array() as $row){
	        $new_row['value']= $row['descripcion']; //Valor a Mostrar en lista
	        $new_row['data']= $row['privada_id']; //Valor del ID
	        $row_set[] = $new_row; //build an array
	      }
	   }else {
	    	$row_set[0]['value'] = "No se encontraron coincidencias!!!";
	    	$row_set[0]['data'] = "";
	   }
	   return $row_set; //format the array into json data
	}

	public function privadas_cmb(){
		$this->db->select('privada_id AS value,descripcion AS nombre');
		$this->db->from('privadas');
		$this->db->order_by('descripcion','asc');
		return $this->db->get()->result();
	}
}	
?>