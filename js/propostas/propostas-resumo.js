// ======================================
// PROPOSTAS - RESUMO DA PROPOSTA
// ======================================
// Card "Resumo da proposta" (no PC na coluna do meio; no celular logo depois do Calcular Desconto): todas as contas num lugar só, iguais às da Proposta Zap. Por equipamento: tabela, desconto (em vermelho acima de 20%), locação, seguro, máquina + seguro e diária. Depois o frete (locação complementar ou terceirizado), o valor final e a diária da proposta. Os outros cards ficam só com os campos.

// desconto acima disso (em %) fica em vermelho, com destaque
const LIMITE_DESCONTO_RESUMO = 20;

// "R$\u00a0" usa espaço que não quebra: o "R$" nunca fica sozinho no fim
// da linha, separado do valor.
function moedaResumo(valor){

    return `R$\u00a0${formatarMoedaBR(valor)}`;
}


// rótulo à esquerda, valor à direita
function linhaResumo(rotulo, valor, classe){

    const linha =
        criar("div", "resumo-linha" + (classe ? " " + classe : ""));

    linha.append(
        criar("span", "resumo-rotulo", rotulo),
        criar("span", "resumo-valor", valor)
    );

    return linha;
}


function notaResumo(texto, classe){

    return criar("p", "resumo-nota" + (classe ? " " + classe : ""), texto);
}


// "15 dias", "60 dias (2 períodos de 30)"
function textoPeriodoResumo(infoPeriodo){

    return infoPeriodo.multiplicador > 1
        ? `${infoPeriodo.diasTotal} dias (${infoPeriodo.multiplicador} períodos de ${infoPeriodo.diasBusca})`
        : `${infoPeriodo.diasTotal} dias`;
}


// Valores de cada bloco do Calcular Desconto. O bloco guarda o valor de um
// período (de todas as máquinas da linha); aqui vira o período inteiro, como
// na Proposta Zap: locação = valor final x períodos, seguro = 7% da locação.
function itensDoResumo(infoPeriodo){

    return Array.from(document.querySelectorAll(".desconto-item")).map(bloco => {

        const titulo =
            bloco.querySelector(".desconto-item-titulo")?.innerText || "";

        const valorFinal = Number(bloco.dataset.valorFinal);

        if(!Number.isFinite(valorFinal) || valorFinal <= 0){

            return { bloco, titulo, valido: false };
        }

        const valorTabela = Number(bloco.dataset.valorTabela);

        const locacao = valorFinal * infoPeriodo.multiplicador;

        const seguro = locacao * TAXA_SEGURO;

        return {
            bloco,
            titulo,
            valido: true,
            quantidade: Math.max(1, Number(bloco.dataset.quantidade) || 1),
            tabela:
                Number.isFinite(valorTabela) && valorTabela > 0
                    ? valorTabela * infoPeriodo.multiplicador
                    : null,
            locacao,
            seguro,
            total: locacao + seguro,
            diaria: locacao / infoPeriodo.diasTotal
        };
    });
}


function secaoEquipamentoResumo(item, infoPeriodo){

    const secao = criar("div", "resumo-secao resumo-equipamento");

    secao.append(criar("p", "resumo-titulo", item.titulo));

    if(!item.valido){

        secao.append(notaResumo("⚠️ Confira o valor no Calcular Desconto.", "resumo-alerta"));

        return secao;
    }

    // tabela e desconto só quando o valor mudou
    const temDesconto =
        item.tabela !== null &&
        Math.abs(item.tabela - item.locacao) >= 0.005;

    if(temDesconto){

        const diferenca = item.tabela - item.locacao;

        const percentual = Math.abs(diferenca / item.tabela * 100);

        // compara o % como aparece (2 casas): 20,00% não fica vermelho
        const descontoAlto =
            diferenca > 0 &&
            Math.round(percentual * 100) / 100 > LIMITE_DESCONTO_RESUMO;

        secao.append(
            linhaResumo("Tabela", moedaResumo(item.tabela)),
            linhaResumo(
                diferenca > 0 ? "Desconto" : "Acréscimo",
                `${moedaResumo(Math.abs(diferenca))} (${formatarMoedaBR(percentual)}%)`,
                descontoAlto ? "resumo-desconto-alto" : ""
            )
        );

        if(descontoAlto){

            secao.append(notaResumo(
                `⚠️ Desconto acima de ${LIMITE_DESCONTO_RESUMO}%`,
                "resumo-alerta-desconto"
            ));
        }

        if(item.quantidade > 1){

            secao.append(notaResumo(`${moedaResumo(Math.abs(diferenca) / item.quantidade)} por máquina`));
        }
    }

    secao.append(
        linhaResumo("Locação", moedaResumo(item.locacao)),
        linhaResumo("Seguro (7%)", moedaResumo(item.seguro)),
        linhaResumo("Máquina + seguro", moedaResumo(item.total), "resumo-forte"),
        linhaResumo("📅 Diária", moedaResumo(item.diaria), "resumo-diaria")
    );

    const detalhesDiaria = [
        `com seguro ${moedaResumo(item.diaria * (1 + TAXA_SEGURO))}`
    ];

    if(item.quantidade > 1){

        detalhesDiaria.push(`${moedaResumo(item.diaria / item.quantidade)} por máquina`);
    }

    if(temDesconto){

        detalhesDiaria.push(`tabela ${moedaResumo(item.tabela / infoPeriodo.diasTotal)}`);
    }

    secao.append(notaResumo(detalhesDiaria.join(" · ")));

    return secao;
}


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
            linhaResumo("Locação complementar", moedaResumo(complementar.total)),
            notaResumo(`${moedaResumo(frete)} x 2 (ida e volta)${bitributacaoAtiva ? " + 20% bitributação" : ""}`)
        );

    }else{

        secao.append(
            linhaResumo("Entrega + retirada", moedaResumo(frete * 2)),
            notaResumo("Terceirizado: um boleto na entrega e outro na retirada (14 dias, pela transportadora via WhatsApp), fora do valor final.")
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


// Chamada depois de toda conta do Calcular Desconto, do período e do frete.
function atualizarResumoProposta(){

    const conteudo = $("conteudoResumo");

    if(!conteudo) return;

    conteudo.replaceChildren();

    const infoPeriodo = obterPeriodoProposta();

    const itens =
        infoPeriodo.valido && infoPeriodo.diasTotal > 0
            ? itensDoResumo(infoPeriodo)
            : [];

    if(!itens.length){

        conteudo.append(notaResumo(
            "Preencha equipamento, período e valores para ver o resumo.",
            "resumo-vazio"
        ));

        return;
    }

    const frete = secaoFreteResumo();

    conteudo.append(
        criar("p", "resumo-periodo", textoPeriodoResumo(infoPeriodo)),
        ...itens.map(item => secaoEquipamentoResumo(item, infoPeriodo)),
        frete.secao,
        secaoTotalResumo(itens, frete)
    );
}
