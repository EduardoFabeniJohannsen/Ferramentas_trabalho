// ======================================
// LEADS - CONFIGURAÇÃO DE BUSCA
// ======================================
// Janela com as configurações que o agente externo lê.

// ======================================
// CONFIGURAÇÃO DE BUSCA
// ======================================

// "Itajaí, Brusque; Joinville" -> ["Itajaí", "Brusque", "Joinville"]
function separarListaConfig(texto){

    return [
        ...new Set(
            String(texto || "")
                .split(/[,;\n]/)
                .map(parte => parte.trim())
                .filter(Boolean)
        )
    ];
}


async function carregarConfigsBusca(){

    const { data, error } =
        await supabaseClient
            .from(TABELA_LEADS_CONFIG)
            .select("*")
            .order("nome");

    if(error){

        console.error("[leads] Falha ao carregar as configurações:", error);

        mostrarToast(mensagemErroLeads(error), true);

        return;
    }

    configsBusca = data;
}


function resumoConfig(config){

    return [
        (config.cidades || []).join(", "),
        config.uf,
        (config.segmentos || []).join(", "),
        (config.portes || []).map(rotuloPorteLead).join(", "),
        config.palavras_chave
    ]
        .filter(Boolean)
        .join(" · ");
}


function desenharConfigsBusca(){

    const lista = $("listaConfigBusca");

    lista.innerHTML = "";

    if(!configsBusca.length){

        lista.appendChild(
            criar("p", "dica-leads", "Nenhuma configuração criada.")
        );

        return;
    }

    configsBusca.forEach(config => {

        const linha =
            criar("div", "config-busca" + (config.ativo ? "" : " inativa"));

        const info = criar("div", "config-busca-info");

        info.appendChild(
            criar(
                "strong",
                "",
                config.nome + (config.ativo ? "" : " (desativada)")
            )
        );

        info.appendChild(criar("small", "", resumoConfig(config)));

        const botoes = criar("div", "config-busca-botoes");

        botoes.appendChild(
            criarBotaoLead("✏️ Editar", "btn-secundario", () => editarConfigBusca(config))
        );

        botoes.appendChild(
            criarBotaoLead(
                config.ativo ? "Desativar" : "Ativar",
                config.ativo ? "btn-secundario" : "",
                () => alternarConfigBusca(config)
            )
        );

        linha.append(info, botoes);

        lista.appendChild(linha);
    });
}


function desenharPortesConfig(){

    const area = $("configPortes");

    area.innerHTML = "";

    PORTES_LEADS.forEach(porte => {

        const rotulo = criar("label");

        const caixa = criar("input");

        caixa.type = "checkbox";

        caixa.value = porte.valor;

        rotulo.append(caixa, porte.rotulo);

        area.appendChild(rotulo);
    });
}


function limparFormConfig(){

    idConfigEditando = null;

    $("tituloFormConfig").innerText = "Nova configuração";

    ["configNome", "configCidades", "configUf", "configSegmentos", "configPalavras"]
        .forEach(id => { $(id).value = ""; });

    document
        .querySelectorAll("#configPortes input")
        .forEach(caixa => { caixa.checked = false; });
}


function editarConfigBusca(config){

    idConfigEditando = config.id;

    $("tituloFormConfig").innerText = `Editando: ${config.nome}`;

    $("configNome").value = config.nome || "";

    $("configCidades").value = (config.cidades || []).join(", ");

    $("configUf").value = config.uf || "";

    $("configSegmentos").value = (config.segmentos || []).join(", ");

    $("configPalavras").value = config.palavras_chave || "";

    document
        .querySelectorAll("#configPortes input")
        .forEach(caixa => {

            caixa.checked = (config.portes || []).includes(caixa.value);
        });

    $("configNome").focus();
}


async function salvarConfigBusca(){

    const nome = $("configNome").value.trim();

    if(!nome) return mostrarToast("Informe o nome da configuração", true);

    const dados = {
        nome,
        cidades: separarListaConfig($("configCidades").value),
        uf: $("configUf").value.trim().toUpperCase() || null,
        segmentos: separarListaConfig($("configSegmentos").value),
        portes:
            Array.from(document.querySelectorAll("#configPortes input:checked"))
                .map(caixa => caixa.value),
        palavras_chave: $("configPalavras").value.trim() || null
    };

    const consulta =
        idConfigEditando
            ? supabaseClient
                .from(TABELA_LEADS_CONFIG)
                .update(dados)
                .eq("id", idConfigEditando)
            : supabaseClient
                .from(TABELA_LEADS_CONFIG)
                .insert(dados);

    const { data, error } = await consulta.select();

    if(error || !data.length){

        console.error("[leads] Falha ao salvar a configuração:", error);

        return mostrarToast("Erro ao salvar a configuração", true);
    }

    limparFormConfig();

    await carregarConfigsBusca();

    desenharConfigsBusca();

    mostrarToast("Configuração salva");
}


async function alternarConfigBusca(config){

    const { data, error } =
        await supabaseClient
            .from(TABELA_LEADS_CONFIG)
            .update({ ativo: !config.ativo })
            .eq("id", config.id)
            .select();

    if(error || !data.length){

        console.error("[leads] Falha ao alterar a configuração:", error);

        return mostrarToast("Erro ao alterar a configuração", true);
    }

    config.ativo = data[0].ativo;

    desenharConfigsBusca();
}


async function abrirConfigBusca(){

    $("modalConfigBusca").classList.add("aberto");

    limparFormConfig();

    await carregarConfigsBusca();

    desenharConfigsBusca();
}


function fecharConfigBusca(){

    $("modalConfigBusca").classList.remove("aberto");
}
