// ======================================
// PROPOSTAS - AVISOS E LISTAS DE SUGESTÃO
// ======================================
// Avisos de falha/offline e datalists de equipamentos e cidades.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// AVISOS DO CARREGAMENTO
// ======================================
// Chamado pelo init depois de carregar as duas tabelas.
// Deixa o motivo visível na tela (faixa + toast + painéis)
// em vez de só no console.

function mostrarAvisoDadosSalvos(){

    const formatar = (iso) =>
        new Date(iso).toLocaleString(
            "pt-BR",
            { dateStyle: "short", timeStyle: "short" }
        );

    const partes = [];

    if(tabelaPrecosSalvaEm){
        partes.push(`preços (${formatar(tabelaPrecosSalvaEm)})`);
    }

    if(tabelaFretesSalvaEm){
        partes.push(`fretes (${formatar(tabelaFretesSalvaEm)})`);
    }

    let aviso =
        $("avisoDadosSalvos");

    if(!partes.length){

        if(aviso) aviso.remove();

        return;
    }

    if(!aviso){

        const container =
            document.querySelector(".container");

        if(!container) return;

        aviso =
            document.createElement("div");

        aviso.id = "avisoDadosSalvos";

        aviso.style.cssText =
            "width:100%;max-width:1100px;box-sizing:border-box;" +
            "text-align:center;padding:10px 14px;border-radius:8px;" +
            "background:#78350f;color:#fde68a;font-size:14px;";

        container.prepend(aviso);
    }

    aviso.innerText =
        `⚠️ Sem conexão com o servidor. Usando tabelas salvas no navegador: ${partes.join(" e ")}. Os valores podem estar desatualizados.`;
}


function avisarFalhaCarregamento(){

    mostrarAvisoDadosSalvos();

    if(
        !erroTabelaPrecos &&
        !erroTabelaFretes
    ){
        return;
    }

    mostrarToast(
        "Falha ao carregar dados — veja o aviso na tela",
        true
    );

    mostrarFretes();

    renderizarDescontosPorEquipamento([]);
}


// ======================================
// LISTAS DE SUGESTÃO (datalists)
// ======================================
// Geradas automaticamente a partir dos dados carregados,
// em vez de ficarem digitadas fixas no HTML.

function preencherListaEquipamentos(){

    const lista =
        $("listaEquipamentos");

    if(!lista) return;

    const modelos =
        Object.keys(tabelaPrecos).sort();

    lista.innerHTML =
        modelos
            .map(modelo => `<option value="${modelo}">`)
            .join("");
}


function preencherListaCidades(){

    const lista =
        $("listaCidades");

    if(!lista) return;

    // cidades de TODAS as transportadoras (nomesCidades é montado
    // em carregarFretes), com o nome original (com acento)
    const cidadesOrdenadas =
        Object.values(nomesCidades)
            .sort((a, b) => a.localeCompare(b, "pt-BR"));

    lista.innerHTML =
        cidadesOrdenadas
            .map(cidade => `<option value="${cidade}">`)
            .join("");
}
