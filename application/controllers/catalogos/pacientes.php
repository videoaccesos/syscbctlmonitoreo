<?php 
	class Pacientes extends MY_controller
	{
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'pacientes';
	      $this->data['formulario'] = 'PACIENTES';
	      $this->load->model('catalogos/pacientes_model','pacientes');
	    }

		public function index(){
				$this->data['contenido'] = $this->load->view('catalogos/pacientes',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->pacientes->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['pacientes'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intPacienteID');
			if(is_numeric($id)){
				$row = $this->pacientes->buscar($id);
				if($row){
					$arr['row'] = $row;
				}else {
					$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontró ningún registro</div>';	
				}	
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parámetro no válido</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function eliminar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intPacienteID');
			if(is_numeric($id)){
				$res = $this->pacientes->eliminar($id);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El paciente no se pudo eliminar, vuelva a intentarlo</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El paciente se eliminó correctamente</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parámetro no válido</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			if($this->input->post('intPacienteID') == "") 
				$this->form_validation->set_rules('strNombre', 'Nombre', 'required|max_length[50]');
			$this->form_validation->set_rules('strApellidoPaterno', 'ApellidoPaterno', 'required|max_length[50]');
			$this->form_validation->set_rules('strApellidoMaterno', 'ApellidoMaterno', 'required|max_length[50]');
			$this->form_validation->set_rules('strTelefono', 'Telefono', 'required|max_length[50]');
			$this->form_validation->set_rules('strCorreo', 'Correo', 'required|max_length[50]');
			$this->form_validation->set_rules('dtFechaNacimiento', 'Fecha Nacimiento', 'required|max_length[50]');
			$this->form_validation->set_rules('intEdad', 'Edad', 'required|integer');
			$this->form_validation->set_rules('intSexoID', 'TipoPago', 'required|integer');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intPacienteID'))){
					$res=$this->pacientes->modificar(
						$this->input->post('intPacienteID'),
						$this->input->post('strNombre'),
						$this->input->post('strApellidoPaterno'),
						$this->input->post('strApellidoMaterno'),
						$this->input->post('strDireccion'),
						$this->input->post('strTelefono'),
						$this->input->post('strCorreo'),
						$this->input->post('dtFechaNacimiento'),
						$this->input->post('intEdad'),
						$this->input->post('intSexoID'),
						$this->input->post('intEstatusID')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->pacientes->guardar(
							$this->input->post('strNombre'),
							$this->input->post('strApellidoPaterno'),
							$this->input->post('strApellidoMaterno'),
							$this->input->post('strDireccion'),
							$this->input->post('strTelefono'),
							$this->input->post('strCorreo'),
							$this->input->post('dtFechaNacimiento'),
							$this->input->post('intEdad'),
							$this->input->post('intSexoID'),
							$this->input->post('intEstatusID')
						);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El paciente no se puede guardar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El paciente se guardó correctamente</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function cambiar_estado(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intPacienteID', 'Paciente', 'required|integer');
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
				$res = $this->pacientes->cambiar_estado(
						 $this->input->post('intPacienteID'),
						 $intEstatusID
					   );
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El estado no se pudo cambiar, vuelva a intentarlo</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El estado se cambió correctamente</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function opciones(){
			$arr['pacientes'] = $this->pacientes->pacientes_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

public function autocomplete(){
		    if(isset($_POST['q']) && isset($_POST['limit'])){
			 	$q = strtolower($_POST['q']);
			 	$limit = $_POST['limit'];
		      	$this->output->set_content_type('application/json')->set_output(json_encode($this->pacientes->autocomplete($q,$limit)));
		    }
		}
		
	}
 ?>