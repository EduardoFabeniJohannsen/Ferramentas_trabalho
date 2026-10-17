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
// FILTROS
// ======================================
// ignorarTransportadora = usado pra contar os botões das
// transportadoras respeitando os outros filtros.

function filtrarAgendamentos(ignorarTransportadora, ignorarData, ignorarStatus){

    const tipo = $("filtroTipo").value;

    const expedicao =
        modoVisualizacao === "expedicao";

    return agendamentos.filter(item => {

        if(!visivelNoModo(item)) return false;

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

        // filtro de status: os desmarcados não aparecem
        if(!ignorarStatus && statusOcultos.has(item.status)) return false;

        // filtro de datas: as desmarcadas não aparecem
        if(!ignorarData && datasOcultas.has(item.data || "")) return false;

        return true;
    });
}
