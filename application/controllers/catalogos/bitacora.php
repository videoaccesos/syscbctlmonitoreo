<?php 
	class Bitacora extends MY_controller
	{
		var $data = NULL;
		
		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'bitacora';
	      $this->load->model('catalogos/bitacora_model','bitacora');
	    }

		public function index(){
			$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 10; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('pagina');
			$result = $this->bitacora->filtro(
				                             $this->input->post('id'),
				                             $this->input->post('tabla'),
				                             $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['modificaciones'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
	}
 ?>