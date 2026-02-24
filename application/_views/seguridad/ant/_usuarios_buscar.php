<form id="frmSearch" action="#" method="post" onSubmit="return(false)">
  <input type="text" class="input-medium search-query" id ="txtBusqueda" name="strBusqueda" value="<?php echo set_value('strBusqueda');?>">
  <button type="submit" class="btn" id="btnBuscar">Buscar</button> <div style="float:right;margin-right:10px;"><strong id="numElementos">0</strong> Encontrados</div>
</form>

<table class="table table-stripped" id="dgUsuarios">
    <thead>
        <tr>
          <th>Usuario</th>
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
          <td>{{MF}}</td>
          <td>{{estatus}}</td>
          <td><a href="seguridad/usuarios/editar/{{usuario_id}}" class="btn btn-mini"><i class="icon icon-pencil"></i></a></td>
          <td><a href="seguridad/usuarios/eliminar/{{usuario_id}}" class="btn btn-mini"><i class="icon icon-trash"></i></a></td>
      </tr>
      {{/usuarios}}
      {{^usuarios}}
      <tr> 
        <td colspan="5"> No se Encontraron Resultados!!</td>
      </tr> 
      {{/usuarios}}

    </script>
</table>

<div id="pagLinks">

</div>

<script type="text/javascript">
  var pagina = 0;

  function paginacion(){
    $.post('seguridad/usuarios/pag',
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

  $( document ).ready(function() {
    //Elemento no necesarios en la vista.

    $("#btnBuscar").remove();
    $("#btnGuardar").remove();

    $("#btnNuevo").click(function(){
          $(location).attr('href','seguridad/usuarios/nuevo');     
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

     $('#txtBusqueda').focus();
     paginacion();
  });
</script> 