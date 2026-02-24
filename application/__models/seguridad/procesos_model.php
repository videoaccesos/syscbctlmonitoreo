<?php 
class Procesos_Model extends CI_model
{
    public function guardar($strNombre,$strRutaAcceso,$intProcesoPadreID)
    {
        $datos = array(
            'nombre' => $strNombre, 
            'ruta_acceso' => $strRutaAcceso,
            'proceso_padre_id' => $intProcesoPadreID,
            'usuario_id' => $this->session->userdata('usuario_id'));
        $this->db->insert('procesos',$datos);
        return $this->db->_error_message();
    }

    public function modificar($intProcesoID,$strNombre,$strRutaAcceso,$intProcesoPadreID)
    {
        $datos = array(
            'nombre' => $strNombre, 
            'ruta_acceso' => $strRutaAcceso,
            'proceso_padre_id' => $intProcesoPadreID,
            'usuario_id' => $this->session->userdata('usuario_id'));
        $this->db->where('proceso_id',$intProcesoID);
        $this->db->limit(1);
        $this->db->update('procesos',$datos);
        return $this->db->_error_message();
    }

    public function eliminar($intProcesoID = null){
        $this->db->trans_begin();

        $this->db->select('subproceso_id');
        $this->db->from('subprocesos');
        $this->db->where('proceso_id', $intProcesoID);
        $subprocesos_rows = '';
    
        foreach ($this->db->get()->result() as $row){ 
            if($subprocesos_rows != "")
                $subprocesos_rows .=",";
            $subprocesos_rows .= $row->subproceso_id;
        }
        if($subprocesos_rows != ''){
            $this->db->where_in('subproceso_id',$subprocesos_rows);  
            $this->db->delete('permisos_acceso');
        }
        $this->db->where('proceso_id',$intProcesoID);  
        $this->db->delete('subprocesos');

        $this->db->where('proceso_id',$intProcesoID);  
        $this->db->limit(1);
        $this->db->delete('procesos');

        $datos = array('proceso_padre_id' => 0);
        $this->db->where('proceso_padre_id',$intProcesoID);
        $this->db->update('procesos',$datos);

        $this->db->trans_complete();

        if ($this->db->trans_status() === FALSE)
            $this->db->trans_rollback();
        else
            $this->db->trans_commit();
        return $this->db->_error_message();
    }

    public function filtro($strBusqueda, $intNumRows, $intPos){
        $this->db->like('nombre',$strBusqueda);
        $this->db->from('procesos');
        $res["total_rows"] = $this->db->count_all_results();

        $this->db->select("P.proceso_id,P.nombre, P.ruta_acceso, T.nombre AS padre");
        $this->db->from('procesos AS P');
        $this->db->join('procesos AS T', 'P.proceso_padre_id = T.proceso_id', 'left');
        $this->db->like('P.nombre',$strBusqueda); 
        $this->db->order_by('P.nombre','asc');
        $this->db->limit($intNumRows,$intPos);
        $res["procesos"] =$this->db->get()->result();
        return $res;
    }

    public function buscar($id = null){
        $this->db->select('*');
        $this->db->from('procesos');
        $this->db->where('proceso_id',$id);
        $this->db->limit(1);
        return $this->db->get()->row();
    }

    public function buscar_padres(){
        $this->db->select('proceso_id AS value,nombre');
        $this->db->from('procesos');
        $this->db->where('proceso_padre_id',0);
        $this->db->order_by('nombre');
        return $this->db->get()->result();
    }

    public function buscar_hijos(){
        $this->db->select('PH.proceso_id AS value,PH.nombre,PP.nombre AS padre');
        $this->db->from('procesos AS PH');
        $this->db->join('procesos AS PP','PH.proceso_padre_id = PP.proceso_id','inner');
        $this->db->where('PH.proceso_padre_id <>',0);
        $this->db->order_by('PP.nombre,PH.nombre');
        return $this->db->get()->result();
    }
}   
?>