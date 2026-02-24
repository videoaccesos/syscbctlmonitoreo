<?php
	header("Cache-Control: no-store, no-cache, must-revalidate");
	header("Cache-Control: post-check=0, pre-check=0", false);
	header("Pragma: no-cache");

	include_once ('../Funciones.php');

class Procesos extends Funciones
{	
	
	function agregar($objProceso, $intUsuarioID){
		$this->Conexion();
		$predb = $this->PreDB;
		$strNombre = mysql_real_escape_string($objProceso['strNombre']);
		$strRutaAcceso = mysql_real_escape_string($objProceso['strRutaAcceso']);
		$intProcesoPadreID = mysql_real_escape_string($objProceso['intProcesoPadreID']);
		$intUsuarioID = mysql_real_escape_string($intUsuarioID);
		mysql_query("BEGIN");
		$strCadenaSQL ="INSERT INTO ".$predb."procesos (nombre, ruta_acceso, proceso_padre_id, fecha_modificacion, usuario_id)
		                VALUES ('".utf8_decode($strNombre)."', '".utf8_decode($strRutaAcceso)."', ".$intProcesoPadreID.", NOW(), ".$intUsuarioID.")";
		if (mysql_query($strCadenaSQL)){
			mysql_query("COMMIT");
			return 1;
		}
		mysql_query("ROLLBACK");
		return 0;
	}
	
	function modificar($objProceso, $intUsuarioID){
		$this->Conexion();
		$predb = $this->PreDB;
		$intProcesoID = mysql_real_escape_string($objProceso['intProcesoID']);
		$strNombre = mysql_real_escape_string($objProceso['strNombre']);
		$strRutaAcceso = mysql_real_escape_string($objProceso['strRutaAcceso']);
		$intProcesoPadreID = mysql_real_escape_string($objProceso['intProcesoPadreID']);
		$intUsuarioID = mysql_real_escape_string($intUsuarioID);
		mysql_query("BEGIN");
		$strCadenaSQL ="UPDATE ".$predb."procesos
						SET    nombre = '".utf8_decode($strNombre)."', ruta_acceso = '".utf8_decode($strRutaAcceso)."', 
						       proceso_padre_id = ".$intProcesoPadreID.", fecha_modificacion = NOW(), usuario_id = ".$intUsuarioID." 
						WHERE  proceso_id = ".$intProcesoID." ";
		if (mysql_query($strCadenaSQL)){
			mysql_query("COMMIT");
			return 1;
		}
		mysql_query("ROLLBACK");
		return 0;
	}

	function consultar($strBusqueda)
	{
		$this->Conexion();
		$predb = $this->PreDB;
		$strBusqueda = mysql_real_escape_string($strBusqueda);
		
		$strCadenaSQL ="SELECT P.proceso_id, P.nombre, P.ruta_acceso, P.proceso_padre_id, PP.nombre AS ProcesoPadre
						FROM   ".$predb."procesos P, ".$predb."procesos PP
						WHERE  P.proceso_padre_id = PP.proceso_id ";
		if (isset($strBusqueda)) {
			$strCadenaSQL.="AND      P.nombre LIKE '".$strBusqueda."%' ";
		}
		$strCadenaSQL.="UNION 
						SELECT proceso_id, nombre, ruta_acceso, proceso_padre_id, _latin1'' AS ProcesoPadre
						FROM   ".$predb."procesos
						WHERE  proceso_padre_id = 0 ";
		if (isset($strBusqueda)) {
			$strCadenaSQL.="AND      nombre LIKE '".$strBusqueda."%' ";
		}
		$strCadenaSQL.="ORDER BY nombre";
		$result = mysql_query($strCadenaSQL);
		$objProcesos = array();
		while($rowProceso = mysql_fetch_object($result)){
			$objProcesos  [] = $rowProceso;
		}
		mysql_free_result($result);
		return  $objProcesos;
	}
			
