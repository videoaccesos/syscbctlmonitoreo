	<form id="frmSearch" action="#" method="post" onsubmit="return(false)">
			<div style="display:inline-block;">
	          <label for="txtBusqueda"><h5>Descripcion</h5></label>
	          <div class="input-append">
	              <input id ="txtBusqueda" name="strBusqueda" value="" type="text" placeholder="Teclea Nombre" tabindex="-4">
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

	<table class="table table-stripped" id="dgMateriales">
		<thead>
			<tr>
			 <th width="50px">Codigo</th>
			 <th>Descripción</th>
       <th width="40px">Costo</th>
			 <th width="40px">Estado</th>
			 <th width="20px">A/B</th>
			 <th width="20px">Editar</th>
			 <th width="20px">Eliminar</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
        <script id="plantilla_materiales" type="text/template">
          {{#rows}}
          <tr><td>{{codigo}}</td>
				<td>{{descripcion}}</td>
				<td>{{costo}}</td>
        <td>{{estatus}}</td>
				<td><a onclick="fnCambiarEstado({{material_id}},{{estatus_id}})" class="btn btn-mini"><i class="icon icon-eye-open"></i></a></td>
				<td><a onclick="fnEditar({{material_id}})" class="btn btn-mini"><i class="icon icon-pencil"></i></a></td>
                <td><a onclick="fnEliminar({{material_id}})" class="btn btn-mini"><i class="icon icon-trash"></i></a></td>
            </tr>
          {{/rows}}
          {{^rows}}
          <tr> 
            <td colspan="7"> No se Encontraron Resultados!!</td>
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
			<h3 id="myModalLabel">Material</h3>
		</div>
		<div class="modal-body">
			<form name="frmMateriales" id="frmMateriales" action="#" method="post" onsubmit="return(false)" autocomplete="off">
				<input id="txtMaterialID" type="hidden" value="">
				<label for="txtCodigo"><h5>Codigo</h5></label>
				<input style="width:105px;" id="txtCodigo" type="text" placeholder="Ingresa Codigo" tabindex="2">
				<label for="txtDescripcion"><h5>Descripción</h5></label>
				<input class="span6" id="txtDescripcion" type="text" placeholder="Ingrese Descirpción" tabindex="3">
        <div>
        <div style="display:inline-block; padding-right:115px;">
          <label for="txtCosto"><h5>Costo</h5></label>
          <div class="input-prepend">
             <span class="add-on">$</span>
             <input style="width:80px;text-align:right;" id="txtCosto" type="text" value="0.00" onblur="fnFormato(this,2);" tabindex="4">
          </div>
        </div>
        <div style="display:inline-block;">
  				<label for="cmbEstatusID"><h5>Estado</h5></label>
  				<select id="cmbEstatusID" class="span3" tabindex="5" >
  					<option value="1">Activo</option>
  					<option value="2">Inactivo</option>
  				</select>
        </div>
        </div>
			</form>
		</div>
		<div class="modal-footer">
			<button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="7">Cancelar</button>
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
      
    $.post('catalogos/materiales/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgMateriales tbody').empty();
                    var temp = Mustache.render($('#plantilla_materiales').html(),data);
                    $('#dgMateriales tbody').html(temp);
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
    $('#frmMateriales')[0].reset();
    $('#txtMaterialID').val('');
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','catalogos/materiales/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','catalogos/materiales');        
  }
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('catalogos/materiales/guardar',
                  { intMaterialID: $('#txtMaterialID').val(), 
                  	strCodigo: $('#txtCodigo').val(),
                    strDescripcion: $('#txtDescripcion').val(),
                    dblCosto: $('#txtCosto').val(),
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
      $.post('catalogos/materiales/cambiar_estado',
                  { intMaterialID: id,
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
    $.post('catalogos/materiales/editar',
                  { intMaterialID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
                      $('#txtMaterialID').val(data.row.material_id);
                      $('#txtCodigo').val(data.row.codigo);
                      $('#txtDescripcion').val(data.row.descripcion);
                      $('#txtCosto').val(data.row.costo);
                      $('#cmbEstatusID').val(data.row.estatus_id.toString());
                      fnFormato($('#txtCosto')[0],2);
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
   function fnEliminar(id){
    $.post('catalogos/materiales/eliminar',
                  { intMaterialID: id
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
       $('#txtCodigo').focus();
     });

     $('#myModal').on('hidden', function () {
        fnNuevo();
        $('#txtBusqueda').focus();
     });

     $("#btnGuardar").click(fnGuardar);


//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmMateriales');    
     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 

               