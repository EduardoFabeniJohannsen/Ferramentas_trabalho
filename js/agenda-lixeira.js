// ======================================
// AGENDA - LIXEIRA (só admin)
// ======================================
// Excluir um agendamento só manda para a lixeira (excluido_em preenchido,
// pela função mover_agendamento_lixeira do banco). Quem não é admin não vê
// mais esse agendamento (RLS). O admin abre a lixeira pelo botão 🗑️ Lixeira:
// restaura ou apaga de vez do banco (junto com o PDF do pedido, se tiver).
// Carregar antes de agenda-init.js.

// o que está aberto no modal da lixeira
let itensLixeira = [];


// manda para a lixeira; false = já não estava na agenda
async function moverParaLixeiraBanco(id){

    const { data, error } =
        await supabaseClient.rpc("mover_agendamento_lixeira", { p_id: id });

    if(error) throw error;

    avisarMudancaNaAgenda();

    return data === true;
}


async function carregarLixeira(){

    const { data, error } =
        await supabaseClient
            .from(TABELA_AGENDAMENTOS)
            .select("*")
            .not("excluido_em", "is", null)
            .order("excluido_em", { ascending: false });

    if(error) throw error;

    return data.map(linha => ({
        ...doBanco(linha),
        excluidoEm: linha.excluido_em,
        excluidoPor: linha.excluido_por || ""
    }));
}


// "2026-10-30" -> "30/10/2026"
function dataLixeira(iso){

    const [ano, mes, dia] = String(iso || "").split("-");

    return dia ? `${dia}/${mes}/${ano}` : "sem data";
}


function quandoExcluido(iso){

    const data = new Date(iso);

    if(isNaN(data)) return "";

    const hora =
        `${String(data.getHours()).padStart(2, "0")}:${String(data.getMinutes()).padStart(2, "0")}`;

    return `${formatarData(data)} ${hora}`;
}


function desenharLixeira(){

    const lista = $("listaLixeira");

    lista.innerHTML = "";

    if(!itensLixeira.length){

        lista.appendChild(criar("p", "agenda-vazia", "A lixeira está vazia."));

        return;
    }

    itensLixeira.forEach(item => {

        const linha = criar("div", "item-lixeira");

        const info = criar("div", "item-lixeira-info");

        info.appendChild(
            criar(
                "strong",
                "",
                `${item.tipo} · ${dataLixeira(item.data)} · ${item.plataforma || "sem equipamento"}`
            )
        );

        info.appendChild(
            criar("span", "", item.cliente || item.destinoNome || item.origemNome || "")
        );

        info.appendChild(
            criar(
                "small",
                "",
                `Excluído em ${quandoExcluido(item.excluidoEm)}${item.excluidoPor ? ` por ${item.excluidoPor}` : ""}`
            )
        );

        const botoes = criar("div", "item-lixeira-botoes");

        const restaurar = criar("button", "btn-secundario", "↩️ Restaurar");

        restaurar.type = "button";

        restaurar.addEventListener("click", () => restaurarDaLixeira(item));

        const apagar = criar("button", "btn-perigo", "Apagar de vez");

        apagar.type = "button";

        apagar.addEventListener("click", () => apagarDeVez(item));

        botoes.append(restaurar, apagar);

        linha.append(info, botoes);

        lista.appendChild(linha);
    });
}


async function abrirLixeira(){

    $("modalLixeira").classList.add("aberto");

    $("listaLixeira").innerHTML = "";

    $("listaLixeira").appendChild(criar("p", "agenda-vazia", "Carregando..."));

    try{

        itensLixeira = await carregarLixeira();

    }catch(erro){

        console.error("[agenda] Falha ao abrir a lixeira:", detalhesErro(erro));

        itensLixeira = [];

        mostrarToast("Falha ao carregar a lixeira", true);
    }

    desenharLixeira();
}


function fecharLixeira(){

    $("modalLixeira").classList.remove("aberto");
}


async function restaurarDaLixeira(item){

    try{

        const { data, error } =
            await supabaseClient
                .from(TABELA_AGENDAMENTOS)
                .update({ excluido_em: null, excluido_por: null })
                .eq("id", item.id)
                .select();

        if(error) throw error;

        if(!data.length) throw new Error("Agendamento não encontrado");

    }catch(erro){

        console.error("[agenda] Falha ao restaurar:", detalhesErro(erro));

        mostrarToast("Erro ao restaurar o agendamento", true);

        return;
    }

    avisarMudancaNaAgenda();

    itensLixeira = itensLixeira.filter(ag => ag.id !== item.id);

    desenharLixeira();

    mostrarToast("Agendamento restaurado");

    // volta para a lista (se estiver dentro dos dias que a agenda carrega)
    recarregarAgenda(false);
}


async function apagarDeVez(item){

    if(!confirm(
        `Apagar de vez ${item.plataforma} — ${item.cliente}?\n\nIsso não pode ser desfeito.`
    )) return;

    try{

        await excluirAgendamentoBanco(item.id);

    }catch(erro){

        console.error("[agenda] Falha ao apagar de vez:", detalhesErro(erro));

        mostrarToast("Erro ao apagar o agendamento", true);

        return;
    }

    // sem agendamento, não sobra o PDF do pedido
    await removerPedidoPdfStorage(item.pedidoPdfCaminho);

    itensLixeira = itensLixeira.filter(ag => ag.id !== item.id);

    desenharLixeira();

    mostrarToast("Agendamento apagado do banco");
}
