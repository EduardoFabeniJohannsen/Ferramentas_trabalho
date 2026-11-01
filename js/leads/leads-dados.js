// ======================================
// LEADS - CARREGAR
// ======================================
// Busca os leads e a última busca do agente, e recarrega a tela.

// ======================================
// CARREGAR
// ======================================

// o Supabase devolve no máximo 1000 linhas por consulta
async function carregarLeads(){

    erroLeads = "";

    try{

        const tamanhoPagina = 1000;

        let inicio = 0;

        let linhas = [];

        while(true){

            const { data, error } =
                await supabaseClient
                    .from(TABELA_LEADS)
                    .select("*")
                    .order("created_at", { ascending: false })
                    .order("id")
                    .range(inicio, inicio + tamanhoPagina - 1);

            if(error) throw error;

            linhas = linhas.concat(data);

            if(data.length < tamanhoPagina) break;

            inicio += tamanhoPagina;
        }

        leads = linhas;

    }catch(erro){

        console.error("[leads] Falha ao carregar:", erro);

        erroLeads = mensagemErroLeads(erro);
    }

    carregandoLeads = false;

    ultimaCargaLeads = Date.now();
}


// sem resultado (agente ainda não ativado) a linha só não aparece
async function carregarUltimaBusca(){

    const { data, error } =
        await supabaseClient
            .from("leads_buscas")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

    if(error){

        console.error("[leads] Falha ao ler a última busca:", error);

        return;
    }

    ultimaBuscaAgente = data;
}


function desenharUltimaBusca(){

    const aviso = $("ultimaBusca");

    const busca = ultimaBuscaAgente;

    aviso.style.display = busca ? "" : "none";

    if(!busca) return;

    const atrasada =
        Date.now() - new Date(busca.created_at).getTime() > LIMITE_BUSCA_ATRASADA_MS;

    aviso.classList.toggle("atrasada", atrasada);

    aviso.textContent =
        `${atrasada ? "⚠️ O agente não rodou nas últimas 24 horas. " : "🤖 "}` +
        `Última busca: ${dataHoraBR(busca.created_at)}, ` +
        `${busca.inseridos} novo(s), ${busca.repetidos} já na lista`;
}


async function recarregarLeads(manual){

    await Promise.all([carregarLeads(), carregarUltimaBusca()]);

    desenharUltimaBusca();

    desenharLeads();

    if(manual && !erroLeads) mostrarToast("Leads atualizados");
}
