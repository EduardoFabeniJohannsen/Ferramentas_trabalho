// ======================================
// PROPOSTAS - DESCONTO (cálculo)
// ======================================
// Cálculo por % ou valor desejado, valor final e eventos de input.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

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

    const desejadoTexto =
        campoDesejado.value.trim();

    const percentualTexto =
        campoPercentual.value.trim();


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

            resultado.innerHTML = `
                Desconto: <strong>R$ ${formatarNumeroPonto(valorDesconto)}</strong>
                <br>
                <span style="color:#94a3b8">
                    ${percentual.toFixed(2)}% → R$ ${formatarMoedaBR(valorFinal)}
                </span>
            `;

            bloco.dataset.valorFinal = valorFinal;
            atualizarValorFinalProposta();
            return;
        }
    }


    // ==================================
    // OPÇÃO 2 — USUÁRIO DIGITOU VALOR FINAL
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

            resultado.innerHTML = `
                Desconto: <strong>R$ ${formatarNumeroPonto(valorDesconto)}</strong>
                <br>
                <span style="color:#94a3b8">
                    Desconto de ${percentual.toFixed(2)}%
                </span>
            `;

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


// Delegação de evento: digitar % ou valor desejado em
// QUALQUER bloco de desconto recalcula só aquele bloco,
// sem mexer nos outros.

document.addEventListener("input", (evento) => {

    if(evento.target.classList.contains("descValorTabela")){

        const bloco =
            evento.target.closest(".desconto-item");

        // marca como editado manualmente, pra não ser
        // sobrescrito na próxima recontagem automática
        bloco.dataset.editadoManual = "1";

        bloco.dataset.valorTabela =
            brToNumber(evento.target.value);

        calcularDescontoBloco(bloco);

    }else if(evento.target.classList.contains("descPercentual")){

        const bloco =
            evento.target.closest(".desconto-item");

        bloco.querySelector(".descValorDesejado").value = "";

        calcularDescontoBloco(bloco);

    }else if(evento.target.classList.contains("descValorDesejado")){

        const bloco =
            evento.target.closest(".desconto-item");

        bloco.querySelector(".descPercentual").value = "";

        calcularDescontoBloco(bloco);
    }
});
