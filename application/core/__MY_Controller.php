<?php 
class MY_Controller extends CI_Controller {

	var $predb = "";
	var $datos = null;
	
	function __construct () {
		parent::__construct();
		
		if($this->session->userdata('login') === FALSE){
			if($this->input->is_ajax_request()){
				$this->output->set_status_header(401);
				exit;
			}
			else{
			 	redirect(base_url('login'));
			 } 
		}
		//echo $this->router->fetch_directory().$this->router->fetch_class()."/".$this->router->fetch_method();
		//$this->router->fetch_directory().$this->router->fetch_class()." - ".
		//$this->router->fetch_method();
		//Comentado mientras se definie cada proceso
		/*
		if(!$this->PermisoExecucion($this->router->fetch_directory().$this->router->fetch_class()."/".$this->router->fetch_method())){
			$arr = array( 'resultado' => 0,
						  'tipo' => 'Error, no tieme Permisos de Ejecución',
						  'mensajes' => '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>No Tiene Permisos de Ejecución, contacte con su Administrador.</div>');
			echo json_encode($arr);
			exit;
		} */
	}
	
	public function _output($output)
	{
	    echo $output;
	}

	//Funciones que necesito Siempre
	public function Encriptar($cadena){
		return substr(crypt ($cadena,0),0,10);
	}

	public function Desencriptar($cadena){
		return $cadena;
	}

	public function GenerarID($numID){
		$this->db->select('prefijo,consecutivo');
		$this->db->from('consecutivos_ids');
		$this->db->where('consecutivo_id',$numID);
		$this->db->limit(1);

		if ($row = $this->db->get()->row()){
			$strPrefijo = $row->prefijo;
			$strConsecutivo = $row->consecutivo;
			$strResultado = $strPrefijo;
			for($intCont = 0; ($intCont + strlen($strConsecutivo)) < 6; $intCont++){
				$strResultado = $strResultado."0";
			}
			$strResultado = $strResultado.$strConsecutivo;
			$strConsecutivo++;
		
			$this->datos = array('consecutivo' => $strConsecutivo);
			$this->db->where('consecutivo_id',$numID);
			$this->db->limit(1);
			$this->db->update('consecutivos_ids',$this->datos);
			
			if ($this->db->affected_rows()){
				return $strResultado;
			}
		}
		return "0";
	}

	//public function GenerarFolio($numProceso){
	public function GenerarFolio($strProceso){
		$this->db->select('F.folio_id, F.prefijo, F.consecutivo');
		$this->db->from('folios F');
		$this->db->join('folios_procesos FP','F.folio_id = FP.folio_id','inner');
		$this->db->join('procesos P','FP.proceso_id = P.proceso_id','inner');
		$this->db->where('P.nombre',$strProceso);
		$this->db->limit(1);

		if ($row = $this->db->get()->row()){
			$strFolioID = $row->folio_id;
			$strPrefijo = $row->prefijo;
			$strConsecutivo = $row->consecutivo;
			$strResultado = $strPrefijo;
			for($intCont = 0; ($intCont + strlen($strConsecutivo)) < 6; $intCont++){
				$strResultado = $strResultado."0";
			}
			$strResultado = $strResultado.$strConsecutivo;
			$strConsecutivo++;

			$this->datos = array('consecutivo' => $strConsecutivo);
			$this->db->where('folio_id',$strFolioID);
			$this->db->limit(1);
			$this->db->update('folios',$this->datos);
			
			if ($this->db->affected_rows()){
				return $strResultado;
			}

		}
		return "0";
	}

	public function RestableceFolio($strProceso, $strFolio){
		$this->db->select('F.folio_id, F.prefijo, F.consecutivo');
		$this->db->from('folios F');
		$this->db->join('folios_procesos FP','F.folio_id = FP.folio_id','inner');
		$this->db->join('procesos P','FP.proceso_id = P.proceso_id','inner');
		$this->db->where('P.nombre',$strProceso);
		$this->db->limit(1);

		if ($row = $this->db->get()->row()){
			$strPrefijo = $row->prefijo;
			$strConsecutivo = $strFolio;
			$strResultado = $strPrefijo;
			for($intCont = 0; ($intCont + strlen($strConsecutivo)) < 6; $intCont++){
				$strResultado = $strResultado."0";
			}
			$strResultado = $strResultado.$strConsecutivo;
			return $strResultado;
		}
		return "0";
	}	

