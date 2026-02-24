  <form id="frmSearch" action="#" method="post" onsubmit="return(false)">
      <div style="display:inline-block;">
            <label for="txtBusqueda"><h5>Descripción de Gasto</h5></label>
            <div class="input-append">
                <input id ="txtBusqueda" name="strBusqueda" value="" type="text" placeholder="Teclea la descripción" tabindex="-4">
                <div class="btn-group" >
                  <button class="btn dropdown-toggle" onclick="paginacion();" tabindex="-3">
                    <i class="icon-search"></i>
                  </button>
                </div>
            </div>
          </div>
                                                        
          <div class="btn-group" style="display:inline-block;float:right;padding-top:40px;">
      <!-- Button to trigger modal -->
      <a href="#myModal" role="button" class="btn btn-primary" data-toggle="modal"><i class="icon-plus icon-white"></i> Nuevo</a>   
          </div>    
    </form>

  <table class="table table-stripped" id="dgTiposgastos">
    <thead align="center">
      <tr>
       <th>Descripcion</th>
       <th style="text-align: center">Tipo de Gasto</th>
       <th style="text-align: center">Día de Pago</th>
       <th style="text-align: center" width="20px">Estado</th>
       <th style="text-align: center" width="15px">A/B</th>
       <th style="text-align: center" width="15px">Editar</th>
       <th style="text-align: center" width="15px">Eliminar</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
        <script id="plantilla_tiposgastos" type="text/template">
          {{#rows}}
          <tr>
        <td>{{gasto}}</td>
        <td style="text-align: center">{{tipo}}</td>
        <td style="text-align: center">{{dia_pago}}</td>
        <td style="text-align: center">{{estatus}}</td>
        <td style="text-align: center"><a onclick="fnCambiarEstado({{gasto_id}},{{estatus_id}})" class="btn btn-mini"><i class="icon icon-eye-open"></i></a></td>
        <td style="text-align: center"><a onclick="fnEditar({{gasto_id}})" class="btn btn-mini"><i class="icon icon-pencil"></i></a></td>
                <td style="text-align: center"><a onclick="fnEliminar({{gasto_id}})" class="btn btn-mini"><i class="icon icon-trash"></i></a></td>
            </tr>
          {{/rows}}
          {{^rows}}
          <tr> 
            <td colspan="7"> ¡No se encontraron resultados!</td>
          </tr> 
          {{/rows}}
        </script>
  </table>

    <div style="dysplay: inline-block;">
      <div id="pagLinks"  style="float:left;margin-right:10px;"></div>
      <div style="float:right;margin-right:10px;"><strong id="numElementos">0</strong> Encontrados</div>
      <br>
   </div>


     <!-- Modal -->
  <div id="myModal" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="1">×</button>
      <h3 id="myModalLabel">Registro de Tipos de Gastos</h3>
    </div>
    <div class="modal-body">
      <form name="frmTiposgastos" id="frmTiposgastos" action="#" method="post" onsubmit="return(false)" autocomplete="off">
        <input id="txtGastoID" type="hidden" value="">
        <label for="txtGasto"><h5>Gasto</h5></label>
        <input class="span3" id="txtGasto" type="text" placeholder="Descripción de Gasto" tabindex="2">
        <div>
        <div style="display:inline-block;">
          <label for="cmbTipoGastoID"><h5>Tipo Gasto</h5></label>
          <select id="cmbTipoGastoID" class="span2" tabindex="3" >
            <option value="1">Fijo</option>
            <option value="2">Variable</option>
          </select>
        </div>
        <div style="display:inline-block;">
          <label for="txtDiaPago"><h5>Día de Pago</h5></label>
        <input class="span2" id="txtDiaPago" type="text" placeholder="Día de pago" tabindex="4">
        </div>
        <div style="display:inline-block;">
          <label for="cmbEstatusID"><h5>Estatus</h5></label>
          <select id="cmbEstatusID" class="span2" tabindex="5" >
            <option value="1">Activo</option>
            <option value="2">Inactivo</option>
          </select>
        </div>
        </div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="4">Cancelar</button>
      <button class="btn btn-primary" tabindex="5" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>
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
      
    $.post('catalogos/tiposgastos/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgTiposgastos tbody').empty();
                    var temp = Mustache.render($('#plantilla_tiposgastos').html(),data);
                    $('#dgTiposgastos tbody').html(temp);
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
    $('#frmTiposgastos')[0].reset();
    $('#txtGastoID').val('');
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','catalogos/tiposgastos/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','catalogos/tiposgastos');        
  }
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('catalogos/tiposgastos/guardar',
                  { intGastoID: $('#txtGastoID').val(), 
                    strGasto: $('#txtGasto').val(),
                    intTipoGastoID: $('#cmbTipoGastoID').val(),
                    strDiaPago: $('#txtDiaPago').val(),
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
      $.post('catalogos/tiposgastos/cambiar_estado',
                  { intGastoID: id,
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
    $.post('catalogos/tiposgastos/editar',
                  { intGastoID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
                      $('#txtGastoID').val(data.row.gasto_id);
                      $('#txtGasto').val(data.row.gasto);
                      $('#cmbTipoGastoID').val(data.row.tipo_gasto.toString());
                      $('#txtDiaPago').val(data.row.dia_pago);
                      $('#cmbEstatusID').val(data.row.estatus_id.toString());
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
   function fnEliminar(id){
    $.post('catalogos/tiposgastos/eliminar',
                  { intGastoID: id
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
       $('#txtGasto').focus();
     });

     $('#myModal').on('hidden', function () {
        fnNuevo();
        $('#txtBusqueda').focus();
     });

     $("#btnGuardar").click(fnGuardar);


//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmTiposgastos');    
     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 

               