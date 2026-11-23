// ======================================
// ANÁLISE DE FRETES - CONTAS
// ======================================
// Só contas, sem tela: totais e médias (por frete e por máquina), por transportadora, a mesma cidade feita por transportadoras diferentes (a mais usada cobra mais?) e frete por modelo. Cancelado não entra. As viagens por dia ficam em analise-viagens.js; somar e agrupar, em analise-comum.js.

const ROTULO_SEM_TRANSPORTADORA = "(Sem transportadora)";

// a mais usada numa cidade só vira alerta cobrando pelo menos isso a mais
const DIFERENCA_ALERTA_CIDADE = 0.05;


// filtro: { de, ate, tipo ("" = todos), transportadora ("" = todas), soConcluidos }
function fretesDaAnalise(fretes, filtro){

    return fretes.filter(frete =>
        frete.status !== "Cancelado" &&
        frete.data >= filtro.de &&
        frete.data <= filtro.ate &&
        (!filtro.tipo || frete.tipo === filtro.tipo) &&
        (!filtro.transportadora || (frete.transportadora || ROTULO_SEM_TRANSPORTADORA) === filtro.transportadora) &&
        (!filtro.soConcluidos || frete.status === STATUS_CONCLUIDO)
    );
}


// médias só com o que tem valor; por máquina, só com o que tem valor e máquina
function somarFretes(lista){

    const comValor = lista.filter(frete => frete.valor !== null);

    const comMaquina = comValor.filter(frete => frete.maquinas > 0);

    const valor = somar(comValor, frete => frete.valor);

    const maquinasComValor = somar(comMaquina, frete => frete.maquinas);

    return {
        fretes: lista.length,
        comValor: comValor.length,
        semValor: lista.length - comValor.length,
        valor,
        nossoCusto: somar(comValor, frete => frete.nossoCusto),
        maquinas: somar(lista, frete => frete.maquinas),
        medio: comValor.length ? valor / comValor.length : null,
        medioPorMaquina:
            maquinasComValor
                ? somar(comMaquina, frete => frete.valor) / maquinasComValor
                : null
    };
}


// mais fretes primeiro; sem transportadora sempre por último
function porTransportadora(lista){

    const total = somarFretes(lista);

    return [...agrupar(lista, frete => frete.transportadora || ROTULO_SEM_TRANSPORTADORA)]
        .map(([nome, deles]) => {

            const soma = somarFretes(deles);

            return {
                nome,
                ...soma,
                parteFretes: total.fretes ? soma.fretes / total.fretes : 0,
                parteValor: total.valor ? soma.valor / total.valor : 0
            };
        })
        .sort((a, b) =>
            (a.nome === ROTULO_SEM_TRANSPORTADORA) - (b.nome === ROTULO_SEM_TRANSPORTADORA) ||
            b.fretes - a.fretes ||
            a.nome.localeCompare(b.nome)
        );
}


// ======================================
// MESMA CIDADE, TRANSPORTADORAS DIFERENTES
// ======================================

// A mais usada na cidade cobra mais que outra que também fez o trajeto?
// Compara por máquina quando todas têm máquina (frete de 2 máquinas custa
// mais); senão, o frete médio. Empate no uso ou diferença pequena: sem alerta.
function alertaDaCidade(transportadoras){

    const porMaquina = transportadoras.every(item => item.medioPorMaquina !== null);

    const preco = (item) => porMaquina ? item.medioPorMaquina : item.medio;

    const [maisUsada, segunda] = transportadoras;

    if(!segunda || segunda.fretes === maisUsada.fretes) return null;

    const maisBarata =
        transportadoras.reduce((menor, item) => preco(item) < preco(menor) ? item : menor);

    if(maisBarata === maisUsada || !(preco(maisBarata) > 0)) return null;

    const diferenca = preco(maisUsada) / preco(maisBarata) - 1;

    if(diferenca < DIFERENCA_ALERTA_CIDADE) return null;

    return {
        maisUsada: maisUsada.nome,
        maisBarata: maisBarata.nome,
        diferenca,
        porMaquina
    };
}


// cidades feitas por 2 ou mais transportadoras (só fretes com valor e com
// cidade no endereço): mais fretes primeiro
function comparacaoPorCidade(lista){

    const comparaveis =
        lista.filter(frete => frete.cidade && frete.transportadora && frete.valor !== null);

    return [...agrupar(comparaveis, frete => frete.cidade)]
        .map(([cidade, daCidade]) => {

            const transportadoras =
                [...agrupar(daCidade, frete => frete.transportadora)]
                    .map(([nome, deles]) => ({ nome, ...somarFretes(deles) }))
                    .sort((a, b) => b.fretes - a.fretes || a.nome.localeCompare(b.nome));

            return {
                cidade,
                fretes: daCidade.length,
                transportadoras,
                alerta: alertaDaCidade(transportadoras)
            };
        })
        .filter(item => item.transportadoras.length >= 2)
        .sort((a, b) => b.fretes - a.fretes || a.cidade.localeCompare(b.cidade));
}


// ======================================
// POR MODELO DE MÁQUINA
// ======================================

// o frete de vários equipamentos se divide igual entre as máquinas
function porModelo(lista){

    const modelos = new Map();

    lista.forEach(frete => {

        frete.modelos.forEach(({ modelo, quantidade }) => {

            if(!modelo) return;

            const item =
                modelos.get(modelo) ||
                { modelo, maquinas: 0, maquinasComValor: 0, valor: 0 };

            item.maquinas += quantidade;

            if(frete.valor !== null){

                item.maquinasComValor += quantidade;

                item.valor += frete.valor / frete.maquinas * quantidade;
            }

            modelos.set(modelo, item);
        });
    });

    return [...modelos.values()]
        .map(item => ({
            ...item,
            medioPorMaquina: item.maquinasComValor ? item.valor / item.maquinasComValor : null
        }))
        .sort((a, b) => b.maquinas - a.maquinas || a.modelo.localeCompare(b.modelo));
}
