<?php 
	class AsignacionTarjetasMC extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'asignacion_tarjetasMC';
	      $this->data['formulario'] = 'ASIGNACION DE TARJETAS MC';
	      $this->bolAcceso = $this->Acceso('ASIGNACIÓN DE TARJETAS MC');
	      $this->load->model('procesos/asignaciontarjetasMC_model','asignacion_tarjetasMC');
	    }

		public function index(){
			$this->data['fecha'] = substr($this->session->userdata('fecha'),8,2)."-".substr($this->session->userdata('fecha'),5,2)."-".substr($this->session->userdata('fecha'),0,4);
			$this->data['fecha_vencimiento'] = "31-12-".substr($this->session->userdata('fecha'),0,4);
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("procesos/asignaciontarjetasMC",$this->data,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => ''
				         );
			$id = $this->input->post('intAsignacionID');
			if(is_numeric($id)){
				$row = $this->asignacion_tarjetas->buscar($id);
				if($row){
					$arr['row'] = $row;
				}else {
					$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontro ningun Registro!</div>';	
				}	
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('strResidenteID', 'Residente', 'required|max_length[8]');
			$this->form_validation->set_rules('intTarjetaID', 'Tarjeta', 'required|integer');
			$this->form_validation->set_rules('strFecha', 'Fecha', 'required|max_length[10]');
			$this->form_validation->set_rules('strFechaVencimiento', 'Fecha Vencimiento', 'required|max_length[10]');
			$this->form_validation->set_rules('intTipoLecturaID', 'Tipo', 'required|integer');
			if($this->input->post('intTipoLectrua') == 2)
				$this->form_validation->set_rules('strLecturaEPC', 'Lectrua EPC', 'required|max_length[20]');
			$this->form_validation->set_rules('strFolioContrato', 'Folio', 'required|max_length[10]');
			$this->form_validation->set_rules('dblPrecio', 'Precio', 'required|numeric');
			$this->form_validation->set_rules('bolUtilizoSeguro', 'Utilizó Seguro', 'required|integer');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intAsignacionID'))){
					$res=$this->asignacion_tarjetas->modificar(
							$this->input->post('intAsignacionID'),
							$this->input->post('strFecha'),
							$this->input->post('strFechaVencimiento'),
							$this->input->post('intTipoLecturaID'),
							$this->input->post('strFolioContrato'),
							$this->input->post('dblPrecio'),
							$this->input->post('bolUtilizoSeguro'),
							$this->input->post('intEstatusID')
					);	
					$intTipo=1;
				}
				else{
					$this->load->model('catalogos/tarjetas_model','tarjetas');
					$this->db->trans_begin();
					$re2=$this->tarjetas->cambiar_estado($this->input->post('intTarjetaID'),2);
$re3=$this->tarjetas->cambiar_estado($this->input->post('intTarjetaID2'),2);
					$res=$this->asignacion_tarjetas->guardar(
							$this->input->post('intTarjetaID'),
$this->input->post('intTarjetaID2'),
							$this->input->post('strResidenteID'),
							$this->input->post('strFecha'),
							$this->input->post('strFechaVencimiento'),
							$this->input->post('intTipoLecturaID'),
							$this->input->post('strFolioContrato'),
							$this->input->post('dblPrecio'),
							$this->input->post('bolUtilizoSeguro'),
							$this->input->post('intEstatusID')
							);
					//Pasar tarjeta a estado de Asignacion...
					if ($this->db->trans_status() === FALSE || $res || $re2)
					    $this->db->trans_rollback();
					else
					    $this->db->trans_commit();
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

		public function cambiar_estado(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intAsignacionID', 'Asignacion', 'required|integer');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intEstatusID = $this->input->post('intEstatusID');
				if($intEstatusID == 1)
					$intEstatusID = 2;
				else 
					$intEstatusID = 1;
				$res = $this->asignacion_tarjetas->cambiar_estado(
						 $this->input->post('intAsignacionID'),
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

		public function liberar_tarjeta(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intAsignacionID', 'Asignacion', 'required|integer');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			$res = null;
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intEstatusID = $this->input->post('intEstatusID');
				if($intEstatusID == 1){
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La tarjeta no puede ser liberada, por favor cancele la Asignación!</div>');
					$this->output->set_content_type('application/json')->set_output(json_encode($arr));	
					return;
				}
				else{ 
					$this->load->model('catalogos/tarjetas_model','tarjetas');
					$res =$this->tarjetas->cambiar_estado($this->input->post('intTarjetaID'),1);
				}
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Tarjeta no se pudo liberar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Tarjeta se libero correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->asignacion_tarjetas->filtro(
				                             $this->input->post('strResidenciaID'),
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['tarjetas'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
	}
 ?>