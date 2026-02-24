  <?php
$server     = 'localhost'; //servidor
$username   = 'videoacc_root'; //usuario de la base de datos
$password   = 'a1b2c3d4'; //password del usuario de la base de datos
$database   = 'videoacc_video_accesos'; //nombre de la base de datos
 
$conexion = @new mysqli($server, $username, $password, $database);
 
if ($conexion->connect_error) //verificamos si hubo un error al conectar, recuerden que pusimos el @ para evitarlo
{
    die('Error de conexión: ' . $conexion->connect_error); //si hay un error termina la aplicación y mostramos el error
}
 
$sql="SELECT * from tipos_gastos where estatus_id = 1 order by gasto";
$result = $conexion->query($sql); //usamos la conexion para dar un resultado a la variable
 
if ($result->num_rows > 0) //si la variable tiene al menos 1 fila entonces seguimos con el codigo
{
    $combobit="";
    while ($row = $result->fetch_array(MYSQLI_ASSOC)) 
    {
        $combobit .=" <option value='".$row['gasto_id']."'>".$row['gasto']."</option>"; //concatenamos el los options para luego ser insertado en el HTML
    }
}

$sql2="SELECT * from privadas order by descripcion";
$result2 = $conexion->query($sql2); //usamos la conexion para dar un resultado a la variable
 
if ($result2->num_rows > 0) //si la variable tiene al menos 1 fila entonces seguimos con el codigo
{
    $combobit2="";
    while ($row2 = $result2->fetch_array(MYSQLI_ASSOC)) 
    {
        $combobit2 .=" <option value='".$row2['privada_id']."'>".$row2['descripcion']."</option>"; //concatenamos el los options para luego ser insertado en el HTML
    }
}


$conexion->close(); //cerramos la conexión
?>  
	
	<table class="table table-stripped" id="dgGastos">
		<thead>
			<tr>
			 <th>Tipo Gasto</th>
       <th>Privada</th>
			 <th>Descripcion</th>
       <th>Total</th>
       <th>Tipo Pago</th>
       <th>Fecha/Hora</th>
       <th>Usuario</th>
