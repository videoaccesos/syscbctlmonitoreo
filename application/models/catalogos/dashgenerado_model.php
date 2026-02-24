<?php
class Dashgenerado_Model extends CI_model
{
	public function filtro($strBusqueda, $intNumRows, $intPos){
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
		$res["dashgenerado"] =$this->db->get()->result();
		return $res;
	}

	public function dashgenerado_cmb(){
		$this->db->select('usuario_id AS value,usuario');
		$this->db->from('usuarios');
		$this->db->where('estatus_id',1);
		$this->db->order_by('usuario_id','asc');
		return $this->db->get()->result();
	}
}	
?>