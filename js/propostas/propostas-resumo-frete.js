// ======================================
// PROPOSTAS - RESUMO: FRETE E VALOR FINAL
// ======================================
// Seções de baixo do Resumo da proposta (propostas-resumo.js): o frete (locação complementar, com o 📋 do formato Zoho, ou terceirizado) e o valor final com a diária da proposta.

// O mesmo frete da Proposta Zap: como locação complementar entra no valor
// final (frete x 2, +20% com bitributação); terceirizado fica fora dele.
function secaoFreteResumo(){

    const secao = criar("div", "resumo-secao resumo-frete");

    secao.append(criar("p", "resumo-titulo", "🚚 Frete"));

    const frete = brToNumber($("valorFrete")?.value);

    if(!Number.isFinite(frete) || frete <= 0){

        secao.append(notaResumo("Informe o valor do frete."));

        return { secao, complementar: 0, terceirizado: 0 };
    }

    const complementar = valorLocacaoComplementar();

    if(complementar){

        secao.append(
            linhaResumo("Locação complementar", moedaResumo(complementar.total), "", complementar.total),
            notaResumo(`${moedaResumo(frete)} x 2 (ida e volta)${bitributacaoAtiva ? " + 20% bitributação" : ""}`)
        );

    }else{

        secao.append(
            linhaResumo("Entrega + retirada", moedaResumo(frete * 2)),
            notaResumo("Terceirizado: um boleto na entrega e outro na retirada (boleto com vencimento em 14 dias), fora do valor final.")
        );
    }

    // botão 🚚 do Calcular Desconto (propostas-desconto-total-seguro.js)
    const blocoDoFrete = blocoComFreteDoTotal();

    if(blocoDoFrete){

        secao.append(notaResumo(
            `Dentro do Total com seguro do ${blocoDoFrete.querySelector(".desconto-item-titulo").innerText}.`
        ));
    }

    return {
        secao,
        complementar: complementar ? complementar.total : 0,
        terceirizado: complementar ? 0 : frete * 2
    };
}


function secaoTotalResumo(itens, frete){

    const secao = criar("div", "resumo-secao resumo-total");

    const validos = itens.filter(item => item.valido);

    const valorFinal =
        validos.reduce((soma, item) => soma + item.total, 0) +
        frete.complementar;

    secao.append(linhaResumo(
        frete.complementar > 0
            ? "Valor final com frete"
            : "Valor final",
        moedaResumo(valorFinal),
        "resumo-final"
    ));

    if(validos.length < itens.length){

        secao.append(notaResumo("Falta o valor de algum equipamento.", "resumo-alerta"));
    }

    if(frete.terceirizado > 0){

        secao.append(linhaResumo("Com o frete terceirizado", moedaResumo(valorFinal + frete.terceirizado)));
    }

    if(validos.length > 1){

        const diaria = validos.reduce((soma, item) => soma + item.diaria, 0);

        secao.append(
            linhaResumo("📅 Diária da proposta", moedaResumo(diaria), "resumo-diaria"),
            notaResumo(`com seguro ${moedaResumo(diaria * (1 + TAXA_SEGURO))}`)
        );
    }

    return secao;
}
