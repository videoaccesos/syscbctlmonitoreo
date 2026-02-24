<?php
set_time_limit(0);
require_once ('config.php');
require_once ("funciones.php");
$con = conexion($host, $dbnombre, $dbuser, $dbpass);
echo "INICIO <BR>";
mysql_query("BEGIN");
$strSQL = " SELECT * 
			FROM (
				SELECT CONCAT( nombre, ape_paterno, ape_materno ) nombre, COUNT( * ) AS repetido
				FROM registros_generales
				GROUP BY nombre, ape_paterno, ape_materno
			) AS T
			WHERE repetido > 1 ";		
$result = mysql_query($strSQL);
echo "BUSCANDO RELACIONADOS Y SUPLIENDO DUPLICADOS <BR>";
while($row = mysql_fetch_object($result)) {
	$strSQL2 = "SELECT registro_general_id 
				FROM registros_generales
				WHERE CONCAT( nombre, ape_paterno, ape_materno ) = '$row->nombre' ";
	//echo $strSQL2."<br>";
	$result2 = mysql_query($strSQL2);
	$bolBase = TRUE;
	$strRegistroGeneralBaseID = "";
	$strDuplicadosIDs = "";
	while($row2 = mysql_fetch_object($result2)) {
		if($bolBase){
			$strRegistroGeneralBaseID = $row2->registro_general_id;
			$bolBase = FALSE;
		}else {
			if($strDuplicadosIDs != "")
				$strDuplicadosIDs .= ",";
			$strDuplicadosIDs.="'$row2->registro_general_id'";
		}
	}
	//echo "$strDuplicadosIDs -- $strRegistroGeneralBaseID <br>";
	$strSQL2 = "UPDATE registros_accesos
				SET solicitante_id = '$strRegistroGeneralBaseID'
				WHERE solicitante_id IN ($strDuplicadosIDs)";
	if(!mysql_query($strSQL2)){	
			mysql_query("ROLLBACK");
			echo $strSQL2;
			exit;
	}
	$strSQL2 = "DELETE FROM registros_generales
				WHERE registro_general_id IN ($strDuplicadosIDs)";
	if(!mysql_query($strSQL2)){	
			mysql_query("ROLLBACK");
			echo $strSQL2;
			exit;
	}
}
mysql_query("COMMIT");
echo "FIN";
exit;
?>