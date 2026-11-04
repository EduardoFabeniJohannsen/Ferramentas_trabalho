// ======================================
// PROPOSTAS - TOTAL COM SEGURO (Calcular Desconto)
// ======================================
// Campo "Total com seguro" (o "Total máquina + seguro" da Proposta Zap: tira os 7% do seguro e divide pelos períodos) e o botão 🚚 que põe o frete de ida e volta dentro desse total (com locação complementar, +20% se tiver bitributação). O frete entra uma vez só, no primeiro equipamento com Total com seguro.

// Desativado por padrão. É configuração: "Limpar tudo" não mexe.
let freteNoTotalAtivo = false;


// Chamada por calcularDescontoBloco() quando o bloco usa o Total com seguro.
// R$ 5.000 com seguro = locação R$ 4.672,90 + seguro R$ 327,10.
// Com o frete de R$ 500 como locação complementar +20%:
// R$ 1.200 de frete + locação R$ 3.551,40 + seguro R$ 248,60.
// A conta completa aparece no Resumo da proposta (propostas-resumo.js).
function calcularPeloTotalComSeguro(bloco, totalSeguro){

    const campoDesejado =
        bloco.querySelector(".descValorDesejado");

    const resultado =
        bloco.querySelector(".desconto-item-resultado");

    const periodos =
        obterPeriodoProposta().multiplicador;

    // o frete entra uma vez só, no primeiro bloco com Total com seguro
    const blocoDoFrete =
        blocoComFreteDoTotal();

    const frete =
        blocoDoFrete === bloco
            ? freteDoTotalSeguro()
            : null;

    const locacao =
        (totalSeguro - (frete ? frete.total : 0)) /
        (1 + TAXA_SEGURO);

    if(locacao <= 0){

        campoDesejado.value = "";

        resultado.innerHTML =
            `<span style="color:#ef4444">
                O total não cobre o frete (R$ ${formatarMoedaBR(frete.total)})
            </span>`;

        bloco.dataset.valorFinal = "";
        return;
    }

    // sem arredondar, pra o total da mensagem bater no centavo
    const valorFinal =
        locacao / periodos;

    campoDesejado.value =
        formatarMoedaBR(valorFinal);

    resultado.innerHTML = "";

    bloco.dataset.valorFinal = valorFinal;
}


function alternarFreteNoTotal(){

    freteNoTotalAtivo = !freteNoTotalAtivo;

    atualizarBotaoFreteNoTotal();

    recalcularDescontos();

    salvarCache();
}


// O mesmo frete que a Proposta Zap soma: ida e volta (frete x 2). Como
// locação complementar, ganha +20% com a bitributação ativada; sem ela o
// frete é terceirizado (boletos da transportadora) e não tem bitributação.
function freteDoTotalSeguro(){

    const frete =
        brToNumber($("valorFrete")?.value);

    if(!Number.isFinite(frete) || frete <= 0) return null;

    const comBitributacao =
        locacaoComplementarAtiva && bitributacaoAtiva;

    const idaVolta = frete * 2;

    return {
        frete,
        idaVolta,
        comBitributacao,
        total: idaVolta * (comBitributacao ? 1.2 : 1)
    };
}


// o bloco está calculando pelo Total com seguro (o % vem antes dele)
function usaTotalComSeguro(bloco){

    const valorTabela =
        Number(bloco.dataset.valorTabela);

    const total =
        brToNumber(bloco.querySelector(".descTotalSeguro")?.value.trim());

    return (
        !bloco.querySelector(".descPercentual")?.value.trim() &&
        Number.isFinite(valorTabela) && valorTabela > 0 &&
        Number.isFinite(total) && total > 0
    );
}


// o frete é da proposta, não de cada máquina: sai só do primeiro
// equipamento que usa o Total com seguro
function blocoComFreteDoTotal(){

    if(!freteNoTotalAtivo) return null;

    return Array.from(document.querySelectorAll(".desconto-item"))
        .find(usaTotalComSeguro) || null;
}


// recalcula todos os blocos (o frete pode trocar de equipamento)
function recalcularDescontos(){

    document.querySelectorAll(".desconto-item").forEach(calcularDescontoBloco);

    atualizarResumoProposta();
}


function atualizarBotaoFreteNoTotal(){

    const botao = $("btnFreteNoTotal");

    if(botao){

        botao.classList.toggle("ativo", freteNoTotalAtivo);

        botao.innerText =
            `🚚 Frete no Total com seguro: ${freteNoTotalAtivo ? "Sim" : "Não"}`;
    }

    // a bitributação só existe com a locação complementar
    const blocoBitributacao = $("blocoBitributacaoDesconto");

    if(blocoBitributacao){

        blocoBitributacao.style.display =
            freteNoTotalAtivo && locacaoComplementarAtiva ? "" : "none";
    }

    // a conta do frete aparece no Resumo da proposta (propostas-resumo.js)
}
