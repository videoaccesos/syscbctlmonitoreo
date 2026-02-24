<?php
class GastosAutorizar_Model extends CI_model
{
	public function modificar($intGastoID,$intTipoGastoID, $intPrivadaID,$strDescripcion,$strComprobante,$dblTotal,$intTipoPagoID){
		$fechaHora = date("Y-m-d H:i:s");
		$datos = array(
			'tipo_gasto' => $intTipoGastoID, 
			'privada_id' => $intPrivadaID, 
			'descripcion_gasto' => $strDescripcion,
			'comprobante' => $strComprobante,
			'total' => $dblTotal,
			'tipo_pago' => $intTipoPagoID,
			'fecha' => $fechaHora,			
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->where('gasto_id',$intGastoID);
		$this->db->limit(1);
		$this->db->update('gastos',$datos);
		return $this->db->_error_message();
	}

	public function filtroNoAutorizados($strBusqueda, $intNumRows, $intPos){
		$this->db->like('descripcion_gasto',$strBusqueda);
		$this->db->from('gastos_autorizar');
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("G.gasto_id, G.tipo_gasto, G.privada_id, G.tipo_pago, P.descripcion AS privada,TG.gasto, G.descripcion_gasto,G.comprobante,FORMAT(G.total,2) AS total, (CASE G.tipo_pago WHEN 1 THEN 'Efectivo' WHEN 2 THEN 'Bancos' END ) AS tipopago, G.fecha, U.usuario", FALSE);
		$this->db->from('gastos_autorizar as G INNER JOIN tipos_gastos as TG on G.tipo_gasto = TG.gasto_id INNER JOIN usuarios as U on G.usuario_id = U.usuario_id INNER JOIN privadas as P on G.privada_id = P.privada_id');
		$this->db->like('descripcion_gasto',$strBusqueda);  
		$this->db->order_by('fecha','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["gastosAutorizar"] =$this->db->get()->result();
		return $res;
	}

	public function autorizar($intGastoID){
		$datos = array(
			'autorizo' => 1,
			'usuario_autorizo' => $this->session->userdata('usuario_id'));
		$this->db->where('gasto_id',$intGastoID);
		$this->db->limit(1);
		$this->db->update('gastos_autorizar',$datos);
		
		return $this->db->_error_message();
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('gastos_autorizar');
		$this->db->where('gasto_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function gastosAutorizar_cmb(){
		$this->db->select('gasto_id AS value,descripcion_gasto AS nombre');
		$this->db->from('gastos_autorizar');
		$this->db->order_by('descripcion_gasto','asc');
		return $this->db->get()->result();
	}
}	
?>