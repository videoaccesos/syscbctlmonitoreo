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
//// Set properties
$objPHPExcel->getProperties()->setCreator("Sistema Control de Accesos")
							 ->setLastModifiedBy("Sistema Control de Accesos")
							 ->setTitle("Rendimiento de Accesos por Privada")
							 ->setSubject("Office 2007 XLSX Test Document")
							 ->setDescription("Tabla de accesos atendidos por privada en un rango de fechas.")
							 ->setKeywords("Reporte de Monitoreo por Privada")
							 ->setCategory("Reporte");

$strFechaIni = substr($_POST["strFechaIni"],6,4)."-".
               substr($_POST["strFechaIni"],3,2)."-".
               substr($_POST["strFechaIni"],0,2);


$strFechaFin = substr($_POST["strFechaFin"],6,4)."-".
               substr($_POST["strFechaFin"],3,2)."-".
               substr($_POST["strFechaFin"],0,2);

$est = new estilo_hoja1();
$objPHPExcel->setActiveSheetIndex(0);
$con = conexion($host, $dbnombre, $dbuser, $dbpass);

$objPHPExcel->getActiveSheet()->getColumnDimension('A')->setWidth(25);
$x=1;
$strSQL = " SELECT descripcion
			FROM privadas
			WHERE estatus_id = 1
			ORDER BY descripcion ";		
$result = mysql_query($strSQL);
while($row = mysql_fetch_object($result)) {
	$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'1', utf8_encode(strtoupper($row->descripcion)));
	$objPHPExcel->getActiveSheet()->getColumnDimension($vecX[$x])->setWidth(8);
	$objPHPExcel->getActiveSheet()->getStyle($vecX[$x].'1')->getAlignment()->setTextRotation(90);
	$x++;
}
$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'1',"TOTALES");
$objPHPExcel->getActiveSheet()->getColumnDimension($vecX[$x])->setWidth(10);
$objPHPExcel->getActiveSheet()->getRowDimension(1)->setRowHeight(100);

$objPHPExcel->getActiveSheet()->setCellValue('B2',"AREA DE MONITOREO");
$objPHPExcel->getActiveSheet()->mergeCells('B2:'.$vecX[($x-1)].'2');


$objPHPExcel->getActiveSheet()->setCellValue('A3',"LLAMADAS ATENDIDAS");
$strSQL = " SELECT P.descripcion AS privada, IFNULL(T.total,0) AS total
			FROM privadas P LEFT JOIN (SELECT privada_id, COUNT(*) AS total
						   FROM registros_accesos 
						   WHERE DATE(fecha_modificacion) >= '$strFechaIni'
						   AND DATE(fecha_modificacion) <= '$strFechaFin'
						   GROUP BY privada_id) AS T ON P.privada_id = T.privada_id
			WHERE estatus_id = 1
			ORDER BY P.descripcion ";		
$x=1;
$result = mysql_query($strSQL);
while($row = mysql_fetch_object($result)) {
	$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'3', $row->total);
	$x++;
}
$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'3',"=SUM(B3:".$vecX[$x-1]."3)");


$objPHPExcel->getActiveSheet()->setCellValue('A4',"CONDÓMINOS");
$strSQL = " SELECT P.descripcion AS privada, IFNULL(T.total,0) AS total
			FROM privadas P LEFT JOIN (SELECT privada_id, COUNT(*) AS total
						   FROM registros_accesos
						   WHERE tipo_gestion_id = 4
						   AND DATE(fecha_modificacion) >= '$strFechaIni'
						   AND DATE(fecha_modificacion) <= '$strFechaFin'
						   GROUP BY privada_id) AS T ON P.privada_id = T.privada_id
			WHERE estatus_id = 1
			ORDER BY P.descripcion ";		
$x=1;
$result = mysql_query($strSQL);
while($row = mysql_fetch_object($result)) {
	$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'4', $row->total);
	$x++;
}
$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'4',"=SUM(B4:".$vecX[$x-1]."4)");

$objPHPExcel->getActiveSheet()->setCellValue('A5',"MOROSOS");
$strSQL = " SELECT P.descripcion AS privada, IFNULL(T.total,0) AS total
			FROM privadas P LEFT JOIN (SELECT privada_id, COUNT(*) AS total
						   FROM registros_accesos
						   WHERE tipo_gestion_id = 2
						   AND DATE(fecha_modificacion) >= '$strFechaIni'
						   AND DATE(fecha_modificacion) <= '$strFechaFin'
						   GROUP BY privada_id) AS T ON P.privada_id = T.privada_id
			WHERE estatus_id = 1
			ORDER BY P.descripcion ";		
