// ======================================
// ANÁLISE DE FRETES - RESUMO
// ======================================
// Os números grandes do topo (fretes, valor, nosso custo, frete médio, por máquina e viagens por dia) e os formatos usados nas tabelas: dinheiro, porcentagem, número e plural.

function dinheiro(valor){

    return valor === null || valor === undefined ? "—" : `R$ ${formatarMoedaBR(valor)}`;
}


function porcento(fracao){

    return `${(fracao * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
}


function numeroBR(valor, casas = 0){

    return valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}


function plural(quantidade, singular, varios){

    return `${numeroBR(quantidade)} ${quantidade === 1 ? singular : varios}`;
}


// ======================================
// RESUMO (os números grandes do topo)
// ======================================

function cartaoResumo(titulo, valor, detalhe, aviso){

    const cartao = criar("div", "cartao-resumo");

    cartao.append(
        criar("div", "cartao-titulo", titulo),
        criar("div", "cartao-valor", valor)
    );

    if(detalhe) cartao.appendChild(criar("div", aviso ? "cartao-detalhe aviso" : "cartao-detalhe", detalhe));

    return cartao;
}


function desenharResumoFretes(lista){

    const soma = somarFretes(lista);

    const viagens = resumoViagens(lista);

    const semTransportadora = lista.filter(frete => !frete.transportadora).length;

    const pagoCliente = soma.valor - soma.nossoCusto;

    $("resumoFretes").replaceChildren(
        cartaoResumo(
            "Fretes",
            numeroBR(soma.fretes),
            semTransportadora ? `${plural(semTransportadora, "sem transportadora", "sem transportadora")}` : ""
        ),
        cartaoResumo(
            "Valor dos fretes",
            dinheiro(soma.valor),
            soma.semValor ? `⚠️ ${plural(soma.semValor, "frete sem valor", "fretes sem valor")} (fora da conta)` : "o que as transportadoras cobraram",
            soma.semValor > 0
        ),
        cartaoResumo(
            "Nosso custo",
            dinheiro(soma.nossoCusto),
            pagoCliente > 0 ? `${dinheiro(pagoCliente)} por conta do cliente` : "tudo por nossa conta"
        ),
        cartaoResumo("Frete médio", dinheiro(soma.medio), "por frete"),
        cartaoResumo(
            "Frete por máquina",
            dinheiro(soma.medioPorMaquina),
            plural(soma.maquinas, "máquina transportada", "máquinas transportadas")
        ),
        cartaoResumo(
            "Viagens por dia",
            viagens.mediaPorDia === null ? "—" : numeroBR(viagens.mediaPorDia, 1),
            viagens.diaMaisCheio
                ? `nos dias com viagem; mais cheio: ${diaMes(viagens.diaMaisCheio.data)} (${viagens.diaMaisCheio.viagens})`
                : ""
        )
    );
}
