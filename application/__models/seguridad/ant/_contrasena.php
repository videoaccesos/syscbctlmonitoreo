<?php
	header("Cache-Control: no-store, no-cache, must-revalidate");
	header("Cache-Control: post-check=0, pre-check=0", false);
	header("Pragma: no-cache");
	
	require_once ('../Funciones.php');
	
	class Contrasena extends Funciones{
		
		function restartPass($intUsuarioID){
			$predb = $this->PreDB;
			$this->Conexion();
			$CadenaSQL = "UPDATE ".$predb."usuarios 
						  SET contrasena = '".$this->Encriptar("12345")."' ";
			if($intUsuarioID)
				$CadenaSQL.="WHERE usuario_id = ".$intUsuarioID." ";
			if(mysql_query($CadenaSQL))
				return "1";
			return "0";
		}
	}
 ?>