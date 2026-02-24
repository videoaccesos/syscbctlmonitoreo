<?php
class Empleados_Model extends CI_model
{
	public function guardar($strNombre,$strApePaterno,$strApeMaterno,$strNroSeguroSocial,$intPuestoID,$strNroOperador,$strCalle,$strNroCasa,$strSexo,
							$strColonia,$strTelefono,$strCelular,$strEmail,$strFechaIngreso,$strFechaBaja,$strMotivoBaja,$intEstatusID){
		$datos = array(
			'nombre' => $strNombre, 
			'ape_paterno' => $strApePaterno,
			'ape_materno' => $strApeMaterno,
			'nro_seguro_social' => $strNroSeguroSocial,
			'puesto_id' => $intPuestoID,
			'nro_operador' => $strNroOperador,
			'calle' => $strCalle,
			'nro_casa' => $strNroCasa,
			'sexo' => $strSexo,
			'colonia' => $strColonia,
			'telefono' => $strTelefono,
			'celular' => $strCelular,
			'email' => $strEmail,
			'fecha_ingreso' => $strFechaIngreso,
			'fecha_baja' => $strFechaBaja,
			'motivo_baja' => $strMotivoBaja,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('empleados',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intEmpleadoID,$strNombre,$strApePaterno,$strApeMaterno,$strNroSeguroSocial,$intPuestoID,$strNroOperador,$strCalle,$strNroCasa,$strSexo,
							$strColonia,$strTelefono,$strCelular,$strEmail,$strFechaIngreso,$strFechaBaja,$strMotivoBaja,$intEstatusID){
		$datos = array(
			'nombre' => $strNombre, 
			'ape_paterno' => $strApePaterno,
			'ape_materno' => $strApeMaterno,
			'nro_seguro_social' => $strNroSeguroSocial,
			'puesto_id' => $intPuestoID,
			'nro_operador' => $strNroOperador,
			'calle' => $strCalle,
			'nro_casa' => $strNroCasa,
			'sexo' => $strSexo,
			'colonia' => $strColonia,
			'telefono' => $strTelefono,
			'celular' => $strCelular,
			'email' => $strEmail,
			'fecha_ingreso' => $strFechaIngreso,
			'fecha_baja' => $strFechaBaja,
			'motivo_baja' => $strMotivoBaja,
			'estatus_id' => $intEstatusID,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('empleado_id',$intEmpleadoID);
		$this->db->limit(1);
		$this->db->update('empleados',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intEmpleadoID = null){
		$datos = array(
			'estatus_id' => 3,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('empleado_id',$intEmpleadoID);
		$this->db->limit(1);
		$this->db->update('empleados',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $strBusquedaPuesto, $intNumRows, $intPos){
		$this->db->where("(E.nombre LIKE '%$strBusqueda%' OR  E.ape_paterno LIKE '%$strBusqueda%' OR  E.ape_materno LIKE  '%$strBusqueda%') ");  
		$this->db->like('P.descripcion',$strBusquedaPuesto);   
		$this->db->from('empleados AS E');
		$this->db->join('puestos AS P', 'E.puesto_id = P.puesto_id', 'inner');
		$this->db->where('E.estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("E.empleado_id, CONCAT(E.nombre,' ',E.ape_paterno,' ',E.ape_materno) AS empleado, 
							(   CASE E.estatus_id
									WHEN 1 THEN 'Activo'
									WHEN 2 THEN 'Baja'
								END) AS estatus, P.descripcion AS puesto ", FALSE);
		$this->db->from('empleados AS E');
		$this->db->join('puestos AS P', 'E.puesto_id = P.puesto_id', 'inner');
		$this->db->where('E.estatus_id <>', 3);
		$this->db->where("(E.nombre LIKE '%$strBusqueda%' OR  E.ape_paterno LIKE '%$strBusqueda%' OR  E.ape_materno LIKE  '%$strBusqueda%') ");  
		$this->db->like('P.descripcion',$strBusquedaPuesto);  
		$this->db->order_by("empleado",'asc');
		$this->db->limit($intNumRows,$intPos);
		$res["empleados"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('empleados');
		$this->db->where('empleado_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function autocomplete($q, $limit){
		$row_set = array();
		$this->db->select("E.empleado_id,CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) AS empleado",FALSE);
		$this->db->from('empleados AS E');
		$this->db->where("CONCAT_WS(' ',E.nombre,(CASE E.ape_paterno WHEN '' THEN null ELSE E.ape_paterno END),E.ape_materno) LIKE  '%$q%' ");  
		$this->db->where('estatus_id',1);
		$this->db->order_by('empleado','asc');
		$this->db->limit($limit,0);
	    $query = $this->db->get();
	    if($query->num_rows > 0){
	      foreach ($query->result_array() as $row){
	        $new_row['value'] = $row['empleado']; //Valor a Mostrar en lista
	        $new_row['data'] = $row['empleado_id']; //Valor del ID
	        $row_set[] = $new_row; //build an array
	      }
	    }
	    return $row_set; //format the array into json data
	}

	public function empleados_cmb($intPuestoID){
		$this->db->select("empleado_id AS value, CONCAT(nombre,' ',ape_paterno,' ',ape_materno) AS nombre ",FALSE);
		$this->db->from('empleados');
		$this->db->where('puesto_id', $intPuestoID);
		$this->db->where('estatus_id',1);
		$this->db->order_by('nombre','asc');
		return $this->db->get()->result();
	}
}	
?>