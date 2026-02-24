<?php
class Accesos_Model extends CI_model
{
	public function filtro($strBusqueda, $strFechaHoraInicio, $strFechaHoraFin, $intNumRows, $intPos){
		$this->db->select("id,placa,color,marca,texto_identificacion,id_rostro,nombre_rostro,estatus_placa,estatus_identificacion,estatus_rostro,img_placa,img_identificacion,img_rostro,correo_enviado,calle,nro_casa,fecha_modificacion", FALSE);
		$this->db->from('accessbot_bandeja');
		$this->db->where('texto_identificacion <> "" AND fecha_modificacion >= "'.$strFechaHoraInicio.'" AND fecha_modificacion <= "'.$strFechaHoraFin.'"');
		$this->db->order_by('id','desc');
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("id,placa,color,marca,texto_identificacion,id_rostro,nombre_rostro,estatus_placa,estatus_identificacion,estatus_rostro,img_placa,img_identificacion,img_rostro,correo_enviado,calle,nro_casa,fecha_modificacion", FALSE);
		$this->db->from('accessbot_bandeja');
		$this->db->where('texto_identificacion <> "" AND fecha_modificacion >= "'.$strFechaHoraInicio.'" AND fecha_modificacion <= "'.$strFechaHoraFin.'"');
		$this->db->order_by('id','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["accesos"] =$this->db->get()->result();
		return $res;
	}

	public function accesos_cmb(){
		$this->db->select('usuario_id AS value,usuario');
		$this->db->from('usuarios');
		$this->db->where('estatus_id',1);
		$this->db->order_by('usuario_id','asc');
		return $this->db->get()->result();
	}
}	
?>