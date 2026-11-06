// ======================================
// LEADS - LISTA
// ======================================
// Contadores e desenho da lista (em andamento e novos).

// ======================================
// DESENHAR
// ======================================

function atualizarContadoresLeads(){

    const inicioDoDia = new Date();

    inicioDoDia.setHours(0, 0, 0, 0);

    const contar = (regra) => leads.filter(regra).length;

    $("contadorNovos").innerText =
        contar(lead => lead.status === "novo");

    $("contadorHoje").innerText =
        contar(lead => lead.chamado_em && new Date(lead.chamado_em) >= inicioDoDia);

    $("contadorInteressados").innerText =
        contar(lead => lead.status === "interessado");
}


function desenharLeads(){

    atualizarContadoresLeads();

    preencherSelectLeads("filtroCidade", "Todas as cidades", opcoesDoCampo("cidade"));

    preencherSelectLeads("filtroSegmento", "Todos os segmentos", opcoesDoCampo("segmento"));

    const status = $("filtroStatus").value;

    const filtrados = leads.filter(passaNosFiltros);

    const daLista =
        filtrados.filter(lead => !status || lead.status === status);

    // com o filtro "novo", quem está sendo chamado aparece em cima: sem isso
    // o lead sumiria da tela de quem acabou de pegar
    const emAndamento =
        status === "novo"
            ? filtrados.filter(lead => lead.status === "chamado")
            : [];

    // os meus primeiro
    emAndamento.sort((a, b) =>
        (b.chamado_por === usuarioLeads.id) - (a.chamado_por === usuarioLeads.id)
    );

    $("secaoAndamento").style.display = emAndamento.length ? "" : "none";

    $("tituloAndamento").innerText = `Em andamento (${emAndamento.length})`;

    const andamento = $("listaAndamento");

    andamento.innerHTML = "";

    emAndamento.forEach(lead => andamento.appendChild(criarCardLead(lead)));

    const lista = $("listaLeads");

    lista.innerHTML = "";

    daLista
        .slice(0, LIMITE_CARDS_LEADS)
        .forEach(lead => lista.appendChild(criarCardLead(lead)));

    $("contagemLeads").innerText =
        daLista.length > LIMITE_CARDS_LEADS
            ? `Mostrando ${LIMITE_CARDS_LEADS} de ${daLista.length} leads. Use os filtros para achar os outros.`
            : `${daLista.length} lead(s)`;

    const vazio = $("leadsVazio");

    vazio.style.display = daLista.length ? "none" : "";

    vazio.innerText =
        carregandoLeads
            ? "Carregando..."
            : (erroLeads || "Nenhum lead encontrado");
}
