// ======================================
// PROPOSTAS - DESCONTO (cálculo)
// ======================================
// Cálculo por %, valor desejado ou total com seguro (a conta do total fica em propostas-desconto-total-seguro.js), valor final e eventos de input.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// Valor de tabela e valor desejado são do total (todas as máquinas), mas o
// desconto é lançado por máquina: 2x de R$ 1.000 querendo R$ 1.500 dá
// R$ 250 de desconto em cada uma (R$ 500 no total).
function textoDescontoBloco(bloco, valorDesconto, detalhe){

    const quantidade =
        Math.max(1, Number(bloco.dataset.quantidade) || 1);

    if(quantidade === 1){

        return `
            Desconto: <strong>R$ ${formatarNumeroPonto(valorDesconto)}</strong>
            <br>
            <span style="color:#94a3b8">${detalhe}</span>
        `;
    }

    return `
        Desconto por máquina: <strong>R$ ${formatarNumeroPonto(valorDesconto / quantidade)}</strong>
        <br>
        <span style="color:#94a3b8">
            ${detalhe} · total R$ ${formatarMoedaBR(valorDesconto)} (${quantidade} máquinas)
        </span>
    `;
}


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
        atualizarValorFinalProposta();
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

            resultado.innerHTML =
                textoDescontoBloco(
                    bloco,
                    valorDesconto,
                    `${percentual.toFixed(2)}% → R$ ${formatarMoedaBR(valorFinal)}`
                );

            bloco.dataset.valorFinal = valorFinal;
            atualizarValorFinalProposta();
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

            calcularPeloTotalComSeguro(bloco, valorTabela, totalSeguro);
            atualizarValorFinalProposta();
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

            const valorDesconto =
                valorTabela - valorDesejado;

            const percentual =
                (valorDesconto / valorTabela) * 100;

            resultado.innerHTML =
                textoDescontoBloco(
                    bloco,
                    valorDesconto,
                    `Desconto de ${percentual.toFixed(2)}%`
                );

            bloco.dataset.valorFinal = valorDesejado;
            atualizarValorFinalProposta();
            return;
        }
    }


    // sem desconto informado: valor final = valor de tabela
    resultado.innerHTML = "";
    bloco.dataset.valorFinal = valorTabela;
    atualizarValorFinalProposta();
}


function atualizarValorFinalProposta(){

    const blocos =
        document.querySelectorAll(".desconto-item");

    let total = 0;
    let algumValido = false;

    blocos.forEach(bloco => {

        const valorFinal =
            Number(bloco.dataset.valorFinal);

        if(
            Number.isFinite(valorFinal) &&
            valorFinal > 0
        ){
            total += valorFinal;
            algumValido = true;
        }
    });

    const campo = $("valorFinalProposta");

    if(campo){

        campo.innerText =
            algumValido
                ? "R$ " + formatarMoedaBR(total)
                : "";
    }
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
