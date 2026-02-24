<?php
class Articulos_Model extends CI_model
{
	public function guardar($strCodigo,$strDescripcion,$dblCosto,$intEstatus){
		$datos = array(
			'codigo' => $strCodigo, 
			'descripcion' => $strDescripcion,
			'costo' => $dblCosto,
			'estatus_id' => $intEstatus);
		$this->db->insert('articulos',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intArticuloID,$strCodigo,$strDescripcion,$dblCosto,$intEstatus){
		$datos = array(
			'codigo' => $strCodigo, 
			'descripcion' => $strDescripcion, 
			'costo' => $dblCosto,
			'estatus_id' => $intEstatus,);
		$this->db->where('articulo_id',$intArticuloID);
		$this->db->limit(1);
		$this->db->update('articulos',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intArticuloID,$intEstatus){
		$datos = array(
			'estatus_id' => $intEstatus,);
		$this->db->where('articulo_id',$intArticuloID);
		$this->db->limit(1);
		$this->db->update('articulos',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intArticuloID = null){
		$datos = array(
			'estatus_id' => 3,);
		$this->db->where('articulo_id',$intArticuloID);
		$this->db->limit(1);
		$this->db->update('articulos',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('descripcion',$strBusqueda);
		$this->db->from('articulos');
		$this->db->where('estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("articulo_id,codigo,descripcion,FORMAT(costo,2) AS costo, 
							(   CASE estatus_id
									WHEN 1 THEN 'Activo'
									WHEN 2 THEN 'Baja'
								END) AS estatus,estatus_id ", FALSE);
		$this->db->from('articulos');
		$this->db->where('estatus_id <>', 3);
		$this->db->like('descripcion',$strBusqueda);  
		$this->db->order_by('codigo','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["articulos"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('articulos');
		$this->db->where('articulo_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function articulos_cmb(){
		$this->db->select('articulo_id AS value,descripcion AS nombre');
		$this->db->from('articulos');
		$this->db->where('estatus_id',1);
		$this->db->order_by('descripcion','asc');
		return $this->db->get()->result();
	}
}	
?>