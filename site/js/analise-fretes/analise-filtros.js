// ======================================
// ANÁLISE DE FRETES - FILTROS
// ======================================
// Período (De/Até e os atalhos: este mês, mês passado, 30 e 90 dias, este ano), tipo de agendamento e "Só concluídos". Trocar o período busca de novo no banco; tipo e concluídos só refazem as contas.

const ATALHO_PADRAO_ANALISE = "30";


function isoDaData(data){

    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, "0"),
        String(data.getDate()).padStart(2, "0")
    ].join("-");
}


// "mes", "mes-passado", "ano" ou um número de dias (até hoje)
function periodoDoAtalho(atalho, hoje = new Date()){

    const ano = hoje.getFullYear();

    const mes = hoje.getMonth();

    if(atalho === "mes") return { de: isoDaData(new Date(ano, mes, 1)), ate: isoDaData(hoje) };

    if(atalho === "mes-passado"){

        return { de: isoDaData(new Date(ano, mes - 1, 1)), ate: isoDaData(new Date(ano, mes, 0)) };
    }

    if(atalho === "ano") return { de: isoDaData(new Date(ano, 0, 1)), ate: isoDaData(hoje) };

    return {
        de: isoDaData(new Date(ano, mes, hoje.getDate() - Number(atalho) + 1)),
        ate: isoDaData(hoje)
    };
}


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

    document.querySelectorAll("[data-clique='escolherPeriodoAnalise']").forEach(botao => {

        const periodo = periodoDoAtalho(String(botao.dataset.arg));

        botao.classList.toggle("ativo", periodo.de === de && periodo.ate === ate);
    });
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