$x=1;
$result = mysql_query($strSQL);
while($row = mysql_fetch_object($result)) {
	$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'5', $row->total);
	$x++;
}
$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'5',"=SUM(B5:".$vecX[$x-1]."5)");

$objPHPExcel->getActiveSheet()->setCellValue('A6',"VISITAS A MOROSOS");
$strSQL = " SELECT P.descripcion AS privada, IFNULL(T.total,0) AS total
			FROM privadas P LEFT JOIN (SELECT privada_id, COUNT(*) AS total
						   FROM registros_accesos
						   WHERE tipo_gestion_id = 9
						   AND DATE(fecha_modificacion) >= '$strFechaIni'
						   AND DATE(fecha_modificacion) <= '$strFechaFin'
						   GROUP BY privada_id) AS T ON P.privada_id = T.privada_id
			WHERE estatus_id = 1
			ORDER BY P.descripcion ";		
$x=1;
$result = mysql_query($strSQL);
while($row = mysql_fetch_object($result)) {
	$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'6', $row->total);
	$x++;
}
$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'6',"=SUM(B6:".$vecX[$x-1]."6)");


$objPHPExcel->getActiveSheet()->setCellValue('A7',"%  ATENCIÓN A MOROSOS");
$x=1;
$result = mysql_query($strSQL);
while($row = mysql_fetch_object($result)) {
	$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'7', "=(".$vecX[$x]."4+".$vecX[$x]."5)/".$vecX[$x]."3");
	$objPHPExcel->getActiveSheet()->getStyle($vecX[$x].'7')->getNumberFormat()->setFormatCode(PHPExcel_Style_NumberFormat::FORMAT_PERCENTAGE);
	$x++;
}
$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'7',"=(".$vecX[$x]."4+".$vecX[$x]."5)/".$vecX[$x]."3");
$objPHPExcel->getActiveSheet()->getStyle($vecX[$x].'7')->getNumberFormat()->setFormatCode(PHPExcel_Style_NumberFormat::FORMAT_PERCENTAGE);

$objPHPExcel->getActiveSheet()->getStyle("A1:".$vecX[$x].'7')->applyFromArray($est->RowText2);
$objPHPExcel->getActiveSheet()->getStyle('B2:'.$vecX[($x-1)].'2')->applyFromArray($est->EncabezadoMes);


$objPHPExcel->getActiveSheet()->setCellValue('B10',"OTROS ACCESOS");
$objPHPExcel->getActiveSheet()->mergeCells('B10:'.$vecX[($x-1)].'10');

$objPHPExcel->getActiveSheet()->setCellValue('A11',"PROVEEDOR");
$strSQL = " SELECT P.descripcion AS privada, IFNULL(T.total,0) AS total
			FROM privadas P LEFT JOIN (SELECT privada_id, COUNT(*) AS total
						   FROM registros_accesos
						   WHERE tipo_gestion_id = 3
						   AND DATE(fecha_modificacion) >= '$strFechaIni'
						   AND DATE(fecha_modificacion) <= '$strFechaFin'
						   GROUP BY privada_id) AS T ON P.privada_id = T.privada_id
			WHERE estatus_id = 1
			ORDER BY P.descripcion ";		
$x=1;
$result = mysql_query($strSQL);
while($row = mysql_fetch_object($result)) {
	$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'11', $row->total);
	$x++;
}
$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'11',"=SUM(B11:".$vecX[$x-1]."11)");

$objPHPExcel->getActiveSheet()->setCellValue('A12',"TECNICO");
$strSQL = " SELECT P.descripcion AS privada, IFNULL(T.total,0) AS total
			FROM privadas P LEFT JOIN (SELECT privada_id, COUNT(*) AS total
						   FROM registros_accesos
						   WHERE tipo_gestion_id = 5
						   AND DATE(fecha_modificacion) >= '$strFechaIni'
						   AND DATE(fecha_modificacion) <= '$strFechaFin'
						   GROUP BY privada_id) AS T ON P.privada_id = T.privada_id
			WHERE estatus_id = 1
			ORDER BY P.descripcion ";		
