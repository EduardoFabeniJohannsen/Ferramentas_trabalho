// ======================================
// AGENDA - INIT
// ======================================
// Ligações de eventos e carga inicial. Sempre o ÚLTIMO script da página.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// INIT
// ======================================

(function init(){

    preencherSelect("filtroTipo", TIPOS, "Todos os tipos");

    preencherSelect("agTipo", TIPOS);

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

    // filtro de datas: busca, "selecionar tudo" e fechar ao clicar fora
    $("buscaDatas").addEventListener("input", desenharPainelDatas);

    $("marcarTodasDatas").addEventListener("change", alternarTodasDatas);

    $("marcarTodosStatus").addEventListener("change", alternarTodosStatus);

    document.addEventListener("click", (evento) => {

        if(!evento.target.closest(".filtro-datas")){

            fecharPainelDatas();
        }

        if(!evento.target.closest(".filtro-status")){

            fecharPainelStatus();
        }
    });

    $("agTipo").addEventListener(
        "change",
        atualizarCamposTipo
    );

    // plataformas sempre em maiúsculo enquanto digita
    $("agPlataforma").addEventListener("input", forcarMaiusculo);

    $("agPlataformaRecolha").addEventListener("input", forcarMaiusculo);

    // horário: números viram HH:MM sozinhos
    $("agHorario").addEventListener("input", mascararCampoHorario);

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

    try{

        if(localStorage.getItem(CHAVE_AGENDA_MODO) === "expedicao"){

            modoVisualizacao = "expedicao";
        }

        aplicarTema(localStorage.getItem(CHAVE_AGENDA_TEMA));

        const ordemSalva =
            localStorage.getItem(CHAVE_AGENDA_ORDEM);

        if(ORDENS.some(ordem => ordem.valor === ordemSalva)){

            ordemAgenda = ordemSalva;
        }

    }catch(erro){

        console.error("Erro ao ler modo/ordem:", erro);
    }

    // mostra "Carregando...", descobre quem está logado (a ordem das colunas
    // é de cada usuário) e busca tudo no Supabase
    renderizarAgenda();

    obterUsuarioAgenda().then(usuario => {

        usuarioAgenda = usuario;

        carregarOrdemColunas();

        recarregarAgenda(false);
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
