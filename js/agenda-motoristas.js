// ======================================
// AGENDA - CADASTRO DE MOTORISTAS
// ======================================
// Carregar e adicionar motoristas; modal de cadastro. Excluir motorista: só admin, em transportadoras.html.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// MOTORISTAS (cadastro por transportadora)
// ======================================
// Ao escolher a transportadora no agendamento, o campo motorista
// só oferece os motoristas cadastrados nela.

async function carregarMotoristas(){

    try{

        const { data, error } =
            await supabaseClient
                .from(TABELA_MOTORISTAS)
                .select("id, transportadora, nome")
                .order("nome");

        if(error) throw error;

        motoristasCadastrados = data;

    }catch(erro){

        console.error("[motoristas] Falha ao carregar:", detalhesErro(erro));

        mostrarToast("Falha ao carregar os motoristas", true);
    }
}


// nomes dos motoristas de uma transportadora, em ordem alfabética
function motoristasDe(transportadora){

    return motoristasCadastrados
        .filter(item => item.transportadora === transportadora)
        .map(item => item.nome)
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
}


// monta as opções do campo motorista do agendamento
function atualizarOpcoesMotorista(transportadora, motoristaAtual){

    const select = $("agMotorista");

    select.innerHTML = "";

    const vazio =
        criar(
            "option",
            "",
            transportadora ? "Sem motorista" : "Escolha a transportadora"
        );

    vazio.value = "";

    select.appendChild(vazio);

    const nomes = motoristasDe(transportadora);

    nomes.forEach(nome => {

        const opcao = criar("option", "", nome);

        opcao.value = nome;

        select.appendChild(opcao);
    });

    // motorista que não está (mais) no cadastro: mantém, pra não perder o dado
    if(motoristaAtual && !nomes.includes(motoristaAtual)){

        const extra =
            criar("option", "", `${motoristaAtual} (fora do cadastro)`);

        extra.value = motoristaAtual;

        select.appendChild(extra);
    }

    select.disabled =
        !transportadora && !motoristaAtual;

    select.value = motoristaAtual || "";
}


// ---------- modal de cadastro ----------

function abrirModalMotoristas(){

    $("modalMotoristas").classList.add("aberto");

    desenharTransportadoras();

    desenharMotoristas();

    $("transNome").focus();
}


function fecharModalMotoristas(){

    $("modalMotoristas").classList.remove("aberto");
}


function desenharMotoristas(){

    const lista = $("listaMotoristasCadastro");

    lista.innerHTML = "";

    const transportadora =
        $("motTransportadora").value;

    const motoristas =
        motoristasCadastrados
            .filter(item => item.transportadora === transportadora)
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    if(!motoristas.length){

        lista.appendChild(
            criar("div", "mot-vazio", "Nenhum motorista cadastrado")
        );

        return;
    }

    motoristas.forEach(motorista => {

        const linha = criar("div", "mot-linha");

        linha.appendChild(criar("span", "", motorista.nome));

        lista.appendChild(linha);
    });
}


async function adicionarMotorista(){

    const transportadora =
        $("motTransportadora").value;

    const nome =
        $("motNome").value
            .trim()
            .replace(/\s+/g, " ");

    if(!transportadora){

        return mostrarToast("Cadastre uma transportadora primeiro", true);
    }

    if(!nome){

        return mostrarToast("Informe o nome do motorista", true);
    }

    const jaExiste =
        motoristasDe(transportadora).some(
            existente =>
                existente.toLowerCase() === nome.toLowerCase()
        );

    if(jaExiste){

        return mostrarToast("Esse motorista já está cadastrado", true);
    }

    const { data, error } =
        await supabaseClient
            .from(TABELA_MOTORISTAS)
            .insert({ transportadora: transportadora, nome: nome })
            .select("id, transportadora, nome")
            .single();

    if(error){

        console.error("[motoristas] Falha ao adicionar:", detalhesErro(error));

        // 23505 = já existe (alguém cadastrou ao mesmo tempo)
        return mostrarToast(
            error.code === "23505"
                ? "Esse motorista já está cadastrado"
                : "Erro ao adicionar o motorista",
            true
        );
    }

    motoristasCadastrados.push(data);

    $("motNome").value = "";

    desenharMotoristas();

    mostrarToast("Motorista adicionado");
}
