<?php
class Ventas_Model extends CI_model
{
	public function guardar($intFolio,$intCveCliente,$strCliente,$dblTotal,$intPlazoElegido,$estatus){
		$datos = array(
			'folio_venta' => $intFolio, 
			'cve_cliente' => $intCveCliente,
			'nombre' => $strCliente,
			'total' => $dblTotal,
			'plazo_elegido' => $intPlazoElegido,
		'estatus' => $estatus);
		$this->db->insert('ventas',$datos);
		return $this->db->_error_message();
	}

public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('folio_venta',$strBusqueda);
		$this->db->from('ventas');
		$this->db->where('estatus <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("folio_venta,cve_cliente,nombre,total,fecha, 
							(   CASE estatus
									WHEN 1 THEN 'Activo'
									WHEN 2 THEN 'Baja'
								END),estatus ", FALSE);
		$this->db->from('ventas');
		$this->db->where('estatus <>', 3);
		$this->db->like('folio_venta',$strBusqueda);  
		$this->db->order_by('folio_venta','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["ventas"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('ventas');
		$this->db->where('folio_venta',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function ventas_cmb(){
		$this->db->select('*');
		$this->db->from('ventas');
		$this->db->where('estatus',1);
		return $this->db->get()->result();
	}
}	
?>