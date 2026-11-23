// ======================================
// ANÁLISE DE MOVIMENTAÇÕES - DADOS
// ======================================
// Busca os agendamentos com data no período (buscarAgendamentosDoPeriodo, em analise-comum.js) e transforma cada um nas máquinas que ele movimenta: uma linha por modelo, com a quantidade ("2x WTE12" conta 2) e o sentido. Entrega sai, coleta volta, troca técnica sai uma e volta a recolha; transferências e frete frustrado ficam à parte. Cancelado não entra. Abre para o admin e para quem tem o acesso "analise-movimentacoes" (página Admin).

const COLUNAS_ANALISE_MOVIMENTOS =
    "id, data, tipo, status, plataforma, plataforma_recolha, cliente";

// o que cada tipo movimenta: [coluna da máquina, sentido]. "saida" = do pátio
// para o cliente; "retorno" = do cliente para o pátio; "transferencia" (entre
// obras ou entre unidades) e "frustrado" (foi e voltou) não mudam o que está no
// cliente: aparecem só no resumo
const MOVIMENTOS_DO_TIPO = {
    "Entrega": [["plataforma", "saida"]],
    "Coleta": [["plataforma", "retorno"]],
    "Troca técnica": [["plataforma", "saida"], ["plataforma_recolha", "retorno"]],
    "Transferência": [["plataforma", "transferencia"]],
    [TIPO_TRANSFERENCIA_UNIDADES]: [["plataforma", "transferencia"]],
    [TIPO_FRETE_FRUSTRADO]: [["plataforma", "frustrado"]]
};

// agendamento sem nada na coluna da máquina: conta 1, sem modelo
const SEM_MAQUINA_MOVIMENTOS = "Sem máquina informada";

const SEM_CLIENTE_MOVIMENTOS = "(Sem cliente)";

// uma linha por modelo movimentado (não por agendamento)
let movimentosAnalise = [];

let carregandoMovimentos = true;

let falhaMovimentos = "";

// trocou o período no meio de uma busca: só a mais nova desenha
let buscaMovimentosAtual = 0;


// agendamento do banco -> [{ id, data, tipo, status, cliente, sentido, modelo, quantidade }]
function movimentosDaLinha(linha){

    if(linha.status === "Cancelado") return [];

    const base = {
        id: linha.id,
        data: linha.data || "",
        tipo: linha.tipo || "",
        status: linha.status || "",
        cliente: String(linha.cliente || "").trim() || SEM_CLIENTE_MOVIMENTOS
    };

    return (MOVIMENTOS_DO_TIPO[linha.tipo] || []).flatMap(([coluna, sentido]) => {

        const partes = separarPlataformas(linha[coluna]);

        if(!partes.length) return [{ ...base, sentido, modelo: SEM_MAQUINA_MOVIMENTOS, quantidade: 1 }];

        return partes.map(parte => ({
            ...base,
            sentido,
            modelo: modeloDaPlataforma(parte.patrimonio) || SEM_MAQUINA_MOVIMENTOS,
            quantidade: parte.quantidade
        }));
    });
}


async function carregarAnaliseMovimentos(){

    const busca = ++buscaMovimentosAtual;

    const { de, ate } = periodoMovimentos();

    carregandoMovimentos = true;

    falhaMovimentos = "";

    desenharAnaliseMovimentos();

    if(!de || !ate || de > ate){

        movimentosAnalise = [];

        carregandoMovimentos = false;

        falhaMovimentos = "Escolha um período: a data inicial não pode passar da final.";

        desenharAnaliseMovimentos();

        return;
    }

    try{

        const linhas = await buscarAgendamentosDoPeriodo(de, ate, COLUNAS_ANALISE_MOVIMENTOS);

        if(busca !== buscaMovimentosAtual) return;

        movimentosAnalise = linhas.flatMap(movimentosDaLinha);

    }catch(erro){

        if(busca !== buscaMovimentosAtual) return;

        console.error("[analise-movimentacoes] Falha ao carregar os agendamentos:", erro);

        movimentosAnalise = [];

        falhaMovimentos = "Não foi possível carregar os agendamentos (verifique a conexão).";
    }

    carregandoMovimentos = false;

    atualizarModelosMovimentos();

    desenharAnaliseMovimentos();
}
