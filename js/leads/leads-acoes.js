// ======================================
// LEADS - AÇÕES
// ======================================
// Vou chamar (só um pega) e resultado do contato.

// ======================================
// AÇÕES
// ======================================

// A condição chamado_por vazio é que garante um só: se duas pessoas clicarem
// juntas, o banco só altera para a primeira e a outra recebe zero linhas.
async function pegarLead(lead){

    const { data, error } =
        await supabaseClient
            .from(TABELA_LEADS)
            .update({
                status: "chamado",
                chamado_por: usuarioLeads.id,
                chamado_por_email: usuarioLeads.email,
                chamado_em: new Date().toISOString()
            })
            .eq("id", lead.id)
            .is("chamado_por", null)
            .select();

    if(error){

        console.error("[leads] Falha ao marcar:", error);

        return mostrarToast("Erro ao marcar o lead", true);
    }

    if(data.length){

        Object.assign(lead, data[0]);

        desenharLeads();

        return mostrarToast("Lead marcado: é com você");
    }

    // alguém pegou antes: mostra quem foi
    await carregarLeads();

    desenharLeads();

    const atual = leads.find(item => item.id === lead.id);

    mostrarToast(
        atual && atual.chamado_por
            ? `${atual.chamado_por_email || "Outra pessoa"} pegou este lead em ${dataHoraBR(atual.chamado_em)}`
            : "Este lead mudou. A lista foi atualizada.",
        true
    );
}


// status = "interessado", "sem_interesse", "ja_cliente" ou "novo" (não atendeu: libera o lead)
async function registrarResultado(lead, status){

    const dados =
        status === "novo"
            ? { status, chamado_por: null, chamado_por_email: null, chamado_em: null }
            : { status };

    let consulta =
        supabaseClient
            .from(TABELA_LEADS)
            .update(dados)
            .eq("id", lead.id);

    // sem isso, a tela velha mexeria num lead que já passou para outra pessoa
    if(!adminLeads){

        consulta =
            lead.chamado_por
                ? consulta.eq("chamado_por", usuarioLeads.id)
                : consulta.is("chamado_por", null);
    }

    const { data, error } = await consulta.select();

    if(error){

        console.error("[leads] Falha ao registrar o resultado:", error);

        return mostrarToast("Erro ao registrar o resultado", true);
    }

    if(!data.length){

        await carregarLeads();

        desenharLeads();

        return mostrarToast("Este lead não está mais com você. A lista foi atualizada.", true);
    }

    Object.assign(lead, data[0]);

    desenharLeads();

    mostrarToast(
        status === "novo"
            ? "Lead voltou para os novos"
            : `Marcado como ${rotuloStatusLead(status)}`
    );
}
