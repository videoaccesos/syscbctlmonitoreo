<?php
set_time_limit(0);

require_once ("../clases/PHPExcel.php");
require_once ('../clases/PHPExcel/IOFactory.php');
require_once ('../clases/PHPExcel/Worksheet.php');

require_once ("../funciones.php");
require_once ("../estilos.php");
require_once ("control.php");

class rendimiento_monitoreo extends control
{
	function rendimiento_monitoreo($intMes,$intAnio){
		$this->iniciarControl($intMes*1,$intAnio*1);
	}

	public function fnReporte($objExel){
		include '../config.php';
		$est = new estilo_hoja1();
		$con = conexion($host, $dbnombre, $dbuser, $dbpass);
		$strHoja = $this->MesesNombres[$this->intMes]."_".$this->intAnio;

		//Asignando recorte de hoja
		//$objExel->getActiveSheet()->freezePane('B5');
		
		//Asignando Tamaño
		$objExel->getActiveSheet()->getColumnDimension('A')->setWidth(40);
		$objExel->getActiveSheet()->getColumnDimension('B')->setWidth(15);
		$objExel->getActiveSheet()->getColumnDimension('C')->setWidth(20);
		$objExel->getActiveSheet()->getColumnDimension('D')->setWidth(20);
		$objExel->getActiveSheet()->getColumnDimension('E')->setWidth(20);
		$objExel->getActiveSheet()->getColumnDimension('F')->setWidth(20);
		$objExel->getActiveSheet()->getColumnDimension('G')->setWidth(20);
		$objExel->getActiveSheet()->getColumnDimension('H')->setWidth(20);
		 
		$objExel->getActiveSheet()->setCellValue('A1', 'EMPLEADO');
		$objExel->getActiveSheet()->setCellValue('B1', 'OPERADOR');
		$objExel->getActiveSheet()->setCellValue('C1', 'SEMANA 1');
		$objExel->getActiveSheet()->setCellValue('D1', 'SEMANA 2');
		$objExel->getActiveSheet()->setCellValue('E1', 'SEMANA 3');
		$objExel->getActiveSheet()->setCellValue('F1', 'SEMANA 4');
		$objExel->getActiveSheet()->setCellValue('G1', 'TOTAL');
		$objExel->getActiveSheet()->setCellValue('H1', 'PORCENTAJE');

		for($i = 0; $i<8; $i++){
			$col = $i;
			$objExel->getActiveSheet()->getStyle($this->vecX[$col]."1")->applyFromArray($est->EncabezadoMes);
		}

		$intY = 2;
		$strFecha = "'".$this->intAnio."-".$this->intMes."-01'";
		$strSQL = " SELECT T.*
					FROM (
						SELECT CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) AS empleado, E.nro_operador, 
						    (SELECT COUNT(*)
						        FROM registros_accesos RA
							WHERE DATE(RA.fecha_modificacion) >= $strFecha
						        AND DATE(RA.fecha_modificacion) <= DATE(DATE_ADD($strFecha,INTERVAL 7 DAY))
						        AND RA.empleado_id = E.empleado_id) AS S1,
							
							(SELECT COUNT(*)
						        FROM registros_accesos RA
							WHERE DATE(RA.fecha_modificacion) >= DATE(DATE_ADD($strFecha,INTERVAL 8 DAY))
						        AND DATE(RA.fecha_modificacion) <= DATE(DATE_ADD($strFecha,INTERVAL 14 DAY))
						        AND RA.empleado_id = E.empleado_id) AS S2,

							(SELECT COUNT(*)
						        FROM registros_accesos RA
							WHERE DATE(RA.fecha_modificacion) >= DATE(DATE_ADD($strFecha,INTERVAL 15 DAY))
						        AND DATE(RA.fecha_modificacion) <= DATE(DATE_ADD($strFecha,INTERVAL 21 DAY))
						        AND RA.empleado_id = E.empleado_id) AS S3,

							(SELECT COUNT(*)
						        FROM registros_accesos RA
							WHERE DATE(RA.fecha_modificacion) >= DATE(DATE_ADD($strFecha,INTERVAL 22 DAY))
						        AND MONTH(RA.fecha_modificacion) = $this->intMes 
							AND YEAR(RA.fecha_modificacion) = $this->intAnio 
							AND RA.empleado_id = E.empleado_id ) AS S4 
						FROM empleados AS E 
					) AS T 
					WHERE  (T.S1 <> 0 OR T.S2 <> 0 OR T.S3 <> 0 OR T.S4 <> 0) 
					ORDER BY T.empleado ";
			//echo $strSQL." <br><br>";
			$result = mysql_query($strSQL);
			$intTotal = mysql_num_rows($result);
			while($row = mysql_fetch_object($result)) {
				$objExel->getActiveSheet()->setCellValue('A'.$intY, utf8_encode($row->empleado));
				$objExel->getActiveSheet()->setCellValue('B'.$intY, $row->nro_operador);
				$objExel->getActiveSheet()->setCellValue('C'.$intY, $row->S1);
				$objExel->getActiveSheet()->setCellValue('D'.$intY, $row->S2);
				$objExel->getActiveSheet()->setCellValue('E'.$intY, $row->S3);
				$objExel->getActiveSheet()->setCellValue('F'.$intY, $row->S4);
				$objExel->getActiveSheet()->setCellValue('G'.$intY, '=SUM(C'.$intY.':F'.$intY.')');
				$objExel->getActiveSheet()->setCellValue('H'.$intY, '=G'.$intY.'/G'.($intTotal+2));
				//Estilos y Formato
				$objExel->getActiveSheet()->getStyle($this->vecX[0].$intY)->applyFromArray($est->RowText);
				for($x=1; $x<8; $x++)
					$objExel->getActiveSheet()->getStyle($this->vecX[$x].$intY)->applyFromArray($est->Row);
				$objExel->getActiveSheet()->getStyle('H'.$intY)->getNumberFormat()->setFormatCode(PHPExcel_Style_NumberFormat::FORMAT_PERCENTAGE_00);
				$intY++;
			}
			mysql_free_result($result);

