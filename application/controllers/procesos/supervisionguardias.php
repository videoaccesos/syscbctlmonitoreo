<?php 
	class SupervisionGuardias extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'supervision_guardias';
	      $this->data['formulario'] = 'Supervisión de Guardias';
	      $this->bolAcceso = $this->Acceso('SUPERVISIÓN DE GUARDIAS');
	      //$this->load->model('procesos/supervision_guardias_model','supervision_guardias');
	    }

		public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("procesos/supervisionguardias",NULL,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}
		
	}
 ?>