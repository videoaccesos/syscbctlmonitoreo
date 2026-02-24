<?php
class Articulos_Model extends CI_model
{
	public function guardar($strModelo,$strDescripcion,$dblCosto,$intExistencia,$intEstatus){
		$datos = array(
			'modelo' => $strModelo, 
			'descripcion' => $strDescripcion,
			'costo' => $dblCosto,
			'existencia' => $intExistencia,
			'estatus_id' => $intEstatus);
		$this->db->insert('articulos',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intArticuloID,$strModelo,$strDescripcion,$dblCosto,$intExistencia,$intEstatus){
		$datos = array(
			'modelo' => $strModelo, 
			'descripcion' => $strDescripcion, 
			'costo' => $dblCosto,
			'existencia' => $intExistencia,
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

		$this->db->select("articulo_id,modelo,descripcion,FORMAT(costo,2) AS costo, existencia, 
							(   CASE estatus_id
									WHEN 1 THEN 'Activo'
									WHEN 2 THEN 'Baja'
								END) AS estatus,estatus_id ", FALSE);
		$this->db->from('articulos');
		$this->db->where('estatus_id <>', 3);
		$this->db->like('descripcion',$strBusqueda);  
		$this->db->order_by('modelo','asc');
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

public function autocomplete($q, $limit){
			$row_set = array();
			$this->db->select("articulo_id, descripcion");
			$this->db->from('articulos');
			$this->db->where('estatus_id',1);
			$this->db->where("descripcion LIKE '%$q%'");  
			$this->db->order_by('descripcion','asc');
			$this->db->limit($limit,0);
		    $query = $this->db->get();
		    if($query->num_rows > 0){
		      foreach ($query->result_array() as $row){
		        $new_row['value'] = $row['descripcion']; //Valor a Mostrar en lista
		        $new_row['data'] = $row['articulo_id']; //Valor del ID
		        $row_set[] = $new_row; //build an array
		      }
		    }
		    return $row_set; //format the array into json data
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