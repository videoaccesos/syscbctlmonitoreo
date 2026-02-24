<?php
class Usuarios_Model extends CI_model
{
	public function guardar($strUsuario,$strPass,$intMF,$intEmpleadoID,$intPrivadaID,$intEstatus)
	{
		$datos = array(
			'usuario' => $strUsuario, 
			'contrasena' => $strPass,
			'modificar_fechas' => $intMF,
			'direccion_ip' => '',
			'cambio_contrasena' => '0000-00-00',
			'empleado_id' => $intEmpleadoID,
			'privada_id' => $intPrivadaID,
			'estatus_id' => $intEstatus,
			'usuario_mov_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('usuarios',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intUsuarioID,$strUsuario,$strPass,$intMF,$intEmpleadoID,$intPrivadaID,$intEstatus)
	{
		$datos = array(
			'usuario' => $strUsuario, 
			'contrasena' => $strPass,
			'modificar_fechas' => $intMF,
			'empleado_id' => $intEmpleadoID,
			'privada_id' => $intPrivadaID,
			'estatus_id' => $intEstatus,
			'usuario_mov_id' => $this->session->userdata('usuario_id'));
		$this->db->where('usuario_id',$intUsuarioID);
		$this->db->limit(1);
		$this->db->update('usuarios',$datos);
		return $this->db->_error_message();
	}

	public function cambio_contrasena($strPassActual,$strPass)
	{
		$datos = array(
			'contrasena' => $strPass
			 );
		$this->db->where('usuario_id',$this->session->userdata('usuario_id'));
		$this->db->where('contrasena',$strPassActual);
		$this->db->limit(1);
		$this->db->update('usuarios',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intUsuarioID = null){
		$datos = array(
			'estatus_id' => 3,
			'usuario_mov_id' => $this->session->userdata('usuario_id'));
		$this->db->where('usuario_id',$intUsuarioID);
		$this->db->limit(1);
		$this->db->update('usuarios',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intPrivadaID, $intNumRows, $intPos){
		$this->db->like('usuario',$strBusqueda);
		$this->db->from('usuarios');
		$this->db->where('estatus_id <>', 3);
		if($intPrivadaID == 0)
			$this->db->where('privada_id', 0);
		else
			$this->db->where('privada_id <>', 0);

		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("U.usuario_id,U.usuario, 
							(CASE U.modificar_fechas
							    WHEN 1 THEN 'Si'
							    WHEN 2 THEN 'No'
							END) AS MF,	(CASE U.estatus_id
											WHEN 1 THEN 'Activo'
											WHEN 2 THEN 'Baja'
										END) AS estatus, CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) AS empleado, U.privada_id, IFNULL(P.descripcion, '') AS privada",FALSE);
		$this->db->from('usuarios AS U');
		$this->db->join('empleados AS E', 'U.empleado_id = E.empleado_id', 'left');
		$this->db->join('privadas AS P', 'U.privada_id = P.privada_id', 'left');
		$this->db->where('U.estatus_id <>', 3);
		if($intPrivadaID == 0)
			$this->db->where('U.privada_id', 0);
		else
			$this->db->where('U.privada_id <>', 0);
		$this->db->like('U.usuario',$strBusqueda);  
		$this->db->order_by('P.descripcion,U.usuario','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["usuarios"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select("U.usuario_id, U.usuario, IFNULL(U.empleado_id,0) AS empleado_id, 
			               CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) AS empleado, 
			               U.privada_id, U.modificar_fechas, U.estatus_id", FALSE);
		$this->db->from('usuarios AS U');
		$this->db->join('empleados AS E', 'U.empleado_id = E.empleado_id', 'left');
		$this->db->where('U.usuario_id',$id);
		$this->db->limit(1);
		
		return $this->db->get()->row();
		
	}
}	
?>