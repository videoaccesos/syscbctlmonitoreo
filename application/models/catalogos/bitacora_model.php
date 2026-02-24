<?php
class Bitacora_Model extends CI_model
{
	public function guardar($strID,$intUsuario,$strTabla){
		$datos = array(
			'id' => $strID, 
			'usuario_id' => $intUsuario,
			'tabla' => $strTabla );
		$this->db->insert('bitacora_modificaciones',$datos);
		return $this->db->_error_message();
	}

	public function filtro($id = null, $strTabla = null, $intNumRows, $intPos){
		$this->db->select("U.usuario, CONCAT(E.nombre,' ',E.ape_paterno,' ',E.ape_materno) AS empleado ,DATE_FORMAT( BM.fecha_modificacion ,'%d-%m-%Y %h:%i %p') AS fecha",FALSE);
		$this->db->from('bitacora_modificaciones BM');
		$this->db->join('usuarios U','U.usuario_id = BM.usuario_id','inner');
		$this->db->join('empleados E','U.empleado_id = E.empleado_id','left');
		$this->db->where('id',$id);
		$this->db->where('tabla',$strTabla);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("U.usuario, CONCAT(E.nombre,' ',E.ape_paterno,' ',E.ape_materno) AS empleado ,DATE_FORMAT( BM.fecha_modificacion,'%d-%m-%Y %h:%i %p') AS fecha",FALSE);
		$this->db->from('bitacora_modificaciones BM');
		$this->db->join('usuarios U','U.usuario_id = BM.usuario_id','inner');
		$this->db->join('empleados E','U.empleado_id = E.empleado_id','left');
		$this->db->where('id',$id);
		$this->db->where('tabla',$strTabla);
		$this->db->order_by('fecha','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["modificaciones"] =$this->db->get()->result();
		return $res;
	}
}	
?>