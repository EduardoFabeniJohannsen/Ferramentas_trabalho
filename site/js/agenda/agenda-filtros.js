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

    gravarLocal(CHAVE_AGENDA_MODO, modoVisualizacao);

    // cada modo tem o seu filtro de status e de motorista salvo
    // (agenda-filtro-status.js e agenda-filtro-motoristas.js)
    carregarStatusFiltro();

    carregarMotoristasFiltro();

    renderizarAgenda();
}


function visivelNoModo(item){

    if(modoVisualizacao === "expedicao"){

        // entrega, troca e transferência entre unidades (TIPOS_EXPEDICAO)
        return (
            TIPOS_EXPEDICAO.includes(item.tipo) &&
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
// botão (classe "filtrando").

function filtrandoSemPatrimonio(){

    return $("btnSemPatrimonio").classList.contains("filtrando");
}


function alternarSemPatrimonio(){

    $("btnSemPatrimonio").classList.toggle("filtrando");

    renderizarAgenda();
}


// ======================================
// SÓ SEM CARD
// ======================================
// Botão do painel de filtros: mostra só os agendamentos que precisam de card e
// ainda estão sem. Card só existe com frete por nossa conta ou dividido (no
// formulário, "Conta do cliente" esconde o campo): esses ficam de fora.
// O estado fica no próprio botão, como o "Só sem patrimônio".

function itemSemCard(item){

    return item.freteConta !== "cliente" && !String(item.card || "").trim();
}


function filtrandoSemCard(){

    return $("btnSemCard").classList.contains("filtrando");
}


function alternarSemCard(){

    $("btnSemCard").classList.toggle("filtrando");

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

    // "tipo Entrega + Coleta" (agenda-filtro-tipos.js); na expedição não vale
    if(filtrandoTipos()) ativos.push(textoTiposFiltro());

    // "motorista João + Pedro" (agenda-filtro-motoristas.js)
    if(filtrandoMotoristas()) ativos.push(textoMotoristasFiltro());

    if(filtrandoSemPatrimonio()) ativos.push("só sem patrimônio");

    if(filtrandoSemCard()) ativos.push("só sem card");

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

    // o status fica salvo (agenda-filtro-status.js): limpo também fica
    salvarStatusFiltro();

    // o tipo só vale no transportador: limpando na expedição, a escolha de lá fica
    if(modoVisualizacao !== "expedicao"){

        tiposOcultos.clear();

        salvarTiposFiltro();
    }

    // o motorista fica salvo por modo, como o status
    motoristasMarcados = null;

    salvarMotoristasFiltro();

    $("btnSemPatrimonio").classList.remove("filtrando");

    $("btnSemCard").classList.remove("filtrando");

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
// ignorar = o filtro que fica de lado ("transportadora", "data", "status",
// "tipo" ou "motorista"): é como cada filtro conta as próprias opções
// respeitando os outros.

function filtrarAgendamentos(ignorar){

    const expedicao =
        modoVisualizacao === "expedicao";

    const soSemPatrimonio =
        filtrandoSemPatrimonio();

    const soSemCard =
        filtrandoSemCard();

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

        if(ignorar !== "transportadora"){

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

        // filtro de tipo: os desmarcados não aparecem. Na expedição os tipos
        // já são os de TIPOS_EXPEDICAO: o filtro de tipo não vale
        if(!expedicao && ignorar !== "tipo" && tiposOcultos.has(item.tipo)) return false;

        // filtro de motorista: só os marcados (agenda-filtro-motoristas.js)
        if(ignorar !== "motorista" && !motoristaAparece(item)) return false;

        // só as máquinas sem patrimônio definido
        if(soSemPatrimonio && !itemSemPatrimonio(item)) return false;

        // só os que precisam de card (frete por nossa conta) e estão sem
        if(soSemCard && !itemSemCard(item)) return false;

        if(buscando) return true;

        // filtro de status: os desmarcados não aparecem
        if(ignorar !== "status" && statusOcultos.has(item.status)) return false;

        // filtro de datas: as desmarcadas não aparecem
        if(ignorar !== "data" && datasOcultas.has(dataDaTela(item))) return false;

        return true;
    });
}
