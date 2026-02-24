<?php 
	class GastosAutorizar extends MY_controller
	{
		//var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'gastosAutorizar';
	      $this->data['formulario'] = 'AUTORIZAR GASTOS';
	      //$this->bolAcceso = $this->Acceso('Gastos');
	      $this->load->model('procesos/gastos_model','gastosAutorizar');
	    }

		public function index(){
			//if($this->bolAcceso)
			//	$this->data['contenido'] = $this->load->view("procesos/gastos",NULL,TRUE);
			//else
				$this->data['contenido'] = $this->load->view('procesos/gastosAutorizar',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 10; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->gastosAutorizar->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['gastosAutorizar'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function paginacionNoAutorizados(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 10; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->gastosAutorizar->filtroNoAutorizados(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['gastosAutorizar'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intGastoID');
			if(is_numeric($id)){
				$row = $this->gastosAutorizar->buscar($id);
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
			if($this->input->post('intGastoID') == "") 
				$this->form_validation->set_rules('intTipoGastoID', 'Tipo Gasto', 'required|numeric');
			else
			$this->form_validation->set_rules('intTipoGastoID', 'Tipo Gasto', 'required|numeric');
			$this->form_validation->set_rules('intPrivadaID', 'Privada', 'required|numeric');			
			$this->form_validation->set_rules('strDescripcion', 'Descripcion', 'required|max_length[100]');
			$this->form_validation->set_rules('strComprobante', 'Comprobante', 'required|max_length[50]');			
			$this->form_validation->set_rules('dblTotal', 'Total', 'required|numeric');
			$this->form_validation->set_rules('intTipoPagoID', 'Tipo Pago', 'required|numeric');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intGastoID'))){
					$res=$this->gastosAutorizar->modificar(
						$this->input->post('intGastoID'),
						$this->input->post('intTipoGastoID'),
						$this->input->post('intPrivadaID'),
						$this->input->post('strDescripcion'),
						$this->input->post('strComprobante'),						
						$this->input->post('dblTotal'),
						$this->input->post('intTipoPagoID')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->gastosAutorizar->guardar(
							$this->input->post('intTipoGastoID'),
							$this->input->post('intPrivadaID'),
							$this->input->post('strDescripcion'),
							$this->input->post('strComprobante'),							
							$this->input->post('dblTotal'),
							$this->input->post('intTipoPagoID')
						);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Gasto se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Gasto se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function pedirAutorizacion(){ 
			$this->load->library('form_validation');
			if($this->input->post('intGastoID') == "") 
				$this->form_validation->set_rules('intTipoGastoID', 'Tipo Gasto', 'required|numeric');
			else
			$this->form_validation->set_rules('intTipoGastoID', 'Tipo Gasto', 'required|numeric');
			$this->form_validation->set_rules('intPrivadaID', 'Privada', 'required|numeric');			
			$this->form_validation->set_rules('strDescripcion', 'Descripcion', 'required|max_length[100]');		
			$this->form_validation->set_rules('dblTotal', 'Total', 'required|numeric');
			$this->form_validation->set_rules('intTipoPagoID', 'Tipo Pago', 'required|numeric');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intGastoID'))){
					$res=$this->gastosAutorizar->modificar(
						$this->input->post('intGastoID'),
						$this->input->post('intTipoGastoID'),
						$this->input->post('intPrivadaID'),
						$this->input->post('strDescripcion'),
						$this->input->post('strComprobante'),						
						$this->input->post('dblTotal'),
						$this->input->post('intTipoPagoID')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->gastosAutorizar->guardar(
							$this->input->post('intTipoGastoID'),
							$this->input->post('intPrivadaID'),
							$this->input->post('strDescripcion'),
							$this->input->post('strComprobante'),							
							$this->input->post('dblTotal'),
							$this->input->post('intTipoPagoID')
						);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La solicitud no se ha podido enviar, vuelva a intentarlo.</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La solicitud de gasto ha sido enviada correctamente.</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function autorizar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intGastoID');
			if(is_numeric($id)) {
					$res = $this->gastosAutorizar->autorizar($id);
					if($res) 
						$arr = array( 'resultado' => 0,
									  'tipo' => $res,
									  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Gasto no se pudo autorizar, vuelva a intentarlo!</div>');
					else 
						$arr = array( 'resultado' => 1,
									  'tipo' => $res,
							          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Gasto se autorizó correctamente!</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function opciones(){
			$arr['gastosAutorizar'] = $this->gastosAutorizar->gastosAutorizar_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
	}
 ?>