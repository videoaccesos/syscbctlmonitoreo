<?php 
// Manejo de descargas de archivos
if(isset($_POST['x']) && !empty($_POST['x'])){
    $file=base64_decode($_POST['x']);
    $ctype="image/png";
    header("Pragma: public"); 
    header("Expires: 0"); 
    header("Cache-Control: must-revalidate, post-check=0, pre-check=0"); 
    header("Cache-Control: private",false);
    header("Content-Type: $ctype"); 
    header("Content-Disposition: attachment; filename=\"archivo.png\";" ); 
    header("Content-Transfer-Encoding: binary"); 
    header("Content-Length: ".strlen($file))/1024; 
    echo $file;
    exit;
}
?>
<!-- Formulario de Registro de Acceso -->
<form id="frmRegistroAcceso" action="#" method="post" onsubmit="return(false)" autocomplete="off" style="margin-bottom:0px;">
    <!-- Variables de sesión y campos ocultos para manejar datos del usuario -->
    <input type="hidden" id="txtUsuarioID" value="<?php echo  strtoupper($this->session->userdata('usuario_id')); ?>">
    <input id="txtRegistroAccesoID" type="hidden" value="">
    <input id="txtURLDNS" type="hidden" value="">
    <input id="txtDNSID" type="hidden" value="">
    <input id="txtTipoTarjetaDNS" type="hidden" value="">
    <input id="txtContrasenaDNS" type="hidden" value="">

    <!-- Sección de estadísticas de llamadas -->
    <div style="display:inline-block; font-size:12px; padding-top:5px; float:right;">
        Última hora - Total Llamadas: <label id="lblTotalLlamadas" style="display:inline-block;font-size:14px; font-weight:bold;">0</label>
        <label id="lblDiferenciaLlamadas" style="display:inline-block;font-size:12px;"></label>
    </div>

    <!-- Sección de botones de acción (Acceso, Informo, Rechazo, Relays) -->
    <div style=" display:inline-block; padding-right:10px; width:100%;"> 
        <div style="display:inline-block; font-size:20px; padding-top:5px;">
            Duración: <label id="lblCrono" style="display:inline-block;font-size:20px;">00:00:0</label>, 
            Última: <label id="lblUltima" style="display:inline-block;font-size:20px;">00:00:0</label>
        </div>
        <div class="btn-group" style="display:inline-block;float:right;padding-bottom:10px;">
            <!-- Botones de acciones en la gestión del registro -->
            <a id="btnNuevo" href="" type="button" class="btn btn-primary" data-toggle="modal">
                <i class="icon-plus icon-white"></i> Nuevo
            </a>		
            <a onclick="fnGuardar(1)" type="button" class="btn btn-success" data-toggle="modal">
                <i class="icon-ok icon-white"></i> Acceso
            </a>
            <a onclick="fnGuardar(3)" type="button" class="btn btn-warning" data-toggle="modal">
                <i class="icon-bullhorn icon-white"></i> Informo
            </a>
            <a onclick="fnGuardar(2)" type="button" class="btn btn-danger" data-toggle="modal">
                <i class="icon-ban-circle icon-white"></i> Rechazo
            </a>
            <!-- Botón de activación de relays -->
            <a id="btnActivacionRelays" type="button" class="btn btn-inverse">
                <i class="icon-retweet icon-white"></i> Relays
            </a>
        </div>    
    </div>

    <!-- Información del operador y selector de privada -->
    <div style="display:inline-block; padding-right:15px;">     
        <div>
            <div class="input" style="display:inline-block; padding-right:17px;">
                <label for="txtOperador">Operador</label>
                <input type="hidden" id="txtOperadorID" value="<?php echo $empleado_id;?>">
                <input type="text" id="txtOperador" style="width:330px;" tabindex="-1" value="<?php echo $empleado; ?>" disabled>
            </div>
        </div>

        <!-- Selector de privada -->
        <div>
            <div style="display:inline-block; padding-right:17px;">
                <label for="cmbPrivadaID">Privada</label>
                <div class="input-append" style="display:inline-block;" id="txtPrivadaPop" data-toggle="popover" data-placement="right" data-html="true" data-content="" data-trigger="manual">
                    <select id="cmbPrivadaID" name="cmbPrivadaID" style="width:339px;" tabindex="1" onChange="cmbDNS_set();"></select>
                </div>
            </div>
        </div>

        <!-- Selector de residencia -->
        <div>
            <div style="display:inline-block;">
                <label for="txtResidencia">Residencia</label>
                <div class="input-append" id="txtResidenciaPop" data-toggle="popover" data-placement="top" data-html="true" data-content="" data-trigger="manual">
                    <input type="hidden" id="txtResidenciaID">
                    <input type="text" id="txtResidencia" class="span4" tabindex="2">
                    <span class="add-on" style="padding-left:12px;padding-right:12px;">
                        <i class="icon-search"></i>
                    </span>
                </div>
            </div>
        </div>
    </div>

    <!-- Campos adicionales para registrar solicitantes y observaciones -->
    <div>
        <label for="txtSolicitante">Solicitante</label>
        <div class="input-append" id="txtSolicitantePop" data-toggle="popover" data-placement="right" data-html="true" data-content="" data-trigger="manual">
            <input type="hidden" id="txtSolicitanteID">
            <input type="text" id="txtSolicitante" class="span4" placeholder="Ingresa Solicitante" tabindex="3">
            <div class="btn-group">
                <a href="#myModalRegistroGeneral" role="button" data-toggle="modal">
                    <button class="btn dropdown-toggle" tabindex="-1" onClick="fnNuevoRegistroGeneral()">
                        <i class="icon-plus"></i>
                    </button>
                </a>
            </div>
        </div>
    </div>

    <!-- Más campos del formulario -->
    <div>
        <label for="cmbTipoGestion">Tipo de Gestión</label>
        <select id="cmbTipoGestion" style="width:339px;" tabindex="4">
            <option value="1">No concluida</option>
            <option value="2">Moroso</option>
            <option value="3">Proveedor</option>
            <option value="4">Residente</option>
            <option value="5">Técnico</option>
            <option value="6">Trabajador de Obra</option>
            <option value="7">Trabajador de Servicio</option>
            <option value="8">Visita</option>
            <option value="9">Visita de Morosos</option>
        </select>
    </div>

    <!-- Observaciones y quejas -->
    <div>
        <label for="txtObservaciones">Observaciones</label>
        <textarea id="txtObservaciones" rows="4" style="width:330px;" tabindex="5"></textarea>
    </div>
    <div>
        <label for="txtQuejasSugerencias">Quejas o Sugerencias</label>
        <textarea id="txtQuejasSugerencias" rows="4" style="width:330px;" tabindex="6"></textarea>
    </div>

    <!-- Sección de activación de relays y visualización de videos -->
    <div id="testvideo">
        <div>
            <label for="cmbVideos">Video</label>
            <select id="cmbVideos" name="cmbVideos" style="width:360px;" tabindex="4"></select>
        </div>
        <button class="btn" id="load" onclick="printDiv('divVideoPriv')">Captura Pantalla</button>
        <div id="divVideoPriv"></div>
    </div>

    <!-- Tabulación de residentes y visitantes -->
    <div class="tabbable">
        <ul class="nav nav-tabs" style="margin-bottom: 5px;">
            <li class="active">
                <a href="#tabResidentes" data-toggle="tab" tabindex="7">
                    Residentes <button class="btn btn-mini" type="button" onClick="pagina_residentes=0; paginacion_residentes();">
                        <i class="icon-refresh"></i>
                    </button>
                </a>
            </li>
            <li>
                <a href="#tabVisitantes" data-toggle="tab" tabindex="8">
                    Visitantes <button class="btn btn-mini" type="button" onClick="pagina_visitantes=0; paginacion_visitantes();">
                        <i class="icon-refresh"></i>
                    </button>
                </a>
            </li>
        </ul>
        <div class="tab-content" style="width:360px">
            <div class="tab-pane active" id="tabResidentes">
                <table class="table table-stripped" id="dgResidentes">
                    <tbody></tbody>
                </table>
                <div style="display: inline-block;">
                    <div id="pagLinks_residentes" style="float:left;margin-right:10px;"></div>
                    <div style="float:right;margin-right:10px;"><strong id="numElementos_residentes">0</strong> Encontrados</div>
                </div>
            </div>
            <div class="tab-pane" id="tabVisitantes">
                <table class="table table-stripped" id="dgVisitantes">
                    <tbody></tbody>
                </table>
                <div style="display: inline-block;">
                    <div id="pagLinks_visitantes" style="float:left;margin-right:10px;"></div>
                    <div style="float:right;margin-right:10px;"><strong id="numElementos_visitantes">0</strong> Encontrados</div>
                </div>
            </div>
        </div>
    </div>
</form>
