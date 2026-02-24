<?php 
	class Tarjetas extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'tarjetas';
	      $this->data['formulario'] = 'TARJETAS';
	      $this->bolAcceso = $this->Acceso('ASIGNACIÓN DE TARJETAS');
	      $this->load->model('catalogos/tarjetas_model','tarjetas');
	    }

		public function index(){
			$this->data['fecha'] = substr($this->session->userdata('fecha'),8,2)."-".substr($this->session->userdata('fecha'),5,2)."-".substr($this->session->userdata('fecha'),0,4);
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("catalogos/tarjetas",$this->data,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('strLectura', 'Lectura', 'required|max_length[20]');
			$this->form_validation->set_rules('intTipo', 'Tipo', 'required|integer');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intTarjetaID'))){
					$res=$this->tarjetas->modificar(
							$this->input->post('intTarjetaID'),
							$this->input->post('strLectura'),
							$this->input->post('intTipo'),
							$this->input->post('intEstatusID')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->tarjetas->guardar(
							$this->input->post('strLectura'),
							$this->input->post('intTipo'),
							$this->input->post('intEstatusID')
							);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La Tarjeta no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La Tarjeta se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar_lote(){ 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('strLecturaIni', 'Lectura Inicial', 'required|max_length[20]');
			$this->form_validation->set_rules('strLecturaFin', 'Lectura Final', 'required|max_length[20]');
			$this->form_validation->set_rules('intTipo', 'Tipo', 'required|integer');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intLecturaIni = $this->input->post('strLecturaIni');
				$intLectruaFin = $this->input->post('strLecturaFin');
				if($intLecturaIni <= $intLectruaFin){
					$this->db->trans_begin();
					while ($intLecturaIni <= $intLectruaFin){
						$res = $this->tarjetas->guardar(
								$intLecturaIni,
								$this->input->post('intTipo'),
								$this->input->post('intEstatusID')
							);
						if($res)
							break;
						$intLecturaIni++;
					}
					if ($this->db->trans_status() === FALSE || $res)
					    $this->db->trans_rollback();
					else
					    $this->db->trans_commit();
				}else {
					$arr = array( 'resultado' => 0,
								  'tipo' => 0,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El rango del Lote, no es correcto!</div>');
					$this->output->set_content_type('application/json')->set_output(json_encode($arr));
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Lote de Tarjetas no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Lote de Tarjetas se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => ''
				         );
			$id = $this->input->post('intTarjetaID');
			if(is_numeric($id)){
				$row = $this->tarjetas->buscar($id);
				if($row){
					if($row->estatus_id == 2)
						$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La Tarjeta ya fue asignada, el Estado no pude ser modificado!</div>';		
					else
						$arr['row'] = $row;
				}else {
					$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontro ningun Registro!</div>';	
				}	
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function cambiar_estado(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intTarjetaID', 'Tarjeta', 'required|integer');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else if($this->input->post('intEstatusID') == 2) {
				$arr = array( 'resultado' => 0,
							  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La Tarjeta ya fue asignada, el Estado no puede ser modificado!</div>');
			}
			else {
				$intEstatusID = $this->input->post('intEstatusID');
				if($intEstatusID == 1)
					$intEstatusID = 3;
				else 
					$intEstatusID = 1;
				$res = $this->tarjetas->cambiar_estado(
						 $this->input->post('intTarjetaID'),
						 $intEstatusID
					   );
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Estado no se pudo cambiar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Estado se cambio correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 10; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->tarjetas->filtro(
							 $this->input->post('strLectura'),
                             $this->input->post('strFechaIni'),
                             $this->input->post('strFechaFin'),
                             $config['per_page'],
                             $config['cur_page'] );

			$result2 = $this->tarjetas->totales(
							 $this->input->post('strLectura'),
                             $this->input->post('strFechaIni'),
                             $this->input->post('strFechaFin'));

			$config['total_rows'] = $result['total_rows'];
			
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['tarjetas'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows'],
				         'total_activas' => $result2['total_activas'],
				         'total_asignadas' => $result2['total_asignadas'],
				         'total_danadas' => $result2['total_danadas']
				         );
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function autocomplete(){
		    if(isset($_POST['q']) && isset($_POST['limit'])){
			 	$q = strtolower($_POST['q']);
			 	$limit = $_POST['limit'];
		      	$this->output->set_content_type('application/json')->set_output(json_encode($this->tarjetas->autocomplete($q,$limit)));
		    }
		}
	}
 ?>