<?php 
	class SupervisionLlamadas extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;
		VAR $consecutivo_id = 1;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'supervicionllamadas';
	      $this->data['formulario'] = 'SUPERVISION LLAMADAS';
	      $this->bolAcceso = $this->Acceso('Supervision de Llamadas');
	      //$this->load->model('catalogos/registrosgenerales_model','registrosgenerales');
	    }

		public function index(){
			$this->data['fecha'] = substr($this->session->userdata('fecha'),8,2)."-".substr($this->session->userdata('fecha'),5,2)."-".substr($this->session->userdata('fecha'),0,4);
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("reportes/supervisionllamadas",$this->data,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}
	}
?>