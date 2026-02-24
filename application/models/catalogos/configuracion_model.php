<?php
class Configuracion_Model extends CI_model
{
	public function guardar($dblTasaFinanciamiento,$dblEnganche,$dblPlazoMaximo){
		$datos = array(
			'tasa_financiamiento' => $dblTasaFinanciamiento, 
			'enganche' => $dblEnganche,
			'plazo_maximo' => $dblPlazoMaximo);
		$this->db->insert('configuracion',$datos);
		return $this->db->_error_message();
	}

	public function configuracion_cmb(){
		$this->db->select('tasa_financiamiento,enganche,plazo_maximo');
		$this->db->from('configuracion');
		return $this->db->get()->result();
	}
}	
?>