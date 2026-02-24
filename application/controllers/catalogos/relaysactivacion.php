<?php 
	class Relaysactivacion extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;
		function __construct () {
	      parent::__construct ();
	      $this->load->model('catalogos/relaysactivacion_model','relaysactivacion');
	    }


	    //Función que se utiliza para guardar los datos de activación de relays 
		public function guardar(){ 
			$this->load->library('form_validation');
			//Recuperar valores de la vista
			$intPrivadaID=$this->input->post('intPrivadaID');
			$intDNSID=$this->input->post('intDNSID');
			$intRenglonID=$this->input->post('intRenglonID');
			$strRelays=$this->input->post('strRelays');
			$strTiempo=$this->input->post('strTiempo');
		    $strTipoTarjeta=$this->input->post('strTipoTarjeta');
		    $strURLTarjeta2=$this->input->post('strURLTarjeta2');
		    $strContrasenaTarjeta2=$this->input->post('strContrasenaTarjeta2');
		    $strRespuetaTarjeta2="";
		    //Primer relays en caso de que sean más de uno  ejemplo: 1,2,3 será el 1 el que se tomara
		    //en cuenta y así asignar el estado del relays desde la lectura del xml 
		    $intIndiceRelayTarjeta2=$this->input->post('intIndiceRelayTarjeta2');
			

			//Definir las reglas de validación
			$this->form_validation->set_rules('intPrivadaID', 'Privada', 'required|integer');
			$this->form_validation->set_rules('intDNSID', 'DNS', 'required|integer');
			$this->form_validation->set_rules('intRenglonID', 'Renglon', 'required|integer');
			$this->form_validation->set_rules('strRelays', 'Relays', 'required');
		    $this->form_validation->set_rules('strTiempo', 'Tiempo', 'required');
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				//Si el tipo de tarjeta es 1
				if($strTipoTarjeta=='Tarjeta 1')
				{

					$strEstado=$this->input->post('strEstado');
				}
				else //Si el tipo de tarjeta 2 recuperar respuesta del servidor (xml que contiene los estados de los relays)
				{
					//Formar  URL del servidor  
					$URL=$strURLTarjeta2."/current_state.xml?pw=".$strContrasenaTarjeta2;
					
						
					//Write status	
				    foreach ($_POST as $key => $value) {
						$URL=$URL.'&'.$key;
						$URL=$URL.'='.$value;
					}
					$strRespuetaTarjeta2 =file_get_contents($strURLTarjeta2);
					//Read status
					$xml = new SimpleXMLElement($strRespuetaTarjeta2);
					$RelayNames;
					$RelayStates;
					$i=0;
					//Recorrer archivo xml para recuperar valores del relays
					foreach($xml as $key => $val) {
					   $RelayStates[$i]=$val->State;
					   $RelayNames[$i]=$val->Name;
					   $i++;
					}
					//Decrementar 1 al indice del relays
					 $intIndiceRelayTarjeta2=($intIndiceRelayTarjeta2-1);

					 //Asignar el estado del relays 
					 $strEstado=$RelayStates[$intIndiceRelayTarjeta2];


				}
				//Cambiar el valor del estado
				if($strEstado=='1')//1-Activo
				{
					$strEstado='Activo';
				}
				else
				{   //0-Inactivo
					$strEstado='Inactivo';

				}
				$intTipo = 1;
				$res=$this->relaysactivacion->guardar(
						$intPrivadaID,
						$intDNSID,
						$intRenglonID,
						$strRelays,
						$strEstado,
						$strTiempo
						);

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>La Activación de relays no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>La Activación de relays se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function paginacion_consulta(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('strFechaInicio', 'Fecha Inicio', 'required|max_length[10]');
			$this->form_validation->set_rules('strFechaFin', 'Fecha Final', 'required|max_length[10]');
			$this->form_validation->set_rules('intPagina', 'Pagina', 'integer');
			if ($this->form_validation->run()) {
				$this->load->library('pagination');
				$config['base_url'] = '';
				$config['per_page'] = 10; 
				$config['first_link'] = '<< Primero'; 
				$config['last_link'] = 'Ultimo >>'; 
				$config['cur_page'] =  $this->input->post('intPagina');
				$res = $this->relaysactivacion->filtro_consulta(
												 $this->db->escape_str($this->input->post('strFechaInicio')),
												 $this->db->escape_str($this->input->post('strFechaFin')),
												 $this->input->post('intPrivadaID'),
												 $this->db->escape_str($this->input->post('intUsuarioID')),
			                           			 $this->input->post('strTiempo'),
			                           			 $this->input->post('strConcepto'),
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

		
	}
 ?>