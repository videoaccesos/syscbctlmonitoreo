<?php
set_time_limit(0);
require_once ("../clases/PHPExcel.php");
require_once ('../clases/PHPExcel/IOFactory.php');
require_once ('../clases/PHPExcel/Worksheet.php');
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
							 ->setTitle("Registro de Accesos")
							 ->setSubject("Office 2007 XLSX Test Document")
							 ->setDescription("Listado de registros de accesos filtrado por fechas y otros filtros.")
							 ->setKeywords("Reporte de Registro Accesos")
							 ->setCategory("Reporte");

$strFechaHoraInicio = $_POST['strFechaHoraInicio'];
$strFechaHoraFin = $_POST['strFechaHoraFin'];
$intResidenciaID =  $_POST['intResidenciaID'];
$strResidencia = $_POST['strResidencia'];
$strSolicitante = $_POST['strSolicitante'];
$intOperadorID = $_POST['intOperadorID'];
$strOperador = $_POST['strOperador'];
$intPrivadaID = $_POST['intPrivadaID'];
$strPrivada =  $_POST['strPrivada'];
$intTipoGestionID = $_POST['intTipoGestionID'];
$strTipoGestion =  $_POST['strTipoGestion'];
$intEstatusID = $_POST['intEstatusID'];
$strEstatus = $_POST['strEstatus'];

$est = new estilo_hoja1();
$objPHPExcel->setActiveSheetIndex(0);

$host = "localhost";
$dbuser = "wwwvideo_root";
$dbpass = "V1de0@cces0s";
$dbnombre = "wwwvideo_video_accesos";

$con = conexion($host, $dbnombre, $dbuser, $dbpass);

$objDrawing = new PHPExcel_Worksheet_Drawing();
$objDrawing->setName('logo');
$objDrawing->setDescription('logotipo');
$objDrawing->setPath('../logo.png');
$objDrawing->setCoordinates('G1');
$objDrawing->setOffsetY(18);
$objDrawing->setWorksheet($objPHPExcel->getActiveSheet());

$objPHPExcel->getActiveSheet()->setCellValue('A1', "   REGISTROS DE ACCESOS");
$objPHPExcel->getActiveSheet()->getRowDimension(1)->setRowHeight(70);
$objPHPExcel->getActiveSheet()->getStyle('A1:H1')->applyFromArray($est->RowFondo);

$objPHPExcel->getActiveSheet()->setCellValue('B2', "Filtros:");

$strRestricciones = "WHERE DATE_ADD(RA.fecha_modificacion, INTERVAL -1 HOUR ) >= STR_TO_DATE('$strFechaHoraInicio','%d-%m-%Y %H:%i:00')
		             AND   DATE_ADD(RA.fecha_modificacion, INTERVAL -1 HOUR ) <= STR_TO_DATE('$strFechaHoraFin','%d-%m-%Y %H:%i:00') ";
$objPHPExcel->getActiveSheet()->setCellValue('C2', "Fecha/Hora Inicio");
$objPHPExcel->getActiveSheet()->setCellValue('D2', $strFechaHoraInicio);
$objPHPExcel->getActiveSheet()->setCellValue('C3', "Fecha/Hora Fin");
$objPHPExcel->getActiveSheet()->setCellValue('D3', $strFechaHoraFin);

$y = 4;
/*
if($intResidenciaID != 0){
	$strRestricciones .= "AND RA.residencia_id = $intResidenciaID ";
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Residencia");
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, utf8_encode($strResidencia));
	$y++;
}

if($strSolicitanteID != ""){
	$strRestricciones .= "AND RA.solicitante_id = '$strSolicitanteID' ";
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Solicitante");
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, utf8_encode($strSolicitante));
	$y++;
}

if($intOperadorID != 0){
	$strRestricciones .= "AND RA.empleado_id = $intOperadorID ";
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Operador");
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, utf8_encode($strOperador));
	$y++;
}

if($intPrivadaID != 0){
	$strRestricciones .= "AND RA.privada_id = $intPrivadaID ";
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Privadas");
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, utf8_encode($strPrivada));
	$y++;
}
if($intTipoGestionID != 0){
	$strRestricciones .= "AND RA.tipo_gestion_id = $intTipoGestionID ";
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Tipo de Gestion");
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, utf8_decode($strTipoGestion));
	$y++;
}
if($intEstatusID != 0){
	$strRestricciones .= "AND RA.estatus_id = $intEstatusID ";
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Estado");
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, utf8_encode($strEstatus));
	$y++;
} */
if($intEstatusID != 0){
	$strRestricciones .= "AND RA.estatus_id = $intEstatusID ";
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Estado");
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, utf8_encode($strEstatus));
	$y++;
}

