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
		$objPHPExcel = PHPExcel_IOFactory::load('historial.xls');
		//// Set properties
		$objPHPExcel->getProperties()->setCreator("Sistema Control de Accesos")
									 ->setLastModifiedBy("Sistema Control de Accesos")
									 ->setTitle("Recuperacion Patrimonial")
									 ->setSubject("Office 2007 XLSX Test Document")
									 ->setDescription("Listado de Recuperacion  Patrimonial filtrados por fechas y otros filtros.")
									 ->setKeywords("Reporte de Recuperacion Patrimonial")
									 ->setCategory("Reporte");

        //Recuperar parámetros de búsqueda (de la vista)
		$strFechaInicio = $_POST['strFechaInicio'];
	    $dteFechaInicioMysql = $_POST['dteFechaInicio'];
		$strFechaFin = $_POST['strFechaFin'];
		$dteFechaFinMysql = $_POST['dteFechaFin'];
		$intPrivadaID =  $_POST['intPrivadaID'];
		$strPrivada =  $_POST['strPrivada'];
		$strResponsable = $_POST['strResposable'];
		$strTipoDano = $_POST['strTipoDano'];
		$strFolio = $_POST['strFolio'];
		//Variable que se utiliza para contar el número de registros
        $intContador=0;

		$est = new estilo_hoja1();
		$objPHPExcel->setActiveSheetIndex(0);
		$con = conexion($host, $dbnombre, $dbuser, $dbpass);

        //Criterios de búsqueda (consulta bd)
		$strRestricciones = "WHERE DATE_FORMAT(RA.fecha,'%Y-%m-%d')  BETWEEN '$dteFechaInicioMysql' AND '$dteFechaFinMysql' ";
	     
		$objPHPExcel->getActiveSheet()->setCellValue('C2', "Fecha Inicio: ".$strFechaInicio);
		$objPHPExcel->getActiveSheet()->setCellValue('C3', "Fecha Fin:      ".$strFechaFin);
        //Se agregan los datos 
		$y = 6;//Numero de fila donde se va a comenzar a rellenar las columnas 
		 //Si el id de la privada es diferente de 0, búsca por privada 
		if($intPrivadaID != 0)
		{
			$strRestricciones .= "AND RA.privada_id = $intPrivadaID ";
			//Escribir filtro de privada
			$objPHPExcel->getActiveSheet()->setCellValue('D2', "Privada: ".$strPrivada);
		}
		//Si el responsable es diferente de vacio, búsca por responsable 
        if($strResponsable!= "")
        {
			$strRestricciones .= "AND (CONCAT_WS(' ',RA.responsable_nombre,RA.responsable_domicilio) LIKE  '%$strResponsable%')";
		   //Escribir filtro de responsable
			$objPHPExcel->getActiveSheet()->setCellValue('D3', "Responsable: ".$strResponsable);
        }
        //Si el tipo de daño es diferente de 0, búsca por tipo de daño
		if($strTipoDano != "0")
		{
			$strRestricciones .= "AND RA.tipo_dano = '$strTipoDano' ";
			 //Escribir filtro de tipo de daño
			$objPHPExcel->getActiveSheet()->setCellValue('E2', "Tipo de Dano: ".$strTipoDano);

		}
		//Si el folio es diferente de vacio, búsca por folio
		if($strFolio != "")
		{
			$strRestricciones .= "AND RA.folio = '$strFolio' ";
			 //Escribir filtro de folio
			$objPHPExcel->getActiveSheet()->setCellValue('E3', "Folio:  ".$strFolio);

		}

		$y++;
        //Realizar consulta para recuperar los datos de las recuperaciones patrimoniales que coinciden con los parámetros de búsqueda
		$strSQL = " SELECT DATE_FORMAT(RA.fecha,'%d-%m-%Y %r') AS fecha, P.descripcion AS privada, 
		            RA.tipo_dano,RA.folio, CONCAT_WS(' ',RA.responsable_nombre,', Dom.:',RA.responsable_domicilio,', Tel.:',RA.responsable_telefono,', Cel.:',RA.responsable_celular,', Relación:',RA.responsable_relacion ) AS responsable
				   
		FROM (recuperacion_patrimonial RA INNER JOIN privadas P ON P.privada_id = RA.privada_id ) 
			$strRestricciones
		ORDER BY RA.fecha ASC";

        //Iteramos en todos los registros recuperados de la base de datos
		$result = mysql_query($strSQL);
		while($row = mysql_fetch_object($result)) {
			$objPHPExcel->getActiveSheet()->setCellValue( "A$y",$row->fecha);
			$objPHPExcel->getActiveSheet()->setCellValue( "B$y", $row->privada);
			$objPHPExcel->getActiveSheet()->setCellValue( "C$y", $row->responsable);
			$objPHPExcel->getActiveSheet()->setCellValue( "D$y", $row->tipo_dano);
			$objPHPExcel->getActiveSheet()->setCellValue( "E$y", $row->folio);
			$objPHPExcel->getActiveSheet()->getStyle('A'.$y.':E'.$y)->applyFromArray($est->RowText2);
			//Incrementar el contador por cada registro
			$intContador++;
			$y++;

		}
		//Incrementar el indice para escribir el total de las recuperaciones patrimoniales
         $y=$y+2;
        //Información detallada
		$objPHPExcel->setActiveSheetIndex(0)
				    ->setCellValue('E'.$y,'Total: '. $intContador);

        //Nombre de la hoja
		$objPHPExcel->getActiveSheet()->setTitle("Reporte");
		header('Content-Type: application/vnd.ms-excel');
		//Nombre del archivo
		header('Content-Disposition: attachment;filename="Reporte_Recuperacion_Patrimonial.xls"');
		header('Cache-Control: max-age=0');
		$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel5');
		$objWriter->save('php://output');
		exit;
?>

