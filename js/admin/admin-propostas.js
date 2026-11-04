// ======================================
// ADMIN - PROPOSTAS ZAP COPIADAS
// ======================================
// Tabela com cada "Copiar Proposta Zap" (propostas-registro.js grava): quem fez,
// aparelho e cidade, cliente, equipamentos com desconto, total, configurações e a
// mensagem copiada. Só o admin lê (RLS). Os filtros ficam em
// admin-propostas-filtros.js, as linhas são montadas em admin-propostas-linhas.js e o
// desconto médio por usuário em admin-propostas-descontos.js.

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

    // opções dos filtros (admin-propostas-filtros.js) vêm do que carregou
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
