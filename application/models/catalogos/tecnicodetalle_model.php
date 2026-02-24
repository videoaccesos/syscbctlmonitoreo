<?php
class Tecnicodetalle_Model extends CI_model
{
	public function filtro($strBusqueda, $tecnicoID, $dtFechaInicial, $dtFechaFinal, $intNumRows, $intPos){
		$this->db->select("OS.folio, P.descripcion as privada, OS.detalle_servicio as falla, OS.detalle_diagnostico as solucion, OS.tiempo, U.usuario", FALSE);
		$this->db->from('ordenes_servicio as OS INNER JOIN privadas as P on OS.privada_id = P.privada_id INNER JOIN empleados as E on OS.tecnico_id = E.empleado_id INNER JOIN usuarios as U on E.empleado_id = U.empleado_id');
		$this->db->where('OS.tecnico_id', $tecnicoID);
		$this->db->where('OS.fecha_modificacion >=', $dtFechaInicial);
		$this->db->where('OS.fecha_modificacion <=', $dtFechaFinal);
		$this->db->order_by('OS.folio','desc');
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("OS.folio, P.descripcion as privada, OS.detalle_servicio as falla, OS.detalle_diagnostico as solucion, OS.tiempo, U.usuario", FALSE);
		$this->db->from('ordenes_servicio as OS INNER JOIN privadas as P on OS.privada_id = P.privada_id INNER JOIN empleados as E on OS.tecnico_id = E.empleado_id INNER JOIN usuarios as U on E.empleado_id = U.empleado_id');
		$this->db->where('OS.tecnico_id', $tecnicoID);
		$this->db->where('OS.fecha_modificacion >=', $dtFechaInicial);
		$this->db->where('OS.fecha_modificacion <=', $dtFechaFinal);
		$this->db->order_by('OS.folio','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["tecnicodetalle"] =$this->db->get()->result();
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