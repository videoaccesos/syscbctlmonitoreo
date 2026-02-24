<?php 
	class Tecnicos extends MY_controller
	{
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'tecnicos';
	      $this->data['formulario'] = 'REPORTES DE TECNICOS';
	      $this->load->model('catalogos/tecnicos_model','tecnicos');
	    }

		public function index(){
				$this->data['contenido'] = $this->load->view('catalogos/tecnicos',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

            public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 30; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->tecnicos->filtro(
				                             $this->input->post('strBusqueda'),
				                             $this->input->post('dtFechaInicial'),
				                             $this->input->post('dtFechaFinal'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['tecnicos'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
		public function opciones(){
			$arr['tecnicos'] = $this->tecnicos->tecnicos_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
	}
 ?>