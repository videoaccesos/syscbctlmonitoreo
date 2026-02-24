<?php 
	class Empleados extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'empleados';
	      $this->data['formulario'] = 'EMPLEADOS';
	      $this->bolAcceso = $this->Acceso('Empleados');
	      $this->load->model('catalogos/empleados_model','empleados');
	    }

		public function index(){
			$this->data['fecha'] = substr($this->session->userdata('fecha'),8,2)."-".substr($this->session->userdata('fecha'),5,2)."-".substr($this->session->userdata('fecha'),0,4);
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("catalogos/empleados",$this->data,TRUE);
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
			$result = $this->empleados->filtro(
				                             $this->input->post('strBusqueda'),
				                             $this->input->post('strBusquedaPuesto'),
				                             $config['per_page'],
				                             $config['cur_page']);

			$config['total_rows'] = $result['total_rows'];
			
			$this->pagination->initialize($config); 
			$arr = array('rows' => $result['empleados'],
				         'paginacion' => $this->pagination->create_links(),
				         'pagina' => $config['cur_page'],
				         'total_rows' => $config['total_rows']);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function editar(){
			$arr = array('row' => null,
				         'mensajes' => ''
				         );
			$id = $this->input->post('intEmpleadoID');
			if(is_numeric($id)){
				$row = $this->empleados->buscar($id);
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
			$id = $this->input->post('intEmpleadoID');
			if(is_numeric($id)){
				$res = $this->empleados->eliminar($id);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Empleado no se pudo eliminar, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Empleado se elimino correctamente!</div>');
			}
			else
				$arr['mensajes'] = '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Parametro no valido!</div>';
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function guardar(){ 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('strNombre', 'Nombre', 'required|max_length[50]');
			$this->form_validation->set_rules('strApePaterno', 'Apellido Paterno', 'max_length[50]');
			$this->form_validation->set_rules('strApeMaterno', 'Apellido Materno', 'max_length[50]');
			$this->form_validation->set_rules('strNroSeguroSocial', 'Nro. Seguro Social', 'max_length[50]');
			$this->form_validation->set_rules('intPuestoID', 'Puesto', 'required|integer');
			if($this->input->post('intPuestoID') == 1)
				$this->form_validation->set_rules('strNroOperador', 'Nro. Operador', 'required|max_length[4]');
			$this->form_validation->set_rules('strCalle', 'Calle', 'max_length[60]');
			$this->form_validation->set_rules('strNroCasa', 'Nro. Casa', 'max_length[10]');
			$this->form_validation->set_rules('strSexo', 'Sexo', 'required|max_length[1]');
			$this->form_validation->set_rules('strColonia', 'Colonia', 'max_length[30]');
			$this->form_validation->set_rules('strTelefono', 'Telefono', 'max_length[14]');
			$this->form_validation->set_rules('strCelular', 'Celular', 'max_length[14]');
			$this->form_validation->set_rules('strEmail', 'E-Mail', 'max_length[60]|valid_email');
			$this->form_validation->set_rules('strFechaIngreso', 'Fecha Ingreso', 'required');
			$this->form_validation->set_rules('strFechaBaja', 'Fecha Baja', 'required');
			$this->form_validation->set_rules('strMotivoBaja', 'Motivo', '');
			$this->form_validation->set_rules('intEstatusID', 'Estado', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$intTipo = 0;
				if(is_numeric($this->input->post('intEmpleadoID'))){
					$res=$this->empleados->modificar(
						$this->input->post('intEmpleadoID'),
						$this->input->post('strNombre'),
						$this->input->post('strApePaterno'),
						$this->input->post('strApeMaterno'),
						$this->input->post('strNroSeguroSocial'),
						$this->input->post('intPuestoID'),
						$this->input->post('strNroOperador'),
						$this->input->post('strCalle'),
						$this->input->post('strNroCasa'),
						$this->input->post('strSexo'),
						$this->input->post('strColonia'),
						$this->input->post('strTelefono'),
						$this->input->post('strCelular'),
						$this->input->post('strEmail'),
						$this->input->post('strFechaIngreso'),
						$this->input->post('strFechaBaja'),
						$this->input->post('strMotivo'),
						$this->input->post('intEstatusID')
					);	
					$intTipo=1;
				}
				else{
					$res=$this->empleados->guardar(
							$this->input->post('strNombre'),
							$this->input->post('strApePaterno'),
							$this->input->post('strApeMaterno'),
							$this->input->post('strNroSeguroSocial'),
							$this->input->post('intPuestoID'),
							$this->input->post('strNroOperador'),
							$this->input->post('strCalle'),
							$this->input->post('strNroCasa'),
							$this->input->post('strSexo'),
							$this->input->post('strColonia'),
							$this->input->post('strTelefono'),
							$this->input->post('strCelular'),
							$this->input->post('strEmail'),
							$this->input->post('strFechaIngreso'),
							$this->input->post('strFechaBaja'),
							$this->input->post('strMotivo'),
							$this->input->post('intEstatusID')
							);
				}

				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El Empleado no se guardo correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El Empleado se guardo correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function cambiar_estado(){
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intEmpleadoID', 'Empleado', 'required|integer');
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
				$res = $this->empleados->cambiar_estado(
						 $this->input->post('intEmpleadoID'),
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
		      	$this->output->set_content_type('application/json')->set_output(json_encode($this->empleados->autocomplete($q,$limit)));
		    }
		}

		public function opciones(){
			$arr['empleados'] = null;
			$intPuestoID = $_POST['intPuestoID'];
			if(is_numeric($intPuestoID))
				$arr['empleados'] = $this->empleados->empleados_cmb($intPuestoID);
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}
	}
 ?>