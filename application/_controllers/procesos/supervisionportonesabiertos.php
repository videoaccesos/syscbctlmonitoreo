<?php 
	class SupervisionPortonesAbiertos extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'supervision_portones_abiertos';
	      $this->data['formulario'] = 'Supervisión de Portones Abiertos';
	      $this->bolAcceso = $this->Acceso('SUPERVISIÓN PORTONES ABIERTOS');
	      //$this->load->model('procesos/supervision_portones_abiertos_model','supervision_portones_abiertos');
	    }

		public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("procesos/supervisionportonesabiertos",NULL,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}
		
	}
 ?>