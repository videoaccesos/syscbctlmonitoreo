<?php 
	class Indicadores extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'indicadores';
	      $this->data['formulario'] = 'INDICADORES DEL DIA';
	      $this->bolAcceso = $this->Acceso('Indicadores');
	      $this->load->model('catalogos/indicadores_model','indicadores');
	    }
		public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("catalogos/indicadores",$this->data,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

            public function paginacionFinanzas(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 20; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->indicadores->filtroFinanzas(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['indicadores'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function paginacionTecnicos(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 30; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->indicadores->filtroTecnicos(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['indicadores'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function paginacionMonitoristas(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 20; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->indicadores->filtroMonitoristas(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['indicadores'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function opciones(){
			$arr['indicadores'] = $this->indicadores->indicadores_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
	}
 ?>