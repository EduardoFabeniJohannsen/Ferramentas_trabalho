// ======================================
// AGENDA - SUPABASE (agendamentos)
// ======================================
// Leitura/gravação dos agendamentos e recarga geral (agendamentos, motoristas, transportadoras).
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// SUPABASE - AGENDAMENTOS
// ======================================
// O código usa camelCase (origemNome) e o banco snake_case
// (origem_nome): CAMPOS_BANCO faz a tradução nos dois sentidos.

const TABELA_AGENDAMENTOS = "agendamentos";

const TABELA_MOTORISTAS = "motoristas";

const TABELA_TRANSPORTADORAS = "transportadoras";

// quantos dias pra trás a agenda carrega (os sem data vêm sempre)
const DIAS_PASSADOS_AGENDA = 30;

// ao voltar pra aba, recarrega se passou mais que isso (ms)
const INTERVALO_RECARGA_MS = 30000;

const CAMPOS_BANCO = {
    data: "data",
    horario: "horario",
    tipo: "tipo",
    status: "status",
    plataforma: "plataforma",
    plataformaRecolha: "plataforma_recolha",
    cliente: "cliente",
    proposta: "proposta",
    transportadora: "transportadora",
    motorista: "motorista",
    periodo: "periodo",
    origemNome: "origem_nome",
    origemEndereco: "origem_endereco",
    linkOrigem: "link_origem",
    destinoNome: "destino_nome",
    destinoEndereco: "destino_endereco",
    linkDestino: "link_destino",
    frete: "frete",
    freteConta: "frete_conta",
    referencia: "referencia",
    contato: "contato",
    card: "card",
    emails: "emails",
    obsExpedicao: "obs_expedicao",
    obsEntrega: "obs_entrega",
    // faturamento (só entregas): ver agenda-pagamento.js e agenda-pedido.js
    formaPagamento: "forma_pagamento",
    prazosPagamento: "prazos_pagamento",
    pedidoCompra: "pedido_compra",
    pedidoNumero: "pedido_numero",
    pedidoPdfCaminho: "pedido_pdf_caminho",
    pedidoPdfNome: "pedido_pdf_nome"
};


// linha do banco -> agendamento do código
function doBanco(linha){

    const item = { id: linha.id };

    Object.entries(CAMPOS_BANCO).forEach(([campo, coluna]) => {

        const valor = linha[coluna];

        item[campo] =
            (valor === null || valor === undefined)
                ? ""
                : valor;
    });

    // o frete é numérico no banco; no código segue como texto "1.150,00"
    item.frete =
        (linha.frete === null || linha.frete === undefined)
            ? ""
            : formatarMoedaBR(linha.frete);

    item.freteConta = linha.frete_conta || "nossa";

    // patrimônio sempre no formato certo (O minúsculo depois dos números)
    item.plataforma = plataformasFormatadas(item.plataforma);

    item.plataformaRecolha = patrimonioFormatado(item.plataformaRecolha);

    // faturamento: prazos sempre lista e pedido sempre sim/não
    item.prazosPagamento =
        Array.isArray(linha.prazos_pagamento)
            ? linha.prazos_pagamento
            : [];

    item.pedidoCompra = linha.pedido_compra === true;

    return item;
}


// campos do código (pode ser só alguns) -> colunas do banco
function paraBanco(dados){

    const linha = {};

    Object.entries(dados).forEach(([campo, valor]) => {

        const coluna = CAMPOS_BANCO[campo];

        if(!coluna) return;

        if(campo === "data"){

            // data vazia vira null (agendamento ainda sem data)
            linha[coluna] = valor || null;

        }else if(campo === "frete"){

            const numero = brToNumber(valor);

            linha[coluna] =
                (valor === "" || valor === null || valor === undefined || !Number.isFinite(numero))
                    ? null
                    : numero;

        }else if(campo === "prazosPagamento"){

            linha[coluna] = Array.isArray(valor) ? valor : [];

        }else if(campo === "pedidoCompra"){

            linha[coluna] = valor === true;

        }else{

            linha[coluna] = valor ?? "";
        }
    });

    return linha;
}


function detalhesErro(erro){

    return {
        mensagem: erro?.message,
        codigo: erro?.code,
        detalhes: erro?.details,
        dica: erro?.hint
    };
}


