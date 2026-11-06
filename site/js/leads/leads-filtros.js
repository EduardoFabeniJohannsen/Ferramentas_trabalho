// ======================================
// LEADS - FILTROS
// ======================================
// Monta os filtros de cidade, segmento, porte e status e aplica na lista.

// ======================================
// FILTROS
// ======================================

// valores que existem nos leads, sem repetir ("Itajaí" e "ITAJAI" são um só)
function opcoesDoCampo(campo){

    const opcoes = new Map();

    leads.forEach(lead => {

        const chave = semAcentoLeads(lead[campo]);

        if(chave && !opcoes.has(chave)) opcoes.set(chave, String(lead[campo]).trim());
    });

    return [...opcoes.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
}


// troca as opções sem perder o que está escolhido
function preencherSelectLeads(id, todos, opcoes){

    const select = $(id);

    const atual = select.value;

    select.innerHTML = "";

    const primeira = criar("option", "", todos);

    primeira.value = "";

    select.appendChild(primeira);

    opcoes.forEach(([valor, rotulo]) => {

        const opcao = criar("option", "", rotulo);

        opcao.value = valor;

        select.appendChild(opcao);
    });

    if([...select.options].some(opcao => opcao.value === atual)){

        select.value = atual;
    }
}


// todos os filtros menos o status (a seção "em andamento" usa o resto)
function passaNosFiltros(lead){

    const busca = semAcentoLeads($("buscaLeads").value);

    const cidade = $("filtroCidade").value;

    const segmento = $("filtroSegmento").value;

    const porte = $("filtroPorte").value;

    if(busca && !semAcentoLeads(lead.empresa).includes(busca)) return false;

    if(cidade && semAcentoLeads(lead.cidade) !== cidade) return false;

    if(segmento && semAcentoLeads(lead.segmento) !== segmento) return false;

    if(porte && lead.porte !== porte) return false;

    return true;
}
