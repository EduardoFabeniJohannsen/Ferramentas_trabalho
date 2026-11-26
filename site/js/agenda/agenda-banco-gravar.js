// ======================================
// AGENDA - GRAVAR AGENDAMENTOS
// ======================================
// inserirAgendamento() e atualizarAgendamento(): gravam no banco com tempo limite e, sem internet (ou sem resposta), vão para a fila do aparelho (agenda-offline-fila.js) e a tela já mostra (item.pendenteOffline). O agendamento novo leva a coluna id_local: repetir não grava duas vezes (se o banco ainda não tem a coluna, grava sem ela). inserirNoBanco()/atualizarNoBanco() são os mesmos sem a fila (a fila usa eles para subir). Carregar depois de agenda-banco.js.

// o banco ainda não tem a coluna id_local (SQL não aplicado): grava sem ela
let semColunaIdLocal = false;

// coluna id_local (agendamento criado neste aparelho): se o banco ainda não tem
function faltaColunaIdLocal(erro){

    return (
        ["PGRST204", "42703"].includes(erro?.code) ||
        /column/i.test(String(erro?.message || ""))
    ) && /id_local/.test(String(erro?.message || ""));
}


// grava e devolve a linha do banco. Com idLocal: se já tinha chegado (tentativa
// que ficou sem resposta), devolve a que está lá em vez de gravar outra
async function inserirNoBanco(dados, idLocal){

    const linha = paraBanco(dados);

    if(idLocal && !semColunaIdLocal) linha.id_local = idLocal;

    const gravar = () =>
        comTempoLimite(
            supabaseClient
                .from(TABELA_AGENDAMENTOS)
                .insert(linha)
                .select()
                .single(),
            TEMPO_LIMITE_GRAVAR_MS
        );

    let { data, error } = await gravar();

    if(error && linha.id_local && faltaColunaIdLocal(error)){

        semColunaIdLocal = true;

        delete linha.id_local;

        ({ data, error } = await gravar());
    }

    if(error && linha.id_local && error.code === "23505" && /id_local/.test(`${error.message} ${error.details}`)){

        const jaGravado =
            await comTempoLimite(
                supabaseClient
                    .from(TABELA_AGENDAMENTOS)
                    .select("*")
                    .eq("id_local", linha.id_local)
                    .maybeSingle(),
                TEMPO_LIMITE_GRAVAR_MS
            );

        if(jaGravado.error) throw jaGravado.error;

        if(jaGravado.data) return jaGravado.data;
    }

    if(error) throw error;

    return data;
}


// .select() devolve as linhas alteradas: se vier vazio, o agendamento
// não existe mais (alguém excluiu) ou o RLS bloqueou
async function atualizarNoBanco(id, dados){

    const { data, error } =
        await comTempoLimite(
            supabaseClient
                .from(TABELA_AGENDAMENTOS)
                .update(paraBanco(dados))
                .eq("id", id)
                .select(),
            TEMPO_LIMITE_GRAVAR_MS
        );

    if(error) throw error;

    if(!data.length){

        throw new Error("Agendamento não encontrado (foi excluído?)");
    }

    return data[0];
}


// sem internet (ou sem resposta): vai para a fila do aparelho e a tela já
// mostra (item.pendenteOffline)
async function inserirAgendamento(dados){

    const idLocal = novoIdLocal();

    if(navigator.onLine === false) return gravarOffline("inserir", null, dados, idLocal);

    try{

        const linha = await inserirNoBanco(dados, idLocal);

        avisarMudancaNaAgenda();

        return doBanco(linha);

    }catch(erro){

        if(!erroDeRede(erro)) throw erro;

        // o mesmo id_local: se a tentativa chegou, não grava duas vezes
        return gravarOffline("inserir", null, dados, idLocal);
    }
}


async function atualizarAgendamento(id, dados){

    // criado sem internet que já subiu: o id do banco
    const idAtual = filaOffline.ids[id] ?? id;

    // sem internet, ainda não subiu ou com outra mudança dele esperando: entra na fila
    if(
        navigator.onLine === false ||
        idSoDoAparelho(idAtual) ||
        temPendenciaOffline(idAtual)
    ){
        return gravarOffline("atualizar", idAtual, dados);
    }

    try{

        const linha = await atualizarNoBanco(idAtual, dados);

        avisarMudancaNaAgenda();

        return { ...doBanco(linha), pendenteOffline: false, erroOffline: "" };

    }catch(erro){

        if(!erroDeRede(erro)) throw erro;

        return gravarOffline("atualizar", idAtual, dados);
    }
}
