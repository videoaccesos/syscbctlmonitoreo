<?php 
	class Finanzas extends MY_controller
	{
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'finanzas';
	      $this->data['formulario'] = 'FINANZAS DEL DIA';
	      $this->load->model('catalogos/finanzas_model','finanzas');
	    }

		public function index(){
				$this->data['contenido'] = $this->load->view('catalogos/finanzas',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

            public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 20; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->finanzas->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['finanzas'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function opciones(){
			$arr['finanzas'] = $this->finanzas->finanzas_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
	}
 ?>