<?php
class Indicadores_Model extends CI_model
{
	public function filtroFinanzas($strBusqueda, $intNumRows, $intPos){
		$fechaActual= date('Y-m-d');
		$this->db->like('usuario',$strBusqueda);
		$this->db->from('usuarios as u INNER JOIN empleados as e on u.empleado_id = e.empleado_id');
		$this->db->where('u.logueado', 1);
		$this->db->where('e.puesto_id', 1);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("FORMAT(SUM(precio),2) as folios_h, IFNULL((SELECT FORMAT(SUM(precio),2) FROM residencias_residentes_tarjetas_no_renovacion WHERE fecha_modificacion LIKE  '%".$fechaActual."%'),0) as folios_b, IFNULL((SELECT FORMAT(SUM(total),2) FROM folios_mensualidades WHERE fecha LIKE  '%".$fechaActual."%'),0) as folios_a, IFNULL((SELECT FORMAT(SUM(total),2) FROM gastos WHERE fecha LIKE  '%".$fechaActual."%'),0) as gastos, IFNULL(FORMAT((IFNULL((SELECT SUM(precio) FROM residencias_residentes_tarjetas WHERE fecha_modificacion LIKE  '%".$fechaActual."%'),0)+IFNULL((SELECT SUM(precio) FROM residencias_residentes_tarjetas_no_renovacion WHERE fecha_modificacion LIKE  '%".$fechaActual."%'),0)+IFNULL((SELECT SUM(total) FROM folios_mensualidades WHERE fecha LIKE  '%".$fechaActual."%'),0)-IFNULL((SELECT SUM(total) FROM gastos WHERE fecha LIKE  '%".$fechaActual."%'),0)),2),0) as total_general", FALSE);
		$this->db->like('fecha_modificacion', $fechaActual);
		$this->db->from('residencias_residentes_tarjetas');
		$this->db->limit($intNumRows,$intPos);
		$res["indicadores"] =$this->db->get()->result();
		return $res;
	}

	public function filtroTecnicos($strBusqueda, $intNumRows, $intPos){
		$fechaActual= date('Y-m-d');
		$this->db->distinct('OS.tecnico_id');
		$this->db->select("E.empleado_id, U.usuario, (SELECT COUNT(*) FROM ordenes_servicio as OS WHERE OS.tecnico_id = E.empleado_id AND E.puesto_id =6 AND OS.fecha_modificacion LIKE  '%".$fechaActual."%') AS total_reportes, (SELECT SUM(tiempo) FROM ordenes_servicio as OS WHERE OS.tecnico_id = E.empleado_id AND E.puesto_id =6 AND OS.fecha_modificacion LIKE  '%".$fechaActual."%') AS tiempo_acumulado", FALSE);
		$this->db->from('ordenes_servicio AS OS INNER JOIN empleados AS E on E.empleado_id = OS.tecnico_id INNER JOIN usuarios AS U on U.empleado_id = E.empleado_id');
		$this->db->where('E.puesto_id', 6);
		$this->db->order_by('U.usuario','asc');
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->distinct('OS.tecnico_id');
		$this->db->select("E.empleado_id, U.usuario, (SELECT COUNT(*) FROM ordenes_servicio as OS WHERE OS.tecnico_id = E.empleado_id AND E.puesto_id =6 AND OS.fecha_modificacion LIKE  '%".$fechaActual."%') AS total_reportes, (SELECT SUM(tiempo) FROM ordenes_servicio as OS WHERE OS.tecnico_id = E.empleado_id AND E.puesto_id =6 AND OS.fecha_modificacion LIKE  '%".$fechaActual."%') AS tiempo_acumulado", FALSE);
		$this->db->from('ordenes_servicio AS OS INNER JOIN empleados AS E on E.empleado_id = OS.tecnico_id INNER JOIN usuarios AS U on U.empleado_id = E.empleado_id');
		$this->db->where('E.puesto_id', 6);
		$this->db->order_by('U.usuario','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["tecnicos"] =$this->db->get()->result();
		return $res;
	}

	public function filtroMonitoristas($strBusqueda, $intNumRows, $intPos){
		$fechaActual= date('Y-m-d');
		$this->db->like('usuario',$strBusqueda);
		$this->db->from('usuarios as u INNER JOIN empleados as e on u.empleado_id = e.empleado_id');
		$this->db->where('u.logueado', 1);
		$this->db->where('e.puesto_id', 1);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("e.nombre, u.usuario_id, u.ultima_sesion, (SELECT COUNT( * ) FROM registros_accesos WHERE usuario_id = u.usuario_id AND fecha_modificacion LIKE  '%".$fechaActual."%' AND duracion >= '00:00:01' AND duracion <= '00:00:15') AS llamadas115, (SELECT COUNT( * ) FROM registros_accesos WHERE usuario_id = u.usuario_id AND fecha_modificacion LIKE  '%".$fechaActual."%' AND duracion > '00:00:15' AND duracion <= '00:00:30') AS llamadas1530, (SELECT COUNT( * ) FROM registros_accesos WHERE usuario_id = u.usuario_id AND fecha_modificacion LIKE  '%".$fechaActual."%' AND duracion > '00:00:30') AS llamadas30mas, (SELECT COUNT( * ) FROM registros_accesos WHERE usuario_id = u.usuario_id AND fecha_modificacion LIKE  '%".$fechaActual."%') AS total_llamadas, (SELECT ROUND( SUM( duracion ) /60 ) FROM registros_accesos WHERE usuario_id = u.usuario_id AND fecha_modificacion LIKE  '%".$fechaActual."%') as total_minutos, (SELECT MOD((SUM(duracion)),60) FROM registros_accesos WHERE usuario_id = u.usuario_id AND fecha_modificacion LIKE  '%".$fechaActual."%') as total_segundos, ROUND(((SELECT ROUND(SUM(duracion)) FROM registros_accesos WHERE usuario_id = u.usuario_id AND fecha_modificacion LIKE  '%".$fechaActual."%')/(SELECT COUNT( * ) FROM registros_accesos WHERE usuario_id = u.usuario_id AND fecha_modificacion LIKE  '%".$fechaActual."%'))) as promedio", FALSE);
		$this->db->from('usuarios as u INNER JOIN empleados as e on u.empleado_id = e.empleado_id');
		$this->db->where('u.logueado', 1);
		$this->db->where('e.puesto_id', 1);
		$this->db->order_by('u.ultima_sesion','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["indicadores"] =$this->db->get()->result();
		return $res;
	}

	public function finanzas_cmb(){
		$this->db->select('usuario_id AS value,usuario');
		$this->db->from('usuarios');
		$this->db->where('estatus_id',1);
		$this->db->order_by('usuario_id','asc');
		return $this->db->get()->result();
	}
}	
?>