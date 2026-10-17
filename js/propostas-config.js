// ======================================
// PROPOSTAS - CONFIGURAÇÕES (toggles e modal)
// ======================================
// Locação complementar, diária, emojis, cidade de saída, linha em branco e modal da engrenagem.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

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


// ======================================
// EMOJIS (toggle)
// ======================================
// Ativado por padrão (mensagem original). Desativado,
// a mensagem "Copiar Proposta Zap" sai sem emojis
// (mantém só 🟡 e 🚚).

let emojisAtivo = true;


function alternarEmojis(){

    emojisAtivo = !emojisAtivo;

    atualizarBotaoEmojis();

    salvarCache();
}


function atualizarBotaoEmojis(){

    const botao = $("btnEmojis");

    if(!botao) return;

    botao.classList.toggle(
        "ativo",
        emojisAtivo
    );

    botao.innerText =
        `Emojis: ${
            emojisAtivo ? "Ativado" : "Desativado"
        }`;
}


// ======================================
// CIDADE DE SAÍDA (toggle)
// ======================================
// Itajaí é o padrão (nada muda). Joinville troca a cidade de
// saída do frete nas mensagens "Copiar Proposta Zap" e "Frete
// ZOHO" (ver obterCidadeSaida em helpers.js).
// Valores: "ITAJAI" ou "JOINVILLE".

let cidadeSaidaAtual = "ITAJAI";


function alternarCidadeSaida(){

    cidadeSaidaAtual =
        cidadeSaidaAtual === "ITAJAI"
            ? "JOINVILLE"
            : "ITAJAI";

    atualizarBotaoCidadeSaida();

    salvarCache();
}


function atualizarBotaoCidadeSaida(){

    const botao = $("btnCidadeSaida");

    if(!botao) return;

    // verde = fora do padrão (Joinville)
    botao.classList.toggle(
        "ativo",
        cidadeSaidaAtual === "JOINVILLE"
    );

    botao.innerText =
        `Cidade de saída: ${
            cidadeSaidaAtual === "JOINVILLE" ? "Joinville" : "Itajaí"
        }`;
}


// ======================================
// LINHA EM BRANCO ANTES DO PAGAMENTO (toggle)
// ======================================
// Desativado por padrão (nada muda). Ativado, a mensagem
// "Copiar Proposta Zap" deixa uma linha em branco entre
// "Cortesia" e "Forma de pagamento".

let separarPagamentoAtivo = false;


function alternarSepararPagamento(){

    separarPagamentoAtivo = !separarPagamentoAtivo;

    atualizarBotaoSepararPagamento();

    salvarCache();
}


function atualizarBotaoSepararPagamento(){

    const botao = $("btnSepararPagamento");

    if(!botao) return;

    botao.classList.toggle(
        "ativo",
        separarPagamentoAtivo
    );

    botao.innerText =
        `Linha em branco antes do pagamento: ${
            separarPagamentoAtivo ? "Ativada" : "Desativada"
        }`;
}


// ======================================
// MODAL DE CONFIGURAÇÕES (engrenagem)
// ======================================
// Abre/fecha o modal que guarda os toggles
// (locação complementar, valor da diária, emojis, cidade de saída,
// linha em branco antes do pagamento).

function abrirConfiguracoes(){

    const modal = $("modalConfig");

    if(modal) modal.classList.add("aberto");
}


function fecharConfiguracoes(){

    const modal = $("modalConfig");

    if(modal) modal.classList.remove("aberto");
}


document.addEventListener("keydown", (evento) => {

    if(evento.key === "Escape"){
        fecharConfiguracoes();
    }
});