// Texto claro para o toast quando salvar falha: diz o motivo em vez de só
// "erro". O detalhe técnico continua indo para o console.
function mensagemErroSalvar(erro){

    const codigo = erro?.code || "";

    const texto = String(erro?.message || "");

    // coluna que o código usa e o banco ainda não tem
    if(
        codigo === "PGRST204" ||
        codigo === "42703" ||
        (/column/i.test(texto) && /schema cache|does not exist/i.test(texto))
    ){
        const achou =
            texto.match(/'([a-z_]+)' column/i) ||
            texto.match(/column "?([a-z_.]+)"?/i);

        return (
            "Banco desatualizado: falta a coluna" +
            (achou ? ` "${achou[1]}"` : "") +
            " na tabela agendamentos. Aplique o SQL do faturamento no Supabase."
        );
    }

    if(codigo === "42501" || /row-level security/i.test(texto)){

        return "Sem permissão para salvar na agenda. Confira seu acesso à agenda ou entre de novo no sistema.";
    }

    if(codigo === "23514"){

        return "O banco recusou os dados: confira forma de pagamento e pedido de compra.";
    }

    if(/failed to fetch|networkerror|network request/i.test(texto)){

        return "Sem conexão com o servidor. Confira a internet e tente de novo.";
    }

    if(/não encontrado|foi excluído/i.test(texto)){

        return "Este agendamento não existe mais (outra pessoa excluiu). Atualize a agenda.";
    }

    return `Erro ao salvar o agendamento: ${texto || "motivo desconhecido"}`;
}


// o Supabase devolve no máximo 1000 linhas por consulta,
// então busca em páginas até acabar
async function carregarAgenda(){

    erroAgenda = "";

    try{

        const limite = dataISO(-DIAS_PASSADOS_AGENDA);

        const tamanhoPagina = 1000;

        let inicio = 0;

        let linhas = [];

        while(true){

            const { data, error } =
                await supabaseClient
                    .from(TABELA_AGENDAMENTOS)
                    .select("*")
                    .or(`data.gte.${limite},data.is.null`)
                    .order("id")
                    .range(inicio, inicio + tamanhoPagina - 1);

            if(error) throw error;

            linhas = linhas.concat(data);

            if(data.length < tamanhoPagina) break;

            inicio += tamanhoPagina;
        }

        agendamentos = linhas.map(doBanco);

    }catch(erro){

        console.error("[agenda] Falha ao carregar:", detalhesErro(erro));

        erroAgenda =
            "Não foi possível carregar a agenda (verifique conexão/login)";

        mostrarToast("Falha ao carregar a agenda", true);
    }
}


async function inserirAgendamento(dados){

    const { data, error } =
        await supabaseClient
            .from(TABELA_AGENDAMENTOS)
            .insert(paraBanco(dados))
            .select()
            .single();

    if(error) throw error;

    return doBanco(data);
}


// .select() devolve as linhas alteradas: se vier vazio, o agendamento
// não existe mais (alguém excluiu) ou o RLS bloqueou
async function atualizarAgendamento(id, dados){

    const { data, error } =
        await supabaseClient
            .from(TABELA_AGENDAMENTOS)
            .update(paraBanco(dados))
            .eq("id", id)
            .select();

    if(error) throw error;

    if(!data.length){

        throw new Error("Agendamento não encontrado (foi excluído?)");
    }

    return doBanco(data[0]);
}


async function excluirAgendamentoBanco(id){

    const { data, error } =
        await supabaseClient
            .from(TABELA_AGENDAMENTOS)
            .delete()
            .eq("id", id)
            .select();

    if(error) throw error;

    return data.length > 0;
}


// recarrega agendamentos e motoristas (botão ↻ Atualizar, abertura
// da página e volta pra aba). manual = mostra aviso de atualizado.
async function recarregarAgenda(manual){

    await Promise.all([
        carregarAgenda(),
        carregarMotoristas(),
        carregarTransportadoras()
    ]);

    atualizarSelectsTransportadora();

    carregandoAgenda = false;

    ultimoCarregamento = Date.now();

    renderizarAgenda();

    if(manual && !erroAgenda){

        mostrarToast("Agenda atualizada");
    }
}