<th style="text-align: center">Autorizar</th>
			 <!--<th>Editar</th>-->
			</tr>
		</thead>
		<tbody>
		</tbody>
        <script id="plantilla_gastos" type="text/template">
          {{#rows}}
          <tr><td>{{gasto}}</td>
          <td>{{privada}}</td>
				<td>{{descripcion_gasto}}</td>
        <td>{{total}}</td>
        <td>{{tipopago}}</td>
        <td>{{fecha}}</td>
        <td>{{usuario}}</td>
<td style="text-align: center"><a onclick="fnAutorizar({{gasto_id}})" class="btn btn-mini"><i class="icon icon-ok" title="Autorizar"></i></a></td>
				<!--<td><a onclick="fnEditar({{gasto_id}})" class="btn btn-mini"><i class="icon icon-pencil"></i></a></td>-->
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
      <div style="float:right;margin-right:10px;"><strong id="numElementos">0</strong> Encontrados</div>
      <br>
   </div>


     <!-- Modal -->
	<div id="myModal" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="1">×</button>
			<h3 id="myModalLabel">Gasto</h3>
		</div>
		<div class="modal-body">
			<form name="frmGastos" id="frmGastos" action="#" method="post" onsubmit="return(false)" autocomplete="off">
				<input id="txtGastoID" type="hidden" value="">
        <div>
        <div style="display:inline-block;">
          <label for="cmbTipoGasto"><h5>Tipo de Gasto</h5></label>
          <select name="cmbTipoGastoID" id="cmbTipoGastoID" class="span3" tabindex="3">
            <?php echo $combobit; ?>
          </select>
        </div>
        <div style="display:inline-block;">
          <label for="cmbPrivadaID"><h5>Privada</h5></label>
          <select name="cmbPrivadaID" id="cmbPrivadaID" class="span3" tabindex="4">
            <?php echo $combobit2; ?>
          </select>
        </div>
        </div>
				<label for="txtDescripcion"><h5>Descripcion</h5></label>
				<input class="span6" id="txtDescripcion" type="text" placeholder="Ingrese Descirpcion" tabindex="5">
        <div>
        <div style="display:inline-block;">
          <label for="txtComprobante"><h5>Comprobante</h5></label>
        <input class="span3" id="txtComprobante" type="text" placeholder="Ingrese Comprobante" tabindex="6">
        </div>
        <div style="display:inline-block;">
          <label for="txtTotal"><h5>Total</h5></label>
          <div class="input-prepend">
             <span class="add-on">$</span>
             <input style="width:80px;text-align:right;" id="txtTotal" type="text" value="0.00" onblur="fnFormato(this,2);" tabindex="7">
          </div>
        </div>
        <div style="display:inline-block;">
            <label for="cmbTipoPagoID"><h5>Tipo de Pago</h5></label>
              <select class="span2" id="cmbTipoPagoID" name="cmbTipoPagoID" tabindex="8">
                <option value='1'>Efectivo</option>
                <option value='2'>Bancos</option>
              </select>
          </div>
        </div>
			</form>
		</div>
		<div class="modal-footer">
			<button class="btn" data-dismiss="modal" aria-hidden="true" tabindex="5">Cancelar</button>
      <button class="btn btn-primary" tabindex="7" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>
      <button class="btn" tabindex="-1" style="float:left;" onclick="fnShowBitacora('#txtGastoID','gastos');"><i class="icon-calendar"></i> Historial</button>
		</div>
	</div>

<script type="text/javascript">
  var pagina = 0;
  var strUltimaBusqueda= "";
//---------- Funciones para la Busqueda

  function paginacionNoAutorizados(){
    if($('#txtBusqueda').val() != strUltimaBusqueda){
      pagina = 0;
      strUltimaBusqueda = $('#txtBusqueda').val();
    }
      
    $.post('procesos/gastos/paginacionNoAutorizados',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgGastos tbody').empty();
                    var temp = Mustache.render($('#plantilla_gastos').html(),data);
                    $('#dgGastos tbody').html(temp);
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
    $('#frmGastos')[0].reset();
    $('#txtGastoID').val('');
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','procesos/gastos/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','procesos/gastos');        
  }
  function fnValidar(){
    return true;
  }
  function fnGuardar(){
    if(fnValidar()) {
      $.post('procesos/gastos/guardar',
                  { intGastoID: $('#txtGastoID').val(),
                    intTipoGastoID: $('#cmbTipoGastoID').val(),
                    intPrivadaID: $('#cmbPrivadaID').val(),  
                    strDescripcion: $('#txtDescripcion').val(),
                    strComprobante: $('#txtComprobante').val(),                    
                    dblTotal: $('#txtTotal').val(),
                    intTipoPagoID: $('#cmbTipoPagoID').val()
                  },
                  function(data) {
                    if(data.resultado){
                      fnNuevo();
                      paginacionNoAutorizados();
                      $('#myModal').modal('hide');
                    }
                    $('#divMensajes').html(data.mensajes);
                  }
                 ,
          'json');
    }
  }

  function fnAutorizar(id){
    if(confirm("Esta seguro que desea autorizar el gasto?"))
        $.post('procesos/gastosAutorizar/autorizar',
                    { intGastoID:id
                    },
                    function(data) {
                      $('#divMensajes').html(data.mensajes);
                      if(data.resultado){
                        paginacionNoAutorizados();
                      }
                    }
                   ,
            'json');
  }

  function fnEditar(id){
    $.post('procesos/gastos/editar',
                  { intGastoID:id
                  },
                  function(data) {
                    $('#divMensajes').html(data.mensajes);
                    if(data.row){
                      $('#txtGastoID').val(data.row.gasto_id);
                      $('#cmbTipoGastoID').val(data.row.tipo_gasto);
                      $('#cmbPrivadaID').val(data.row.privada_id);                      
                      $('#txtDescripcion').val(data.row.descripcion_gasto);
                      $('#txtComprobante').val(data.row.comprobante);                      
                      $('#txtTotal').val(data.row.total);
                      fnFormato($('#txtTotal')[0],2);
                      $('#cmbTipoPagoID').val(data.row.tipo_pago);                      
                      $('#myModal').modal('show');
                    }
                  }
                 ,
          'json');
  }

  $( document ).ready(function() {
   
//---- Script para la Busqueda
     $("#btnBuscar").click(function(event){
        event.preventDefault();
        paginacionNoAutorizados();
      });

     $('#pagLinks').on('click','a',function(event){
        event.preventDefault();
        pagina = $(this).attr('href').replace('/','');
        paginacionNoAutorizados();
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
     fnGeneralForm('#frmGastos');    
     $('#txtBusqueda').focus();
     paginacionNoAutorizados();
  });
</script> 

               