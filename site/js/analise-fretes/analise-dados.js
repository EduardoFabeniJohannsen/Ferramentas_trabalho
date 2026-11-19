// ======================================
// ANÁLISE DE FRETES - DADOS
// ======================================
// Busca os agendamentos com data no período (buscarAgendamentosDoPeriodo, em analise-comum.js) e deixa cada um pronto para as contas: valor do frete e nosso custo em número, máquinas, modelos e cidade do cliente. Só o admin abre esta página.

const COLUNAS_ANALISE_FRETES =
    "id, data, tipo, status, transportadora, plataforma, frete, frete_conta, frete_nossa, origem_endereco, destino_endereco";


let fretesAnalise = [];

let carregandoAnalise = true;

let falhaAnalise = "";

// trocou o período no meio de uma busca: só a mais nova desenha
let buscaAnaliseAtual = 0;


function numeroOuNulo(valor){

    if(valor === null || valor === undefined || valor === "") return null;

    const numero = Number(valor);

    return Number.isFinite(numero) ? numero : null;
}


// o que sai do nosso bolso: "Nossa conta" = o frete todo; "Conta do cliente" =
// nada; dividido = a parte por nossa conta. Sem valor informado: null
function nossoCustoDoFrete(valor, conta, parteNossa){

    if(valor === null) return null;

    if(conta === "cliente") return 0;

    if(conta === "dividido") return parteNossa ?? valor;

    return valor;
}


// linha do banco -> frete pronto para as contas. A cidade é a do cliente: na
// coleta ele é a origem; no resto, o destino
function freteDaLinha(linha){

    const partes = separarPlataformas(linha.plataforma);

    const valor = numeroOuNulo(linha.frete);

    const conta = linha.frete_conta || "nossa";

    return {
        id: linha.id,
        data: linha.data || "",
        tipo: linha.tipo || "",
        status: linha.status || "",
        transportadora: String(linha.transportadora || "").trim(),
        valor,
        conta,
        nossoCusto: nossoCustoDoFrete(valor, conta, numeroOuNulo(linha.frete_nossa)),
        maquinas: partes.reduce((total, parte) => total + parte.quantidade, 0),
        modelos: partes.map(parte => ({
            modelo: modeloDaPlataforma(parte.patrimonio),
            quantidade: parte.quantidade
        })),
        cidade: cidadeDoEndereco(
            linha.tipo === "Coleta" ? linha.origem_endereco : linha.destino_endereco
        )
    };
}


async function carregarAnaliseFretes(){

    const busca = ++buscaAnaliseAtual;

    const { de, ate } = periodoAnalise();

    carregandoAnalise = true;

    falhaAnalise = "";

    desenharAnaliseFretes();

    if(!de || !ate || de > ate){

        fretesAnalise = [];

        carregandoAnalise = false;

        falhaAnalise = "Escolha um período: a data inicial não pode passar da final.";

        desenharAnaliseFretes();

        return;
    }

    try{

        const linhas = await buscarAgendamentosDoPeriodo(de, ate, COLUNAS_ANALISE_FRETES);

        if(busca !== buscaAnaliseAtual) return;

        fretesAnalise = linhas.map(freteDaLinha);

    }catch(erro){

        if(busca !== buscaAnaliseAtual) return;

        console.error("[analise-fretes] Falha ao carregar os agendamentos:", erro);

        fretesAnalise = [];

        falhaAnalise = "Não foi possível carregar os agendamentos (verifique a conexão).";
    }

    carregandoAnalise = false;

    desenharAnaliseFretes();
}
