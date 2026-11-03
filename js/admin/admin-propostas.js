// ======================================
// ADMIN - PROPOSTAS ZAP COPIADAS
// ======================================
// Tabela com cada "Copiar Proposta Zap" (propostas-registro.js grava): quem fez,
// aparelho e cidade, cliente, equipamentos com desconto, total, configurações e a
// mensagem copiada. Só o admin lê (RLS). As linhas são montadas em
// admin-propostas-linhas.js.

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

    desenharPropostasAdmin();
}


// filtro de usuário + busca por cliente, cidade ou modelo
function propostasVisiveis(){

    const usuario = $("filtroPropostasUsuario").value;

    const busca = semAcento($("buscaPropostas").value).trim().toLowerCase();

    return propostasAdmin.filter(proposta => {

        if(usuario && proposta.usuario_email !== usuario) return false;

        if(!busca) return true;

        const modelos =
            (proposta.dados?.equipamentos || []).map(item => item.modelo).join(" ");

        return semAcento(`${proposta.cliente} ${proposta.cidade} ${modelos}`)
            .toLowerCase()
            .includes(busca);
    });
}


function desenharFiltroPropostas(){

    const select = $("filtroPropostasUsuario");

    const escolhido = select.value;

    const usuarios =
        [...new Set(propostasAdmin.map(proposta => proposta.usuario_email))]
            .sort((a, b) => a.localeCompare(b));

    select.innerHTML = "";

    select.appendChild(criar("option", "", "Todos os usuários"));

    select.firstChild.value = "";

    usuarios.forEach(email => {

        const opcao = criar("option", "", email || "(sem e-mail)");

        opcao.value = email;

        select.appendChild(opcao);
    });

    select.value = usuarios.includes(escolhido) ? escolhido : "";
}


function desenharPropostasAdmin(){

    desenharFiltroPropostas();

    const visiveis = propostasVisiveis();

    const corpo = $("corpoPropostas");

    corpo.innerHTML = "";

    visiveis.forEach(proposta => corpo.appendChild(criarLinhaProposta(proposta)));

    if(!visiveis.length){

        const linha = criar("tr");

        const celula =
            criar(
                "td",
                "erros-vazio",
                carregandoPropostasAdmin
                    ? "Carregando..."
                    : (falhaPropostasAdmin || `Nenhuma Proposta Zap copiada nos últimos ${DIAS_PROPOSTAS_ADMIN} dias`)
            );

        celula.colSpan = 7;

        linha.appendChild(celula);

        corpo.appendChild(linha);
    }

    const noLimite = propostasAdmin.length >= LIMITE_PROPOSTAS_ADMIN;

    $("contagemPropostas").innerText =
        visiveis.length
            ? `${visiveis.length} proposta(s)${noLimite ? ` (só as ${LIMITE_PROPOSTAS_ADMIN} mais recentes)` : ""}`
            : "";
}
