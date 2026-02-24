<?php
class Pacientes_Model extends CI_model
{
	public function guardar($strNombre,$strApellidoPaterno,$strApellidoMaterno,$strDireccion,$strTelefono,$strCorreo,$dtFechaNacimiento,$intEdad,$intSexoID,$intEstatus){
		$datos = array(
			'nombre' => $strNombre, 
			'apellido_paterno' => $strApellidoPaterno,
			'apellido_materno' => $strApellidoMaterno,
			'direccion' => $strDireccion,
			'telefono' => $strTelefono,
			'correo_electronico' => $strCorreo,
			'fecha_nacimiento' => $dtFechaNacimiento,
			'edad' => $intEdad,
			'sexo' => $intSexoID,
			'estatus_id' => $intEstatus);
		$this->db->insert('pacientes',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intPacienteID,$strNombre,$strApellidoPaterno,$strApellidoMaterno,$strDireccion,$strTelefono,$strCorreo,$dtFechaNacimiento,$intEdad,$intSexoID,$intEstatus){
		$datos = array(
			'nombre' => $strNombre, 
			'apellido_paterno' => $strApellidoPaterno, 
			'apellido_materno' => $strApellidoMaterno,
			'direccion' => $strDireccion,
			'telefono' => $strTelefono,
			'correo_electronico' => $strCorreo,
			'fecha_nacimiento' => $dtFechaNacimiento,
			'edad' => $intEdad,
			'sexo' => $intSexoID,
			'estatus_id' => $intEstatus,);
		$this->db->where('paciente_id',$intPacienteID);
		$this->db->limit(1);
		$this->db->update('pacientes',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intPacienteID,$intEstatus){
		$datos = array(
			'estatus_id' => $intEstatus,);
		$this->db->where('paciente_id',$intPacienteID);
		$this->db->limit(1);
		$this->db->update('pacientes',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intPacienteID = null){
		$datos = array(
			'estatus_id' => 3,);
		$this->db->where('paciente_id',$intPacienteID);
		$this->db->limit(1);
		$this->db->update('pacientes',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('nombre',$strBusqueda);
		$this->db->from('pacientes');
		$this->db->where('estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("C.paciente_id,C.nombre,C.apellido_paterno,C.apellido_materno,C.direccion,C.telefono,C.correo_electronico,S.fecha_nacimiento,C.edad,TP.sexo, 
							(   CASE C.estatus_id
									WHEN 1 THEN 'Activo'
									WHEN 2 THEN 'Baja'
								END) AS estatus,C.estatus_id ", FALSE);
		$this->db->from('pacientes');
		$this->db->where('C.estatus_id <>', 3);
		$this->db->like('nombre',$strBusqueda);  
		$this->db->order_by('C.paciente_id','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["pacientes"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('pacientes');
		$this->db->where('paciente_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

public function autocomplete($q, $limit){
			$row_set = array();
			$this->db->select("paciente_id, nombre, apellido_materno, apellido_paterno");
			$this->db->from('pacientes');
			$this->db->where('estatus_id', 1);
			$this->db->where("nombre LIKE '%$q%' OR apellido_paterno LIKE '%$q%' OR apellido_materno LIKE '%$q%'");  
			$this->db->order_by('nombre','asc');
			$this->db->limit($limit,0);
		    $query = $this->db->get();
		    if($query->num_rows > 0){
		      foreach ($query->result_array() as $row){
		        $new_row['value'] = $row['nombre'].' '.$row['apellido_paterno'].' '.$row['apellido_materno']; //Valor a Mostrar en lista
		        $new_row['data'] = $row['paciente_id']; //Valor del ID
		        $row_set[] = $new_row; //build an array
		      }
		    }
		    return $row_set; //format the array into json data
		}

	public function pacientes_cmb(){
		$this->db->select('paciente_id AS value,nombre AS nombre');
		$this->db->from('pacientes');
		$this->db->where('estatus_id',1);
		$this->db->order_by('paciente_id','asc');
		return $this->db->get()->result();
	}
}	
?>