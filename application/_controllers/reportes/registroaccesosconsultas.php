<?php 
class RegistroAccesosConsultas extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;
		VAR $consecutivo_id = 1;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'registroaccesosconsultas';
	      $this->data['formulario'] = 'REGISTRO DE ACCESOS CONSULTAS';
	      $this->bolAcceso = $this->Acceso('Registro De Accesos Consultas');
	      //$this->load->model('catalogos/registrosgenerales_model','registrosgenerales');
	    }

		public function index(){
			$this->data['fecha'] = substr($this->session->userdata('fecha'),8,2)."-".substr($this->session->userdata('fecha'),5,2)."-".substr($this->session->userdata('fecha'),0,4);
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("reportes/registroaccesosconsultas",$this->data,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function registroaccesosgraficas(){
	      	$this->data['formulario'] = 'REGISTRO DE ACCESOS GRAFICAS';
	      	$this->bolAcceso = $this->Acceso('REGISTRO DE ACCESOS GRAFICAS');
			$this->data['fecha'] = substr($this->session->userdata('fecha'),8,2)."-".substr($this->session->userdata('fecha'),5,2)."-".substr($this->session->userdata('fecha'),0,4);
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("reportes/registroaccesosgraficas",$this->data,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		/*public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$errorult = $this->registrosgenerales->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $errorult['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $errorult['registrosgenerales'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}*/
	}
?>