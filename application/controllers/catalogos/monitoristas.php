<?php 
	class Monitoristas extends MY_controller
	{
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'monitoristas';
	      $this->data['formulario'] = 'MONITORISTAS ACTIVOS';
	      $this->load->model('catalogos/monitoristas_model','monitoristas');
	    }

		public function index(){
				$this->data['contenido'] = $this->load->view('catalogos/monitoristas',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

            public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 20; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->monitoristas->filtro(
				                             $this->input->post('strBusqueda'),
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

            public function paginacionPrivadasMonitoristas(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 20; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->monitoristas->filtroPrivadasMonitoristas(
				                             $this->input->post('usuarioID'),
				                             $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['registroaccesos'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
		public function totalLlamadas(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 20; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->monitoristas->totalLlamadas(
				                             $this->input->post('usuarioID'),
				                             $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$config['diferencia_llamadas'] = $result['diferencia_llamadas'];
			$config['ganador_llamadas'] = $result['ganador_llamadas'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['totalllamadas'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows'],
				         'diferencia_llamadas' => $config['diferencia_llamadas'],
				         'ganador_llamadas' => $config['ganador_llamadas']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function cambiar_estado(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intConsecutivoID', 'Privada', 'required|integer');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$strComentarios= $this->input->post('strComentarios');
				$intEstatusID = $this->input->post('intEstatusID');
				if($intEstatusID == 1)
					$intEstatusID = 2;
				else
					$intEstatusID = 1;
				$res = $this->monitoristas->cambiar_estado(
						 $this->input->post('intConsecutivoID'),
						 $this->input->post('strComentarios'),
						 $intEstatusID
					   );
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La privada no se pudo revisar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La privada se revisó correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

public function desloguear(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intUsuarioID', 'Usuario', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intUsuarioID= $this->input->post('intUsuarioID');
				$res = $this->monitoristas->desloguear(
						 $this->input->post('intUsuarioID')
					   );
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El usuario no se pudo desloguear, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El usuario se deslogue�� correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function opciones(){
			$arr['monitoristas'] = $this->monitoristas->monitoristas_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
		
	}
 ?>