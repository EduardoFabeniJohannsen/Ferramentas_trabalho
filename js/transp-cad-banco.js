// ======================================
// TRANSPORTADORAS - CADASTRO (SUPABASE)
// ======================================
// Adicionar e excluir transportadoras (tabela "transportadoras"). Só o admin
// cadastra: a página é restrita e o RLS no Supabase é quem protege os dados.
// A tela dos botões fica em transp-cad-tela.js.

async function adicionarTransportadoraBanco(nome){

    return exigirDados(
        await supabaseClient
            .from(TRANSP_TABELAS.transportadoras)
            .insert({ nome: nome })
            .select("nome")
            .single()
    );
}


// quantos motoristas, veículos e agendamentos usam a transportadora
// (a consulta no banco pega também os agendamentos antigos)
async function contarUsosTransportadora(nome){

    const contar = async (tabela) => {

        const { count, error } =
            await supabaseClient
                .from(tabela)
                .select("id", { count: "exact", head: true })
                .eq("transportadora", nome);

        if(error) throw error;

        return count || 0;
    };

    const [motoristas, veiculos, agendamentos] = await Promise.all([
        contar(TRANSP_TABELAS.motoristas),
        contar(TRANSP_TABELAS.veiculos),
        contar(TRANSP_TABELAS.agendamentos)
    ]);

    return { motoristas, veiculos, agendamentos };
}


async function excluirTransportadoraBanco(nome){

    const excluidas = exigirDados(
        await supabaseClient
            .from(TRANSP_TABELAS.transportadoras)
            .delete()
            .eq("nome", nome)
            .select()
    );

    if(!excluidas.length){

        throw new Error("Nada foi excluído (sem permissão ou já excluída)");
    }
}
