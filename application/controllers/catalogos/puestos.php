<?php 
	class Puestos extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'puestos';
	      $this->data['formulario'] = 'PUESTOS';
	      $this->bolAcceso = $this->Acceso('Puestos');
	      $this->load->model('catalogos/puestos_model','puestos');
	    }

		public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("catalogos/puestos",NULL,TRUE);
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
			$result = $this->puestos->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['puestos'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intPuestoID');
			if(is_numeric($id)){
				$row = $this->puestos->buscar($id);
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
			$id = $this->input->post('intPuestoID');
			if(is_numeric($id)) { 
				if($id != 1 && $id != 6)//Puesto de Control 1.-Operador 6.-Tecnico
				{
					$res = $this->puestos->eliminar($id);
					if($res) 
						$arr = array( 'resultado' => 0,
									  'tipo' => $res,
									  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Puesto no se pudo eliminar, vuelva a intentarlo!</div>');
					else 
						$arr = array( 'resultado' => 1,
									  'tipo' => $res,
							          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Puesto se elimino correctamente!</div>');
				}
				else
					$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Puesto no se pudo eliminar, es necesario para el Sistema!</div>';
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			if($this->input->post('intPuestoID') == "") 
				$this->form_validation->set_rules('strDescripcion', 'Descripcion', 'required|max_length[50]|is_unique[puestos.descripcion]');
			else
				$this->form_validation->set_rules('strDescripcion', 'Descripcion', 'required|max_length[50]');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intPuestoID'))){
					$res=$this->puestos->modificar(
						$this->input->post('intPuestoID'),
						$this->input->post('strDescripcion'),
						$this->input->post('intEstatusID')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->puestos->guardar(
							$this->input->post('strDescripcion'),
							$this->input->post('intEstatusID')
						);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Puesto no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Puesto se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function cambiar_estado(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intPuestoID', 'Puesto', 'required|integer');
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
				$res = $this->puestos->cambiar_estado(
						 $this->input->post('intPuestoID'),
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
		
		public function opciones(){
			$arr['puestos'] = $this->puestos->puestos_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
		public function administradores(){
			$arr['administradores'] = $this->puestos->administradores_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
		public function encargadosadmon(){
			$arr['encargadosadmon'] = $this->puestos->encargadosadmon_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
		public function supervisores(){
			$arr['supervisores'] = $this->puestos->supervisores_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
	}
 ?>