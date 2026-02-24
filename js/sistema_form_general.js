// Agrega mensaje sin ir al servidor
$(document).ajaxError(function(e, XMLHttpRequest){
  if(XMLHttpRequest.status == 401)
    window.document.location = '';
});

function fnMsg(tipo,strMsg){
    strTipo = "success";
    strMsgIni = "Correcto! ";
    if(tipo == 2){
      strTipo = "error";
      strMsgIni = "Error! ";
    }
    $("#divMensaje").html('<div class="alert alert-'+strTipo+'"> ' +
                '<button type="button" class="close" data-dismiss="alert">&times;</button> ' +
                '<strong>'+strMsgIni+'</strong> '+ strMsg +
              '</div>');
}

//Maneja el enter a tab en el form
function fnEnter2tab(e) {
   if (e.keyCode == 13) {
       cb = parseInt($(this).attr('tabindex'));
       strInputAnt = ':input[tabindex=\'' + cb + '\']';
       strInput = ':input[tabindex=\'' + (cb + 1) + '\']';
       strName = $(strInput).attr('id');
       if (strName) {
           $(strInput).focus();
           $(strInput).select();
           return false;
       }else{
          if(this.form.elements['auto_save'])
            eval(this.form.elements['auto_save'].value + '()');
          else
            fnGuardar();
       }
   }
}

function  fnGeneralForm(idForm){
    tb = $(idForm+' input,'+idForm+' select');
    if ($.browser.mozilla) {
        $(tb).keypress(fnEnter2tab);
    } else {
        $(tb).keydown(fnEnter2tab);
    }
}

function fnInvFecha(strFecha){
  if(strFecha == "")
    return "";
  var n=strFecha.split("-");
  return n[2]+"-"+n[1]+"-"+n[0];
}

function fnFormato(obj,fix){
  res = parseFloat(obj.value).toFixed(fix);
  if(isNaN(res))
    obj.value = 0;
  else 
    obj.value = res;
}