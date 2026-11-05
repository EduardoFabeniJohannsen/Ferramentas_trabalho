// ======================================
// PROPOSTAS ZAP COPIADAS - DADOS
// ======================================
// Carrega cada "Copiar Proposta Zap" dos últimos 90 dias (até 500; propostas-registro.js grava; lê o admin e quem tem o acesso "propostas-copiadas", pela policy com tem_acesso), a contagem ("3 de 40" filtrando) e o aviso de lista vazia.
// Os filtros ficam em copiadas-filtros.js, as linhas em copiadas-linhas.js e o
// desconto médio por usuário em copiadas-descontos.js. As funções terminam em
// "Admin" porque a seção ficava na página Admin.

const TABELA_PROPOSTAS_ADMIN = "propostas_copiadas";

const DIAS_PROPOSTAS_ADMIN = 90;

const LIMITE_PROPOSTAS_ADMIN = 500;

let propostasAdmin = [];

let carregandoPropostasAdmin = true;

let falhaPropostasAdmin = "";


async function carregarPropostasAdmin(){

    carregandoPropostasAdmin = true;

    falhaPropostasAdmin = "";

    desenharPropostasAdmin();

    const limite =
        new Date(Date.now() - DIAS_PROPOSTAS_ADMIN * 86400000).toISOString();

    try{

        const { data, error } =
            await supabaseClient
                .from(TABELA_PROPOSTAS_ADMIN)
                .select("id, criado_em, usuario_email, cliente, cidade, valor_total, aparelho, dados, texto")
                .gte("criado_em", limite)
                .order("criado_em", { ascending: false })
                .limit(LIMITE_PROPOSTAS_ADMIN);

        if(error) throw error;

        propostasAdmin = data || [];

    }catch(erro){

        console.error("[admin] Falha ao carregar as propostas:", erro);

        propostasAdmin = [];

        falhaPropostasAdmin =
            (erro?.code === "42P01" || erro?.code === "PGRST205")
                ? "A tabela de propostas ainda não existe: rode o SQL no Supabase."
                : "Não foi possível carregar as propostas (verifique a conexão).";
    }

    carregandoPropostasAdmin = false;

    // opções dos filtros (copiadas-filtros.js) vêm do que carregou
    desenharFiltrosPropostas();

    desenharPropostasAdmin();
}


function textoVazioPropostas(){

    if(carregandoPropostasAdmin) return "Carregando...";

    if(falhaPropostasAdmin) return falhaPropostasAdmin;

    return propostasAdmin.length
        ? "Nenhuma proposta com esses filtros"
        : `Nenhuma Proposta Zap copiada nos últimos ${DIAS_PROPOSTAS_ADMIN} dias`;
}


function desenharPropostasAdmin(){

    const visiveis = propostasVisiveis();

    const corpo = $("corpoPropostas");

    corpo.innerHTML = "";

    visiveis.forEach(proposta => corpo.appendChild(criarLinhaProposta(proposta)));

    if(!visiveis.length){

        const linha = criar("tr");

        const celula = criar("td", "erros-vazio", textoVazioPropostas());

        celula.colSpan = 7;

        linha.appendChild(celula);

        corpo.appendChild(linha);
    }

    desenharDescontosPorUsuario(visiveis);

    // título da coluna em destaque quando ela filtra (copiadas-filtro-colunas.js)
    atualizarCabecalhoFiltros();

    const filtrando = filtrandoPropostas();

    $("btnLimparFiltrosPropostas").style.display = filtrando ? "" : "none";

    const noLimite = propostasAdmin.length >= LIMITE_PROPOSTAS_ADMIN;

    const quantas =
        filtrando
            ? `${visiveis.length} de ${propostasAdmin.length} proposta(s)`
            : `${visiveis.length} proposta(s)`;

    $("contagemPropostas").innerText =
        propostasAdmin.length
            ? `${quantas}${noLimite ? ` (só as ${LIMITE_PROPOSTAS_ADMIN} mais recentes)` : ""}`
            : "";
}
