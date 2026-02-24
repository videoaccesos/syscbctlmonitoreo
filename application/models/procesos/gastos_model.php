<?php
class Gastos_Model extends CI_model
{
	public function guardar($intTipoGastoID, $intPrivadaID, $strDescripcion,$strFechaPago,$strComprobante,$dblTotal, $intTipoPagoID, $intGastoAutorizadoID){
		$fechaHora = date("Y-m-d H:i:s");
		$datos = array(
			'tipo_gasto' => $intTipoGastoID, 
			'privada_id' => $intPrivadaID, 
			'descripcion_gasto' => $strDescripcion,
			'fecha_pago' => $strFechaPago,
			'comprobante' => $strComprobante,
			'total' => $dblTotal,
			'tipo_pago' => $intTipoPagoID,
			'fecha' => $fechaHora,			
			'usuario_id' => $this->session->userdata('usuario_id'),
			'estatus_id' => 1);
		$this->db->insert('gastos',$datos);
		if ($intGastoAutorizadoID != "")
		{
			$datos = array(
			'pagado' => 1);
		$this->db->where('gasto_id',$intGastoAutorizadoID);
		$this->db->limit(1);
		$this->db->update('gastos_autorizar',$datos);
		}
		return $this->db->_error_message();
	}

	public function pedirAutorizacion($intTipoGastoID, $intPrivadaID, $strDescripcion,$strComprobante,$dblTotal, $intTipoPagoID){
		$fechaHora = date("Y-m-d H:i:s");
		$datos = array(
			'tipo_gasto' => $intTipoGastoID, 
			'privada_id' => $intPrivadaID, 
			'descripcion_gasto' => $strDescripcion,
			'comprobante' => $strComprobante,
			'total' => $dblTotal,
			'tipo_pago' => $intTipoPagoID,
			'autorizado' => 0,
			'usuario_autorizo' => 0,
			'fecha' => $fechaHora,			
			'usuario_id' => $this->session->userdata('usuario_id'));
		$this->db->insert('gastos_autorizar',$datos);
		return $this->db->_error_message();
	}

	public function modificar($intGastoID,$intTipoGastoID, $intPrivadaID,$strDescripcion,$strFechaPago,$strComprobante,$dblTotal,$intTipoPagoID){
		$fechaHora = date("Y-m-d H:i:s");
		$datos = array(
			'tipo_gasto' => $intTipoGastoID, 
			'privada_id' => $intPrivadaID, 
			'descripcion_gasto' => $strDescripcion,
			'fecha_pago' => $strFechaPago,
			'comprobante' => $strComprobante,
			'total' => $dblTotal,
			'tipo_pago' => $intTipoPagoID,
			'fecha' => $fechaHora,			
			'usuario_id' => $this->session->userdata('usuario_id'),
			'estatus_id' => 1);
		$this->db->where('gasto_id',$intGastoID);
		$this->db->limit(1);
		$this->db->update('gastos',$datos);
		return $this->db->_error_message();
	}

	public function eliminar($intGastoID = null){
		$datos = array(
			'estatus_id' => 3,);
		$this->db->where('gasto_id',$intGastoID);
		$this->db->limit(1);
		$this->db->update('gastos',$datos);
		
		return $this->db->_error_message();
	}

