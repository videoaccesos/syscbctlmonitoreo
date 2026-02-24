<?php 
class Permisosaccesos extends MY_Controller
	{
		var $bolAcceso = FALSE;
		var $data = null;

		function __construct () {
	      parent::__construct ();
	      $this->data['strProceso'] = 'permisosacceso';
	      $this->bolAcceso = $this->Acceso('PermisosAcceso');
	      $this->load->model('seguridad/permisosacceso_model','permisos');
	    }

	    public function index(){
			$this->data['contenido'] = $this->load->view('sistema/stop.php','',TRUE);
			$this->load->view('sistema/sistema.php',$this->data);
		}

		public function agregar_permiso(){ 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intGrupoUsuarioID', 'Grupo', 'required|integer');
			$this->form_validation->set_rules('intSubprocesoID', 'SubProceso', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				
				$res = $this->permisos->agregar_subproceso(
												$this->input->post('intGrupoUsuarioID'),
												$this->input->post('intSubprocesoID')
											);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El SubProceso no se agrego correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El SubProceso se agrego correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function eliminar_permiso(){ 
			$this->load->library('form_validation');
			$this->form_validation->set_rules('intGrupoUsuarioID', 'Grupo', 'required|integer');
			$this->form_validation->set_rules('intSubprocesoID', 'SubProceso', 'required|integer');
			
			if ($this->form_validation->run() == FALSE) {
                 $arr = array( 
                 	        'resultado' => 0,
                 			'mensajes' => validation_errors('<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>','</div>')
                 	    );
			}
			else {
				$res = $this->permisos->eliminar_subproceso(
												$this->input->post('intGrupoUsuarioID'),
												$this->input->post('intSubprocesoID')
											);
				if($res) 
					$arr = array( 'resultado' => 0,
								  'tipo' => $res,
								  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>El SubProceso no se elimino correctamente, vuelva a intentarlo!</div>');
				else 
					$arr = array( 'resultado' => 1,
								  'tipo' => $res,
						          'mensajes' => '<div class="alert alert-success"><a class="close" data-dismiss="alert">×</a>El SubProceso se elimino correctamente!</div>');
			}
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}

		public function buscar(){
			$arr['rows'] = $this->permisos->buscar_permisos($this->input->post('intGrupoUsuarioID'),$this->input->post('intProcesoID'));
			$this->output->set_content_type('application/json')->set_output(json_encode($arr));
		}


	}
 ?>