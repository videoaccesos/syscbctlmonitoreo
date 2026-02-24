  <?php
$server     = 'localhost'; //servidor
$username   = 'videoacc_root'; //usuario de la base de datos
$password   = 'a1b2c3d4'; //password del usuario de la base de datos
$database   = 'videoacc_video_accesos'; //nombre de la base de datos
 
$conexion = @new mysqli($server, $username, $password, $database);
 
if ($conexion->connect_error) //verificamos si hubo un error al conectar, recuerden que pusimos el @ para evitarlo
{
    die('Error de conexi¨®n: ' . $conexion->connect_error); //si hay un error termina la aplicaci¨®n y mostramos el error
}
 
$sql="SELECT * from tipos_metas where estatus_id = 1 order by meta";
$result = $conexion->query($sql); //usamos la conexion para dar un resultado a la variable
 
if ($result->num_rows > 0) //si la variable tiene al menos 1 fila entonces seguimos con el codigo
{
    $combobit="";
    while ($row = $result->fetch_array(MYSQLI_ASSOC)) 
    {
        $combobit .=" <option value='".$row['meta_id']."'>".$row['meta']."</option>"; //concatenamos el los options para luego ser insertado en el HTML
    }
}


$conexion->close(); //cerramos la conexi¨®n
?>  
<form id="frmSearch" action="#" method="post" onsubmit="return(false)">
      <div style="display:inline-block;">
        <label for="txtBusqueda"><h5>Mes</h5></label>
        <div class="input-append">
            <input id ="txtBusqueda" name="strBusqueda" value="" type="text" placeholder="Ingresa Mes" tabindex="-4">
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

<table class="table table-stripped" id="dgMetas">
    <thead>
        <tr>
          <th style="text-align: center">Mes</th>
          <th style="text-align: center">A&ntilde;o</th>
          <th style="text-align: center">Meta</th>
          <th style="text-align: center">Tipo Meta</th>
          <th style="text-align: center">Usuario</th>
          <th style="text-align: center" width="40px">Estado</th>
		      <!--<th width="20px"></th>-->
          <th style="text-align: center" width="20px"></th>
          <th style="text-align: center" width="20px"></th>
        </tr>
    </thead>
    <tbody>
    </tbody>
        <script id="plantilla_metas" type="text/template">
          {{#rows}}
          <tr><td style="text-align: center">{{mes}}</td>
              <td style="text-align: center">{{ano}}</td>
              <td style="text-align: center">${{meta}}</td>
              <td style="text-align: center">{{tipo_meta}}</td>
              <td style="text-align: center">{{usuario}}</td>
              <td style="text-align: center">{{estatus}}</td>
              <!--<td><a onclick="fnCambiarEstado({{meta_id}},{{estatus_id}})" class="btn btn-mini" title="Cambiar de Estado"><i class="icon icon-eye-open"></i></a></td>-->
              <td style="text-align: center"><a onclick="fnEditar({{meta_id}})" class="btn btn-mini"><i class="icon icon-pencil" title="Editar"></i></a></td>
              <td style="text-align: center"><a onclick="fnEliminar({{meta_id}})" class="btn btn-mini"><i class="icon icon-trash" title="Eliminar"></i></a></td>
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
    <button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="1">X</button>
    <h3 id="myModalLabel">Meta</h3>
  </div>
  <div class="modal-body">
      <form name="frmMetas" id="frmMetas" action="#" method="post" onsubmit="return(false)" autocomplete="off">
          <input id="txtMetaID" type="hidden" value="">
          <label for="cmbMeses">Mes</label>
          <div class="input">
            <select id="cmbMeses" class="span3" tabindex="4" >
              <option value="1">Enero</option>
              <option value="2">Febrero</option>
              <option value="3">Marzo</option>
              <option value="4">Abril</option>
              <option value="5">Mayo</option>
              <option value="6">Junio</option>
              <option value="7">Julio</option>
              <option value="8">Agosto</option>
              <option value="9">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
          </div>
          <label for="cmbAnos">A&ntilde;o</label>
          <div class="input">
            <select id="cmbAnos" class="span3" tabindex="4" >
              <option value="2017">2017</option>
              <option value="2018">2018</option>
              <option value="2019">2019</option>
              <option value="2020">2020</option>
            </select>
          </div>
          <div style="display:inline-block;">
            <label for="txtMeta"><h5>Meta</h5></label>
            <div class="input-prepend">
               <span class="add-on">$</span>
               <input style="width:80px;text-align:right;" id="txtMeta" type="text" value="0.00" onblur="fnFormato(this,2);" tabindex="5">
            </div>
          </div>
          <div style="display:inline-block;">
          <label for="cmbTipoMetaID"><h5>Tipo de Meta</h5></label>
          <select name="cmbTipoMetaID" id="cmbTipoMetaID" class="span3" tabindex="3">
            <?php echo $combobit; ?>
          </select>
        </div>
          <label for="cmbEstado">Estado</label>
          <div class="input">
            <select id="cmbEstatus" class="span3" tabindex="6" >
              <option value="1">Activo</option>
              <option value="2">Baja</option>
            </select>
          </div>
    </form>
  </div>
  <div class="modal-footer">
    <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="7">Cancelar</button>
    <button class="btn btn-primary" tabindex="8" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>
    <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtMetaID','metas');"><i class="icon-calendar"></i> Historial</button>
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
      
    $.post('catalogos/metas/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgMetas tbody').empty();
                    var temp = Mustache.render($('#plantilla_metas').html(),data);
                    $('#dgMetas tbody').html(temp);
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
    $('#frmMetas')[0].reset();
    $('#txtMetaID').val('');
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','catalogos/metas/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','catalogos/metas');        
  }
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('catalogos/metas/guardar',
                  { intMetaID: $('#txtMetaID').val(), 
                    intMesID: $('#cmbMeses').val(),
                    intAnoID: $('#cmbAnos').val(),
                    dblMeta: $('#txtMeta').val(),
                    intTipoMetaID: $('#cmbTipoMetaID').val(),
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
      $.post('catalogos/metas/cambiar_estado',
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
    $.post('catalogos/metas/editar',
                  { intMetaID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
                      $('#txtMetaID').val(data.row.meta_id);
                      $('#cmbMeses').val(data.row.mes.toString());
                      $('#cmbAnos').val(data.row.ano.toString());
                      $('#txtMeta').val(data.row.meta);
                      $('#cmbTipoMetaID').val(data.row.tipo_meta_id.toString());
                      $('#cmbEstatus').val(data.row.estatus_id.toString());
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
  function fnEliminar(id){
    if(confirm("Esta seguro que desea eliminar el registro ?"))
        $.post('catalogos/metas/eliminar',
                    { intMetaID:id
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
       $('#cmbMeses').focus();
     });

     $('#myModal').on('hidden', function () {
        fnNuevo();
        $('#txtBusqueda').focus();
     });

     $("#btnGuardar").click(fnGuardar);


//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmMetas');    
     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 

