<?php 
	class Articulos extends MY_controller
	{
		//var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'articulos';
	      $this->data['formulario'] = 'ARTICULOS';
	      //$this->bolAcceso = $this->Acceso('Articulos');
	      $this->load->model('catalogos/articulos_model','articulos');
	    }

		public function index(){
			//if($this->bolAcceso)
			//	$this->data['contenido'] = $this->load->view("catalogos/articulos",NULL,TRUE);
			//else
				$this->data['contenido'] = $this->load->view('catalogos/articulos',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->articulos->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['articulos'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intArticuloID');
			if(is_numeric($id)){
				$row = $this->articulos->buscar($id);
				if($row){
					$arr['row'] = $row;
				}else {
					$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontró ningun registro!</div>';	
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
			$id = $this->input->post('intArticuloID');
			if(is_numeric($id)){
				$res = $this->articulos->eliminar($id);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El artículo no se pudo eliminar, vuelva a intentarlo</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El artículo se eliminó correctamente</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parámetro no válido</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			if($this->input->post('intArticuloID') == "") 
				//$this->form_validation->set_rules('strModelo', 'Modelo', 'required|max_length[5]|is_unique[articulos.modelo]');
			//else
				$this->form_validation->set_rules('strModelo', 'Modelo', 'required|max_length[5]');
			$this->form_validation->set_rules('strDescripcion', 'Descripcion', 'required|max_length[50]');
			$this->form_validation->set_rules('dblCosto', 'Costo', 'required|numeric');
			$this->form_validation->set_rules('intExistencia', 'Existencia', 'required|numeric');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intArticuloID'))){
					$res=$this->articulos->modificar(
						$this->input->post('intArticuloID'),
						$this->input->post('strModelo'),
						$this->input->post('strDescripcion'),
						$this->input->post('dblCosto'),
						$this->input->post('intExistencia'),
						$this->input->post('intEstatusID')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->articulos->guardar(
							$this->input->post('strModelo'),
							$this->input->post('strDescripcion'),
							$this->input->post('dblCosto'),
							$this->input->post('intExistencia'),
							$this->input->post('intEstatusID')
						);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El artículo no se puede guardar, vuelva a intentarlo</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El artículo se guardó correctamente</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function cambiar_estado(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intArticuloID', 'Articulo', 'required|integer');
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
				$res = $this->articulos->cambiar_estado(
						 $this->input->post('intArticuloID'),
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
			$arr['articulos'] = $this->articulos->articulos_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

public function autocomplete(){
		    if(isset($_POST['q']) && isset($_POST['limit'])){
			 	$q = strtolower($_POST['q']);
			 	$limit = $_POST['limit'];
		      	$this->output->set_content_type('application/json')->set_output(json_encode($this->articulos->autocomplete($q,$limit)));
		    }
		}
		
	}
 ?>