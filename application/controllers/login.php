<?php 
if (!defined('BASEPATH'))
    exit('No direct script access allowed');

class Login extends CI_Controller{

	public function __construct(){
		parent::__construct();
	}

	public function index(){
		if(is_null($this->session->userdata('login')) || $this->session->userdata('login') == "") {
    		$this->load->view('sistema/login.php');
    	}
    	else{
    		//redirect(base_url());
    	    $arrDatos= array('sistema'  =>  base_url(),
				             'mensaje' => '' 
			               	 );
		   	//Enviar datos a la vista del formulario
			$this->output->set_content_type('application/json')->set_output(json_encode($arrDatos));
		    
    	}

	}

	public function login_(){
		        $arr = array('row' => null);

		        //Recuperar variables de la vista
				$strUsuario = $this->db->escape($this->input->post('strUsuario'));
				$strPassword = $this->db->escape($this->Encriptar($this->input->post('strPassword')));
				$strIPActual=$this->input->post('strIPActual');
				$dteFechaInicioSesAnt=$this->input->post('dteFechaInicioSesAnt');
				$strEstatusVerificacion=$this->input->post('strEstatusVerificacion');
				$intUsuarioID=0;

			    $strSQL = "SELECT U.usuario_id, U.usuario, U.modificar_fechas, Now() AS fecha, IFNULL(E.empleado_id,0) AS empleado_id,
				                  CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) AS empleado, E.nro_operador, E.puesto_id
						   FROM usuarios U LEFT JOIN empleados E ON U.empleado_id = E.empleado_id
						   WHERE U.usuario  = $strUsuario
						   AND  U.contrasena = $strPassword
						   AND U.privada_id = 0
						   AND U.estatus_id = 1 ";
				//echo $strSQL."<br>";
				$result = $this->db->query($strSQL);
				//echo var_dump($result);
				//echo "<br>";
				//echo $this->db->_error_message();
				//$this->db->last_query();
				if($row = $result->row()) {
					$intUsuarioID=$row->usuario_id;
                    //Array con la información para las variables de  sesion
                    $newdata = 
						array(
		                   'usuario_id'  => $intUsuarioID,
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

				    //Insertar los datos de inicio de sesion en la  tabla bitacora_inicio
					$arrDatos = array(
							'usuario_id' => $intUsuarioID, 
							'inicio_sesion' => $this->session->userdata('fecha'),
							'direccion_ip' => $strIPActual,
							'host_name' =>  php_uname('n')
							);
					$this->db->insert('bitacora_inicio',$arrDatos);
					//Si el estatus de verificación es Si significa que el usuario ya ha iniciado sesión en otro equipo
                    //registrar la salida, para que pueda iniciar sesión en el equipo actual.
                    if($strEstatusVerificacion=='Si')
                    {
	                   	 //Actualizar los datos de cierre de sesion en la  tabla bitacora_inicio
						 $this->modificarBitacora($dteFechaInicioSesAnt);
                    }
				  
				}
			$this->index();	

		}

		public function logout(){
	         //Actualizar los datos de cierre de sesion en la  tabla bitacora_inicio
			 $this->modificarBitacora($this->session->userdata('fecha'));
			 //Destruir la sesion 
//$this->session->sess_unset();
			$this->session->sess_destroy();
		   	 redirect(base_url('login'));

           
		}
		//Método que se utiliza para registrar el cierre de sesión en la bitacora de inicio
		public function modificarBitacora($dteFechaInicioSesion=NULL)
		{
			 //Actualizar los datos de cierre de sesion en la  tabla bitacora_inicio
			 $arrDatos = array(
				'cierre_sesion' => date("Y-m-d H:i:s"));
			 $this->db->where('usuario_id', $this->session->userdata('usuario_id'));
			 $this->db->where('inicio_sesion',$dteFechaInicioSesion);
			 $this->db->limit(1);
			 $this->db->update('bitacora_inicio',$arrDatos);

		}
        //Método que se utiliza para destruir la sesión
		public function destruirSesion()
		{
		    //Destruir la sesion 
			$this->session->sess_destroy();
    	    $arrDatos= array('login'  =>  base_url('login'),
				             'mensaje' => '' 
			               	 );
		   	//Enviar datos a la vista del formulario
			$this->output->set_content_type('application/json')->set_output(json_encode($arrDatos));
		}

