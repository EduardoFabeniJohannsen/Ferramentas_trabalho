// ======================================
// ADMIN - SUPABASE (perfis)
// ======================================
// Ler e salvar os acessos de cada usuário (tabela "perfis").
// Só admin enxerga todos e altera (policies de RLS).

async function carregarPerfisAdmin(){

    $("contagemUsuarios").innerText = "Carregando...";

    try{

        const { data, error } =
            await supabaseClient
                .from(TABELA_PERFIS)
                .select("id, email, acessos, filiais, ativo")
                .order("email");

        if(error) throw error;

        perfisAdmin = data;

    }catch(erro){

        console.error("[admin] Falha ao carregar:", erro);

        perfisAdmin = [];

        mostrarToast("Falha ao carregar os usuários", true);
    }

    desenharPerfis();
}


// .select() devolve as linhas alteradas: se vier vazio, o RLS
// bloqueou (sem erro explícito) — não é admin. Devolve true se salvou.
async function salvarPerfilAdmin(perfil, dados){

    const { data, error } =
        await supabaseClient
            .from(TABELA_PERFIS)
            .update(dados)
            .eq("id", perfil.id)
            .select("id, email, acessos, filiais, ativo");

    if(error || !data || !data.length){

        console.error("[admin] Falha ao salvar:", error);

        mostrarToast(
            error
                ? "Erro ao salvar"
                : "Sem permissão para alterar (entre como admin)",
            true
        );

        return false;
    }

    Object.assign(perfil, data[0]);

    mostrarToast("Salvo");

    return true;
}
