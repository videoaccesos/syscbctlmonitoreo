<?php
class Clientes_Model extends CI_model
{
	public function guardar($strNombre,$strApellidoPaterno,$strApellidoMaterno,$strRFC,$intEstatus){
		$datos = array(
			'nombre' => $strNombre, 
			'apellido_paterno' => $strApellidoPaterno,
			'apellido_materno' => $strApellidoMaterno,
			'rfc' => $strRFC,
			'estatus_id' => $intEstatus);
		$this->db->insert('clientes',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intClienteID,$strNombre,$strApellidoPaterno,$strApellidoMaterno,$strRFC,$intEstatus){
		$datos = array(
			'nombre' => $strNombre, 
			'apellido_paterno' => $strApellidoPaterno, 
			'apellido_materno' => $strApellidoMaterno,
			'rfc' => $strRFC,
			'estatus_id' => $intEstatus,);
		$this->db->where('cliente_id',$intClienteID);
		$this->db->limit(1);
		$this->db->update('clientes',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intClienteID,$intEstatus){
		$datos = array(
			'estatus_id' => $intEstatus,);
		$this->db->where('cliente_id',$intClienteID);
		$this->db->limit(1);
		$this->db->update('clientes',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intClienteID = null){
		$datos = array(
			'estatus_id' => 3,);
		$this->db->where('cliente_id',$intClienteID);
		$this->db->limit(1);
		$this->db->update('clientes',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('nombre',$strBusqueda);
		$this->db->from('clientes');
		$this->db->where('estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("cliente_id,nombre,apellido_paterno,apellido_materno,rfc, 
							(   CASE estatus_id
									WHEN 1 THEN 'Activo'
									WHEN 2 THEN 'Baja'
								END) AS estatus,estatus_id ", FALSE);
		$this->db->from('clientes');
		$this->db->where('estatus_id <>', 3);
		$this->db->like('nombre',$strBusqueda);  
		$this->db->order_by('cliente_id','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["clientes"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('clientes');
		$this->db->where('cliente_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

public function autocomplete($q, $limit){
			$row_set = array();
			$this->db->select("cliente_id, nombre, apellido_materno, apellido_paterno");
			$this->db->from('clientes');
			$this->db->where('estatus_id', 1);
			$this->db->where("nombre LIKE '%$q%' OR apellido_paterno LIKE '%$q%' OR apellido_materno LIKE '%$q%'");  
			$this->db->order_by('nombre','asc');
			$this->db->limit($limit,0);
		    $query = $this->db->get();
		    if($query->num_rows > 0){
		      foreach ($query->result_array() as $row){
		        $new_row['value'] = $row['nombre'].' '.$row['apellido_paterno'].' '.$row['apellido_materno']; //Valor a Mostrar en lista
		        $new_row['data'] = $row['cliente_id']; //Valor del ID
		        $row_set[] = $new_row; //build an array
		      }
		    }
		    return $row_set; //format the array into json data
		}

	public function clientes_cmb(){
		$this->db->select('cliente_id AS value,nombre AS nombre');
		$this->db->from('clientes');
		$this->db->where('estatus_id',1);
		$this->db->order_by('cliente_id','asc');
		return $this->db->get()->result();
	}
}	
?>