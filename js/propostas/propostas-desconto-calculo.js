// ======================================
// PROPOSTAS - DESCONTO (cálculo)
// ======================================
// Cálculo por %, valor desejado ou total com seguro (a conta do total fica em propostas-desconto-total-seguro.js) e eventos de input. As contas aparecem no Resumo da proposta (propostas-resumo.js).
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// Valor de tabela e valor desejado são de um período, de todas as máquinas
// da linha. O bloco só guarda o valor final (dataset.valorFinal): desconto,
// seguro, diária e totais aparecem no Resumo da proposta (propostas-resumo.js).
// O espaço de resultado do bloco fica só para avisos.

function calcularDescontoBloco(bloco){

    const valorTabela =
        Number(bloco.dataset.valorTabela);

    const resultado =
        bloco.querySelector(".desconto-item-resultado");

    if(
        !Number.isFinite(valorTabela) ||
        valorTabela <= 0
    ){
        resultado.innerHTML = "";
        bloco.dataset.valorFinal = "";
        atualizarResumoProposta();
        return;
    }

    const campoDesejado =
        bloco.querySelector(".descValorDesejado");

    const campoPercentual =
        bloco.querySelector(".descPercentual");

    const campoTotalSeguro =
        bloco.querySelector(".descTotalSeguro");

    const desejadoTexto =
        campoDesejado.value.trim();

    const percentualTexto =
        campoPercentual.value.trim();

    const totalSeguroTexto =
        campoTotalSeguro.value.trim();


    // ==================================
    // OPÇÃO 1 — USUÁRIO DIGITOU %
    // ==================================

    if(percentualTexto){

        const percentual =
            brToNumber(percentualTexto);

        if(
            Number.isFinite(percentual) &&
            percentual >= 0 &&
            percentual <= 100
        ){

            const valorDesconto =
                valorTabela * (percentual / 100);

            const valorFinal =
                valorTabela - valorDesconto;

            campoDesejado.value =
                formatarMoedaBR(valorFinal);

            resultado.innerHTML = "";

            bloco.dataset.valorFinal = valorFinal;
            atualizarResumoProposta();
            return;
        }
    }


    // ==================================
    // OPÇÃO 2 — USUÁRIO DIGITOU O TOTAL COM SEGURO
    // ==================================
    // Conta em propostas-desconto-total-seguro.js (com ou sem o frete).

    if(totalSeguroTexto){

        const totalSeguro =
            brToNumber(totalSeguroTexto);

        if(
            Number.isFinite(totalSeguro) &&
            totalSeguro > 0
        ){

            calcularPeloTotalComSeguro(bloco, totalSeguro);
            atualizarResumoProposta();
            return;
        }
    }


    // ==================================
    // OPÇÃO 3 — USUÁRIO DIGITOU VALOR FINAL
    // ==================================

    if(desejadoTexto){

        const valorDesejado =
            brToNumber(desejadoTexto);

        if(
            Number.isFinite(valorDesejado) &&
            valorDesejado > 0
        ){

            resultado.innerHTML = "";

            bloco.dataset.valorFinal = valorDesejado;
            atualizarResumoProposta();
            return;
        }
    }


    // sem desconto informado: valor final = valor de tabela
    resultado.innerHTML = "";
    bloco.dataset.valorFinal = valorTabela;
    atualizarResumoProposta();
}


// Delegação de evento: digitar %, valor desejado ou total com
// seguro em QUALQUER bloco de desconto recalcula só aquele bloco,
// sem mexer nos outros. Digitar num deles limpa os outros dois.
// Com o frete no total, recalcula todos: o frete pode mudar de bloco.

function recalcularAposDigitar(bloco){

    if(freteNoTotalAtivo){

        recalcularDescontos();

    }else{

        calcularDescontoBloco(bloco);
    }
}


function limparOutrosCamposDesconto(campo){

    const bloco =
        campo.closest(".desconto-item");

    [".descPercentual", ".descValorDesejado", ".descTotalSeguro"]
        .forEach(seletor => {

            const outro =
                bloco.querySelector(seletor);

            if(outro !== campo) outro.value = "";
        });

    return bloco;
}

document.addEventListener("input", (evento) => {

    if(evento.target.classList.contains("descValorTabela")){

        const bloco =
            evento.target.closest(".desconto-item");

        // marca como editado manualmente, pra não ser
        // sobrescrito na próxima recontagem automática
        bloco.dataset.editadoManual = "1";

        bloco.dataset.valorTabela =
            brToNumber(evento.target.value);

        recalcularAposDigitar(bloco);

    }else if(
        evento.target.classList.contains("descPercentual") ||
        evento.target.classList.contains("descValorDesejado") ||
        evento.target.classList.contains("descTotalSeguro")
    ){

        recalcularAposDigitar(
            limparOutrosCamposDesconto(evento.target)
        );
    }
});
