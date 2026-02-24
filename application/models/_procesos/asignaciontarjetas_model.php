<?php
class AsignacionTarjetas_Model extends CI_model
{
	public function guardar($intTarjetaID,$strResidenteID,$strFecha,$strFechaVence,$intTipoLectura,$strLecturaEPC,
		                    $strFolioContrato,$dblPrecio,$bolUtilizoSeguro,$intEstatusID){
		$datos = array(
			'tarjeta_id' => $intTarjetaID,
			'residente_id' => $strResidenteID,
			'fecha' => $strFecha,
			'fecha_vencimiento' => $strFechaVence,
			'lectura_tipo_id' => $intTipoLectura,
			'lectura_epc' => $strLecturaEPC,
			'folio_contrato' => $strFolioContrato,
			'precio' => $dblPrecio,
			'utilizo_seguro' => $bolUtilizoSeguro,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('residencias_residentes_tarjetas',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intAsignacionID,$strFecha,$strFechaVence,$intTipoLectura,$strLecturaEPC,
		                    $strFolioContrato,$dblPrecio,$bolUtilizoSeguro,$intEstatusID){
		$datos = array(
			'fecha' => $strFecha,
			'fecha_vencimiento' => $strFechaVence,
			'lectura_tipo_id' => $intTipoLectura,
			'lectura_epc' => $strLecturaEPC,
			'folio_contrato' => $strFolioContrato,
			'precio' => $dblPrecio,
			'utilizo_seguro' => $bolUtilizoSeguro,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('asignacion_id',$intAsignacionID);
		$this->db->limit(1);
		$this->db->update('residencias_residentes_tarjetas',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intAsignacionID,$intEstatusID){
		$datos = array(
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('asignacion_id',$intAsignacionID);
		$this->db->limit(1);
		$this->db->update('residencias_residentes_tarjetas',$datos);
		return $this->db->_error_message();
	}

	//Pendiente Primero realizare la parte de Registros
	public function filtro($strResidenciaID, $strBusqueda, $intNumRows, $intPos){
		$this->db->from('residencias_residentes RR');
		$this->db->join('residencias_residentes_tarjetas RT','RR.residente_id = RT.residente_id','inner');
		$this->db->join('tarjetas T','RT.tarjeta_id = T.tarjeta_id','inner');
		$this->db->where('RR.residencia_id', $strResidenciaID);
		$this->db->where("(RT.lectura_epc LIKE '%$strBusqueda%' OR T.lectura LIKE '%$strBusqueda%')",NULL,FALSE);
		//$this->db->or_where('RR.residencia_id', $strResidenciaID);
		
		$this->db->where('RR.residencia_id', $strResidenciaID);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("RT.asignacion_id,T.lectura, (CASE T.tipo_id
												 WHEN 1 THEN 'PEA'
												 WHEN 2 THEN 'VEH'
											   END) AS tipo, (CASE RT.lectura_tipo_id
																	 WHEN 1 THEN 'TID'
																	 WHEN 2 THEN 'EPC'
																 END) AS lectura_tipo, (CASE RT.estatus_id
																					WHEN 1 THEN 'A'
																					WHEN 2 THEN 'C'
																				  END) AS estatus, RT.estatus_id, RT.lectura_epc,
							RT.tarjeta_id,DATE_FORMAT(DATE_ADD(RT.fecha, INTERVAL -1 HOUR ),'%d-%m-%Y') AS fecha ", FALSE);

		
		$this->db->from('residencias_residentes RR');
		$this->db->join('residencias_residentes_tarjetas RT','RR.residente_id = RT.residente_id','inner');
		$this->db->join('tarjetas T','RT.tarjeta_id = T.tarjeta_id','inner');
		$this->db->where('RR.residencia_id', $strResidenciaID);
		$this->db->where("(RT.lectura_epc LIKE '%$strBusqueda%' OR T.lectura LIKE '%$strBusqueda%')",NULL,FALSE);
		//$this->db->or_where('RR.residencia_id', $strResidenciaID);

		$this->db->order_by('estatus_id','asc');
		$this->db->order_by('fecha','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["tarjetas"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($intAsignacionID){
		$this->db->select("RT.asignacion_id,RT.tarjeta_id, DATE_FORMAT(DATE_ADD(RT.fecha, INTERVAL -1 HOUR),'%d-%m-%Y') AS fecha, DATE_FORMAT(RT.fecha_vencimiento,'%d-%m-%Y') AS fecha_vencimiento,
			               RT.lectura_tipo_id,T.lectura,RT.lectura_epc,RT.folio_contrato,RT.precio,RT.utilizo_seguro,RT.estatus_id,
			               CONCAT_WS(' ',RR.nombre, RR.ape_paterno, RR.ape_materno) AS residente, RR.residente_id ",FALSE);
		$this->db->from('residencias_residentes_tarjetas RT');
		$this->db->join('residencias_residentes RR','RR.residente_id = RT.residente_id','inner');
		$this->db->join('tarjetas T','RT.tarjeta_id = T.tarjeta_id','inner');
		$this->db->where('RT.asignacion_id', $intAsignacionID);
		$this->db->limit(1);
		return $this->db->get()->row();
	}
}
?>