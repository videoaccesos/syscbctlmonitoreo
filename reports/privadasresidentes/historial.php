<?php
		set_time_limit(0);
		ini_set('memory_limit', '-1');
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
									 ->setTitle("Residentes")
									 ->setSubject("Office 2007 XLSX Test Document")
									 ->setDescription("Listado de Residentes filtrados por privada y estado.")
									 ->setKeywords("Reporte de Residentes")
									 ->setCategory("Reporte");

        //Recuperar parámetros de búsqueda (de la vista)
		$intPrivadaID =  $_POST['intPrivadaID'];
		$strPrivada =  $_POST['strPrivada'];
		$strEstatus = $_POST['strEstatus'];
		//Variable que se utiliza para contar el número de registros
        $intContador=0;

		$est = new estilo_hoja1();
		$objPHPExcel->setActiveSheetIndex(0);

		//$con = conexion($host, $dbnombre, $dbuser, $dbpass);
		$server     = 'localhost'; //servidor
		$username   = 'wwwvideo_root'; //usuario de la base de datos
		$password   = 'V1de0@cces0s'; //password del usuario de la base de datos
		$database   = 'wwwvideo_video_accesos'; //nombre de la base de datos
		$con = new mysqli($server, $username, $password, $database);


		if (mysqli_connect_error())
		{
    		die('Error de Conexión (' . mysqli_connect_errno() . ') '. mysqli_connect_error());
    	}

        //Criterios de búsqueda (consulta bd)
		$strRestricciones = "";
	    //Se agregan los datos 
		$y = 6;//Numero de fila donde se va a comenzar a rellenar las columnas 
		 //Si el id de la privada es diferente de 0, búsca por privada 
		if($intPrivadaID != 0)
		{
			//$strRestricciones .= "AND R.privada_id = $intPrivadaID ";
			$strRestricciones .= "AND R.privada_id = ".$intPrivadaID." ";

			//Escribir filtro de privada
			$objPHPExcel->getActiveSheet()->setCellValue('C2', "Privada: ".$strPrivada);
		}
		//Si el estatus es diferente de 0, búsca por estatus_id 
        if($strEstatus!= "0")
        {
        	$strDescripcionEstatus="";
        	//Dependiendo de la opción cambiar la descripción del estatus_id
        	if($strEstatus=="1")
        	{
        		$strDescripcionEstatus="Interfon Activo";

        	}
        	else if($strEstatus=="2")
        	{
        		$strDescripcionEstatus="Sin Interfon";

        	}
        	else if($strEstatus=="3")
        	{
        		$strDescripcionEstatus="Moroso";
        	}
        	else
        	{
        		$strDescripcionEstatus="Sin Derechos";

        	}

			$strRestricciones .= "AND R.estatus_id = ".$strEstatus."";
		   //Escribir filtro de estatus
			$objPHPExcel->getActiveSheet()->setCellValue('C3', "Estado: ".$strDescripcionEstatus);
        }
        

		$y++;
        //Realizar consulta para recuperar los datos de los residentes que coinciden con los parámetros de búsqueda
		$strSQL = "SELECT T.Tarjeta_id, RR.residente_id, P.descripcion AS privada,R.calle,R.nro_casa, R.interfon,
						   CONCAT_WS(' ',RR.nombre,RR.ape_paterno,RR.ape_materno) AS residente,
						   RR.email,R.telefono1,R.telefono2, RR.celular,
						       (CASE R.estatus_id
									WHEN 1 THEN 'Interfon Activo'
									WHEN 2 THEN 'Sin Interfon'
									WHEN 3 THEN 'Moroso'
									WHEN 4 THEN 'Sin Derechos'
								END) AS estatus_id,
						   (SELECT COUNT( T.tarjeta_id ) 
							FROM ((residencias_residentes_tarjetas RRT LEFT JOIN tarjetas T ON RRT.tarjeta_id = T.tarjeta_id)
								   LEFT JOIN residencias_residentes RR2 ON RRT.residente_id = RR2.residente_id)
								   LEFT JOIN residencias R2 ON R2.residencia_id=RR2.residencia_id
							WHERE R2.residencia_id=R.residencia_id AND RR2.residente_id =RR.residente_id AND R2.estatus_id=R.estatus_id
							) AS no_tarjetas
		FROM ((((residencias_residentes RR INNER JOIN residencias R ON R.residencia_id=RR.residencia_id ) 
			   INNER JOIN privadas P ON P.privada_id=R.privada_id)
               LEFT JOIN  residencias_residentes_tarjetas RRT ON RRT.residente_id = RR.residente_id)
               LEFT JOIN tarjetas T ON RRT.tarjeta_id = T.tarjeta_id)
			   WHERE R.estatus_id<>5
               ".$strRestricciones."
		GROUP BY RR.residente_id
		ORDER BY privada,residente ASC";

        //Iteramos en todos los registros recuperados de la base de datos
		
		//$result = mysql_query($strSQL);
		if($result = $con->query($strSQL))
		{
			//while($row = mysql_fetch_object($result)) {
			while($row = $result->fetch_object())
			{
				$objPHPExcel->getActiveSheet()->setCellValue( "A$y",utf8_encode($row->privada));
				$objPHPExcel->getActiveSheet()->setCellValue( "B$y", $row->residente);
				$objPHPExcel->getActiveSheet()->setCellValue( "C$y", $row->calle);
				$objPHPExcel->getActiveSheet()->setCellValue( "D$y", $row->nro_casa);
				$objPHPExcel->getActiveSheet()->setCellValue( "E$y", $row->interfon);
				$objPHPExcel->getActiveSheet()->setCellValue( "F$y", $row->email);
				$objPHPExcel->getActiveSheet()->setCellValue( "G$y", $row->telefono1);
				$objPHPExcel->getActiveSheet()->setCellValue( "H$y", $row->celular);
				$objPHPExcel->getActiveSheet()->setCellValue( "I$y", $row->no_tarjetas);
				$objPHPExcel->getActiveSheet()->setCellValue( "J$y", $row->estatus_id);
				$objPHPExcel->getActiveSheet()->getStyle('A'.$y.':J'.$y)->applyFromArray($est->RowText2);
				//Incrementar el contador por cada registro
				$intContador++;
				$y++;
			}
		}
		
		
		//Incrementar el indice para escribir el total de los residentes
         $y=$y+2;
        //Información detallada
		$objPHPExcel->setActiveSheetIndex(0)
				    ->setCellValue('J'.$y,'Total: '. $intContador );

        //Nombre de la hoja
		$objPHPExcel->getActiveSheet()->setTitle("Reporte");
		header('Content-Type: application/vnd.ms-excel');
		//Nombre del archivo
		header('Content-Disposition: attachment;filename="Reporte_Residentes.xls"');
		header('Cache-Control: max-age=0');
		$objWriter = PHPExcel_IOFactory::createWriter($objPHPExcel, 'Excel5');
		$objWriter->save('php://output');
		exit;
?>

