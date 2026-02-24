<?php 
	class OrdenesServicio extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;
		var $strProceso = "Ordenes de Servicio";

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = $this->strProceso;
	      $this->data['formulario'] = 'ORDENES DE SERVICIOS';
	      $this->bolAcceso = $this->Acceso($this->strProceso);
	      $this->load->model('procesos/ordenesservicio_model','ordenes');
	    }

		public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("procesos/ordenesservicio",$this->data,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function buscar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intRegistroAccesoID');
			if(is_numeric($id)){
				$row = $this->supervisionllamadas->buscar($id);
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

		public function guardar(){ 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intTipo', 'Operacion', 'required|integer');
			$this->form_validation->set_rules('intRegistroAccesoID', 'Folio', 'required|integer');
			$this->form_validation->set_rules('intSupervisorID', 'Supervisor', 'required|integer');
			$this->form_validation->set_rules('strFecha', 'Fecha', 'required');
			$this->form_validation->set_rules('intSaludo', 'Saludo', 'required|integer');
			$this->form_validation->set_rules('intIdentificoEmpresa', 'Identifico Empresa', 'required|integer');
			$this->form_validation->set_rules('intIdentificoOperador', 'Identifico Operador', 'required|integer');
			$this->form_validation->set_rules('intAmable', 'Fue Amable', 'required|integer');
			$this->form_validation->set_rules('intGracias', 'Dijo Gracias', 'required|integer');
			$this->form_validation->set_rules('intDemanda', 'Demanda Cumplida', 'required|integer');
			$this->form_validation->set_rules('intAsunto', 'Asunto', 'required|integer');
			$this->form_validation->set_rules('strTiempoGestion', 'Tiempo de Gestion', 'required|max_length[8]');
			$this->form_validation->set_rules('strObservaciones', 'Observaciones', '');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				if($this->input->post('intTipo') == 0 ){ //Insertar
					$res=$this->supervisionllamadas->guardar(
							$this->input->post('intRegistroAccesoID'),
							$this->input->post('intSupervisorID'),
							$this->input->post('strFecha'),
							$this->input->post('intSaludo'),
							$this->input->post('intIdentificoEmpresa'),
							$this->input->post('intIdentificoOperador'),
							$this->input->post('intAmable'),
							$this->input->post('intGracias'),
							$this->input->post('intDemanda'),
							$this->input->post('intAsunto'),
							$this->input->post('strTiempoGestion'),
							$this->input->post('strObservaciones')
						);
				}
				else{ //Modificar
					$res=$this->supervisionllamadas->modificar(
							$this->input->post('intRegistroAccesoID'),
							$this->input->post('intSupervisorID'),
							$this->input->post('strFecha'),
							$this->input->post('intSaludo'),
							$this->input->post('intIdentificoEmpresa'),
							$this->input->post('intIdentificoOperador'),
							$this->input->post('intAmable'),
							$this->input->post('intGracias'),
							$this->input->post('intDemanda'),
							$this->input->post('intAsunto'),
							$this->input->post('strTiempoGestion'),
							$this->input->post('strObservaciones')
						);
				}
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Registro no se guardo correctamente, vuelva a intentarlo!</div>');
				else {
					//$this->enviar_notificaciones($this->input->post('intRegistroAccesoID'));
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Registro se guardo correctamente!</div>');

				}
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		
	}
 ?>