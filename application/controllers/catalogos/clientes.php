<?php 
	class Clientes extends MY_controller
	{
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'clientes';
	      $this->data['formulario'] = 'CLIENTES';
	      $this->load->model('catalogos/clientes_model','clientes');
	    }

		public function index(){
				$this->data['contenido'] = $this->load->view('catalogos/clientes',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->clientes->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['clientes'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intClienteID');
			if(is_numeric($id)){
				$row = $this->clientes->buscar($id);
				if($row){
					$arr['row'] = $row;
				}else {
					$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontró ningún registro</div>';	
				}	
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parámetro no válido</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function eliminar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intClienteID');
			if(is_numeric($id)){
				$res = $this->clientes->eliminar($id);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El cliente no se pudo eliminar, vuelva a intentarlo</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El cliente se eliminó correctamente</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parámetro no válido</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			if($this->input->post('intClienteID') == "") 
				$this->form_validation->set_rules('strNombre', 'Nombre', 'required|max_length[50]');
			$this->form_validation->set_rules('strApellidoPaterno', 'ApellidoPaterno', 'required|max_length[50]');
			$this->form_validation->set_rules('strApellidoMaterno', 'ApellidoMaterno', 'required|max_length[50]');
			$this->form_validation->set_rules('strRFC', 'RFC', 'required|max_length[50]');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intClienteID'))){
					$res=$this->clientes->modificar(
						$this->input->post('intClienteID'),
						$this->input->post('strNombre'),
						$this->input->post('strApellidoPaterno'),
						$this->input->post('strApellidoMaterno'),
						$this->input->post('strRFC'),
						$this->input->post('intEstatusID')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->clientes->guardar(
							$this->input->post('strNombre'),
							$this->input->post('strApellidoPaterno'),
							$this->input->post('strApellidoMaterno'),
							$this->input->post('strRFC'),
							$this->input->post('intEstatusID')
						);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El cliente no se puede guardar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El cliente se guardó correctamente</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function cambiar_estado(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intClienteID', 'Cliente', 'required|integer');
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
				$res = $this->clientes->cambiar_estado(
						 $this->input->post('intClienteID'),
						 $intEstatusID
					   );
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El estado no se pudo cambiar, vuelva a intentarlo</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El estado se cambió correctamente</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function opciones(){
			$arr['clientes'] = $this->clientes->clientes_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

public function autocomplete(){
		    if(isset($_POST['q']) && isset($_POST['limit'])){
			 	$q = strtolower($_POST['q']);
			 	$limit = $_POST['limit'];
		      	$this->output->set_content_type('application/json')->set_output(json_encode($this->clientes->autocomplete($q,$limit)));
		    }
		}
		
	}
 ?>