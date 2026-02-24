<?php
	function conexion($host,$dbnombre,$dbuser,$dbpass){
		//echo "$host-$dbnombre-$dbuser-$dbpass";
		if(!$link=mysql_connect($host, $dbuser, $dbpass)){
			die("La conexion con el servidor no se llevo acabo");
		}
		if(!$link=mysql_select_db($dbnombre)){
			die("Error al seleccionar la base de datos");
		}
		return $link;
	}

	function encriptar($cadena){
		return crypt ($cadena,0);
	}

	function desencriptar($cadena){
		return $cadena;
	}

	function GenerarID($numID, $link){
		$strCadenaSQL ="SELECT prefijo, consecutivo ";
		$strCadenaSQL.="FROM   consecutivos_ids ";
		$strCadenaSQL.="WHERE  consecutivo_id = ".$numID;
		$varResultado = mysql_query($strCadenaSQL);
		if ($varResultado){
			$rstResultado = mysql_fetch_row($varResultado);
			mysql_free_result($varResultado);
			$strPrefijo = $rstResultado[0];
			$strConsecutivo = $rstResultado[1];
			$strResultado = $strPrefijo;
			for($intCont = 0; ($intCont + strlen($strConsecutivo)) < 6; $intCont++){
				$strResultado = $strResultado."0";
			}
			$strResultado = $strResultado.$strConsecutivo;
			$strConsecutivo++;
			$strCadenaSQL ="UPDATE consecutivos_ids ";
			$strCadenaSQL.="SET    consecutivo = ".$strConsecutivo." ";
			$strCadenaSQL.="WHERE  consecutivo_id = ".$numID;
			$varResultado = mysql_query($strCadenaSQL);
			if ($varResultado){
				return $strResultado;
			}
		}
		return "0";
	}

	function GenerarFolio($numProceso, $strSucursal, $link){
		$strCadenaSQL ="SELECT FC.folio_id, FC.serie, FC.folio_actual ";
		$strCadenaSQL.="FROM   folios_configuraciones FC, procesos_folios PF ";
		$strCadenaSQL.="WHERE  PF.sucursal_id = '".$strSucursal."' ";
		$strCadenaSQL.="AND    PF.proceso_id = ".$numProceso." ";
		$strCadenaSQL.="AND    FC.folio_id = PF.folio_id ";
		$varResultado = mysql_query($strCadenaSQL);
		if ($varResultado){
			$rstResultado = mysql_fetch_row($varResultado);
			$strFolioID = $rstResultado[0];
			$strPrefijo = $rstResultado[1];
			$strConsecutivo = $rstResultado[2];
			$strResultado = $strPrefijo;
			$numRelleno = 8 - strlen($strPrefijo);
			for($intCont = 0; ($intCont + strlen($strConsecutivo)) < $numRelleno; $intCont++){
				$strResultado = $strResultado."0";
			}
			$strResultado = $strResultado.$strConsecutivo;
			$strConsecutivo++;
			mysql_free_result($varResultado);
			$strCadenaSQL ="UPDATE folios_configuraciones ";
			$strCadenaSQL.="SET    folio_actual = ".$strConsecutivo." ";
			$strCadenaSQL.="WHERE  folio_id = ".$strFolioID;
			$varResultado = mysql_query($strCadenaSQL);
			if ($varResultado){
				return $strResultado;
			}
		}
		return "0";
	}

	function NumeroTexto ($numero){
		$extras= array("/[\$]/","/ /","/,/","/-/");
		$limpio=preg_replace($extras,"",$numero);
		$partes=explode(".",$limpio);
		if (count($partes)>2) {
			return "Error, el n&uacute;mero no es correcto";
			exit();
		}
		$digitos_piezas=chunk_split($partes[0],1,"#");
		$digitos_piezas=substr($digitos_piezas,0,strlen($digitos_piezas)-1);
		$digitos=explode("#",$digitos_piezas);
		$todos=count($digitos);
		$grupos=ceil (count($digitos)/3);
		$unidad = array('UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE');
		$decenas = array('DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE');
		$decena = array('DIECI','VEINTI','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA');
		$centena = array('CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS');
		$resto=$todos;
		for ($i=1; $i<=$grupos; $i++) {
			if ($resto>=3) {
				$corte=3; } else {
				$corte=$resto;
			}
			$offset=(($i*3)-3)+$corte;
			$offset=$offset*(-1);
			$num=implode("",array_slice ($digitos,$offset,$corte));
			$resultado[$i] = "";
			$cen = (int) ($num / 100);              //Cifra de las centenas
			$doble = $num - ($cen*100);             //Cifras de las decenas y unidades
			$dec = (int)($num / 10) - ($cen*10);    //Cifra de las decenas
			$uni = $num - ($dec*10) - ($cen*100);   //Cifra de las unidades
			if ($cen > 0) {
			   if ($num == 100) $resultado[$i] = "CIEN";
			   else $resultado[$i] = $centena[$cen-1].' ';
			}
			if ($doble>0) {
			   if ($doble == 20) {
				  $resultado[$i] .= " VEINTE";
			   }elseif (($doble < 16) and ($doble>9)) {
				  $resultado[$i] .= $decenas[$doble-10];
			   }else {
			   	  if ($dec > 0){
				     $resultado[$i] .=' '. $decena[$dec-1];
				  }
				  else if ($i == 2){
				     $resultado[$i] .=" ";
				  }
			   }
			   if ($dec>2 and $uni<>0) $resultado[$i] .=' Y ';
			   if (($uni>0) and ($doble>15) or ($dec==0)) {
				  if ($i==1 && $uni == 1) $resultado[$i].="UNO";
				  elseif ($i==2 && $num == 1) $resultado[$i].="";
				  else $resultado[$i].=$unidad[$uni-1];
			   }
			}	
			switch ($i) {
				case 2:
				$resultado[$i].= ($resultado[$i]=="") ? "" : " MIL ";
				break;
				case 3:
				$resultado[$i].= ($num==1) ? " MILLON " : " MILLONES ";
				break;
			}
			$resto-=$corte;
		}
		$resultado_inv= array_reverse($resultado, TRUE);
		$final="";
		foreach ($resultado_inv as $parte){
			$final.=$parte;
		}
		if ((isset($partes[1])) and ($partes[1] != "")){
			$final = "SON: (".$final." PESOS ".$partes[1]."/100 M.N.)";
		}
		else{
			$final = "SON: (".$final." PESOS 00/100 M.N.)";
		}
		return $final;
	}
	
	function NumeroTexto01 ($numero, $moneda){
		$extras= array("/[\$]/","/ /","/,/","/-/");
		$limpio=preg_replace($extras,"",$numero);
		$partes=explode(".",$limpio);
		if (count($partes)>2) {
			return "Error, el n&uacute;mero no es correcto";
			exit();
		}
		$digitos_piezas=chunk_split($partes[0],1,"#");
		$digitos_piezas=substr($digitos_piezas,0,strlen($digitos_piezas)-1);
		$digitos=explode("#",$digitos_piezas);
		$todos=count($digitos);
		$grupos=ceil (count($digitos)/3);
		$unidad = array('UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE');
		$decenas = array('DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE');
		$decena = array('DIECI','VEINTI','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA');
		$centena = array('CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS');
		$resto=$todos;
		for ($i=1; $i<=$grupos; $i++) {
			if ($resto>=3) {
				$corte=3; } else {
				$corte=$resto;
			}
			$offset=(($i*3)-3)+$corte;
			$offset=$offset*(-1);
			$num=implode("",array_slice ($digitos,$offset,$corte));
			$resultado[$i] = "";
			$cen = (int) ($num / 100);              //Cifra de las centenas
			$doble = $num - ($cen*100);             //Cifras de las decenas y unidades
			$dec = (int)($num / 10) - ($cen*10);    //Cifra de las decenas
			$uni = $num - ($dec*10) - ($cen*100);   //Cifra de las unidades
			if ($cen > 0) {
			   if ($num == 100) $resultado[$i] = "CIEN";
			   else $resultado[$i] = $centena[$cen-1].' ';
			}
			if ($doble>0) {
			   if ($doble == 20) {
				  $resultado[$i] .= " VEINTE";
			   }elseif (($doble < 16) and ($doble>9)) {
				  $resultado[$i] .= $decenas[$doble-10];
			   }else {
			   	  if ($dec > 0){
				     $resultado[$i] .=' '. $decena[$dec-1];
				  }
				  else if ($i == 2){
				     $resultado[$i] .=" ";
				  }
			   }
			   if ($dec>2 and $uni<>0) $resultado[$i] .=' Y ';
			   if (($uni>0) and ($doble>15) or ($dec==0)) {
				  if ($i==1 && $uni == 1) $resultado[$i].="UNO";
				  elseif ($i==2 && $num == 1) $resultado[$i].="";
				  else $resultado[$i].=$unidad[$uni-1];
			   }
			}	
			switch ($i) {
				case 2:
				$resultado[$i].= ($resultado[$i]=="") ? "" : " MIL ";
				break;
				case 3:
				$resultado[$i].= ($num==1) ? " MILLON " : " MILLONES ";
				break;
			}
			$resto-=$corte;
		}
		$resultado_inv= array_reverse($resultado, TRUE);
		$final="";
		foreach ($resultado_inv as $parte){
			$final.=$parte;
		}
		if ($moneda == "D"){
			if ((isset($partes[1])) and ($partes[1] != "")){
				$final = "SON: (".$final." DÓLARES ".$partes[1]."/100 U.S.D)";
			}
			else{
				$final = "SON: (".$final." DÓLARES 00/100 U.S.D)";
			}
		}
		else{
			if ((isset($partes[1])) and ($partes[1] != "")){
				$final = "SON: (".$final." PESOS ".$partes[1]."/100 M.N.)";
			}
			else{
				$final = "SON: (".$final." PESOS 00/100 M.N.)";
			}
		}
		return $final;
	}
?>
