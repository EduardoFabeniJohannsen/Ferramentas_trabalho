// ======================================
// AGENDA - ENTREGA/COLETA: A REFERÊNCIA DA COLETA
// ======================================
// Tipo Entrega/Coleta (o cliente troca de máquina): cada máquina é de uma proposta, e cada proposta tem a sua linha de referência na mensagem do Zap, digitada inteira ("ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA ORBMAQ_WTE14_2 DIAS - Proposta: 713740"). A da coleta fica no campo Referência da coleta (coluna referencia_recolha) e sai primeiro; a da entrega é a Referência de sempre. Carregar depois de agenda-contratos.js.

// ao salvar: em outro tipo a referência da coleta fica vazia e, se nunca teve,
// nem vai para o banco (salvar continua funcionando antes do SQL da coluna)
function conferirReferenciaColeta(dados, anterior){

    if(dados.tipo === TIPO_ENTREGA_COLETA) return;

    if(anterior?.referenciaRecolha){

        dados.referenciaRecolha = "";

    }else{

        delete dados.referenciaRecolha;
    }
}


// sem a referência da coleta a mensagem sairia com uma proposta só
function erroColetaZap(item){

    if(item.tipo !== TIPO_ENTREGA_COLETA) return "";

    return String(item.referenciaRecolha || "").trim() ? "" : "Informe a referência da coleta (mensagem do Zap)";
}


// as duas linhas: a da coleta, como foi digitada, e a da entrega (a de sempre:
// digitada, ou montada CLIENTE_MODELO_PERÍODO - Proposta: N)
function referenciasEntregaColetaZap(item){

    return [String(item.referenciaRecolha || "").trim(), referenciaZap(item)];
}
