// ======================================
// ANÁLISE DE MOVIMENTAÇÕES - FILTROS
// ======================================
// Período (De/Até e os atalhos de analise-comum.js: este mês, mês passado, 30 e 90 dias, este ano), modelo de máquina e "Só concluídos". Trocar o período busca de novo no banco; modelo e concluídos só refazem as contas.

const ATALHO_PADRAO_MOVIMENTOS = "30";


function periodoMovimentos(){

    return { de: $("movimentosDe").value, ate: $("movimentosAte").value };
}


function filtroMovimentos(){

    return {
        ...periodoMovimentos(),
        modelo: $("movimentosModelo").value,
        soConcluidos: $("movimentosConcluidos").checked
    };
}


function escolherPeriodoMovimentos(atalho){

    const { de, ate } = periodoDoAtalho(String(atalho));

    $("movimentosDe").value = de;

    $("movimentosAte").value = ate;

    trocarPeriodoMovimentos();
}


// data-mudanca das datas e dos atalhos
function trocarPeriodoMovimentos(){

    const { de, ate } = periodoMovimentos();

    marcarAtalhosPeriodo("escolherPeriodoMovimentos", de, ate);

    carregarAnaliseMovimentos();
}


// os modelos que saíram ou voltaram no período. O escolhido continua na lista
// mesmo sem movimento no período novo (senão a tela trocaria para "todos" sem
// a pessoa ver)
function atualizarModelosMovimentos(){

    const caixa = $("movimentosModelo");

    const escolhido = caixa.value;

    const modelos = new Set(saidasERetornos(movimentosAnalise).map(movimento => movimento.modelo));

    if(escolhido) modelos.add(escolhido);

    const ordenados = [...modelos].sort((a, b) =>
        (a === SEM_MAQUINA_MOVIMENTOS) - (b === SEM_MAQUINA_MOVIMENTOS) ||
        a.localeCompare(b, "pt-BR", { numeric: true })
    );

    caixa.replaceChildren(new Option("Todos os modelos", ""), ...ordenados.map(modelo => new Option(modelo, modelo)));

    caixa.value = escolhido;
}


function prepararFiltrosMovimentos(){

    const { de, ate } = periodoDoAtalho(ATALHO_PADRAO_MOVIMENTOS);

    $("movimentosDe").value = de;

    $("movimentosAte").value = ate;

    marcarAtalhosPeriodo("escolherPeriodoMovimentos", de, ate);
}
