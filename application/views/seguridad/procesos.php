                    <form id="frmSearch" action="#" method="post" tabindex="-5" onsubmit="return(false)">
                                <div style="display:inline-block;">
                                  <label for="txtBusqueda"><h5>Nombre</h5></label>
                                  <div class="input-append">
                                      <input id ="txtBusqueda" name="strBusqueda" value="<?php echo set_value('strBusqueda');?>" type="text" placeholder="Teclea Nombre" tabindex="-4">
                                      <div class="btn-group" >
                                        <button class="btn dropdown-toggle" onclick="paginacion();" tabindex="-3">
                                          <i class="icon-search"></i>
                                        </button>
                                      </div>
                                  </div>
                                </div>
                                
                              <div id="opciones" class="btn-group" style="display:inline-block;float:right;padding-top:40px;">
                                	
                                		<!-- Button to trigger modal -->
                                    <a href="#myModal" role="button" class="btn btn-primary" data-toggle="modal"><i class="icon-plus icon-white"></i> Nuevo</a>   

                                		<button class="btn btn-inverse">
                                			<i class="icon-print icon-white"></i> Imprimir
                                		</button>	
                              
                              </div>    
                        </form>
                        
                        <table class="table" id="dgProcesos">
                             <thead>
                                <tr>
                                  <th>Proceso</th>
                                  <th>Ruta</th>
                                  <th>Padre</th>
                                  <th width="20px">SubPro</th>
                                  <th width="20px"></th>
                                  <th width="20px"></th>
                                </tr>
                            </thead>
                            <tbody>
                            </tbody>
                            <script id="plantilla_procesos" type="text/template"> 
                              {{#rows}}
                              <tr><td>{{nombre}}</td>
                                  <td>{{ruta_acceso}}</td>
                                  <td>{{padre}}</td>
                                  <td><a onclick="fnShow_SubProcesos({{proceso_id}},'{{ruta_acceso}}');" class="btn btn-mini" title="SubProcesos"><i class="icon icon-th-list"></i></a></td>
                                  <td><a onclick="fnEditar({{proceso_id}});" class="btn btn-mini" title="Editar"><i class="icon icon-pencil"></i></a></td>
                                  <td><a onclick="fnEliminar({{proceso_id}});" class="btn btn-mini" title="Eliminar"><i class="icon icon-trash"></i></a></td>
                              </tr>
                              {{/rows}}
                              {{^rows}}
                              <tr> 
                                <td colspan="5"> No se Encontraron Resultados!!</td>
                              </tr> 
                              {{/rows}}
                            </script>
                        </table>
                        <div style="dysplay: inline-block;">
                          <div id="pagLinks"  style="float:left;margin-right:10px;"></div>
                          <div style="float:right;margin-right:10px;"><strong id="numElementos">3</strong> Encontrados</div>
                          <br>
                       </div>




    <!-- Procesos -->
    <div id="myModal" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"  style="width:350px;left:60%;" >
        <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="1" onclick="fnNuevo();">×</button>
        <h3 id="myModalLabel">Proceso</h3>
        </div>
        <div class="modal-body " style="max-height:100%; height:100%;">
            <form name="frmProcesos" id="frmProcesos" action="#" method="post" onsubmit="return(false)" autocomplete="off">
				<input type="hidden" id="txtProcesoID" name="intProcesoID" value="">
				<label for="txtNombre">Nombre</label>
			    <input class="span3" id="txtNombre" name="strNombre" type="text" value="" tabindex="2" placeholder="Teclee el Nombre">
				<label for="txtRuta">Ruta</label>
				<input class="span3" id="txtRuta" name="strRuta" type="text" value="" tabindex="3" placeholder="Teclee la Ruta">
				<label for="cmbProcesoPadreID">Proceso Padre</label>
				<select id="cmbProcesoPadreID" name="intProcesoPadreID" class="span3" tabindex="4" >
	  			</select>
			</form>	
			<script id="plantilla_procesos_padres" type="text/template"> 
				<option value="0">[GUARDAR COMO PADRE]</option>
				{{#padres}}
					<option value="{{value}}">{{nombre}}</option>
				{{/padres}}	
			</script>
        </div>
        <div class="modal-footer">
            <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="5" onclick="fnNuevo();">Cancelar</button>
            <button class="btn btn-primary" tabindex="6" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>
            <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtProcesoID','procesos');"><i class="icon-calendar"></i> Historial</button>
        </div>
    </div>     

     <!-- Sub Procesos -->
    <div id="myModalSubProcesos" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="width:725px;left:40%;">
        <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="10" onclick="">×</button>
        <h3 id="myModalLabel">Sub-Procesos</h3>
        </div>
        <div class="modal-body " style="max-height:100%; height:100%;">
           <form name="frmSubProcesos" id="frmSubProcesos" action="#" method="post" onsubmit="return(false)" autocomplete="off">
             	  <input type="hidden" id="txtSubProcesoID_subproceso" name="intProcesoID" value="">
                <input type="hidden" id="txtProcesoID_subproceso" name="intProcesoID" value="">
                <input type="hidden" id="txtRuta_subproceso" value="">
                <div style="display:inline-block;padding-right:10px;">      				
        					<label for="cmbNombre_subproceso">Nombre</label>
                  <input class="span3" id="cmbNombre_subproceso" type="text" value="" tabindex="11" placeholder="Teclee el Nombre" maxlength="30">
                </div>
                <div style="display:inline-block;">
                	<label for="txtIDElement_subproceso">Funcion del Controlador</label>
					         <input class="span6" id="txtIDElement_subproceso" type="text" value="" tabindex="12" placeholder="Teclee la Funcion" maxlength="60">
				        </div>
                <div style="display:inline-block;">
                  <button class="btn" tabindex="13" onclick="fnNuevo_SubProceso()"  style="margin-right:40px;"><i class="icon-file"></i> Nuevo</button>
                  <button class="btn btn-primary" tabindex="14" onclick="fnGuardar_SubProceso()"><i class="icon-hdd icon-white"></i> Guardar</button>
                </div>
			</form>
			
			<div class="well" style="width: 685px;margin-bottom: 12px;padding: 3px;">
	        	<table class="table" id="dgSubProcesos">
                            <thead>
                                <tr>
                                  <th>Nombre</th>
                                  <th>Función</th>
                                  <th width="70px"></th>
                                </tr>
                            </thead>
                            <tbody>
                            </tbody>
                            <script id="plantilla_subprocesos" type="text/template"> 
                              {{#rows}}
                              <tr><td>{{nombre}}</td>
                                  <td>{{funcion}}</td>
                                  <td><a onclick="fnEditar_SubProceso({{subproceso_id}});" class="btn btn-mini" title="Editar"><i class="icon icon-pencil"></i></a>&nbsp;
                                      <a onclick="fnEliminar_SubProceso({{subproceso_id}});" class="btn btn-mini" title="Eliminar"><i class="icon icon-trash"></i></a></td>
                              </tr>
                              {{/rows}}
                              {{^rows}}
                              <tr> 
                                <td colspan="5"> No se hay Subprocesos agregados!!</td>
                              </tr> 
                              {{/rows}}
                            </script>
                        </table> 		
	        </div>
        </div>
        <div class="modal-footer">
            <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="15" onBlur="$('#cmbNombre_subproceso').focus()">Cerrar</button>
            <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtSubProcesoID_subproceso','subprocesos');"><i class="icon-calendar"></i> Historial</button>
        </div>
    </div>   

                    

<script type="text/javascript">
  var pagina = 0;
  var strUltimaBusqueda= "";
//---------- Funciones para la Busqueda

  function paginacion() {
    if($('#txtBusqueda').val() != strUltimaBusqueda)
    {
      pagina = 0;
      strUltimaBusqueda = $('#txtBusqueda').val();
    }
      
    $.post('seguridad/procesos/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgProcesos tbody').empty();
                    var temp = Mustache.render($('#plantilla_procesos').html(),data);
                    $('#dgProcesos tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,'json');
  }

  function cmbProcesoPadreID_set() {
    $.post('seguridad/procesos/padres',
                  {},
                  function(data) {
                  	$('#cmbProcesoPadreID').empty();
                    var temp = Mustache.render($('#plantilla_procesos_padres').html(),data);
                    $('#cmbProcesoPadreID').html(temp);
                  }
                  ,'json');
  }


//--------- Funciones para el Modal Procesos

  function fnNuevo (){
    $('#divMensajes').html('');
    $('#frmProcesos')[0].reset();
    $('#txtProcesoID').val('');
    $('#txtNombre').focus();
  }
  
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('seguridad/procesos/guardar',
                  { intProcesoID: $('#txtProcesoID').val(),
                    strNombre: $('#txtNombre').val(),
                    strRuta: $('#txtRuta').val(),
                    intProcesoPadreID: $('#cmbProcesoPadreID').val()
                  },
                  function(data) {
                    if(data.resultado){
                      fnNuevo();
                      cmbProcesoPadreID_set();
                      paginacion();
                      $('#myModal').modal('hide');
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
    }
  }
  function fnEditar(id){
    $.post('seguridad/procesos/editar',
                  { intProcesoID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
                      $('#txtProcesoID').val(data.row.proceso_id);
                      $('#txtNombre').val(data.row.nombre);
                      $('#txtRuta').val(data.row.ruta_acceso);
                      $('#cmbProcesoPadreID').val(data.row.proceso_padre_id);
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
   function fnEliminar(id){
    $.post('seguridad/procesos/eliminar',
                  { intProcesoID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.resultado){
                      paginacion();
                    }
                  }
                 ,
          'json');
  }

 //--------- Funciones para el Modal Sub-Procesos
 function fnObtenerSubprocesos(){
  	$.post('seguridad/subprocesos/subprocesos_proceso',
                  { intProcesoID:$('#txtProcesoID_subproceso').val()
                  },
                  function(data) {
                    $('#dgSubProcesos tbody').empty();
                    var temp = Mustache.render($('#plantilla_subprocesos').html(),data);
                    $('#dgSubProcesos tbody').html(temp);
                  }
                 ,
          'json');
 }

 function fnNuevo_SubProceso(){
 	$('#frmSubProcesos')[0].reset();
 	$('#txtSubProcesoID_subproceso').val('');                    
  $('#txtIDElement_subproceso').val($('#txtRuta_subproceso').val());
 	$('#cmbNombre_subproceso').focus();
 }

 function fnEditar_SubProceso(id){
    $.post('seguridad/subprocesos/editar',
                  { intSubProcesoID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
					  $('#txtSubProcesoID_subproceso').val(id);                    
                      $('#cmbNombre_subproceso').val(data.row.nombre);
                      $('#txtIDElement_subproceso').val(data.row.funcion);
                      $('#cmbNombre_subproceso').focus();
                    }
                  }
                 ,
          'json');
  }

  function fnGuardar_SubProceso(){
  	$.post('seguridad/subprocesos/guardar',
                  { intSubProcesoID: $('txtSubProcesoID_subproceso').val(),
                  	intProcesoID: $('#txtProcesoID_subproceso').val(),
                    strNombre: $('#cmbNombre_subproceso').val(),
                    strFuncion: $('#txtIDElement_subproceso').val()
                  },
                  function(data) {
                    if(data.resultado){
                      fnNuevo_SubProceso();
                      fnObtenerSubprocesos();
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
  }

  function fnEliminar_SubProceso(id){
    if(confirm('Esta seguro que desea eliminar el registro ?'))
      $.post('seguridad/subprocesos/eliminar',
                  { intSubProcesoID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.resultado){
                      fnObtenerSubprocesos();
                    }
                  }
                 ,
          'json');
  }

 function fnShow_SubProcesos(id,ruta){
 	$('#txtProcesoID_subproceso').val(id);
  $('#txtRuta_subproceso').val(ruta+'/');
  $('#txtIDElement_subproceso').val(ruta+'/');
 	fnObtenerSubprocesos();
 	$('#myModalSubProcesos').modal('show');
 	
 }

  $( document ).ready(function() {
   
//---- Script para la Busqueda
     $("#btnBuscar").click(function(event){
        event.preventDefault();
        paginacion();
      });

     $('#pagLinks').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacion();
     });

//---- Script para el Modal Proceso
     $('#myModal').on('shown', function () {
        $('#txtNombre').focus();
     });
     $('#myModal').on('hidden', function () {
        $('#txtBusqueda').focus();
     });

//---- Script para el Modal SubProcesos
     $('#myModalSubProcesos').on('shown', function () {
        $('#cmbNombre_subproceso').focus();
     });
     $('#myModalSubProcesos').on('hidden', function () {
        $('#txtBusqueda').focus();
     });

//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmProcesos');    
     $('#txtBusqueda').focus();
     paginacion();
     cmbProcesoPadreID_set();
  });
</script> 

               