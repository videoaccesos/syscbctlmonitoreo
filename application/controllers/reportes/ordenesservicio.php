<?php 
class Relaysactivacion extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;
		VAR $consecutivo_id = 1;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'ordenesdeservicio';
	      $this->data['formulario'] = 'ORDENES DE SERVICIO';
	      $this->bolAcceso = $this->Acceso('Ordenes de Servicio');
	    }

		public function index(){
			$this->data['fecha'] = substr($this->session->userdata('fecha'),8,2)."-".substr($this->session->userdata('fecha'),5,2)."-".substr($this->session->userdata('fecha'),0,4);
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("reportes/ordenesdeservicio",$this->data,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}
		
	}
?>