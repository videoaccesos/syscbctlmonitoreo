  <form id="frmSearch" action="#" method="post" onsubmit="return(false)">
      <div style="display:inline-block;">
            <label for="txtBusqueda"><h5>Descripción de Meta</h5></label>
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

  <table class="table table-stripped" id="dgTiposmetas">
    <thead align="center">
      <tr>
       <th>Descripcion</th>
       <th style="text-align: center">Tipo de Meta</th>
       <th style="text-align: center" width="20px">Estado</th>
       <th style="text-align: center" width="15px">A/B</th>
       <th style="text-align: center" width="15px">Editar</th>
       <th style="text-align: center" width="15px">Eliminar</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
        <script id="plantilla_tiposmetas" type="text/template">
          {{#rows}}
          <tr>
        <td>{{meta}}</td>
        <td style="text-align: center">{{tipo}}</td>
        <td style="text-align: center">{{estatus}}</td>
        <td style="text-align: center"><a onclick="fnCambiarEstado({{meta_id}},{{estatus_id}})" class="btn btn-mini"><i class="icon icon-eye-open"></i></a></td>
        <td style="text-align: center"><a onclick="fnEditar({{meta_id}})" class="btn btn-mini"><i class="icon icon-pencil"></i></a></td>
                <td style="text-align: center"><a onclick="fnEliminar({{meta_id}})" class="btn btn-mini"><i class="icon icon-trash"></i></a></td>
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
      <h3 id="myModalLabel">Registro de Tipos de Metas</h3>
    </div>
    <div class="modal-body">
      <form name="frmTiposmetas" id="frmTiposmetas" action="#" method="post" onsubmit="return(false)" autocomplete="off">
        <input id="txtMetaID" type="hidden" value="">
        <label for="txtMeta"><h5>Meta</h5></label>
        <input class="span3" id="txtMeta" type="text" placeholder="Descripción de Meta" tabindex="2">
        <div>        <div style="display:inline-block;">
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
      
    $.post('catalogos/tiposmetas/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgTiposmetas tbody').empty();
                    var temp = Mustache.render($('#plantilla_tiposmetas').html(),data);
                    $('#dgTiposmetas tbody').html(temp);
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
    $('#frmTiposmetas')[0].reset();
    $('#txtMetaID').val('');
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','catalogos/tiposmetas/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','catalogos/tiposmetas');        
  }
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('catalogos/tiposmetas/guardar',
                  { intMetaID: $('#txtMetaID').val(), 
                    strMeta: $('#txtMeta').val(),
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
      $.post('catalogos/tiposmetas/cambiar_estado',
                  { intMetaID: id,
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
    $.post('catalogos/tiposmetas/editar',
                  { intMetaID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
                      $('#txtMetaID').val(data.row.meta_id);
                      $('#txtMeta').val(data.row.meta);
                      $('#cmbEstatusID').val(data.row.estatus_id.toString());
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
   function fnEliminar(id){
    $.post('catalogos/tiposmetas/eliminar',
                  { intMetaID: id
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
       $('#txtMeta').focus();
     });

     $('#myModal').on('hidden', function () {
        fnNuevo();
        $('#txtBusqueda').focus();
     });

     $("#btnGuardar").click(fnGuardar);


//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmTiposmetas');    
     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 

               