if($strSolicitante != ""){
	//$strRestricciones .= "AND RA.solicitante_id = '$strSolicitanteID' ";
	 /*$strRestricciones .="AND (CONCAT_WS(' ','R -',RR.nombre,RR.ape_paterno,RR.ape_materno) LIKE '%$strSolicitante%' 
				               OR CONCAT_WS(' ','V -',RV.nombre,RV.ape_paterno,RV.ape_materno) LIKE '%$strSolicitante%'
				               OR CONCAT_WS(' ','G -',RG.nombre,RG.ape_paterno,RG.ape_materno) LIKE '%$strSolicitante%' 
						      ) ";*/
    //Reemplazar referencia de solicitante por cadena vacia
    $strSolicitante = str_replace("R - ","",$strSolicitante);
    $strSolicitante = str_replace("V - ","",$strSolicitante);
    $strSolicitante = str_replace("G - ","",$strSolicitante);

    $strRestricciones .= "AND (  (( CONCAT_WS(' ',RR.nombre,RR.ape_paterno, RR.ape_materno)  LIKE '%$strSolicitante%') OR
									       ( CONCAT_WS(' ',RR.ape_paterno,RR.ape_materno, RR.nombre)  LIKE '%$strSolicitante%')) OR
									   
									      (( CONCAT_WS(' ',RV.nombre,RV.ape_paterno, RV.ape_materno)  LIKE '%$strSolicitante%') OR
									       ( CONCAT_WS(' ',RV.ape_paterno,RV.ape_materno, RV.nombre)  LIKE '%$strSolicitante%'))OR
									  
									      (( CONCAT_WS(' ',RG.nombre,RG.ape_paterno, RG.ape_materno)  LIKE '%$strSolicitante%') OR
									       ( CONCAT_WS(' ',RG.ape_paterno,RG.ape_materno, RG.nombre)  LIKE '%$strSolicitante%'))
							       
								        ) ";
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Solicitante");
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, utf8_encode($strSolicitante));
	$y++;
}

if($intTipoGestionID != 0){
	$strRestricciones .= "AND RA.tipo_gestion_id = $intTipoGestionID ";
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Tipo de Gestion");
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, utf8_decode($strTipoGestion));
	$y++;
}

if($intResidenciaID != 0){
	$strRestricciones .= "AND RA.residencia_id = $intResidenciaID ";
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Residencia");
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, utf8_encode($strResidencia));
	$y++;
}

if($intPrivadaID != 0){
	$strRestricciones .= "AND RA.privada_id = $intPrivadaID ";
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Privadas");
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, utf8_encode($strPrivada));
	$y++;
}

if($intOperadorID != 0){
	$strRestricciones .= "AND RA.empleado_id = $intOperadorID ";
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Operador");
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, utf8_encode($strOperador));
	$y++;
}

$objPHPExcel->getActiveSheet()->getColumnDimension('A')->setWidth(25);
$objPHPExcel->getActiveSheet()->setCellValue('A'.$y, "Fecha / Hora");
$objPHPExcel->getActiveSheet()->getColumnDimension('B')->setWidth(15);
$objPHPExcel->getActiveSheet()->setCellValue('B'.$y, "Duración");
$objPHPExcel->getActiveSheet()->getColumnDimension('C')->setWidth(20);
$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Privada");
$objPHPExcel->getActiveSheet()->getColumnDimension('D')->setWidth(30);
$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, "Residencia");
$objPHPExcel->getActiveSheet()->getColumnDimension('E')->setWidth(30);
$objPHPExcel->getActiveSheet()->setCellValue('E'.$y, "Solicitante");
$objPHPExcel->getActiveSheet()->getColumnDimension('F')->setWidth(30);
$objPHPExcel->getActiveSheet()->setCellValue('F'.$y, "Operador");
$objPHPExcel->getActiveSheet()->getColumnDimension('G')->setWidth(20);
$objPHPExcel->getActiveSheet()->setCellValue('G'.$y, "Tipo Gestión");
$objPHPExcel->getActiveSheet()->getColumnDimension('H')->setWidth(20);
$objPHPExcel->getActiveSheet()->setCellValue('H'.$y, "Estado");
$objPHPExcel->getActiveSheet()->getStyle('A'.$y.':H'.$y)->applyFromArray($est->EncabezadoMes);

