<?php
session_start();

if (empty($_POST["tarjeta"])) {
	exit("Falta el numero de tarjeta"); #Terminar el script definitivamente
}else{
    $tarjeta = $_POST["tarjeta"];
}
 if (empty($_POST["moroso"])) {
 	exit("Falta seleccionar si el usuario es moroso o no"); #Terminar el script definitivamente
 }else{
    $moroso = $_POST["moroso"];
 }

//$data =["tarjeta"=>$tarjeta,"moroso"=>$moroso];
$url="https://firestore.googleapis.com/v1/projects/video-accesos/databases/(default)/documents/tarjetas/".$tarjeta."/";
//****************************************************************************************************** */
$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => $url,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => "",
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => "PATCH",
  CURLOPT_POSTFIELDS =>"{\r\n  \"name\": \"projects/video-accesos/databases/(default)/documents/tarjetas/$tarjeta\",\r\n  \"fields\": {\r\n    \"tarjeta\": {\r\n      \"stringValue\": \"$tarjeta\"\r\n    },\r\n    \"moroso\": {\r\n      \"booleanValue\": \"$moroso\"\r\n    }\r\n  }\r\n}",
  CURLOPT_HTTPHEADER => array(
    "Content-Type: application/json"
  ),
));

$response = curl_exec($curl);

//echo $response;

if (curl_errno($curl)){
    //echo 'Error:'.curl_errno($curl);
    $_SESSION['status']="Ha ocurrido un error!!";
    header("Location: subirtarjetas.php");
    curl_close($curl);
}else{
    //echo "La tarjeta ".$tarjeta.", fue registrada exitosamente";
    $_SESSION['status']="La tarjeta ".$tarjeta.", fue registrada exitosamente";
    header("Location: subirtarjetas.php");
    curl_close($curl);
}
?>