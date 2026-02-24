<?php
class Tiposgastos_Model extends CI_model
{
	public function guardar($strGasto,$intTipoGasto,$strDiaPago,$intEstatus){
		$datos = array(
			'gasto' => $strGasto,
			'tipo_gasto' => $intTipoGasto,
			'dia_pago' => $strDiaPago,
			'estatus_id' => $intEstatus);
		$this->db->insert('tipos_gastos',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intGastoID,$strGasto,$intTipoGasto,$strDiaPago,$intEstatus){
		$datos = array(
			'gasto' => $strGasto,
			'tipo_gasto' => $intTipoGasto,
			'dia_pago' => $strDiaPago,
			'estatus_id' => $intEstatus);
		$this->db->where('gasto_id',$intGastoID);
		$this->db->limit(1);
		$this->db->update('tipos_gastos',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intGastoID,$intEstatus){
		$datos = array(
			'estatus_id' => $intEstatus,);
		$this->db->where('gasto_id',$intGastoID);
		$this->db->limit(1);
		$this->db->update('tipos_gastos',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intGastoID = null){
		$datos = array(
			'estatus_id' => 3,);
		$this->db->where('gasto_id',$intGastoID);
		$this->db->limit(1);
		$this->db->update('tipos_gastos',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('gasto',$strBusqueda);
		$this->db->from('tipos_gastos');
		$this->db->where('estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("gasto_id,gasto,
							(   CASE tipo_gasto
									WHEN 1 THEN 'Fijo'
									WHEN 2 THEN 'Variable'
								END) AS tipo, tipo_gasto, 
							dia_pago,
							(   CASE estatus_id
									WHEN 1 THEN 'Activo'
									WHEN 2 THEN 'Baja'
								END) AS estatus,estatus_id ", FALSE);
		$this->db->from('tipos_gastos');
		$this->db->where('estatus_id <>', 3);
		$this->db->like('gasto',$strBusqueda);  
		$this->db->order_by('gasto','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["tiposgastos"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('tipos_gastos');
		$this->db->where('gasto_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

public function autocomplete($q, $limit){
			$row_set = array();
			$this->db->select("gasto_id, gasto");
			$this->db->from('tipos_gastos');
			$this->db->where('estatus_id',1);
			$this->db->where("gasto LIKE '%$q%'");  
			$this->db->order_by('gasto','asc');
			$this->db->limit($limit,0);
		    $query = $this->db->get();
		    if($query->num_rows > 0){
		      foreach ($query->result_array() as $row){
		        $new_row['value'] = $row['gasto']; //Valor a Mostrar en lista
		        $new_row['data'] = $row['gasto_id']; //Valor del ID
		        $row_set[] = $new_row; //build an array
		      }
		    }
		    return $row_set; //format the array into json data
		}

	public function tiposgastos_cmb(){
		$this->db->select('gasto_id AS value,gasto AS nombre');
		$this->db->from('tipos_gastos');
		$this->db->where('estatus_id',1);
		$this->db->order_by('gasto','asc');
		return $this->db->get()->result();
	}
}	
?>