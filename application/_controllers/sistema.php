<?php
	class Sistema extends MY_Controller{
		public function __construct(){
			parent::__construct();
		}

		public function index(){
			    $data['strProceso'] = '';
			    $data['formulario'] = 'Bienvenidos al Sistema';
				$data['contenido'] = "<p>Este es un sistema para llevar el control de Accesos, para cualquier duda comuníquese con sus superiores.</p>";
				$this->load->view('sistema/sistema.php',$data);
		}
	}
?>