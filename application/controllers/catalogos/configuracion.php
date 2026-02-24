<?php 
	class Configuracion extends MY_controller
	{
		//var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'configuracion';
	      $this->data['formulario'] = 'CONFIGURACION';
	      $this->load->model('catalogos/configuracion_model','configuracion');
	    }

		public function index(){
			//if($this->bolAcceso)
			//	$this->data['contenido'] = $this->load->view("catalogos/articulos",NULL,TRUE);
			//else
				$this->data['contenido'] = $this->load->view('catalogos/configuracion',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			//if($this->input->post('intArticuloID') == "") 
				//$this->form_validation->set_rules('strModelo', 'Modelo', 'required|max_length[5]|is_unique[articulos.modelo]');
			//else
				$this->form_validation->set_rules('dblTasaFinanciamiento', 'TasaFinanciamiento', 'required|numeric');
				$this->form_validation->set_rules('dblEnganche', 'Engancge', 'required|numeric');
				$this->form_validation->set_rules('dblPlazoMaximo', 'PlazoMaximo', 'required|numeric');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
					$res=$this->configuracion->guardar(
							$this->input->post('dblTasaFinanciamiento'),
							$this->input->post('dblEnganche'),
							$this->input->post('dblPlazoMaximo')
						);

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La configuración no se pudo guardar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La configuración se guardó correctamente</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		

		public function opciones(){
			$arr['configuracion'] = $this->configuracion->configuracion_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
	}
 ?>