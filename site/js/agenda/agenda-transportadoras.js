// ======================================
// AGENDA - TRANSPORTADORAS (LEITURA)
// ======================================
// Carrega a lista de transportadoras para os campos e filtros da agenda.
// Cadastrar e excluir transportadora: só o admin, na página
// transportadoras.html.

// ======================================
// TRANSPORTADORAS
// ======================================
// A lista não é fixa: vem da tabela "transportadoras". Os agendamentos
// e motoristas guardam só o nome da transportadora.

async function carregarTransportadoras(){

    try{

        const { data, error } =
            await comTempoLimite(
                supabaseClient
                    .from(TABELA_TRANSPORTADORAS)
                    .select("id, nome")
                    .order("nome"),
                TEMPO_LIMITE_CARGA_MS
            );

        if(error) throw error;

        definirTransportadoras(data);

        guardarCopiaOffline("transportadoras", data);

    }catch(erro){

        // sem internet: a cópia do aparelho (agenda-offline-dados.js)
        const copia = erroDeRede(erro) ? await lerCopiaOffline("transportadoras") : null;

        if(copia){

            definirTransportadoras(copia.valor);

            return;
        }

        console.error("[transportadoras] Falha ao carregar:", detalhesErro(erro));

        mostrarToast("Falha ao carregar as transportadoras", true);
    }
}


function definirTransportadoras(lista){

    transportadorasCadastradas =
        lista
            .slice()
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    TRANSPORTADORAS =
        transportadorasCadastradas.map(item => item.nome);
}


// refaz a lista de transportadora do formulário (mantém a escolha atual)
function atualizarSelectsTransportadora(){

    const atual = $("agTransportadora").value;

    garantirOpcaoTransportadora(atual);

    $("agTransportadora").value = atual;
}
