// ======================================
// AGENDA - FILTRO DE TIPO (só no transportador)
// ======================================
// Igual ao de status: no botão "Tipos" vem a lista com caixinhas e dá para
// marcar a combinação que quiser ver (ex: Entrega + Coleta). Os tipos
// desmarcados ficam salvos por usuário neste navegador (agendaTipos).
// Na expedição o filtro some e não vale: lá os tipos já são os de TIPOS_EXPEDICAO.


function chaveTiposFiltro(){

    return `${CHAVE_AGENDA_TIPOS}:${usuarioAgenda || "local"}`;
}


// põe em tiposOcultos o que está salvo (ao abrir, quando sabe quem é o usuário)
function carregarTiposFiltro(){

    const lista = lerLocalJSON(chaveTiposFiltro(), []);

    tiposOcultos = new Set(
        Array.isArray(lista)
            ? lista.filter(tipo => TIPOS.includes(tipo))
            : []
    );
}


function salvarTiposFiltro(){

    gravarLocalJSON(chaveTiposFiltro(), [...tiposOcultos]);
}


// o filtro de tipo está escondendo algo agora?
function filtrandoTipos(){

    return modoVisualizacao !== "expedicao" && tiposOcultos.size > 0;
}


function tiposMarcados(){

    return TIPOS.filter(tipo => !tiposOcultos.has(tipo));
}


// "Entrega + Coleta" (até dois tipos o nome cabe; mais que isso, "3 de 5")
function nomesTiposMarcados(){

    const marcados = tiposMarcados();

    if(!marcados.length) return "nenhum";

    if(marcados.length > 2) return `${marcados.length} de ${TIPOS.length}`;

    return marcados.map(rotuloTipo).join(" + ");
}


// para o aviso da linha da contagem: "tipo Entrega + Coleta"
function textoTiposFiltro(){

    return tiposMarcados().length ? `tipo ${nomesTiposMarcados()}` : "nenhum tipo";
}


// quantos agendamentos tem em cada tipo (sem aplicar o próprio filtro de tipo)
function contagemPorTipo(){

    const contagem = {};

    filtrarAgendamentos("tipo").forEach(item => {

        contagem[item.tipo] = (contagem[item.tipo] || 0) + 1;
    });

    return contagem;
}


// texto do botão: todos marcados, os nomes ou "N de M"
function atualizarBotaoTipos(){

    const botao = $("btnTipos");

    const filtrando = tiposOcultos.size > 0;

    const plural = tiposMarcados().length === 1 ? "Tipo" : "Tipos";

    botao.innerText =
        filtrando
            ? `📦 ${plural}: ${nomesTiposMarcados()} ▾`
            : "📦 Todos os tipos ▾";

    botao.classList.toggle("filtrando", filtrando);

    // lista aberta: a contagem acompanha os outros filtros (ex: trocou a transportadora)
    if($("painelTipos").classList.contains("aberto")) desenharPainelTipos();
}


function desenharPainelTipos(){

    const lista = $("listaTiposFiltro");

    lista.innerHTML = "";

    const contagem = contagemPorTipo();

    marcarCaixaTodos("marcarTodosTipos", tiposMarcados().length, TIPOS.length);

    TIPOS.forEach(tipo => {

        // a mesma etiqueta colorida da coluna Tipo
        const tag = criar("span", "tag", rotuloTipo(tipo));

        tag.dataset.tipo = tipo;

        lista.appendChild(
            criarOpcaoFiltro(tag, !tiposOcultos.has(tipo), contagem[tipo], (marcado) => {

                if(marcado){

                    tiposOcultos.delete(tipo);

                }else{

                    tiposOcultos.add(tipo);
                }

                salvarTiposFiltro();

                // redesenha a lista junto (atualizarBotaoTipos)
                renderizarAgenda();
            })
        );
    });
}


function alternarPainelTipos(){

    const painel = $("painelTipos");

    if(painel.classList.contains("aberto")){

        fecharPainelTipos();

        return;
    }

    // um painel de cada vez
    fecharListasFiltro();

    desenharPainelTipos();

    painel.classList.add("aberto");
}


function fecharPainelTipos(){

    $("painelTipos").classList.remove("aberto");
}


// "(Selecionar tudo)": marca todos os tipos ou desmarca todos
function alternarTodosTipos(){

    if($("marcarTodosTipos").checked){

        tiposOcultos.clear();

    }else{

        TIPOS.forEach(tipo => tiposOcultos.add(tipo));
    }

    salvarTiposFiltro();

    // redesenha a lista junto (atualizarBotaoTipos)
    renderizarAgenda();
}
