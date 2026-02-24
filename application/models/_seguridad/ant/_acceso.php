<?php
	header("Cache-Control: no-store, no-cache, must-revalidate");
	header("Cache-Control: post-check=0, pre-check=0", false);
	header("Pragma: no-cache");
	
	include_once ('../Funciones.php');	

	class Acceso extends Funciones
	{
		
		
		function login($strUsuario,$strContrasena)
		{
			$this->Conexion();
			$strContrasena= $this->Encriptar($strContrasena);
			$CadenaSQL = "SELECT usuario_id, modificar_fechas ";
			$CadenaSQL.= "FROM   usuarios ";
			$CadenaSQL.= "WHERE  usuario = '".$strUsuario."' ";
			$CadenaSQL.= "AND    contrasena = '".$strContrasena."' ";
			$CadenaSQL.= "AND    estatus_id = 1";
			$CadenaSQL = mysql_query($CadenaSQL);
			$usuario["Estatus"]=((mysql_num_rows($CadenaSQL) >= 1) ? "OK" : "NO");
			$row = mysql_fetch_array($CadenaSQL);
			mysql_free_result($CadenaSQL);
			$usuario["UsuarioID"]=$row["usuario_id"];
			$usuario["ModificaFechas"]=$row["modificar_fechas"];
			$CadenaSQL = "SELECT NOW() AS Fecha";
			$CadenaSQL = mysql_query($CadenaSQL);
			$row = mysql_fetch_array($CadenaSQL);
			mysql_free_result($CadenaSQL);
			$usuario["Fecha"]=$row["Fecha"];
			return ($usuario);
				
		}
	}
 ?>