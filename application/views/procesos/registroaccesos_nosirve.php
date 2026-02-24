<script type="text/javascript">
    // Variables globales para paginación y control de estados
    var pagina_residentes = 0;
    var pagina_visitantes = 0;
    var pagina_RegistroGeneral = 0;
    var strUltimaBusqueda = "";
    var tempID = 1;
    var bolPagina = false;
    var bolProcesando = false;
    var pagina = 0;

    // Funciones para la paginación de privadas monitoristas
    function paginacionPrivadasMonitoristas(){
        $.post('catalogos/monitoristas/paginacionPrivadasMonitoristas',
                 {usuarioID:$('#txtUsuarioID').val(),intPagina:pagina},
                  function(data) {
                    // Actualiza la tabla con los datos recibidos
                    $('#dgPrivadasMonitoristas tbody').empty();
                    var temp = Mustache.render($('#plantila_privadasMonitoristas').html(),data);
                    $('#dgPrivadasMonitoristas tbody').html(temp);
                    $('#pagLinks').html(data.paginacion);
                    $('#numElementos').html(data.total_rows);
                    pagina = data.pagina;
                    if (data.total_rows > 0)
                    {
                        toastr.info('¡Favor de revisar las privadas que le fueron asignadas!', 'AVISO IMPORTANTE', {timeOut: 4000}); 
                    }
                  }
                 ,
          'json');
    }

    // Función para obtener el total de llamadas y actualizar la interfaz
    function paginacionTotalLlamadas(){
        $.post('catalogos/monitoristas/totalLlamadas',
                 {usuarioID:$('#txtUsuarioID').val(),intPagina:pagina},
                  function(data) {
                    $('#lblTotalLlamadas').text(data.total_rows);
                    var diferenciaLlamadas = data.diferencia_llamadas - data.total_rows;
                    if (diferenciaLlamadas == 0)
                    {
                        $('#lblDiferenciaLlamadas').text("¡Felicidades, vas en 1er lugar!");
                    }
                    else
                    {
                        $('#lblDiferenciaLlamadas').text(", te faltan: "+ diferenciaLlamadas + " llamada(s) para alcanzar al 1er lugar.");
                    }
                    var d = new Date();
                    if (d.getMinutes() == "59")
                    {
                        toastr.info('¡Felicitaciones a '+data.ganador_llamadas[0].usuario+' por ser quien más contestó llamadas en la última hora!', 'GANADOR ÚLTIMA HORA', {timeOut: 4000}); 
                    }
                  }
                 ,
          'json');
    }

    // Funciones para la paginación de residentes y visitantes
    function paginacion_residentes(){
        if($('#txtResidenciaID').val() != strUltimaBusqueda){
          pagina_residentes = 0;
          strUltimaBusqueda = $('#txtResidenciaID').val();
        }
          
        $.post('procesos/registroaccesos/paginacion_residentes',
                 {intBusqueda:$('#txtResidenciaID').val(), intPagina:pagina_residentes},
                  function(data) {
                    $('#dgResidentes tbody').empty();
                    var temp = Mustache.render($('#plantilla_residentes').html(),data);
                    $('#dgResidentes tbody').html(temp);
                    $('#pagLinks_residentes').html(data.paginacion);
                    $('#numElementos_residentes').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
    }

    function paginacion_visitantes(){
        if($('#txtResidenciaID').val() != strUltimaBusqueda){
          pagina_visitantes = 0;
          strUltimaBusqueda = $('#txtResidenciaID').val();
        }
          
        $.post('procesos/registroaccesos/paginacion_visitantes',
                 {intBusqueda:$('#txtResidenciaID').val(), intPagina:pagina_visitantes},
                  function(data) {
                    $('#dgVisitantes tbody').empty();
                    var temp = Mustache.render($('#plantilla_visitantes').html(),data);
                    $('#dgVisitantes tbody').html(temp);
                    $('#pagLinks_visitantes').html(data.paginacion);
                    $('#numElementos_visitantes').html(data.total_rows);
                    pagina = data.pagina;
                  }
                 ,
          'json');
    }

    // Función para inicializar un nuevo registro
    function fnNuevo(){
        // Código para inicializar y limpiar el formulario
        // ...
    }

    // Función para habilitar o deshabilitar el formulario
    function fnHabilitarFormulario(bolBlok){
        if(bolBlok){
          // Habilita los campos del formulario
          // ...
        }else {
          // Deshabilita los campos del formulario
          // ...
        }
    }

    // Función para validar el formulario antes de guardar
    function fnValidar(){
        bolValida = true;
        strMensaje = "";
        // Validaciones de campos obligatorios
        if($('#txtResidenciaID').val() == '') {
          strMensaje += '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Seleccione una Residencia!!!</div>'; 
          bolValida = false;
        }
        if($('#txtSolicitanteID').val() == '') {
          strMensaje += '<div class="alert alert-error"><a class="close" data-dismiss="alert">×</a>Seleccione un Solicitante!!!</div>'; 
          bolValida = false;
        }
        $('#divMensajes').html(strMensaje);
        return bolValida;
    }

    // Función para guardar el registro
    function fnGuardar(intTipoAccion){
        if(fnValidar() && !bolProcesando){
            DetenerCrono();
            $('#divMensajes').html('<div class="alert alert-info"><a class="close" data-dismiss="alert">×</a>El registro se encuentra siendo procesado, por favor espere!!!</div>');
            bolProcesando = true;
            strDuracion = $('#lblCrono').html();
            strDuracion = '00:'+ strDuracion.substr(0,5);
            $.post('procesos/registroaccesos/guardar',
                      { intRegistroAccesoID: $('#txtRegistroAccesoID').val(),
                        intEmpleadoID: $('#txtOperadorID').val(),
                        intPrivadaID: $('#cmbPrivadaID').val(), 
                        intResidenciaID: $('#txtResidenciaID').val(),
                        intTipoGestionID: $('#cmbTipoGestion').val(),
                        strSolicitanteID: $('#txtSolicitanteID').val(),
                        strObservaciones: $('#txtObservaciones').val(),
                        strDuracion: strDuracion,
                        intEstatusID: intTipoAccion
                      },
                      function(data) {
                        if(data.resultado){
                          // Procesa la respuesta exitosa
                          // ...
                        }
                        $('#divMensajes').html(data.mensajes);
                        bolProcesando = false;
                      }
                     ,
              'json');
        }
    }

    // Otras funciones para el manejo de eventos y lógica del formulario
    // ...

    // Inicialización de componentes al cargar el documento
    $( document ).ready(function() {
        // Actualización periódica de la paginación
        setInterval(function(){
            paginacionPrivadasMonitoristas();
            paginacionTotalLlamadas();
        }, 5000);

        // Inicialización de autocompletados, datepickers, eventos, etc.
        // ...
    });

    // Código para el cronómetro
    var CronoID = null;
    var CronoEjecutandose = false;
    var decimas, segundos, minutos; 
      
    function DetenerCrono (){  
        if(CronoEjecutandose)
            clearTimeout(CronoID);
        CronoEjecutandose = false;
    }  
      
    function InicializarCrono () {  
        decimas = 0;
        segundos = 0;
        minutos = 0;
        $("#lblCrono").html('00:00:0');
    }  
      
    function MostrarCrono () {  
        decimas++;
        if ( decimas > 9 ) {  
            decimas = 0;
            segundos++;
            if ( segundos > 59 ) {  
                segundos = 0;
                minutos++;
                if ( minutos > 99 ) {  
                    alert('Fin de la cuenta');
                    DetenerCrono();
                    return true;
                }  
            }  
        }  

        var ValorCrono = "";
        ValorCrono = (minutos < 10) ? "0" + minutos : minutos;
        ValorCrono += (segundos < 10) ? ":0" + segundos : ":" + segundos;
        ValorCrono += ":" + decimas;
                  
        $("#lblCrono").html(ValorCrono);
      
        CronoID = setTimeout("MostrarCrono()", 100);
        CronoEjecutandose = true;
        return true;
    }  
      
    function IniciarCrono () {  
        DetenerCrono();
        InicializarCrono();
        MostrarCrono();
    }  
</script>
