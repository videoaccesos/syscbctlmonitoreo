<?php 
class Gruposusuarios extends MY_Controller
	{
		var $strRuta = 'gruposusuarios';
		var $bolAcceso = FALSE;
		var $data = null;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'grupos de usuario';
	      $this->data['formulario'] = 'GRUPOS DE USUARIO';
	      $this->bolAcceso = $this->Acceso('GRUPOS DE USUARIO');
	      $this->load->model('seguridad/gruposusuarios_model','gruposusuarios');
	    }

	    public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("seguridad/$this->strRuta.php",NULL,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php','',TRUE);
			$this->load->view('sistema/sistema.php',$this->data);
		}
	    
	    public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->gruposusuarios->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['grupos_usuarios'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intGrupoUsuarioID');
			if(is_numeric($id)){
				$row = $this->gruposusuarios->buscar($id);
				if($row){
					$arr['row'] = $row;
				}else {
					$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontro ningun Subproceso!</div>';	
				}	
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function eliminar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intGrupoUsuarioID');
			if(is_numeric($id)){
				$res = $this->gruposusuarios->eliminar($id);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Grupo de Usuario no se pudo eliminar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Grupo de Usuario se elimino correctamente!</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			if($this->input->post('intGrupoUsuarioID') == "") 
				$this->form_validation->set_rules('strNombre', 'Nombre', 'required|max_length[30]|is_unique[grupos_usuarios.nombre]');
			else
				$this->form_validation->set_rules('strNombre', 'Nombre', 'required|max_length[30]');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intGrupoUsuarioID'))){
					$res=$this->gruposusuarios->modificar(
						$this->input->post('intGrupoUsuarioID'),
						$this->input->post('strNombre'),
						$this->input->post('intEstatusID')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->gruposusuarios->guardar(
							$this->input->post('strNombre'),
							$this->input->post('intEstatusID')
						);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Grupo no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Grupo se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function cambiar_estado(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intGrupoUsuarioID', 'Grupo de Usuario', 'required|integer');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intEstatusID = $this->input->post('intEstatusID');
				if($intEstatusID == 1)
					$intEstatusID = 2;
				else
					$intEstatusID = 1;
				$res = $this->gruposusuarios->modificar(
						 $this->input->post('intGrupoUsuarioID'),
						 null,
						 $intEstatusID
					   );
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Estado no se pudo cambiar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Estado se cambio correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function buscar_integrantes(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->gruposusuarios->buscar_usuarios(
			 				$this->input->post('strBusqueda'),
			 				$config['per_page'],
			 	            $config['cur_page'],
			 	            $this->input->post('intGrupoUsuarioID'),
			 	            1);
			$config['total_rows'] = $result['total_rows'];

			$this->pagination->initialize($config);
			$arr = array('rows_1' => $result['usuarios'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $this->input->post('intPagina'),
				         'total_rows_1' => $result['total_rows'],
				         'rows_2' => '',
				         'total_rows_2' => '');
			 
			 $result = $this->gruposusuarios->buscar_usuarios(
			 				$this->input->post('strBusqueda'),
			 				$config['per_page'],
			 	            $config['cur_page'],
			 	            $this->input->post('intGrupoUsuarioID'),
				            2);
			 $config['total_rows'] = $result['total_rows'];

			 $this->pagination->initialize($config);
			 $arr['rows_2'] = $result['usuarios'];

			 $strPaginacion = $this->pagination->create_links();
			 if(strlen($arr['paginacion']) < strlen($strPaginacion))
			 	$arr['paginacion'] = $strPaginacion;
			 $arr['total_rows_2'] = $result['total_rows'];

			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function agregar_miembro(){ 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intGrupoUsuarioID', 'Grupo', 'required|integer');
			$this->form_validation->set_rules('intUsuarioID', 'Usuario', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				
				$res = $this->gruposusuarios->agregar_usuario(
												$this->input->post('intGrupoUsuarioID'),
												$this->input->post('intUsuarioID')
											);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Usuario no se agrego correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Usuario se agrego correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function eliminar_miembro(){ 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intGrupoUsuarioID', 'Grupo', 'required|integer');
			$this->form_validation->set_rules('intUsuarioID', 'Usuario', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$res = $this->gruposusuarios->eliminar_usuario(
												$this->input->post('intGrupoUsuarioID'),
												$this->input->post('intUsuarioID')
											);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Usuario no se elimino correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Usuario se elimino correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

	}
 ?>