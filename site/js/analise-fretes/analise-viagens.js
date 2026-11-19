// ======================================
// ANÁLISE DE FRETES - VIAGENS
// ======================================
// Só contas: viagens de cada dia do período (os dias sem viagem também) ou de cada semana (segunda a domingo) no período longo (faixasDoPeriodo, em analise-comum.js), com o valor e quem fez, mais a média nos dias com viagem e o dia mais cheio. Viagem = um agendamento.


// { "Transportadora X": 3, ... } (mais viagens primeiro)
function viagensPorTransportadora(lista){

    return [...agrupar(lista, frete => frete.transportadora || ROTULO_SEM_TRANSPORTADORA)]
        .map(([nome, deles]) => ({ nome, viagens: deles.length }))
        .sort((a, b) => b.viagens - a.viagens || a.nome.localeCompare(b.nome));
}


function barraDeViagens(inicio, fim, lista){

    return {
        inicio,
        fim,
        viagens: lista.length,
        valor: somar(lista.filter(frete => frete.valor !== null), frete => frete.valor),
        transportadoras: viagensPorTransportadora(lista)
    };
}


// uma barra por dia do período (os dias sem viagem também); período longo,
// uma por semana (segunda a domingo, cortada nas pontas do período)
function barrasDeViagens(lista, de, ate){

    const porDia = agrupar(lista, frete => frete.data);

    const { porSemana, faixas } = faixasDoPeriodo(de, ate);

    const barras = faixas.map(faixa =>
        barraDeViagens(faixa.inicio, faixa.fim, faixa.dias.flatMap(dia => porDia.get(dia) || []))
    );

    return { porSemana, barras };
}


// média nos dias que tiveram viagem e o dia mais cheio
function resumoViagens(lista){

    const dias = [...agrupar(lista, frete => frete.data)];

    if(!dias.length) return { dias: 0, mediaPorDia: null, diaMaisCheio: null };

    const [maisCheio, deles] =
        dias.reduce((maior, dia) =>
            dia[1].length > maior[1].length ||
            (dia[1].length === maior[1].length && dia[0] < maior[0])
                ? dia
                : maior
        );

    return {
        dias: dias.length,
        mediaPorDia: lista.length / dias.length,
        diaMaisCheio: { data: maisCheio, viagens: deles.length }
    };
}
