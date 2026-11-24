// ======================================
// ANÁLISE DE MOVIMENTAÇÕES - TELA
// ======================================
// Desenha tudo a partir das máquinas carregadas e dos filtros: o resumo (saídas, retornos, saldo, média por dia, transferências e fretes frustrados), o gráfico com os números em tabela, a tabela por modelo e a por cliente (os primeiros, com "Mostrar todos").

// a tabela por cliente começa com estes; o resto aparece no "Mostrar todos"
const CLIENTES_VISIVEIS_MOVIMENTOS = 15;

let todosClientesMovimentos = false;


// carregando ou com falha, toda tabela diz isso; senão, o texto de vazio dela
function textoVazioMovimentos(vazio){

    if(carregandoMovimentos) return "Carregando...";

    if(falhaMovimentos) return falhaMovimentos;

    return vazio;
}


// "em 3 entregas e 1 troca técnica" (só o que tem)
function textoAgendamentosMovimentos(partes){

    const com = partes.filter(([quantidade]) => quantidade > 0)
        .map(([quantidade, singular, varios]) => plural(quantidade, singular, varios));

    if(!com.length) return "";

    return `em ${com.length > 1 ? `${com.slice(0, -1).join(", ")} e ${com.at(-1)}` : com[0]}`;
}


function desenharResumoMovimentos(lista){

    const soma = somarMovimentos(lista);

    const dias = resumoDiasMovimentos(lista);

    const troca = ["troca técnica", "trocas técnicas"];

    const entregaColeta = ["entrega/coleta", "entregas/coletas"];

    $("resumoMovimentos").replaceChildren(
        cartaoResumo(
            "Saídas",
            numeroBR(soma.saidas),
            textoAgendamentosMovimentos([[soma.entregas, "entrega", "entregas"], [soma.entregasColetas, ...entregaColeta], [soma.trocas, ...troca]])
        ),
        cartaoResumo(
            "Retornos",
            numeroBR(soma.retornos),
            textoAgendamentosMovimentos([[soma.coletas, "coleta", "coletas"], [soma.entregasColetas, ...entregaColeta], [soma.trocas, ...troca]])
        ),
        cartaoResumo(
            "Saldo",
            textoSaldo(soma.saldo),
            soma.saldo > 0
                ? "saíram mais do que voltaram"
                : soma.saldo < 0 ? "voltaram mais do que saíram" : "saiu o mesmo que voltou"
        ),
        cartaoResumo(
            "Máquinas por dia",
            dias.mediaPorDia === null ? "—" : numeroBR(dias.mediaPorDia, 1),
            dias.diaMaisCheio
                ? `saídas + retornos, nos dias com movimento; mais cheio: ${diaMes(dias.diaMaisCheio.data)} (${dias.diaMaisCheio.maquinas})`
                : ""
        ),
        cartaoResumo(
            "Transferências",
            numeroBR(soma.transferidas),
            `${soma.transferencias ? `${plural(soma.transferencias, "agendamento", "agendamentos")} ` : ""}entre obras ou unidades (fora do saldo)`
        ),
        cartaoResumo(
            "Fretes frustrados",
            numeroBR(soma.frustrados),
            "foram e voltaram (fora do saldo)"
        )
    );
}


// Modelo/Cliente | Saídas | Retornos | Saldo
function linhaMovimentos(item, classeNome){

    const linha = criar("tr", item.nome === SEM_MAQUINA_MOVIMENTOS || item.nome === SEM_CLIENTE_MOVIMENTOS ? "sem-transportadora" : "");

    linha.append(
        celula(item.nome, classeNome),
        celula(numeroBR(item.saidas)),
        celula(numeroBR(item.retornos)),
        celula(textoSaldo(item.saldo), "col-saldo")
    );

    return linha;
}


function desenharDiasMovimentos(lista){

    const { de, ate } = periodoMovimentos();

    const dados = textoVazioMovimentos("") ? null : barrasDeMovimentos(lista, de, ate);

    $("tituloMovimentos").innerText = dados?.porSemana ? "Saídas e retornos por semana" : "Saídas e retornos por dia";

    desenharGraficoMovimentos(dados, textoVazioMovimentos("Nenhuma máquina saiu ou voltou no período"));

    const corpo = $("corpoDiasMovimentos");

    const comMovimento = dados ? dados.barras.filter(barra => barra.saidas || barra.retornos) : [];

    if(!comMovimento.length){

        linhaVaziaAnalise(corpo, 4, textoVazioMovimentos("Nenhuma máquina saiu ou voltou no período"));

        return;
    }

    corpo.replaceChildren(...comMovimento.map(barra => linhaMovimentos({
        nome: tituloDaFaixa(barra, dados.porSemana),
        saidas: barra.saidas,
        retornos: barra.retornos,
        saldo: barra.saidas - barra.retornos
    })));
}


function desenharModelosMovimentos(lista){

    const corpo = $("corpoModelosMovimentos");

    const modelos = porModeloMovimentos(lista);

    if(!modelos.length){

        linhaVaziaAnalise(corpo, 4, textoVazioMovimentos("Nenhuma máquina saiu ou voltou no período"));

        return;
    }

    corpo.replaceChildren(...modelos.map(item => linhaMovimentos(item, "col-nome")));
}


function desenharClientesMovimentos(lista){

    const corpo = $("corpoClientesMovimentos");

    const botao = $("btnTodosClientes");

    const clientes = porClienteMovimentos(lista);

    botao.hidden = clientes.length <= CLIENTES_VISIVEIS_MOVIMENTOS;

    botao.innerText = todosClientesMovimentos
        ? `Mostrar só os ${CLIENTES_VISIVEIS_MOVIMENTOS} primeiros`
        : `Mostrar todos os ${numeroBR(clientes.length)} clientes`;

    if(!clientes.length){

        linhaVaziaAnalise(corpo, 4, textoVazioMovimentos("Nenhuma máquina saiu ou voltou no período"));

        return;
    }

    const visiveis = todosClientesMovimentos ? clientes : clientes.slice(0, CLIENTES_VISIVEIS_MOVIMENTOS);

    corpo.replaceChildren(...visiveis.map(item => linhaMovimentos(item, "col-nome")));
}


// botão embaixo da tabela por cliente
function alternarTodosClientes(){

    todosClientesMovimentos = !todosClientesMovimentos;

    desenharClientesMovimentos(movimentosDaTela());
}


function movimentosDaTela(){

    return carregandoMovimentos || falhaMovimentos ? [] : movimentosDoFiltro(movimentosAnalise, filtroMovimentos());
}


function desenharAnaliseMovimentos(){

    const lista = movimentosDaTela();

    $("contagemMovimentos").innerText =
        carregandoMovimentos || falhaMovimentos
            ? ""
            : plural(new Set(lista.map(movimento => movimento.id)).size, "agendamento", "agendamentos");

    desenharResumoMovimentos(lista);

    desenharDiasMovimentos(lista);

    desenharModelosMovimentos(lista);

    desenharClientesMovimentos(lista);
}
