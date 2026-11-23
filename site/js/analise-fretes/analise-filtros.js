// ======================================
// ANÁLISE DE FRETES - FILTROS
// ======================================
// Período (De/Até e os atalhos: este mês, mês passado, 30 e 90 dias, este ano, de analise-comum.js), tipo de agendamento, transportadora e "Só concluídos". Trocar o período busca de novo no banco; o resto só refaz as contas.

const ATALHO_PADRAO_ANALISE = "30";


function periodoAnalise(){

    return { de: $("analiseDe").value, ate: $("analiseAte").value };
}


function filtroAnalise(){

    return {
        ...periodoAnalise(),
        tipo: $("analiseTipo").value,
        transportadora: $("analiseTransportadora").value,
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


// as transportadoras que fizeram frete no período (sem transportadora por último).
// A escolhida continua na lista mesmo sem frete no período novo (senão a tela
// trocaria para "todas" sem a pessoa ver)
function atualizarTransportadorasAnalise(){

    const caixa = $("analiseTransportadora");

    const escolhida = caixa.value;

    const nomes = new Set(fretesAnalise.map(frete => frete.transportadora || ROTULO_SEM_TRANSPORTADORA));

    if(escolhida) nomes.add(escolhida);

    const ordenados = [...nomes].sort((a, b) =>
        (a === ROTULO_SEM_TRANSPORTADORA) - (b === ROTULO_SEM_TRANSPORTADORA) ||
        a.localeCompare(b, "pt-BR")
    );

    caixa.replaceChildren(new Option("Todas as transportadoras", ""), ...ordenados.map(nome => new Option(nome, nome)));

    caixa.value = escolhida;
}


function prepararFiltrosAnalise(){

    const tipo = $("analiseTipo");

    TIPOS.forEach(nome => tipo.appendChild(new Option(rotuloTipo(nome), nome)));

    const { de, ate } = periodoDoAtalho(ATALHO_PADRAO_ANALISE);

    $("analiseDe").value = de;

    $("analiseAte").value = ate;

    marcarAtalhoAnalise();
}
