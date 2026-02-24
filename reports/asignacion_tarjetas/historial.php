<?php
set_time_limit(0);
require_once ("../clases/PHPExcel.php");
require_once ('../clases/PHPExcel/IOFactory.php');
require_once ('../clases/PHPExcel/Worksheet.php');
require_once ('../config.php');
require_once ("../funciones.php");
require_once ("../estilos.php");

$MesesNombres = Array("01"=>"ENERO", "02"=>"FEBRERO", "03"=>"MARZO", "04"=>"ABRIL", "05"=>"MAYO", "06"=>"JUNIO",
					  "07"=>"JULIO", "08"=>"AGOSTO", "09"=>"SEPTIEMBRE", "10"=>"OCTUBRE", "11"=>"NOVIEMBRE", "12"=>"DICIEMBRE");

$vecX = explode("," , "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,AA,AB,AC,AD,AE,AF,AG,AH,AI,AJ,AK,AL,AM,AN,AO,AP,AQ,AR,AS,AT,AU,AV,AW,AX,AY,AZ,BA,BB,BC,BD,BE,BF,BG,BH,BI,BJ,BK,BL,BM,BN,BO,BP,BQ,BR,BS,BT,BU,BV,BW,BX,BY,BZ");

$objPHPExcel = new PHPExcel();
$objPHPExcel = PHPExcel_IOFactory::load('historial.xls');
$est = new estilo_hoja1();

//// Set properties
$objPHPExcel->getProperties()->setCreator("Sistema Control de Accesos")
							 ->setLastModifiedBy("Sistema Control de Accesos")
							 ->setTitle("Asignasion de Tarjetas")
							 ->setSubject("Office 2007 XLSX Test Document")
							 ->setDescription("Reporte de Tarjetas Vendidas y Canceladas.")
							 ->setKeywords("Reporte de Supervicion")
							 ->setCategory("Reporte");
$strFechaIni = substr($_POST["strFechaIni"],6,4)."-".
               substr($_POST["strFechaIni"],3,2)."-".
               substr($_POST["strFechaIni"],0,2);

$strFechaFin = substr($_POST["strFechaFin"],6,4)."-".
               substr($_POST["strFechaFin"],3,2)."-".
               substr($_POST["strFechaFin"],0,2);
$objPHPExcel->setActiveSheetIndex(0);
$con = conexion($host, $dbnombre, $dbuser, $dbpass);

$objPHPExcel->getActiveSheet()->setCellValue('F2', $_POST["strFechaIni"]);
$objPHPExcel->getActiveSheet()->setCellValue('F3', $_POST["strFechaFin"]);

$strSQL = " SELECT DATE_FORMAT(RRT.fecha,'%d-%m-%Y') AS fecha, RRT.folio_contrato, T.lectura, RRT.lectura_epc, T.tipo_id, 
                   (CASE T.tipo_id WHEN 2 THEN 'VEHICULAR' WHEN 1 THEN 'PEATONAL' END) AS tipo, RRT.precio, 
			       CONCAT_WS(' ',RR.nombre,RR.ape_paterno,' ',RR.ape_materno) AS residente,P.descripcion AS privada,R.nro_casa,R.calle
			FROM (((residencias_residentes_tarjetas RRT INNER JOIN tarjetas T ON RRT.tarjeta_id = T.tarjeta_id)
				   INNER JOIN residencias_residentes RR ON RRT.residente_id = RR.residente_id)
			      INNER JOIN residencias R ON RR.residencia_id = R.residencia_id) 
                 INNER JOIN privadas P ON R.privada_id = P.privada_id
			WHERE RRT.fecha >= '$strFechaIni'
			AND   RRT.fecha <= '$strFechaFin'
			AND   RRT.estatus_id = 1
			AND   RRT.utilizo_seguro = 0
            ORDER BY fecha ";
$numVehicular = 0;
$numPeatonal = 0;
$totalVehicular = 0;
$totalPeatonal = 0;
$y = 7;
$result2 = mysql_query($strSQL);
while($row = mysql_fetch_assoc($result2)){
	$objPHPExcel->getActiveSheet()->setCellValue('A'.$y, $row["fecha"]);
	$objPHPExcel->getActiveSheet()->setCellValue('B'.$y, $row["folio_contrato"]);
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, $row["lectura"]);
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, $row["tipo"]);
	$objPHPExcel->getActiveSheet()->setCellValue('E'.$y, number_format($row["precio"],2));
	$objPHPExcel->getActiveSheet()->setCellValue('F'.$y, utf8_encode($row["residente"]));
	$objPHPExcel->getActiveSheet()->setCellValue('G'.$y, utf8_encode($row["nro_casa"].", ".$row["calle"]));
	$objPHPExcel->getActiveSheet()->setCellValue('H'.$y, utf8_encode($row["privada"]));
	//$objPHPExcel->getActiveSheet()->getStyle('A'.$y.':'.$vecX[$x-1].$y)->applyFromArray($est->RowText2);
	$y++;
	if($row['tipo_id'] == 1){
		$numPeatonal++;
		$totalPeatonal += $row["precio"]*1;
	} else {
		$numVehicular++;
		$totalVehicular += $row["precio"]*1;
	}
}
$y++;
$objPHPExcel->getActiveSheet()->setCellValue('D'.$y,"TOTAL GENERAL"); $y++;
$objPHPExcel->getActiveSheet()->setCellValue('D'.$y,"$numPeatonal  PEATONAL");
$objPHPExcel->getActiveSheet()->setCellValue('E'.$y, number_format($totalPeatonal,2)); $y++;

