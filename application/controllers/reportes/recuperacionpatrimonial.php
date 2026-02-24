<?php 
class RecuperacionPatrimonial extends MY_controller
	{
		var $bolAcceso = FALSE;
		var $data = NULL;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'recuperacionpatrimonial';
	      $this->data['formulario'] = 'RECUPERACIÓN PATRIMONIAL';
	      $this->bolAcceso = $this->Acceso('Recuperacion Patrimonial Con');
	      //Cargar modelo de recuperación patrimonial
	      $this->load->model('procesos/recuperacionpatrimonial_Model','recuperacion_patrimonial');
	     
	    }

		public function index(){
			$this->data['fecha'] = substr($this->session->userdata('fecha'),8,2)."-".substr($this->session->userdata('fecha'),5,2)."-".substr($this->session->userdata('fecha'),0,4);
			if($this->bolAcceso)
				$this->data['contenido'] = $this->load->view("reportes/recuperacionpatrimonial",$this->data,TRUE);
			else
				$this->data['contenido'] = $this->load->view('sistema/stop.php',NULL,TRUE);
			$this->load->view('sistema/sistema.php',$this->data);	
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
				$res = $this->recuperacion_patrimonial->filtro_consulta(
												 $this->db->escape_str($this->input->post('strFechaInicio')),
												 $this->db->escape_str($this->input->post('strFechaFin')),
												 $this->input->post('intPrivadaID'),
												 $this->db->escape_str($this->input->post('strResponsable')),
			                           			 $this->input->post('strTipoDano'),
			                           			 $this->input->post('strFolio'),
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

		//Método para regresar todos los involucrados  registrados (y poder cargarlos en un autocomplete).
		public function autocompleteResponsable(){
		    if(isset($_POST['q']) && isset($_POST['limit'])){
			 	$q = strtolower($_POST['q']);
			 	$limit = $_POST['limit'];
			 	//Ejecutar el Método autocompleteResponsable del modelo, 
			    //para obtener todos los involucrados  que coincidan con la descripción.
		      	$this->output->set_content_type('application/json')->set_output(json_encode($this->recuperacion_patrimonial->autocompleteResponsable($q,$limit)));
		    }
		}

        //Método para regresar todos los folios  registrados (y poder cargarlos en un autocomplete).
		public function autocompleteFolio(){
		    if(isset($_POST['q']) && isset($_POST['limit'])){
			 	$q = strtolower($_POST['q']);
			 	$limit = $_POST['limit'];
			 	//Ejecutar el Método autocompleteFolio del modelo, 
			    //para obtener todos los folios  que coincidan con la descripción.
		      	$this->output->set_content_type('application/json')->set_output(json_encode($this->recuperacion_patrimonial->autocompleteFolio($q,$limit)));
		    }
		}

		

	}
?>