	function buscar($intProcesoID){
		$this->Conexion();
		$predb = $this->PreDB;
		$intProcesoID = mysql_real_escape_string($intProcesoID);
		
		$strCadenaSQL ="SELECT P.proceso_id, P.nombre, P.ruta_acceso, P.proceso_padre_id, P.fecha_modificacion, P.usuario_id,  P01.nombre AS ProcesoPadre 
						FROM   ".$predb."procesos P, ".$predb."procesos P01 
						WHERE  P.proceso_id = ".$intProcesoID." 
						AND    P.proceso_padre_id = P01.proceso_id 
						UNION 
						SELECT P.proceso_id, P.nombre, P.ruta_acceso, P.proceso_padre_id, P.fecha_modificacion, P.usuario_id, _latin1'' AS ProcesoPadre 
						FROM   ".$predb."procesos P 
						WHERE  P.proceso_id = ".$intProcesoID." 
						AND    P.proceso_padre_id = _latin1'' ";
		$result = mysql_query($strCadenaSQL);
		$objProcesos = array();
		while($row = mysql_fetch_object($result)){
			$objProcesos  [] = $row;
		}
		mysql_free_result($result);
		return $objProcesos;
	}
	
	//Funcion que regresa solamente los procesos padre para cargar el combo
	function buscarPadres(){
            $this->Conexion();
            $predb = $this->PreDB;  
            $strCadenaSQL ="SELECT 0 AS proceso_id, '[Establecer como padre]' AS nombre 
                                   UNION
                                   SELECT P.proceso_id, P.nombre 
                                   FROM   ".$predb."procesos P 
                                   WHERE    P.proceso_padre_id = 0 "; 
            $result = mysql_query($strCadenaSQL);
            $objProcesos = array();
            while($row = mysql_fetch_object($result)){
                  $objProcesos  [] = $row;
            }
            mysql_free_result($result);
            return $objProcesos;
    }

	//Funcion que regresa solamente los procesos padre para cargar el combo
	function buscarHijos($strNombre){
            $this->Conexion();
            $predb = $this->PreDB;  
            	
			$strNombre = mysql_real_escape_string($strNombre);
			$strCadenaSQL ="SELECT P.proceso_id, P.nombre, PP.nombre AS ProcesoPadre
							FROM   ".$predb."procesos P, ".$predb."procesos PP
							WHERE  P.proceso_padre_id = PP.proceso_id 
							AND	   P.nombre LIKE '$strNombre%'    ";
			
            $result = mysql_query($strCadenaSQL);
            $objProcesos = array();
            while($row = mysql_fetch_object($result)){
                  $objProcesos  [] = $row;
            }
            mysql_free_result($result);
            return $objProcesos;
	}
	
	function eliminar($intProcesoID){
		$this->Conexion();
		$predb = $this->PreDB;
		$intProcesoID = mysql_real_escape_string($intProcesoID);
		
		mysql_query("BEGIN");
		$strCadenaSQL ="DELETE FROM ".$predb."subprocesos
						WHERE  proceso_id = ".$intProcesoID." ";
		if (mysql_query($strCadenaSQL)){
			$strCadenaSQL ="DELETE FROM ".$predb."procesos
						WHERE  proceso_id = ".$intProcesoID." ";
			if (mysql_query($strCadenaSQL)){
				mysql_query("COMMIT");
				return 1;
			}
		}
		mysql_query("ROLLBACK");
		return 0;
	}
	
	public function getID($strNombre)
      {
            $this->Conexion();
            $predb = $this->PreDB;  
            $strCadenaSQL="SELECT proceso_id 
            			   FROM ".$predb."procesos 
            			   WHERE nombre = '".$strNombre."' ";
            $result = mysql_query($strCadenaSQL);
            $objProcesos = array();
         	$row = mysql_fetch_array($result);
         	mysql_free_result($result);     
            return $row[0];
      }
	
	
}
?>