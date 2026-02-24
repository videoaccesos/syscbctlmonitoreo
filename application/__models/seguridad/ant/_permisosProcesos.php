<?php
	header("Cache-Control: no-store, no-cache, must-revalidate");
	header("Cache-Control: post-check=0, pre-check=0", false);
	header("Pragma: no-cache");
	
	include_once ('../Funciones.php');	

class PermisosProcesos extends Funciones{
	
	function obtener($intUsuarioID, $intProcesoID)
	{
		$this->Conexion();
		$predb = $this->PreDB;
		$intProcesoID = mysql_real_escape_string($intProcesoID);
		$intUsuarioID = mysql_real_escape_string($intUsuarioID);
		
		$Permiso["Nuevo"] = "0";
		$Permiso["Guardar"] = "0";
		$Permiso["Buscar"] = "0";
		$Permiso["Imprimir"] = "0";
		$Permiso["Modificar"] = "0";
		$Permiso["Cancelar"] = "0";
		$Permiso["Eliminar"] = "0";
	
		$CadenaSQL = "SELECT S.subproceso_id, S.proceso_id, S.nombre, S.funcion ";
		$CadenaSQL.= "FROM   ".$predb."grupos_usuarios AS GU, ".$predb."grupos_usuarios_detalles AS GUD, ".$predb."usuarios AS U, ";
		$CadenaSQL.= "       ".$predb."permisos_acceso AS PA, ".$predb."subprocesos AS S ";
		$CadenaSQL.= "WHERE  U.usuario_id = ".$intUsuarioID." ";
		$CadenaSQL.= "AND    S.proceso_id = ".$intProcesoID." ";
		$CadenaSQL.= "AND    S.subproceso_id = PA.subproceso_id ";
		$CadenaSQL.= "AND    GUD.grupo_usuario_id = GU.grupo_usuario_id ";
		$CadenaSQL.= "AND    GUD.usuario_id = U.usuario_id ";
		$CadenaSQL.= "AND    GU.grupo_usuario_id = PA.grupo_usuario_id ";
		$resutl = mysql_query($CadenaSQL);
		$Cadena = "&Status=".((mysql_num_rows($resutl) >= 1) ? "OK" : "NO");
		while($row = mysql_fetch_array($resutl)){
			$Permiso[$row["funcion"]] = "1";
		}
		mysql_free_result($resutl);
		
		return $Permiso;
	}
	
}	 