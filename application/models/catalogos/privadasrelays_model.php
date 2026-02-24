<?php
class Privadasrelays_Model extends CI_model 
{
	public function guardar($intPrivadaID,$intDNSID,$intRenglonID,$strConcepto,$strRelays,$strEstado){
		$this->db->trans_begin();
	        //Insertar los datos en la tabla privadas_relays
			$arrDatos = array(
				'privada_id' => $intPrivadaID,
				'dns' => $intDNSID,
				'renglon' => $intRenglonID,
				'concepto' => $strConcepto,
				'relays' => $strRelays,
				'estado' => $strEstado,
				'tiempo' => 'Indefinido',
				'usuario_id' => $this->session->userdata('usuario_id'));
			$this->db->insert('privadas_relays',$arrDatos);

		$this->db->trans_complete();
		if ($this->db->trans_status() === FALSE)
		    $this->db->trans_rollback();
		else
		    $this->db->trans_commit();
		return $this->db->_error_message();
	}

	public function modificar($intPrivadaID,$intDNSID,$intRenglonID,$strConcepto,$strRelays,$strEstado)
	{
		$arrDatos = array(
			'concepto' => $strConcepto,
			'relays' => $strRelays,
			'estado' => $strEstado,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('privada_id',$intPrivadaID);
		$this->db->where('dns',$intDNSID);
		$this->db->where('renglon',$intRenglonID);
		$this->db->limit(1);
		$this->db->update('privadas_relays',$arrDatos);
		return $this->db->_error_message();
	}


	public function eliminar($intPrivadaID=null,$intDNSID=null,$intRenglonID=null){
		$this->db->trans_begin();
      		$this->db->where('privada_id',$intPrivadaID);
		    $this->db->where('dns',$intDNSID);
		    $this->db->where('renglon',$intRenglonID);
        	$this->db->limit(1);
        	$this->db->delete('privadas_relays');

		$this->db->trans_complete();
		if ($this->db->trans_status() === FALSE)
		    $this->db->trans_rollback();
		else
		    $this->db->trans_commit();
		return $this->db->_error_message();
	}

	public function filtro($intPrivadaID,$intDNSID,$intNumRows, $intPos){
		$this->db->from('privadas_relays');
		$this->db->where('privada_id', $intPrivadaID);
		$this->db->where('dns', $intDNSID);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("renglon,concepto,relays,estado",FALSE);
		$this->db->from('privadas_relays');
		$this->db->where('privada_id', $intPrivadaID);
		$this->db->where('dns',$intDNSID);  
		$this->db->order_by('renglon','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["privadas"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($intPrivadaID=null,$intDNSID=null,$intRenglonID=null){
		$this->db->select("renglon,concepto,relays,estado",FALSE);
		$this->db->from('privadas_relays');
		$this->db->where('privada_id',$intPrivadaID);
		$this->db->where('dns',$intDNSID);
		$this->db->where('renglon',$intRenglonID);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function buscarRelaysDNS($intPrivadaID=null,$intDNSID=null){
		$this->db->select("GROUP_CONCAT(PR.concepto SEPARATOR '|') AS detalles_conceptos, 
						   GROUP_CONCAT(PR.estado SEPARATOR '|') AS detalles_estados, 
						   GROUP_CONCAT(PR.tiempo SEPARATOR '|') AS detalles_tiempos, 
						   GROUP_CONCAT(PR.relays SEPARATOR '|') AS detalles_relays, 
						   GROUP_CONCAT(CONVERT(PR.renglon,CHAR(8)) SEPARATOR '|') AS detalles_renglones",FALSE);
		$this->db->from('privadas_relays PR');
		$this->db->where('PR.privada_id',$intPrivadaID);
		$this->db->where('PR.dns',$intDNSID);
		$this->db->order_by('PR.renglon','asc');
		$this->db->limit(1);
		return $this->db->get()->row();
	}


	public function buscarRelaysPorRenglon($intPrivadaID=null,$intDNSID=null,$intRenglon=null){
		$this->db->select("PR.relays",FALSE);
		$this->db->from('privadas_relays PR');
		$this->db->where('PR.privada_id',$intPrivadaID);
		$this->db->where('PR.dns',$intDNSID);
		$this->db->where('PR.renglon',$intRenglon);
		$this->db->limit(1);
		return $this->db->get()->row();
	}


	

	
	
}	
?>