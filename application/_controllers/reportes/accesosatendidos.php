<?php 
class AccesosAtendidos extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;
		VAR $consecutivo_id = 1;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'accesosatendidos';
	      $this->data['formulario'] = 'ACCESOS ATENDIDOS';
	      $this->bolAcceso = $this->Acceso('Accesos Atendidos');
	      //$this->load->model('catalogos/registrosgenerales_model','registrosgenerales');
	    }

		public function index(){
			$this->data['fecha'] = substr($this->session->userdata('fecha'),8,2)."-".substr($this->session->userdata('fecha'),5,2)."-".substr($this->session->userdata('fecha'),0,4);
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("reportes/accesosatendidos",$this->data,TRUE);
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
			$errorult = $this->registrosgenerales->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $errorult['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $errorult['registrosgenerales'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('strRegistroGeneralID');
			if(strlen($id) <= 8){
				$row = $this->registrosgenerales->buscar($id);
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
			$id = $this->input->post('strRegistrOGeneralID');
			if(is_numeric($id)){
				$error = $this->registrosgenerales->eliminar($id);
				if($error) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $error,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La Registro no se pudo eliminar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $error,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La Registro se elimino correctamente!</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			//if($this->input->post('strRegistrOGeneralID') == "") 
			//	$this->form_validation->set_rules('strDescripcion', 'Descripcion', 'required|max_length[80]|is_unique[registrosgenerales.descripcion]');
			//else
			//	$this->form_validation->set_rules('strDescripcion', 'Descripcion', 'required|max_length[80]');
			$this->form_validation->set_rules('strApePaterno', 'Apellido Paterno', 'required|max_length[50]');
			$this->form_validation->set_rules('strApeMaterno', 'Apellido Materno', 'max_length[50]');
			$this->form_validation->set_rules('strNombre', 'Nombre', 'required|max_length[50]');
			$this->form_validation->set_rules('strTelefono', 'Telefono', 'max_length[14]');
			$this->form_validation->set_rules('strCelular', 'Celular', 'max_length[14]');
			$this->form_validation->set_rules('strEmail', 'E-Mail', 'max_length[100]|valid_email');
			$this->form_validation->set_rules('strObservaciones', 'Observaciones', '');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');

			$id = ""; //variable para mandar el registro id

			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if($this->input->post('strRegistroGeneralID')){
					$this->load->model('catalogos/bitacora_model','bitacora');
					$error=$this->registrosgenerales->modificar(
						$this->input->post('strRegistroGeneralID'),
						$this->input->post('strApePaterno'),
						$this->input->post('strApeMaterno'),
						$this->input->post('strNombre'),
						$this->input->post('strTelefono'),
						$this->input->post('strCelular'),
						$this->input->post('strEmail'),
						$this->input->post('strObservaciones'),
						$this->input->post('intEstatusID')
					);	
					$id = $this->input->post('strRegistroGeneralID');
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
						$error=$this->registrosgenerales->guardar(
							$id,
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
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Registro no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'id' => $id,
								  'tipo' => $error,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Registro se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

	/*	public function cambiar_estado(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('strRegistrOGeneralID', 'Privada', 'required|integer');
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
				$error = $this->registrosgenerales->cambiar_estado(
						 $this->input->post('strRegistrOGeneralID'),
						 $intEstatusID
					   );
				if($error) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $error,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Estado no se pudo cambiar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $error,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Estado se cambio correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}  */
		
		public function autocomplete(){
		    if(isset($_POST['q']) && isset($_POST['limit'])){
			 	$q = strtolower($_POST['q']);
			 	$limit = $_POST['limit'];
		      	$this->output->set_content_type('application/json')->set_output(json_encode($this->registrosgenerales->autocomplete($q,$limit)));
		    }
		}
	}
?>