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
 
$sql="SELECT * from puestos where estatus_id = 1 order by descripcion";
$result = $conexion->query($sql); //usamos la conexion para dar un resultado a la variable
 
if ($result->num_rows > 0) //si la variable tiene al menos 1 fila entonces seguimos con el codigo
{
    $combobit="";
    while ($row = $result->fetch_array(MYSQLI_ASSOC)) 
    {
        $combobit .=" <option value='".$row['puesto_id']."'>".$row['descripcion']."</option>"; //concatenamos el los options para luego ser insertado en el HTML
    }
}

$conexion->close(); //cerramos la conexi¨®n
?> 

<form id="frmSearch" action="#" method="post" onsubmit="return(false)">
      <div style="display:inline-block;">
        <label for="txtBusqueda"><h5>Descripcion</h5></label>
        <div class="input-append">
            <input id ="txtBusqueda" name="strBusqueda" value="" type="text" placeholder="Ingresa Descripcion" tabindex="-4">
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

<table class="table table-stripped" id="dgTurnos">
    <thead>
        <tr>
          <th >Puesto</th>
          <th >Descripcion</th>
          <th width="40px">Estado</th>
		      <th width="20px"></th>
          <th width="20px"></th>
          <th width="20px"></th>
        </tr>
    </thead>
    <tbody>
    </tbody>
        <script id="plantilla_turnos" type="text/template">
          {{#rows}}
          <tr><td>{{puesto}}</td>
              <td>{{descripcion}}</td>
              <td>{{estatus}}</td>
              <td><a onclick="fnCambiarEstado({{turno_id}},{{estatus_id}})" class="btn btn-mini" title="Cambiar de Estado"><i class="icon icon-eye-open"></i></a></td>
              <td><a onclick="fnEditar({{turno_id}})" class="btn btn-mini"><i class="icon icon-pencil" title="Editar"></i></a></td>
              <td><a onclick="fnEliminar({{turno_id}})" class="btn btn-mini"><i class="icon icon-trash" title="Eliminar"></i></a></td>
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
    <h3 id="myModalLabel">Turno</h3>
  </div>
  <div class="modal-body">
      <form name="frmTurnos" id="frmTurnos" action="#" method="post" onsubmit="return(false)" autocomplete="off">
          <input id="txtTurnoID" type="hidden" value="">
          <label for="txtDescripcion">Descripcion</label>
          <input class="span6" id="txtDescripcion" type="text" placeholder="Ingresa Descripcion" tabindex="2">
          <label for="cmbPuesto">Puesto</label>
          <div class="input">
            <select name="cmbPuesto" id="cmbPuesto" class="span3" tabindex="3">
              <?php echo $combobit; ?>
            </select>
          </div>
          <label for="cmbEstado">Estado</label>
          <div class="input">
            <select id="cmbEstatus" class="span3" tabindex="4" >
              <option value="1">Activo</option>
              <option value="2">Baja</option>
            </select>
          </div>
    </form>
  </div>
  <div class="modal-footer">
    <button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="5">Cancelar</button>
    <button class="btn btn-primary" tabindex="6" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>
    <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtTurnoID','turnos');"><i class="icon-calendar"></i> Historial</button>
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
      
    $.post('catalogos/turnos/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgTurnos tbody').empty();
                    var temp = Mustache.render($('#plantilla_turnos').html(),data);
                    $('#dgTurnos tbody').html(temp);
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
    $('#frmTurnos')[0].reset();
    $('#txtTurnoID').val('');
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','catalogos/turnos/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','catalogos/turnos');        
  }
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('catalogos/turnos/guardar',
                  { intTurnoID: $('#txtTurnoID').val(), 
                    strDescripcion: $('#txtDescripcion').val(),
                    intPuestoID: $('#cmbPuesto').val(),
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
      $.post('catalogos/turnos/cambiar_estado',
                  { intTurnoID: id,
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
    $.post('catalogos/turnos/editar',
                  { intTurnoID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
                      $('#txtTurnoID').val(data.row.turno_id);
                      $('#txtDescripcion').val(data.row.descripcion);
                      $('#cmbPuesto').val(data.row.puesto_id.toString());
                      $('#cmbEstatus').val(data.row.estatus_id.toString());
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }
  function fnEliminar(id){
    if(confirm("Esta seguro que desea eliminar el registro ?"))
        $.post('catalogos/turnos/eliminar',
                    { intTurnoID:id
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
     fnGeneralForm('#frmTurnos');    
     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 

