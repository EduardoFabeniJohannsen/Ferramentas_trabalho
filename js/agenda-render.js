// ======================================
// AGENDA - DESENHO DA LISTA
// ======================================
// Chips de transportadora, select de ordem, controles do modo e renderizarAgenda().
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// DESENHAR
// ======================================

function desenharChips(){

    const area = $("chipsTransportadora");

    area.innerHTML = "";

    const base =
        filtrarAgendamentos(true);

    const opcoes = [
        { valor: "", rotulo: "Todas" },
        ...TRANSPORTADORAS.map(nome => ({ valor: nome, rotulo: nome })),
        { valor: SEM_TRANSPORTADORA, rotulo: "Sem transportadora" }
    ];

    opcoes.forEach(opcao => {

        const quantidade =
            base.filter(item => {

                if(opcao.valor === "") return true;

                if(opcao.valor === SEM_TRANSPORTADORA){

                    return !item.transportadora;
                }

                return item.transportadora === opcao.valor;

            }).length;

        const botao =
            criar(
                "button",
                "chip" + (filtroTransportadora === opcao.valor ? " ativo" : ""),
                `${opcao.rotulo} (${quantidade})`
            );

        botao.type = "button";

        botao.addEventListener(
            "click",
            () => {

                filtroTransportadora = opcao.valor;

                renderizarAgenda();
            }
        );

        area.appendChild(botao);
    });
}


function atualizarSelectOrdem(){

    const select = $("ordemAgenda");

    const expedicao =
        modoVisualizacao === "expedicao";

    select.innerHTML = "";

    ORDENS.forEach(ordem => {

        // entregas/coletas primeiro não faz sentido na expedição
        if(ordem.soTransportador && expedicao) return;

        const opcao = criar("option", "", ordem.rotulo);

        opcao.value = ordem.valor;

        select.appendChild(opcao);
    });

    select.value = ordemEfetiva();
}


function definirOrdem(valor){

    ordemAgenda = valor;

    try{

        localStorage.setItem(
            CHAVE_AGENDA_ORDEM,
            ordemAgenda
        );

    }catch(erro){

        console.error("Erro ao salvar ordem:", erro);
    }

    renderizarAgenda();
}


function atualizarControlesModo(){

    const expedicao =
        modoVisualizacao === "expedicao";

    $("btnModoExpedicao").classList.toggle("ativo", expedicao);

    $("btnModoTransportador").classList.toggle("ativo", !expedicao);

    // na expedição só tem entrega, então o filtro de tipo some
    $("filtroTipo").style.display =
        expedicao ? "none" : "";

    atualizarSelectOrdem();

    // só aparece quando as colunas estão fora da ordem padrão
    $("btnColunasPadrao").style.display =
        ordemColunasPersonalizada() ? "" : "none";

    $("dicaModo").innerText =
        expedicao
            ? "Só entregas e trocas que ainda não saíram, sem endereço e sem valor. Inclui as sem data (preparar). Arraste os títulos das colunas para mudar a ordem."
            : "Informação completa. Só o que já tem data definida. Arraste os títulos das colunas para mudar a ordem.";
}


function renderizarAgenda(){

    atualizarControlesModo();

    desenharChips();

    atualizarBotaoDatas();

    atualizarBotaoStatus();

    const lista = $("listaAgenda");

    lista.innerHTML = "";

    lista.className = "lista-" + modoVisualizacao;

    const filtrados =
        ordenarAgendamentos(filtrarAgendamentos(false));

    $("contagemAgenda").innerText =
        `${filtrados.length} agendamento(s)`;

    if(!filtrados.length){

        lista.appendChild(
            criar(
                "div",
                "agenda-vazia",
                carregandoAgenda
                    ? "Carregando..."
                    : (erroAgenda || "Nenhum agendamento encontrado")
            )
        );

        return;
    }

    const tabela = criar("table", "ag-tabela");

    tabela.appendChild(criarCabecalhoAgenda());

    const corpo = criar("tbody");

    // +2 = coluna da proposta e coluna dos botões
    const totalColunas = colunasAtuais().length + 2;

    let dataAtual = null;

    filtrados.forEach(item => {

        const corDoItem = corDoDia(item.data);

        if(item.data !== dataAtual){

            dataAtual = item.data;

            const linhaDia = criar("tr", "ag-dia");

            // cor do dia: o cabeçalho, a borda e o fundo dos itens usam ela
            linhaDia.style.setProperty("--cor-dia", corDoItem);

            const cabecalhoDia =
                criar(
                    "th",
                    "",
                    item.data
                        ? tituloDoDia(item.data)
                        : "📌 Sem data definida — iniciar preparativos"
                );

            cabecalhoDia.colSpan = totalColunas;

            linhaDia.appendChild(cabecalhoDia);

            corpo.appendChild(linhaDia);
        }

        const linha = criarItemAgenda(item);

        linha.style.setProperty("--cor-dia", corDoItem);

        corpo.appendChild(linha);
    });

    tabela.appendChild(corpo);

    lista.appendChild(tabela);
}
