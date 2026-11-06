// ======================================
// PROPOSTAS ZAP COPIADAS - LINHAS
// ======================================
// Cada linha da tabela: usuário e aparelho, cliente (cidade, período, frete), equipamentos com tabela → valor final e % de desconto, total, configurações ativadas e a mensagem (ver e 📋 copiar). Nada entra como HTML.
// Carregar depois de copiadas-dados.js.

function moedaAdmin(valor){

    return Number.isFinite(Number(valor)) && valor !== null
        ? `R$ ${formatarMoedaBR(Number(valor))}`
        : "—";
}


// desconto sobre o valor de tabela, em % com 1 casa, como aparece na tabela
// (0 = sem desconto; null = sem valor de tabela pra comparar). O filtro de
// desconto (copiadas-filtros.js) usa o mesmo número.
function descontoEquipamentoAdmin(item){

    if(!item.valorTabela || !Number.isFinite(item.valorFinal)) return null;

    return Math.max(0, Math.round((1 - item.valorFinal / item.valorTabela) * 1000) / 10);
}


// "2× WAE16: tabela R$ 2.000,00 → R$ 1.500,00 (−25%)"
function textoEquipamentoAdmin(item){

    const partes = [`${item.quantidade > 1 ? `${item.quantidade}× ` : ""}${item.modelo}:`];

    if(item.valorTabela){

        partes.push(`tabela ${moedaAdmin(item.valorTabela)}${item.tabelaEditada ? " (editada)" : ""} →`);
    }

    partes.push(moedaAdmin(item.valorFinal));

    const desconto = descontoEquipamentoAdmin(item);

    if(desconto > 0){

        partes.push(`(−${desconto.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%)`);
    }

    return partes.join(" ");
}


// só o que está ligado, mais a cidade de saída e o pagamento
function configuracoesAdmin(dados){

    const config = dados?.configuracoes || {};

    const lista = [`Saída ${dados?.cidadeSaida || "Itajaí"}`];

    if(config.locacaoComplementar) lista.push(textoComplementarAdmin(dados));

    if(textoBonificadoAdmin(dados)) lista.push(textoBonificadoAdmin(dados));

    if(config.diaria) lista.push("Diária");

    if(config.emojis === false) lista.push("Sem emojis");

    if(config.separarPagamento) lista.push("Linha em branco no pagamento");

    lista.push(textoPagamentoAdmin(dados));

    return lista;
}


// "Locação complementar +20%", "Locação complementar" ou "" (sem ela)
function textoComplementarAdmin(dados){

    const config = dados?.configuracoes || {};

    if(!config.locacaoComplementar) return "";

    return config.bitributacao ? "Locação complementar +20%" : "Locação complementar";
}


// "Entrega bonificada", "Retirada bonificada", "Entrega e retirada bonificadas"
// ou "" (os dois fretes cobrados)
function textoBonificadoAdmin(dados){

    if(dados?.freteBonificado === "ambas") return "Entrega e retirada bonificadas";

    if(dados?.freteBonificado === "entrega") return "Entrega bonificada";

    if(dados?.freteBonificado === "retirada") return "Retirada bonificada";

    return "";
}


// "Boleto 28 dias", "Depósito", "Pagamento padrão" (a tag e o filtro da coluna)
function textoPagamentoAdmin(dados){

    const pagamento = dados?.pagamento || {};

    return pagamento.forma
        ? `${pagamento.forma}${pagamento.prazo ? ` ${pagamento.prazo} dias` : ""}`
        : "Pagamento padrão";
}


// Prazo que saiu na mensagem: "28", "28/56"... ("" = a mensagem não citou prazo).
// Com Boleto ou Depósito é o prazo digitado. Sem escolher a forma sai o texto
// padrão (propostas-pagamento.js): com emojis não cita prazo; sem emojis diz
// "28 dias, mediante aprovação cadastral".
const PRAZO_TEXTO_PADRAO_SEM_EMOJIS = "28";

function prazoPagamentoAdmin(dados){

    const pagamento = dados?.pagamento || {};

    if(pagamento.forma) return pagamento.prazo || "";

    return dados?.configuracoes?.emojis === false ? PRAZO_TEXTO_PADRAO_SEM_EMOJIS : "";
}


// textoAparelhoOnline fica em presenca.js (o mesmo texto do Online agora)
function textoAparelhoAdmin(aparelho){

    return textoAparelhoOnline(aparelho || {});
}


function celulaUsuarioProposta(proposta){

    const celula = criar("td", "col-proposta-usuario");

    celula.appendChild(criar("strong", "", proposta.usuario_email || "—"));

    const aparelho = textoAparelhoAdmin(proposta.aparelho);

    if(aparelho) celula.appendChild(criar("small", "", aparelho));

    return celula;
}


// "28 dias", "30 dias × 2 períodos" (o resumo do cliente e o filtro da coluna)
function textoPeriodoAdmin(dados){

    return dados?.multiplicador > 1
        ? `${dados.dias} dias × ${dados.multiplicador} períodos`
        : `${dados?.dias || dados?.periodo || "?"} dias`;
}


// "Brusque · 28 dias · frete R$ 500,00"
function resumoClienteProposta(proposta){

    const dados = proposta.dados || {};

    return `${proposta.cidade || "—"} · ${textoPeriodoAdmin(dados)} · frete ${moedaAdmin(dados.frete)}`;
}


function celulaClienteProposta(proposta){

    const celula = criar("td", "col-proposta-cliente");

    celula.appendChild(criar("strong", "", proposta.cliente || "(sem cliente)"));

    celula.appendChild(criar("small", "", resumoClienteProposta(proposta)));

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
