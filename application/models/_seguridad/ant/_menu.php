<?php
	header("Cache-Control: no-store, no-cache, must-revalidate");
	header("Cache-Control: post-check=0, pre-check=0", false);
	header("Pragma: no-cache");
	
	include_once ('../Funciones.php');	
	
class Menu extends Funciones
{
	
	function menuXML($intUsuarioID)
	{ 
		$this->Conexion();
		$predb = $this->PreDB;
		$intUsuarioID = mysql_real_escape_string($intUsuarioID);
		$CadenaSQL = "SELECT proceso_id, nombre, ruta_acceso, proceso_padre_id ";
		$CadenaSQL.= "FROM   ".$predb."procesos ";
		$CadenaSQL.= "WHERE  proceso_id IN (SELECT P.proceso_padre_id AS proceso_id ";
		$CadenaSQL.= "                      FROM   ".$predb."procesos AS P, ".$predb."subprocesos AS SP, ";
		$CadenaSQL.= "                             ".$predb."permisos_acceso AS PA, ".$predb."grupos_usuarios AS GU, ";
		$CadenaSQL.= "                             ".$predb."grupos_usuarios_detalles AS GUD, ".$predb."usuarios AS U ";
		$CadenaSQL.= "                      WHERE  U.usuario_id = ".$intUsuarioID." ";
		$CadenaSQL.= "                      AND    GUD.usuario_id = U.usuario_id ";
		$CadenaSQL.= "                      AND    GUD.grupo_usuario_id = GU.grupo_usuario_id ";
		$CadenaSQL.= "                      AND    GU.estatus_id = 1 ";
		$CadenaSQL.= "                      AND    PA.grupo_usuario_id = GU.grupo_usuario_id ";
		$CadenaSQL.= "                      AND    PA.subproceso_id = SP.subproceso_id ";
		$CadenaSQL.= "                      AND    P.proceso_id = SP.proceso_id)";
		$CadenaSQL.= "AND    proceso_padre_id = 0 
					  ORDER BY nombre             ";
		
		$result = mysql_query($CadenaSQL);
				 	
		$strMenu = "<menu> ";
        while($row = mysql_fetch_array($result)){
			$strMenu.= " <menuitem label=\"".$row["nombre"]."\" state=\"".$row ["ruta_acceso"]."\" proceso_id=\"".$row["proceso_id"]."\"> ";
				$strMenu.= $this->menuItems($intUsuarioID, $row["proceso_id"]);	
			$strMenu.= " </menuitem> ";
		}
		mysql_free_result($result);
        $strMenu.= "</menu>";
        return $strMenu;
	}
	
	
	function menuItems($intUsuarioID, $intProcesoID)
	{
		$this->Conexion();
		$predb = $this->PreDB;
		$strCadenaSQL = "SELECT proceso_id, nombre, ruta_acceso, proceso_padre_id
					  FROM   ".$predb."procesos
					  WHERE  proceso_padre_id = ".$intProcesoID." 
					  AND    proceso_id in (SELECT P.proceso_id 
					                        FROM   ".$predb."procesos AS P, ".$predb."subprocesos AS SP, 
					                               ".$predb."permisos_acceso AS PA, ".$predb."grupos_usuarios AS GU, 
					                               ".$predb."grupos_usuarios_detalles AS GUD, ".$predb."usuarios AS U 
					                        WHERE  U.usuario_id = ".$intUsuarioID." 
					                        AND    GUD.usuario_id = U.usuario_id 
					                        AND    GUD.grupo_usuario_id = GU.grupo_usuario_id 
					                        AND    GU.estatus_id = 1 
					                        AND    PA.grupo_usuario_id = GU.grupo_usuario_id
				  	                        AND    PA.subproceso_id = SP.subproceso_id 
					                        AND    P.proceso_id = SP.proceso_id)	";
		$result = mysql_query($strCadenaSQL);

		$strMenu = "";
		while($row = mysql_fetch_array($result)){
			
			$strCadenaSQL ="SELECT SUBSTRING(SP.funcion,1,1) AS funcion
							FROM   subprocesos SP, procesos P
							WHERE  SP.proceso_id = P.proceso_id
							AND    P.proceso_id = ".$row['proceso_id']."
							AND    SP.subproceso_id IN (SELECT PA.subproceso_id
										    FROM   permisos_acceso PA, grupos_usuarios_detalles GUD
										    WHERE  PA.grupo_usuario_id = GUD.grupo_usuario_id
										    AND    GUD.usuario_id = $intUsuarioID) ";
			$result_permisos = mysql_query($strCadenaSQL);
			$strPermisos = "";
			while($row_permiso = mysql_fetch_array($result_permisos)){
				if($strPermisos != "") $strPermisos .= "|";
				$strPermisos .= $row_permiso['funcion'];
			}
			$strMenu.= " <menuitem label=\"".$row["nombre"]."\" state=\"".$row ["ruta_acceso"]."\" proceso_id=\"".$row["proceso_id"]."\" permisos=\"".$strPermisos."\"> ";
				$strMenu.= $this->menuItems($intUsuarioID, $row["proceso_id"]);	
			$strMenu.= " </menuitem> ";
		}
		mysql_free_result($result);	
		return  $strMenu;
	}
	
	
}
?>