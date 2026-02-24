<?php 
	class Privadas extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'privadas';
	      $this->data['formulario'] = 'PRIVADAS';
	      $this->bolAcceso = $this->Acceso('Privadas');
	      $this->load->model('catalogos/privadas_model','privadas');
	    }

		public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("catalogos/privadas",NULL,TRUE);
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
			$result = $this->privadas->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['privadas'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intPrivadaID');
			if(is_numeric($id)){
				$row = $this->privadas->buscar($id);
				if($row){
					$arr['row'] = $row;
				}else {
					$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontro ningun Registro!</div>';	
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
			$id = $this->input->post('intPrivadaID');
			if(is_numeric($id)){
				$res = $this->privadas->eliminar($id);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La Privada no se pudo eliminar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La Privada se elimino correctamente!</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			if($this->input->post('intPrivadaID') == "") 
				$this->form_validation->set_rules('strDescripcion', 'Descripcion', 'required|max_length[80]|is_unique[privadas.descripcion]');
			else
				$this->form_validation->set_rules('strDescripcion', 'Descripcion', 'required|max_length[80]');
			$this->form_validation->set_rules('strApePaterno', 'Apellido Paterno', 'max_length[50]');
			$this->form_validation->set_rules('strApeMaterno', 'Apellido Materno', 'max_length[50]');
			$this->form_validation->set_rules('strNombre', 'Nombre', 'required|max_length[50]');
			$this->form_validation->set_rules('intTipoContactoID', 'Tipo Contacto', 'required|integer');
			$this->form_validation->set_rules('strTelefono', 'Telefono', 'max_length[14]');
			$this->form_validation->set_rules('strCelular', 'Celular', 'max_length[14]'); 
			$this->form_validation->set_rules('strEmail', 'E-Mail', 'max_length[60]|valid_email'); 
			$this->form_validation->set_rules('strHistorial', 'Historial E-Mail', 'max_length[60]|valid_email'); 
			$this->form_validation->set_rules('strObservaciones', 'Observaciones', '');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intPrivadaID'))){
					$res=$this->privadas->modificar(
						$this->input->post('intPrivadaID'),
						$this->input->post('strDescripcion'),
						$this->input->post('strApePaterno'),
						$this->input->post('strApeMaterno'),
						$this->input->post('strNombre'),
						$this->input->post('intTipoContactoID'),
						$this->input->post('strTelefono'),
						$this->input->post('strCelular'),
						$this->input->post('strEmail'),
						$this->input->post('strHistorial'),
						$this->input->post('strObservaciones'),
						$this->input->post('intEstatusID')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->privadas->guardar(
							$this->input->post('strDescripcion'),
							$this->input->post('strApePaterno'),
							$this->input->post('strApeMaterno'),
							$this->input->post('strNombre'),
							$this->input->post('intTipoContactoID'),
							$this->input->post('strTelefono'),
							$this->input->post('strCelular'),
							$this->input->post('strEmail'),
							$this->input->post('strHistorial'),
							$this->input->post('strObservaciones'),
							$this->input->post('intEstatusID')
							);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Privada no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Privada se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function cambiar_estado(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intPrivadaID', 'Privada', 'required|integer');
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
				$res = $this->privadas->cambiar_estado(
						 $this->input->post('intPrivadaID'),
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
		
		public function autocomplete(){
		    if(isset($_POST['q']) && isset($_POST['limit'])){
			 	$q = strtolower($_POST['q']);
			 	$limit = $_POST['limit'];
		      	$this->output->set_content_type('application/json')->set_output(json_encode($this->privadas->autocomplete($q,$limit)));
		    }
		}

		public function opciones(){
			$arr['privadas'] = $this->privadas->privadas_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
	}
 ?>