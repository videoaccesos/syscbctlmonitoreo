<?php 
	class Tecnicodetalle extends MY_controller
	{
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'tecnicodetalle';
	      $this->data['formulario'] = 'REPORTES DE TECNICO';
	      $this->load->model('catalogos/tecnicodetalle_model','tecnicodetalle');
	    }

		public function index(){
				$this->data['contenido'] = $this->load->view('catalogos/tecnicodetalle',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

            public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 20; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->tecnicodetalle->filtro(
				                             $this->input->post('strBusqueda'),
				                             $this->input->post('tecnicoID'),
				                             $this->input->post('dtFechaInicial'),
				                             $this->input->post('dtFechaFinal'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['tecnicodetalle'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function opciones(){
			$arr['tecnicodetalle'] = $this->tecnicodetalle->tecnicodetalle_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
	}
 ?>