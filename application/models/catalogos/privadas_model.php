<?php
class Privadas_Model extends CI_model
{
	public function guardar($strDescripcion,$strApePaterno,$strApeMaterno,$strNombre,$intTipoContactoID,
		                    $strTelefono,$strCelular,$strEmail,$intPrecioVehicular,$intPrecioPeatonal,$intPrecioMensualidad,$strHistorial,$strFechaVence,$strObservaciones,
                            $strDNS1,$strPuerto1,$strAlias1,$strTipoTarjeta1,$strContrasena1,$strDNS2,$strPuerto2,$strAlias2,
                            $strTipoTarjeta2,$strContrasena2,$strDNS3,$strPuerto3,$strAlias3,$strTipoTarjeta3,$strContrasena3,
                            $strVideo1,$strAliasVideo1,$strVideo2,$strAliasVideo2,$strVideo3,
                            $strAliasVideo3,$intEstatus){
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
			'vence_contrato' => $strFechaVence,
			'observaciones' => $strObservaciones,
			'dns_1' => $strDNS1,
			'puerto_1' => $strPuerto1,
			'alias_1' => $strAlias1,
			'tipo_tarjeta1' => $strTipoTarjeta1,
			'contrasena_1' => $strContrasena1,
			'dns_2' => $strDNS2,
			'puerto_2' => $strPuerto2,
			'alias_2' => $strAlias2,
			'tipo_tarjeta2' => $strTipoTarjeta2,
			'contrasena_2' => $strContrasena2,
			'dns_3' => $strDNS3,
			'puerto_3' => $strPuerto3,
			'alias_3' => $strAlias3,
			'tipo_tarjeta3' => $strTipoTarjeta3,
			'contrasena_3' => $strContrasena3,
			'video_1' => $strVideo1,
			'alias_video1' => $strAliasVideo1,
			'video_2' => $strVideo2,
			'alias_video2' => $strAliasVideo2,
			'video_3' => $strVideo3,
			'alias_video3' => $strAliasVideo3,
			'estatus_id' => $intEstatus,
			'precio_vehicular' => $intPrecioVehicular,
			'precio_peatonal' => $intPrecioPeatonal,
			'precio_mensualidad' => $intPrecioMensualidad,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('privadas',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intPrivadaID,$strDescripcion,$strApePaterno,$strApeMaterno,$strNombre,
		                      $intTipoContactoID,$strTelefono,$strCelular,$strEmail,$intPrecioVehicular,$intPrecioPeatonal,$intPrecioMensualidad,$strHistorial,$strFechaVence,$strObservaciones,
		                      $strDNS1,$strPuerto1,$strAlias1,$strTipoTarjeta1,$strContrasena1,$strDNS2,$strPuerto2,$strAlias2,
		                      $strTipoTarjeta2,$strContrasena2,$strDNS3,$strPuerto3,$strAlias3,$strTipoTarjeta3,$strContrasena3,
		                      $strVideo1,$strAliasVideo1,$strVideo2,$strAliasVideo2,$strVideo3,$strAliasVideo3,$intEstatus){
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
			'vence_contrato' => $strFechaVence,
			'observaciones' => $strObservaciones,
			'dns_1' => $strDNS1,
			'puerto_1' => $strPuerto1,
			'alias_1' => $strAlias1,
			'tipo_tarjeta1' => $strTipoTarjeta1,
			'contrasena_1' => $strContrasena1,
			'dns_2' => $strDNS2,
			'puerto_2' => $strPuerto2,
			'alias_2' => $strAlias2,
			'tipo_tarjeta2' => $strTipoTarjeta2,
			'contrasena_2' => $strContrasena2,
			'dns_3' => $strDNS3,
			'puerto_3' => $strPuerto3,
			'alias_3' => $strAlias3,
			'tipo_tarjeta3' => $strTipoTarjeta3,
			'contrasena_3' => $strContrasena3,
			'video_1' => $strVideo1,
			'alias_video1' => $strAliasVideo1,
			'video_2' => $strVideo2,
			'alias_video2' => $strAliasVideo2,
			'video_3' => $strVideo3,
			'alias_video3' => $strAliasVideo3,
			'estatus_id' => $intEstatus,
			'precio_vehicular' => $intPrecioVehicular,
			'precio_peatonal' => $intPrecioPeatonal,
			'precio_mensualidad' => $intPrecioMensualidad,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('privada_id',$intPrivadaID);
		$this->db->limit(1);
		$this->db->update('privadas',$datos);
		return $this->db->_error_message();
	}

    //Método que se utiliza para actualizar los datos del DNS seleccionado
    public function modificarDNSS($intPrivadaID,$intDNSID,$strDNS,$strPuerto,$strAlias,$strTipoTarjeta,$strContrasena){	
             //Actualizar la información de la privada dependiendo del DNS seleccionado 
			//para evitar inexistencia del dns seleccionado
			if($intDNSID=='1')
			{
				//Actualizar la información del DNS1
			    $arrDatosPrivada= array(
					'dns_1' => $strDNS,
					'puerto_1' => $strPuerto,
					'alias_1' => $strAlias,
					'tipo_tarjeta1' => $strTipoTarjeta,
					'contrasena_1' => $strContrasena,
					'usuario_id' => $this->session->userdata('usuario_id'));

			}
			else if($intDNSID=='2')
			{
				//Actualizar la información del DNS2
				$arrDatosPrivada= array(
					'dns_2' => $strDNS,
					'puerto_2' => $strPuerto,
					'alias_2' => $strAlias,
					'tipo_tarjeta2' => $strTipoTarjeta,
					'contrasena_2' => $strContrasena,
					'usuario_id' => $this->session->userdata('usuario_id'));

			}
			else
			{
				//Actualizar la información del DNS3
			    $arrDatosPrivada= array(
					'dns_3' => $strDNS,
					'puerto_3' => $strPuerto,
					'alias_3' => $strAlias,
					'tipo_tarjeta3' => $strTipoTarjeta,
					'contrasena_3' => $strContrasena,
					'usuario_id' => $this->session->userdata('usuario_id'));

			}
			$this->db->where('privada_id',$intPrivadaID);
			$this->db->limit(1);
			$this->db->update('privadas',$arrDatosPrivada);
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
		$this->db->select("*, DATE_FORMAT(vence_contrato,'%d-%m-%Y') AS vence_contrato",FALSE);
		$this->db->from('privadas');
		$this->db->where('privada_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}


	public function autocomplete($q, $limit){
	    $this->db->select('*');
	    $this->db->like('descripcion', $q);
	    $this->db->where('estatus_id',1);
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
		$this->db->where('estatus_id',1);
		$this->db->order_by('descripcion','asc');
		return $this->db->get()->result();
	}
public function privadas_cmbMC(){
		$this->db->select('privada_id AS value,descripcion AS nombre');
		$this->db->from('privadas');
		$this->db->where('privada_id',22);
		$this->db->order_by('descripcion','asc');
		return $this->db->get()->result();
	}

	public function dnsprivadas_cmb($intPrivadaID=null){
		$this->db->select('(1) AS dns1_id, (2) AS dns2_id, (3) AS dns3_id, 
			               dns_1 AS dns1, dns_2 AS dns2,dns_3 AS dns3,
			               puerto_1 AS puerto1, puerto_2 AS puerto2,puerto_3 AS puerto3,
			               alias_1 AS alias1,alias_2 AS alias2,alias_3 AS alias3,
			               tipo_tarjeta1, tipo_tarjeta2,tipo_tarjeta3,contrasena_1,contrasena_2,contrasena_3');
		$this->db->from('privadas');
	    $this->db->where('privada_id',$intPrivadaID);
		return $this->db->get()->result();
	}

	public function videosprivadas_cmb($intPrivadaID=null){
		$this->db->select('video_1 AS video1,video_2 AS video2,video_3 AS video3,
			               alias_video1 AS alias1, alias_video2 AS alias2, 
			               alias_video3 AS alias3');
		$this->db->from('privadas');
	    $this->db->where('privada_id',$intPrivadaID);
		return $this->db->get()->result();
	}

	public function info($intPrivadaID = null){
		$this->db->select("(CASE estatus_id
							  WHEN 1 THEN 'Activo'
							  WHEN 2 THEN 'Baja'
							END) AS estado, observaciones,privada_id",FALSE);
		$this->db->from('privadas');
		$this->db->where("privada_id",$intPrivadaID);
		$this->db->where('estatus_id <', 3);  
		$this->db->limit(1);
		return $this->db->get()->row();
	}
}	
?>