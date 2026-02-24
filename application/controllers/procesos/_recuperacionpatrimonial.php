<?php 
	class RecuperacionPatrimonial extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;
		var $strProceso = "Recuperacion Patrimonial";

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = $this->strProceso;
	      $this->data['formulario'] = 'RECUPERACIÓN PATRIMONIAL';
	      $this->bolAcceso = $this->Acceso($this->strProceso);
	      $this->load->model('procesos/recuperacionpatrimonial_Model','recuperacion_patrimonial');
	    }

		public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("procesos/recuperacionpatrimonial",NULL,TRUE);
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
			$result = $this->recuperacion_patrimonial->filtro(
											 $this->input->post('strResponsable'),
				                             $this->input->post('strFechaInicio'),
				                             $this->input->post('strFechaFinal'),
				                             $this->input->post('intEstatusID'),
				                             $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['recuperaciones'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function paginacion_seguimiento(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->recuperacion_patrimonial->filtro_seguimiento(
				                             $this->input->post('intRecuperacionID'),
				                             $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['seguimientos'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => ''
				         );
			$id = $this->input->post('intRecuperacionID');
			$folio = $this->RestableceFolio($this->strProceso, $this->input->post('strFolio'));
			if($id == "")
				$row = $this->recuperacion_patrimonial->buscar($folio, 2); //busqueda por folio
			else	
				$row = $this->recuperacion_patrimonial->buscar($id);

			if($row){
				$arr['row'] = $row;
			}else {
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontro ningun Registro!</div>';	
			}	
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar() { 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('strFecha', 'Fecha', 'max_length[16]');	
			$this->form_validation->set_rules('intEmpleadoID', 'Empleado', 'required|integer');
			$this->form_validation->set_rules('intPrivadaID', 'Privada', 'required|integer');
			//$this->form_validation->set_rules('intOrdenServicioID', 'Orden de Servicio', 'integer');
			$this->form_validation->set_rules('strRelatoHechos', 'Relato de los Hechos', 'required');
			$this->form_validation->set_rules('strResponsable', 'Nombre del Responsable', 'required|max_length[80]');
			$this->form_validation->set_rules('strVehiculoPlacas', 'Placas del Vehiculo', 'required|max_length[20]');
			$this->form_validation->set_rules('strFechaAviso', 'Fecha de Aviso', 'max_length[16]');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				if($this->input->post('intRecuperacionID') != ""){
					$error=$this->recuperacion_patrimonial->modificar(
						$this->input->post('intRecuperacionID'),
						$this->input->post('strFecha'),
						$this->input->post('intEmpleadoID'),
						$this->input->post('intPrivadaID'),
						$this->input->post('intOrdenServicioID'),
						$this->input->post('strRelatoHechos'),
						$this->input->post('strTipoDano'),
						$this->input->post('strResponsable'),
						$this->input->post('strResponsableDomicilio'),
						$this->input->post('strResponsableTelefono'),
						$this->input->post('strResponsableCelular'),
						$this->input->post('strResponsableRelacion'),
						$this->input->post('strVehiculoPlacas'),
						$this->input->post('strVehiculoModelo'),
						$this->input->post('strVehiculoColor'),
						$this->input->post('strVehiculoMarca'),
						$this->input->post('bolSeguro'),
						$this->input->post('strSeguro'),
						$this->input->post('bolTestigos'),
						$this->input->post('strTestigos'),
						$this->input->post('bolVideos'),
						$this->input->post('strVideos'),
						$this->input->post('bolAvisoAdministrador'),
						$this->input->post('strAvisoAdministradorFecha'),
						$this->input->post('strObservaciones'),
						$this->input->post('intEstatusID')
					);	
				}
				else{
					$this->db->trans_start();
					$strFolio = $this->GenerarFolio($this->strProceso);
					if($strFolio == "0"){
						$this->db->trans_rollback();
						$error = "No se pudo generar el ConsecutivoID!!!"; // se asigna 1 para envie error.
					}
					else{
						$error=$this->recuperacion_patrimonial->guardar(
								$strFolio,
								$this->input->post('strFecha'),
								$this->input->post('intEmpleadoID'),
								$this->input->post('intPrivadaID'),
								$this->input->post('intOrdenServicioID'),
								$this->input->post('strRelatoHechos'),
								$this->input->post('strTipoDano'),
								$this->input->post('strResponsable'),
								$this->input->post('strResponsableDomicilio'),
								$this->input->post('strResponsableTelefono'),
								$this->input->post('strResponsableCelular'),
								$this->input->post('strResponsableRelacion'),
								$this->input->post('strVehiculoPlacas'),
								$this->input->post('strVehiculoModelo'),
								$this->input->post('strVehiculoColor'),
								$this->input->post('strVehiculoMarca'),
								$this->input->post('bolSeguro'),
								$this->input->post('strSeguro'),
								$this->input->post('bolTestigos'),
								$this->input->post('strTestigos'),
								$this->input->post('bolVideos'),
								$this->input->post('strVideos'),
								$this->input->post('bolAvisoAdministrador'),
								$this->input->post('strAvisoAdministradorFecha'),
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
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Recuperacion Patrimonial no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $error,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La Recuperacion Patrimonial se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
		public function guardar_seguimiento() { 
			$arr = null;
			$error = 0;
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intRecuperacionID', 'Recuperacion Patrimonial', 'required|integer');	
			$this->form_validation->set_rules('strComentario', 'Comentario', 'trim|required|min_length[3]');	
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$error=$this->recuperacion_patrimonial->guardar_seguimiento(
					$this->input->post('intRecuperacionID'),
					$this->input->post('strComentario')
				);

				if($error) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $error,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Seguimiento no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $error,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Seguimiento se guardo correctamente!</div>');	
			}
				
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
	}
 ?>