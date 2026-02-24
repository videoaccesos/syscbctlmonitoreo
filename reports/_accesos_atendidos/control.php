<?php	
class control {
	var $intMes;
	var $intAnio;

	var $MesesNombres = Array("","ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE");
	
	var $vecX;
	
	function iniciarControl($intMes, $intAnio){
		$this->intMes = $intMes;
		$this->intAnio = $intAnio;
		$this->vecX = explode("," , "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z,AA,AB,AC,AD,AE,AF,AG,AH,AI,AJ,AK,AL,AM,AN,AO,AP,AQ,AR,AS,AT,AU,AV,AW,AX,AY,AZ");
	}
}
?>