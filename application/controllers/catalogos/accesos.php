<?php 
	class Accesos extends MY_controller
	{
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'accesos';
	      $this->data['formulario'] = 'ACCESOS BOT';
	      $this->load->model('catalogos/accesos_model','accesos');
	    }

		public function index(){
				$this->data['contenido'] = $this->load->view('catalogos/accesos',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}
		    public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 20; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->accesos->filtro(
				                             $this->input->post('strBusqueda'),
				                             $this->input->post('strFechaHoraInicio'),
				                             $this->input->post('strFechaHoraFin'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['accesos'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function opciones(){
			$arr['accesos'] = $this->accesos->accesos_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
	}
 ?>