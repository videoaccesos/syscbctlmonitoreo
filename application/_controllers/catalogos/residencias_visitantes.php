<?php 
	class Residencias_Visitantes extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;
		var $consecutivo_id = 3;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'residencias';
	      $this->data['formulario'] = 'VISITANTES';
	      $this->bolAcceso = $this->Acceso('residencias');
	      $this->load->model('catalogos/residencias_visitantes_model','visitantes');
	    }

		public function index(){
			$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 5; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->visitantes->filtro_separado(
											 $this->input->post('intResidenciaID'),
				                             $this->input->post('strApePaterno'),
				                             $this->input->post('strApeMaterno'),
				                             $this->input->post('strNombre'),
				                             $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['visitantes'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => ''
				         );
			$id = $this->input->post('strVisitanteID');
			if(strlen($id) <= 8){
				$row = $this->visitantes->buscar($id);
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
			$id = $this->input->post('strVisitanteID');
			if(strlen($id) <= 8){
				$res = $this->visitantes->eliminar($id);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Visitante no se pudo eliminar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Visitante se elimino correctamente!</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('strVisitanteID', 'Visitante', 'max_length[8]');	
			$this->form_validation->set_rules('intResidenciaID', 'Residencia', 'required|integer');
			$this->form_validation->set_rules('strApePaterno', 'Apellido Paterno', 'max_length[50]');
			$this->form_validation->set_rules('strApeMaterno', 'Apellido Materno', 'max_length[50]');
			$this->form_validation->set_rules('strNombre', 'Nombre', 'required|max_length[50]');
			$this->form_validation->set_rules('strTelefono', 'Telefono', 'max_length[14]');
			$this->form_validation->set_rules('strCelular', 'Celular', 'max_length[14]');
			$this->form_validation->set_rules('strEmail', 'Email', 'max_length[100]|valid_email');
			$this->form_validation->set_rules('strObservaciones', 'Observaciones', '');
			$this->form_validation->set_rules('intEstatusID', 'Estatus', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if($this->input->post('strVisitanteID') != ""){
					$this->load->model('catalogos/bitacora_model','bitacora');
					$error=$this->visitantes->modificar(
						$this->input->post('strVisitanteID'),
						$this->input->post('intResidenciaID'),
						$this->input->post('strApePaterno'),
						$this->input->post('strApeMaterno'),
						$this->input->post('strNombre'),
						$this->input->post('strTelefono'),
						$this->input->post('strCelular'),
						$this->input->post('strEmail'),
						$this->input->post('strObservaciones'),
						$this->input->post('intEstatusID')
					);	
					$intTipo=1;
				}
				else{
					$this->db->trans_start();
					$id = $this->GenerarID($this->consecutivo_id);
					if($id == "0"){
						$this->db->trans_rollback();
						$error = "No se pudo generar el ConsecutivoID!!!"; // se asigna 1 para envie error.
					}
					else{
						$error=$this->visitantes->guardar(
								$id,
								$this->input->post('intResidenciaID'),
								$this->input->post('strApePaterno'),
								$this->input->post('strApeMaterno'),
								$this->input->post('strNombre'),
								$this->input->post('strTelefono'),
								$this->input->post('strCelular'),
								$this->input->post('strEmail'),
								$this->input->post('strObservaciones'),
								$this->input->post('intEstatusID')
								);
						if($error)
							$this->db->trans_rollback();
						else
							$this->db->trans_commit();

					}
				}

				if($error) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $error,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Visitante no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $error,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Visitante se guardo correctamente!</div>');
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
			if(is_numeric($intPrivadaID) && $intPrivadaID > 0){
			    if(isset($_POST['q']) && isset($_POST['limit'])){
				 	$q = strtolower($_POST['q']);
				 	$limit = $_POST['limit'];
				 	if(strlen(trim($q)) > 0){
						if(is_numeric($q[0]))
							$this->output->set_content_type('application/json')->set_output(json_encode($this->residencias->autocompleteNroCasa($q,$limit,$intPrivadaID)));
						else
							$this->output->set_content_type('application/json')->set_output(json_encode($this->residencias->autocompleteVisitante($q,$limit,$intPrivadaID)));
					} 
			    }
			}
			else{
				$res[0]["value"] = "Seleccione la Privada!!!";
				$res[0]["data"] = "";
 				$this->output->set_content_type('application/json')->set_output(json_encode($res));
			}
		}
	}
 ?>