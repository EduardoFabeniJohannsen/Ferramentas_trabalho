// ======================================
// AGENDA - CADASTRO DE TRANSPORTADORAS
// ======================================
// Carregar, adicionar e excluir transportadoras.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// TRANSPORTADORAS (cadastro)
// ======================================
// A lista não é mais fixa: vem da tabela "transportadoras". Os
// agendamentos e motoristas guardam só o nome da transportadora.

async function carregarTransportadoras(){

    try{

        const { data, error } =
            await supabaseClient
                .from(TABELA_TRANSPORTADORAS)
                .select("id, nome")
                .order("nome");

        if(error) throw error;

        definirTransportadoras(data);

    }catch(erro){

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


// refaz as listas de transportadora dos formulários (mantém a escolha atual)
function atualizarSelectsTransportadora(){

    const atual = $("agTransportadora").value;

    garantirOpcaoTransportadora(atual);

    $("agTransportadora").value = atual;

    const atualMotoristas = $("motTransportadora").value;

    preencherSelect("motTransportadora", TRANSPORTADORAS);

    if(TRANSPORTADORAS.includes(atualMotoristas)){

        $("motTransportadora").value = atualMotoristas;
    }

    desenharTransportadoras();

    desenharMotoristas();
}


function desenharTransportadoras(){

    const lista = $("listaTransportadorasCadastro");

    lista.innerHTML = "";

    if(!transportadorasCadastradas.length){

        lista.appendChild(
            criar("div", "mot-vazio", "Nenhuma transportadora cadastrada")
        );

        return;
    }

    transportadorasCadastradas.forEach(transportadora => {

        const linha = criar("div", "mot-linha");

        linha.appendChild(criar("span", "", transportadora.nome));

        const botao = criar("button", "btn-secundario", "🗑️");

        botao.type = "button";

        botao.title = "Excluir transportadora";

        botao.addEventListener(
            "click",
            () => excluirTransportadora(transportadora.id)
        );

        linha.appendChild(botao);

        lista.appendChild(linha);
    });
}


async function adicionarTransportadora(){

    const nome =
        $("transNome").value
            .trim()
            .replace(/\s+/g, " ");

    if(!nome){

        return mostrarToast("Informe o nome da transportadora", true);
    }

    const jaExiste =
        TRANSPORTADORAS.some(
            existente =>
                existente.toLowerCase() === nome.toLowerCase()
        );

    if(jaExiste){

        return mostrarToast("Essa transportadora já está cadastrada", true);
    }

    const { data, error } =
        await supabaseClient
            .from(TABELA_TRANSPORTADORAS)
            .insert({ nome: nome })
            .select("id, nome")
            .single();

    if(error){

        console.error("[transportadoras] Falha ao adicionar:", detalhesErro(error));

        // 23505 = já existe (alguém cadastrou ao mesmo tempo)
        return mostrarToast(
            error.code === "23505"
                ? "Essa transportadora já está cadastrada"
                : "Erro ao adicionar a transportadora",
            true
        );
    }

    definirTransportadoras([...transportadorasCadastradas, data]);

    $("transNome").value = "";

    atualizarSelectsTransportadora();

    // a nova transportadora vira o filtro/chip da agenda
    renderizarAgenda();

    mostrarToast("Transportadora adicionada");
}


// só exclui se não tiver motorista cadastrado nem agendamento usando
// (a consulta no banco pega também os agendamentos antigos)
async function excluirTransportadora(id){

    const transportadora =
        transportadorasCadastradas.find(item => item.id === id);

    if(!transportadora) return;

    if(motoristasDe(transportadora.nome).length){

        return mostrarToast(
            `Exclua antes os motoristas da ${transportadora.nome}`,
            true
        );
    }

    const { count, error: erroContagem } =
        await supabaseClient
            .from(TABELA_AGENDAMENTOS)
            .select("id", { count: "exact", head: true })
            .eq("transportadora", transportadora.nome);

    if(erroContagem){

        console.error("[transportadoras] Falha ao conferir uso:", detalhesErro(erroContagem));

        return mostrarToast("Erro ao conferir se a transportadora está em uso", true);
    }

    if(count > 0){

        return mostrarToast(
            `${transportadora.nome} está em ${count} agendamento(s) e não pode ser excluída`,
            true
        );
    }

    if(!confirm(`Excluir a transportadora ${transportadora.nome}?`)) return;

    const { data, error } =
        await supabaseClient
            .from(TABELA_TRANSPORTADORAS)
            .delete()
            .eq("id", id)
            .select();

    if(error){

        console.error("[transportadoras] Falha ao excluir:", detalhesErro(error));

        return mostrarToast("Erro ao excluir a transportadora", true);
    }

    definirTransportadoras(
        transportadorasCadastradas.filter(item => item.id !== id)
    );

    // se era o filtro escolhido, volta pra "Todas"
    if(filtroTransportadora === transportadora.nome){

        filtroTransportadora = "";
    }

    atualizarSelectsTransportadora();

    renderizarAgenda();

    mostrarToast(
        data.length
            ? "Transportadora excluída"
            : "Essa transportadora já tinha sido excluída"
    );
}
