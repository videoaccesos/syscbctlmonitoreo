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
	function rendimiento_monitoreo($strFechaIni,$strFechaFin){
		$this->iniciarControl($strFechaIni,$strFechaFin);
	}

	public function fnReporte($objExel){
		include '../config.php';
		$est = new estilo_hoja1();
		$con = conexion($host, $dbnombre, $dbuser, $dbpass);
		$strHoja = $this->strFechaIni."_".$this->strFechaFin;
		$dtFechaIni  = $this->strFechaIni;
		$dtFechaIntermediaIni = $this->strFechaIni;
		$dtFechaIntermediaFin = $this->strFechaIni;
		$dtFechaFin  = $this->strFechaFin;

		//Asignando recorte de hoja
		//$objExel->getActiveSheet()->freezePane('B5');
		
		//Asignando Tamaño

		$objExel->getActiveSheet()->getDefaultColumnDimension()->setWidth(20);
		$objExel->getActiveSheet()->getColumnDimension('A')->setWidth(40);
		$objExel->getActiveSheet()->getColumnDimension('B')->setWidth(15);
		 
		$objExel->getActiveSheet()->setCellValue('A1', 'EMPLEADO');
		$objExel->getActiveSheet()->setCellValue('B1', 'OPERADOR');

		$x = 2;
		$numSem = 1;
		$strSQL2 = "";
		$strSQL4 = "";

		while ($dtFechaIntermediaIni <= $dtFechaFin){
			if($strSQL2 != "") $strSQL2 .= ",";
			if($strSQL4 != "") $strSQL4 .= " OR ";
			$strSQL4 .= "S$numSem <> 0";

			$dtFechaIntermediaFin = date("Y-m-d",strtotime("+6 days", strtotime($dtFechaIntermediaIni)));
			if($dtFechaIntermediaFin > $dtFechaFin)
				$dtFechaIntermediaFin = $dtFechaFin;
			$strSQL2 .= "(SELECT COUNT(*)
					      FROM registros_accesos RA
						  WHERE DATE(RA.fecha_modificacion) >= '$dtFechaIntermediaIni'
					      AND DATE(RA.fecha_modificacion) <= '$dtFechaIntermediaFin'
					      AND RA.empleado_id = E.empleado_id) AS S".$numSem." ";
			$objExel->getActiveSheet()->setCellValue($this->vecX[$x].'1', 'SEMANA '.$numSem);
			$dtFechaIntermediaIni = $dtFechaIntermediaFin;
			$dtFechaIntermediaIni = date("Y-m-d",strtotime("+1 days", strtotime($dtFechaIntermediaIni)));
			$dtFechaIntermediaFin = $dtFechaIntermediaIni;
			$numSem++;
			$x++;
		}
		$objExel->getActiveSheet()->setCellValue($this->vecX[$x].'1', 'TOTAL');
		$x++;
		$objExel->getActiveSheet()->setCellValue($this->vecX[$x].'1', 'PORCENTAJE');

		for($i = 0; $i<=$x; $i++){
			$col = $i;
			$objExel->getActiveSheet()->getStyle($this->vecX[$col]."1")->applyFromArray($est->EncabezadoMes);
		}
		$intY = 2;
		$strFecha = "'".$this->intAnio."-".$this->intMes."-01'";
		$strSQL1 = "SELECT T.*
					FROM (
						SELECT CONCAT_WS(' ',E.nombre,E.ape_paterno,E.ape_materno) AS empleado, E.nro_operador, ";

			$strSQL3 = "FROM empleados AS E 
					) AS T 
					WHERE  (";

			$strSQL5 = ") ORDER BY T.empleado ";
			//echo $strSQL." <br><br>";
			//echo $strSQL1.$strSQL2.$strSQL3.$strSQL4.$strSQL5;
			$result = mysql_query($strSQL1.$strSQL2.$strSQL3.$strSQL4.$strSQL5);
			$intTotal = mysql_num_rows($result);
			while($row = mysql_fetch_assoc($result)) {
				$intX = 2;
				$objExel->getActiveSheet()->setCellValue('A'.$intY, utf8_encode($row["empleado"]));
				$objExel->getActiveSheet()->setCellValue('B'.$intY, $row["nro_operador"]);

				while($intX < $x){
					$objExel->getActiveSheet()->setCellValue($this->vecX[$intX].$intY, $row["S".($intX-1)]);
					$intX++;
				}

				$objExel->getActiveSheet()->setCellValue($this->vecX[$intX-1].$intY, '=SUM(C'.$intY.':'.$this->vecX[$intX-2].$intY.')');
				
				$objExel->getActiveSheet()->setCellValue($this->vecX[$intX].$intY, '='.$this->vecX[$intX-1].$intY.'/'.$this->vecX[$intX-1].($intTotal+2));
				$intX++;

				//$objExel->getActiveSheet()->setCellValue('G'.$intY, '=SUM(C'.$intY.':F'.$intY.')');
				//$objExel->getActiveSheet()->setCellValue('H'.$intY, '=G'.$intY.'/G'.($intTotal+2));

				//Estilos y Formato
				$objExel->getActiveSheet()->getStyle($this->vecX[0].$intY)->applyFromArray($est->RowText);
				for($forX=1; $forX<$intX; $forX++)
					$objExel->getActiveSheet()->getStyle($this->vecX[$forX].$intY)->applyFromArray($est->Row);
				$objExel->getActiveSheet()->getStyle($this->vecX[$intX-1].$intY)->getNumberFormat()->setFormatCode(PHPExcel_Style_NumberFormat::FORMAT_PERCENTAGE_00);
				$intY++;
			}
			mysql_free_result($result);

			if($intTotal == 0){
				$objExel->getActiveSheet()->setCellValue('A'.$intY, 'TOTALES');
				$objExel->getActiveSheet()->setCellValue('B'.$intY, '');
				$intX = 2;
				while($intX < $x){
					$objExel->getActiveSheet()->setCellValue($this->vecX[$intX].$intY,'0');
					$intX++;
				}
				$objExel->getActiveSheet()->getStyle($this->vecX[$intX-1].$intY)->getNumberFormat()->setFormatCode(PHPExcel_Style_NumberFormat::FORMAT_PERCENTAGE_00);
			}
			else {
				$objExel->getActiveSheet()->setCellValue('A'.$intY, 'TOTALES');
				$objExel->getActiveSheet()->setCellValue('B'.$intY, '');

				$intX = 2;
				while($intX < $x){
					$objExel->getActiveSheet()->setCellValue($this->vecX[$intX].$intY,'=SUM('.$this->vecX[$intX].'2:'.$this->vecX[$intX].($intY-1).')');
					$intX++;
				}
				$objExel->getActiveSheet()->setCellValue($this->vecX[$intX-1].$intY, '=SUM(C'.$intY.':'.$this->vecX[$intX-2].$intY.')');
				$objExel->getActiveSheet()->setCellValue($this->vecX[$intX].$intY, '='.$this->vecX[$intX-1].$intY.'/'.$this->vecX[$intX-1].$intY.')');
				$objExel->getActiveSheet()->getStyle($this->vecX[$intX].$intY)->getNumberFormat()->setFormatCode(PHPExcel_Style_NumberFormat::FORMAT_PERCENTAGE_00);
			}

		for($x=0; $x<=$intX; $x++)
			$objExel->getActiveSheet()->getStyle($this->vecX[$x].$intY)->applyFromArray($est->Row);

		$objExel->getActiveSheet()->setTitle($strHoja);
		return $objExel;
	}
}

?>