$y++;
//Aumenta el tiempo límite de ejecución de un script PHP
ini_set('max_execution_time', 5000); //300 seconds = 5 minutes
$strSQL = " SELECT DATE_FORMAT( DATE_ADD(RA.fecha_modificacion, INTERVAL -1 HOUR ),'%d-%m-%Y %r') AS fecha, RA.duracion, P.descripcion AS privada, 
	  R.nro_casa, R.calle, ( SELECT CONCAT_WS(' ',nombre,ape_paterno,ape_materno) nom 
				               FROM registros_generales 
						       WHERE registro_general_id = RA.solicitante_id 
						     UNION 
						       SELECT CONCAT_WS(' ',nombre,ape_paterno,ape_materno) nom 
				                       FROM residencias_visitantes 
						       WHERE visitante_id = RA.solicitante_id 
						     UNION 
						       SELECT CONCAT_WS(' ',nombre,ape_paterno,ape_materno) 
				                       FROM residencias_residentes 
						       WHERE residente_id = RA.solicitante_id 
							   ) AS solicitante, (CASE RA.tipo_gestion_id 
									            When 1 Then 'No concluida' 
										        When 2 Then 'Moroso' 
										        When 3 Then 'Proveedor' 
												When 4 Then 'Residente' 
												When 5 Then 'Técnico' 
												When 6 Then 'Trabajador de Obra' 
												When 7 Then 'Trabajador de Servicio' 
												When 8 Then 'Visita' 
												When 9 Then 'Visita de Morosos' 
       										  END) AS tipo_gestion, 
      CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) operador, RA.imagen, (CASE RA.estatus_id
																				 WHEN 1 THEN 'Acceso'
																				 WHEN 2 THEN 'Rechazado'
																				 WHEN 3 THEN 'Informado'
																			    END) estado 
FROM (((((registros_accesos RA INNER JOIN privadas P ON P.privada_id = RA.privada_id ) 
      INNER JOIN residencias R ON R.residencia_id = RA.residencia_id ) 
      LEFT JOIN residencias_residentes RR ON RR.residente_id = RA.solicitante_id )
      LEFT JOIN residencias_visitantes RV ON RV.visitante_id = RA.solicitante_id)
      LEFT JOIN registros_generales RG ON RG.registro_general_id = RA.solicitante_id)
	 INNER JOIN empleados E ON RA.empleado_id = E.empleado_id 
	$strRestricciones 
ORDER BY RA.fecha_modificacion "; 

$result = mysql_query($strSQL);
while($row = mysql_fetch_object($result)) {
	$objPHPExcel->getActiveSheet()->setCellValue( "A$y", $row->fecha);
	$objPHPExcel->getActiveSheet()->setCellValue( "B$y", $row->duracion);
	$objPHPExcel->getActiveSheet()->setCellValue( "C$y", utf8_encode($row->privada));
	$objPHPExcel->getActiveSheet()->setCellValue( "D$y", utf8_encode($row->nro_casa.', '.$row->calle));
	$objPHPExcel->getActiveSheet()->setCellValue( "E$y", utf8_encode($row->solicitante));
	$objPHPExcel->getActiveSheet()->setCellValue( "F$y", utf8_encode($row->operador));
	$objPHPExcel->getActiveSheet()->setCellValue( "G$y", $row->tipo_gestion);
	$objPHPExcel->getActiveSheet()->setCellValue( "H$y", $row->estado);
	$objPHPExcel->getActiveSheet()->getStyle('A'.$y.':H'.$y)->applyFromArray($est->RowText2);
	$y++;
}

//$objPHPExcel->getActiveSheet()->getStyle("A10:".$vecX[$x].'16')->applyFromArray($est->RowText2);
//$objPHPExcel->getActiveSheet()->getStyle('B10:'.$vecX[($x-1)].'10')->applyFromArray($est->EncabezadoMes);


$objPHPExcel->getActiveSheet()->setTitle("Reporte");

header('Content-Type: application/vnd.ms-excel');
//header('Content-Language: Spanish');
header('Content-Disposition: attachment;filename="Reporte_Registros_Acceso.xls"');
header('Cache-Control: max-age=0');

//$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel2007');
$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel5');
$objWriter->save('php://output');
exit;
?>
