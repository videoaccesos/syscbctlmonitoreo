<?php
class Sistema extends CI_Controller{
	public function __construct(){
		parent::__construct();
	}

	public function index(){
			$data['strProceso'] = '';
			$data['formulario'] = 'Bienvenidos al Sitema de Boutique';
			$data['contenido'] = "<p>Este es un sistema para llebar el control de una Boutique, para cualquier duda llamar a soporte.</p>";
			$this->load->view('sistema/sistema.php',$data);
	}

	public function login(){
			$strUsuario = $this->db->escape($this->input->post('strUsuario'));
			$strPass = $this->db->escape($this->Encriptar($this->input->post('strPassword')));
			$strSQL = "SELECT usuario_id, usuario, modificar_fechas, Now() AS fecha
					   FROM usuarios 
					   WHERE usuario = $strUsuario
					   AND contrasena = $strPass   ";
			$result = $this->db->query($strSQL);
			if($row = $result->row()) {
				$newdata = 
					array(
						'usuario_id'=>$row->usuario_id,
						'usuario'=>$row->usuario,
						'fecha'=>$row->fecha,
						'mod_fecha'=>$row->modificar_fechas,
						'login'=>TRUE,
						'mensaje'=>''
					);
				$this->session->set_userdata($newdata);
			}
			$this->index();
	}

	public function logout(){
		$this->session->sess_destroy();
	   	$this->index();
	}
}