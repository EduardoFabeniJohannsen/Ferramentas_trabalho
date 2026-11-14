// ======================================
// WEG - TÍTULO DO ORÇAMENTO
// ======================================
// Botão "📋 Copiar título" ao lado do documento (fora da área de print): o nome
// do orçamento no mesmo padrão da "Proposta ZOHO" da página de Propostas,
// CLIENTE_MODELOS_PERÍODO, com a unidade da WEG como cliente.
// Ex: "WEG JARAGUÁ DO SUL_WTE10 + 2 WAE12_3 PERIODOS". O título aparece em cima
// dos botões e muda junto com a tela. Carregar antes de weg-init.js.

// "WEG JARAGUÁ DO SUL" (a unidade escolhida no frete)
function clienteTituloWEG() {

    const unidade =
        $("unidadeWEG")?.value || contratoWEG.unidadesWEG[0];

    return `WEG ${unidade}`.toUpperCase();
}


// "WTE10 + 2 WAE12": na ordem do documento; quantidade só quando passa de 1
function modelosTituloWEG() {

    return contratoWEG.itens
        .filter((item) => obterQuantidade(item.modelo) > 0)
        .sort((a, b) => ordemDoGrupo(a.modelo) - ordemDoGrupo(b.modelo))
        .map((item) => {

            const quantidade = obterQuantidade(item.modelo);

            return quantidade > 1 ? `${quantidade} ${item.modelo}` : item.modelo;
        })
        .join(" + ");
}


// como na Proposta ZOHO: 1 período = "30 DIAS"; mais de um = "3 PERIODOS"
function periodoTituloWEG() {

    const periodos = obterPeriodos();

    return periodos > 1
        ? `${periodos} PERIODOS`
        : `${contratoWEG.periodoDias} DIAS`;
}


// sem equipamento escolhido não tem título
function tituloOrcamentoWEG() {

    const modelos = modelosTituloWEG();

    if (!modelos) return "";

    return `${clienteTituloWEG()}_${modelos}_${periodoTituloWEG()}`;
}


function desenharTituloWEG() {

    const titulo = tituloOrcamentoWEG();

    const area = $("tituloWEG");

    area.innerText = titulo || "Escolha um equipamento para ver o título";

    area.classList.toggle("vazio", !titulo);
}


function copiarTituloWEG() {

    const titulo = tituloOrcamentoWEG();

    if (!titulo) {

        mostrarToast("Escolha pelo menos um equipamento", true);

        return;
    }

    copiar(titulo, "Título copiado");
}
