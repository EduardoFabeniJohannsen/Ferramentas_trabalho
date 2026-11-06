// ======================================
// AGENDA - FILTRO DE STATUS
// ======================================
// Painel de status estilo Excel. Os status desmarcados ficam salvos por usuário e por modo (agendaStatus); as datas não.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// FILTRO DE STATUS (igual ao de datas)
// ======================================
// No botão "Status" você vê a lista com caixinhas e marca a combinação
// que quer ver (ex: Confirmado + Em rota).
// A escolha fica salva neste navegador, separada por usuário e por modo (a
// da expedição não mexe na do transportador): recarregar a página ou a
// atualização sozinha do sistema não traz de volta os status desmarcados.


function chaveStatusFiltro(){

    return `${CHAVE_AGENDA_STATUS}:${usuarioAgenda || "local"}`;
}


// põe em statusOcultos o que está salvo para o modo atual (ao abrir e ao trocar de modo)
function carregarStatusFiltro(){

    const dados = lerLocalJSON(chaveStatusFiltro(), {});

    const lista = dados ? dados[modoVisualizacao] : null;

    statusOcultos = new Set(
        Array.isArray(lista)
            ? lista.filter(nome => STATUS_AGENDA.includes(nome))
            : []
    );
}


function salvarStatusFiltro(){

    const dados = lerLocalJSON(chaveStatusFiltro(), {});

    const salvo =
        dados && typeof dados === "object" && !Array.isArray(dados)
            ? dados
            : {};

    salvo[modoVisualizacao] = [...statusOcultos];

    gravarLocalJSON(chaveStatusFiltro(), salvo);
}

// status da lista: os que existem nos agendamentos que aparecem no modo atual
// (respeitando os outros filtros), na ordem de STATUS_AGENDA. Os desmarcados
// ficam na lista pra dar pra marcar de novo.
function statusDoFiltro(){

    const existentes = new Set();

    filtrarAgendamentos(false, false, true).forEach(item => {

        existentes.add(item.status);
    });

    statusOcultos.forEach(nome => existentes.add(nome));

    return STATUS_AGENDA.filter(nome => existentes.has(nome));
}


// quantos agendamentos tem em cada status (sem aplicar o próprio filtro de status)
function contagemPorStatus(){

    const contagem = {};

    filtrarAgendamentos(false, false, true).forEach(item => {

        contagem[item.status] = (contagem[item.status] || 0) + 1;
    });

    return contagem;
}


// texto do botão: tudo marcado, um só status ou "N de M"
function atualizarBotaoStatus(){

    const botao = $("btnStatus");

    const todos = statusDoFiltro();

    const marcados = todos.filter(nome => !statusOcultos.has(nome));

    let texto = "🏷️ Todos os status ▾";

    if(marcados.length < todos.length){

        texto =
            marcados.length === 1
                ? `🏷️ Status: ${marcados[0]} ▾`
                : `🏷️ Status: ${marcados.length} de ${todos.length} ▾`;
    }

    botao.innerText = texto;

    botao.classList.toggle("filtrando", marcados.length < todos.length);
}


function desenharPainelStatus(){

    const lista = $("listaStatusFiltro");

    lista.innerHTML = "";

    const todos = statusDoFiltro();

    const contagem = contagemPorStatus();

    // "(Selecionar tudo)": marcado, desmarcado ou meio-termo
    const marcados =
        todos.filter(nome => !statusOcultos.has(nome)).length;

    const caixaTodos = $("marcarTodosStatus");

    caixaTodos.checked = todos.length > 0 && marcados === todos.length;

    caixaTodos.indeterminate = marcados > 0 && marcados < todos.length;

    todos.forEach(nome => {

        const rotulo = criar("label", "data-opcao");

        const caixa = criar("input");

        caixa.type = "checkbox";

        caixa.checked = !statusOcultos.has(nome);

        caixa.addEventListener(
            "change",
            () => {

                if(caixa.checked){

                    statusOcultos.delete(nome);

                }else{

                    statusOcultos.add(nome);
                }

                salvarStatusFiltro();

                renderizarAgenda();

                desenharPainelStatus();
            }
        );

        rotulo.appendChild(caixa);

        const tag = criar("span", "tag", nome);

        tag.dataset.status = nome;

        rotulo.appendChild(tag);

        rotulo.appendChild(
            criar("span", "contagem-status", `(${contagem[nome] || 0})`)
        );

        lista.appendChild(rotulo);
    });
}


function alternarPainelStatus(){

    const painel = $("painelStatus");

    if(painel.classList.contains("aberto")){

        fecharPainelStatus();

        return;
    }

    // um painel de cada vez
    fecharPainelDatas();

    desenharPainelStatus();

    painel.classList.add("aberto");
}


function fecharPainelStatus(){

    $("painelStatus").classList.remove("aberto");
}


// "(Selecionar tudo)": marca todos os status ou desmarca todos
function alternarTodosStatus(){

    if($("marcarTodosStatus").checked){

        statusOcultos.clear();

    }else{

        statusDoFiltro().forEach(nome => statusOcultos.add(nome));
    }

    salvarStatusFiltro();

    renderizarAgenda();

    desenharPainelStatus();
}
