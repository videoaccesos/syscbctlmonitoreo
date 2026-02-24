<?php
class Relaysactivacion_Model extends CI_model
{
	public function guardar($intPrivadaID,$intDNSID,$intRenglon,$strRelays,$strEstado,$strTiempo)	                    
	{
	   $this->db->trans_begin();
	  	   $strConcepto='';
	       //Seleccionar el concepto  del relays que coincide con el renglon
	        $this->db->select('PR.concepto');
			$this->db->from('privadas_relays PR');
			$this->db->where('PR.privada_id',$intPrivadaID);
			$this->db->where('PR.dns',$intDNSID);
			$this->db->where('PR.renglon',$intRenglon);
			//Si se encontro coincidencia de concepto
			if ($row = $this->db->get()->row()){
			   //Asignar a la variable el valor recuperado 
			   $strConcepto=$row->concepto;
		       //Actualizar el estado del relays 
		       $arrDatosPrivada = array(
					'estado' => $strEstado,
					'tiempo'=> $strTiempo,
					'usuario_id' => $this->session->userdata('usuario_id'));
				$this->db->where('privada_id',$intPrivadaID);
			    $this->db->where('dns',$intDNSID);
				$this->db->where('renglon',$intRenglon);
				$this->db->limit(1);
				$this->db->update('privadas_relays',$arrDatosPrivada);
	          
		     	//Insertar los datos en la tabla relays_activacion
				$arrDatos = array(
					'privada_id' => $intPrivadaID,
					'fecha' => date("Y-m-d H:i:s"),
					'usuario_id' => $this->session->userdata('usuario_id'),
					'dns' => $intDNSID,
					'concepto' => $strConcepto,
					'relays' => $strRelays,
					'estado' => $strEstado,
					'tiempo' => $strTiempo);
				$this->db->insert('relays_activacion',$arrDatos);
			}
			else
			{
				$this->db->trans_rollback();
				$error = "No se pudo registrar la activación del relays!!!"; // se asigna 1 para envie error.
			}
			
		$this->db->trans_complete();
		if ($this->db->trans_status() === FALSE)
		    $this->db->trans_rollback();
		else
		    $this->db->trans_commit();
		return $this->db->_error_message();
	}

	//Método que se utiliza para regresar los datos de la tabla relays_activacion 
	//que coincidan con los parametros de búsqueda (para mostrarlos en el grid del reporte activación de relays)	
    public function filtro_consulta($strFechaInicio,$strFechaFin,$intPrivadaID,$intUsuarioID,$strTiempo,
		                           $strConcepto, $intNumRows, $intPos) {
        //Criterios de búsqueda
        $this->db->where("DATE_FORMAT(RA.fecha,'%Y-%m-%d') BETWEEN '$strFechaInicio' AND '$strFechaFin'" ,NULL,FALSE);
      
        //Si el id de la privada es diferente de 0, búsca por privada 
		if($intPrivadaID != 0)
		{
			$this->db->where("RA.privada_id", $intPrivadaID);
		}
		//Si el id del usuario es diferente de 0, búsca por usuario 
        if($intUsuarioID != 0)
        {

			$this->db->where("RA.usuario_id", $intUsuarioID);
        }
        //Si el tiempo es diferente de 0, búsca por tiempo de activación
		if($strTiempo != 0)
		{
			$this->db->where("RA.tiempo", $strTiempo);

		}
		//Si el concepto es diferente de vacio, búsca por concepto
		if($strConcepto != '')
		{
			$this->db->where("RA.concepto", $strConcepto);

		}
		
		$this->db->from('relays_activacion RA');

		$this->db->order_by("RA.fecha",'asc');
		$res['total_rows'] = $this->db->count_all_results();

        //Criterios de búsqueda
        $this->db->where("DATE_FORMAT(RA.fecha,'%Y-%m-%d') BETWEEN '$strFechaInicio' AND '$strFechaFin'" ,NULL,FALSE);
      
        //Si el id de la privada es diferente de 0, búsca por privada 
		if($intPrivadaID != 0)
		{
			$this->db->where("RA.privada_id", $intPrivadaID);
		}
		//Si el id del usuario es diferente de 0, búsca por usuario 
        if($intUsuarioID != 0)
        {

			$this->db->where("RA.usuario_id", $intUsuarioID);
        }
        //Si el tiempo es diferente de 0, búsca por tiempo de activación
		if($strTiempo != 0)
		{
			$this->db->where("RA.tiempo", $strTiempo);

		}
		//Si el concepto es diferente de vaciio, búsca por concepto
		if($strConcepto != '')
		{
			$this->db->where("RA.concepto", $strConcepto);

		}
		$this->db->select("DATE_FORMAT(RA.fecha,'%d-%m-%Y %r') AS fecha,RA.concepto,RA.relays,RA.estado,RA.tiempo,
						   P.descripcion AS privada,CONCAT_WS(' ',US.usuario,'-',E.nombre,E.ape_paterno,E.ape_materno) AS usuario,
						   (CASE RA.dns
							 WHEN 1 THEN CONCAT(P.dns_1,':',P.puerto_1)
							 WHEN 2 THEN CONCAT(P.dns_2,':',P.puerto_2)
							 WHEN 3 THEN CONCAT(P.dns_3,':',P.puerto_3)
						   END) dns ", FALSE);
		$this->db->from('relays_activacion RA');
		$this->db->join('privadas P','P.privada_id = RA.privada_id','inner');
		$this->db->join('usuarios US','US.usuario_id = RA.usuario_id','inner');
		$this->db->join('empleados E','E.empleado_id = US.empleado_id','inner');
		$this->db->order_by("RA.fecha",'asc');
		$this->db->limit($intNumRows,$intPos);
		$res['rows'] = $this->db->get()->result();
		return $res;
	}

	
	
}	
?>