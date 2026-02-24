<?php
class OrdenesServicio_Model extends CI_model
{
	//ID's de la Tabla puestos
	var $intPuestoOperadorID = 1; 
	var $intPuestoTecnicoID = 6; 

	public function guardar($strFolio,$intEmpleadoID,$intPrivadaID,$intTecnicoID,$strFechaAsistio,
							$intTiempo,$intCodigoServicioID,$strDetalleServicio,$intDiagnosticoID,$strDetalleDiagnostico)
	{
		$datos = array(
			'folio' => $strFolio,
			//'fecha' => $strFecha,
			'empleado_id' => $intEmpleadoID,
			'privada_id' => $intPrivadaID,
			'tecnico_id' => $intTecnicoID,
			'cierre_tecnico_id' => 0,
			'cierre_fecha' => '0000-00-00 00:00:00',
			'cierre_comentario' => '',
			//'fecha_asistio' => $strFechaAsistio,
			'tiempo' => $intTiempo,
			'codigo_servicio_id' => $intCodigoServicioID,
			'detalle_servicio' => $strDetalleServicio,
			'diagnostico_id' => $intDiagnosticoID,
			'detalle_diagnostico' => $strDetalleDiagnostico,
			'estatus_id' => 1,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->set('fecha',"NOW()",FALSE);
		$this->db->set('fecha_asistio',"STR_TO_DATE('$strFechaAsistio','%d-%m-%Y %H:%i:00')",FALSE);
		$this->db->insert('ordenes_servicio',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intOrdenServicioID,
				$intEmpleadoID,$intPrivadaID,$intTecnicoID,$strFechaAsistio,$intTiempo,
				$intCodigoServicioID,$strDetalleServicio,$intDiagnosticoID,$strDetalleDiagnostico)
	{
		$datos = array(
			'empleado_id' => $intEmpleadoID,
			'privada_id' => $intPrivadaID,
			'tecnico_id' => $intTecnicoID,
			'tiempo' => $intTiempo,
			'codigo_servicio_id' => $intCodigoServicioID,
			'detalle_servicio' => $strDetalleServicio,
			'diagnostico_id' => $intDiagnosticoID,
			'detalle_diagnostico' => $strDetalleDiagnostico,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->set('fecha_asistio',"STR_TO_DATE('$strFechaAsistio','%d-%m-%Y %H:%i:00')",FALSE);
		$this->db->where('orden_servicio_id',$intOrdenServicioID);
		$this->db->limit(1);
		$this->db->update('ordenes_servicio',$datos);
		return $this->db->_error_message();
	}

	public function solucionar_orden($intOrdenServicioID,
		$intEmpleadoID,$intPrivadaID,$intTecnicoID,$strFechaAsistio,$intTiempo,
		$intCodigoServicioID,$strDetalleServicio,$intDiagnosticoID,$strDetalleDiagnostico)
	{
		$datos = array(
			'empleado_id' => $intEmpleadoID,
			'privada_id' => $intPrivadaID,
			'tecnico_id' => $intTecnicoID,
			'tiempo' => $intTiempo,
			'codigo_servicio_id' => $intCodigoServicioID,
			'detalle_servicio' => $strDetalleServicio,
			'diagnostico_id' => $intDiagnosticoID,
			'detalle_diagnostico' => $strDetalleDiagnostico,
			'estatus_id' => 2,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->set('fecha_asistio',"STR_TO_DATE('$strFechaAsistio','%d-%m-%Y %H:%i:00')",FALSE);
		$this->db->where('orden_servicio_id',$intOrdenServicioID);
		$this->db->limit(1);
		$this->db->update('ordenes_servicio',$datos);
		return $this->db->_error_message();
	}

	public function cerrar_orden($intOrdenServicioID,
		$intEmpleadoID,$intPrivadaID,$intTecnicoID,$strFechaAsistio,$intTiempo,
		$intCodigoServicioID,$strDetalleServicio,$intDiagnosticoID,$strDetalleDiagnostico,
		$strComentario)
	{
		$datos = array(
			'empleado_id' => $intEmpleadoID,
			'privada_id' => $intPrivadaID,
			'tecnico_id' => $intTecnicoID,
			'tiempo' => $intTiempo,
			'codigo_servicio_id' => $intCodigoServicioID,
			'detalle_servicio' => $strDetalleServicio,
			'diagnostico_id' => $intDiagnosticoID,
			'detalle_diagnostico' => $strDetalleDiagnostico,

			'cierre_tecnico_id' => $this->session->userdata('empleado_id'),
			'cierre_comentario' => $strComentario,
			'estatus_id' => 3,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->set('fecha_asistio',"STR_TO_DATE('$strFechaAsistio','%d-%m-%Y %H:%i:00')",FALSE);
		$this->db->set('cierre_fecha', 'NOW()', FALSE);
		$this->db->where('orden_servicio_id',$intOrdenServicioID);
		$this->db->limit(1);
		$this->db->update('ordenes_servicio',$datos);
		return $this->db->_error_message();
	}

	public function filtro($strFechaIni,$strFechaFin,$intEstatusID,$intNumRows,$intPos){
		$strFechaIniParse = $strFechaIni;
		$strFechaFinParse = $strFechaFin;
		$this->db->from('ordenes_servicio O');
		$this->db->join('privadas P','P.privada_id = O.privada_id','inner');
		$this->db->join('empleados T','T.empleado_id = O.tecnico_id','left');
		if($strFechaIni =! "" && $strFechaFin != ""){
			$this->db->where('DATE(O.fecha) >=', $strFechaIniParse);
			$this->db->where('DATE(O.fecha) <=', $strFechaFinParse);
		}
		if($this->intPuestoTecnicoID == $this->session->userdata('puesto_id')){
			$intEmpleadoID = $this->session->userdata('empleado_id');
			$this->db->where("(O.tecnico_id IN (0,$intEmpleadoID) OR O.cierre_tecnico_id = $intEmpleadoID)",NULL,FALSE);
		}
		if($this->intPuestoOperadorID == $this->session->userdata('puesto_id')){
			$this->db->where('O.empleado_id', $this->session->userdata('empleado_id'));
		}
		if($intEstatusID != 0)
			$this->db->where('O.estatus_id', $intEstatusID); 
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("O.orden_servicio_id, DATE_FORMAT(DATE_ADD(O.fecha, INTERVAL -1 HOUR ),'%d-%m-%Y') AS fecha, O.folio, 
						   CONCAT_WS(' ',T.nombre,T.ape_paterno,T.ape_materno) AS tecnico,
						   CONCAT_WS(' ',TC.nombre,TC.ape_paterno,TC.ape_materno) AS tecnico_cierre,
			               P.descripcion AS privada,  ( CASE O.estatus_id
															WHEN 1 THEN 'ABIERTA'
															WHEN 2 THEN 'SOLUCIONADA'
															WHEN 3 THEN 'CERRADA'
														END ) AS estatus ",FALSE);
		$this->db->from('ordenes_servicio O');
		$this->db->join('privadas P','P.privada_id = O.privada_id','inner');
		$this->db->join('empleados T','T.empleado_id = O.tecnico_id','left');
		$this->db->join('empleados TC','TC.empleado_id = O.cierre_tecnico_id','left');
		if($strFechaIni =! "" && $strFechaFin != ""){
			$this->db->where('DATE(O.fecha) >=',$strFechaIniParse);
			$this->db->where('DATE(O.fecha) <=',$strFechaFinParse);
		}
		if($this->intPuestoTecnicoID == $this->session->userdata('puesto_id')){
			$intEmpleadoID = $this->session->userdata('empleado_id');
			$this->db->where("(O.tecnico_id IN (0,$intEmpleadoID) OR O.cierre_tecnico_id = $intEmpleadoID)",NULL,FALSE);
		}
		if($this->intPuestoOperadorID == $this->session->userdata('puesto_id')){
			$this->db->where('O.empleado_id', $this->session->userdata('empleado_id'));
		}
		if($intEstatusID != 0)
			$this->db->where('O.estatus_id', $intEstatusID); 
		$this->db->order_by('O.estatus_id','asc');
		$this->db->order_by('O.folio','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["ordenes"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($busqueda, $tipo = 1){
		$this->db->select("O.orden_servicio_id,O.folio,DATE_FORMAT(DATE_ADD(O.fecha,INTERVAL -1 HOUR),'%d-%m-%Y %H:%i') AS fecha, O.estatus_id,
						   (CASE O.estatus_id WHEN 1 THEN 'ABIERTA' WHEN 2 THEN 'SOLUCIONADA' WHEN 3 THEN 'CERRADA' END) AS estatus, O.empleado_id, 
						   CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) AS empleado, O.privada_id,
			               O.tecnico_id, O.tiempo, O.codigo_servicio_id, O.detalle_servicio, O.diagnostico_id, O.detalle_diagnostico,
			               DATE_FORMAT(DATE_ADD(O.fecha_asistio,INTERVAL -1 HOUR),'%d-%m-%Y %H:%i') AS fecha_asistio, 
			               DATE_FORMAT(DATE_ADD(O.cierre_fecha,INTERVAL -1 HOUR),'%d-%m-%Y %H:%i') AS cierre_fecha,
			               O.cierre_tecnico_id, CONCAT_WS(' ',C.nombre,C.ape_paterno,C.ape_materno) AS cierre_tecnico, O.cierre_comentario ", FALSE);
		$this->db->from('ordenes_servicio O');
		$this->db->join('empleados E','E.empleado_id = O.empleado_id','inner');
		$this->db->join('empleados C','C.empleado_id = O.cierre_tecnico_id','left');
		if($tipo == 1)
			$this->db->where('O.orden_servicio_id',$busqueda);
		else 
			$this->db->where('O.folio',$busqueda);
		
		if($this->intPuestoTecnicoID == $this->session->userdata('puesto_id')){
			$intEmpleadoID = $this->session->userdata('empleado_id');
			$this->db->where("(O.tecnico_id IN (0,$intEmpleadoID) OR O.cierre_tecnico_id = $intEmpleadoID)",NULL,FALSE);
		}
		if($this->intPuestoOperadorID == $this->session->userdata('puesto_id')){
			$this->db->where('O.empleado_id', $this->session->userdata('empleado_id'));
		}
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function enviar_notificacion($strFolio)
	{
		$this->db->select("O.folio, CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) AS empleado,
		 				   CONCAT_WS(' ',C.nombre,C.ape_paterno,C.ape_materno) AS tecnico,
			               CS.descripcion AS codigo_servicio, O.detalle_servicio, P.descripcion AS privada,
			               (SELECT value FROM ordenes_servicio_configuracion WHERE id = 1) AS email ", FALSE);
		$this->db->from('ordenes_servicio O');
		$this->db->join('codigos_servicio CS','CS.codigo_servicio_id = O.codigo_servicio_id','inner');
		$this->db->join('empleados E','E.empleado_id = O.empleado_id','inner');
		$this->db->join('privadas P','P.privada_id = O.privada_id','inner');
		$this->db->join('empleados C','C.empleado_id = O.tecnico_id','left');
		$this->db->where('O.folio',$strFolio);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	//--------------------------------------------------------
	//Seguimiento
	//----------------------------------------------------------------------
	public function guardar_seguimiento($intOrdenServicioID,$strComentario){
		$datos = array(
			'orden_servicio_id' => $intOrdenServicioID,
			'comentario' =>	$strComentario,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('ordenes_servicio_seguimiento',$datos);
	}

	public function filtro_seguimiento($intOrdenServicioID,$intNumRows,$intPos){
		$this->db->from('ordenes_servicio_seguimiento');
		$this->db->where('orden_servicio_id', $intOrdenServicioID);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("S.comentario, DATE_FORMAT(DATE_ADD(S.fecha_modificacion, INTERVAL -1 HOUR ),'%d-%m-%Y %H:%i') AS fecha",FALSE);
		$this->db->from('ordenes_servicio_seguimiento S');
		$this->db->where('orden_servicio_id', $intOrdenServicioID); 
		$this->db->order_by('fecha','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["seguimientos"] =$this->db->get()->result();
		return $res;
	}

	//--------------------------------------------------------
	//Materiales
	//----------------------------------------------------------------------
	public function guardar_material($intOrdenServicioID,$intMaterialID,$dblCantidad){
		$datos = array(
			'orden_servicio_id' => $intOrdenServicioID,
			'material_id' =>	$intMaterialID,
			'cantidad' => $dblCantidad,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('ordenes_servicio_material',$datos);
	}

	public function eliminar_material($intOrdenServicioID,$intMaterialID){
		$this->db->where('orden_servicio_id', $intOrdenServicioID);
		$this->db->where('material_id', $intMaterialID);
		$this->db->delete('ordenes_servicio_material'); 
	}

	public function filtro_material($intOrdenServicioID,$intNumRows,$intPos){
		$this->db->select('material_id');
		$this->db->from('ordenes_servicio_material');
		$this->db->where('orden_servicio_id', $intOrdenServicioID);
		$this->db->group_by('material_id');
		$res["total_rows"] = count($this->db->get()->result());

		$this->db->select("OM.material_id,SUM(OM.cantidad) AS cantidad, M.codigo, M.descripcion",FALSE);
		$this->db->from('ordenes_servicio_material OM');
		$this->db->join('materiales M','OM.material_id = M.material_id','inner');
		$this->db->where('OM.orden_servicio_id', $intOrdenServicioID); 
		$this->db->order_by('OM.fecha_modificacion','desc'); 
		$this->db->group_by('OM.material_id,M.codigo,M.descripcion');
		$this->db->limit($intNumRows,$intPos); 
		$res["materiales"] =$this->db->get()->result(); 
		return $res; 
	}
}	
?>