$objPHPExcel->getActiveSheet()->setCellValue('D'.$y,"$numVehicular  VEHICULAR"); 
$objPHPExcel->getActiveSheet()->setCellValue('E'.$y, number_format($totalVehicular,2)); 
$y+=2;

$objPHPExcel->getActiveSheet()->setCellValue('A'.$y," -  LISTA DE TARJETAS POR SEGURO UTILIZADO"); $y+=2;

$strSQL = " SELECT DATE_FORMAT(RRT.fecha,'%d-%m-%Y') AS fecha, RRT.folio_contrato, T.lectura, RRT.lectura_epc, T.tipo_id, RRT.precio AS dblPrecio, 
                   (CASE T.tipo_id WHEN 2 THEN 'VEHICULAR' WHEN 1 THEN 'PEATONAL' END) AS tipo, FORMAT(RRT.precio,2) AS precio, 
			       CONCAT_WS(' ',RR.nombre,RR.ape_paterno,' ',RR.ape_materno) AS residente,P.descripcion AS privada,R.nro_casa,R.calle
			FROM (((residencias_residentes_tarjetas RRT INNER JOIN tarjetas T ON RRT.tarjeta_id = T.tarjeta_id)
				   INNER JOIN residencias_residentes RR ON RRT.residente_id = RR.residente_id)
			      INNER JOIN residencias R ON RR.residencia_id = R.residencia_id) 
                 INNER JOIN privadas P ON R.privada_id = P.privada_id
			WHERE RRT.fecha >= '$strFechaIni'
			AND   RRT.fecha <= '$strFechaFin'
			AND   RRT.estatus_id = 1
			AND   RRT.utilizo_seguro = 1
            ORDER BY fecha ";
$numVehicular = 0;
$numPeatonal = 0;
$totalVehicular = 0;
$totalPeatonal = 0;
$result2 = mysql_query($strSQL);
while($row = mysql_fetch_assoc($result2)){
	$objPHPExcel->getActiveSheet()->setCellValue('A'.$y, $row["fecha"]);
	$objPHPExcel->getActiveSheet()->setCellValue('B'.$y, $row["folio_contrato"]);
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, $row["numero"]);
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, $row["tipo"]);
	$objPHPExcel->getActiveSheet()->setCellValue('E'.$y, $row["precio"]);
	$objPHPExcel->getActiveSheet()->setCellValue('F'.$y, utf8_encode($row["residente"]));
	$objPHPExcel->getActiveSheet()->setCellValue('G'.$y, utf8_encode($row["nro_casa"].", ".$row["calle"]));
	$objPHPExcel->getActiveSheet()->setCellValue('H'.$y, utf8_encode($row["privada"]));
	//$objPHPExcel->getActiveSheet()->getStyle('A'.$y.':'.$vecX[$x-1].$y)->applyFromArray($est->RowText2);
	$y++;
	if($row['tipo_id'] == 1){
		$numPeatonal++;
		$totalPeatonal += $row["dblPrecio"]*1;
	} else {
		$numVehicular++;
		$totalVehicular += $row["dblPrecio"]*1;
	}
}
$y++;
$objPHPExcel->getActiveSheet()->setCellValue('D'.$y,"TOTAL GENERAL"); $y++;
$objPHPExcel->getActiveSheet()->setCellValue('D'.$y,"$numPeatonal  PEATONAL");
//$objPHPExcel->getActiveSheet()->setCellValue('E'.$y, number_format($totalPeatonal,2)); $y++;

$objPHPExcel->getActiveSheet()->setCellValue('D'.$y,"$numVehicular  VEHICULAR"); 
//$objPHPExcel->getActiveSheet()->setCellValue('E'.$y, number_format($totalVehicular,2)); 

$y+=2;

$objPHPExcel->getActiveSheet()->setCellValue('A'.$y," -  LISTA DE TARJETAS CANCELDAS"); $y+=2;

