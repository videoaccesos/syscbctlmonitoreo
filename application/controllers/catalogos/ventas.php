<?php 
	class Ventas extends MY_controller
	{
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'ventas';
	      $this->data['formulario'] = 'VENTAS';
	      $this->load->model('catalogos/ventas_model','ventas');
	    }

		public function index(){
				$this->data['contenido'] = $this->load->view('catalogos/ventas',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->ventas->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['ventas'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}


		public function guardar(){ 
			$this->load->library('form_validation');
			if($this->input->post('intFolio') == "") 
				$this->form_validation->set_rules('strCliente', 'Cliente', 'required|max_length[200]');
			$this->form_validation->set_rules('dblTotal', 'Total', 'required|numeric');
			$this->form_validation->set_rules('intPlazoElegido', 'PlazoElegido', 'required|numeric');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
					$res=$this->ventas->guardar(
							$this->input->post('intFolio'),
							$this->input->post('intCveCliente'),
							$this->input->post('strCliente'),
							$this->input->post('dblTotal'),
							$this->input->post('intPlazoElegido'),
$this->input->post('estatus')
						);

				if($res=0) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La venta no se puede realizar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La venta se guardó correctamente</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function opciones(){
			$arr['ventas'] = $this->ventas->ventas_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
	}
 ?>