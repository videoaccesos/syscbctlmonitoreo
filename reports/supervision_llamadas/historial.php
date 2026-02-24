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
							 ->setTitle("Supervicion de LLamadas")
							 ->setSubject("Office 2007 XLSX Test Document")
							 ->setDescription("Tabla de supervicion de llamadas en un rango de fechas.")
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

$objPHPExcel->getActiveSheet()->setCellValue('G2', $_POST["strFechaIni"]);
$objPHPExcel->getActiveSheet()->setCellValue('G3', $_POST["strFechaFin"]);

$strSQL = " SELECT CONCAT_WS(  ' ', E.nombre, E.ape_paterno ) AS empleado, E.empleado_id
			FROM empleados E
			WHERE empleado_id IN (
									SELECT DISTINCT RA.empleado_id
									FROM registros_accesos RA
									INNER JOIN supervicion_llamadas SL ON RA.registro_acceso_id = SL.registro_acceso_id
									WHERE DATE(SL.fecha) >= '$strFechaIni'
									AND DATE(SL.fecha) <= '$strFechaFin'
								  ) ";				  		
$result = mysql_query($strSQL);
$strSQLOperadores = "";
$x = 22;
while($row = mysql_fetch_object($result)) {
	if($strSQLOperadores != "") $strSQLOperadores .= ",";
	$strSQLOperadores.= " (CASE WHEN RA.empleado_id = $row->empleado_id THEN 1 ELSE 0 END) AS E$row->empleado_id ";
	$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].'6', utf8_encode(strtoupper($row->empleado)));
	$objPHPExcel->getActiveSheet()->getStyle($vecX[$x].'6')->applyFromArray($est->Encabezado90);
	$objPHPExcel->getActiveSheet()->getStyle($vecX[$x].'6')->getAlignment()->setTextRotation(90);
	$x++;
}
if($strSQLOperadores != "") $strSQLOperadores = ",".$strSQLOperadores;
$strSQL = " SELECT DATE_FORMAT( S.fecha,'%d-%m-%Y %H:%i') AS fecha, P.descripcion AS privada, 
				   S.saludo, S.identifico_empresa,S.identifico_operador, S.amable,
				   S.gracias, S.demanda, S.asunto, TIME_TO_SEC(S.tiempo_gestion) AS tiempo_gestion, 
				   (CASE S.asunto WHEN 1 THEN 1 ELSE 0 END) AS asunto_informacion,
				   (CASE S.asunto WHEN 2 THEN 1 ELSE 0 END) AS asunto_apertura,
				   (CASE S.asunto WHEN 3 THEN 1 ELSE 0 END) AS asunto_falla,
				   (CASE RA.tipo_gestion_id  WHEN 2 THEN 1 ELSE 0 END) AS tipo_gestion_moroso,
				   (CASE RA.tipo_gestion_id  WHEN 3 THEN 1 ELSE 0 END) AS tipo_gestion_proveedor,
				   (CASE RA.tipo_gestion_id  WHEN 4 THEN 1 ELSE 0 END) AS tipo_gestion_residente,
				   (CASE RA.tipo_gestion_id  WHEN 5 THEN 1 ELSE 0 END) AS tipo_gestion_tecnico,
				   (CASE RA.tipo_gestion_id  WHEN 6 THEN 1 ELSE 0 END) AS tipo_gestion_trabajador_o,
				   (CASE RA.tipo_gestion_id  WHEN 7 THEN 1 ELSE 0 END) AS tipo_gestion_trabajador_s,
				   (CASE RA.tipo_gestion_id  WHEN 8 THEN 1 ELSE 0 END) AS tipo_gestion_visita,
				   (CASE RA.tipo_gestion_id  WHEN 9 THEN 1 ELSE 0 END) AS tipo_gestion_visita_moroso,
	               CONCAT_WS(' ', ES.nombre, ES.ape_paterno, ES.ape_materno) AS supervisor, S.observaciones $strSQLOperadores
		    FROM  (registros_accesos RA INNER JOIN supervicion_llamadas S ON  S.registro_acceso_id = RA.registro_acceso_id
		    	                                                          AND DATE(S.fecha) >= '$strFechaIni'
																		  AND DATE(S.fecha) <= '$strFechaFin')
		          INNER JOIN residencias R ON R.residencia_id = RA.residencia_id
                  INNER JOIN privadas P ON P.privada_id = RA.privada_id
                  INNER JOIN empleados ES ON S.supervisor_id = ES.empleado_id 
            ORDER BY fecha ";