$strSQL = " SELECT DATE_FORMAT(RRT.fecha,'%d-%m-%Y') AS fecha, RRT.folio_contrato, T.lectura, RRT.lectura_epc, T.tipo_id, RRT.precio AS dblPrecio, 
                   (CASE T.tipo_id WHEN 2 THEN 'VEHICULAR' WHEN 1 THEN 'PEATONAL' END) AS tipo, FORMAT(RRT.precio,2) AS precio, 
			       CONCAT_WS(' ',RR.nombre,RR.ape_paterno,' ',RR.ape_materno) AS residente,P.descripcion AS privada,R.nro_casa,R.calle
			FROM (((residencias_residentes_tarjetas RRT INNER JOIN tarjetas T ON RRT.tarjeta_id = T.tarjeta_id)
				   INNER JOIN residencias_residentes RR ON RRT.residente_id = RR.residente_id)
			      INNER JOIN residencias R ON RR.residencia_id = R.residencia_id) 
                 INNER JOIN privadas P ON R.privada_id = P.privada_id
			WHERE RRT.fecha_vencimiento >= '$strFechaIni'
			AND   RRT.fecha_vencimiento <= '$strFechaFin'
			AND   RRT.estatus_id = 2
            ORDER BY fecha ";
$numVehicular = 0;
$numPeatonal = 0;
$totalVehicular = 0;
$totalPeatonal = 0;
$result2 = mysql_query($strSQL);
while($row = mysql_fetch_assoc($result2)){
	$objPHPExcel->getActiveSheet()->setCellValue('A'.$y, $row["fecha"]);
	$objPHPExcel->getActiveSheet()->setCellValue('B'.$y, $row["folio_contrato"]);
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, $row["numero"]);
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, $row["tipo"]);
	$objPHPExcel->getActiveSheet()->setCellValue('E'.$y, $row["precio"]);
	$objPHPExcel->getActiveSheet()->setCellValue('F'.$y, utf8_encode($row["residente"]));
	$objPHPExcel->getActiveSheet()->setCellValue('G'.$y, utf8_encode($row["nro_casa"].", ".$row["calle"]));
	$objPHPExcel->getActiveSheet()->setCellValue('H'.$y, utf8_encode($row["privada"]));
	//$objPHPExcel->getActiveSheet()->getStyle('A'.$y.':'.$vecX[$x-1].$y)->applyFromArray($est->RowText2);
	$y++;
	if($row['tipo_id'] == 1){
		$numPeatonal++;
		$totalPeatonal += $row["dblPrecio"]*1;
	} else {
		$numVehicular++;
		$totalVehicular += $row["dblPrecio"]*1;
	}
}
$y++;
$objPHPExcel->getActiveSheet()->setCellValue('D'.$y,"TOTAL GENERAL"); $y++;
$objPHPExcel->getActiveSheet()->setCellValue('D'.$y,"$numPeatonal  PEATONAL");
$objPHPExcel->getActiveSheet()->setCellValue('E'.$y, number_format($totalPeatonal,2)); $y++;

$objPHPExcel->getActiveSheet()->setCellValue('D'.$y,"$numVehicular  VEHICULAR"); 
$objPHPExcel->getActiveSheet()->setCellValue('E'.$y, number_format($totalVehicular,2)); 

$y=6;

$strSQL = " SELECT P.descripcion AS privada,T.tipo_id, COUNT(*) AS numTarjetas, FORMAT(SUM(precio),2) AS dblTotal
			FROM (((residencias_residentes_tarjetas RRT INNER JOIN tarjetas T ON RRT.tarjeta_id = T.tarjeta_id)
				   INNER JOIN residencias_residentes RR ON RRT.residente_id = RR.residente_id)
			      INNER JOIN residencias R ON RR.residencia_id = R.residencia_id) INNER JOIN privadas P ON R.privada_id = P.privada_id
			WHERE RRT.fecha >= '$strFechaIni'
			AND   RRT.fecha <= '$strFechaFin'
			AND   RRT.estatus_id = 1
			GROUP BY P.descripcion, T.tipo_id
           	ORDER BY P.descripcion ";
$result2 = mysql_query($strSQL);
$strPrivada = "";
while($row = mysql_fetch_assoc($result2)){
	if($strPrivada != $row['privada']){
		$y++;
		$objPHPExcel->getActiveSheet()->setCellValue('J'.$y, utf8_encode($row["privada"]));
		$objPHPExcel->getActiveSheet()->setCellValue('K'.$y, $row["numTarjetas"]);
		$objPHPExcel->getActiveSheet()->setCellValue('L'.$y, $row["dblTotal"]);
		$strPrivada = $row["privada"];
	}else {
		$objPHPExcel->getActiveSheet()->setCellValue('M'.$y, $row["numTarjetas"]);
		$objPHPExcel->getActiveSheet()->setCellValue('N'.$y, $row["dblTotal"]);
	}
}

$objPHPExcel->getActiveSheet()->setTitle("Reporte");
mysql_free_result($result2);
header('Content-Type: application/vnd.ms-excel');
//header('Content-Language: Spanish');
header('Content-Disposition: attachment;filename="Reporte_Asignacion_Tarjetas.xls"');
header('Cache-Control: max-age=0');

//$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel2007');
$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel5');
$objWriter->save('php://output');
exit;

?>