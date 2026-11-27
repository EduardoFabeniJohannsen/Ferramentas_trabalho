// ======================================
// ADMIN - SUPABASE (perfis)
// ======================================
// Ler e salvar os acessos de cada usuário (tabela "perfis").
// Só admin enxerga todos e altera (policies de RLS). Sem a coluna motorista_id
// no banco (SQL do login de motorista não aplicado), lê e salva sem ela.

// com a coluna do login de motorista (perfis.motorista_id) quando o banco já tem
function camposPerfisAdmin(){

    return "id, email, acessos, filiais, ativo" + (semColunaMotoristaAdmin ? "" : ", motorista_id");
}


async function carregarPerfisAdmin(){

    $("contagemUsuarios").innerText = "Carregando...";

    try{

        const consultar = () =>
            supabaseClient
                .from(TABELA_PERFIS)
                .select(camposPerfisAdmin())
                .order("email");

        let { data, error } = await consultar();

        // SQL do login de motorista ainda não aplicado: o resto funciona sem a coluna
        if(error && !semColunaMotoristaAdmin && faltaColunaMotoristaAdmin(error)){

            semColunaMotoristaAdmin = true;

            ({ data, error } = await consultar());
        }

        if(error) throw error;

        perfisAdmin = data;

    }catch(erro){

        console.error("[admin] Falha ao carregar:", erro);

        perfisAdmin = [];

        mostrarToast("Falha ao carregar os usuários", true);
    }

    desenharPerfis();

    // o painel de online usa os e-mails que acabaram de chegar
    desenharUsuariosOnline();
}


// .select() devolve as linhas alteradas: se vier vazio, o RLS
// bloqueou (sem erro explícito) — não é admin. Devolve true se salvou.
async function salvarPerfilAdmin(perfil, dados){

    const { data, error } =
        await supabaseClient
            .from(TABELA_PERFIS)
            .update(dados)
            .eq("id", perfil.id)
            .select(camposPerfisAdmin());

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


// Cria o usuário pela Edge Function "criar-usuario" (só admin; a
// service_role fica no servidor). Nasce só com "propostas".
// Devolve { id, email } ou { erro }.
async function criarUsuarioAdmin(email, senha){

    const { data, error } =
        await supabaseClient.functions.invoke(
            "criar-usuario",
            { body: { email: email, senha: senha } }
        );

    if(error){

        console.error("[admin] Falha ao criar usuário:", error);

        let mensagem = "Erro ao criar o usuário";

        // a função devolve { erro } no corpo da resposta
        try{

            const corpo = await error.context.json();

            if(corpo?.erro) mensagem = corpo.erro;

        }catch(erroLeitura){

            // sem corpo legível: fica a mensagem padrão
        }

        return { erro: mensagem };
    }

    return { id: data.id, email: data.email };
}
