// ======================================
// ANÁLISE DE MOVIMENTAÇÕES - CONTAS
// ======================================
// Só contas, sem tela: máquinas que saíram e que voltaram (e o saldo), quantos agendamentos de cada tipo, por modelo, por cliente e por dia (ou semana), mais a média nos dias com movimento e o dia mais cheio. Tudo em máquinas: "2x WTE12" conta 2.

// filtro: { de, ate, soConcluidos, modelo ("" = todos) }
function movimentosDoFiltro(lista, filtro){

    return lista.filter(movimento =>
        movimento.data >= filtro.de &&
        movimento.data <= filtro.ate &&
        (!filtro.soConcluidos || movimento.status === STATUS_CONCLUIDO) &&
        (!filtro.modelo || movimento.modelo === filtro.modelo)
    );
}


function maquinasNoSentido(lista, sentido){

    return somar(lista.filter(movimento => movimento.sentido === sentido), movimento => movimento.quantidade);
}


// agendamentos (não máquinas) de um ou mais tipos
function agendamentosDoTipo(lista, ...tipos){

    return new Set(
        lista.filter(movimento => tipos.includes(movimento.tipo)).map(movimento => movimento.id)
    ).size;
}


function somarMovimentos(lista){

    const saidas = maquinasNoSentido(lista, "saida");

    const retornos = maquinasNoSentido(lista, "retorno");

    return {
        saidas,
        retornos,
        saldo: saidas - retornos,
        transferidas: maquinasNoSentido(lista, "transferencia"),
        agendamentos: new Set(lista.map(movimento => movimento.id)).size,
        entregas: agendamentosDoTipo(lista, "Entrega"),
        coletas: agendamentosDoTipo(lista, "Coleta"),
        trocas: agendamentosDoTipo(lista, "Troca técnica"),
        entregasColetas: agendamentosDoTipo(lista, TIPO_ENTREGA_COLETA),
        transferencias: agendamentosDoTipo(lista, "Transferência", TIPO_TRANSFERENCIA_UNIDADES),
        frustrados: agendamentosDoTipo(lista, TIPO_FRETE_FRUSTRADO)
    };
}


// só o que saiu ou voltou (transferência e frete frustrado não entram)
function saidasERetornos(lista){

    return lista.filter(movimento => movimento.sentido === "saida" || movimento.sentido === "retorno");
}


// [{ nome, saidas, retornos, saldo }]: mais movimento primeiro; o "sem"
// (sem máquina, sem cliente) sempre por último
function porGrupoMovimentos(lista, chaveDe, nomeSem){

    return [...agrupar(saidasERetornos(lista), chaveDe)]
        .map(([nome, deles]) => {

            const saidas = maquinasNoSentido(deles, "saida");

            const retornos = maquinasNoSentido(deles, "retorno");

            return { nome, saidas, retornos, saldo: saidas - retornos };
        })
        .sort((a, b) =>
            (a.nome === nomeSem) - (b.nome === nomeSem) ||
            (b.saidas + b.retornos) - (a.saidas + a.retornos) ||
            b.saidas - a.saidas ||
            a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })
        );
}


function porModeloMovimentos(lista){

    return porGrupoMovimentos(lista, movimento => movimento.modelo, SEM_MAQUINA_MOVIMENTOS);
}


// o mesmo cliente escrito com maiúsculas ou acento diferente fica junto (com
// o nome do primeiro que apareceu)
function porClienteMovimentos(lista){

    const nomes = new Map();

    const chave = (movimento) => {

        const simples = semAcento(movimento.cliente).toLowerCase().replace(/\s+/g, " ");

        if(!nomes.has(simples)) nomes.set(simples, movimento.cliente);

        return nomes.get(simples);
    };

    return porGrupoMovimentos(lista, chave, SEM_CLIENTE_MOVIMENTOS);
}


// uma barra por dia do período (os dias sem movimento também); período longo,
// uma por semana. Cada barra: { inicio, fim, saidas, retornos }
function barrasDeMovimentos(lista, de, ate){

    const porDia = agrupar(saidasERetornos(lista), movimento => movimento.data);

    const { porSemana, faixas } = faixasDoPeriodo(de, ate);

    const barras = faixas.map(faixa => {

        const daBarra = faixa.dias.flatMap(dia => porDia.get(dia) || []);

        return {
            inicio: faixa.inicio,
            fim: faixa.fim,
            saidas: maquinasNoSentido(daBarra, "saida"),
            retornos: maquinasNoSentido(daBarra, "retorno")
        };
    });

    return { porSemana, barras };
}


// máquinas movimentadas (saídas + retornos) por dia com movimento, e o dia mais cheio
function resumoDiasMovimentos(lista){

    const dias = [...agrupar(saidasERetornos(lista), movimento => movimento.data)]
        .map(([data, deles]) => ({ data, maquinas: somar(deles, movimento => movimento.quantidade) }));

    if(!dias.length) return { mediaPorDia: null, diaMaisCheio: null };

    const maisCheio = dias.reduce((maior, dia) =>
        dia.maquinas > maior.maquinas || (dia.maquinas === maior.maquinas && dia.data < maior.data)
            ? dia
            : maior
    );

    return {
        mediaPorDia: somar(dias, dia => dia.maquinas) / dias.length,
        diaMaisCheio: maisCheio
    };
}


// +3, −2 ou 0 (o sinal faz parte do número)
function textoSaldo(saldo){

    if(saldo > 0) return `+${numeroBR(saldo)}`;

    if(saldo < 0) return `−${numeroBR(-saldo)}`;

    return "0";
}
