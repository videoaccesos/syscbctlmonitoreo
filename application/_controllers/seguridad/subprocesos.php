<?php
	class Subprocesos extends MY_Controller
	{
		var $strRuta = 'subprocesos';
		var $bolAcceso = FALSE;
		var $data = null;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'subprocesos';
	      $this->data['formulario'] = 'subprocesos ';
	      $this->bolAcceso = $this->Acceso('Subprocesos');
	      $this->load->model('seguridad/subprocesos_model','subprocesos');
	    }

	    public function index()
		{
			$this->data['contenido'] = $this->load->view('sistema/stop.php','',TRUE);
			$this->load->view('sistema/sistema.php',$this->data);
		}
	    
	    public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->subprocesos->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['subprocesos'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intSubProcesoID');
			if(is_numeric($id)){
				$row = $this->subprocesos->buscar($id);
				if($row){
					$arr['row'] = $row;
				}else {
					$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontro ningun Subproceso!</div>';	
				}	
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			if($this->input->post('intSubprocesoID') == "") 
				$this->form_validation->set_rules('strNombre', 'Nombre', 'required|max_length[30]');
			else
				$this->form_validation->set_rules('strNombre', 'Nombre', 'required|max_length[30]');
			$this->form_validation->set_rules('intProcesoID', 'Proceso', 'required|integer');
			$this->form_validation->set_rules('strFuncion', 'Funcion', 'required|max_length[60]');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intSubprocesoID'))){
					$res=$this->subprocesos->modificar(
						$this->input->post('intSubprocesoID'),
						$this->input->post('strNombre'),
						$this->input->post('strFuncion')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->subprocesos->guardar(
							$this->input->post('intProcesoID'),
							$this->input->post('strNombre'),
							$this->input->post('strFuncion')
						);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Subproceso no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Subproceso se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function eliminar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intSubProcesoID');
			if(is_numeric($id)){
				$res = $this->subprocesos->eliminar($id);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Subproceso no se pudo eliminar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Subproceso se elimino correctamente!</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function subprocesos_proceso(){
			$arr = array('subprocesos' => null);
			$id = $this->input->post('intProcesoID');
			if(is_numeric($id)){
				$arr['rows'] = $this->subprocesos->buscar_subprocesos($id);
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));	
		}
	}
?>