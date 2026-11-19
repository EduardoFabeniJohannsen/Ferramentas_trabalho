// ======================================
// ANÁLISE DE FRETES - FILTROS
// ======================================
// Período (De/Até e os atalhos: este mês, mês passado, 30 e 90 dias, este ano, de analise-comum.js), tipo de agendamento e "Só concluídos". Trocar o período busca de novo no banco; tipo e concluídos só refazem as contas.

const ATALHO_PADRAO_ANALISE = "30";


function periodoAnalise(){

    return { de: $("analiseDe").value, ate: $("analiseAte").value };
}


function filtroAnalise(){

    return {
        ...periodoAnalise(),
        tipo: $("analiseTipo").value,
        soConcluidos: $("analiseConcluidos").checked
    };
}


// o atalho que bate com as datas fica marcado
function marcarAtalhoAnalise(){

    const { de, ate } = periodoAnalise();

    marcarAtalhosPeriodo("escolherPeriodoAnalise", de, ate);
}


function escolherPeriodoAnalise(atalho){

    const { de, ate } = periodoDoAtalho(String(atalho));

    $("analiseDe").value = de;

    $("analiseAte").value = ate;

    trocarPeriodoAnalise();
}


// data-mudanca das datas e dos atalhos
function trocarPeriodoAnalise(){

    marcarAtalhoAnalise();

    carregarAnaliseFretes();
}


function prepararFiltrosAnalise(){

    const tipo = $("analiseTipo");

    TIPOS.forEach(nome => tipo.appendChild(new Option(rotuloTipo(nome), nome)));

    const { de, ate } = periodoDoAtalho(ATALHO_PADRAO_ANALISE);

    $("analiseDe").value = de;

    $("analiseAte").value = ate;

    marcarAtalhoAnalise();
}
