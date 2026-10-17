// ======================================
// AGENDA - FILTRO DE DATAS
// ======================================
// Painel de datas estilo Excel e atalhos (hoje / próximos dias).
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// FILTRO DE DATAS (estilo Excel)
// ======================================
// Ao abrir a página todas as datas aparecem. No botão "📅 Datas" você
// vê a lista de datas (com caixinhas) e desmarca as que não quer ver.

function semAcentoMinusculo(texto){

    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}


// datas da lista: as dos agendamentos que aparecem no modo atual (respeitando
// os outros filtros), sem data primeiro e depois em ordem. As desmarcadas
// ficam na lista mesmo que sumam dos outros filtros, pra dar pra marcar de novo.
function datasDoFiltro(){

    const datas = new Set();

    filtrarAgendamentos(false, true).forEach(item => {

        datas.add(item.data || "");
    });

    datasOcultas.forEach(data => datas.add(data));

    return [...datas].sort((a, b) => {

        if(a === b) return 0;

        if(!a) return -1;

        if(!b) return 1;

        return a < b ? -1 : 1;
    });
}


// 14/10/2026 — quarta-feira (hoje)
function rotuloDataFiltro(iso){

    if(!iso) return "(Sem data definida)";

    const data = new Date(iso + "T00:00:00");

    let rotulo =
        `${formatarData(data)} — ${DIAS_SEMANA[data.getDay()].toLowerCase()}`;

    if(iso === dataISO(0)) rotulo += " (hoje)";

    if(iso === dataISO(1)) rotulo += " (amanhã)";

    return rotulo;
}


// texto do botão: mostra quando tem data desmarcada
function atualizarBotaoDatas(){

    const botao = $("btnDatas");

    const datas = datasDoFiltro();

    const ocultas =
        datas.filter(data => datasOcultas.has(data)).length;

    botao.innerText =
        ocultas
            ? `📅 Datas: ${datas.length - ocultas} de ${datas.length} ▾`
            : "📅 Todas as datas ▾";

    botao.classList.toggle("filtrando", ocultas > 0);
}


function desenharPainelDatas(){

    const lista = $("listaDatasFiltro");

    const rolagem = lista.scrollTop;

    lista.innerHTML = "";

    const datas = datasDoFiltro();

    // "(Selecionar tudo)": marcado, desmarcado ou meio-termo
    const marcadas =
        datas.filter(data => !datasOcultas.has(data)).length;

    const todas = $("marcarTodasDatas");

    todas.checked = datas.length > 0 && marcadas === datas.length;

    todas.indeterminate = marcadas > 0 && marcadas < datas.length;

    const busca = semAcentoMinusculo($("buscaDatas").value.trim());

    datas.forEach(data => {

        const texto = rotuloDataFiltro(data);

        if(busca && !semAcentoMinusculo(texto).includes(busca)) return;

        const rotulo = criar("label", "data-opcao");

        const caixa = criar("input");

        caixa.type = "checkbox";

        caixa.checked = !datasOcultas.has(data);

        caixa.addEventListener(
            "change",
            () => {

                if(caixa.checked){

                    datasOcultas.delete(data);

                }else{

                    datasOcultas.add(data);
                }

                renderizarAgenda();

                desenharPainelDatas();
            }
        );

        rotulo.appendChild(caixa);

        rotulo.appendChild(criar("span", "", texto));

        lista.appendChild(rotulo);
    });

    lista.scrollTop = rolagem;
}


function alternarPainelDatas(){

    const painel = $("painelDatas");

    if(painel.classList.contains("aberto")){

        fecharPainelDatas();

        return;
    }

    $("buscaDatas").value = "";

    // um painel de cada vez
    fecharPainelStatus();

    desenharPainelDatas();

    painel.classList.add("aberto");
}


function fecharPainelDatas(){

    $("painelDatas").classList.remove("aberto");
}


// "(Selecionar tudo)": marca todas as datas ou desmarca todas
function alternarTodasDatas(){

    if($("marcarTodasDatas").checked){

        datasOcultas.clear();

    }else{

        datasDoFiltro().forEach(data => datasOcultas.add(data));
    }

    renderizarAgenda();

    desenharPainelDatas();
}


// atalhos: marca só as datas de hoje até daqui a N dias (0 = só hoje)
function selecionarProximosDias(dias){

    const hoje = dataISO(0);

    const limite = dataISO(dias);

    datasOcultas = new Set(
        datasDoFiltro().filter(data =>
            !data || data < hoje || data > limite
        )
    );

    renderizarAgenda();

    desenharPainelDatas();
}
