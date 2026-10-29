// ======================================
// TRANSPORTADORAS - CADASTRO (TELA)
// ======================================
// Botões "+ Nova transportadora" e "Excluir transportadora" da barra.
// O acesso ao Supabase fica em transp-cad-banco.js. Carregar antes de
// transp-init.js.

function abrirFormNovaTransp(){

    $("formNovaTransp").style.display = "";

    $("nomeNovaTransp").value = "";

    $("nomeNovaTransp").focus();
}


function fecharFormNovaTransp(){

    $("formNovaTransp").style.display = "none";
}


// guarda a transportadora escolhida (a página lembra na próxima abertura)
function escolherTransportadora(nome){

    transpAtual = nome;

    try{

        localStorage.setItem(CHAVE_TRANSP_ULTIMA, transpAtual);

    }catch(erro){

        console.error("Erro ao salvar transportadora:", erro);
    }

    desenharSelectTransportadora();

    return recarregarTransp();
}


async function adicionarTransportadoraTransp(){

    if(salvandoTransp) return;

    const nome =
        $("nomeNovaTransp").value
            .trim()
            .replace(/\s+/g, " ");

    if(!nome){

        return mostrarToast("Informe o nome da transportadora", true);
    }

    const jaExiste =
        transpLista.some(
            existente =>
                existente.toLowerCase() === nome.toLowerCase()
        );

    if(jaExiste){

        return mostrarToast("Essa transportadora já está cadastrada", true);
    }

    salvandoTransp = true;

    try{

        await adicionarTransportadoraBanco(nome);

    }catch(erro){

        console.error("[transportadoras] Falha ao adicionar:", detalhesErroTransp(erro));

        salvandoTransp = false;

        // 23505 = já existe (alguém cadastrou ao mesmo tempo)
        return mostrarToast(
            erro.code === "23505"
                ? "Essa transportadora já está cadastrada"
                : "Erro ao adicionar a transportadora",
            true
        );
    }

    salvandoTransp = false;

    transpLista =
        [...transpLista, nome]
            .sort((a, b) => a.localeCompare(b, "pt-BR"));

    fecharFormNovaTransp();

    mostrarToast("Transportadora adicionada");

    // a nova transportadora já fica selecionada
    await escolherTransportadora(nome);
}


// "2 motorista(s), 1 veículo(s) e 5 agendamento(s)"
function textoUsosTransportadora(usos){

    const partes = [];

    if(usos.motoristas) partes.push(`${usos.motoristas} motorista(s)`);

    if(usos.veiculos) partes.push(`${usos.veiculos} veículo(s)`);

    if(usos.agendamentos) partes.push(`${usos.agendamentos} agendamento(s)`);

    return partes.join(", ").replace(/, ([^,]*)$/, " e $1");
}


// só exclui se não tiver motorista, veículo nem agendamento usando
async function excluirTransportadoraAtual(){

    if(!transpAtual || salvandoTransp) return;

    const nome = transpAtual;

    salvandoTransp = true;

    try{

        const usos = await contarUsosTransportadora(nome);

        if(usos.motoristas || usos.veiculos || usos.agendamentos){

            salvandoTransp = false;

            return mostrarToast(
                `${nome} não pode ser excluída: tem ${textoUsosTransportadora(usos)}. ` +
                "Exclua ou mude esses itens antes.",
                true
            );
        }

        if(!confirm(`Excluir a transportadora ${nome}?`)){

            salvandoTransp = false;

            return;
        }

        await excluirTransportadoraBanco(nome);

    }catch(erro){

        console.error("[transportadoras] Falha ao excluir:", detalhesErroTransp(erro));

        salvandoTransp = false;

        return mostrarToast("Erro ao excluir a transportadora", true);
    }

    salvandoTransp = false;

    transpLista = transpLista.filter(item => item !== nome);

    mostrarToast("Transportadora excluída");

    await escolherTransportadora(transpLista[0] || "");
}


(function iniciarCadastroTransp(){

    $("nomeNovaTransp").addEventListener(
        "keydown",
        (evento) => {

            if(evento.key === "Enter") adicionarTransportadoraTransp();

            if(evento.key === "Escape") fecharFormNovaTransp();
        }
    );

})();
