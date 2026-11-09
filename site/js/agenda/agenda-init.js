// ======================================
// AGENDA - INIT
// ======================================
// Ligações de eventos e carga inicial. Sempre o ÚLTIMO script da página.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// INIT
// ======================================

(function init(){

    preencherSelect("filtroTipo", TIPOS, "Todos os tipos", rotuloTipo);

    preencherSelect("agTipo", TIPOS, undefined, rotuloTipo);

    // transferência entre unidades: as caixas de saída e destino (agenda-unidades.js)
    prepararSelectsUnidades();

    ["agUnidadeSaida", "agUnidadeDestino"].forEach(id => {

        $(id).addEventListener("change", aplicarUnidades);
    });

    preencherSelect("agStatus", STATUS_AGENDA);

    preencherSelect("agTransportadora", TRANSPORTADORAS, "Sem transportadora");

    [ "filtroTipo" ].forEach(id => {

        $(id).addEventListener(
            "change",
            renderizarAgenda
        );
    });

    // trocou a transportadora: o motorista antigo não vale mais
    $("agTransportadora").addEventListener(
        "change",
        () => atualizarOpcoesMotorista($("agTransportadora").value, "")
    );

    $("agFreteConta").addEventListener(
        "change",
        atualizarCamposConta
    );

    // frete dividido: a conta do cliente acompanha o que for digitado
    ["agFrete", "agFreteNossa"].forEach(id =>
        $(id).addEventListener("input", atualizarTextoFreteCliente)
    );

    // filtro de datas: busca, "selecionar tudo" e fechar ao clicar fora
    $("buscaDatas").addEventListener("input", desenharPainelDatas);

    $("marcarTodasDatas").addEventListener("change", alternarTodasDatas);

    $("marcarTodosStatus").addEventListener("change", alternarTodosStatus);

    document.addEventListener("click", (evento) => {

        // o clique redesenhou o que foi clicado (ex: chip da transportadora):
        // ele já saiu da página e não dá pra saber onde estava
        if(!evento.target.isConnected) return;

        if(!evento.target.closest(".filtro-geral")){

            fecharPainelFiltros();
        }

        if(!evento.target.closest(".filtro-datas")){

            fecharPainelDatas();
        }

        if(!evento.target.closest(".filtro-status")){

            fecharPainelStatus();
        }

        if(!evento.target.closest(".filtro-colunas")){

            fecharPainelColunas();
        }

        if(!evento.target.closest(".filtro-botoes")){

            fecharPainelBotoes();
        }
    });

    $("agTipo").addEventListener(
        "change",
        atualizarCamposTipo
    );

    // pesquisa por endereço, cliente ou patrimônio (Esc limpa)
    $("buscaAgenda").addEventListener("input", digitarBuscaAgenda);

    $("buscaAgenda").addEventListener(
        "keydown",
        evento => {

            if(evento.key === "Escape" && $("buscaAgenda").value){

                evento.stopPropagation();

                limparBuscaAgenda();
            }
        }
    );

    // retirada recolhida (entrega): clique ou Enter abre e fecha
    $("tituloRetirada").addEventListener("click", alternarRetirada);

    $("tituloRetirada").addEventListener(
        "keydown",
        evento => {

            if(evento.key === "Enter" || evento.key === " "){

                evento.preventDefault();

                alternarRetirada();
            }
        }
    );

    // plataformas sempre em maiúsculo enquanto digita (as linhas de
    // equipamento vão juntas para o campo escondido agPlataforma)
    $("listaPlataformas").addEventListener("input", digitarPlataforma);

    $("agPlataformaRecolha").addEventListener("input", forcarMaiusculo);

    // horário: números viram HH:MM sozinhos
    $("agHorario").addEventListener("input", mascararCampoHorario);

    // cliente: sugere os anteriores e puxa endereço, contato e e-mails
    ligarSugestoesClientes();

    // período: sugestões enquanto digita e formato certo ao sair do campo
    $("agPeriodo").addEventListener("input", atualizarSugestoesPeriodo);

    $("agPeriodo").addEventListener(
        "change",
        () => {

            const resultado =
                normalizarPeriodo($("agPeriodo").value);

            if(resultado.valor !== undefined){

                $("agPeriodo").value = resultado.valor;
            }
        }
    );

    // rascunho: guarda sozinho o que for digitado no formulário
    $("modalAgenda").addEventListener("input", agendarRascunho);

    $("modalAgenda").addEventListener("change", agendarRascunho);

    $("ordemAgenda").addEventListener(
        "change",
        () => definirOrdem($("ordemAgenda").value)
    );

    if(lerLocal(CHAVE_AGENDA_MODO) === "expedicao"){

        modoVisualizacao = "expedicao";
    }

    aplicarTema(lerLocal(CHAVE_AGENDA_TEMA));

    const ordemSalva = lerLocal(CHAVE_AGENDA_ORDEM);

    if(ORDENS.some(ordem => ordem.valor === ordemSalva)){

        ordemAgenda = ordemSalva;
    }

    // mostra "Carregando...", descobre quem está logado (a ordem das colunas
    // é de cada usuário) e busca tudo no Supabase
    renderizarAgenda();

    obterUsuarioAgenda().then(usuario => {

        usuarioAgenda = usuario;

        carregarOrdemColunas();

        carregarColunasVisiveis();

        carregarBotoesLinha();

        // os status desmarcados no filtro (salvos por usuário e por modo)
        carregarStatusFiltro();

        recarregarAgenda(false);

        // mudou algo em outro navegador: atualiza aqui (agenda-tempo-real.js)
        iniciarTempoReal();
    });

    // várias pessoas usam: ao voltar pra aba, atualiza se passou um tempo
    document.addEventListener("visibilitychange", () => {

        if(document.visibilityState !== "visible") return;

        if(Date.now() - ultimoCarregamento < INTERVALO_RECARGA_MS) return;

        // com um formulário aberto não recarrega
        if(document.querySelector(".modal-overlay.aberto")) return;

        recarregarAgenda(false);
    });

})();