			if($intTotal == 0){
				$objExel->getActiveSheet()->setCellValue('A'.$intY, 'TOTALES');
				$objExel->getActiveSheet()->setCellValue('B'.$intY, '');
				$objExel->getActiveSheet()->setCellValue('C'.$intY, '0');
				$objExel->getActiveSheet()->setCellValue('D'.$intY, '0');
				$objExel->getActiveSheet()->setCellValue('E'.$intY, '0');
				$objExel->getActiveSheet()->setCellValue('F'.$intY, '0');
				$objExel->getActiveSheet()->setCellValue('G'.$intY, '0');
				$objExel->getActiveSheet()->setCellValue('H'.$intY, '0');
				$objExel->getActiveSheet()->getStyle('H'.$intY)->getNumberFormat()->setFormatCode(PHPExcel_Style_NumberFormat::FORMAT_PERCENTAGE_00);
			}
			else {
				$objExel->getActiveSheet()->setCellValue('A'.$intY, 'TOTALES');
				$objExel->getActiveSheet()->setCellValue('B'.$intY, '');
				$objExel->getActiveSheet()->setCellValue('C'.$intY, '=SUM(C2:C'.($intY-1).')');
				$objExel->getActiveSheet()->setCellValue('D'.$intY, '=SUM(D2:D'.($intY-1).')');
				$objExel->getActiveSheet()->setCellValue('E'.$intY, '=SUM(E2:E'.($intY-1).')');
				$objExel->getActiveSheet()->setCellValue('F'.$intY, '=SUM(F2:F'.($intY-1).')');
				$objExel->getActiveSheet()->setCellValue('G'.$intY, '=SUM(C'.$intY.':F'.$intY.')');
				$objExel->getActiveSheet()->setCellValue('H'.$intY, '=G'.$intY.'/G'.$intY.')');
				$objExel->getActiveSheet()->getStyle('H'.$intY)->getNumberFormat()->setFormatCode(PHPExcel_Style_NumberFormat::FORMAT_PERCENTAGE_00);
			}

		for($x=0; $x<8; $x++)
			$objExel->getActiveSheet()->getStyle($this->vecX[$x].$intY)->applyFromArray($est->Row);

		$objExel->getActiveSheet()->setTitle($strHoja);
		return $objExel;
	}
}

?>