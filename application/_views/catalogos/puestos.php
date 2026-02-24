
<form id="frmSearch" action="#" method="post" onsubmit="return(false)">
      <div style="display:inline-block;">
        <label for="txtBusqueda"><h5>Descripcion</h5></label>
        <div class="input-append">
            <input id ="txtBusqueda" name="strBusqueda" value="" type="text" placeholder="Ingresa Descripción" tabindex="-4">
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
        <button class="btn btn-inverse">
          <i class="icon-print icon-white"></i> Imprimir
        </button> 
      </div>    
</form>

<table class="table table-stripped" id="dgPuestos">
    <thead>
        <tr>
          <th >Descripcion</th>
          <th width="40px">Estado</th>
		      <th width="20px"></th>
          <th width="20px"></th>
          <th width="20px"></th>
        </tr>
    </thead>
    <tbody>
    </tbody>
        <script id="plantilla_puestos" type="text/template">
          {{#rows}}
          <tr><td>{{descripcion}}</td>
              <td>{{estatus}}</td>
              <td><a onclick="fnCambiarEstado({{puesto_id}},{{estatus_id}})" class="btn btn-mini" title="Cambiar de Estado"><i class="icon icon-eye-open"></i></a></td>
              <td><a onclick="fnEditar({{puesto_id}})" class="btn btn-mini"><i class="icon icon-pencil" title="Editar"></i></a></td>
              <td><a onclick="fnEliminar({{puesto_id}})" class="btn btn-mini"><i class="icon icon-trash" title="Eliminar"></i></a></td>
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
<div id="myModal" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
  <div class="modal-header">
    <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="1">×</button>
    <h3 id="myModalLabel">Puesto</h3>
  </div>
  <div class="modal-body">
      <form name="frmPuestos" id="frmPuestos" action="#" method="post" onsubmit="return(false)" autocomplete="off">
          <input id="txtPuestoID" type="hidden" value="">
          <label for="txtDescripcion">Descripción</label>
          <input class="span6" id="txtDescripcion" type="text" placeholder="Ingresa Descripción" tabindex="2">
          <label for="cmbEstado">Estado</label>
          <div class="input">
            <select id="cmbEstatus" class="span3" tabindex="3" >
              <option value="1">Activo</option>
              <option value="2">Baja</option>
            </select>
          </div>
    </form>
  </div>
  <div class="modal-footer">
    <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="5">Cancelar</button>
    <button class="btn btn-primary" tabindex="6" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>
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
      
    $.post('catalogos/puestos/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgPuestos tbody').empty();
                    var temp = Mustache.render($('#plantilla_puestos').html(),data);
                    $('#dgPuestos tbody').html(temp);
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
    $('#frmPuestos')[0].reset();
    $('#txtPuestoID').val('');
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','catalogos/puestos/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','catalogos/puestos');        
  }
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('catalogos/puestos/guardar',
                  { intPuestoID: $('#txtPuestoID').val(), 
                    strDescripcion: $('#txtDescripcion').val(),
                    intEstatusID: $('#cmbEstatus').val()
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
      $.post('catalogos/puestos/cambiar_estado',
                  { intPuestoID: id,
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
    $.post('catalogos/puestos/editar',
                  { intPuestoID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
                      $('#txtPuestoID').val(data.row.puesto_id);
                      $('#txtDescripcion').val(data.row.descripcion);
                      $('#cmbEstatus').val(data.row.estatus_id.toString());
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
  function fnEliminar(id){
    if(confirm("Esta seguro que desea eliminar el registro ?"))
        $.post('catalogos/puestos/eliminar',
                    { intPuestoID:id
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
       $('#txtDescripcion').focus();
     });

     $('#myModal').on('hidden', function () {
        fnNuevo();
        $('#txtBusqueda').focus();
     });

     $("#btnGuardar").click(fnGuardar);


//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmPuestos');    
     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 

