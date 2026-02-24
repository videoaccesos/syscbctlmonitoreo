<?php
class SupervicionLlamadas_Model extends CI_model
{
	public function guardar($intRegistroAccesoID,$intSupervisorID,$strFecha,$intSaludo,$intIdeEmpresa,
		                    $intIdeOperador,$intAmable,$intGracias,$intDemanda,$intAsunto,$strTiempo,
		                    $strObservaciones){
		$datos = array(
			'registro_acceso_id' => $intRegistroAccesoID,
			'supervisor_id' => $intSupervisorID,
			//'fecha' => 'STR_TO_DATE(\'$strFecha\',\'%d-%m-%Y %H:%i:00\')',
			'saludo' => $intSaludo,
			'identifico_empresa' => $intIdeEmpresa,
			'identifico_operador' => $intIdeOperador,
			'amable' => $intAmable,
			'gracias' => $intGracias,
			'demanda' => $intDemanda,
			'asunto' => $intAsunto,
			'tiempo_gestion' => $strTiempo,
			'observaciones' => $strObservaciones,
			'usuario_id' => $this->session->userdata('usuario_id'));
		//$this->db->set($datos);
		$this->db->set('fecha',"STR_TO_DATE('$strFecha','%d-%m-%Y %H:%i:00')",FALSE);
		$this->db->insert('supervicion_llamadas',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intRegistroAccesoID,$intSupervisorID,$strFecha,$intSaludo,$intIdeEmpresa,
		                    $intIdeOperador,$intAmable,$intGracias,$intDemanda,$intAsunto,$strTiempo,
		                    $strObservaciones){
		$datos = array(
			'supervisor_id' => $intSupervisorID,
			//'fecha' => $strFecha,
			'saludo' => $intSaludo,
			'identifico_empresa' => $intIdeEmpresa,
			'identifico_operador' => $intIdeOperador,
			'amable' => $intAmable,
			'gracias' => $intGracias,
			'demanda' => $intDemanda,
			'asunto' => $intAsunto,
			'tiempo_gestion' => $strTiempo,
			'observaciones' => $strObservaciones,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->set('fecha',"STR_TO_DATE('$strFecha','%d-%m-%Y %H:%i:00')",FALSE);
		$this->db->where('registro_acceso_id',$intRegistroAccesoID);
		$this->db->limit(1);
		$this->db->update('supervicion_llamadas',$datos);
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
		$this->db->select("DATE_FORMAT( DATE_ADD(RA.fecha_modificacion, INTERVAL -1 HOUR ),'%d-%m-%Y %r') AS fecha_llamada, P.descripcion AS privada, 
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
			               										  END) AS tipo_gestion, RA.observaciones AS observaciones_llamada,
                          CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) AS operador, RA.imagen, (CASE RA.imagen 
                          																				WHEN 'No fue subida!' THEN TRUE
                          																				WHEN NOT 'No fue subida!' THEN NULL
                          																			   END) AS subida, (CASE RA.estatus_id
																														 WHEN 1 THEN 'ACCESO'
																														 WHEN 2 THEN 'RECHAZADO'
																														 WHEN 3 THEN 'INFORMADO'
																													    END) AS estado,
				          S.supervisor_id, (SELECT CONCAT_WS(' ',nombre,ape_paterno,ape_materno)  
				                            FROM empleados
				                            WHERE empleado_id = S.supervisor_id) AS supervisor, 
				          DATE_FORMAT( S.fecha,'%d-%m-%Y %H:%i') AS fecha, S.saludo, S.identifico_empresa,
				          S.identifico_operador, S.amable, S.gracias, S.demanda, S.asunto, S.tiempo_gestion, S.observaciones ", FALSE);
		$this->db->from('registros_accesos RA');
		$this->db->join('privadas P','P.privada_id = RA.privada_id','inner');
		$this->db->join('residencias R','R.residencia_id = RA.residencia_id','inner');
		$this->db->join('empleados E','E.empleado_id = RA.empleado_id','inner');
		$this->db->join('supervicion_llamadas S','S.registro_acceso_id = RA.registro_acceso_id','left');
		$this->db->where('RA.registro_acceso_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function filtro_consulta($strFechaHoraInicio,$strFechaHoraFin,$intPrivadaID,$intResidenciaID,$strSolicitanteID,
		                           $intOperadorID,$intTipoGestionID,$intEstatusID, $intNumRows, $intPos) {
		$this->db->where("DATE_ADD(RA.fecha_modificacion, INTERVAL -1 HOUR ) >= STR_TO_DATE('$strFechaHoraInicio','%d-%m-%Y %H:%i:00')");
		$this->db->where("DATE_ADD(RA.fecha_modificacion, INTERVAL -1 HOUR ) <= STR_TO_DATE('$strFechaHoraFin','%d-%m-%Y %H:%i:00')");
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
		$this->db->where("DATE_ADD(RA.fecha_modificacion, INTERVAL -1 HOUR ) >= STR_TO_DATE('$strFechaHoraInicio','%d-%m-%Y %H:%i:00')");
		$this->db->where("DATE_ADD(RA.fecha_modificacion, INTERVAL -1 HOUR ) <= STR_TO_DATE('$strFechaHoraFin','%d-%m-%Y %H:%i:00')");
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
		
	/*	$strSQL = " SELECT DATE_FORMAT( DATE_ADD(RA.fecha_modificacion, INTERVAL -1 HOUR ),'%d-%m-%Y %r') AS fecha, P.descripcion AS privada, 
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
		$this->db->select("DATE_FORMAT( DATE_ADD(RA.fecha_modificacion, INTERVAL -1 HOUR ),'%d-%m-%Y %r') AS fecha, P.descripcion AS privada, 
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
																													    END) AS estado ", FALSE);
		$this->db->from('registros_accesos RA');
		$this->db->join('privadas P','P.privada_id = RA.privada_id','inner');
		$this->db->join('residencias R','R.residencia_id = RA.residencia_id','inner');
		$this->db->join('empleados E','E.empleado_id = RA.empleado_id','inner');
		$this->db->order_by("RA.fecha_modificacion",'asc');
		$this->db->limit($intNumRows,$intPos);
		$res['rows'] = $this->db->get()->result();
		//echo $this->db->last_query();
		return $res;
	}
}
?>