		public function Encriptar($cadena){
			return substr(crypt ($cadena,'va'),0,10);
		}

        //Método para regresar la sesión anterior
        //del usuario que intenta logearse en el sistema
		public function regresarSesionAnterior(){
			$arrDatos= array('inicio_sesion'  =>  '',
				              'direccion_ip'  => '',
				              'mensaje' => '');
			               		
			//Recuperar variables de la vista
			$strUsuario = $this->db->escape($this->input->post('strUsuario'));
			$strPassword = $this->db->escape($this->Encriptar($this->input->post('strPassword')));
			$dteFechaActual=date("Y-m-d");
			//Seleccionar el inicio de sesión anterior del usuario, para saber si el equipo es diferente
			//y si tiene iniciada la sesión (desde otro equipo)
			$strSQLSesion = "SELECT BI.inicio_sesion,BI.direccion_ip
						   	 FROM usuarios U INNER JOIN bitacora_inicio BI ON BI.usuario_id = U.usuario_id
						     WHERE (DATE_FORMAT( BI.inicio_sesion,  '%Y-%m-%d' ) BETWEEN  '$dteFechaActual' AND  '$dteFechaActual')
						     AND   BI.cierre_sesion IS NULL 
						     AND   U.usuario  = $strUsuario
						     AND   U.contrasena = $strPassword
						     AND   U.privada_id = 0
						     AND   U.estatus_id = 1 ";
		    $resultSesion = $this->db->query($strSQLSesion);
		  	//Si existen registros
		   	if($row = $resultSesion->row()) {
		   		$arrDatos= array(
				                   'inicio_sesion'  =>  $row->inicio_sesion,
				                   'direccion_ip'  =>  $row->direccion_ip,
				                   'mensaje' => '' 
			               		);

		   	}
		   	//Enviar datos a la vista del formulario
			$this->output->set_content_type('application/json')->set_output(json_encode($arrDatos));

		}

		//FUNCIÓN QUE SE EJECUTA PARA VALIDAR SI EL USUARIO QUE ESTÁ QUERIENDO INGRESAR ES CORRECTO
		public function validarUsuario(){
			$arrDatos= array('empleado_id'  =>  '',
				             'mensaje' => '');
			               		
			$arr = array('row' => null);

		        //CACHAMOS LAS VARIABLES QUE SE ENVÍAN COMO PARÁMETRO DESDE LA VISTA
				$strUsuario = $this->db->escape($this->input->post('strUsuario'));
				$strPassword = $this->db->escape($this->Encriptar($this->input->post('strPassword')));

				//HACEMOS LA CONSULTA PARA VALIDAR SI LOS DATOS PARA ACCEDER SON CORRECTOS
			    $strSQL = "SELECT U.usuario_id, U.usuario, U.modificar_fechas, Now() AS fecha, IFNULL(E.empleado_id,0) AS empleado_id,
				                  CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) AS empleado, E.nro_operador, E.puesto_id
						   FROM usuarios U LEFT JOIN empleados E ON U.empleado_id = E.empleado_id
						   WHERE U.usuario  = $strUsuario
						   AND  U.contrasena = $strPassword
						   AND U.privada_id = 0
						   AND U.estatus_id = 1 ";
				//OBTENEMOS EL RESULTADO EN ESTA VARIABLE
				$result = $this->db->query($strSQL);
		  	//SI EXISTEN REGISTROS ASIGNAMOS LOS VALORES QUE VAMOS A REGRESAR A LA VISTA...
		   	if($row = $result->row()) {
		   		$arrDatos= array(
				                   'empleado_id'  =>  $row->empleado_id,
				                   'mensaje' => '' 
			               		);

		   	}
		   	//ENVIAMOS LOS DATOS A LA VISTA
			$this->output->set_content_type('application/json')->set_output(json_encode($arrDatos));

		}


	
}
?>