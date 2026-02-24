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
                               <!-- &nbsp;&nbsp;
                                <div style="display:inline-block;">
                                  <label for="txtPuesto"><h5>Puesto</h5></label>
                                  <div class="input-append">
                                    <input  id="txtPuesto" type="text" placeholder="Ingresa Puesto">
                                    <div class="btn-group" >
                                      <button class="btn dropdown-toggle">
                                        <i class="icon-search"></i>
                                      </button>
                                    </div>
                                  </div>
                                </div> -->
  
                              <div id="opciones" class="btn-group" style="display:inline-block;float:right;padding-top:40px;">
                                	
                                		<!-- Button to trigger modal -->
                                    <a href="#myModal" role="button" class="btn btn-primary" data-toggle="modal"><i class="icon-plus icon-white"></i> Nuevo</a>   

                                		<button class="btn btn-inverse">
                                			<i class="icon-print icon-white"></i> Imprimir
                                		</button>	
                              
                              </div>    
                        </form>
                        
                        <table class="table" id="dgUsuarios">
                             <thead>
                                <tr>
                                  <th>Usuario</th>
                                  <th>Empleado</th>
                                  <th>MF</th>
                                  <th>Estatus</th>
                                  <th width="20px">Editar</th>
                                  <th width="20px">Eliminar</th>
                                </tr>
                            </thead>
                            <tbody>
                            </tbody>
                            <script id="plantilla_usuarios" type="text/template"> 
                              {{#usuarios}}
                              <tr><td>{{usuario}}</td>
                                  <td>{{empleado}}</td>
                                  <td>{{MF}}</td>
                                  <td>{{estatus}}</td>
                                  <td><a onclick="fnEditar({{usuario_id}});" class="btn btn-mini"><i class="icon icon-pencil"></i></a></td>
                                  <td><a onclick="fnEliminar({{usuario_id}});" class="btn btn-mini"><i class="icon icon-trash"></i></a></td>
                              </tr>
                              {{/usuarios}}
                              {{^usuarios}}
                              <tr> 
                                <td colspan="5"> No se Encontraron Resultados!!</td>
                              </tr> 
                              {{/usuarios}}
                            </script>
                            
                        </table>
                        <div style="dysplay: inline-block;">
                          <div id="pagLinks"  style="float:left;margin-right:10px;"></div>
                          <div style="float:right;margin-right:10px;"><strong id="numElementos">3</strong> Encontrados</div>
                          <br>
                       </div>


 <!-- Modal - FrmUsuarios -->
    <div id="myModal" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true"  >
        <div class="modal-header">
        <button id="btnCloseModal"type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="1" onclick="fnNuevo();">×</button>
        <h3 id="myModalLabel">Usuario</h3>
        </div>
        <div class="modal-body" style="max-height:100%; height:100%;">
         
            <form name="frmUsuarios" id="frmUsuarios" action="#" method="post" onsubmit="return(false)" autocomplete="off">
              <div style="display:-webkit-inline-box;">
                  <div style="width:240px;">
                    <input type="hidden" id="txtUsuarioID" name="intUsuarioID" value="">
                    <label for="txtUsuario">Usuario</label>      
                    <input class="span3" id="txtUsuario" name="strUsuario" type="text" value="" tabindex="2" placeholder="Teclea el Usuario" maxlength="20">
                    <label for="txtPassword">Password</label>
                    <input class="span3" id="txtPassword" name="strPassword" type="password" value="" tabindex="3" placeholder="Teclea el Password">
                    <label for="txtConfirmar">Confirmar</label>
                    <input class="span3" id="txtConfirmar" name="strConfirmacion" type="password" placeholder="Confirmar" value="" tabindex="4">   
                  </div>
                  <div style="width:240px;">
                      <label for="cmbModificaFechas">Modifica Fechas</label>
                      <div class="input">
                        <select id="cmbModificaFechas" name="intModificaFechas" class="span3" tabindex="5" >
                            <option value="1">Si</option>
                            <option value="2">No</option>
                          </select>
                      </div>
                    <label for="cmbEstatus">Estado</label>
                      <div class="input">
                          <select id="cmbEstatus" name="intEstatus" class="span3" tabindex="6" >
                            <option value="1">Activo</option>
                            <option value="2">Baja</option>
                          </select>
                      </div>
                      <input type="hidden" id="txtEmpleadoID" value="0">
                      <label for="txtEmpleado">Empleado</label> 
                      <input class="span3" id="txtEmpleado" name="strEmpleado" type="text" value="" tabindex="7" placeholder="Teclea el Empleado">
                  </div>
              </div>
            </form> 

        </div>
        <div class="modal-footer">
            <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="8" onclick="fnNuevo();">Cancelar</button>
            <button class="btn btn-primary" tabindex="9" onclick="fnGuardar();" onblur="$('#btnCloseModal').focus()"><i class="icon-hdd icon-white"></i> Guardar</button>
            <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtUsuarioID','usuarios');"><i class="icon-calendar"></i> Historial</button>
        </div>
  </div>     

                    

<script type="text/javascript">
  var pagina = 0;
  var strUltimaBusqueda= "";
//---------- Funciones para la Busqueda

  function paginacion(){
    if($('#txtBusqueda').val() != strUltimaBusqueda){
      pagina = 0;
      strUltimaBusqueda = $('#txtBusqueda').val();
    }
      
    $.post('seguridad/usuarios/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgUsuarios tbody').empty();
                    var temp = Mustache.render($('#plantilla_usuarios').html(),data);
                    $('#dgUsuarios tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
  }


//--------- Funciones para el Modal

  function fnNuevo (){
    $('#divMensajes').html('');
    $('#frmUsuarios')[0].reset();
    $('#txtUsuarioID').val('');
    $('#txtEmpleadoID').val("0");
    $('#txtUsuario').focus();
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','seguridad/usuarios/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','seguridad/usuarios');        
  }
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('seguridad/usuarios/guardar',
                  { intUsuarioID: $('#txtUsuarioID').val(),
                    strUsuario: $('#txtUsuario').val(),
                    strPassword: $('#txtPassword').val(),
                    strConfirmacion: $('#txtConfirmar').val(),
                    intModificaFechas: $('#cmbModificaFechas').val(),
                    intEmpleadoID: $('#txtEmpleadoID').val(),
                    intEstatus: $('#cmbEstatus').val()
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
  function fnEditar(id){
    $.post('seguridad/usuarios/editar',
                  { intUsuarioID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
                      $('#txtUsuarioID').val(data.row.usuario_id);
                      $('#txtUsuario').val(data.row.usuario);
                      $('#txtPassword').val();
                      $('#txtConfirmar').val();
                      $('#cmbModificaFechas').val(data.row.modificar_fechas.toString());
                      $('#txtEmpleadoID').val(data.row.empleado_id);
                      $('#txtEmpleado').val(data.row.empleado);
                      $('#cmbEstatus').val(data.row.estatus_id.toString());
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
   function fnEliminar(id){
    if(confirm('Esta seguro que desea eliminar el registro ?'))
      $.post('seguridad/usuarios/eliminar',
                  { intUsuarioID:id
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

  $( document ).ready(function() {

     $("#txtEmpleado").autocomplete("catalogos/empleados/autocomplete", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:6,onItemSelect:null,selectOnly:0,remoteDataType:"json"} 
     );
   
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

//---- Script para el Modal
     $('#myModal').on('shown', function () {
        $('#txtUsuario').focus();
     });

     $('#myModal').on('hidden', function () {
        $('#txtBusqueda').focus();
     });

     $("#btnGuardar").click(fnGuardar);


//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmUsuarios');    
     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 

               