                    <form id="frmSearch" action="#" method="post" tabindex="-5" onsubmit="return(false)">
                                <div style="display:inline-block;">
                                  <label for="txtBusqueda"><h5>Nombre</h5></label>
                                  <div class="input-append">
                                      <input id ="txtBusqueda" name="strBusqueda" value="" type="text" placeholder="Teclea Nombre" tabindex="-4">
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
                        
                        <table class="table" id="dgGruposUsuarios">
                             <thead>
                                <tr><th>Nombre</th>
                                    <th>Estado</th>
                                    <th style="width:20px; text-align: center;">Miebros</th>
                                    <th style="width:20px; text-align: center;">Permisos</th>
                                    <th width="20px"></th>
                                    <th width="20px"></th>
                                    <th width="20px"></th>
                                </tr>
                            </thead>
                            <tbody>
                            </tbody>
                            <script id="plantilla_grupos_usuarios" type="text/template"> 
                              {{#rows}}
                              <tr>  <td>{{nombre}}</th>
                                    <td>{{estado}}</th>
                                    <td style="width:20px; text-align: center;"><a onclick="fnShow_Miembros({{grupo_usuario_id}})" class="btn btn-mini" title="Miembros"><i class="icon icon-user"></i></a></td>
                                    <td style="width:20px; text-align: center;"><a onclick="fnShow_Permisos({{grupo_usuario_id}})" class="btn btn-mini" title="Permisos"><i class="icon icon-lock"></i></a></td>
                                    <td><a onclick="fnCambiarEstado({{grupo_usuario_id}},{{estatus_id}})" class="btn btn-mini" title="Cambiar de Estado"><i class="icon icon-eye-open"></i></a></th>
                                    <td><a onclick="fnEditar({{grupo_usuario_id}})" class="btn btn-mini"><i class="icon icon-pencil" title="Editar"></i></a></th>
                                    <td><a onclick="fnEliminar({{grupo_usuario_id}})" class="btn btn-mini"><i class="icon icon-trash" title="Eliminar"></i></a></td>
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




 <!-- Grupo de Usuarios -->
    <div id="myModal" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"  style="width:350px;left:50%;" >
        <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="1" onclick="fnNuevo();">×</button>
        <h3 id="myModalLabel">Grupo de Usuario</h3>
        </div>
        <div class="modal-body " style="max-height:100%; height:100%;">
          <form name="frmGruposUsuarios" id="frmGruposUsuarios" action="#" method="post" onsubmit="return(false)" autocomplete="off">
    				<input type="hidden" id="txtGrupoUsuarioID" name="intGrupoUsuarioID" value="">
    				<label for="txtNombre">Nombre</label>
    			    <input class="span3" id="txtNombre" name="strNombre" type="text" value="" tabindex="2" placeholder="Teclee el Nombre">
    				<label for="cmbEstatusID">Estado</label>
    				<select id="cmbEstatusID" name="intEstatusID" class="span3" tabindex="3" >
              <option value="1">ACTIVO</option>
              <option value="2">BAJA</option>
    	  		</select>
			    </form>	
        </div>
        <div class="modal-footer">
            <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="4" onclick="fnNuevo();">Cancelar</button>
            <button class="btn btn-primary" tabindex="5" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>
            <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtGrupoUsuarioID','grupos_usuarios');"><i class="icon-calendar"></i> Historial</button>
        </div>
    </div>     

     <!-- Miembros -->
    <div id="myModalMiembros" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="width:600px;left:53%;">
        <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="10" onclick="">×</button>
        <h3 id="myModalLabel">Miembros de Grupo</h3>
        </div>
        <div class="modal-body " style="max-height:100%; height:100%;">
           <input type="hidden" id="txtGrupoUsuarioID_Miembros" name="intGrupoUsuarioID_Miembros" value="">
            <form id="frmSearch_Miembros" action="#" method="post" tabindex="-5" onsubmit="return(false)">
                  <div class="input-append" style="margin-bottom:0px;">
                      <input id ="txtBusqueda_Miembros" name="strBusqueda_Miembros" value="" type="text" placeholder="Teclea Nombre" tabindex="-4">
                      <div class="btn-group" >
                        <button class="btn dropdown-toggle" onclick="fnObtenerMiembros();" tabindex="-3">
                          <i class="icon-search"></i>
                        </button>
                      </div>
                  </div>
            </form>
           <div style="display:-webkit-inline-box;height: 298px;">
    			    <div class="well" style="width: 268px;margin-bottom:0px;padding:3px;margin-right:15px;">
    	        	<table class="table" id="dgMiembros">
                                 <thead>
                                    <tr>
                                      <th>Usuarios del Grupo</th>
                                      <th width="15px"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                </tbody>
                                <script id="plantilla_miembros" type="text/template"> 
                                  {{#rows_1}}
                                      <tr><td>{{nombre}}</td>
                                        <td><a onclick="fnQuitar_Miembro({{usuario_id}});" class="btn btn-mini"><i class="icon icon-arrow-right"></i></a></td>
                                      </tr>
                                  {{/rows_1}}
                                  {{^rows_1}}
                                  <tr> 
                                    <td colspan="5"> No se hay Usuarios agregados!!</td>
                                  </tr> 
                                  {{/rows_1}}
                                </script>
                            </table> 		
    	        </div>

              <div class="well" style="width: 268px;margin-bottom:0px;padding:3px;">
                <table class="table" id="dgUsuarios">
                                 <thead>
                                    <tr>
                                      <th width="15px"></th>
                                      <th style="text-align:right;">Usuarios</th>
                                    </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                   
                                  </tr>
                                </tbody>
                                <script id="plantilla_miembros_usuarios" type="text/template"> 
                                  {{#rows_2}}
                                      <tr><td><a onclick="fnAgregar_Miembro({{usuario_id}});" class="btn btn-mini"><i class="icon icon-arrow-left"></i></a></td>
                                        <td style="text-align:right;">{{nombre}}</td>
                                      </tr>
                                  {{/rows_2}}
                                  {{^rows_2}}
                                  <tr> 
                                    <td colspan="5"> No se hay Usuarios agregados!!</td>
                                  </tr> 
                                  {{/rows_2}}
                                </script>
                            </table>    
              </div>
          </div>
        </div>
        <div class="modal-footer">
            <div id="pagLinks_Miembros"  style="text-align:center;width:70%;display:inline-block;"></div>
            <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="5" onclick="">Cerrar</button>
            <!--<button class="btn btn-primary" tabindex="6" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>-->
            <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtGrupoUsuarioID_Miembros','grupos_usuarios_detalles');"><i class="icon-calendar"></i> Historial</button>
        </div>
    </div> 

    <!-- Permisos de Acceso -->
    <div id="myModalPermisos" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="width:700px;left:45%;">
        <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="10" onclick="">×</button>
        <h3 id="myModalLabel">Permisos de Acceso</h3>
        </div>
        <div class="modal-body " style="max-height:100%; height:100%;">
              <input type="hidden" id="txtGrupoUsuarioID_Permisos" name="intGrupoUsuarioID_Permisos" value="">
              <div class="input-append">
                  <label for="cmbProcesoID_Permisos">Proceso</label>
                  <select id="cmbProcesoID_Permisos" style="width:326px;">
                    <option value="0">[ Seleccione un Proceso ]</option>
                  </select>
              </div>
              <script id="plantilla_procesos" type="text/template"> 
                <option value="0">[ Seleccione un Proceso ]</option>
                {{#rows}}
                  <option value="{{value}}">{{padre}}/{{nombre}}</option>
                {{/rows}} 
              </script>
           <div style="display:-webkit-inline-box;height: 298px;">
              <div class="well" style="width: 318px;margin-bottom:0px;padding:3px;margin-right:15px;">
                <table class="table" id="dgPermisosGrupo">
                     <thead>
                        <tr>
                          <th>Permisos del Grupo</th>
                          <th width="15px"></th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                    <script id="plantilla_grupos_permisos" type="text/template"> 
                      {{#rows}}
                        {{#grupo_usuario_id}}
                          <tr><td>{{nombre}}</td>
                            <td><a onclick="fnQuitar_Permiso({{subproceso_id}});" class="btn btn-mini"><i class="icon icon-arrow-right"></i></a></td>
                          </tr>
                        {{/grupo_usuario_id}}
                      {{/rows}}
                      {{^rows}}
                      <tr> 
                        <td colspan="5"> No se hay Usuarios agregados!!</td>
                      </tr> 
                      {{/rows}}
                    </script>
                </table>    
              </div>

              <div class="well" style="width: 318px;margin-bottom:0px;padding:3px;">
                <table class="table" id="dgPermisos">
                   <thead>
                      <tr>
                        <th width="15px"></th>
                        <th style="text-align:right;">Permisos</th>
                      </tr>
                  </thead>
                  <tbody>
                  </tbody>
                  <script id="plantilla_permisos" type="text/template"> 
                    {{#rows}}
                      {{^grupo_usuario_id}}
                        <tr><td><a onclick="fnAgregar_Permiso({{subproceso_id}});" class="btn btn-mini"><i class="icon icon-arrow-left"></i></a></td>
                          <td style="text-align:right;">{{nombre}}</td>
                        </tr>
                      {{/grupo_usuario_id}}
                    {{/rows}}
                    {{^rows}}
                    <tr> 
                      <td colspan="5"> No se hay Usuarios agregados!!</td>
                    </tr> 
                    {{/rows}}
                  </script>
                </table>    
              </div>
          </div>
        </div>
        <div class="modal-footer">
            <div id="pagLinks_Miembros"  style="text-align:center;width:70%;display:inline-block;"></div>
            <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="5" onclick="">Cerrar</button>
            <!--<button class="btn btn-primary" tabindex="6" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>-->
            <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtGrupoUsuarioID_Permisos','permisos_acceso');"><i class="icon-calendar"></i> Historial</button>
        </div>
    </div>     

                    

<script type="text/javascript">
  var pagina = 0;
  var pagina_Miembros = 0;

  var strUltimaBusqueda = "";
  var strUltimaBusqueda_Miembros = "";
//---------- Funciones para la Busqueda

  function paginacion() {
    if($('#txtBusqueda').val() != strUltimaBusqueda)
    {
      pagina = 0;
      strUltimaBusqueda = $('#txtBusqueda').val();
    }
      
    $.post('seguridad/gruposusuarios/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgGruposUsuarios tbody').empty();
                    var temp = Mustache.render($('#plantilla_grupos_usuarios').html(),data);
                    $('#dgGruposUsuarios tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,'json');
  }

//--------- Funciones para el Modal Grupos de Usuarios

  function fnNuevo (){
    $('#divMensajes').html('');
    $('#frmGruposUsuarios')[0].reset();
    $('#txtGrupoUsuarioID').val('');
    $('#txtNombre').focus();
  }
  
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('seguridad/gruposusuarios/guardar',
                  { intGrupoUsuarioID: $('#txtGrupoUsuarioID').val(),
                    strNombre: $('#txtNombre').val(),
                    intEstatusID: $('#cmbEstatusID').val()
                  },
                  function(data) {
                    if(data.resultado){
                      fnNuevo();
                      paginacion();
                      $('#myModal').modal('hide');
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
    }
  }

  function fnCambiarEstado(id,estado){
      $.post('seguridad/gruposusuarios/cambiar_estado',
                  { intGrupoUsuarioID: id,
                    intEstatusID: estado
                  },
                  function(data) {
                    if(data.resultado){
                      paginacion();
                      $('#myModal').modal('hide');
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
  }

  function fnEditar(id){
    $.post('seguridad/gruposusuarios/editar',
                  { intGrupoUsuarioID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
                      $('#txtGrupoUsuarioID').val(data.row.grupo_usuario_id);
                      $('#txtNombre').val(data.row.nombre);
                      $('#cmbEstatusID').val(data.row.estatus_id);
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
  
  function fnEliminar(id){
    if(confirm('Esta seguro que desea eliminar el registro ?'))
    $.post('seguridad/gruposusuarios/eliminar',
                  { intGrupoUsuarioID:id
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

 //--------- Funciones para el Modal Miembros
  function fnShow_Miembros(id){
    $('#txtGrupoUsuarioID_Miembros').val(id);
    fnObtenerMiembros();
    $('#myModalMiembros').modal('show');
  }

  function fnObtenerMiembros(){
    if($('#txtBusqueda').val() != strUltimaBusqueda)
    {
      pagina_Miembros = 0;
      strUltimaBusqueda_Miembros = $('#txtBusqueda_Miembros').val();
    }
   	$.post('seguridad/gruposusuarios/buscar_integrantes',
                    { strBusqueda:$('#txtBusqueda_Miembros').val(), 
                      intPagina: pagina_Miembros,
                      intGrupoUsuarioID: $('#txtGrupoUsuarioID_Miembros').val()
                    },
                    function(data) {
                      $('#dgMiembros tbody').empty();
                      var temp = Mustache.render($('#plantilla_miembros').html(),data);
                      $('#dgMiembros tbody').html(temp);
                      $('#dgUsuarios tbody').empty();
                      temp = Mustache.render($('#plantilla_miembros_usuarios').html(),data);
                      $('#dgUsuarios tbody').html(temp);
                      $('#pagLinks_Miembros').html(data.paginacion);
                      pagina_Miembros = data.pagina;
                    }
                   ,
            'json');
  }

  function fnQuitar_Miembro(id){
      $.post('seguridad/gruposusuarios/eliminar_miembro',
                    { intGrupoUsuarioID:$('#txtGrupoUsuarioID_Miembros').val(),
                      intUsuarioID:id                                        
                    },
                    function(data) {
                      $('#divMensajes').html(data.mensajes);
                      fnObtenerMiembros();
                    }
                   ,
            'json');
  }

  function fnAgregar_Miembro(id){
    $.post('seguridad/gruposusuarios/agregar_miembro',
                  { intGrupoUsuarioID:$('#txtGrupoUsuarioID_Miembros').val(),
                    intUsuarioID:id                                        
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    fnObtenerMiembros();
                  }
                 ,
          'json');
  } 

  //--------- Funciones para el Modal Permisos de Acceso
  function cmbProcesoID_Permisos_set() {
    $.post('seguridad/procesos/hijos',
                  {},
                  function(data) {
                    $('#cmbProcesoID_Permisos').empty();
                    var temp = Mustache.render($('#plantilla_procesos').html(),data);
                    $('#cmbProcesoID_Permisos').html(temp);
                  }
                  ,'json');
  }

  function fnShow_Permisos(id){
    $('#txtGrupoUsuarioID_Permisos').val(id);
    $('#cmbProcesoID_Permisos').val(0);
    fnObtenerPermisos();
    $('#myModalPermisos').modal('show');
  }

  function fnObtenerPermisos(){
    $.post('seguridad/permisosaccesos/buscar',
                    { intGrupoUsuarioID: $('#txtGrupoUsuarioID_Permisos').val(),
                      intProcesoID: $('#cmbProcesoID_Permisos').val()
                    },
                    function(data) {
                      $('#dgPermisosGrupo tbody').empty();
                      var temp = Mustache.render($('#plantilla_grupos_permisos').html(),data);
                      $('#dgPermisosGrupo tbody').html(temp);
                      $('#dgPermisos tbody').empty();
                      temp = Mustache.render($('#plantilla_permisos').html(),data);
                      $('#dgPermisos tbody').html(temp);
                    }
                   ,
            'json');
  }

  function fnQuitar_Permiso(id){
      $.post('seguridad/permisosaccesos/eliminar_permiso',
                    { intGrupoUsuarioID:$('#txtGrupoUsuarioID_Permisos').val(),
                      intSubprocesoID:id                                       
                    },
                    function(data) {
                      $('#divMensajes').html(data.mensajes);
                      fnObtenerPermisos();
                    }
                   ,
            'json');
  }

  function fnAgregar_Permiso(id){
    $.post('seguridad/permisosaccesos/agregar_permiso',
                  { intGrupoUsuarioID:$('#txtGrupoUsuarioID_Permisos').val(),
                      intSubprocesoID:id                                      
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    fnObtenerPermisos();
                  }
                 ,
          'json');
  } 

  $( document ).ready(function() {
   
//---- Script para la Busqueda
     $("#btnBuscar").click(function(event){
        event.preventDefault();
        paginacion();
      });

     $("#btnBuscar_").click(function(event){
        event.preventDefault();
        paginacion();
      });

     $('#pagLinks').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacion();
     });

     $('#pagLinks_Miembros').on('click','a',function(event){
        event.preventDefault();
        pagina_Miembros = $(this).attr('href').replace('/','');
        fnObtenerMiembros();
     });

//---- Script para el Modal Grupos de Usuarios
     $('#myModal').on('shown', function () {
        $('#txtNombre').focus();
     });
     $('#myModal').on('hidden', function () {
        $('#txtBusqueda').focus();
     });

//---- Script para el Modal Miembros
     $('#myModalMiembros').on('hidden', function () {
        $('#txtBusqueda').focus();
     });

//---- Script para el Modal Permisos de Acceso
     $('#myModalPermisos').on('shown', function () {
        $('#cmbProcesoID_Permisos').focus();
     });
     $('#myModalPermisos').on('hidden', function () {
        $('#txtBusqueda').focus();
     });

     $("#cmbProcesoID_Permisos").change(function(event){
        fnObtenerPermisos();
      });

//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmGruposUsuarios');    
     $('#txtBusqueda').focus();
     paginacion();
     cmbProcesoID_Permisos_set();
  });
</script> 

               