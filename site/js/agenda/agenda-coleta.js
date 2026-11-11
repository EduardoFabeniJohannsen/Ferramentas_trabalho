// ======================================
// AGENDA - COLETA A PARTIR DE ENTREGA E DUPLICAR
// ======================================
// Cria uma coleta já preenchida a partir de uma entrega e duplica um
// agendamento para outro dia.
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
        vendedor: item.vendedor,
        origemNome: item.destinoNome,
        origemEndereco: item.destinoEndereco,
        linkOrigem: item.linkDestino,
        destinoNome: item.origemNome,
        destinoEndereco: item.origemEndereco,
        linkDestino: item.linkOrigem,
        frete: item.frete,
        freteConta: item.freteConta,
        freteNossa: item.freteNossa,
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


// ======================================
// DUPLICAR (MESMA DEMANDA EM OUTRO DIA)
// ======================================
// Copia tudo, menos a data (fica em branco pra escolher), o status (volta ao
// padrão), o card e o pedido de compra (são de cada agendamento; o PDF do
// pedido não pode ser de dois). Forma de pagamento e prazos vão junto.

function valoresDuplicados(item){

    const valores = {};

    CAMPOS_AGENDA.forEach(([campo]) => {

        valores[campo] = item[campo] ?? "";
    });

    return {
        ...valores,
        data: "",
        // o carregamento é do dia novo também (o horário fica)
        dataCarregamento: "",
        status: STATUS_PADRAO,
        card: "",
        formaPagamento: item.formaPagamento || "",
        prazosPagamento: [...(item.prazosPagamento || [])]
    };
}


// abre o formulário de novo agendamento já preenchido. Nada é salvo até
// clicar em Salvar.
function duplicarAgendamento(item){

    if(
        lerRascunhos().novo &&
        !confirm("Existe um rascunho de novo agendamento. Substituir por esta cópia?")
    ){
        return;
    }

    removerRascunho("novo");

    abrirModalAgenda(
        null,
        valoresDuplicados(item),
        `📆 Cópia do agendamento de ${item.cliente || item.plataforma}. Escolha a nova data.`
    );

    $("agData").focus();
}
