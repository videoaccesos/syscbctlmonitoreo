<?php
class Registros_Model extends CI_model
{
	public function filtro($strBusqueda,$dtFechaInicial,$dtFechaFinal, $intNumRows, $intPos){
		$this->db->from('revisar_privadas');
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("e.nombre, e.ape_paterno, e.ape_materno, rp.consecutivo_id,rp.fecha_generado,rp.fecha_revisado, rp.comentarios, p.descripcion, 
							(   CASE rp.estatus_id
									WHEN 1 THEN 'PENDIENTE'
									WHEN 2 THEN 'REVISADA'
								END) AS estatus,rp.estatus_id ", FALSE);
		$this->db->from('empleados as e INNER JOIN usuarios as u on u.empleado_id = e.empleado_id INNER JOIN revisar_privadas as rp on u.usuario_id = rp.usuario_id INNER JOIN privadas as p on rp.privada_id = p.privada_id');
		$this->db->where('rp.fecha_generado >', $dtFechaInicial);
		$this->db->where('rp.fecha_generado <', $dtFechaFinal);
		$this->db->like('e.nombre',$strBusqueda);  
		$this->db->order_by('rp.consecutivo_id','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["registros"] =$this->db->get()->result();
		return $res;
	}

        public function filtroInicio($strBusqueda, $intNumRows, $intPos){
		$this->db->from('revisar_privadas');
		$res["total_rows"] = $this->db->count_all_results();
		$this->db->select("e.nombre, e.ape_paterno, e.ape_materno, rp.consecutivo_id,rp.fecha_generado,rp.fecha_revisado, rp.comentarios, p.descripcion, 
							(   CASE rp.estatus_id
									WHEN 1 THEN 'PENDIENTE'
									WHEN 2 THEN 'REVISADA'
								END) AS estatus,rp.estatus_id ", FALSE);
		$this->db->from('empleados as e INNER JOIN usuarios as u on u.empleado_id = e.empleado_id INNER JOIN revisar_privadas as rp on u.usuario_id = rp.usuario_id INNER JOIN privadas as p on rp.privada_id = p.privada_id');
		$this->db->like('e.nombre',$strBusqueda);  
		$this->db->order_by('rp.consecutivo_id','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["registros"] =$this->db->get()->result();
		return $res;
	}
	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('registros');
		$this->db->where('revisar_privadas',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}
	public function registros_cmb(){
		$this->db->select('consecutivo_id AS value,usuario_id AS nombre');
		$this->db->from('revisar_privadas');
		$this->db->order_by('consecutivo_id','asc');
		return $this->db->get()->result();
	}
}	
?>