<?php 
	class Residencias_Residentes extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;
		var $consecutivo_id = 2;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'residencias';
	      $this->data['formulario'] = 'RESIDENTES';
	      $this->bolAcceso = $this->Acceso('residencias');
	      $this->load->model('catalogos/residencias_residentes_model','residentes');
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
			$result = $this->residentes->filtro_separado(
											 $this->input->post('intResidenciaID'),
				                             $this->input->post('strApePaterno'),
				                             $this->input->post('strApeMaterno'),
				                             $this->input->post('strNombre'),
				                             $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['residentes'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function paginacion_asignacion_tarjetas(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 10; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->residentes->filtro_asignacion_tarjetas(
											 $this->input->post('strCodigo'),
											 $this->input->post('strResidente'),
				                             $this->input->post('strNumCalle'),
				                             $this->input->post('intPrivadaID'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['residentes'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => ''
				         );
			$id = $this->input->post('strResidenteID');
			if(strlen($id) <= 8){
				$row = $this->residentes->buscar($id);
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

		public function editar_asignacion_tarjetas(){
			$arr = array('row' => null,
				         'mensajes' => ''
				         );
			$id = $this->input->post('strResidenciaID');
			if(strlen($id) <= 8){
				$row = $this->residentes->buscar_asignacion_tarjetas($id);
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
			$id = $this->input->post('strResidenteID');
			if(strlen($id) <= 8){
				$res = $this->residentes->eliminar($id);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Residente no se pudo eliminar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Residente se elimino correctamente!</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('strResidenteID', 'Residente', 'max_length[8]');	
			$this->form_validation->set_rules('intResidenciaID', 'Residencia', 'required|integer');
			$this->form_validation->set_rules('strApePaterno', 'Apellido Paterno', 'max_length[50]');
			$this->form_validation->set_rules('strApeMaterno', 'Apellido Materno', 'max_length[50]');
			$this->form_validation->set_rules('strNombre', 'Nombre', 'required|max_length[50]');
			$this->form_validation->set_rules('strCelular', 'Celular', 'max_length[14]');
			$this->form_validation->set_rules('intNotificar', 'Notificación', 'required|integer');
			$this->form_validation->set_rules('strEmail', 'Email', 'max_length[100]|valid_email');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if($this->input->post('strResidenteID') != ""){
					$error=$this->residentes->modificar(
						$this->input->post('strResidenteID'),
						$this->input->post('intResidenciaID'),
						$this->input->post('strApePaterno'),
						$this->input->post('strApeMaterno'),
						$this->input->post('strNombre'),
						$this->input->post('strCelular'),
						$this->input->post('strEmail'),
						$this->input->post('intNotificar'),
						1  //EstatusID
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
						$error=$this->residentes->guardar(
								$id,
								$this->input->post('intResidenciaID'),
								$this->input->post('strApePaterno'),
								$this->input->post('strApeMaterno'),
								$this->input->post('strNombre'),
								$this->input->post('strCelular'),
								$this->input->post('strEmail'),
								$this->input->post('intNotificar'),
								1 //EstatusID
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
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Residente no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $error,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Residente se guardo correctamente!</div>');
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

		//Residentes por Privada, se utiliza en Registros de Accesos.
		public function autocomplete($intPrivadaID = 0){
			if(is_numeric($intPrivadaID) && $intPrivadaID > 0){
			    if(isset($_POST['q']) && isset($_POST['limit'])){
				 	$q = strtolower($_POST['q']);
				 	$limit = $_POST['limit'];
				 	if(strlen(trim($q)) > 0){
						if(is_numeric($q[0]))
							$this->output->set_content_type('application/json')->set_output(json_encode($this->residencias->autocompleteNroCasa($q,$limit,$intPrivadaID)));
						else
							$this->output->set_content_type('application/json')->set_output(json_encode($this->residencias->autocompleteResidente($q,$limit,$intPrivadaID)));
					} 
			    }
			}
			else{
				$res[0]["value"] = "Seleccione la Privada!!!";
				$res[0]["data"] = "";
 				$this->output->set_content_type('application/json')->set_output(json_encode($res));
			}
		}

		//Residentes por Residencia, se utiliza en Asignacion de Tarjetas.
		public function autocomplete_residencia($intResidenciaID = 0){
			if(is_numeric($intResidenciaID) && $intResidenciaID > 0){
			    if(isset($_POST['q']) && isset($_POST['limit'])){
				 	$q = strtolower($_POST['q']);
				 	$limit = $_POST['limit'];
				 	if(strlen(trim($q)) > 0){
						$this->output->set_content_type('application/json')->set_output(json_encode($this->residentes->autocomplete_residencia($q,$limit,$intResidenciaID)));
					} 
			    }
			}
			else{
				$res[0]["value"] = "La Residencia no fue asignada!!!";
				$res[0]["data"] = "";
 				$this->output->set_content_type('application/json')->set_output(json_encode($res));
			}
		}
	}
 ?>