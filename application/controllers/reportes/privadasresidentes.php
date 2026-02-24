<?php 
class Privadasresidentes extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'privadasresidentes';
	      $this->data['formulario'] = 'RESIDENTES';
	      $this->bolAcceso = $this->Acceso('Residentes');
	      //Cargar modelo de privadas
	      $this->load->model('catalogos/residencias_residentes_Model','privadas');
	     
	    }

		public function index(){
			$this->data['fecha'] = substr($this->session->userdata('fecha'),8,2)."-".substr($this->session->userdata('fecha'),5,2)."-".substr($this->session->userdata('fecha'),0,4);
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("reportes/privadasresidentes",$this->data,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function paginacion_consulta(){
			$intContador=0;
			$this->load->library('form_validation');
		    $this->form_validation->set_rules('intPagina', 'Pagina', 'integer');
			if ($this->form_validation->run()) {
				$this->load->library('pagination');
				$config['base_url'] = '';
				$config['per_page'] = 10; 
				$config['first_link'] = '<< Primero'; 
				$config['last_link'] = 'Ultimo >>'; 
				$config['cur_page'] =  $this->input->post('intPagina');
				$res = $this->privadas->filtro_consulta(
												 $this->input->post('intPrivadaID'),
												 $this->input->post('intEstatusResidenciaID'),
					                             $config['per_page'],
					                             $config['cur_page']);
				
				$config['total_rows'] = $res['total_rows'];
				$this->pagination->initialize($config); 
				$arr = array('rows' => $res['rows'],
					         'paginacion' => $this->pagination->create_links(),
					         'pagina' => $config['cur_page'],
					         'total_rows' => $config['total_rows']);
				$this->output->set_content_type('application/json')->set_output(json_encode($arr));
			}else {
				$arr = array('rows' => array(),
					         'paginacion' => '',
					         'pagina' => 0,
					         'total_rows' => 0);
				$this->output->set_content_type('application/json')->set_output(json_encode($arr));
			}
		}
	}
?>