<?php 
set_time_limit(0);
require_once ('config.php');
require_once ("funciones.php");
$con = conexion($host, $dbnombre, $dbuser, $dbpass);
echo "INICIO <BR>";
/*
function ValidarMail($email, $port) {
       global $HTTP_HOST;
       $resultado = array();
       if (!eregi("^[_\.0-9a-z\-]+@([0-9a-z][0-9a-z-]+\.)+[a-z]{2,6}$",$email)) {
         $resultadoado[0]=false;
         $resultado['code']="702";
          return $resultado;
       }
       list ( $Username, $dominio ) = split ("@",$email);
         if (getmxrr($dominio, $MXHost))  $conecta_dominio = $MXHost[0];
                  else  $conecta_dominio = $dominio;

        $conectar = fsockopen ( $conecta_dominio, $port );

      if ($conectar) {

        if (ereg("^220", $ver = fgets($conectar, 1024))) {

           fputs ($conectar, "HELO $HTTP_HOST\r\n");
           $ver = fgets ( $conectar, 1024 );
           fputs ($conectar, "MAIL FROM: <{$email}>\r\n");
           $From = fgets ( $conectar, 1024 );
           fputs ($conectar, "RCPT TO: <{$email}>\r\n");
           $To = fgets ($conectar, 1024);
           fputs ($conectar, "QUIT\r\n");
           fclose($conectar);
           if (!ereg ("^250", $From) || !ereg ( "^250", $To )) {
               $resultado[0]=false;
               $resultado['code']="700";
               return $resultado;
            }
        }
           else {
              $resultado[0] = false;
              $resultado['code'] = "Død";
              return $resultado;
            }
      }
        else {
            $resultado[0]=false;
            $resultado['code']="701";
            return $resultado;
      }

       $resultado[0]=true;
       $resultado['code']="200";
       return $resultado;
} */

function ValidarMail($email) {
       global $HTTP_HOST;
       $resultado = array();
       if (!eregi("^[_\.0-9a-z\-]+@([0-9a-z][0-9a-z-]+\.)+[a-z]{2,6}$",$email)) {
         $resultadoado[0]=false;
         $resultado['code']="702";
          return $resultado;
       }

         list ( $Username, $dominio ) = split ("@",$email);
	     if (getmxrr($dominio, $MXHost))  
	     	$conecta_dominio = $MXHost[0];
	     else  
	     	$conecta_dominio = $dominio;
         $conectar = fsockopen ( $conecta_dominio, 25 );

      if ($conectar) {
        if (ereg("^220", $ver = fgets($conectar, 1024))) {
           fputs ($conectar, "HELO $HTTP_HOST\r\n");
           $ver = fgets ( $conectar, 1024 );
           fputs ($conectar, "MAIL FROM: <{$email}>\r\n");
           $From = fgets ( $conectar, 1024 );
           fputs ($conectar, "RCPT TO: <{$email}>\r\n");
           $To = fgets ($conectar, 1024);
           fputs ($conectar, "QUIT\r\n");
           fclose($conectar);
           if (!ereg ("^250", $From) || !ereg ( "^250", $To )) {
               $resultado[0]=false;
               $resultado['code']="700";
               return $resultado;
            }
        }
        else {
          $resultado[0] = false;
          $resultado['code'] = "Død";
          return $resultado;
        }
      }
      else {
          $resultado[0]=false;
          $resultado['code']="701";
          return $resultado;
      }
      $resultado[0]=true;
      $resultado['code']="200";
      return $resultado;
}

$strSQL = "SELECT email FROM residencias_residentes";
$result = mysql_query($strSQL);
echo "BUSCANDO EMAILS NO EXISTENTES <BR>";
$count = 0;
$good = 0;
while($row = mysql_fetch_object($result)) {
	if(trim($row->email) != ""){
		$sesion = curl_init("http://alexlatorre.com/projects/mail/vmail.php");
		$parametros_post = "email=".$row->email;
		// definir tipo de petici&oacute;n a realizar: POST
		curl_setopt ($sesion, CURLOPT_POST, true); 
		// Le pasamos los par&aacute;metros definidos anteriormente
		curl_setopt ($sesion, CURLOPT_POSTFIELDS, $parametros_post); 
		// s&oacute;lo queremos que nos devuelva la respuesta
		curl_setopt($sesion, CURLOPT_HEADER, false); 
		curl_setopt($sesion, CURLOPT_RETURNTRANSFER, true);
		// ejecutamos la petici&oacute;n
		$respuesta = curl_exec($sesion); 
		// cerramos conexi&oacute;n
		curl_close($sesion); 
		if(strpos($respuesta, "El mail Existe") === false) {
			$count++;
			echo "$row->email <br>";
		}else {
			$good++;
		}
	}
}
mysql_free_result($result);
echo "FIN <BR>";
echo "Resultados incorrectos: $count, validos: $good ";
exit;
?>
