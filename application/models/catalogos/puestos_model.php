<?php
class Puestos_Model extends CI_model
{
	public function guardar($strDescripcion,$intEstatus){
		$datos = array(
			'descripcion' => $strDescripcion,
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('puestos',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intPuestoID,$strDescripcion,$intEstatus){
		$datos = array(
			'descripcion' => $strDescripcion, 
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('puesto_id',$intPuestoID);
		$this->db->limit(1);
		$this->db->update('puestos',$datos);
		return $this->db->_error_message();
	}

	public function cambiar_estado($intPuestoID,$intEstatus){
		$datos = array(
			'estatus_id' => $intEstatus,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('puesto_id',$intPuestoID);
		$this->db->limit(1);
		$this->db->update('puestos',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intPuestoID = null){
		$datos = array(
			'estatus_id' => 3,
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('puesto_id',$intPuestoID);
		$this->db->limit(1);
		$this->db->update('puestos',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('descripcion',$strBusqueda);
		$this->db->from('puestos');
		$this->db->where('estatus_id <>', 3);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("puesto_id,descripcion, 
							(CASE estatus_id
										WHEN 1 THEN 'Activo'
										WHEN 2 THEN 'Baja'
									END) AS estatus, estatus_id ");
		$this->db->from('puestos');
		$this->db->where('estatus_id <>', 3);
		$this->db->like('descripcion',$strBusqueda);  
		$this->db->order_by('descripcion','asc');
		$this->db->limit($intNumRows,$intPos);
		$res["puestos"] =$this->db->get()->result();
		return $res;
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('puestos');
		$this->db->where('puesto_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function puestos_cmb(){
		$this->db->select('puesto_id AS value, descripcion AS nombre ');
		$this->db->from('puestos');
		$this->db->where('estatus_id',1);
		$this->db->order_by('descripcion','asc');
		return $this->db->get()->result();
	}
	
	public function administradores_cmb(){
		$this->db->select('E.empleado_id AS value, E.nombre, E.ape_paterno, E.ape_materno', FALSE);
		$this->db->from('empleados as E INNER JOIN usuarios as U on E.empleado_id = U.empleado_id INNER JOIN grupos_usuarios_detalles as GUD on U.usuario_id = GUD.usuario_id');
		$this->db->where('E.estatus_id',1);
		$this->db->where('GUD.grupo_usuario_id',2);
		$this->db->or_where('GUD.grupo_usuario_id',15);
		$this->db->or_where('GUD.grupo_usuario_id',18);
		$this->db->or_where('GUD.grupo_usuario_id',20);
		$this->db->order_by('nombre','asc');
		return $this->db->get()->result();
	}
	
	public function encargadosadmon_cmb(){
		$this->db->select('E.empleado_id AS value, E.nombre, E.ape_paterno, E.ape_materno', FALSE);
		$this->db->from('empleados as E INNER JOIN usuarios as U on E.empleado_id = U.empleado_id INNER JOIN grupos_usuarios_detalles as GUD on U.usuario_id = GUD.usuario_id');
		$this->db->where('E.estatus_id',1);
		$this->db->where('GUD.grupo_usuario_id',2);
		$this->db->or_where('GUD.grupo_usuario_id',15);
		$this->db->or_where('GUD.grupo_usuario_id',18);
		$this->db->or_where('GUD.grupo_usuario_id',20);
		$this->db->order_by('nombre','asc');
		return $this->db->get()->result();
	}
	
	public function supervisores_cmb(){
		$this->db->select('E.empleado_id AS value, E.nombre, E.ape_paterno, E.ape_materno', FALSE);
		$this->db->from('empleados as E INNER JOIN usuarios as U on E.empleado_id = U.empleado_id INNER JOIN grupos_usuarios_detalles as GUD on U.usuario_id = GUD.usuario_id');
		$this->db->where('E.estatus_id',1);
		$this->db->where('GUD.grupo_usuario_id',2);
		$this->db->or_where('GUD.grupo_usuario_id',15);
		$this->db->or_where('GUD.grupo_usuario_id',18);
		$this->db->or_where('GUD.grupo_usuario_id',20);
		$this->db->order_by('nombre','asc');
		return $this->db->get()->result();
	}
}	
?>