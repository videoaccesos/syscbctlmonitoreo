<?php 
	class OrdenesServicio extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;
		var $strProceso = "Ordenes de Servicio";

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = $this->strProceso;
	      $this->data['formulario'] = 'ORDENES DE SERVICIO';
	      $this->data['empleado'] = $this->session->userdata('empleado');
	      $this->data['empleado_id'] = $this->session->userdata('empleado_id');
	      $this->data['puesto_id'] = $this->session->userdata('puesto_id');
	      $this->bolAcceso = $this->Acceso($this->strProceso);
	      $this->load->model('procesos/ordenesservicio_model','ordenes');
	    }

		public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("procesos/ordenesservicio",$this->data,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}

		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->ordenes->filtro($this->input->post('strFechaIni'),
											 $this->input->post('strFechaFin'),
											 $this->input->post('intEstatusID'),
											 $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['ordenes'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => ''
				         );
			$id = $this->input->post('intOrdenServicioID');
			$folio = $this->RestableceFolio($this->strProceso, $this->input->post('strFolio'));
			if($id == "")
				$row = $this->ordenes->buscar($folio, 2); //busqueda por folio
			else	
				$row = $this->ordenes->buscar($id);
			if($row){
				$arr['row'] = $row;
			}else {
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontro ningun Registro!</div>';	
			}	
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		// para realizar busquedas sin permiso en recuperacion patrimonial
		public function editar_buscar(){
			$arr = array('row' => null,
				         'mensajes' => ''
				         );
			$id = $this->input->post('intOrdenServicioID');
			$folio = $this->RestableceFolio($this->strProceso, $this->input->post('strFolio'));
			if($id == "")
				$row = $this->ordenes->buscar($folio, 2); //busqueda por folio
			else	
				$row = $this->ordenes->buscar($id);
			if($row){
				$arr['row'] = $row;
			}else {
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No se encontro ningun Registro!</div>';	
			}	
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar() { 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intEmpleadoID', 'Empleado', 'required|integer');
			$this->form_validation->set_rules('intPrivadaID', 'Privada', 'required|integer');
			$this->form_validation->set_rules('intTecnicoID', 'Tecnico', 'required|integer');
			$this->form_validation->set_rules('strFechaAsistio', 'Fecha de Asistencia', 'max_length[16]');
			$this->form_validation->set_rules('intTiempo', 'Tiempo', 'integer');
			$this->form_validation->set_rules('intCodigoServicioID', 'Codigo de Servicio', 'required|integer');
			$this->form_validation->set_rules('strDetalleServicio', 'Detalle del Servicio', 'required|min_length[1]');
			$this->form_validation->set_rules('intDiagnosticoID', 'Diagnostico', 'required|integer');
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				if($this->input->post('intOrdenServicioID') != ""){
					$error=$this->ordenes->modificar(
						$this->input->post('intOrdenServicioID'),
						$this->input->post('intEmpleadoID'),
						$this->input->post('intPrivadaID'),
						$this->input->post('intTecnicoID'),
						$this->input->post('strFechaAsistio'),
						$this->input->post('intTiempo'),
						$this->input->post('intCodigoServicioID'),
						$this->input->post('strDetalleServicio'),
						$this->input->post('intDiagnosticoID'),
						$this->input->post('strDetalleDiagnostico')
					);	
				}
				else{
					$this->db->trans_start();
					$strFolio = $this->GenerarFolio($this->strProceso);
					if($strFolio == "0"){
						$this->db->trans_rollback();
						$error = "No se pudo generar el ConsecutivoID!!!"; // se asigna 1 para envie error.
					}
					else{
						$error=$this->ordenes->guardar(
								$strFolio,
								$this->input->post('intEmpleadoID'),
								$this->input->post('intPrivadaID'),
								$this->input->post('intTecnicoID'),
								$this->input->post('strFechaAsistio'),
								$this->input->post('intTiempo'),
								$this->input->post('intCodigoServicioID'),
								$this->input->post('strDetalleServicio'),
								$this->input->post('intDiagnosticoID'),
								$this->input->post('strDetalleDiagnostico')
								);
						if($error)
							$this->db->trans_rollback();
						else{
							$this->db->trans_commit();
							$this->enviar_notificacion($strFolio);
						}
					}
				}

				if($error) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $error,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La Orden de Servicio no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $error,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La Orden de Servicio se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}	

		public function cerrar(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intOrdenServicioID', 'Orden de Servicio', 'required|integer');
			$this->form_validation->set_rules('intEmpleadoID', 'Empleado', 'required|integer');
			$this->form_validation->set_rules('intPrivadaID', 'Privada', 'required|integer');
			$this->form_validation->set_rules('intTecnicoID', 'Tecnico', 'required|integer');
			$this->form_validation->set_rules('strFechaAsistio', 'Fecha de Asistencia', 'max_length[16]');
			$this->form_validation->set_rules('intTiempo', 'Tiempo', 'integer');
			$this->form_validation->set_rules('intCodigoServicioID', 'Codigo de Servicio', 'required|integer');
			$this->form_validation->set_rules('strDetalleServicio', 'Detalle del Servicio', 'required|min_length[1]');
			$this->form_validation->set_rules('intDiagnosticoID', 'Diagnostico', 'required|integer');			
			$this->form_validation->set_rules('strComentario', 'Comentario', 'required|min_length[1]');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$strMensajes = '';
				if($this->input->post('intEstatusID') == 3){
					$strMensajes .= '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La Orden de Servicio ya fue cerrada, no puede realizar esta acción!</div>';
				}
				if($this->input->post('intTecnicoID') == 0){
					$strMensajes .= '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Seleccione al primer tecnico asignado a la Orden de Servicio!</div>';	
				}		
				if($this->input->post('intDiagnosticoID') == 0){
					$strMensajes .= '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Seleccione el diagnostico para la Orden de Servicio!</div>';	
				}			

				if($strMensajes == ''){
					$error=$this->ordenes->cerrar_orden(
							$this->input->post('intOrdenServicioID'),
							$this->input->post('intEmpleadoID'),
							$this->input->post('intPrivadaID'),
							$this->input->post('intTecnicoID'),
							$this->input->post('strFechaAsistio'),
							$this->input->post('intTiempo'),
							$this->input->post('intCodigoServicioID'),
							$this->input->post('strDetalleServicio'),
							$this->input->post('intDiagnosticoID'),
							$this->input->post('strDetalleDiagnostico'),
							$this->input->post('strComentario')
						);	
					if($error) 
						$arr = array( 'resultado' => 0,
									  'tipo' => $error,
									  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La Orden de Servicio no se pudo cerrar correctamente, vuelva a intentarlo!</div>');
					else 
						$arr = array( 'resultado' => 1,
									  'tipo' => $error,
							          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La Orden de Servicio fue cerrada correctamente!</div>');
				} else{
					$arr = array( 'resultado' => 0,
									  'tipo' => '',
									  'mensajes' => $strMensajes);
				}
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function solucionar(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intOrdenServicioID', 'Orden de Servicio', 'required|integer');
			$this->form_validation->set_rules('intEmpleadoID', 'Empleado', 'required|integer');
			$this->form_validation->set_rules('intPrivadaID', 'Privada', 'required|integer');
			$this->form_validation->set_rules('intTecnicoID', 'Tecnico', 'required|integer');
			$this->form_validation->set_rules('strFechaAsistio', 'Fecha de Asistencia', 'max_length[16]');
			$this->form_validation->set_rules('intTiempo', 'Tiempo', 'integer');
			$this->form_validation->set_rules('intCodigoServicioID', 'Codigo de Servicio', 'required|integer');
			$this->form_validation->set_rules('strDetalleServicio', 'Detalle del Servicio', 'required|min_length[1]');
			$this->form_validation->set_rules('intDiagnosticoID', 'Diagnostico', 'required|integer');			
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$strMensajes = '';
				if($this->input->post('intEstatusID') != 1){
					$strMensajes .= '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La Orden de Servicio ya fue solucionada, no puede realizar esta acción!</div>';
				}
				if($this->input->post('intDiagnosticoID') == 0){
					$strMensajes .= '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Seleccione el diagnostico para la Orden de Servicio!</div>';	
				}			

				if($strMensajes == ''){
					$error=$this->ordenes->solucionar_orden(
							$this->input->post('intOrdenServicioID'),
							$this->input->post('intEmpleadoID'),
							$this->input->post('intPrivadaID'),
							$this->input->post('intTecnicoID'),
							$this->input->post('strFechaAsistio'),
							$this->input->post('intTiempo'),
							$this->input->post('intCodigoServicioID'),
							$this->input->post('strDetalleServicio'),
							$this->input->post('intDiagnosticoID'),
							$this->input->post('strDetalleDiagnostico')
						);	
					if($error) 
						$arr = array( 'resultado' => 0,
									  'tipo' => $error,
									  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La Orden de Servicio no se pudo solucionar correctamente, vuelva a intentarlo!</div>');
					else 
						$arr = array( 'resultado' => 1,
									  'tipo' => $error,
							          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La Orden de Servicio fue solucionada correctamente!</div>');
				} else{
					$arr = array( 'resultado' => 0,
									  'tipo' => '',
									  'mensajes' => $strMensajes);
				}
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}	


		public function enviar_notificacion($strFolio)
		{
			$this->load->library('email');
			
			//$config['protocol'] = 'smtp';
			//$config['smtp_host'] = 'mail.videoaccesos.com';
			//$config['smtp_host'] = 'localhost';
			//$config['smtp_user'] = 'aquiroz@zonash.com.mx';
			//$config['smtp_pass'] = 'alejandro0612';
			//$config['smtp_user'] = 'monitoreo@videoaccesos.com';
			//$config['smtp_pass'] = 'm0n1t0re0';
			
			$config['charset'] = 'utf-8';
			$config['wordwrap'] = TRUE;
			$config['mailtype'] = 'text';

			$this->email->initialize($config);
			$res = $this->ordenes->enviar_notificacion($strFolio);
			
$strMensaje = "
Se ha registrado una orden de servicio con la siguiente información:

Folio : $res->folio
Privada: $res->privada
Codigo de Servicio: $res->codigo_servicio

Detalle del Servicio : $res->detalle_servicio

Registrada por '$res->empleado'.

";

			$this->email->from('registro@videoaccesos.com', 'Video Accesos');
			//$this->email->from('aquiroz@zonahs.com.mx', 'Zona HS Ordenes Test');
			//$this->email->to(strtolower($res['residentes'])); 
			$this->email->to($res->email); 
			$this->email->subject('Orden de Servicio F:'.$res->folio);
			$this->email->message($strMensaje);
			$this->email->send();
		}

		//-------------------------------------------------------
		//Seguimiento
		//---------------------------------------------------------------
		public function guardar_seguimiento() { 
			$arr = null;
			$error = 0;
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intOrdenServicioID', 'Orden de Servicio', 'required|integer');	
			$this->form_validation->set_rules('strComentario', 'Comentario', 'trim|required|min_length[3]');	
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$error=$this->ordenes->guardar_seguimiento(
					$this->input->post('intOrdenServicioID'),
					$this->input->post('strComentario')
				);

				if($error) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $error,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Seguimiento no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $error,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Seguimiento se guardo correctamente!</div>');	
			}
				
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function paginacion_seguimiento(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->ordenes->filtro_seguimiento(
				                             $this->input->post('intOrdenServicioID'),
				                             $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['seguimientos'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		//--------------------------------------------------------
		//Materiales
		//---------------------------------------------------------------
		public function guardar_material() { 
			$arr = null;
			$error = 0;
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intOrdenServicioID', 'Orden de Servicio', 'required|integer');
			$this->form_validation->set_rules('intMaterialID', 'Material', 'required|integer');
			$this->form_validation->set_rules('dblCantidad', 'Cantidad', 'required|numeric|greater_than[0]');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$error=$this->ordenes->guardar_material(
					$this->input->post('intOrdenServicioID'),
					$this->input->post('intMaterialID'),
					$this->input->post('dblCantidad')
				);

				if($error) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $error,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Material no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $error,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Material se guardo correctamente!</div>');	
			}
				
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function eliminar_material() { 
			$arr = null;
			$error = 0;
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intOrdenServicioID', 'Orden de Servicio', 'required|integer');
			$this->form_validation->set_rules('intMaterialID', 'Material', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$error=$this->ordenes->eliminar_material(
					$this->input->post('intOrdenServicioID'),
					$this->input->post('intMaterialID')
				);

				if($error) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $error,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Material no se elimino correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $error,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Material se elimino correctamente!</div>');	
			}
				
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function paginacion_material(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->ordenes->filtro_material(
				                             $this->input->post('intOrdenServicioID'),
				                             $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['materiales'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
	}
 ?>