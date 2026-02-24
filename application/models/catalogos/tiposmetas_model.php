<?php
class Tiposmetas_Model extends CI_model
{
	public function guardar($strMeta,$intEstatus){
		$datos = array(
			'meta' => $strMeta,
			'estatus_id' => $intEstatus);
		$this->db->insert('tipos_metas',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intMetaID,$strMeta,$intEstatus){
		$datos = array(
			'meta' => $strMeta,
			'estatus_id' => $intEstatus);
		$this->db->where('meta_id',$intMetaID);
		$this->db->limit(1);
		$this->db->update('tipos_metas',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intMetaID,$intEstatus){
		$datos = array(
			'estatus_id' => $intEstatus,);
		$this->db->where('meta_id',$intMetaID);
		$this->db->limit(1);
		$this->db->update('tipos_metas',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intMetaID = null){
		$datos = array(
			'estatus_id' => 3,);
		$this->db->where('meta_id',$intMetaID);
		$this->db->limit(1);
		$this->db->update('tipos_metas',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('meta',$strBusqueda);
		$this->db->from('tipos_metas');
		$this->db->where('estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("meta_id,meta,
							(   CASE estatus_id
									WHEN 1 THEN 'Activo'
									WHEN 2 THEN 'Baja'
								END) AS estatus,estatus_id ", FALSE);
		$this->db->from('tipos_metas');
		$this->db->where('estatus_id <>', 3);
		$this->db->like('meta',$strBusqueda);  
		$this->db->order_by('meta','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["tiposmetas"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('tipos_metas');
		$this->db->where('meta_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

public function autocomplete($q, $limit){
			$row_set = array();
			$this->db->select("meta_id, meta");
			$this->db->from('tipos_metas');
			$this->db->where('estatus_id',1);
			$this->db->where("meta LIKE '%$q%'");  
			$this->db->order_by('meta','asc');
			$this->db->limit($limit,0);
		    $query = $this->db->get();
		    if($query->num_rows > 0){
		      foreach ($query->result_array() as $row){
		        $new_row['value'] = $row['meta']; //Valor a Mostrar en lista
		        $new_row['data'] = $row['meta_id']; //Valor del ID
		        $row_set[] = $new_row; //build an array
		      }
		    }
		    return $row_set; //format the array into json data
		}

	public function tiposmetas_cmb(){
		$this->db->select('meta_id AS value,meta AS nombre');
		$this->db->from('tipos_metas');
		$this->db->where('estatus_id',1);
		$this->db->order_by('meta','asc');
		return $this->db->get()->result();
	}
}	
?>