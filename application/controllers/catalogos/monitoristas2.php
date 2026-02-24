<?php 
	class Monitoristas2 extends MY_controller
	{
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'monitoristas2';
	      $this->data['formulario'] = 'MONITORISTAS POR RANGO DE FECHAS';
	      $this->load->model('catalogos/monitoristas2_model','monitoristas2');
	    }

		public function index(){
				$this->data['contenido'] = $this->load->view('catalogos/monitoristas2',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}
		    public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 20; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->monitoristas2->filtro(
				                             $this->input->post('strBusqueda'),
				                             $this->input->post('strFechaHoraInicio'),
				                             $this->input->post('strFechaHoraFin'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['monitoristas'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function opciones(){
			$arr['monitoristas'] = $this->monitoristas->monitoristas_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
	}
 ?>