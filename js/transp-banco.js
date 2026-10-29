// ======================================
// TRANSPORTADORAS - SUPABASE
// ======================================
// Leitura e gravação: transportadoras, veículos, dados dos motoristas e exclusões.
// Os PDFs (Storage e tabela de documentos) ficam em transp-docs.js.

// lança o erro do Supabase, ou devolve os dados
function exigirDados(resposta){

    if(resposta.error) throw resposta.error;

    return resposta.data;
}


function detalhesErroTransp(erro){

    return {
        mensagem: erro?.message,
        codigo: erro?.code,
        detalhes: erro?.details,
        dica: erro?.hint
    };
}


async function carregarListaTransportadoras(){

    const dados = exigirDados(
        await supabaseClient
            .from(TRANSP_TABELAS.transportadoras)
            .select("nome")
            .order("nome")
    );

    transpLista =
        dados
            .map(item => item.nome)
            .sort((a, b) => a.localeCompare(b, "pt-BR"));
}


// veículos, motoristas (já com CPF/nascimento/CNH) e documentos de uma
// transportadora (TRANSP_TODAS = de todas, em ordem de transportadora)
async function carregarDadosTransportadora(nome){

    const resultado = { veiculos: [], motoristas: [], docs: [] };

    if(!nome) return resultado;

    const todas = nome === TRANSP_TODAS;

    const consulta = (tabela, campos, ordem) => {

        let busca =
            supabaseClient
                .from(tabela)
                .select(campos);

        busca = todas
            ? busca.order("transportadora")
            : busca.eq("transportadora", nome);

        return busca.order(ordem);
    };

    const [respostaVeiculos, respostaMotoristas] = await Promise.all([

        consulta(TRANSP_TABELAS.veiculos, "*", "placa"),

        consulta(TRANSP_TABELAS.motoristas, "id, transportadora, nome", "nome")
    ]);

    const veiculos = exigirDados(respostaVeiculos);

    const motoristas = exigirDados(respostaMotoristas);

    const idsVeiculos = veiculos.map(item => item.id);

    const idsMotoristas = motoristas.map(item => item.id);

    const vazio = Promise.resolve({ data: [], error: null });

    const [respostaDados, respostaDocsVeiculos, respostaDocsMotoristas] =
        await Promise.all([

            idsMotoristas.length
                ? supabaseClient
                    .from(TRANSP_TABELAS.motoristasDados)
                    .select("*")
                    .in("motorista_id", idsMotoristas)
                : vazio,

            idsVeiculos.length
                ? supabaseClient
                    .from(TRANSP_TABELAS.docs)
                    .select("*")
                    .in("veiculo_id", idsVeiculos)
                    .order("criado_em")
                : vazio,

            idsMotoristas.length
                ? supabaseClient
                    .from(TRANSP_TABELAS.docs)
                    .select("*")
                    .in("motorista_id", idsMotoristas)
                    .order("criado_em")
                : vazio
        ]);

    const dadosPorId = {};

    exigirDados(respostaDados).forEach(item => {

        dadosPorId[item.motorista_id] = item;
    });

    resultado.veiculos = veiculos;

    resultado.motoristas =
        motoristas.map(motorista => {

            const dados = dadosPorId[motorista.id] || {};

            return {
                id: motorista.id,
                transportadora: motorista.transportadora,
                nome: motorista.nome,
                cpf: dados.cpf || "",
                data_nascimento: dados.data_nascimento || "",
                cnh: dados.cnh || ""
            };
        });

    resultado.docs = [
        ...exigirDados(respostaDocsVeiculos),
        ...exigirDados(respostaDocsMotoristas)
    ];

    return resultado;
}


// ======================================
// VEÍCULOS
// ======================================

// id vazio = novo veículo; com id = atualiza
async function salvarVeiculoBanco(dados, id){

    const tabela =
        supabaseClient.from(TRANSP_TABELAS.veiculos);

    const lista = exigirDados(
        await (
            id
                ? tabela.update(dados).eq("id", id).select()
                : tabela.insert(dados).select()
        )
    );

    if(!lista.length){

        throw new Error("Veículo não encontrado (foi excluído?)");
    }

    return lista[0];
}


// os documentos do veículo saem juntos (cascade); os PDFs são apagados do bucket
async function excluirVeiculoBanco(id){

    const caminhos =
        docsTransp
            .filter(doc => doc.veiculo_id === id)
            .map(doc => doc.caminho);

    const excluidos = exigirDados(
        await supabaseClient
            .from(TRANSP_TABELAS.veiculos)
            .delete()
            .eq("id", id)
            .select()
    );

    if(!excluidos.length){

        throw new Error("Nada foi excluído (sem permissão ou já excluído)");
    }

    await removerArquivosStorage(caminhos);
}


// ======================================
// MOTORISTAS
// ======================================
// A tabela "motoristas" é a mesma que a agenda usa. CPF, nascimento e CNH ficam
// em "motoristas_dados" (só admin lê), pra a agenda não enxergar dados pessoais.

async function adicionarMotoristaBanco(transportadora, nome){

    return exigirDados(
        await supabaseClient
            .from(TRANSP_TABELAS.motoristas)
            .insert({ transportadora: transportadora, nome: nome })
            .select("id, transportadora, nome")
            .single()
    );
}


// troca o nome e leva junto os agendamentos (eles guardam o nome como texto)
async function renomearMotoristaBanco(motorista, nomeNovo){

    const alterados = exigirDados(
        await supabaseClient
            .from(TRANSP_TABELAS.motoristas)
            .update({ nome: nomeNovo })
            .eq("id", motorista.id)
            .select("id")
    );

    if(!alterados.length){

        throw new Error("Nome não alterado (sem permissão ou motorista excluído)");
    }

    exigirDados(
        await supabaseClient
            .from(TRANSP_TABELAS.agendamentos)
            .update({ motorista: nomeNovo })
            .eq("transportadora", motorista.transportadora)
            .eq("motorista", motorista.nome)
            .select("id")
    );
}


async function salvarDadosMotoristaBanco(motoristaId, dados){

    return exigirDados(
        await supabaseClient
            .from(TRANSP_TABELAS.motoristasDados)
            .upsert(
                { motorista_id: motoristaId, ...dados },
                { onConflict: "motorista_id" }
            )
            .select()
            .single()
    );
}


// o banco não deixa excluir motorista que ainda tem dados ou documentos,
// então apaga na ordem: documentos, dados, motorista e por fim os PDFs
async function excluirMotoristaBanco(id){

    const caminhos =
        docsTransp
            .filter(doc => doc.motorista_id === id)
            .map(doc => doc.caminho);

    exigirDados(
        await supabaseClient
            .from(TRANSP_TABELAS.docs)
            .delete()
            .eq("motorista_id", id)
            .select()
    );

    exigirDados(
        await supabaseClient
            .from(TRANSP_TABELAS.motoristasDados)
            .delete()
            .eq("motorista_id", id)
            .select()
    );

    const excluidos = exigirDados(
        await supabaseClient
            .from(TRANSP_TABELAS.motoristas)
            .delete()
            .eq("id", id)
            .select()
    );

    if(!excluidos.length){

        throw new Error("Nada foi excluído (sem permissão ou já excluído)");
    }

    await removerArquivosStorage(caminhos);
}
