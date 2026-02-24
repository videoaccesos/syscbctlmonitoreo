
<form id="frmSearch" action="#" method="post" onsubmit="return(false)">
      <div style="display:inline-block;">
        <label for="txtBusqueda"><h5>Nombre</h5></label>
        <div class="input-append">
            <input id ="txtBusqueda" name="strBusqueda" value="" type="text" placeholder="Ingresa Nombre" tabindex="-7">
            <div class="btn-group" >
              <button class="btn dropdown-toggle" onclick="paginacion();" tabindex="-1">
                <i class="icon-search"></i>
              </button>
            </div>
        </div>
      </div>
       &nbsp;&nbsp;
      <div style="display:inline-block;">
        <label for="txtBusquedaPuesto"><h5>Puesto</h5></label>
        <div class="input-append">
          <input  id="txtBusquedaPuesto" type="text" placeholder="Ingresa Puesto" tabindex="-5">
          <div class="btn-group" >
            <button class="btn dropdown-toggle" onclick="paginacion();" tabindex="-1">
              <i class="icon-search"></i>
            </button>
          </div>
        </div>
      </div> 
 
  <div class="btn-group" style="display:inline-block;float:right;padding-top:40px;">
        <!-- Button to trigger modal -->
        <a href="#myModal" role="button" class="btn btn-primary" data-toggle="modal" tabindex="-3"><i class="icon-plus icon-white"></i> Nuevo</a>   
        <button class="btn btn-inverse" tabindex="-2">
          <i class="icon-print icon-white"></i> Imprimir
        </button> 
    </div>    
