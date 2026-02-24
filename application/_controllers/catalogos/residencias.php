<?php 
	class residencias extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'residencias';
	      $this->data['formulario'] = 'RESIDENCIAS';
	      $this->bolAcceso = $this->Acceso('residencias');
	      $this->load->model('catalogos/residencias_model','residencias');
	    }

		public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("catalogos/residencias",NULL,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 10; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->residencias->filtro(
				                             $this->input->post('strBusqueda'),
				                             $this->input->post('strPrivada'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['residencias'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => ''
				         );
			$id = $this->input->post('intResidenciaID');
			if(is_numeric($id)){
				$row = $this->residencias->buscar($id);
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
			$id = $this->input->post('intResidenciaID');
			if(is_numeric($id)){
				$res = $this->residencias->eliminar($id);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La Residencia no se pudo eliminar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La Residencia elimino correctamente!</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intPrivadaID', 'Privada', 'required|integer');
			$this->form_validation->set_rules('strCalle', 'Calle', 'required|max_length[60]');
			$this->form_validation->set_rules('strNroCasa', 'Nro. Casa', 'required|max_length[10]');
			$this->form_validation->set_rules('strTelefono1', 'Telefono(1)', 'max_length[14]');
			$this->form_validation->set_rules('strTelefono2', 'Telefono(2)', 'max_length[14]');
			$this->form_validation->set_rules('strInterfon', 'Interfón', 'max_length[5]');
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
				if(is_numeric($this->input->post('intResidenciaID'))){
					$res=$this->residencias->modificar(
						$this->input->post('intResidenciaID'),
						$this->input->post('intPrivadaID'),
						$this->input->post('strNroCasa'),
						$this->input->post('strCalle'),
						$this->input->post('strTelefono1'),
						$this->input->post('strTelefono2'),
						$this->input->post('strInterfon'),
						$this->input->post('strObservaciones'),
						$this->input->post('intEstatusID')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->residencias->guardar(
							$this->input->post('intPrivadaID'),
							$this->input->post('strNroCasa'),
							$this->input->post('strCalle'),
							$this->input->post('strTelefono1'),
							$this->input->post('strTelefono2'),
							$this->input->post('strInterfon'),
							$this->input->post('strObservaciones'),
							$this->input->post('intEstatusID')
							);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Empleado no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Empleado se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function cambiar_estado(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intResidenciaID', 'Empleado', 'required|integer');
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
				else if($intEstatusID == 2)
					$intEstatusID = 3;
				else
					$intEstatusID = 1;
				$res = $this->residencias->cambiar_estado(
						 $this->input->post('intResidenciaID'),
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
		
		public function autocomplete($intPrivadaID = 0){
			$q = trim(strtolower($_POST['q']));
			if(is_numeric($intPrivadaID) && $intPrivadaID > 0){
			    if(isset($_POST['q']) && isset($_POST['limit'])){
				 	$limit = $_POST['limit'];
				 	if(strlen($q) > 0){
						if(is_numeric($q[0]))
							$this->output->set_content_type('application/json')->set_output(json_encode($this->residencias->autocompleteNroCasa($q,$limit,$intPrivadaID)));
						else
							$this->output->set_content_type('application/json')->set_output(json_encode($this->residencias->autocompleteResidente($q,$limit,$intPrivadaID)));
							//return $this->residencias->autocompleteResidente($q,$limit,$intPrivadaID);
					} 
			    }
			}
			else{
				$res[0]["value"] = "Seleccione la Privada!!!";
				$res[0]["data"] = "";
 				$this->output->set_content_type('application/json')->set_output(json_encode($res));
			}
		}

		public function info(){
				$this->output->set_content_type('application/json')->set_output(
					json_encode($this->residencias->info($this->input->post('intResidenciaID'))));
		}
	}
 ?>