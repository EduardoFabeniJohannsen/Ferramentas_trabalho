// ======================================
// PROPOSTAS - TOGGLES
// ======================================
// Estado e botões dos dois toggles do card "Gerar Textos".
// Depende de helpers.js e propostas-cache.js (precisa vir
// carregado antes, por causa da chamada a salvarCache()).

// ======================================
// LOCAÇÃO COMPLEMENTAR (toggle)
// ======================================
// Desativado por padrão. Quando ativado, muda o cálculo
// da mensagem "Copiar Proposta Zap" (ver copiarPropostaZap
// em propostas-textos.js).

let locacaoComplementarAtiva = false;


function alternarLocacaoComplementar(){

    locacaoComplementarAtiva = !locacaoComplementarAtiva;

    atualizarBotaoLocacaoComplementar();

    salvarCache();
}


function atualizarBotaoLocacaoComplementar(){

    const botao = $("btnLocacaoComplementar");

    if(!botao) return;

    botao.classList.toggle(
        "ativo",
        locacaoComplementarAtiva
    );

    botao.innerText =
        `Locação complementar: ${
            locacaoComplementarAtiva ? "Ativada" : "Desativada"
        }`;
}


// ======================================
// VALOR DA DIÁRIA (toggle)
// ======================================
// Desativado por padrão. Quando ativado, mostra a diária
// (valor da locação ÷ dias do período) ao lado do valor
// da locação na mensagem "Copiar Proposta Zap".

let valorDiariaAtivo = false;


function alternarValorDiaria(){

    valorDiariaAtivo = !valorDiariaAtivo;

    atualizarBotaoValorDiaria();

    salvarCache();
}


function atualizarBotaoValorDiaria(){

    const botao = $("btnValorDiaria");

    if(!botao) return;

    botao.classList.toggle(
        "ativo",
        valorDiariaAtivo
    );

    botao.innerText =
        `Valor da diária: ${
            valorDiariaAtivo ? "Ativada" : "Desativada"
        }`;
}