</form>
                  
                        <table class="table table-stripped" id="dgEmpleados">
                            <thead>
                                <tr>
                                  <th >Nombre</th>
                                  <th >Puesto</th>
                                  <th width="40px">Estatus</th>
                        		      <th width="70px"></th>
                                </tr>
                            </thead>
                            <tbody>
                            </tbody>
                            <script id="plantilla_empleados" type="text/template">
                              {{#rows}}
                              <tr><td>{{empleado}}</td>
                                  <td>{{puesto}}</td>
                                  <td>{{estatus}}</td>
                                  <td><a onclick="fnEditar({{empleado_id}})" class="btn btn-mini" title="Editar"><i class="icon icon-pencil"></i></a>
                                      <a onclick="fnEliminar({{empleado_id}})" class="btn btn-mini" title="Eliminar"><i class="icon icon-trash"></i></a>
                                  </td>
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


    <!-- Modal -->
    <div id="myModal" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true" style="top:7%; width:985px; left:38%;" >
        <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="0">×</button>
        <h3 id="myModalLabel">Empleado</h3>
        </div>
        <div class="modal-body" style="max-height:100%; height:100%;">
          <form name="frmEmpleados" id="frmEmpleados" action="#" method="post" onsubmit="return(false)" autocomplete="off">
            <input type="hidden" id="txtEmpleadoID" value=""> 
            <div style="display:inline-block;">
                <div style="max-width:470px; widht:90%; display:inline-block; padding-right:17px;">     
                  <div>
                    <div style="display:inline-block; padding-right:17px;">
                      <label for="txtNombre">Nombre</label>
                      <input class="span3" id="txtNombre" type="text" placeholder="Ingresa Nombre" tabindex="1">
                    </div>
                    <div style="display:inline-block;">
                      <label for="txtApePaterno">Apellido Paterno</label>
                      <input class="span3" id="txtApePaterno" type="text" placeholder="Ingresa Apellido" tabindex="2">
                    </div>
                  </div> 
                  
                  <div>
                      <div style="display:inline-block; padding-right:17px;">
                        <label for="txtApeMaterno">Apellido Materno</label>
                        <input class="span3" id="txtApeMaterno" type="text" placeholder="Ingresa Apellido" tabindex="3">
                      </div>

                      <div style="display:inline-block;">
                        <label for="txtNroSeguroSocial">No. de Seguro Social</label>
                        <input class="span3" id="txtNroSeguroSocial" type="text" placeholder="Ingresa S. Social" tabindex="4">
                      </div>
                  </div>

                  <div>
                    <div style="display:inline-block; padding-right:18px;">
                      <label for="cmbPuestoID">Puesto</label>
                      <select class="span3" id="cmbPuestoID" tabindex="5">
                        <option>Supervisor</option>
                        <option>Operador</option>
                        <option>Tecnico</option>
                        <option>Guardia</option>
                        <option>Administrador</option>
                      </select>
                    </div>
                    <div style="display:inline-block;">
                        <label for="txtNroOperador">No. Operador</label>
                        <input class="span3" id="txtNroOperador" type="text" placeholder="Ingresa No. de Operador" tabindex="6" maxlength="4">
                      </div>
                  </div>

                  <div>
                    <label for="txtCalle">Calle</label>
                    <input class="span6" id="txtCalle" type="text" placeholder="Ingresa Calle" tabindex="7">
                  </div>

                  <div>
                      <div style="display:inline-block; padding-right:17px;">
                        <div>
                            <div style="display:inline-block; padding-right:17px;">
                              <label for="txtNumCasa">No. Casa</label>
                              <input class="span2" id="txtNumCasa" type="text" placeholder="Ingresa No." tabindex="8">
                            </div>
                            <div style="display:inline-block;">
                                <label for="cmbSexo">Sexo</label>
                                <select class="span1" id="cmbSexo" tabindex="9">
                                  <option value="F">F</option>
                                  <option value="M">M</option>
                                </select>
                            </div>
                        </div>
                      </div>

                      <div style="display:inline-block;">
                        <label for="txtColonia">Colonia</label>
                        <input class="span3" id="txtColonia" type="text" placeholder="Ingresa Colonia" tabindex="10">
                      </div>
                  </div>

                  <div>
                    <div style="display:inline-block; padding-right:17px;">
                      <label for="txtTelefono">Telefono</label>
                      <input class="span3" id="txtTelefono" type="text" placeholder="Ingresa Telefono" tabindex="11">
                    </div>
                    <div style="display:inline-block;">
                      <label for="txtCelular">Celular</label>
                      <input class="span3" id="txtCelular" type="text" placeholder="Ingresa Celular" tabindex="12">
                    </div>
                  </div> 
                  <div>
                    <label for="txtEmail">E-Mail</label>
                    <input class="span6" id="txtEmail" type="text" placeholder="Ingresa Email" tabindex="13">
                  </div>
                </div>

                <div style="display:inline-block; vertical-align: top;">
                    <div>
                        <div style="display:inline-block; padding-right:65px;">
                          <label for="dtFechaIngreso">Fecha Ingreso</label>
                      <!-- <div class="input-append date datepicker">
                                <input id="dtFechaIngreso" class="span2" type="text" value=""><span class="add-on"><i class="icon-th"></i></span>
                            </div>-->
                          <div class="input-append datepicker" >
                            <input id="dtFechaIngreso" class="span2" data-format="dd-MM-yyyy" type="text"></input>
                            <span class="add-on">
                              <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
                            </span>
                          </div>
                        </div>
                        <div style="display:inline-block;">
                            <label for="cmbEstado">Estado</label>
                            <select class="span3" id="cmbEstatusID">
                              <option value='1'>Activo</option>
                              <option value='2'>Baja</option>
                            </select>
                        </div>
                    </div>

                     <div>
                        <div style="display:inline-block;">
                          <label for="dtFechaBaja">Fecha Baja</label>
                          <!-- <div class="input-append date datepicker">
                                <input id="dtFechaBaja" class="span2" type="text" value=""><span class="add-on"><i class="icon-th"></i></span>
                            </div> -->
                          <div id="dFechaBaja" class="input-append datepicker" >
                            <input id="dtFechaBaja" class="span2" data-format="dd-MM-yyyy" type="text"></input>
                            <span class="add-on" hidden>
                              <i data-time-icon="icon-time" data-date-icon="icon-calendar"></i>
                            </span>
                          </div>
                      
                          
                        </div>
                    </div>

                    <div>
                        <div>
                          <label for="txtMotivo">Motivo</label>
                          <textarea id="txtMotivo" class="span6" rows="8" placeholder="Ingrese Motivo" style="resize:none;"></textarea>
                        </div>
                    </div>
                </div>

          </div>                       
          </form>
          <script id="plantilla_puestos" type="text/template"> 
            {{#puestos}}
              <option value="{{value}}">{{nombre}}</option>
            {{/puestos}} 
          </script>
        </div>
        <div class="modal-footer">
            <button class="btn" data-dismiss="modal" aria-hidden="true">Cancelar</button>
            <button class="btn btn-primary" id="btnGuardar"><i class="icon-hdd icon-white"></i> Guardar</button>
        </div>
  </div>


<script type="text/javascript">
  var pagina = 0;
  var strUltimaBusqueda= "";
  var strFecha = "<?php echo $fecha;?>";
//---------- Funciones para la Busqueda

  function paginacion(){
    if($('#txtBusqueda').val()+$('#txtBusquedaPuesto').val() != strUltimaBusqueda){
      pagina = 0;
      strUltimaBusqueda = $('#txtBusqueda').val()+$('#txtBusquedaPuesto').val();
    }
      
    $.post('catalogos/empleados/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), strBusquedaPuesto:$('#txtBusquedaPuesto').val(), intPagina:pagina},
                  function(data) {
                    $('#dgEmpleados tbody').empty();
                    var temp = Mustache.render($('#plantilla_empleados').html(),data);
                    $('#dgEmpleados tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
  }

  function cmbPuestoID_set() {
    $.post('catalogos/puestos/opciones',
                  {},
                  function(data) {
                    $('#cmbPuestoID').empty();
                    var temp = Mustache.render($('#plantilla_puestos').html(),data);
                    $('#cmbPuestoID').html(temp);
                  }
                  ,'json');
  }


//--------- Funciones para el Modal

  function fnNuevo (){
    $('#divMensajes').html('');
    $('#frmEmpleados')[0].reset();
    $('#dtFechaIngreso').val(strFecha);
     $('#dtFechaBaja').val(strFecha);
    $('#dtFechaBaja').attr('disabled', 'disabled');
    $('#txtEmpleadoID').val('');
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','catalogos/empleados/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','catalogos/empleados');        
  }
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('catalogos/empleados/guardar',
                  { intEmpleadoID: $('#txtEmpleadoID').val(), 
                    strNombre: $('#txtNombre').val(),
                    strApePaterno: $('#txtApePaterno').val(),
                    strApeMaterno: $('#txtApeMaterno').val(),
                    strNroSeguroSocial: $('#txtNroSeguroSocial').val(),
                    intPuestoID: $('#cmbPuestoID').val(),
                    strNroOperador: $('#txtNroOperador').val(),
                    strCalle: $('#txtCalle').val(),
                    strNroCasa: $('#txtNumCasa').val(),
                    strSexo: $('#cmbSexo').val(),
                    strColonia: $('#txtColonia').val(),
                    strTelefono: $('#txtTelefono').val(),
                    strCelular: $('#txtCelular').val(),
                    strEmail: $('#txtEmail').val(),
                    strFechaIngreso: fnInvFecha($('#dtFechaIngreso').val()),
                    strFechaBaja: fnInvFecha($('#dtFechaBaja').val()),
                    strMotivo: $('#txtMotivo').val(),
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
      $.post('catalogos/empleados/cambiar_estado',
                  { intEmpleadoID: id,
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
    $.post('catalogos/empleados/editar',
                  { intEmpleadoID:id
                  },
                  function(data) {
                  $('#divMensajes').html(data.mensajes);
                  if(data.row){
                      $('#txtEmpleadoID').val(data.row.empleado_id);
                      $('#txtApePaterno').val(data.row.ape_paterno);
                      $('#txtApeMaterno').val(data.row.ape_materno);
                      $('#txtNombre').val(data.row.nombre);
                      $('#txtNroSeguroSocial').val(data.row.nro_seguro_social);
                      $('#cmbPuestoID').val(data.row.puesto_id);
                      $('#txtNroOperador').val(data.row.nro_operador);
                      $('#txtCalle').val(data.row.calle);
                      $('#txtNumCasa').val(data.row.nro_casa);
                      $('#cmbSexo').val(data.row.sexo);
                      $('#txtColonia').val(data.row.colonia);
                      $('#txtTelefono').val(data.row.telefono);
                      $('#txtCelular').val(data.row.celular);
                      $('#txtEmail').val(data.row.email);
                      $('#txtMotivo').val(data.row.motivo_baja);
                      $('#dtFechaIngreso').val(fnInvFecha(data.row.fecha_ingreso));
                      $('#dtFechaBaja').val(fnInvFecha(data.row.fecha_baja));
                      $('#cmbEstatusID').val(data.row.estatus_id.toString());
                      if(data.row.estatus_id == 2)
                        $('#dtFechaBaja').removeAttr('disabled');
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
   function fnEliminar(id){
    if(confirm("Esta seguro que desea eliminar el registro ?"))
      $.post('catalogos/empleados/eliminar',
                    { intEmpleadoID:id
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
//---- Script para la Busqueda
      $('.datepicker').datetimepicker({
          language: 'es',
          pickTime: false
      });

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
       $('#txtNombre').focus();
     });

     $('#myModal').on('hidden', function () {
      fnNuevo();
        $('#txtBusqueda').focus();
     });

     $("#cmbEstatusID").change(function(){
        if(this.value == 1)
          $('#dFechaBaja').data('datetimepicker').disable();
        else
          $('#dFechaBaja').data('datetimepicker').enable();
      });

     $("#btnGuardar").click(fnGuardar);

     
     $('#dtFechaIngreso').val(strFecha);
     $('#dtFechaBaja').val(strFecha);
     $('#dFechaBaja').data('datetimepicker').disable();

//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmEmpleados');    
     $('#txtBusqueda').focus();
     paginacion();
     cmbPuestoID_set();
  });
</script> 