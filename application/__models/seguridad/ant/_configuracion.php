<?php
	header("Cache-Control: no-store, no-cache, must-revalidate");
	header("Cache-Control: post-check=0, pre-check=0", false);
	header("Pragma: no-cache");

	include_once ('../Funciones.php');

class Configuracion extends Funciones
{	
	
	function consultar()
	{
		$this->Conexion();
		$predb = $this->PreDB;
		$strCadenaSQL ="SELECT empresa_id,razon_social,representante,rfc,direccion,extras FROM ".$predb."empresa";
		$result = mysql_query($strCadenaSQL);
		$objConfiguracion = array();
		while($row = mysql_fetch_object($result)){
			$objConfiguracion  [] = $row;
		}
		mysql_free_result($result);
		return $objConfiguracion;
	}
	
	function modificar($objConfiguracion, $intUsuarioID){
		$this->Conexion();
		$predb = $this->PreDB;
		$empresaID = mysql_real_escape_string($objConfiguracion['empresaID']);
		$razonSocial = mysql_real_escape_string($objConfiguracion['razonSocial']);
		$representante = mysql_real_escape_string($objConfiguracion['representante']);
		$rfc = mysql_real_escape_string($objConfiguracion['rfc']);
		$direccion = mysql_real_escape_string($objConfiguracion['direccion']);
		$extras = mysql_real_escape_string($objConfiguracion['extras']);
		$intUsuarioID = mysql_real_escape_string($intUsuarioID);
		mysql_query("BEGIN");
		$strCadenaSQL ="UPDATE ".$predb."empresa
						SET    razon_social = '".utf8_decode($razonSocial)."', representante = '".utf8_decode($representante)."',
							   rfc = '".utf8_decode($rfc)."', direccion = '".utf8_decode($direccion)."', 
							   extras = '".utf8_decode($extras)."', fecha_modificacion = NOW(), usuario_id = ".$intUsuarioID." 
						WHERE  empresa_id = ".$empresaID." ";
		//return $strCadenaSQL;
		if (mysql_query($strCadenaSQL)){
			mysql_query("COMMIT");
			return 1;
		}
		mysql_query("ROLLBACK");
		return 0;
	}
				
}
?>