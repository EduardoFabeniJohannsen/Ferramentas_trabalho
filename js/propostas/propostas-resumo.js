// ======================================
// PROPOSTAS - RESUMO DA PROPOSTA
// ======================================
// Card "Resumo da proposta" (no PC na coluna do meio; no celular logo depois do Calcular Desconto): todas as contas num lugar só, iguais às da Proposta Zap. Por equipamento: tabela, desconto (em vermelho acima de 20%, com o 📋 que copia no formato do Zoho), locação, seguro, máquina + seguro e diária. Depois o frete e o valor final (propostas-resumo-frete.js). Os outros cards ficam só com os campos.

// desconto acima disso (em %) fica em vermelho, com destaque
const LIMITE_DESCONTO_RESUMO = 20;

// "R$\u00a0" usa espaço que não quebra: o "R$" nunca fica sozinho no fim
// da linha, separado do valor.
function moedaResumo(valor){

    return `R$\u00a0${formatarMoedaBR(valor)}`;
}


// 📋 depois do valor: copia no formato do Zoho ("2160.00": sem o ponto do
// milhar e com ponto nos centavos), pra colar direto lá
function botaoZohoResumo(valor){

    const texto = formatarNumeroPonto(valor);

    const botao = criar("button", "resumo-zoho", "📋");

    botao.type = "button";

    botao.title = `Copiar ${texto} (formato do Zoho)`;

    botao.addEventListener("click", () => copiar(texto, `${texto} copiado (formato do Zoho)`));

    return botao;
}


// rótulo à esquerda, valor à direita. zoho = número que o 📋 copia
function linhaResumo(rotulo, valor, classe, zoho){

    const linha =
        criar("div", "resumo-linha" + (classe ? " " + classe : ""));

    linha.append(
        criar("span", "resumo-rotulo", rotulo),
        criar("span", "resumo-valor", valor)
    );

    if(zoho !== undefined) linha.append(botaoZohoResumo(zoho));

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
                descontoAlto ? "resumo-desconto-alto" : "",
                Math.abs(diferenca)
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
