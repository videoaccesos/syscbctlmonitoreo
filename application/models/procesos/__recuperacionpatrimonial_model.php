<?php
class RecuperacionPatrimonial_Model extends CI_model
{
	public function guardar($strFolio,$strFecha,$intEmpleadoID,$intPrivadaID,$intOrdernServicioID,$strRelatoHechos,$strResponsable,
							$strResponsableDomicilio,$strResponsableTelefono,$strResponsableCelular,$strResponsableRelacion,
							$strVehiculoPlacas,$strVehiculoModelo,$strVehiculoColor,$strVehiculoMarca,$bolSeguro,$strSeguro,
							$bolTestigos,$strTestigos,$bolVideos,$strVideos,$bolAvisoAdministrador,$strAvisoAdministradorFecha,
							$strObservaciones,$intEstatusID)
	{
		$datos = array(
			'folio' => $strFolio,
			//'fecha' => $strFecha,
			'empleado_id' => $intEmpleadoID,
			'privada_id' => $intPrivadaID,
			'orden_servicio_id' => $intOrdernServicioID,
			'relato_hechos' => $strRelatoHechos,
			'responsable_nombre' => $strResponsable,
			'responsable_domicilio' => $strResponsableDomicilio,
			'responsable_telefono' => $strResponsableTelefono,
			'responsable_celular' => $strResponsableCelular,
			'responsable_relacion' => $strResponsableRelacion,
			'vehiculo_placas' => $strVehiculoPlacas,
			'vehiculo_modelo' => $strVehiculoModelo,
			'vehiculo_color' => $strVehiculoColor,
			'vehiculo_marca' => $strVehiculoMarca,
			'seguro' => $bolSeguro,
			'seguro_nombres' => $strSeguro,
			'testigos' => $bolTestigos,
			'testigos_nombres' => $strTestigos,
			'videos' => $bolVideos,
			'videos_direccion' => $strVideos,
			'aviso_administrador' => $bolAvisoAdministrador,
			//'aviso_administrador_fecha' => $strAvisoAdministradorFecha,
			'observaciones' => $strObservaciones,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->set('fecha',"STR_TO_DATE('$strFecha','%d-%m-%Y %H:%i:00')",FALSE);
		$this->db->set('aviso_administrador_fecha',"STR_TO_DATE('$strAvisoAdministradorFecha','%d-%m-%Y %H:%i:00')",FALSE);
		$this->db->insert('recuperacion_patrimonial',$datos);
		return $this->db->_error_message();
	}

	public function guardar_seguimiento($intRecuperacionPatrimonialID,$strComentario){
		$datos = array(
			'recuperacion_patrimonial_id' => $intRecuperacionPatrimonialID,
			'comentario' =>	$strComentario,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('recuperacion_patrimonial_seguimiento',$datos);
	}


	public function modificar($intRecuperacionPatrimonialID,
							$strFecha,$intEmpleadoID,$intPrivadaID,$intOrdernServicioID,$strRelatoHechos,$strResponsable,
							$strResponsableDomicilio,$strResponsableTelefono,$strResponsableCelular,$strResponsableRelacion,
							$strVehiculoPlacas,$strVehiculoModelo,$strVehiculoColor,$strVehiculoMarca,$bolSeguro,$strSeguro,
							$bolTestigos,$strTestigos,$bolVideos,$strVideos,$bolAvisoAdministrador,$strAvisoAdministradorFecha,
							$strObservaciones,$intEstatusID)
	{
		$datos = array(
			//'fecha' => $strFecha,
			'empleado_id' => $intEmpleadoID,
			'privada_id' => $intPrivadaID,
			'orden_servicio_id' => $intOrdernServicioID,
			'relato_hechos' => $strRelatoHechos,
			'responsable_nombre' => $strResponsable,
			'responsable_domicilio' => $strResponsableDomicilio,
			'responsable_telefono' => $strResponsableTelefono,
			'responsable_celular' => $strResponsableCelular,
			'responsable_relacion' => $strResponsableRelacion,
			'vehiculo_placas' => $strVehiculoPlacas,
			'vehiculo_modelo' => $strVehiculoModelo,
			'vehiculo_color' => $strVehiculoColor,
			'vehiculo_marca' => $strVehiculoMarca,
			'seguro' => $bolSeguro,
			'seguro_nombres' => $strSeguro,
			'testigos' => $bolTestigos,
			'testigos_nombres' => $strTestigos,
			'videos' => $bolVideos,
			'videos_direccion' => $strVideos,
			'aviso_administrador' => $bolAvisoAdministrador,
			//'aviso_administrador_fecha' => $strAvisoAdministradorFecha,
			'observaciones' => $strObservaciones,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->set('fecha',"STR_TO_DATE('$strFecha','%d-%m-%Y %H:%i:00')",FALSE);
		$this->db->set('aviso_administrador_fecha',"STR_TO_DATE('$strAvisoAdministradorFecha','%d-%m-%Y %H:%i:00')",FALSE);
		$this->db->where('recuperacion_patrimonial_id',$intRecuperacionPatrimonialID);
		$this->db->limit(1);
		$this->db->update('recuperacion_patrimonial',$datos);
		return $this->db->_error_message();
	}

	public function filtro($strResponsable,$strFechaIni,$strFechaFin,$intEstatusID,$intNumRows,$intPos){
		$strFechaIniParse = $strFechaIni;
		$strFechaFinParse = $strFechaFin;
		$this->db->from('recuperacion_patrimonial');
		if($strFechaIni =! "" && $strFechaFin != ""){
			$this->db->where('DATE(fecha) >=', $strFechaIniParse);
			$this->db->where('DATE(fecha) <=', $strFechaFinParse);
		}
		if($intEstatusID != 0)
			$this->db->where('estatus_id', $intEstatusID);
		$this->db->like('responsable_nombre',$strResponsable);
		$res["total_rows"] = $this->db->count_all_results();
		$this->db->select("R.recuperacion_patrimonial_id, DATE_FORMAT(R.fecha,'%d-%m-%Y') AS fecha, R.folio, R.responsable_nombre,
			               P.descripcion AS privada,  ( CASE R.estatus_id
															WHEN 1 THEN 'PENDIENTE'
															WHEN 2 THEN 'RECUPERADO'
														END ) AS estatus ",FALSE);
		$this->db->from('recuperacion_patrimonial R');
		$this->db->join('privadas P','P.privada_id = R.privada_id','inner');
		if($strFechaIni =! "" && $strFechaFin != ""){
			$this->db->where('DATE(R.fecha) >=', $strFechaIniParse);
			$this->db->where('DATE(R.fecha) <=', $strFechaFinParse);
		}
		if($intEstatusID != 0)
			$this->db->where('estatus_id <>', $intEstatusID); 
		$this->db->like('responsable_nombre',$strResponsable);
		$this->db->order_by('fecha','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["recuperaciones"] =$this->db->get()->result();
		return $res;
	}

	public function filtro_seguimiento($intRecuperacionPatrimonialID,$intNumRows,$intPos){
		$this->db->from('recuperacion_patrimonial_seguimiento');
		$this->db->where('recuperacion_patrimonial_id', $intRecuperacionPatrimonialID);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("S.comentario, DATE_FORMAT(S.fecha_modificacion,'%d-%m-%Y %H:%i') AS fecha",FALSE);
		$this->db->from('recuperacion_patrimonial_seguimiento S');
		$this->db->where('recuperacion_patrimonial_id', $intRecuperacionPatrimonialID); 
		$this->db->order_by('fecha','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["seguimientos"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($busqueda = null, $tipo = 1){
		$this->db->select("R.recuperacion_patrimonial_id,R.folio,DATE_FORMAT(R.fecha,'%d-%m-%Y %H:%i') AS fecha, R.estatus_id,
			               R.empleado_id, CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) AS empleado, R.orden_servicio_id,
			               O.folio AS orden_folio, CONCAT_WS(' ',T.nombre,T.ape_paterno,T.ape_materno) AS tecnico, R.privada_id, R.relato_hechos, R.responsable_nombre,
			               R.responsable_domicilio, R.responsable_telefono, R.responsable_celular, R.responsable_relacion,
			               R.vehiculo_placas, R.vehiculo_modelo, R.vehiculo_color, R.vehiculo_marca, R.seguro, R.seguro_nombres, 
			               R.testigos, R.testigos_nombres, R.videos, R.videos_direccion, R.aviso_administrador, 
			               DATE_FORMAT(R.aviso_administrador_fecha,'%d-%m-%Y %H:%i') AS fecha_aviso, R.observaciones ", FALSE);
		$this->db->from('recuperacion_patrimonial R');
		$this->db->join('empleados E','E.empleado_id = R.empleado_id','inner');
		$this->db->join('ordenes_servicio O','R.orden_servicio_id = O.orden_servicio_id','left');
		$this->db->join('empleados T','O.cierre_tecnico_id = T.empleado_id','left');
		if($tipo == 1)
			$this->db->where('R.recuperacion_patrimonial_id',$busqueda);
		else 
			$this->db->where('R.folio',$busqueda);
		$this->db->limit(1);
		return $this->db->get()->row();
	}


}	
?>