$x=1;
$result = mysql_query($strSQL);
while($row = mysql_fetch_object($result)) {
	$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'12', $row->total);
	$x++;
}
$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'12',"=SUM(B12:".$vecX[$x-1]."12)");

$objPHPExcel->getActiveSheet()->setCellValue('A13',"TRABAJADOR DE OBRA");
$strSQL = " SELECT P.descripcion AS privada, IFNULL(T.total,0) AS total
			FROM privadas P LEFT JOIN (SELECT privada_id, COUNT(*) AS total
						   FROM registros_accesos
						   WHERE tipo_gestion_id = 6
						   AND DATE(fecha_modificacion) >= '$strFechaIni'
						   AND DATE(fecha_modificacion) <= '$strFechaFin'
						   GROUP BY privada_id) AS T ON P.privada_id = T.privada_id
			WHERE estatus_id = 1
			ORDER BY P.descripcion ";		
$x=1;
$result = mysql_query($strSQL);
while($row = mysql_fetch_object($result)) {
	$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'13', $row->total);
	$x++;
}
$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'13',"=SUM(B13:".$vecX[$x-1]."13)");

$objPHPExcel->getActiveSheet()->setCellValue('A14',"TRABAJADOR DE SERVICIO");
$strSQL = " SELECT P.descripcion AS privada, IFNULL(T.total,0) AS total
			FROM privadas P LEFT JOIN (SELECT privada_id, COUNT(*) AS total
						   FROM registros_accesos
						   WHERE tipo_gestion_id = 7
						   AND DATE(fecha_modificacion) >= '$strFechaIni'
						   AND DATE(fecha_modificacion) <= '$strFechaFin'
						   GROUP BY privada_id) AS T ON P.privada_id = T.privada_id
			WHERE estatus_id = 1
			ORDER BY P.descripcion ";		
$x=1;
$result = mysql_query($strSQL);
while($row = mysql_fetch_object($result)) {
	$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'14', $row->total);
	$x++;
}
$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'14',"=SUM(B14:".$vecX[$x-1]."14)");

$objPHPExcel->getActiveSheet()->setCellValue('A15',"VISITAS");
$strSQL = " SELECT P.descripcion AS privada, IFNULL(T.total,0) AS total
			FROM privadas P LEFT JOIN (SELECT privada_id, COUNT(*) AS total
						   FROM registros_accesos
						   WHERE tipo_gestion_id = 8
						   AND DATE(fecha_modificacion) >= '$strFechaIni'
						   AND DATE(fecha_modificacion) <= '$strFechaFin'
						   GROUP BY privada_id) AS T ON P.privada_id = T.privada_id
			WHERE estatus_id = 1
			ORDER BY P.descripcion ";		
$x=1;
$result = mysql_query($strSQL);
while($row = mysql_fetch_object($result)) {
	$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'15', $row->total);
	$x++;
}
$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'15',"=SUM(B15:".$vecX[$x-1]."15)");

$objPHPExcel->getActiveSheet()->setCellValue('A16',"NO CONCLUIDA");
$strSQL = " SELECT P.descripcion AS privada, IFNULL(T.total,0) AS total
			FROM privadas P LEFT JOIN (SELECT privada_id, COUNT(*) AS total
						   FROM registros_accesos
						   WHERE tipo_gestion_id = 1
						   AND DATE(fecha_modificacion) >= '$strFechaIni'
						   AND DATE(fecha_modificacion) <= '$strFechaFin'
						   GROUP BY privada_id) AS T ON P.privada_id = T.privada_id
			WHERE estatus_id = 1
			ORDER BY P.descripcion ";		
$x=1;
$result = mysql_query($strSQL);
while($row = mysql_fetch_object($result)) {
	$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'16', $row->total);
	$x++;
}
$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'16',"=SUM(B16:".$vecX[$x-1]."16)");


$objPHPExcel->getActiveSheet()->getStyle("A10:".$vecX[$x].'16')->applyFromArray($est->RowText2);
$objPHPExcel->getActiveSheet()->getStyle('B10:'.$vecX[($x-1)].'10')->applyFromArray($est->EncabezadoMes);


$objPHPExcel->getActiveSheet()->setTitle("Reporte");

header('Content-Type: application/vnd.ms-excel');
//header('Content-Language: Spanish');
header('Content-Disposition: attachment;filename="Reporte_Accesos_Privadas.xls"');
header('Cache-Control: max-age=0');

//$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel2007');
$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel5');
$objWriter->save('php://output');
exit;
?>
