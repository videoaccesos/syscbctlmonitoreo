<?php 
	class RegistroAccesos extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;
		private $max_size = 1024;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'Registro_Accesos';
	      $this->data['formulario'] = 'REGISTRO DE ACCESOS';
	      $this->data['empleado'] = $this->session->userdata('nro_operador');
	      $this->data['empleado_id'] = $this->session->userdata('empleado_id');
	      $this->bolAcceso = $this->Acceso('Registro De Accesos');
	      $this->load->model('procesos/registrosaccesos_model','registroaccesos');
	    }

		public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("procesos/registroaccesos",$this->data,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
		}
		
		// Esta paginacion sera para la pantalla de busqueda
		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->registroaccesos->filtro(
				                             trim($this->input->post('strBusqueda')),
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

		public function paginacion_residentes(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->registroaccesos->filtroResidentes(
				                             trim($this->input->post('intBusqueda')),
				                             $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['residentes'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function paginacion_visitantes(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 6; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->registroaccesos->filtroVisitantes(
				                             trim($this->input->post('intBusqueda')),
				                             $config['per_page'],
				                             $config['cur_page']);
			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['visitantes'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function paginacion_consulta(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('strFechaHoraInicio', 'Fecha Inicio', 'required|max_length[16]');
			$this->form_validation->set_rules('strFechaHoraFin', 'Fecha Final', 'required|max_length[16]');
			$this->form_validation->set_rules('intPrivadaID', 'Privada', 'required|integer');
			$this->form_validation->set_rules('intResidenciaID', 'Residencia', 'required|integer');
			$this->form_validation->set_rules('strSolicitanteID', 'Solicitante', 'max_length[8]');
			$this->form_validation->set_rules('intOperadorID', 'Operador', 'required|integer');
			$this->form_validation->set_rules('intTipoGestionID', 'Tipo de Gestion', 'required|integer');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			$this->form_validation->set_rules('intPagina', 'Pagina', 'integer');
			if ($this->form_validation->run()) {
				$this->load->library('pagination');
				$config['base_url'] = '';
				$config['per_page'] = 10; 
				$config['first_link'] = '<< Primero'; 
				$config['last_link'] = 'Ultimo >>'; 
				$config['cur_page'] =  $this->input->post('intPagina');
				$res = $this->registroaccesos->filtro_consulta(
												 $this->db->escape_str($this->input->post('strFechaHoraInicio')),
												 $this->db->escape_str($this->input->post('strFechaHoraFin')),
												 $this->input->post('intPrivadaID'),
												 $this->input->post('intResidenciaID'),
												 $this->db->escape_str($this->input->post('strSolicitanteID')),
			                           			 $this->input->post('intOperadorID'),
			                           			 $this->input->post('intTipoGestionID'),
			                           			 $this->input->post('intEstatusID'),
					                             $config['per_page'],
					                            $config['cur_page']);
				$config['total_rows'] = $res['total_rows'];
				$this->pagination->initialize($config); 
				$arr = array('rows' => $res['rows'],
					         'paginacion' => $this->pagination->create_links(),
					         'pagina' => $config['cur_page'],
					         'total_rows' => $config['total_rows']);
				$this->output->set_content_type('application/json')->set_output(json_encode($arr));
			}else {
				$arr = array('rows' => array(),
					         'paginacion' => '',
					         'pagina' => 0,
					         'total_rows' => 0);
				$this->output->set_content_type('application/json')->set_output(json_encode($arr));
			}
		}

		public function consulta_grafica(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('strFechaHoraInicio', 'Fecha Inicio', 'required|max_length[16]');
			$this->form_validation->set_rules('strFechaHoraFin', 'Fecha Final', 'required|max_length[16]');
			$this->form_validation->set_rules('intPrivadaID', 'Privada', 'required|integer');
			$this->form_validation->set_rules('intResidenciaID', 'Residencia', 'required|integer');
			$this->form_validation->set_rules('strSolicitanteID', 'Solicitante', 'max_length[8]');
			$this->form_validation->set_rules('intOperadorID', 'Operador', 'required|integer');
			$this->form_validation->set_rules('intTipoGestionID', 'Tipo de Gestion', 'required|integer');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			$this->form_validation->set_rules('intFiltro', 'Tipo de Filtro', 'integer');
			if ($this->form_validation->run()) {
				$res = $this->registroaccesos->filtro_grafica(
												 $this->db->escape_str($this->input->post('strFechaHoraInicio')),
												 $this->db->escape_str($this->input->post('strFechaHoraFin')),
												 $this->input->post('intPrivadaID'),
												 $this->input->post('intResidenciaID'),
												 $this->db->escape_str($this->input->post('strSolicitanteID')),
			                           			 $this->input->post('intOperadorID'),
			                           			 $this->input->post('intTipoGestionID'),
			                           			 $this->input->post('intEstatusID'),
			                           			 $this->input->post('intFiltro')
			                           			 );
				$arr = $res['rows'];
				$this->output->set_content_type('application/json')->set_output(json_encode($arr));
			}else {
				$arr = array('rows' => array(),
					         'paginacion' => '',
					         'pagina' => 0,
					         'total_rows' => 0);
				$this->output->set_content_type('application/json')->set_output(json_encode($arr));
			}
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intRegistroAccesoID');
			if(is_numeric($id)){
				$row = $this->registroaccesos->buscar($id);
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

		public function eliminar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intRegistroAccesoID');
			if(is_numeric($id)){
				$res = $this->registroaccesos->eliminar($id);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Registro no se pudo eliminar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Registro se elimino correctamente!</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			//$this->form_validation->set_rules('strDescripcion', 'Descripcion', 'required|max_length[50]|is_unique[registroaccesos.descripcion]');
			$this->form_validation->set_rules('intEmpleadoID', 'Empleado', 'required|integer');
			$this->form_validation->set_rules('intPrivadaID', 'Privada', 'required|integer');
			$this->form_validation->set_rules('intResidenciaID', 'Residencia', 'required|integer');
			$this->form_validation->set_rules('intTipoGestionID', 'Tipo de Gestion', 'required|integer');
			$this->form_validation->set_rules('strSolicitanteID', 'Solicitante', 'required|max_length[8]');
			$this->form_validation->set_rules('strObservaciones', 'Observaciones', '');
			$this->form_validation->set_rules('strDuracion', 'Duracion', 'required|max_length[8]');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');

			$strImagen = "";

			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				if(is_numeric($this->input->post('intRegistroAccesoID'))){
					$res=$this->registroaccesos->modificar(
						$this->input->post('intRegistroAccesoID'),
						$this->input->post('intEmpleadoID'),
						$this->input->post('intPrivadaID'),
						$this->input->post('intResidenciaID'),
						$this->input->post('intTipoGestionID'),
						$this->input->post('strSolicitanteID'),
						$this->input->post('strObservaciones'),
						$this->input->post('strDuracion'),
						$this->input->post('intEstatusID')
					);	
				}
				else{
					$strImagen = date("dmY".mt_rand(1,1000)."his").".jpg";
					$res=$this->registroaccesos->guardar(
							$this->input->post('intEmpleadoID'),
							$this->input->post('intPrivadaID'),
							$this->input->post('intResidenciaID'),
							$this->input->post('intTipoGestionID'),
							$this->input->post('strSolicitanteID'),
							$this->input->post('strObservaciones'),
							$this->input->post('strDuracion'),
							$strImagen,
							$this->input->post('intEstatusID')
						);
					$_POST['intRegistroAccesoID'] = $this->db->insert_id();
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Registro no se guardo correctamente, vuelva a intentarlo!</div>');
				else {
					$this->enviar_notificaciones($this->input->post('intRegistroAccesoID'));
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
								  'id' => $this->input->post('intRegistroAccesoID'),
								  'imagen' => $strImagen,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Registro se guardo correctamente!</div>');

				}
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function enviar_notificaciones($intRegistroAccesoID){
			$strMensajeHeader = '<html lang="es">
								    <head>
								        <title>Video Accesos System</title>
								        <meta charset="utf-8">
								        <style type="text/css">
								            .content {
								                background-color: rgb(255, 255, 255);
								                color: rgb(0, 65, 130);
								                display: block;
								                font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif;
								                line-height: 20px;
								            }
								            .fluid {
								                display: block;
								            }
								            .img-polaroid {
								                -webkit-box-shadow: rgba(0, 0, 0, 0.0980392) 0px 1px 3px 0px;
								                background-color: rgb(255, 255, 255);
								                border-bottom-color: rgba(0, 0, 0, 0.2);
								                border-bottom-style: solid;
								                border-bottom-width: 1px;
								                border-image-outset: 0px;
								                border-image-repeat: stretch;
								                border-image-slice: 100%;
								                border-image-source: none;
								                border-image-width: 1;
								                border-left-color: rgba(0, 0, 0, 0.2);
								                border-left-style: solid;
								                border-left-width: 1px;
								                border-right-color: rgba(0, 0, 0, 0.2);
								                border-right-style: solid;
								                border-right-width: 1px;
								                border-top-color: rgba(0, 0, 0, 0.2);
								                border-top-style: solid;
								                border-top-width: 1px;
								                box-shadow: rgba(0, 0, 0, 0.0980392) 0px 1px 3px 0px;
								                color: rgb(0, 34, 53);
								                cursor: auto;
								                display: inline;
								                font-size: 18px;
								                max-width: 100%;
								                font-weight: bold;
								                padding-bottom: 4px;
								                padding-left: 4px;
								                padding-right: 4px;
								                padding-top: 4px;
								                vertical-align: middle;
								            }
								            a {
								                color: rgb(0, 82, 130);
								                cursor: auto;
								                display: inline;
								                font-size: 18px;
								                font-weight: bold;
								                height: auto;
								                text-decoration: none;
								            }
								            h1 {
								            	color: rgb(255, 255, 255);
												font-size: 36px;
												font-weight: bold;
								            }
								            h4{
								            	font-size: 16px;
												font-weight: bold;
								            }
								            .encabezado_back {
								            	background-color: rgb(0, 76, 120);
												display: inline-block;
												width:100%;
								            }
								            .encabezado {
												display: block;
												width:70%;
												padding-left:15%;
								            }
								            .derecha{
								            	display: inline-block;
								            	float:right;
								            }
								        </style>
								    </head>
								    <body>
								        <div class="content">
									        <div class="fluid">
									            <div class="encabezado_back">
									                   <br>
									                   <div class="encabezado">
									                   	  <a href="http://www.videoaccesos.com" style="text-decoration:none;">
									                        <img src="http://www.videoaccesos.com/app/img/logo.png" alt="" style="margin-bottom:10px;">
									                      </a>
									                        <div class="derecha">
									                        	<h1>Notificación de Acceso</h1>
									                        </div>
									                   </div>
									                   <br>
									            </div>       
									            <div class="encabezado">';

			$strMensajePie = '
													<h5>
														La información contenida en este correo es confidencial y es solo para uso del interesado, queda prohibida su copia o utilización sin autorización de VIDEOACCESOS.<br><br>
														En caso de que los datos aquí contenidos no sean reales o usted detecte que la visita notificada no estaba relacionada con su domicilio, por favor notifíquenlo enviando una aclaración a registro@videoaccesos.com o llamando directamente al teléfono 667 7-59-57-70. Con lo cual nos ayudará a detectar aquellas personas que pretendan falsear su identidad para ingresar al residencial, esto ayudará a controlar más eficientemente el acceso y le proporcionará una mayor tranquilidad.<br><br>
														¡Gracias por su preferencia!<br>
														<a href="http://www.videoaccesos.com" style="text-decoration:none;">www.videoaccesos.com</a>
													</h5>
									            </div>                   
									        </div>
									    </div>
								    </body>
								</html>';

			$this->load->library('email');
			
			//$config['protocol'] = 'smtp';
			//$config['smtp_host'] = 'mail.zonahs.com.mx';
			//$config['smtp_host'] = 'localhost';
			//$config['smtp_user'] = 'monitoreo@videoaccesos.com';
			//$config['smtp_pass'] = 'm0n1t0re0';
			
			$config['charset'] = 'utf-8';
			$config['wordwrap'] = TRUE;
			$config['mailtype'] = 'html';

			$this->email->initialize($config);
			$res = $this->registroaccesos->enviar_notificaciones_emails($intRegistroAccesoID);
			$strmensaje = '<br><h4>';
			if($res['data']['estatus_id'] == 1)
				$strmensaje .= 'Se ha autorizado una petición de acceso a su residencia, ';
			else if($res['data']['estatus_id'] == 2)
				$strmensaje .= 'Se ha rechazado una petición de acceso a su residencia, ';
			else
				$strmensaje .= 'Se ha pedido al solicitante utilizar su número de interfón para acceder a su residencia, ';

			$strmensaje .= 'en '.$res['data']['privada'].', '.$res['data']['calle'].', #'.$res['data']['nro_casa'].': <br>';

			$strmensaje .= '<ul>';
	        $strmensaje .= ' <li><bold>Fecha:</bold> '.$res['data']['fecha'].'</li>';
			$strmensaje .= ' <li><bold>Hora:</bold> '.$res['data']['hora'].'</li> ';
	        $strmensaje .= ' <li><bold>Solicito:</bold> '.$res['solicitante'].'</li> ';
	        $strmensaje .= ' <li><bold>Tipo de Gestión:</bold> '.$res['data']['tipo_gestion'].'</li> ';
	        $strmensaje .= '</ul>';
	        $strmensaje .= 'Imagen registrada del evento: <br>
							<a href="http://www.videoaccesos.com/detalles_notificacion.php?img='.str_replace(".","%2e",$res['data']['imagen']).'">
							    <img src="http://www.videoaccesos.com/app/uploads/'.$res['data']['imagen'].'" alt="Imagén del evento!" class="img-polaroid" >
							</a><br>
							Esta imagen es para fines demostrativos no necesariamente corresponde a la persona que solicito el acceso.
							<br><br>';
			if($res['data']['observaciones'] != "")
	        	$strmensaje .= 'Observaciones: '.$res['data']['observaciones'].'.<br><br>';
			$strmensaje .= '</h4>';

			
			//$this->email->from('monitoreo@videoaccesos.com', 'Video Accesos');
			$this->email->from('registro@videoaccesos.com', 'Video Accesos');
			$this->email->to(strtolower($res['residentes'])); 
			//$this->email->to('alejandro_alex06@hotmail.com'); 
			$this->email->subject('Control de Accesos Notificación');
			$this->email->message($strMensajeHeader.$strmensaje.$strMensajePie);
			$this->email->set_alt_message('
Se realizo una petición de acceso a su residencia,en '.$res['data']['privada'].', '.$res['data']['calle'].', #'.$res['data']['nro_casa'].': 

    Fecha:    '.$res['data']['fecha'].'
    Hora:     '.$res['data']['hora'].' 
    Solicito: '.$res['solicitante'].'
    Tipo de Gestión:  '.$res['data']['tipo_gestion'].'

Gracias por su Preferencia!!!    
Para deshabilitar  las notificaciones a este correo, favor de reportarlo en nuestro sitio Web!!!
www.videoaccesos.com
			');
			if($res['residentes'] != "")
				$this->email->send();

			$this->email->from('registro@videoaccesos.com', 'Video Accesos');
			$this->email->to(strtolower($res['acceso'])); 
			//$this->email->to('alejandro_alex06@hotmail.com'); 
			
			$this->email->subject('Control de Accesos Notificación');
			$strmensaje = '<br><h4>';
			if($res['data']['estatus_id'] == 1)
				$strmensaje .= 'Su petición de acceso ha sido exitosa: "'.$res['solicitante'].'", ¡Bienvenido!';
			else if($res['data']['estatus_id'] == 2)
				$strmensaje .= 'Su petición de acceso ha sido rechazada: "'.$res['solicitante'].'", ¡Lo sentimos, usted comprenderá! ';
			else
				$strmensaje .= 'Su petición de acceso ha sido registrada: "'.$res['solicitante'].'", ¡Hasta la Próxima!';
			$strmensaje.= '</h4><br><br>';

			$this->email->message($strMensajeHeader.$strmensaje.$strMensajePie);
 			$this->email->set_alt_message('
Su petición de acceso ha sido registrada "'.$res['solicitante'].'". 

Gracias por su tiempo!!!
Si este no es su correo electrónico, favor de reportarlo en nuestro sitio Web!!!
www.videoaccesos.com
 			');	
 			if($res['acceso'] != "")
				$this->email->send();
		}

		// Solicitante // filtro entre Residentes, Visitantes y Registro General
		public function autocompleteSolicitantes($intResidenciaID = 0){
		    if(isset($_POST['q']) && isset($_POST['limit'])){
		    	
		    	$this->load->model('catalogos/residencias_residentes_model','residentes');
		    	$this->load->model('catalogos/residencias_visitantes_model','visitantes');
		    	$this->load->model('catalogos/registrosgenerales_model','reg_gen');

			 	$q = strtolower($_POST['q']);
			 	$limit = $_POST['limit'];
			 	if($intResidenciaID != 0){
				 	$rows = array_merge ($this->residentes->autocomplete(trim($q),$limit,$intResidenciaID),
				 						 $this->visitantes->autocomplete(trim($q),$limit,$intResidenciaID),
				 						 $this->reg_gen->autocomplete(trim($q),$limit));
			 	}
			 	else{
			 		$rows[0]['value'] = "Seleccione una Residencia!!!";
			 		$rows[0]['data'] = "";
			 	}

		      	$this->output->set_content_type('application/json')->set_output(json_encode($rows));
		    }
		}

		public function info_Solicitante(){
		    	$this->load->model('catalogos/residencias_visitantes_model','visitantes');
		    	$this->load->model('catalogos/registrosgenerales_model','reg_gen');

			 	$res = $this->reg_gen->info($this->input->post('strSolicitanteID'));
			 	if(!$res)
					$res = $this->visitantes->info($this->input->post('strSolicitanteID'));
				if(!$res)
					$res = NULL;
		      	$this->output->set_content_type('application/json')->set_output(json_encode( $res ));
		}

		//Muestra la Vista en el Popup
		public function upload_file_popup($intRegistroAccesoID,$strImagen){
			$data['intRegistroAccesoID'] = $intRegistroAccesoID;
			$data['strImagen'] = $strImagen;
			$this->load->view('procesos/registroaccesos_upload_file.php',$data);
		}

		public function upload_file()
		{
			if(is_numeric($this->input->post('intRegistroAccesoID'))){
		   		$file_element_name = 'userfile';
			   
			    $config['upload_path'] = './uploads/';
			    $config['allowed_types'] = 'jpg';
			    $config['max_size']  = 1024 * 8;
			    $config['encrypt_name'] = TRUE;
			 
			    $this->load->library('upload', $config);
		
			    if (!$this->upload->do_upload($file_element_name))
			    {
			       $arr = array( 'resultado' => 0,
			       				 'status' => 'error',
								  //'tipo' => $res,
								  'msg' => $this->upload->display_errors('', ''));
			    }
			   else
			    {
			       $data = $this->upload->data();
			       $target = './uploads/'.$this->input->post('strImagen');
			       if(file_exists($target))
			       		unlink($target);
			       rename('./uploads/'.$data['file_name'], $target);

		           $arr = array( 'resultado' => 1,
		          				 'status' => 'success',
							     //'tipo' => $res,
					             'msg' => 'La Imagen se guardo correctamente!!');
			    }
			    @unlink($_FILES[$file_element_name]);
		  	}else{
		  		$arr = array( 'resultado' => 0,
		  					  'status' => 'error',
							  //'tipo' => $res,
							  'msg' => 'Error!, se requiere de ID!' );
		  	}
		   
		   //$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		   echo json_encode($arr);
		}

		public function no_upload(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('strImagen', 'Imagen', '');
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				if(is_numeric($this->input->post('intRegistroAccesoID'))){
					$res=$this->registroaccesos->asignarImagen(
						$this->input->post('intRegistroAccesoID'),
						$this->input->post('strImagen')
					);	
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Registro no se guardo correctamente, vuelva a intentarlo!</div>');
				else {
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
								  'id' => $this->input->post('intRegistroAccesoID'),
								  'imagen' => $strImagen,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Registro se guardo correctamente!</div>');
				}
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
	}
 ?>