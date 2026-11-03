// ======================================
// ADMIN - LINHAS DAS PROPOSTAS ZAP
// ======================================
// Monta cada linha da tabela "Propostas Zap copiadas": usuário e aparelho,
// cliente, equipamentos com o desconto, total, configurações e a mensagem.
// Tudo como texto (nada entra como HTML). Carregar depois de admin-propostas.js.

function moedaAdmin(valor){

    return Number.isFinite(Number(valor)) && valor !== null
        ? `R$ ${formatarMoedaBR(Number(valor))}`
        : "—";
}


// "2× WAE16: tabela R$ 2.000,00 → R$ 1.500,00 (−25%)"
function textoEquipamentoAdmin(item){

    const partes = [`${item.quantidade > 1 ? `${item.quantidade}× ` : ""}${item.modelo}:`];

    if(item.valorTabela){

        partes.push(`tabela ${moedaAdmin(item.valorTabela)}${item.tabelaEditada ? " (editada)" : ""} →`);
    }

    partes.push(moedaAdmin(item.valorFinal));

    if(item.valorTabela && item.valorFinal && item.valorFinal < item.valorTabela){

        const desconto = (1 - item.valorFinal / item.valorTabela) * 100;

        partes.push(`(−${desconto.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)`);
    }

    return partes.join(" ");
}


// só o que está ligado, mais a cidade de saída e o pagamento
function configuracoesAdmin(dados){

    const config = dados?.configuracoes || {};

    const lista = [`Saída ${dados?.cidadeSaida || "Itajaí"}`];

    if(config.locacaoComplementar){

        lista.push(config.bitributacao ? "Locação complementar +20%" : "Locação complementar");
    }

    if(config.diaria) lista.push("Diária");

    if(config.emojis === false) lista.push("Sem emojis");

    if(config.separarPagamento) lista.push("Linha em branco no pagamento");

    const pagamento = dados?.pagamento || {};

    lista.push(
        pagamento.forma
            ? `${pagamento.forma}${pagamento.prazo ? ` ${pagamento.prazo} dias` : ""}`
            : "Pagamento padrão"
    );

    return lista;
}


function textoAparelhoAdmin(aparelho){

    return typeof textoAparelhoOnline === "function"
        ? textoAparelhoOnline(aparelho || {})
        : "";
}


function celulaUsuarioProposta(proposta){

    const celula = criar("td", "col-proposta-usuario");

    celula.appendChild(criar("strong", "", proposta.usuario_email || "—"));

    const aparelho = textoAparelhoAdmin(proposta.aparelho);

    if(aparelho) celula.appendChild(criar("small", "", aparelho));

    return celula;
}


function celulaClienteProposta(proposta){

    const celula = criar("td", "col-proposta-cliente");

    celula.appendChild(criar("strong", "", proposta.cliente || "(sem cliente)"));

    const dados = proposta.dados || {};

    const periodo =
        dados.multiplicador > 1
            ? `${dados.dias} dias × ${dados.multiplicador} períodos`
            : `${dados.dias || dados.periodo || "?"} dias`;

    celula.appendChild(
        criar("small", "", `${proposta.cidade || "—"} · ${periodo} · frete ${moedaAdmin(dados.frete)}`)
    );

    return celula;
}


function celulaEquipamentosProposta(proposta){

    const celula = criar("td", "col-proposta-equip");

    (proposta.dados?.equipamentos || []).forEach(item => {

        celula.appendChild(criar("div", "", textoEquipamentoAdmin(item)));
    });

    return celula;
}


function celulaConfigProposta(proposta){

    const celula = criar("td", "col-proposta-config");

    configuracoesAdmin(proposta.dados).forEach(texto => {

        celula.appendChild(criar("span", "tag-config", texto));
    });

    return celula;
}


// mensagem que foi copiada, aberta só ao clicar
function celulaMensagemProposta(proposta){

    const celula = criar("td", "col-proposta-msg");

    const botao = criar("button", "btn-copiar-erro", "📋 Copiar");

    botao.type = "button";

    botao.title = "Copiar a mensagem que foi enviada";

    botao.addEventListener("click", () => copiar(proposta.texto, "Mensagem copiada"));

    const detalhes = criar("details");

    detalhes.appendChild(criar("summary", "", "Ver mensagem"));

    detalhes.appendChild(criar("pre", "", proposta.texto));

    celula.append(botao, detalhes);

    return celula;
}


function criarLinhaProposta(proposta){

    const linha = criar("tr");

    linha.append(
        criar("td", "col-quando", dataHoraBR(proposta.criado_em)),
        celulaUsuarioProposta(proposta),
        celulaClienteProposta(proposta),
        celulaEquipamentosProposta(proposta),
        criar("td", "col-proposta-total", moedaAdmin(proposta.valor_total)),
        celulaConfigProposta(proposta),
        celulaMensagemProposta(proposta)
    );

    return linha;
}
