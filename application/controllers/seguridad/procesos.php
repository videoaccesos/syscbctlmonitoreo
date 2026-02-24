<?php
	class Procesos extends MY_Controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'procesos';
	      $this->data['formulario'] = 'PROCESOS ';
	      $this->bolAcceso = $this->Acceso('Procesos');
	      $this->load->model('seguridad/procesos_model','procesos');
	    }

		public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("seguridad/procesos",NULL,TRUE);
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
			$result = $this->procesos->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['procesos'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function padres(){
			$arr['padres'] = $this->procesos->buscar_padres();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function hijos(){
			$arr['rows'] = $this->procesos->buscar_hijos();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));	
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intProcesoID');
			if(is_numeric($id)){
				$row = $this->procesos->buscar($id);
				if($row){
					$arr['row'] = $row;
				}else {
					$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontro ningun Proceso!</div>';	
				}	
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			if($this->input->post('intProcesoID') == "") 
				$this->form_validation->set_rules('strNombre', 'Nombre', 'required|min_length[3]|max_length[30]|is_unique[procesos.nombre]');
			else
				$this->form_validation->set_rules('strNombre', 'Nombre', 'required|min_length[3]|max_length[30]');
			$this->form_validation->set_rules('strRuta', 'Ruta', 'required');
			$this->form_validation->set_rules('intProcesoPadreID', 'Proceso Padre', 'required|integer');

			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intProcesoID'))){
					$res=$this->procesos->modificar(
						$this->input->post('intProcesoID'),
						$this->input->post('strNombre'),
						$this->input->post('strRuta'),
						$this->input->post('intProcesoPadreID')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->procesos->guardar(
							$this->input->post('strNombre'),
							$this->input->post('strRuta'),
							$this->input->post('intProcesoPadreID')
						);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Proceso no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Proceso se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function eliminar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intProcesoID');
			if(is_numeric($id)){
				$res = $this->procesos->eliminar($id);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Proceso no se pudo eliminar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Proceso se elimino correctamente!</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
	}
?>