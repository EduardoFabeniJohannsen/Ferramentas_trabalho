// ======================================
// LEADS - UTILITÁRIOS
// ======================================
// Rótulos de status e porte, nome a partir do e-mail e mensagem de erro.

// ======================================
// UTILITÁRIOS
// ======================================

function rotuloStatusLead(valor){

    const status = STATUS_LEADS.find(item => item.valor === valor);

    return status ? status.rotulo : valor;
}


function rotuloPorteLead(valor){

    const porte = PORTES_LEADS.find(item => item.valor === valor);

    return porte ? porte.rotulo : (valor || "");
}


// "eduardo.johannsen@..." -> "Eduardo Johannsen"
function nomeDoEmail(email){

    return String(email || "")
        .split("@")[0]
        .split(/[._-]+/)
        .filter(Boolean)
        .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
        .join(" ");
}


function mensagemErroLeads(erro){

    const codigo = erro?.code || "";

    if(codigo === "42P01" || codigo === "PGRST205"){

        return "As tabelas de leads ainda não existem: rode o leads.sql no Supabase.";
    }

    if(codigo === "42501"){

        return "Sem permissão. Peça ao admin para liberar o acesso a Leads.";
    }

    return "Não foi possível carregar os leads (verifique conexão/login).";
}
