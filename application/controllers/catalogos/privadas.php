<?php 
	class Privadas extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'privadas';
	      $this->data['formulario'] = 'PRIVADAS';
	      $this->bolAcceso = $this->Acceso('Privadas');
	      $this->load->model('catalogos/privadas_model','privadas');
	    }

		public function index(){
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("catalogos/privadas",NULL,TRUE);
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
			$result = $this->privadas->filtro(
				                             $this->input->post('strBusqueda'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['privadas'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			$id = $this->input->post('intPrivadaID');
			if(is_numeric($id)){
				$row = $this->privadas->buscar($id);
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
			$id = $this->input->post('intPrivadaID');
			if(is_numeric($id)){
				$res = $this->privadas->eliminar($id);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La Privada no se pudo eliminar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La Privada se elimino correctamente!</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');

			//Variables de validación
			$bolUniqueRule = '';//Bandera que se utiliza para saber si existe o no la privada
			
			//Variables que se utilizan para validar datos y evitar duplicidad de información 
		    $intPrivadaID=$this->input->post('intPrivadaID');
		    //Variables que se utilizan para validar la descripción de la privada
		    $strDescripcion=$this->input->post('strDescripcion');
		    $strDescripcionAnterior=$this->input->post('strDescripcionAnterior');

		  
		    /*if($this->input->post('intPrivadaID') == "") 
				$this->form_validation->set_rules('strDescripcion', 'Descripcion', 'required|max_length[80]|is_unique[privadas.descripcion]');
			else*/

            //Verificar si la privada ya existe.
            if (($strDescripcionAnterior != $strDescripcion && trim($strDescripcionAnterior) != '') || $intPrivadaID== '') {
               //Se concatena el método callback__checkExistenciaPrivada para verificar que no exista 
            	//una privada con la misma descripción
                $bolUniqueRule = "|callback__checkExistenciaPrivada";  
                
            }


           
			//Definir las reglas de validación
			$this->form_validation->set_rules('strDescripcion', 'Descripción', 'required|max_length[80]'.$bolUniqueRule);
			$this->form_validation->set_rules('strApePaterno', 'Apellido Paterno', 'max_length[50]');
			$this->form_validation->set_rules('strApeMaterno', 'Apellido Materno', 'max_length[50]');
			$this->form_validation->set_rules('strNombre', 'Nombre', 'required|max_length[50]');
			$this->form_validation->set_rules('intTipoContactoID', 'Tipo Contacto', 'required|integer');
			$this->form_validation->set_rules('strTelefono', 'Teléfono', 'max_length[14]');
			$this->form_validation->set_rules('strCelular', 'Celular', 'max_length[14]'); 
			$this->form_validation->set_rules('strEmail', 'E-Mail', 'max_length[60]|valid_email');
			$this->form_validation->set_rules('intPrecioVehicular', 'Precio Vehicular', 'required');
			$this->form_validation->set_rules('intPrecioPeatonal', 'Precio Peatonal', 'required');
			$this->form_validation->set_rules('intPrecioMensualidad', 'Precio Mensualidad', 'required'); 
			$this->form_validation->set_rules('strHistorial', 'Historial E-Mail', 'max_length[60]|valid_email'); 
			$this->form_validation->set_rules('strFechaVence', 'Fecha Vencimiento', 'max_length[10]'); 
			$this->form_validation->set_rules('strObservaciones', 'Observaciones', '');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
		    $this->form_validation->set_rules('strDNS1', 'DNS 1', 'max_length[100]'); 
			$this->form_validation->set_rules('strPuerto1', 'Puerto 1', 'max_length[5]'); 
			$this->form_validation->set_rules('strAlias1', 'Alias del DNS 1', 'max_length[100]'); 
			$this->form_validation->set_rules('strDNS2', 'DNS 2', 'max_length[100]'); 
			$this->form_validation->set_rules('strPuerto2', 'Puerto 2', 'max_length[5]'); 
			$this->form_validation->set_rules('strAlias2', 'Alias del DNS 2', 'max_length[100]'); 
			$this->form_validation->set_rules('strDNS3', 'DNS 3', 'max_length[100]'); 
			$this->form_validation->set_rules('strPuerto3', 'Puerto 3', 'max_length[5]'); 
			$this->form_validation->set_rules('strAlias3', 'Alias del DNS 3', 'max_length[100]'); 
			$this->form_validation->set_rules('strVideo1', 'Video 1', 'max_length[100]'); 
			$this->form_validation->set_rules('strAliasVideo1', 'Alias del Video 1', 'max_length[100]'); 
			$this->form_validation->set_rules('strVideo2', 'Video 2', 'max_length[100]'); 
			$this->form_validation->set_rules('strAliasVideo2', 'Alias del Video 2', 'max_length[100]'); 
			$this->form_validation->set_rules('strVideo3', 'Video 3', 'max_length[100]'); 
			$this->form_validation->set_rules('strAliasVideo3', 'Alias del Video 3', 'max_length[100]'); 
			//Definir reglas de validación
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($intPrivadaID)){
					$res=$this->privadas->modificar(
						$intPrivadaID,
						$strDescripcion,
						$this->input->post('strApePaterno'),
						$this->input->post('strApeMaterno'),
						$this->input->post('strNombre'),
						$this->input->post('intTipoContactoID'),
						$this->input->post('strTelefono'),
						$this->input->post('strCelular'),
						$this->input->post('strEmail'),
						$this->input->post('intPrecioVehicular'),
						$this->input->post('intPrecioPeatonal'),
						$this->input->post('intPrecioMensualidad'),
						$this->input->post('strHistorial'),
						$this->input->post('strFechaVence'),
						$this->input->post('strObservaciones'),
						$this->input->post('strDNS1'),
						$this->input->post('strPuerto1'),
						$this->input->post('strAlias1'),
						$this->input->post('strTipoTarjeta1'),
						$this->input->post('strContrasena1'),
						$this->input->post('strDNS2'),
						$this->input->post('strPuerto2'),
						$this->input->post('strAlias2'),
						$this->input->post('strTipoTarjeta2'),
						$this->input->post('strContrasena2'),
						$this->input->post('strDNS3'),
						$this->input->post('strPuerto3'),
						$this->input->post('strAlias3'),
						$this->input->post('strTipoTarjeta3'),
						$this->input->post('strContrasena3'),
						$this->input->post('strVideo1'),
						$this->input->post('strAliasVideo1'),
						$this->input->post('strVideo2'),
						$this->input->post('strAliasVideo2'),
					    $this->input->post('strVideo3'),
						$this->input->post('strAliasVideo3'),
						$this->input->post('intEstatusID')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->privadas->guardar(
							$strDescripcion,
							$this->input->post('strApePaterno'),
							$this->input->post('strApeMaterno'),
							$this->input->post('strNombre'),
							$this->input->post('intTipoContactoID'),
							$this->input->post('strTelefono'),
							$this->input->post('strCelular'),
							$this->input->post('strEmail'),
							$this->input->post('intPrecioVehicular'),
							$this->input->post('intPrecioPeatonal'),
							$this->input->post('intPrecioMensualidad'),
							$this->input->post('strHistorial'),
							$this->input->post('strFechaVence'),
							$this->input->post('strObservaciones'),
							$this->input->post('strDNS1'),
							$this->input->post('strPuerto1'),
							$this->input->post('strAlias1'),
							$this->input->post('strTipoTarjeta1'),
						    $this->input->post('strContrasena1'),
							$this->input->post('strDNS2'),
							$this->input->post('strPuerto2'),
							$this->input->post('strAlias2'),
							$this->input->post('strTipoTarjeta2'),
						    $this->input->post('strContrasena2'),
							$this->input->post('strDNS3'),
							$this->input->post('strPuerto3'),
							$this->input->post('strAlias3'),
							$this->input->post('strTipoTarjeta3'),
						    $this->input->post('strContrasena3'),
							$this->input->post('strVideo1'),
							$this->input->post('strAliasVideo1'),
							$this->input->post('strVideo2'),
							$this->input->post('strAliasVideo2'),
						    $this->input->post('strVideo3'),
							$this->input->post('strAliasVideo3'),
							$this->input->post('intEstatusID')
							);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Privada no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Privada se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

        //Método que se utiliza para actualizar los datos del DNS seleccionado
		public function modificarDNSS(){ 
			$this->load->library('form_validation');
			//Definir las reglas de validación
			$this->form_validation->set_rules('strDNS', 'DNS', 'max_length[100]'); 
			$this->form_validation->set_rules('strPuerto', 'Puerto', 'max_length[5]'); 
			$this->form_validation->set_rules('strAlias', 'Alias', 'max_length[100]');
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intPrivadaID'))){
					$res=$this->privadas->modificarDNSS(
						$this->input->post('intPrivadaID'),
						$this->input->post('intDNSID'),
						$this->input->post('strDNS'),
						$this->input->post('strPuerto'),
						$this->input->post('strAlias'),
						$this->input->post('strTipoTarjeta'),
						$this->input->post('strContrasena')
					);	
					$intTipo=1;
				}
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El DNS no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}



        //Verifica existencia de la descripción de la privada en la bd.
		// para así poder (evitar duplicación de datos)  modificar o guardar.
	    function _checkExistenciaPrivada($strDescripcion) {
	        //Comprobar existencia de privada
	        $this->db->where('descripcion', $strDescripcion);
	        $this->db->where('estatus_id <>',3);
	        $dbQuery=$this->db->get('privadas');
	        
	        //Si devuelve datos
            if ($dbQuery->num_rows() > 0) {
            	//Enviar mensaje de error
            	$this->form_validation->set_message('_checkExistenciaPrivada', 'La %s ya ha sido registrada, favor de verificar.');
                //Existe la descripción de la privada
                return FALSE;
            } else {
               //No existe la descripción de la privada
                return TRUE;
            }
	        
	    }
        //Verifica existencia del DNS (por privada) en la bd.
		// para así poder (evitar duplicación de datos)  modificar o guardar.
	    function checkExistenciaDNS() {
	    	$intPrivadaID=$this->input->post('intPrivadaID');
	    	$strDNS=$this->input->post('strDNS');
            //Comprobar existencia
	        $this->db->where("(dns_1 ='$strDNS' OR dns_2='$strDNS'
			               	   OR dns_3='$strDNS') ");
	        $this->db->where('privada_id',$intPrivadaID);
	        $dbQuery=$this->db->get('privadas');
		     //Si devuelve datos
            if ($dbQuery->num_rows() > 0) {
            	 //Existe DNS en la privada
            	$res=FALSE;
            	//Enviar mensaje de error
            	$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El DNS (URL) ya existe en la privada, favor de verificar!</div>');
		
            } else {
                //No existe DNS en la privada
            	$res=TRUE;
            	$arr = array( 'resultado' => 1,
								  'tipo' => $res,
								  'mensajes' => '');
		
            }
            //Enviar resultado a la vista
            $this->output->set_content_type('application/json')->set_output(json_encode($arr));
	    	
	        
	    }

	     //Verifica existencia del video (por privada) en la bd.
		// para así poder (evitar duplicación de datos)  modificar o guardar.
	    function checkExistenciaVideo() {
	    	$intPrivadaID=$this->input->post('intPrivadaID');
	    	$strVideo=$this->input->post('strVideo');
            //Comprobar existencia
	        $this->db->where("(video_1 ='$strVideo' OR video_2='$strVideo'
			               	   OR video_3='$strVideo') ");
	        $this->db->where('privada_id',$intPrivadaID);
	        $dbQuery=$this->db->get('privadas');
		    //Si devuelve datos
            if ($dbQuery->num_rows() > 0) {
            	 //Existe video en la privada
            	$res=FALSE;
            	//Enviar mensaje de error
            	$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Video (URL) ya existe en la privada, favor de verificar!</div>');
		
            } else {
                //No existe video en la privada
            	$res=TRUE;
            	$arr = array( 'resultado' => 1,
								  'tipo' => $res,
								  'mensajes' => '');
		
            }
            //Enviar resultado a la vista
            $this->output->set_content_type('application/json')->set_output(json_encode($arr));
	    	
	        
	    }

	    public function generarImagen(){

	        $Base64Img= $this->input->post('strBase64Img');
	        //ECHO 'LA IMAGEN ES '.$Base64Img;
	        //imagen jpg codificada en base64
		   // $Base64Img = "data:image/octet-stream;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACWCAYAAABkW7XSAAAEYklEQVR4Xu3UAQkAAAwCwdm/9HI83BLIOdw5AgQIRAQWySkmAQIEzmB5AgIEMgIGK1OVoAQIGCw/QIBARsBgZaoSlAABg+UHCBDICBisTFWCEiBgsPwAAQIZAYOVqUpQAgQMlh8gQCAjYLAyVQlKgIDB8gMECGQEDFamKkEJEDBYfoAAgYyAwcpUJSgBAgbLDxAgkBEwWJmqBCVAwGD5AQIEMgIGK1OVoAQIGCw/QIBARsBgZaoSlAABg+UHCBDICBisTFWCEiBgsPwAAQIZAYOVqUpQAgQMlh8gQCAjYLAyVQlKgIDB8gMECGQEDFamKkEJEDBYfoAAgYyAwcpUJSgBAgbLDxAgkBEwWJmqBCVAwGD5AQIEMgIGK1OVoAQIGCw/QIBARsBgZaoSlAABg+UHCBDICBisTFWCEiBgsPwAAQIZAYOVqUpQAgQMlh8gQCAjYLAyVQlKgIDB8gMECGQEDFamKkEJEDBYfoAAgYyAwcpUJSgBAgbLDxAgkBEwWJmqBCVAwGD5AQIEMgIGK1OVoAQIGCw/QIBARsBgZaoSlAABg+UHCBDICBisTFWCEiBgsPwAAQIZAYOVqUpQAgQMlh8gQCAjYLAyVQlKgIDB8gMECGQEDFamKkEJEDBYfoAAgYyAwcpUJSgBAgbLDxAgkBEwWJmqBCVAwGD5AQIEMgIGK1OVoAQIGCw/QIBARsBgZaoSlAABg+UHCBDICBisTFWCEiBgsPwAAQIZAYOVqUpQAgQMlh8gQCAjYLAyVQlKgIDB8gMECGQEDFamKkEJEDBYfoAAgYyAwcpUJSgBAgbLDxAgkBEwWJmqBCVAwGD5AQIEMgIGK1OVoAQIGCw/QIBARsBgZaoSlAABg+UHCBDICBisTFWCEiBgsPwAAQIZAYOVqUpQAgQMlh8gQCAjYLAyVQlKgIDB8gMECGQEDFamKkEJEDBYfoAAgYyAwcpUJSgBAgbLDxAgkBEwWJmqBCVAwGD5AQIEMgIGK1OVoAQIGCw/QIBARsBgZaoSlAABg+UHCBDICBisTFWCEiBgsPwAAQIZAYOVqUpQAgQMlh8gQCAjYLAyVQlKgIDB8gMECGQEDFamKkEJEDBYfoAAgYyAwcpUJSgBAgbLDxAgkBEwWJmqBCVAwGD5AQIEMgIGK1OVoAQIGCw/QIBARsBgZaoSlAABg+UHCBDICBisTFWCEiBgsPwAAQIZAYOVqUpQAgQMlh8gQCAjYLAyVQlKgIDB8gMECGQEDFamKkEJEDBYfoAAgYyAwcpUJSgBAgbLDxAgkBEwWJmqBCVAwGD5AQIEMgIGK1OVoAQIGCw/QIBARsBgZaoSlAABg+UHCBDICBisTFWCEiBgsPwAAQIZAYOVqUpQAgQMlh8gQCAjYLAyVQlKgIDB8gMECGQEDFamKkEJEDBYfoAAgYyAwcpUJSgBAgbLDxAgkBEwWJmqBCVAwGD5AQIEMgIGK1OVoAQIGCw/QIBARsBgZaoSlACBB1YxAJfjJb2jAAAAAElFTkSuQmCC";
				//Eliminamos data:image/jpg; y base64, de la cadena que tenemos                 
			list(, $Base64Img) = explode(';', $Base64Img);
			list(, $Base64Img) = explode(',', $Base64Img);
			//Decodificamos $Base64Img codificada en base64.
			$Base64Img = base64_decode($Base64Img);
			//escribimos la información obtenida en un archivo llamado 
			//unodepiera.jpg para que se cree la imagen correctamente
			//NOMBRE IMAGEN imgIDREGISTROACCESO
			file_put_contents('./uploads/unodepiera.png', $Base64Img);    
			//echo "<img src='./uploads/unodepiera.png' alt='unodepiera' />";
	      
	    }


		public function cambiar_estado(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intPrivadaID', 'Privada', 'required|integer');
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
				$res = $this->privadas->cambiar_estado(
						 $this->input->post('intPrivadaID'),
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
		
		public function autocomplete(){
		    if(isset($_POST['q']) && isset($_POST['limit'])){
			 	$q = strtolower($_POST['q']);
			 	$limit = $_POST['limit'];
		      	$this->output->set_content_type('application/json')->set_output(json_encode($this->privadas->autocomplete($q,$limit)));
		    }
		}

		public function opciones(){
			$arr['privadas'] = $this->privadas->privadas_cmb();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
public function opcionesMC(){
			$arr['privadas'] = $this->privadas->privadas_cmbMC();
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function opcionesDNS(){
			$intPrivadaID = $this->input->post('intPrivadaID');
			$arr['dns'] = $this->privadas->dnsprivadas_cmb($intPrivadaID);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function opcionesVideos(){
			$intPrivadaID = $this->input->post('intPrivadaID');
			$arr['video'] = $this->privadas->videosprivadas_cmb($intPrivadaID);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}


		public function info_privada(){
				$this->output->set_content_type('application/json')->set_output(
			   json_encode($this->privadas->info($this->input->post('intPrivadaID'))));
		}
	}
 ?>