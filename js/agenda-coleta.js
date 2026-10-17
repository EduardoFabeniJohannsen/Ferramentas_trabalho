// ======================================
// AGENDA - COLETA A PARTIR DE ENTREGA
// ======================================
// Cria uma coleta já preenchida a partir de uma entrega.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// COLETA A PARTIR DE UMA ENTREGA
// ======================================
// A coleta volta pelo mesmo caminho: o local da entrega vira a retirada e
// o que era a saída (W Rental) vira o local de entrega. Data e motorista
// ficam em branco (são novos); o resto é copiado.

function valoresColetaDaEntrega(item){

    return {
        data: "",
        horario: HORARIO_PADRAO,
        tipo: "Coleta",
        status: STATUS_PADRAO,
        plataforma: item.plataforma,
        plataformaRecolha: "",
        transportadora: item.transportadora,
        motorista: "",
        cliente: item.cliente,
        proposta: item.proposta,
        periodo: item.periodo,
        origemNome: item.destinoNome,
        origemEndereco: item.destinoEndereco,
        linkOrigem: item.linkDestino,
        destinoNome: item.origemNome,
        destinoEndereco: item.origemEndereco,
        linkDestino: item.linkOrigem,
        frete: item.frete,
        freteConta: item.freteConta,
        obsExpedicao: "",
        obsEntrega: item.obsEntrega,
        referencia: item.referencia,
        contato: item.contato,
        card: "",
        emails: item.emails
    };
}


// abre o formulário de novo agendamento já preenchido como coleta.
// Nada é salvo até clicar em Salvar.
function copiarEntregaParaColeta(item){

    if(item.tipo !== "Entrega") return;

    // já tem um rascunho de agendamento novo: não apaga sem perguntar
    if(
        lerRascunhos().novo &&
        !confirm("Existe um rascunho de novo agendamento. Substituir por esta coleta?")
    ){
        return;
    }

    removerRascunho("novo");

    abrirModalAgenda(
        null,
        valoresColetaDaEntrega(item),
        `📋 Coleta criada a partir da entrega de ${item.plataforma}. Informe a data, o horário e o motorista.`
    );
}
