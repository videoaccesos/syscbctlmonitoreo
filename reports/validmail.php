<?php

function ValidarMail($email) {
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

if(isset($_POST['email'])){
    $existe = ValidarMail($_POST['email']);
    if(@$existe[0]) {
      echo "<b><font color=\"darkgreen\">El mail Existe</font>";
    }
    else {
      echo "<b><font color=\"red\">El mail NO Existe</font>";
    }
}

?>

<form id="valmail" method="POST">
<input type="text" name="email">
<input type="submit">
</form>