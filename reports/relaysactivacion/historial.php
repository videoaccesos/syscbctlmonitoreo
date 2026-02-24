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
									 ->setDescription("Listado de relays  activados filtrados por fechas y otros filtros.")
									 ->setKeywords("Reporte de Activación de Relays")
									 ->setCategory("Reporte");

        //Recuperar parámetros de búsqueda (de la vista)
		$strFechaInicio = $_POST['strFechaInicio'];
	    $dteFechaInicioMysql = $_POST['dteFechaInicio'];
		$strFechaFin = $_POST['strFechaFin'];
		$dteFechaFinMysql = $_POST['dteFechaFin'];
		$intPrivadaID =  $_POST['intPrivadaID'];
		$strPrivada =  $_POST['strPrivada'];
		$intUsuarioID = $_POST['intUsuarioID'];
		$strUsuario = $_POST['strUsuario'];
		$strTiempo = $_POST['strTiempo'];
		$strConcepto = $_POST['strConcepto'];
		//Variable que se utiliza para contar el número de registros
        $intContador=0;

		$est = new estilo_hoja1();
		$objPHPExcel->setActiveSheetIndex(0);
		$con = conexion($host, $dbnombre, $dbuser, $dbpass);

		$objDrawing = new PHPExcel_Worksheet_Drawing();
		$objDrawing->setName('logo');
		$objDrawing->setDescription('logotipo');
		$objDrawing->setPath('../logo.png');
		$objDrawing->setCoordinates('G1');
		$objDrawing->setOffsetY(18);
		$objDrawing->setWorksheet($objPHPExcel->getActiveSheet());

		$objPHPExcel->getActiveSheet()->setCellValue('A1', "   ACTIVACIÓN DE RELAYS");
		$objPHPExcel->getActiveSheet()->getRowDimension(1)->setRowHeight(70);
		$objPHPExcel->getActiveSheet()->getStyle('A1:H1')->applyFromArray($est->RowFondo);

		$objPHPExcel->getActiveSheet()->setCellValue('B2', "Filtros:");
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
		//Si el id del usuario es diferente de 0, búsca por usuario 
        if($intUsuarioID != 0)
        {
			$strRestricciones .= "AND RA.usuario_id = $intUsuarioID ";
		   //Escribir filtro de usuario
			$objPHPExcel->getActiveSheet()->setCellValue('D3', "Usuario: ".$strUsuario);
        }
        //Si el tiempo es diferente de 0, búsca por tiempo de activación
		if($strTiempo != 0)
		{
			$strRestricciones .= "AND RA.tiempo = '$strTiempo' ";
			 //Escribir filtro de tiempo
			$objPHPExcel->getActiveSheet()->setCellValue('F2', "Tiempo:       ".$strTiempo);

		}
		//Si el concepto es diferente de vacio, búsca por concepto
		if($strConcepto != '')
		{
			$strRestricciones .= "AND RA.concepto = '$strConcepto' ";
			 //Escribir filtro de concepto
			$objPHPExcel->getActiveSheet()->setCellValue('F3', "Concepto:  ".$strConcepto);

		}

		//Nombre de las columnas que va contener el archivo excel
		$objPHPExcel->getActiveSheet()->getColumnDimension('A')->setWidth(30);
		$objPHPExcel->getActiveSheet()->setCellValue('A'.$y, "Privada");
		$objPHPExcel->getActiveSheet()->getColumnDimension('B')->setWidth(25);
		$objPHPExcel->getActiveSheet()->setCellValue('B'.$y, "Fecha");
		$objPHPExcel->getActiveSheet()->getColumnDimension('C')->setWidth(50);
		$objPHPExcel->getActiveSheet()->setCellValue('C'.$y, "Usuario");
		$objPHPExcel->getActiveSheet()->getColumnDimension('D')->setWidth(35);
		$objPHPExcel->getActiveSheet()->setCellValue('D'.$y, "DNS");
		$objPHPExcel->getActiveSheet()->getColumnDimension('E')->setWidth(40);
		$objPHPExcel->getActiveSheet()->setCellValue('E'.$y, "Concepto");
		$objPHPExcel->getActiveSheet()->getColumnDimension('F')->setWidth(30);
		$objPHPExcel->getActiveSheet()->setCellValue('F'.$y, "Relays");
		$objPHPExcel->getActiveSheet()->getColumnDimension('G')->setWidth(15);
		$objPHPExcel->getActiveSheet()->setCellValue('G'.$y,  "Estado");
		$objPHPExcel->getActiveSheet()->getColumnDimension('H')->setWidth(23);
		$objPHPExcel->getActiveSheet()->setCellValue('H'.$y,  "Tiempo");
		$objPHPExcel->getActiveSheet()->getStyle('A'.$y.':H'.$y)->applyFromArray($est->EncabezadoMes);
        //Incrementar la posición de la fila
		$y++;
        //Realizar consulta para recuperar los datos de los relays activados que coinciden con los parámetros de búsqueda
		$strSQL = " SELECT DATE_FORMAT(RA.fecha,'%d-%m-%Y %r') AS fecha, RA.concepto, RA.relays, RA.estado,RA.tiempo,
				    P.descripcion AS privada, CONCAT_WS(' ',US.usuario,'-',E.nombre,E.ape_paterno,E.ape_materno) AS usuario,
				    (CASE RA.dns
							 WHEN 1 THEN CONCAT(P.dns_1,':',P.puerto_1)
							 WHEN 2 THEN CONCAT(P.dns_2,':',P.puerto_2)
							 WHEN 3 THEN CONCAT(P.dns_3,':',P.puerto_3)
				    END) dns
		FROM ((relays_activacion RA INNER JOIN privadas P ON P.privada_id = RA.privada_id ) 
		      INNER JOIN usuarios US ON US.usuario_id = RA.usuario_id ) 
			  INNER JOIN empleados E ON US.empleado_id = E.empleado_id 
			$strRestricciones
		ORDER BY RA.fecha ASC";
	 //ECHO 'LA CONSULTA'.$strSQL;
        //Iteramos en todos los registros recuperados de la base de datos
		$result = mysql_query($strSQL);
		while($row = mysql_fetch_object($result)) {
			$objPHPExcel->getActiveSheet()->setCellValue( "A$y", utf8_encode($row->privada));
			$objPHPExcel->getActiveSheet()->setCellValue( "B$y", $row->fecha);
			$objPHPExcel->getActiveSheet()->setCellValue( "C$y", utf8_encode($row->usuario));
			$objPHPExcel->getActiveSheet()->setCellValue( "D$y", utf8_encode($row->dns));
			$objPHPExcel->getActiveSheet()->setCellValue( "E$y", utf8_encode($row->concepto));
			$objPHPExcel->getActiveSheet()->setCellValue( "F$y", $row->relays);
			$objPHPExcel->getActiveSheet()->setCellValue( "G$y", $row->estado);
			$objPHPExcel->getActiveSheet()->setCellValue( "H$y", $row->tiempo);
			$objPHPExcel->getActiveSheet()->getStyle('A'.$y.':H'.$y)->applyFromArray($est->RowText2);
			//Incrementar el contador por cada registro
			$intContador++;
			$y++;

		}
		//Incrementar el indice para escribir el total de los relays activados
         $y=$y+1;
        //Información detallada
		$objPHPExcel->setActiveSheetIndex(0)
				    ->setCellValue('H'.$y,'Total: '. $intContador);


        //Nombre de la hoja
		$objPHPExcel->getActiveSheet()->setTitle("Reporte");
		header('Content-Type: application/vnd.ms-excel');
		//Nombre del archivo
		header('Content-Disposition: attachment;filename="Reporte_Activacion_Relays.xls"');
		header('Cache-Control: max-age=0');
		$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel5');
		$objWriter->save('php://output');
		exit;
?>
