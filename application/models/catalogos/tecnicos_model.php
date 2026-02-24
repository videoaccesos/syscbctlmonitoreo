<?php
class Tecnicos_Model extends CI_model
{
	public function filtro($strBusqueda, $dtFechaInicial, $dtFechaFinal, $intNumRows, $intPos){
		$this->db->distinct('OS.tecnico_id');
		$this->db->select("E.empleado_id, U.usuario, (SELECT COUNT(*) FROM ordenes_servicio as OS WHERE OS.tecnico_id = E.empleado_id AND E.puesto_id =6 AND OS.fecha_modificacion >='".$dtFechaInicial."' AND OS.fecha_modificacion <='".$dtFechaFinal."') AS total_reportes, (SELECT SUM(tiempo) FROM ordenes_servicio as OS WHERE OS.tecnico_id = E.empleado_id AND E.puesto_id =6 AND OS.fecha_modificacion >='".$dtFechaInicial."' AND OS.fecha_modificacion <='".$dtFechaFinal."') AS tiempo_acumulado", FALSE);
		$this->db->from('ordenes_servicio AS OS INNER JOIN empleados AS E on E.empleado_id = OS.tecnico_id INNER JOIN usuarios AS U on U.empleado_id = E.empleado_id');
		$this->db->where('E.puesto_id', 6);
		$this->db->where('OS.fecha_modificacion >=', $dtFechaInicial);
		$this->db->where('OS.fecha_modificacion <=', $dtFechaFinal);
		$this->db->order_by('U.usuario','asc');
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->distinct('OS.tecnico_id');
		$this->db->select("E.empleado_id, U.usuario, (SELECT COUNT(*) FROM ordenes_servicio as OS WHERE OS.tecnico_id = E.empleado_id AND E.puesto_id =6 AND OS.fecha_modificacion >='".$dtFechaInicial."' AND OS.fecha_modificacion <='".$dtFechaFinal."') AS total_reportes, (SELECT SUM(tiempo) FROM ordenes_servicio as OS WHERE OS.tecnico_id = E.empleado_id AND E.puesto_id =6 AND OS.fecha_modificacion >='".$dtFechaInicial."' AND OS.fecha_modificacion <='".$dtFechaFinal."') AS tiempo_acumulado", FALSE);
		$this->db->from('ordenes_servicio AS OS INNER JOIN empleados AS E on E.empleado_id = OS.tecnico_id INNER JOIN usuarios AS U on U.empleado_id = E.empleado_id');
		$this->db->where('E.puesto_id', 6);
		$this->db->where('OS.fecha_modificacion >=', $dtFechaInicial);
		$this->db->where('OS.fecha_modificacion <=', $dtFechaFinal);
		$this->db->order_by('U.usuario','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["tecnicos"] =$this->db->get()->result();
		return $res;
	}
	public function tecnicos_cmb(){
		$this->db->select('usuario_id AS value,usuario');
		$this->db->from('usuarios');
		$this->db->where('estatus_id',1);
		$this->db->order_by('usuario_id','asc');
		return $this->db->get()->result();
	}
}	
?>