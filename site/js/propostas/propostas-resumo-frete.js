// ======================================
// PROPOSTAS - RESUMO: FRETE E VALOR FINAL
// ======================================
// Seções de baixo do Resumo da proposta (propostas-resumo.js): o frete (locação complementar, com o 📋 do formato Zoho, ou terceirizado) e o valor final com a diária da proposta.

// O mesmo frete da Proposta Zap: como locação complementar entra no valor
// final (frete x 2, +20% com bitributação); terceirizado fica fora dele.
// Com a entrega ou a retirada bonificada, conta um frete só; com as duas, nenhum.
// Com a parte da W Rental (status.js), conta só a do cliente.
function secaoFreteResumo(){

    const secao = criar("div", "resumo-secao resumo-frete");

    secao.append(criar("p", "resumo-titulo", "🚚 Frete"));

    // as duas bonificadas: nem precisa do valor do frete
    if(fretesCobrados() === 0){

        secao.append(
            linhaResumo("Entrega e retirada", "Bonificadas"),
            notaResumo("O cliente não paga frete.")
        );

        return { secao, complementar: 0, terceirizado: 0 };
    }

    const frete = brToNumber($("valorFrete")?.value);

    if(!Number.isFinite(frete) || frete <= 0){

        secao.append(notaResumo("Informe o valor do frete."));

        return { secao, complementar: 0, terceirizado: 0 };
    }

    // a parte da W Rental (status.js) precisa ser menor que o frete
    if(parteWRentalInvalida(frete)){

        secao.append(notaResumo("A parte da W Rental precisa ser menor que o frete (o frete todo de graça é no Frete bonificado).", "resumo-alerta"));

        return { secao, complementar: 0, terceirizado: 0 };
    }

    // o que o cliente paga em cada frete (sem a parte da W Rental, o frete todo)
    const cliente = freteDoCliente(frete);

    const complementar = valorLocacaoComplementar();

    // com um bonificado, o cliente paga só o outro
    const bonificado = obterFreteBonificado();

    const cobrado = bonificado === "entrega" ? "retirada" : "entrega";

    const vezes =
        bonificado
            ? `x 1 (${bonificado} bonificada)`
            : "x 2 (ida e volta)";

    if(complementar){

        secao.append(
            linhaResumo("Locação complementar", moedaResumo(complementar.total), "", complementar.total),
            notaResumo(`${moedaResumo(cliente)} ${vezes}${bitributacaoAtiva ? " + 20% bitributação" : ""}`)
        );

    }else if(bonificado){

        secao.append(
            linhaResumo(`Só a ${cobrado}`, moedaResumo(cliente)),
            notaResumo(`${bonificado === "entrega" ? "Entrega" : "Retirada"} bonificada. Terceirizado: um boleto na ${cobrado} (boleto com vencimento em 14 dias), fora do valor final.`)
        );

    }else{

        secao.append(
            linhaResumo("Entrega + retirada", moedaResumo(cliente * 2)),
            notaResumo("Terceirizado: um boleto na entrega e outro na retirada (boleto com vencimento em 14 dias), fora do valor final.")
        );
    }

    // a conta da parte da W Rental
    if(freteWRental()){

        secao.append(notaResumo(
            `Frete ${moedaResumo(frete)} − ${moedaResumo(freteWRental())} da W Rental = ${moedaResumo(cliente)} do cliente${fretesCobrados() === 2 ? " em cada um" : ""}.`
        ));
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
        terceirizado: complementar ? 0 : cliente * fretesCobrados()
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
