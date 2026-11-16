// ======================================
// AGENDA - LISTAS COM CAIXINHAS DO FILTRO
// ======================================
// O que as listas de datas, status, tipo e motorista têm em comum: uma aberta
// por vez, o "(Selecionar tudo)" e a linha [caixinha] nome (quantidade).
// Carregar depois de agenda-filtros.js e antes dos agenda-filtro-*.js.


// uma de cada vez: abrir uma lista fecha as outras
function fecharListasFiltro(){

    fecharPainelDatas();

    fecharPainelStatus();

    fecharPainelTipos();

    fecharPainelMotoristas();
}


// "(Selecionar tudo)": marcado, desmarcado ou meio-termo
function marcarCaixaTodos(id, marcados, total){

    const caixa = $(id);

    caixa.checked = total > 0 && marcados === total;

    caixa.indeterminate = marcados > 0 && marcados < total;
}


// uma linha da lista: [caixinha] conteúdo (quantidade)
function criarOpcaoFiltro(conteudo, marcado, quantidade, aoMudar){

    const rotulo = criar("label", "data-opcao");

    const caixa = criar("input");

    caixa.type = "checkbox";

    caixa.checked = marcado;

    caixa.addEventListener("change", () => aoMudar(caixa.checked));

    rotulo.appendChild(caixa);

    rotulo.appendChild(conteudo);

    rotulo.appendChild(
        criar("span", "contagem-status", `(${quantidade || 0})`)
    );

    return rotulo;
}
