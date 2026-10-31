// ======================================
// AGENDA - MODO E FILTROS
// ======================================
// Modo expedição/transportador e filtrarAgendamentos().
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// MODO DE VISUALIZAÇÃO
// ======================================
// Expedição: só entregas que ainda não saíram (inclui as sem
// data, que já precisam de preparativos). Sem local nem valor.
// Transportador: todos os tipos, informação completa, mas só
// o que já tem data definida.

function definirModo(modo){

    modoVisualizacao =
        modo === "expedicao"
            ? "expedicao"
            : "transportador";

    try{

        localStorage.setItem(
            CHAVE_AGENDA_MODO,
            modoVisualizacao
        );

    }catch(erro){

        console.error("Erro ao salvar modo:", erro);
    }

    renderizarAgenda();
}


function visivelNoModo(item){

    if(modoVisualizacao === "expedicao"){

        return (
            (item.tipo === "Entrega" || item.tipo === "Troca técnica") &&
            !STATUS_OCULTOS_EXPEDICAO.includes(item.status)
        );
    }

    return !!item.data;
}


// ======================================
// SÓ SEM PATRIMÔNIO
// ======================================
// Botão do painel de filtros: mostra só as máquinas cujo patrimônio ainda não foi
// definido (a manutenção só passou o modelo). O estado fica no próprio
// botão (classe "filtrando"), como o filtro de tipo fica no select.

function filtrandoSemPatrimonio(){

    return $("btnSemPatrimonio").classList.contains("filtrando");
}


function alternarSemPatrimonio(){

    $("btnSemPatrimonio").classList.toggle("filtrando");

    renderizarAgenda();
}


// ======================================
// PAINEL DE FILTROS (botão ⚙️ Filtros)
// ======================================
// Filtros e opções da tela ficam todos num painel só. Como ficam escondidos,
// o botão e a linha da contagem avisam o que está filtrando agora, pra
// ninguém achar que um agendamento sumiu.

// nomes dos filtros que estão escondendo algo. Chamar depois de atualizar os
// botões de datas e status (a classe "filtrando" deles é que diz).
function filtrosAtivos(){

    const ativos = [];

    if(filtroTransportadora === SEM_TRANSPORTADORA){

        ativos.push("sem transportadora");

    }else if(filtroTransportadora){

        ativos.push(`transportadora ${filtroTransportadora}`);
    }

    // pesquisando, as datas e os status não escondem nada
    if(!buscandoAgenda()){

        if($("btnDatas").classList.contains("filtrando")) ativos.push("datas");

        if($("btnStatus").classList.contains("filtrando")) ativos.push("status");
    }

    if(modoVisualizacao !== "expedicao" && $("filtroTipo").value){

        ativos.push(`tipo ${$("filtroTipo").value}`);
    }

    if(filtrandoSemPatrimonio()) ativos.push("só sem patrimônio");

    return ativos;
}


function atualizarBotaoFiltros(){

    const ativos = filtrosAtivos();

    const botao = $("btnFiltros");

    botao.innerText =
        ativos.length
            ? `⚙️ Filtros: ${ativos.length} ${ativos.length === 1 ? "ativo" : "ativos"} ▾`
            : "⚙️ Filtros ▾";

    botao.classList.toggle("filtrando", ativos.length > 0);

    $("resumoFiltros").innerText =
        ativos.length ? `· Filtrando por: ${ativos.join(", ")}` : "";

    $("btnLimparFiltros").style.display = ativos.length ? "" : "none";
}


function limparFiltros(){

    filtroTransportadora = "";

    datasOcultas.clear();

    statusOcultos.clear();

    $("filtroTipo").value = "";

    $("btnSemPatrimonio").classList.remove("filtrando");

    renderizarAgenda();
}


function alternarPainelFiltros(){

    const painel = $("painelFiltros");

    if(painel.classList.contains("aberto")){

        fecharPainelFiltros();

        return;
    }

    encaixarPainelNaTela(painel);

    // não passa do fim da tela: o que não couber rola dentro do painel
    painel.style.maxHeight =
        Math.max(
            260,
            document.documentElement.clientHeight -
            painel.getBoundingClientRect().top - 12
        ) + "px";
}


function fecharPainelFiltros(){

    $("painelFiltros").classList.remove("aberto");
}


// ======================================
// FILTROS
// ======================================
// ignorarTransportadora = usado pra contar os botões das
// transportadoras respeitando os outros filtros.

function filtrarAgendamentos(ignorarTransportadora, ignorarData, ignorarStatus){

    const tipo = $("filtroTipo").value;

    const expedicao =
        modoVisualizacao === "expedicao";

    const soSemPatrimonio =
        filtrandoSemPatrimonio();

    // pesquisa (agenda-busca.js): acha qualquer agendamento, então o modo,
    // as datas e os status não escondem nada
    const buscando = buscandoAgenda();

    return agendamentos.filter(item => {

        if(buscando){

            if(!itemCombinaBusca(item)) return false;

        }else{

            // antigo só aparece enquanto pesquisa
            if(item.antigo) return false;

            if(!visivelNoModo(item)) return false;
        }

        if(!ignorarTransportadora){

            if(
                filtroTransportadora === SEM_TRANSPORTADORA &&
                item.transportadora
            ){
                return false;
            }

            if(
                filtroTransportadora &&
                filtroTransportadora !== SEM_TRANSPORTADORA &&
                item.transportadora !== filtroTransportadora
            ){
                return false;
            }
        }

        // na expedição só tem entrega, então o filtro de tipo não vale
        if(!expedicao && tipo && item.tipo !== tipo) return false;

        // só as máquinas sem patrimônio definido
        if(soSemPatrimonio && !itemSemPatrimonio(item)) return false;

        if(buscando) return true;

        // filtro de status: os desmarcados não aparecem
        if(!ignorarStatus && statusOcultos.has(item.status)) return false;

        // filtro de datas: as desmarcadas não aparecem
        if(!ignorarData && datasOcultas.has(item.data || "")) return false;

        return true;
    });
}
