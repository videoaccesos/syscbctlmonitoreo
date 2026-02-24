<?php
class RegistrosAccesos_Model extends CI_model
{
	public function guardar($intEmpleadoID,$intPrivadaID,$intResidenciaID,$intTipoGestionID,$strSolicitanteID,$strObservaciones,$strDuracion,$strImagen,$intEstatus){
		$datos = array(
			'empleado_id' => $intEmpleadoID,
			'privada_id' => $intPrivadaID,
			'residencia_id' => $intResidenciaID,
			'tipo_gestion_id' => $intTipoGestionID,
			'solicitante_id' => $strSolicitanteID,
			'observaciones' => $strObservaciones,
			'duracion' => $strDuracion,
			'imagen' => $strImagen,
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('registros_accesos',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intRegistroAccesoID,$intEmpleadoID,$intPrivadaID,$intResidenciaID,$intTipoGestionID,$strSolicitanteID,$strObservaciones,$strDuracion,$intEstatus){
		$datos = array(
			'empleado_id' => $intEmpleadoID,
			'privada_id' => $intPrivadaID,
			'residencia_id' => $intResidenciaID,
			'tipo_gestion_id' => $intTipoGestionID,
			'solicitante_id' => $strSolicitanteID,
			'observaciones' => $strObservaciones,
			'duracion' => $strDuracion,
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('registro_acceso_id',$intRegistroAccesoID);
		$this->db->limit(1);
		$this->db->update('registros_accesos',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intRegistroAccesoID = null){
		$datos = array(
			'estatus_id' => 3,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('registro_acceso_id',$intRegistroAccesoID);
		$this->db->limit(1);
		$this->db->update('registros_accesos',$datos);
		
		return $this->db->_error_message();
	}

	//Pendiente Primero realizare la parte de Registros
	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('descripcion',$strBusqueda);
		$this->db->from('puestos');
		$this->db->where('estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("puesto_id,descripcion, 
							(CASE estatus_id
										WHEN 1 THEN 'Activo'
										WHEN 2 THEN 'Baja'
									END) AS estatus, estatus_id ");
		$this->db->from('puestos');
		$this->db->where('estatus_id <>', 3);
		$this->db->like('descripcion',$strBusqueda);  
		$this->db->order_by('descripcion','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["puestos"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('registros_accesos');
		$this->db->where('registro_acceso_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	//Filtros de Catalogos
	public function filtroResidentes($intBusqueda, $intNumRows, $intPos){
		$this->db->where('RR.residencia_id', $intBusqueda);  
		$this->db->from('residencias_residentes AS RR');
		$this->db->where('RR.estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("RR.residente_id, CONCAT(RR.nombre,' ',RR.ape_paterno,' ',RR.ape_materno) AS residente,  
							(CASE RR.estatus_id
								WHEN 1 THEN 'Activo'
								WHEN 2 THEN 'Baja'
							 END) AS estatus, celular ", FALSE);
		$this->db->from('residencias_residentes AS RR');
		$this->db->where('RR.residencia_id', $intBusqueda);  
		$this->db->where('RR.estatus_id <>', 3);
		$this->db->order_by("residente",'asc');
		$this->db->limit($intNumRows,$intPos);
		$res["residentes"] =$this->db->get()->result();
		return $res;
	}

	public function filtroVisitantes($intBusqueda, $intNumRows, $intPos){
		$this->db->where('RV.residencia_id',$intBusqueda);  
		$this->db->from('residencias_visitantes AS RV');
		$this->db->where('RV.estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("RV.visitante_id, CONCAT(RV.nombre,' ',RV.ape_paterno,' ',RV.ape_materno) AS visitante, 
							(CASE RV.estatus_id
								WHEN 1 THEN 'Activo'
								WHEN 2 THEN 'Baja'
							 END) AS estatus, LEFT(observaciones,25) AS observaciones", FALSE);
		$this->db->from('residencias_visitantes AS RV');
		$this->db->where('RV.residencia_id',$intBusqueda);  
		$this->db->where('RV.estatus_id <>', 3);
		$this->db->order_by("visitante",'asc');
		$this->db->limit($intNumRows,$intPos);
		$res["visitantes"] =$this->db->get()->result();
		return $res;
	}

	public function enviar_notificaciones_emails($id){
		$result = null;
		//Datos del Acceso
		$this->db->select("DATE_FORMAT(RA.fecha_modificacion,'%d-%m-%Y') AS fecha, DATE_FORMAT(RA.fecha_modificacion,'%r') AS hora,P.descripcion AS privada, R.nro_casa, R.calle, 
			               RA.estatus_id, (CASE RA.tipo_gestion_id
			               					When 1 Then 'No concluida' 
						  					When 2 Then 'Moroso' 
						  					When 3 Then 'Proveedor' 
						  					When 4 Then 'Residente' 
						  					When 5 Then 'Técnico' 
								            When 6 Then 'Trabajador de Obra' 
								            When 7 Then 'Trabajador de Servicio' 
								            When 8 Then 'Visita' 
								            When 9 Then 'Visita de Morosos' 
			               				   END) AS tipo_gestion, RA.observaciones, RA.imagen, P.historial ", FALSE);
		$this->db->from('registros_accesos RA');
		$this->db->join('privadas P','P.privada_id = RA.privada_id','inner');
		$this->db->join('residencias R','R.residencia_id = RA.residencia_id','inner');
		$this->db->where('RA.registro_acceso_id', $id);  
		//$this->db->where('RA.estatus_id', 1);
		$result['data'] = $this->db->get()->row_array();
		//Emails a Enviar		
		$this->db->select("RR.email");
		$this->db->from('residencias_residentes AS RR');
		$this->db->join('registros_accesos RA','RR.residencia_id = RA.residencia_id');
		$this->db->where('RA.registro_acceso_id', $id);  
		$this->db->where('RR.estatus_id', 1);
		$this->db->where('RR.reportar_acceso', 1);
		$resEmails = $this->db->get()->result();
		$strEmails = trim($result['data']['historial']);
		foreach ($resEmails as $row){
			if($strEmails != "") $strEmails.=",";
			$strEmails.= trim($row->email);
		}
		$result['residentes'] = $strEmails;
		//Email del Solicitane
		$this->db->select("RR.email, CONCAT_WS(' ',RR.nombre, RR.ape_paterno, RR.ape_materno) AS solicitante", FALSE);
		$this->db->from('residencias_residentes AS RR');
		$this->db->join('registros_accesos RA','RR.residente_id = RA.solicitante_id');
		$this->db->where('RA.registro_acceso_id', $id);  
		$resEmails = $this->db->get()->result();
		$this->db->select("RV.email, CONCAT_WS(' ',RV.nombre, RV.ape_paterno, RV.ape_materno) AS solicitante", FALSE);
		$this->db->from('residencias_visitantes AS RV');
		$this->db->join('registros_accesos RA','RV.visitante_id = RA.solicitante_id');
		$this->db->where('RA.registro_acceso_id', $id);  
		$resEmails = array_merge($resEmails, $this->db->get()->result());
		$this->db->select("RG.email, CONCAT_WS(' ',RG.nombre, RG.ape_paterno, RG.ape_materno) AS solicitante", FALSE);
		$this->db->from('registros_generales AS RG');
		$this->db->join('registros_accesos RA','RG.registro_general_id = RA.solicitante_id');
		$this->db->where('RA.registro_acceso_id', $id);  
		$resEmails =  array_merge($resEmails, $this->db->get()->result());
		$strEmails = "";
		foreach ($resEmails as $row){
			$strEmails = trim($row->email);
			$result['solicitante'] = $row->solicitante;
		}
		$result['acceso'] = $strEmails;
		return $result;
	}

	public function asignarImagen($intRegistroAccesoID,$strImagen){
		$datos = array(
			'imagen' => $strImagen
		);
		$this->db->where('registro_acceso_id',$intRegistroAccesoID);
		$this->db->limit(1);
		$this->db->update('registros_accesos',$datos);
		return $this->db->_error_message();
	}

	public function filtro_consulta($strFechaHoraInicio,$strFechaHoraFin,$intPrivadaID,$intResidenciaID,$strSolicitanteID,
		                           $intOperadorID,$intTipoGestionID,$intEstatusID, $intNumRows, $intPos) {
		$this->db->where("RA.fecha_modificacion >= STR_TO_DATE('$strFechaHoraInicio','%d-%m-%Y %H:%i:00')");
		$this->db->where("RA.fecha_modificacion <= STR_TO_DATE('$strFechaHoraFin','%d-%m-%Y %H:%i:00')");
        if($intResidenciaID != 0)
			//$strRestricciones .= "AND RA.residencia_id = $intResidenciaID ";
			$this->db->where("RA.residencia_id", $intResidenciaID);
		if($strSolicitanteID != "")
			//$strRestricciones .= "AND RA.solicitante_id = $strSolicitanteID ";
			$this->db->where("RA.solicitante_id", $strSolicitanteID);
		if($intOperadorID != 0)
			//$strRestricciones .= "AND RA.empleado_id = $intOperadorID ";
			$this->db->where("RA.empleado_id", $intOperadorID);
		if($intPrivadaID != 0)
			//$strRestricciones .= "AND RA.privada_id = $intPrivadaID ";
			$this->db->where("RA.privada_id", $intPrivadaID);
		if($intTipoGestionID != 0)
			//$strRestricciones .= "AND RA.tipo_gestion_id = $intTipoGestionID ";
			$this->db->where("RA.tipo_gestion_id",$intTipoGestionID);
		if($intEstatusID != 0)
			//$strRestricciones .= "AND RA.estatus_id = $intEstatusID ";
			$this->db->where("RA.estatus_id", $intEstatusID);
		$this->db->from('registros_accesos RA');
		$this->db->join('privadas P','P.privada_id = RA.privada_id','inner');
		$this->db->join('residencias R','R.residencia_id = RA.residencia_id','inner');
		$this->db->join('empleados E','E.empleado_id = RA.empleado_id','inner');
		$this->db->order_by("RA.fecha_modificacion",'asc');
		$res['total_rows'] = $this->db->count_all_results();

		//$strRestricciones = "WHERE RA.fecha_modificacion >= '$strFechaHoraInicio' 
		//                     AND RA.fecha_modificacion <= '$strFechaHoraFin' ";
		$this->db->where("RA.fecha_modificacion >= STR_TO_DATE('$strFechaHoraInicio','%d-%m-%Y %H:%i:00')");
		$this->db->where("RA.fecha_modificacion <= STR_TO_DATE('$strFechaHoraFin','%d-%m-%Y %H:%i:00')");
        if($intResidenciaID != 0)
			//$strRestricciones .= "AND RA.residencia_id = $intResidenciaID ";
			$this->db->where("RA.residencia_id", $intResidenciaID);
		if($strSolicitanteID != "")
			//$strRestricciones .= "AND RA.solicitante_id = $strSolicitanteID ";
			$this->db->where("RA.solicitante_id", $strSolicitanteID);
		if($intOperadorID != 0)
			//$strRestricciones .= "AND RA.empleado_id = $intOperadorID ";
			$this->db->where("RA.empleado_id", $intOperadorID);
		if($intPrivadaID != 0)
			//$strRestricciones .= "AND RA.privada_id = $intPrivadaID ";
			$this->db->where("RA.privada_id", $intPrivadaID);
		if($intTipoGestionID != 0)
			//$strRestricciones .= "AND RA.tipo_gestion_id = $intTipoGestionID ";
			$this->db->where("RA.tipo_gestion_id",$intTipoGestionID);
		if($intEstatusID != 0)
			//$strRestricciones .= "AND RA.estatus_id = $intEstatusID ";
			$this->db->where("RA.estatus_id", $intEstatusID);
		
	/*	$strSQL = " SELECT DATE_FORMAT(RA.fecha_modificacion,'%d-%m-%Y %r') AS fecha, P.descripcion AS privada, 
						  R.nro_casa, R.calle, ( SELECT CONCAT_WS(' ',nombre,ape_paterno,ape_materno) nom 
									               FROM registros_generales 
											       WHERE registro_general_id = RA.solicitante_id 
											     UNION 
											       SELECT CONCAT_WS(' ',nombre,ape_paterno,ape_materno) nom 
									                       FROM residencias_visitantes 
											       WHERE visitante_id = RA.solicitante_id 
											     UNION 
											       SELECT CONCAT_WS(' ',nombre,ape_paterno,ape_materno) 
									                       FROM residencias_residentes 
											       WHERE residente_id = RA.solicitante_id 
				 							   ) AS solicitante, (CASE RA.tipo_gestion_id 
														            When 1 Then 'No concluida' 
															        When 2 Then 'Moroso' 
															        When 3 Then 'Proveedor' 
																	When 4 Then 'Residente' 
																	When 5 Then 'Técnico' 
																	When 6 Then 'Trabajador de Obra' 
																	When 7 Then 'Trabajador de Servicio' 
																	When 8 Then 'Visita' 
																	When 9 Then 'Visita de Morosos' 
			               										  END) AS tipo_gestion, 
                          CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) operador, RA.imagen, (CASE RA.estatus_id
																									 WHEN 1 THEN 'ACCESO'
																									 WHEN 2 THEN 'RECHAZADO'
																									 WHEN 3 THEN 'INFORMADO'
																								    END) estado 
					FROM ((registros_accesos RA INNER JOIN privadas P ON P.privada_id = RA.privada_id ) 
	                      INNER JOIN residencias R ON R.residencia_id = RA.residencia_id ) 
      					 INNER JOIN empleados E ON RA.empleado_id = E.empleado_id 
      				$strRestricciones 
					ORDER BY RA.fecha_modificacion "; */
		$this->db->select("DATE_FORMAT( RA.fecha_modificacion,'%d-%m-%Y %r') AS fecha, P.descripcion AS privada, 
						  R.nro_casa, R.calle, ( SELECT CONCAT_WS(' ',nombre,ape_paterno,ape_materno) AS nom 
									               FROM registros_generales 
											       WHERE registro_general_id = RA.solicitante_id 
											     UNION 
											       SELECT CONCAT_WS(' ',nombre,ape_paterno,ape_materno) AS nom 
									                       FROM residencias_visitantes 
											       WHERE visitante_id = RA.solicitante_id 
											     UNION 
											       SELECT CONCAT_WS(' ',nombre,ape_paterno,ape_materno)  AS nom
									                       FROM residencias_residentes 
											       WHERE residente_id = RA.solicitante_id 
				 							   ) AS solicitante, (CASE RA.tipo_gestion_id 
														            When 1 Then 'No concluida' 
															        When 2 Then 'Moroso' 
															        When 3 Then 'Proveedor' 
																	When 4 Then 'Residente' 
																	When 5 Then 'Técnico' 
																	When 6 Then 'Trabajador de Obra' 
																	When 7 Then 'Trabajador de Servicio' 
																	When 8 Then 'Visita' 
																	When 9 Then 'Visita de Morosos' 
			               										  END) AS tipo_gestion, 
                          CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) AS operador, RA.imagen, (CASE RA.imagen 
                          																				WHEN 'No fue subida!' THEN TRUE
                          																				WHEN NOT 'No fue subida!' THEN NULL
                          																			   END) AS subida, (CASE RA.estatus_id
																														 WHEN 1 THEN 'ACCESO'
																														 WHEN 2 THEN 'RECHAZADO'
																														 WHEN 3 THEN 'INFORMADO'
																													    END) AS estado, RA.registro_acceso_id,S.registro_acceso_id AS supervicion ", FALSE);
		$this->db->from('registros_accesos RA');
		$this->db->join('privadas P','P.privada_id = RA.privada_id','inner');
		$this->db->join('residencias R','R.residencia_id = RA.residencia_id','inner');
		$this->db->join('empleados E','E.empleado_id = RA.empleado_id','inner');
		$this->db->join('supervicion_llamadas S', 'RA.registro_acceso_id = S.registro_acceso_id','left');
		$this->db->order_by("RA.fecha_modificacion",'asc');
		$this->db->limit($intNumRows,$intPos);
		$res['rows'] = $this->db->get()->result();
		return $res;
	}


	public function filtro_grafica($strFechaHoraInicio,$strFechaHoraFin,$intPrivadaID,$intResidenciaID,$strSolicitanteID,
		                           $intOperadorID,$intTipoGestionID,$intEstatusID,$intFiltro) {

		
		$this->db->where("RA.fecha_modificacion >= STR_TO_DATE('$strFechaHoraInicio','%d-%m-%Y %H:%i:00')");
		$this->db->where("RA.fecha_modificacion <= STR_TO_DATE('$strFechaHoraFin','%d-%m-%Y %H:%i:00')");
        if($intResidenciaID != 0)
			$this->db->where("RA.residencia_id", $intResidenciaID);
		if($strSolicitanteID != "")
			$this->db->where("RA.solicitante_id", $strSolicitanteID);
		if($intOperadorID != 0)
			$this->db->where("RA.empleado_id", $intOperadorID);
		if($intPrivadaID != 0)
			$this->db->where("RA.privada_id", $intPrivadaID);
		if($intTipoGestionID != 0)
			$this->db->where("RA.tipo_gestion_id",$intTipoGestionID);
		if($intEstatusID != 0)
			$this->db->where("RA.estatus_id", $intEstatusID);
		
		if($intFiltro == 0)
			$this->db->select("DATE_FORMAT(RA.fecha_modificacion,'%Y-%m-%d %H:00:00') AS fecha, count(*) AS total", FALSE);
		else if($intFiltro == 1)
			$this->db->select("DATE_FORMAT(RA.fecha_modificacion,'%Y-%m-%d') AS fecha, count(*) AS total", FALSE);
		else
			$this->db->select("DATE_FORMAT(RA.fecha_modificacion,'%Y-%m-01') AS fecha, count(*) AS total", FALSE);
		$this->db->from('registros_accesos RA');
		//$this->db->join('privadas P','P.privada_id = RA.privada_id','inner');
		//$this->db->join('residencias R','R.residencia_id = RA.residencia_id','inner');
		//$this->db->join('empleados E','E.empleado_id = RA.empleado_id','inner');
		//$this->db->join('supervicion_llamadas S', 'RA.registro_acceso_id = S.registro_acceso_id','left');
		$this->db->group_by('fecha');
		$this->db->order_by("fecha",'asc');
		$res['rows'] = $this->db->get()->result_array();
		//echo $this->db->last_query();
		return $res;
	}
}
?>