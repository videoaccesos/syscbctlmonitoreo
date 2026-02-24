<?php
	class Usuarios extends MY_Controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'usuarios';
	      $this->data['formulario'] = 'USUARIOS ';
	      $this->bolAcceso = $this->Acceso('Usuarios');
	      $this->load->model('seguridad/usuarios_model','usuarios');
	    }

		public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("seguridad/usuarios",NULL,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->usuarios->filtro(
				                             $this->input->post('strBusqueda'), 
				                             0, //intPrivadaID, -> control para usuarios del sistema
				                             $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('usuarios' => $result['usuarios'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => ''
				         );
			$id = $this->input->post('intUsuarioID');
			if(is_numeric($id)){
				$row = $this->usuarios->buscar($id);
				if($row){
					$arr['row'] = $row;
				}else {
					$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontro ningun Usuario!</div>';	
				}	
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
		public function guardar(){ 
			$this->load->library('form_validation');
			if($this->input->post('intUsuarioID') == "") 
				$this->form_validation->set_rules('strUsuario', 'Usuario', 'required|min_length[4]|max_length[20]|is_unique[usuarios.usuario]');
			else
				$this->form_validation->set_rules('strUsuario', 'Usuario', 'required|min_length[4]|max_length[20]');
			$this->form_validation->set_rules('strPassword', 'Password', 'required|min_length[4]');
			$this->form_validation->set_rules('strConfirmacion', 'Confirmacion', 'required|matches[strPassword]');
			$this->form_validation->set_rules('intModificaFechas', 'ModificarFechas', 'required|integer');
			$this->form_validation->set_rules('intEmpleadoID', 'Empleado', 'integer');
			$this->form_validation->set_rules('intEstatus', 'Estatus', 'required|integer');

			if ($this->form_validation->run() == FALSE) {
				//$this->data['contenido'] = $this->load->view("seguridad/$this->strRuta.php",null,TRUE);
				//$this->load->view('sistema/sistema.php',$this->data);
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intUsuarioID'))){
					$res=$this->usuarios->modificar(
						$this->input->post('intUsuarioID'),
						$this->input->post('strUsuario'),
						$this->Encriptar($this->input->post('strPassword')),
						$this->input->post('intModificaFechas'),
						$this->input->post('intEmpleadoID'),
						0, //intPrivadaID -> Se va en '0' cuando son usuarios de la organizacion
						$this->input->post('intEstatus')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->usuarios->guardar(
							$this->input->post('strUsuario'),
							$this->Encriptar($this->input->post('strPassword')),
							$this->input->post('intModificaFechas'),
							$this->input->post('intEmpleadoID'),
							0, //intPrivadaID -> Se va en '0' cuando son usuarios de la organizacion
							$this->input->post('intEstatus')
						);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Usuario no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Usuario se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function cambiarpassword(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('strPassActual', 'Password Actual', 'required|min_length[4]');
			$this->form_validation->set_rules('strPassNuevo', 'Nuevo Password', 'required|min_length[4]|matches[strPassConfirm]');
			$this->form_validation->set_rules('strPassConfirm', 'Confirmacion', 'required|min_length[4]');

			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$res = $this->usuarios->cambio_contrasena(
					   $this->Encriptar($this->input->post('strPassActual')),
					   $this->Encriptar($this->input->post('strPassNuevo'))
					   );
				if($res) 
					$arr = array( 'resultado' => 0,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Password no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Nuevo Password se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function eliminar(){
			$arr = array('resultado' => 0,
				         'mensajes' => '');
			$id = $this->input->post('intUsuarioID');
			if(is_numeric($id)){
				if($this->usuarios->eliminar($id)){
					$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontro el Usuario, vuelva a intentarlo!</div>';	
				}else {
					$arr['mensajes'] = '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Usuario se elimino correctamente!</div>';
					$arr['resultado'] = 1;
				}	
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function filtrar($q,$limit = 5){
			 if(isset($q) && isset($limit)){
				$filtro = $this->db->query("SELECT usuario_id, usuario 
					                        FROM usuarios 
					                        WHERE usuario 
					                        LIKE '$q%'
					                        ORDER BY usuario ASC LIMIT 0,$limit");
				if($filtro->num_rows()){
					foreach($filtro->result() as $row)
						echo  "$row->usuario|$row->usuario_id|\n";
					$filtro->free_result();
				}	
			}
		}
	}
?>