$y = 7;
$result2 = mysql_query($strSQL);
while($row = mysql_fetch_assoc($result2)){
	$objPHPExcel->getActiveSheet()->setCellValue('A'.$y, $row["fecha"]);
	$objPHPExcel->getActiveSheet()->setCellValue('B'.$y, utf8_encode($row["privada"]));
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, $row["saludo"]);
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, $row["identifico_empresa"]);
	$objPHPExcel->getActiveSheet()->setCellValue('E'.$y, $row["identifico_operador"]);
	$objPHPExcel->getActiveSheet()->setCellValue('F'.$y, $row["amable"]);
	$objPHPExcel->getActiveSheet()->setCellValue('G'.$y, $row["asunto_informacion"]);
	$objPHPExcel->getActiveSheet()->setCellValue('H'.$y, $row["asunto_apertura"]);
	$objPHPExcel->getActiveSheet()->setCellValue('I'.$y, $row["asunto_falla"]);
	$objPHPExcel->getActiveSheet()->setCellValue('J'.$y, $row["tipo_gestion_moroso"]);
	$objPHPExcel->getActiveSheet()->setCellValue('K'.$y, $row["tipo_gestion_proveedor"]);
	$objPHPExcel->getActiveSheet()->setCellValue('L'.$y, $row["tipo_gestion_residente"]);
	$objPHPExcel->getActiveSheet()->setCellValue('M'.$y, $row["tipo_gestion_tecnico"]);
	$objPHPExcel->getActiveSheet()->setCellValue('N'.$y, $row["tipo_gestion_trabajador_o"]);
	$objPHPExcel->getActiveSheet()->setCellValue('O'.$y, $row["tipo_gestion_trabajador_s"]);
	$objPHPExcel->getActiveSheet()->setCellValue('P'.$y, $row["tipo_gestion_visita"]);
	$objPHPExcel->getActiveSheet()->setCellValue('Q'.$y, $row["tipo_gestion_visita_moroso"]);
	$objPHPExcel->getActiveSheet()->setCellValue('R'.$y, $row["gracias"]);
	$objPHPExcel->getActiveSheet()->setCellValue('S'.$y, $row["tiempo_gestion"]);
	$objPHPExcel->getActiveSheet()->setCellValue('T'.$y, $row["demanda"]);
	$objPHPExcel->getActiveSheet()->setCellValue('U'.$y, utf8_encode($row["observaciones"]));
	$objPHPExcel->getActiveSheet()->setCellValue('V'.$y, utf8_encode($row["supervisor"]));
	if ( mysql_num_rows ( $result) > 0 ) 
		mysql_data_seek($result,0);
	$x = 22;
	while($row2 = mysql_fetch_object($result)) {
		$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].$y, $row["E$row2->empleado_id"]);
		$x++;
	}
	$objPHPExcel->getActiveSheet()->getStyle('A'.$y.':'.$vecX[$x-1].$y)->applyFromArray($est->RowText2);
	$y++;
}
if ( mysql_num_rows ( $result2) > 0 ) 
{	
	$objPHPExcel->getActiveSheet()->getStyle('A'.$y.':'.$vecX[$x-1].$y)->applyFromArray($est->RowText2);
	$objPHPExcel->getActiveSheet()->setCellValue('C'.$y,  "=SUM(C7:C".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('D'.$y,  "=SUM(D7:D".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('E'.$y,  "=SUM(E7:E".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('F'.$y,  "=SUM(F7:F".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('G'.$y,  "=SUM(G7:G".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('H'.$y,  "=SUM(H7:H".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('I'.$y,  "=SUM(I7:I".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('J'.$y,  "=SUM(J7:J".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('K'.$y,  "=SUM(K7:K".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('L'.$y,  "=SUM(L7:L".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('M'.$y,  "=SUM(M7:M".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('N'.$y,  "=SUM(N7:N".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('O'.$y,  "=SUM(O7:O".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('P'.$y,  "=SUM(P7:P".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('Q'.$y,  "=SUM(Q7:Q".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('R'.$y,  "=SUM(R7:R".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('S'.$y,  "=SUM(S7:S".($y-1).")");
	$objPHPExcel->getActiveSheet()->setCellValue('T'.$y,  "=SUM(T7:Y".($y-1).")");
}
if ( mysql_num_rows ( $result) > 0 ) 
{	
	mysql_data_seek($result,0);
	$x = 22;
	while($row2 = mysql_fetch_object($result)) {
		$objPHPExcel->getActiveSheet()->setCellValue($vecX[$x].$y, "=SUM(".$vecX[$x]."7:".$vecX[$x].($y-1).")");
		$x++;
	}
}
$objPHPExcel->getActiveSheet()->setTitle("Reporte");
mysql_free_result($result2);
mysql_free_result($result);
header('Content-Type: application/vnd.ms-excel');
//header('Content-Language: Spanish');
header('Content-Disposition: attachment;filename="Reporte_Supervicion.xls"');
header('Cache-Control: max-age=0');

//$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel2007');
$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel5');
$objWriter->save('php://output');
exit;

?>