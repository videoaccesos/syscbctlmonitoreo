<?php 
$strResult = "";
$strSQL = " SELECT P.proceso_id, P.nombre, SP.subproceso_id, SP.funcion sub_proceso
			FROM procesos P
			RIGHT JOIN subprocesos SP ON P.proceso_id = SP.proceso_id
			WHERE P.nombre =  '$strProceso'
			AND SP.subproceso_id
			IN (SELECT PA.subproceso_id
				FROM permisos_acceso PA, grupos_usuarios_detalles GUD
				WHERE PA.grupo_usuario_id = GUD.grupo_usuario_id
				AND GUD.usuario_id = ".$this->session->userdata('usuario_id').")";
		$opciones = $this->db->query($strSQL);
		foreach($opciones->result() as $row){
			if($strResult != "") $strResult.="|";
			$strResult.=trim($row->sub_proceso);
		}
		$opciones->free_result();
		if($strResult != ""){
			echo '<div class="btn-group btn-group-vertical btn-block"><h4> Opciones</h4>';
			$arrResult = explode('|', $strResult);
			if(in_array('Nuevo',$arrResult ))
				echo '<a id="btnNuevo" class="btn btn-block" ><i class="icon-file"></i> Nuevo</a>';
			if(in_array('Buscar',$arrResult ))
				echo '<a id="btnBuscar" class="btn btn-block" ><i class="icon-search"></i> Buscar</a>';
			if(in_array('Guardar',$arrResult ))
				echo '<a id="btnGuardar" class="btn btn-block" ><i class="icon-hdd"></i> Guardar</a>';
			if(in_array('Cancelar',$arrResult ))
				echo '<a id="btnCancelar" class="btn btn-block" ><i class="icon-remove"></i> Cancelar</a>';
			if(in_array('Eliminar',$arrResult ))
				echo '<a id="btnEliminar"class="btn btn-block" ><i class="icon-trash"></i> Eliminar</a>';
			if(in_array('Imprimir',$arrResult ))
				echo '<a id="btnImprimir"class="btn btn-block" ><i class="icon-print"></i> Imprimir</a>';
			unset($arrResult);
			echo '</div>';
		}
 ?>