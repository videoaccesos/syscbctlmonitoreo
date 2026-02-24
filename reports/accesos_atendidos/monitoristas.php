<?php
set_time_limit(0);
require_once ("../clases/PHPExcel.php");
require_once ('../clases/PHPExcel/IOFactory.php');
require_once ('../clases/PHPExcel/Worksheet.php');
require_once ('../config.php');
require_once ("../funciones.php");
require_once ("rendimiento_monitoreo.php");

$MesesNombres = Array("01"=>"ENERO", "02"=>"FEBRERO", "03"=>"MARZO", "04"=>"ABRIL", "05"=>"MAYO", "06"=>"JUNIO",
						  "07"=>"JULIO", "08"=>"AGOSTO", "09"=>"SEPTIEMBRE", "10"=>"OCTUBRE", "11"=>"NOVIEMBRE", "12"=>"DICIEMBRE");

$vecX = explode("," , "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,AA,AB,AC,AD,AE,AF,AG,AH,AI,AJ,AK,AL,AM,AN,AO,AP,AQ,AR,AS,AT,AU,AV,AW,AX,AY,AZ");

$objPHPExcel = new PHPExcel();
//// Set properties
$objPHPExcel->getProperties()->setCreator("Sistema Control de Accesos")
							 ->setLastModifiedBy("Sistema Control de Accesos")
							 ->setTitle("Rendimiento de Monitoreo")
							 ->setSubject("Office 2007 XLSX Test Document")
							 ->setDescription("Tabla de accesos atendidos por operadores, separado por cuatro periodos por mes.")
							 ->setKeywords("Reporte de Monitoreo")
							 ->setCategory("Reporte");



$strFechaIni = substr($_POST["strFechaIni"],6,4)."-".
               substr($_POST["strFechaIni"],3,2)."-".
               substr($_POST["strFechaIni"],0,2);


$strFechaFin = substr($_POST["strFechaFin"],6,4)."-".
               substr($_POST["strFechaFin"],3,2)."-".
               substr($_POST["strFechaFin"],0,2);

$objPHPExcel->setActiveSheetIndex(0);
$creadorH1 = new rendimiento_monitoreo($strFechaIni,$strFechaFin);
$objPHPExcel = $creadorH1->fnReporte($objPHPExcel);

//$intMesIni = date('m',strtotime($strFechaIni));
//$intAnioIni = date('Y',strtotime($strFechaIni));

//$intMesFin = date('m',strtotime($strFechaFin));
//$intAnioFin = date('Y',strtotime($strFechaFin));

//$intHojaActiva = 0;
//while($intMesIni <= $intMesFin && $intAnioIni <= $intAnioFin){
//	$creadorH1 = new rendimiento_monitoreo($intMesIni,$intAnioIni);
//	$objPHPExcel->setActiveSheetIndex($intHojaActiva);
//	$objPHPExcel = $creadorH1->fnReporte($objPHPExcel);
//	$intMesIni++;
//	if($intMesIni == 13){
//		$intMesIni = 1;
//		$intAnioIni++;
//	}
//	if($intMesIni <= $intMesFin && $intAnioIni <= $intAnioFin){
//		$objPHPExcel->createSheet();
//		$intHojaActiva++;
//	}
//}

header('Content-Type: application/vnd.ms-excel');
//header('Content-Language: Spanish');
header('Content-Disposition: attachment;filename="Reporte_Rendimiento.xls"');
header('Cache-Control: max-age=0');

//$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel2007');
$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel5');
$objWriter->save('php://output');
exit;
?>