	public function filtro($strBusqueda, $intNumRows, $intPos){
		$this->db->like('descripcion_gasto',$strBusqueda);
		$this->db->from('gastos');
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("G.gasto_id, G.tipo_gasto, G.privada_id, G.tipo_pago, P.descripcion AS privada,TG.gasto, G.descripcion_gasto,G.fecha_pago,G.comprobante,FORMAT(G.total,2) AS total, (CASE G.tipo_pago WHEN 1 THEN 'Efectivo' WHEN 2 THEN 'Bancos' WHEN 3 THEN 'Caja' END ) AS tipopago, G.fecha, U.usuario", FALSE);
		$this->db->from('gastos as G INNER JOIN tipos_gastos as TG on G.tipo_gasto = TG.gasto_id INNER JOIN usuarios as U on G.usuario_id = U.usuario_id INNER JOIN privadas as P on G.privada_id = P.privada_id');
		$this->db->where('G.estatus_id',1);
		$this->db->like('descripcion_gasto',$strBusqueda);  
		$this->db->order_by('fecha','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["gastos"] =$this->db->get()->result();
		return $res;
	}

	public function filtroNoAutorizados($strBusqueda, $intNumRows, $intPos){
		$this->db->like('descripcion_gasto',$strBusqueda);
		$this->db->from('gastos_autorizar');
                $this->db->where('autorizado',0);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("G.gasto_id, G.tipo_gasto, G.privada_id, G.tipo_pago, P.descripcion AS privada,TG.gasto, G.descripcion_gasto,G.comprobante,FORMAT(G.total,2) AS total, (CASE G.tipo_pago WHEN 1 THEN 'Efectivo' WHEN 2 THEN 'Bancos' WHEN 3 THEN 'Caja' END ) AS tipopago, G.fecha, U.usuario", FALSE);
		$this->db->from('gastos_autorizar as G INNER JOIN tipos_gastos as TG on G.tipo_gasto = TG.gasto_id INNER JOIN usuarios as U on G.usuario_id = U.usuario_id INNER JOIN privadas as P on G.privada_id = P.privada_id');
                $this->db->where('autorizado',0);
		$this->db->like('descripcion_gasto',$strBusqueda);  
		$this->db->order_by('fecha','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["gastos"] =$this->db->get()->result();
		return $res;
	}

	public function filtroAutorizados($strBusqueda, $intNumRows, $intPos){
		$this->db->like('descripcion_gasto',$strBusqueda);
		$this->db->from('gastos_autorizar');
                $this->db->where('autorizado',0);
		$res["total_rows"] = $this->db->count_all_results();

		$this->db->select("G.gasto_id, G.tipo_gasto, G.privada_id, G.tipo_pago, P.descripcion AS privada,TG.gasto, G.descripcion_gasto,G.comprobante,FORMAT(G.total,2) AS total, (CASE G.tipo_pago WHEN 1 THEN 'Efectivo' WHEN 2 THEN 'Bancos' WHEN 3 THEN 'Caja' END ) AS tipopago, U.usuario, G.fecha", FALSE);
		$this->db->from('gastos_autorizar as G INNER JOIN tipos_gastos as TG on G.tipo_gasto = TG.gasto_id INNER JOIN usuarios as U on G.usuario_autorizo = U.usuario_id INNER JOIN privadas as P on G.privada_id = P.privada_id');
                $this->db->where('autorizado',1);
                $this->db->where('pagado',0);
		$this->db->like('descripcion_gasto',$strBusqueda);  
		$this->db->order_by('fecha','desc');
		$this->db->limit($intNumRows,$intPos);
		$res["gastos"] =$this->db->get()->result();
		return $res;
	}

        public function autorizar($intGastoID){
		$datos = array(
			'autorizado' => 1,
			'usuario_autorizo' => $this->session->userdata('usuario_id'));
		$this->db->where('gasto_id',$intGastoID);
		$this->db->limit(1);
		$this->db->update('gastos_autorizar',$datos);
		
		return $this->db->_error_message();
	}

	public function buscar($id = null){
		$this->db->select('*');
		$this->db->from('gastos');
		$this->db->where('gasto_id',$id);
		$this->db->where('estatus_id',1);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function buscarAutorizado($id = null){
		$this->db->select('*');
		$this->db->from('gastos_autorizar');
		$this->db->where('gasto_id',$id);
		$this->db->limit(1);
		return $this->db->get()->row();
	}

	public function gastos_cmb(){
		$this->db->select('gasto_id AS value,descripcion_gasto AS nombre');
		$this->db->from('gastos');
		$this->db->where('estatus_id',1);
		$this->db->order_by('descripcion_gasto','asc');
		return $this->db->get()->result();
	}
}	
?>