	public function NumeroTexto ($numero){
		$extras= array("/[\$]/","/ /","/,/","/-/");
		$limpio=preg_replace($extras,"",$numero);
		$partes=explode(".",$limpio);
		if (count($partes)>2) {
			return "Error, el n&uacute;mero no es correcto";
			exit();
		}
		$digitos_piezas=chunk_split($partes[0],1,"#");
		$digitos_piezas=substr($digitos_piezas,0,strlen($digitos_piezas)-1);
		$digitos=explode("#",$digitos_piezas);
		$todos=count($digitos);
		$grupos=ceil (count($digitos)/3);
		$unidad = array('UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE');
		$decenas = array('DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE');
		$decena = array('DIECI','VEINTI','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA');
		$centena = array('CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS');
		$resto=$todos;
		for ($i=1; $i<=$grupos; $i++) {
			if ($resto>=3) {
				$corte=3; } else {
				$corte=$resto;
			}
			$offset=(($i*3)-3)+$corte;
			$offset=$offset*(-1);
			$num=implode("",array_slice ($digitos,$offset,$corte));
			$resultado[$i] = "";
			$cen = (int) ($num / 100);              //Cifra de las centenas
			$doble = $num - ($cen*100);             //Cifras de las decenas y unidades
			$dec = (int)($num / 10) - ($cen*10);    //Cifra de las decenas
			$uni = $num - ($dec*10) - ($cen*100);   //Cifra de las unidades
			if ($cen > 0) {
			   if ($num == 100) $resultado[$i] = "CIEN";
			   else $resultado[$i] = $centena[$cen-1].' ';
			}
			if ($doble>0) {
			   if ($doble == 20) {
				  $resultado[$i] .= " VEINTE";
			   }elseif (($doble < 16) and ($doble>9)) {
				  $resultado[$i] .= $decenas[$doble-10];
			   }else {
				  $resultado[$i] .=' '. $decena[$dec-1];
			   }
			   if ($dec>2 and $uni<>0) $resultado[$i] .=' Y ';
			   if (($uni>0) and ($doble>15) or ($dec==0)) {
				  if ($i==1 && $uni == 1) $resultado[$i].="UNO";
				  elseif ($i==2 && $num == 1) $resultado[$i].="";
				  else $resultado[$i].=$unidad[$uni-1];
			   }
			}	
			switch ($i) {
				case 2:
				$resultado[$i].= ($resultado[$i]=="") ? "" : " MIL ";
				break;
				case 3:
				$resultado[$i].= ($num==1) ? " MILL&Oacute;N " : " MILLONES ";
				break;
			}
			$resto-=$corte;
		}
		$resultado_inv= array_reverse($resultado, TRUE);
		$final="";
		foreach ($resultado_inv as $parte){
			$final.=$parte;
		}
		if ($partes[1] != ""){
			$final = "SON: (".$final." PESOS ".$partes[1]."/100 M.N.)";
		}
		else{
			$final = "SON: (".$final." PESOS 00/100 USD)";
		}
		return $final;
	}

	public function Acceso($strProceso){
		$strSQL = " SELECT P.proceso_id, P.nombre, SP.subproceso_id, SP.funcion sub_proceso
					FROM procesos P
					RIGHT JOIN subprocesos SP ON P.proceso_id = SP.proceso_id
					WHERE P.nombre =  '$strProceso'
					AND SP.subproceso_id
					IN (SELECT PA.subproceso_id
						FROM permisos_acceso PA, grupos_usuarios_detalles GUD
						WHERE PA.grupo_usuario_id = GUD.grupo_usuario_id
						AND GUD.usuario_id = ".$this->session->userdata('usuario_id').")";
		$result = $this->db->query($strSQL);
		if($result->num_rows()){
			$result->free_result();
			return TRUE;
		}
		return FALSE;
	}

	public function PermisoExecucion($strFuncion){
		$strSQL = " SELECT SP.subproceso_id, SP.funcion, IFNULL((SELECT PA.subproceso_id
																FROM permisos_acceso PA, grupos_usuarios_detalles GUD
																WHERE PA.grupo_usuario_id = GUD.grupo_usuario_id
																AND PA.subproceso_id = SP.subproceso_id
																AND GUD.usuario_id = ".$this->session->userdata('usuario_id')." ),0) AS permiso
					FROM subprocesos SP 
					WHERE SP.funcion =  '$strFuncion' ";
		$result = $this->db->query($strSQL);
		if($row = $result->row()) {
			$result->free_result();
			if($row->permiso == 0){
				return FALSE;
			}
		}
		return TRUE;
	}

	public function Msg($tipo,$strMsg){
	   	$strTipo = "success";
	    $strMsgIni = "Correcto! ";
	    if($tipo == 2){
	      $strTipo = "error";
	      $strMsgIni = "Error! ";
	    }
	    return '<div class="alert alert-'.$strTipo.'"> 
	                <button type="button" class="close" data-dismiss="alert">&times;</button> 
	                <strong>'.$strMsgIni.'</strong> '.$strMsg.' 
	           </div>';
	}
}
?>