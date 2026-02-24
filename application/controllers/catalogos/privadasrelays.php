<?php 
	class PrivadasRelays extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'privadas';
	      $this->data['formulario'] = 'PRIVADAS';
	      $this->bolAcceso = $this->Acceso('Privadas');
	      $this->load->model('catalogos/privadasrelays_model','privadas');
	     
	    }


		public function paginacion(){
			$this->load->library('pagination');
			$config['base_url'] = '';
			$config['per_page'] = 2; 
			$config['first_link'] = '<< Primero'; 
			$config['last_link'] = 'Ultimo >>'; 
			$config['cur_page'] =  $this->input->post('intPagina');
			$result = $this->privadas->filtro(
				                             $this->input->post('intPrivadaID'),
				                             $this->input->post('intDNSID'),
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
			$intPrivadaID = $this->input->post('intPrivadaID');
			$intDNSID = $this->input->post('intDNSID');
			$intRenglonID = $this->input->post('intRenglonID');
			if(is_numeric($intPrivadaID)&& is_numeric($intDNSID) && is_numeric($intRenglonID)){
				$row = $this->privadas->buscar($intPrivadaID,$intDNSID,$intRenglonID);
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
			$intPrivadaID = $this->input->post('intPrivadaID');
			$intDNSID = $this->input->post('intDNSID');
			$intRenglonID = $this->input->post('intRenglonID');
			if(is_numeric($intPrivadaID)&& is_numeric($intDNSID) && is_numeric($intRenglonID)){
				$res = $this->privadas->eliminar($intPrivadaID,$intDNSID,$intRenglonID);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Relays no se pudo eliminar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Relays se elimino correctamente!</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}


		public function guardar(){ 
			$this->load->library('form_validation');
			$bolUniqueConceptoRule = '';//Bandera que se utiliza para saber si existe o no el concepto en el dns
			$bolUniqueRelaysRule = '';//Bandera que se utiliza para saber si existe o no el relays en el dns
			//Variables que se utilizan para validar la existencia del concepto y relays en el dns seleccionado
			$intRenglonID=$this->input->post('intRenglonID');
			$intPrivadaID=$this->input->post('intPrivadaID');
			$intDNSID=$this->input->post('intDNSID');
			$strConcepto=$this->input->post('strConcepto');
			$strConceptoAnterior=$this->input->post('strConceptoAnterior');
			$strRelays=$this->input->post('strRelays');
			$strRelaysAnterior=$this->input->post('strRelaysAnterior');
           //Verificar si el concepto ya existe en el dns de la privada.
           if (($strConceptoAnterior != $strConcepto && trim($strConceptoAnterior) != '') || $intRenglonID== '') {
               //Se concatena el método callback__checkExistenciaConcepto para verificar que no exista 
               //un concepto con la misma descripción en el dns de la privada
               $bolUniqueConceptoRule = "|callback__checkExistenciaConcepto";  
                
            }
           
         /* //Verificar si el relays ya existe en el dns de la privada.
            if (($strRelaysAnterior != $strRelays && trim($strRelaysAnterior) != '') || $intRenglonID== '') {
               
				
               //Se concatena el método callback__checkExistenciaRelays para verificar que no exista 
               //un relays con la misma descripción en el dns de la privada
               $bolUniqueRelaysRule = "|callback__checkExistenciaRelays";  
                
            }*/
			

            //Definir campos obligatorios
            $this->form_validation->set_rules('intPrivadaID', 'Privada', 'trim|required');
            $this->form_validation->set_rules('intDNSID', 'DNS', 'trim|required');
           	$this->form_validation->set_rules('strConcepto', 'Concepto', 'trim|required'.$bolUniqueConceptoRule);
			$this->form_validation->set_rules('strRelays', 'Relays', 'trim|required'.$bolUniqueRelaysRule);
		
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-danger"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($intRenglonID)){
					$res=$this->privadas->modificar(
						 $intPrivadaID,
						 $intDNSID,
						 $intRenglonID,
						 $strConcepto,
						 $strRelays,
						 $this->input->post('strEstado')
					);	
					$intTipo=1;
				}
				else{
					$this->db->trans_start();
						$intRenglonID = $this->GenerarRenglonRelays($intPrivadaID,$intDNSID);
						$error="";
						if($intRenglonID == "0"){
							$this->db->trans_rollback();
							$error = "No se pudo generar el renglon!!!"; // se asigna 0 para que envie error.
						}
						else{
							 $res=$this->privadas->guardar(
									 $intPrivadaID,
									 $intDNSID,
									 $intRenglonID,
									 $strConcepto,
									 $strRelays,
									 $this->input->post('strEstado')
							    );
							if($error!="")
								$this->db->trans_rollback();
							else
								$this->db->trans_commit();
						}
							
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-danger"><a class="close" data-dismiss="alert">×</a>El Relays no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Relays se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		//Verifica existencia del concepto de relays (en DNS) en la bd.
		// para así poder (evitar duplicación de datos)  modificar o guardar.
	    function _checkExistenciaConcepto($strConcepto) {
	    	$intPrivadaID=$this->input->post('intPrivadaID');
	    	$intDNSID=$this->input->post('intDNSID');
	        //Comprobar existencia
	        $this->db->where('concepto', $strConcepto);
	        $this->db->where('privada_id',$intPrivadaID);
		    $this->db->where('dns',$intDNSID);
	        $dbQuery=$this->db->get('privadas_relays');
	        //Si devuelve datos
            if ($dbQuery->num_rows() > 0) {
            	//Enviar mensaje de error
            	$this->form_validation->set_message('_checkExistenciaConcepto', 'El %s ya ha sido registrado en el DNS '. $intDNSID.', favor de verificar.');
                //Existe el concepto
                return FALSE;
            } else {
                //No existe  el concepto
                return TRUE;
            }
	        
	    }
      
	    //Verifica existencia de relays (en DNS) en la bd.
		// para así poder (evitar duplicación de datos)  modificar o guardar.
	    function _checkExistenciaRelays($strRelays) {
	    	$intPrivadaID=$this->input->post('intPrivadaID');
	    	$intDNSID=$this->input->post('intDNSID');
	    	$strRelaysAnt=$this->input->post('strRelaysAnterior');
	    	//Calcula la diferencia entre arrays con un chequeo adicional de índices
	    	//para saber que diferencia existe (nuevos relays)
	    	$arrRelaysAnterior=explode(",", $strRelaysAnt);
	    	$arrRelaysActual=explode(",", $strRelays);
	    	//Resultado de la diferencia de los arrays(ejemplo:arr1:10,15,11 y arr2:10,15,11,20 resultado=20)print_r($arrResultado);
	    	$arrResultado = array_diff_assoc($arrRelaysActual, $arrRelaysAnterior);
			//print_r($arrResultado);
            //Hacer recorrido para saber si existen coincidencias en la bd
            foreach($arrResultado as $intRelay){
				$this->db->select('relays');
				$this->db->from('privadas_relays');
			    $this->db->where('relays',$intRelay);
				$this->db->where('privada_id',$intPrivadaID);
			    $this->db->where('dns',$intDNSID);
			    if ($row = $this->db->get()->row()){
			       //Enviar mensaje de error
		            $this->form_validation->set_message('_checkExistenciaRelays', 'El Relay '.$intRelay.' ya ha sido registrado en el DNS '.$intDNSID.', favor de verificar.');
		            //Existe el relays
		            return FALSE;
			    }
			    else
			    {	
			    	//No existe  el relays
		            return TRUE;
			    }
			}//Fin de recorrido
	        
	    }


	    public function regresarRelaysPorRenglon(){
			$arr = array('row' => null,
				         'mensajes' => '',
				         );
			//Recuperar valores de la vista
			$intPrivadaID = $this->input->post('intPrivadaID');
			$intDNSID = $this->input->post('intDNSID');
			$intRenglonID = $this->input->post('intRenglonID');
			//Si se cumple la sentencia buscar relays de la privada que coinciden con el renglon seleccionado
			if(is_numeric($intPrivadaID)&& is_numeric($intDNSID) && is_numeric($intRenglonID) ){
				$row = $this->privadas->buscarRelaysPorRenglon($intPrivadaID,$intDNSID,$intRenglonID);
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


	}
 ?>