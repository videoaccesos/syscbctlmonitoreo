<?php

require('../imprimirContrato/php/conexion.php');

$rs = mysql_query("SELECT MAX(folio_venta) AS id FROM ventas");
if ($row = mysql_fetch_row($rs)) {
$id = trim($row[0]+1);
}

$tasaFinanciamiento= 0;
$enganche= 0;
$plazoMaximo= 0;

$query= mysql_query("SELECT tasa_financiamiento,enganche,plazo_maximo FROM configuracion");          //query 

while($registro= mysql_fetch_array($query)){
$tasaFinanciamiento= $registro['tasa_financiamiento'];
$enganche= $registro['enganche'];
$plazoMaximo= $registro['plazo_maximo'];
}

?>

<form id="frmSearch" action="#" method="post" onsubmit="return(false)">
						<div style="display:inline-block;">
	          <label for="txtBusqueda"><h5>Folio</h5></label>
	          <div class="input-append">
	              <input id ="txtBusqueda" name="strBusqueda" value="" type="text" placeholder="Teclea el Folio" tabindex="-4">
	              <div class="btn-group" >
	                <button class="btn dropdown-toggle" onclick="paginacion();" tabindex="-3">
	                  <i class="icon-search"></i>
	                </button>
	              </div>
	          </div>
	        </div>
          <div class="btn-group" style="display:inline-block;float:right;padding-top:40px;">
			<!-- Button to trigger modal -->
			<a href="#myModal" role="button" class="btn btn-primary" data-toggle="modal"><i class="icon-plus icon-white"></i> Nueva Venta</a>		
          </div>    
    </form>
	<table class="table table-stripped" id="dgVentas">
		<thead>
			<tr>
        <th width="30px">Folio</th>
			 <th width="10px">Cve. Cliente</th>
       <th width="30px">Nombre</th>
       <th width="30px">Total</th>
       <th width="30px">Fecha</th>
			</tr>
		</thead>
		<tbody>
		</tbody>
        <script id="plantilla_ventas" type="text/template">
          {{#rows}}
          <tr><td>{{folio_venta}}</td>
          <td>{{cve_cliente}}</td>
				<td>{{nombre}}</td>
				<td>{{total}}</td>
        <td>{{fecha}}</td>
            </tr>
          {{/rows}}
          {{^rows}}
          <tr> 
            <td colspan="7">No se encontraron resultados</td>
          </tr> 
          {{/rows}}
        </script>
	</table>

    <div style="dysplay: inline-block;">
      <div id="pagLinks"  style="float:left;margin-right:10px;"></div>
      <div style="float:right;margin-right:10px;"><strong id="numElementos">0</strong> Ventas Activas</div>
      <br>
   </div>


     <!-- Modal -->
	<div id="myModal" class="modal hide fade" tabindex="0" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal" aria-hidden="true" tabindex="1">×</button>
			<h3 id="myModalLabel">Registro de Venta</h3>
		</div>
		<div class="modal-body">
			<form name="frmVentas" id="frmVentas" action="#" method="post" onsubmit="return(false)" autocomplete="off">
				<h5 style="text-align:right;"><?php echo "Folio de Venta: ".$id;?></h5>
<input id="txtFolio" type="hidden" value="">
<input id="estatus" type="hidden" value="1">
<input id="txtTasaFinanciamiento" type="hidden" value="<?php echo $tasaFinanciamiento;?>">
<input id="txtEnganche" type="hidden" value="<?php echo $enganche;?>">
<input id="txtPlazoMaximo" type="hidden" value="<?php echo $plazoMaximo;?>">
				<label for="txtCliente"><h5>Datos del Cliente</h5></label>
				<input class="span1" name= "txtCveCliente" id="txtCveCliente" type="text" value="" disabled> &nbsp;<input class="span3" id="txtCliente" type="text" onBlur="datosCliente();" placeholder="Teclee el Nombre" tabindex="2">&nbsp;&nbsp;&nbsp;<a>RFC: </a><input class="span2" name="txtRFC" id="txtRFC" type="text" value="" disabled> 
        
<br><br>
<table class="table table-stripped" id="dgNose2">
    <tr></tr>
<label for="txtArticulo"><h5>Artículo</h5></label>
        <input class="span4" id="txtArticulo" type="text" placeholder="Teclee el Artículo" tabindex="3">&nbsp;&nbsp;&nbsp;
                      
    <input type="button" onclick="addArticulo('dataArticulo');" id="add_articulo" role="button" class="btn btn-primary" data-toggle="modal" value="Agregar"/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;

    <input type="button" onclick="delete_row('dataArticulo');" id="delete_articulo" role="button" class="btn btn-primary" data-toggle="modal" value="Eliminar"/>
                     <TABLE id="dataArticulo" border="1" width="100%"  class="table table-striped table-bordered table-hover" name='articulo_table'>
                      <thead>
              <tr>
                  <th width="42%" id="thArticulo" class="warning"><span class="glyphicon glyphicon-play-circle"> Articulo</span></th>
<th width="10%" id="thModelo" class="warning"><span class="glyphicon glyphicon-play-circle"> Modelo</span></th>
<th width="5%" id="thCantidad" class="warning"><span class="glyphicon glyphicon-play-circle"> Cant</span></th>
<th width="18%" id="thPrecio" class="warning"><span class="glyphicon glyphicon-play-circle"> Precio</span></th>
<th width="18%" id="thImporte" class="warning"><span class="glyphicon glyphicon-play-circle"> Importe</span></th>
<th width="7%" id="thEliminar" class="warning" >Eliminar</th>
              </tr>

          </thead>
                    </TABLE>

<div class="modal-footer">
<a>SubTotal: </a><input type="text" id="subtotal" style="width:100px;" value="0" /><br>
<a>Enganche: </a><input type="text" id="enganche" style="width:100px;" value="0"/><br>
<a>Bonificaci&oacute;n Enganche: </a><input type="text" id="bonificacionEnganche" style="width:100px;" value="0"/><br>
<a>Total: </a><input type="text" id="total" style="width:100px;" value="0"/><br><br>

<button class="btn btn-primary" onclick="fnContinuar();">Continuar</button>

<TABLE id="tablaAbonos" style="display:none;" border="1" width="100%" class="table table-striped table-bordered table-hover" name='tablaAbonos'>
                      <thead>
              <tr>
                  <th align="center" id="abonosMensuales" class="warning"><span class="glyphicon glyphicon-play-circle">ABONOS MENSUALES</span></th>
              </tr>
<tr>
                  <td width="25%" id="tiempo3" class="warning"><span class="glyphicon glyphicon-play-circle">3 ABONOS DE: </span></td>
<td width="25%"  class="warning"><span class="glyphicon glyphicon-play-circle"><input disabled type="text" id="pagoMes3" style="width:80px;"></span></td>
<td width="25%"  class="warning"><span class="glyphicon glyphicon-play-circle">TOTAL PAGAR  <input disabled type="text" id="totalPagar3" style="width:80px;"> </span></td>
<td width="25%"  class="warning"><span class="glyphicon glyphicon-play-circle">SE AHORRA  <input disabled type="text" id="ahorro3" style="width:80px;"></span></td>
              </tr>
<tr>
                  <td width="25%" id="tiempo6" class="warning"><span class="glyphicon glyphicon-play-circle">6 ABONOS DE: </span></td>
<td width="25%"  class="warning"><span class="glyphicon glyphicon-play-circle"><input disabled type="text" id="pagoMes6" style="width:80px;"></span></td>
<td width="25%"  class="warning"><span class="glyphicon glyphicon-play-circle">TOTAL PAGAR <input disabled type="text" id="totalPagar6" style="width:80px;"> </span></td>
<td width="25%"  class="warning"><span class="glyphicon glyphicon-play-circle">SE AHORRA <input disabled type="text" id="ahorro6" style="width:80px;"></span></td>
              </tr>
<tr>
                  <td width="25%" id="tiempo6" class="warning"><span class="glyphicon glyphicon-play-circle">9 ABONOS DE: </span></td>
<td width="25%"  class="warning"><span class="glyphicon glyphicon-play-circle"><input disabled type="text" id="pagoMes9" style="width:80px;"></span></td>
<td width="25%"  class="warning"><span class="glyphicon glyphicon-play-circle">TOTAL PAGAR <input disabled type="text" id="totalPagar9" style="width:80px;"> </span></td>
<td width="25%"  class="warning"><span class="glyphicon glyphicon-play-circle">SE AHORRA <input disabled type="text" id="ahorro9" style="width:80px;"></span></td>
              </tr>
<tr>
                  <td width="25%" id="tiempo6" class="warning"><span class="glyphicon glyphicon-play-circle">12 ABONOS DE: </span></td>
<td width="25%"  class="warning"><span class="glyphicon glyphicon-play-circle"><input disabled type="text" id="pagoMes12" style="width:80px;"></span></td>
<td width="25%"  class="warning"><span class="glyphicon glyphicon-play-circle">TOTAL PAGAR <input disabled type="text" id="totalPagar12" style="width:80px;"> </span></td>
<td width="25%"  class="warning"><span class="glyphicon glyphicon-play-circle">SE AHORRA <input disabled type="text" id="ahorro12" style="width:80px;"></span></td>
              </tr>

          </thead>
                    </TABLE>
<br>
   <select style="color:#08088A; display:none;"  name="cmbOpcionPago" id="cmbOpcionPago">
<option value="0" >Seleccione un plazo...</option>
<option value="3" >3 MESES</option>
<option value="6" >6 MESES</option>
<option value="9" >9 MESES</option>
<option value="12" >12 MESES</option>
   </select>
<br>
      <button style="display:none;" id="btnGuardar" class="btn btn-primary" onclick="fnGuardar();"><i class="icon-hdd icon-white"></i> Guardar</button>
		</div>
    <tr></tr>
    </table>

			</form>

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
      
    $.post('catalogos/ventas/paginacion',
                 {strBusqueda:$('#txtBusqueda').val(), intPagina:pagina},
                  function(data) {
                    $('#dgVentas tbody').empty();
                    var temp = Mustache.render($('#plantilla_ventas').html(),data);
                    $('#dgVentas tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
  }


//--------- Funciones para el Modal

  function datosCliente() 
  {
    var nombreCliente= $("#txtCliente").val();
    //-----------------------------------------------------------------------
    // 2) Send a http request with AJAX http://api.jquery.com/jQuery.ajax/
    //-----------------------------------------------------------------------
    $.ajax({                           
      url: '../consultaAJAX.php',                  //the script to call to get data          
      data: "cliente="+nombreCliente,                        //you can insert url argumnets here to pass to api.php
                       type: "post",                //for example "id=5&parent=6"
      dataType: 'json',                //data format      
      success: function(data)          //on recieve of reply
      {
        var cveCliente = data[0];
        var rfc = data[1];                     
        //--------------------------------------------------------------------
        // 3) Update html content
        //--------------------------------------------------------------------
        $('#txtCveCliente').val(cveCliente);
$('#txtRFC').val(rfc);

        //recommend reading up on jquery selectors they are awesome 
        // http://api.jquery.com/category/selectors/
      } 
    });
  }; 

  function fnNuevo (){
    $('#divMensajes').html('');
    $('#frmVentas')[0].reset();
    $('#txtFolio').val('');
  }
  function fnBuscar(item){
    if (item.data) {
      $(location).attr('href','catalogos/ventas/editar/'+item.data[0]);     
    }
    else
      $(location).attr('href','catalogos/ventas');        
  }
  function fnGuardar(){
      $.post('catalogos/ventas/guardar',
                  { intFolio: $('#txtFolio').val(), 
                  	intCveCliente: $('#txtCveCliente').val(),
                    strCliente: $('#txtCliente').val(),
                    dblTotal: $('#total').val(),
                    intPlazoElegido: $('#cmbOpcionPago').val(),
estatus: $('#estatus').val()
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

  function obtenerValoresTablaArticulos()
{
var importes = document.getElementsByName('importe[]');
alert(importes);
var nfilas = importes.length;
var resultadoImportes = "";
var arregloImportes= new Array(nfilas);

  for(var i=0;i<nfilas;i++)
  {
    if (importes[i] != "")
    {
    resultadoImportes = resultadoImportes+importes[i];
    arregloImportes[i] = importes[i];
alert(importes[i]);
  }

  }
alert(resultadoImportes);
  
}


  function addArticulo(tableID) 
{
var descripcion= $("#txtArticulo").val();
if (descripcion != "")
{
               var table = document.getElementById(tableID);
               var rowCount = table.rows.length;
    var row = table.insertRow(rowCount);


    var articulo= $("#txtArticulo").val();
    //-----------------------------------------------------------------------
    // 2) Send a http request with AJAX http://api.jquery.com/jQuery.ajax/
    //-----------------------------------------------------------------------
    $.ajax({                           
      url: '../datosArticulo.php',                  //the script to call to get data          
      data: "articulo="+articulo,                        //you can insert url argumnets here to pass to api.php
                       type: "post",                //for example "id=5&parent=6"
      dataType: 'json',                //data format      
      success: function(data)          //on recieve of reply
      {
        var modelo= data[0];    
        var precio= data[1];  
var existencia = data[2];
        //--------------------------------------------------------------------
        // 3) Update html content
        //--------------------------------------------------------------------

        //recommend reading up on jquery selectors they are awesome 
        // http://api.jquery.com/category/selectors/
if (existencia > 0)
{
 var cell1 = row.insertCell(0);
               var element1 = document.createElement("input");
               var articulo= $("#txtArticulo").val();
               element1.type = "text";
                element1.title = "Articulo";
               element1.value= articulo;
                // element1.name="articulo[]";
                  element1.id="articulo";
element1.style.width="90%";
               cell1.appendChild(element1);

               var cell2 = row.insertCell(1);
               var element2 = document.createElement("input");
               element2.type = "text";
                element2.title = "Modelo";
                // element2.name="modelo[]";
element2.value=modelo;
                  element2.id="modelo";
element2.style.width="80%";
               cell2.appendChild(element2);


               var cell3 = row.insertCell(2);
               var element3 = document.createElement("input");
               element3.type = "text";
                element3.title = "Cantidad";
               // element3.name="cantidad[]";
                  element3.id="cantidad";
element3.style.width="70%";
               cell3.appendChild(element3);



               var cell4 = row.insertCell(3);
               var element4 = document.createElement("input");
               element4.type = "text";
                element4.title = "Precio";
               // element4.name="precio[]";
                  element4.id="precio";
element4.value=precio;
element4.style.width="80%";
               cell4.appendChild(element4);


               var cell5 = row.insertCell(4);
               var element5 = document.createElement("input");
               element5.type = "text";
                element5.title = "Importe";
               // element5.name="importe[]";
                  element5.id="importe";
element5.value="0";
element5.style.width="80%";
               cell5.appendChild(element5);

               var cell6 = row.insertCell(5);
               var element6 = document.createElement("input");
               element6.type = "checkbox";
element6.id= "eliminar";
element6.style.width="100%";
               cell6.appendChild(element6);

document.getElementById("eliminar").style.width = "100%";
           document.getElementById("articulo").style.width = "90%";
document.getElementById("modelo").style.width = "80%";
document.getElementById("cantidad").style.width = "70%";
document.getElementById("precio").style.width = "80%";
document.getElementById("importe").style.width = "80%";

document.getElementById("thArticulo").style.width = "42%";
document.getElementById("thModelo").style.width = "10%";
document.getElementById("thCantidad").style.width = "5%";
document.getElementById("thPrecio").style.width = "18%";
document.getElementById("thImporte").style.width = "18%";
document.getElementById("thEliminar").style.width = "7%";
element3.focus();
$('#txtArticulo').val("");
element3.addEventListener("keyup", myFunction);
element3.addEventListener("change", myFunction2);
element3.addEventListener("focus", myFunction3);

function myFunction() {
if (element3.value <= existencia)
{
var tasaFinanciamiento =<?php echo $tasaFinanciamiento;?>;
var enganche=<?php echo $enganche;?>;
var plazoMaximo=<?php echo $plazoMaximo;?>;
    element5.value = element4.value * element3.value;
}
else
{
alert("La cantidad es superior a la existencia del artículo");
}
}
}
else
{
alert("El artículo seleccionado no cuenta con existencia, favor de verificar");
}
function myFunction2() {
var tasaFinanciamiento =<?php echo $tasaFinanciamiento;?>;
var enganche=<?php echo $enganche;?>;
var plazoMaximo=<?php echo $plazoMaximo;?>;
    element5.value = element4.value * element3.value;
var subtotal= parseFloat($("#subtotal").val()) + parseFloat(element5.value);
$('#subtotal').val(Math.round(subtotal));
$('#enganche').val(Math.round((enganche/100)*subtotal));
$("#bonificacionEnganche").val(Math.round(($("#enganche").val())*((tasaFinanciamiento*plazoMaximo)/100)));
$("#total").val(Math.round(($('#subtotal').val()) - parseFloat($('#enganche').val()) - parseFloat($('#bonificacionEnganche').val())));
var pagoContado = Math.round(($("#total").val())/(1+((tasaFinanciamiento*plazoMaximo)/100)));
var totalPagar3 = Math.round(((pagoContado)*(1+(tasaFinanciamiento*3)/100)));
var totalPagar6 = Math.round(((pagoContado)*(1+(tasaFinanciamiento*6)/100)));
var totalPagar9 = Math.round(((pagoContado)*(1+(tasaFinanciamiento*9)/100)));
var totalPagar12 = Math.round(((pagoContado)*(1+(tasaFinanciamiento*12)/100)));
$("#totalPagar3").val(totalPagar3);
$("#totalPagar6").val(totalPagar6);
$("#totalPagar9").val(totalPagar9);
$("#totalPagar12").val(totalPagar12);

var pagoMes3= Math.round(totalPagar3/3);
var pagoMes6= Math.round(totalPagar6/6);
var pagoMes9= Math.round(totalPagar9/9);
var pagoMes12= Math.round(totalPagar12/12);
$("#pagoMes3").val(pagoMes3);
$("#pagoMes6").val(pagoMes6);
$("#pagoMes9").val(pagoMes9);
$("#pagoMes12").val(pagoMes12);

var ahorro3= Math.round(parseFloat($("#total").val()) - parseFloat(totalPagar3));
var ahorro6= Math.round(parseFloat($("#total").val()) - parseFloat(totalPagar6));
var ahorro9= Math.round(parseFloat($("#total").val()) - parseFloat(totalPagar9));
var ahorro12= Math.round(parseFloat($("#total").val()) - parseFloat(totalPagar12));
$("#ahorro3").val(ahorro3);
$("#ahorro6").val(ahorro6);
$("#ahorro9").val(ahorro9);
$("#ahorro12").val(ahorro12);

}

function myFunction3() {
var tasaFinanciamiento =<?php echo $tasaFinanciamiento;?>;
var enganche=<?php echo $enganche;?>;
var plazoMaximo=<?php echo $plazoMaximo;?>;
var subtotal= parseFloat($("#subtotal").val()) - parseFloat(element5.value);
$('#subtotal').val(Math.round(subtotal));
$('#enganche').val(Math.round((enganche/100)*subtotal));
$("#bonificacionEnganche").val(Math.round(($("#enganche").val())*((tasaFinanciamiento*plazoMaximo)/100)));
$("#total").val(Math.round(($('#subtotal').val()) - parseFloat($('#enganche').val()) - parseFloat($('#bonificacionEnganche').val())));

}

      } 
    });

}
else
{
alert("Seleccione un artículo");
}
          }

function funcion1()
{
alert("Hola");
}
          function delete_row(tableID) {

               try {

               var table = document.getElementById(tableID);

               var rowCount = table.rows.length;

 

               for(var i=0; i<rowCount; i++) {

                    var row = table.rows[i];

                    var chkbox = row.cells[5].childNodes[0];

                    if(null != chkbox && true == chkbox.checked) {

                         table.deleteRow(i);

                         rowCount--;

                         i--;
var tasaFinanciamiento =<?php echo $tasaFinanciamiento;?>;
var enganche=<?php echo $enganche;?>;
var plazoMaximo=<?php echo $plazoMaximo;?>;
var subtotal= parseFloat($("#subtotal").val()) - parseFloat(row.cells[4].childNodes[0].value);
$('#subtotal').val(Math.round(subtotal));
$('#enganche').val(Math.round((enganche/100)*subtotal));
$("#bonificacionEnganche").val(Math.round(($("#enganche").val())*((tasaFinanciamiento*plazoMaximo)/100)));
$("#total").val(Math.round(($('#subtotal').val()) - parseFloat($('#enganche').val()) - parseFloat($('#bonificacionEnganche').val())));
                    }


               }

               }catch(e) {

                    alert(e);

               }

          }

function fnContinuar() {

var opcionPago= document.getElementById("cmbOpcionPago");
 opcionPago.style.display = 'block';
var tablaAbonos= document.getElementById("tablaAbonos");
 tablaAbonos.style.display = 'block';

var btnGuardar= document.getElementById("btnGuardar");
 btnGuardar.style.display = 'block';

}

  $( document ).ready(function() {
   
$("#txtCliente").autocomplete("catalogos/clientes/autocomplete", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:8,onItemSelect:null,selectOnly:0,remoteDataType:"json"} 
      );

$("#txtArticulo").autocomplete("catalogos/articulos/autocomplete", 
        { minChars:1,matchSubset:1,matchContains:1,cacheLength:8,onItemSelect:null,selectOnly:0,remoteDataType:"json"} 
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
       $('#txtNombre').focus();
     });

     $('#myModal').on('hidden', function () {
        fnNuevo();
        $('#txtBusqueda').focus();
     });

     //$("#btnGuardar").click(fnGuardar);


//---- Codigo Inicial para el Primer form
     fnGeneralForm('#frmVentas');    
     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 

               