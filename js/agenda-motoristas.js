// ======================================
// AGENDA - MOTORISTAS (LEITURA)
// ======================================
// Carrega os motoristas e monta as opções do formulário. Cadastrar e
// excluir motorista: só o admin, na página transportadoras.html.

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
