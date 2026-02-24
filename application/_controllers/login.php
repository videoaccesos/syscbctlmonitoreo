<?php 
class Login extends CI_Controller {

	public function __construct(){
		parent::__construct();
	}

	public function index(){
		if(is_null($this->session->userdata('login')) || $this->session->userdata('login') == "") {
    		$this->load->view('sistema/login.php');
    	}
    	else{
    		redirect(base_url());
    	}

	}

	public function login_ (){
				//echo "inteto de logeo<br>";
				$strUsuario = $this->db->escape($this->input->post('strUsuario'));
				$strPass = $this->db->escape($this->Encriptar($this->input->post('strPassword')));
				$strSQL = "SELECT U.usuario_id, U.usuario, U.modificar_fechas, Now() AS fecha, IFNULL(E.empleado_id,0) AS empleado_id,
				                  CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) AS empleado, E.nro_operador, E.puesto_id
						   FROM usuarios U LEFT JOIN empleados E ON U.empleado_id = E.empleado_id
						   WHERE U.usuario  = $strUsuario
						   AND  U.contrasena = $strPass
						   AND U.privada_id = 0
						   AND U.estatus_id = 1 ";
				//echo $strSQL."<br>";
				$result = $this->db->query($strSQL);
				//echo var_dump($result);
				//echo "<br>";
				//echo $this->db->_error_message();
				//$this->db->last_query();
				if($row = $result->row()) {
					$newdata = 
						array(
		                   'usuario_id'  =>  $row->usuario_id,
		                   'usuario'     =>  $row->usuario,
		                   'fecha'     => $row->fecha,
		                   'mod_fecha'     => $row->modificar_fechas,
		                   'empleado_id' => $row->empleado_id,
		                   'nro_operador' => $row->nro_operador,
		                   'empleado' => $row->empleado,
		                   'puesto_id' => $row->puesto_id,
		                   'login' => TRUE,
		                   'mensaje' => '' 
	               		);
				   $this->session->set_userdata($newdata);
				}
				$this->index();
		}

		public function logout(){
			$this->session->sess_destroy();
		   	redirect(base_url('login'));
		}

		public function Encriptar($cadena){
			return substr(crypt ($cadena,0),0,10);
		}
}
?>