// ======================================
// AGENDA - LINHAS
// ======================================
// Cabeçalho da tabela e a linha de cada agendamento, com seus botões.

// linha de títulos das colunas (aparece uma vez, no topo da lista)
function criarCabecalhoAgenda(){

    const cabecalho = criar("thead");

    const linha = criar("tr");

    colunasAtuais().forEach(coluna => {

        linha.appendChild(criarTituloColuna(coluna));
    });

    linha.appendChild(criar("th", "ag-cab-lado"));

    cabecalho.appendChild(linha);

    return cabecalho;
}


function criarItemAgenda(item){

    const linha = criar("tr", "ag-item");

    linha.dataset.tipo = item.tipo;

    linha.dataset.status = item.status;

    // ---------- conteúdo (a parte do print) ----------

    criarCelulasAgenda(item).forEach(celula => {

        linha.appendChild(celula);
    });

    // ---------- controles (fora da área do print) ----------
    // cada usuário escolhe quais aparecem (agenda-botoes-linha.js)

    const lado = criar("td", "ag-lado");

    const botoes = criar("div", "ag-botoes");

    // ✅ marca como concluído (agenda-salvar.js), só na expedição. Já
    // concluído ou cancelado fica invisível, pra manter os botões alinhados.
    if(modoVisualizacao === "expedicao" && botaoLigado("concluir")){

        const botaoConcluir = criar("button", "btn-concluir", "✅");

        botaoConcluir.type = "button";

        if([STATUS_CONCLUIDO, "Cancelado"].includes(item.status)){

            botaoConcluir.style.visibility = "hidden";

            botaoConcluir.tabIndex = -1;

        }else{

            botaoConcluir.title = "Marcar como concluído (sai da expedição sem excluir)";

            botaoConcluir.addEventListener(
                "click",
                () => concluirAgendamento(item)
            );
        }

        botoes.appendChild(botaoConcluir);
    }

    const botaoZap = criar("button", "btn-zap", "📋");

    botaoZap.type = "button";

    botaoZap.title = "Copiar mensagem para o Zap";

    botaoZap.addEventListener(
        "click",
        () => copiarAgendamentoZap(item)
    );

    if(botaoLigado("zap")) botoes.appendChild(botaoZap);

    // faturamento (forma, prazo e e-mails): só entrega tem. Nos outros
    // tipos fica invisível, pra manter os botões alinhados.
    const botaoFaturamento = criar("button", "btn-faturamento", "🧾");

    botaoFaturamento.type = "button";

    if(item.tipo === "Entrega"){

        botaoFaturamento.title = "Copiar faturamento (pagamento, prazo e e-mails)";

        botaoFaturamento.addEventListener(
            "click",
            () => copiarFaturamento(item)
        );

    }else{

        botaoFaturamento.style.visibility = "hidden";

        botaoFaturamento.tabIndex = -1;
    }

    if(botaoLigado("faturamento")) botoes.appendChild(botaoFaturamento);

    // entrega: cria uma coleta a partir dela. Nos outros tipos fica um
    // botão invisível, só pra os botões da direita ficarem alinhados.
    const botaoColeta = criar("button", "btn-coleta", "↩️");

    botaoColeta.type = "button";

    if(item.tipo === "Entrega"){

        botaoColeta.title = "Criar uma coleta a partir desta entrega";

        botaoColeta.addEventListener(
            "click",
            () => copiarEntregaParaColeta(item)
        );

    }else{

        botaoColeta.style.visibility = "hidden";

        botaoColeta.tabIndex = -1;
    }

    if(botaoLigado("coleta")) botoes.appendChild(botaoColeta);

    // mesma demanda em outro dia (agenda-coleta.js)
    const botaoDuplicar = criar("button", "btn-duplicar", "📆");

    botaoDuplicar.type = "button";

    botaoDuplicar.title = "Duplicar: o mesmo agendamento em outro dia";

    botaoDuplicar.addEventListener(
        "click",
        () => duplicarAgendamento(item)
    );

    if(botaoLigado("duplicar")) botoes.appendChild(botaoDuplicar);

    const botaoEstoque = criar("button", "btn-estoque", "🔍");

    botaoEstoque.type = "button";

    botaoEstoque.title = "Ver os patrimônios disponíveis e em manutenção no estoque";

    botaoEstoque.addEventListener(
        "click",
        () => abrirEstoqueAgenda(item)
    );

    if(botaoLigado("estoque")) botoes.appendChild(botaoEstoque);

    const botaoEditar = criar("button", "", "✏️");

    botaoEditar.type = "button";

    botaoEditar.title = "Editar";

    botaoEditar.addEventListener(
        "click",
        () => abrirModalAgenda(item.id)
    );

    if(botaoLigado("editar")) botoes.appendChild(botaoEditar);

    const botaoExcluir = criar("button", "btn-secundario btn-excluir-ag", "🗑️");

    botaoExcluir.type = "button";

    botaoExcluir.title = "Excluir";

    botaoExcluir.addEventListener(
        "click",
        () => excluirAgendamento(item.id)
    );

    if(botaoLigado("excluir")) botoes.appendChild(botaoExcluir);

    lado.appendChild(botoes);

    linha.appendChild(lado);

    return linha;
}
