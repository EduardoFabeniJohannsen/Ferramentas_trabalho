// ======================================
// PROPOSTAS ZAP COPIADAS - FILTROS
// ======================================
// Busca em qualquer campo (todas as palavras precisam aparecer, inclusive na mensagem), usuário, local de quem fez (cidade pelo IP), aparelho, modelo, prazo de pagamento (o que saiu na mensagem), faixa de desconto (o mesmo % da tabela; junto com o modelo vale para o mesmo equipamento) e faixa de data. As opções dos selects vêm das propostas carregadas.
// Carregar depois de copiadas-dados.js.

const IDS_FILTROS_PROPOSTAS = [
    "buscaPropostas",
    "filtroPropostasUsuario",
    "filtroPropostasLocal",
    "filtroPropostasAparelho",
    "filtroPropostasModelo",
    "filtroPropostasPrazo",
    "filtroPropostasDescontoMin",
    "filtroPropostasDescontoMax",
    "filtroPropostasDataDe",
    "filtroPropostasDataAte"
];

// valor do select para "sem e-mail", "sem cidade"... ("" é "todos")
const VAZIO_FILTRO_PROPOSTAS = "__vazio__";

// de onde cada select tira as opções e o valor de cada proposta
const SELECTS_FILTRO_PROPOSTAS = {
    filtroPropostasUsuario: {
        todos: "Todos os usuários",
        vazio: "(sem e-mail)",
        valores: (proposta) => [proposta.usuario_email]
    },
    filtroPropostasLocal: {
        todos: "Todos os locais",
        vazio: "(sem cidade)",
        valores: (proposta) => [proposta.aparelho?.cidade]
    },
    filtroPropostasAparelho: {
        todos: "Todos os aparelhos",
        vazio: "(não identificado)",
        valores: (proposta) => [proposta.aparelho?.tipo],
        rotulo: (tipo) => TEXTO_TIPO_APARELHO[tipo] || tipo
    },
    filtroPropostasModelo: {
        todos: "Todos os modelos",
        vazio: "(sem modelo)",
        valores: (proposta) => (proposta.dados?.equipamentos || []).map(item => item.modelo)
    },
    // o prazo que saiu na mensagem (prazoPagamentoAdmin em copiadas-linhas.js)
    filtroPropostasPrazo: {
        todos: "Todos os prazos",
        vazio: "Sem prazo na mensagem",
        valores: (proposta) => [prazoPagamentoAdmin(proposta.dados)],
        rotulo: (prazo) => `${prazo} dias`
    }
};

// texto de busca de cada proposta, montado uma vez por carga
const buscaDasPropostas = new WeakMap();


function normalizarBuscaAdmin(texto){

    return semAcento(texto).toLowerCase();
}


function valoresFiltroProposta(select, proposta){

    return select.valores(proposta).map(valor => valor || VAZIO_FILTRO_PROPOSTAS);
}


// tudo o que aparece na linha, mais a mensagem inteira
function textoBuscaProposta(proposta){

    if(!buscaDasPropostas.has(proposta)){

        buscaDasPropostas.set(
            proposta,
            normalizarBuscaAdmin([
                dataHoraBR(proposta.criado_em),
                proposta.usuario_email,
                textoAparelhoAdmin(proposta.aparelho),
                proposta.cliente,
                resumoClienteProposta(proposta),
                ...(proposta.dados?.equipamentos || []).map(textoEquipamentoAdmin),
                moedaAdmin(proposta.valor_total),
                ...configuracoesAdmin(proposta.dados),
                proposta.texto
            ].join("\n"))
        );
    }

    return buscaDasPropostas.get(proposta);
}


// número digitado no filtro (null = sem limite)
function numeroFiltroPropostas(id){

    const valor = $(id).value.trim();

    return valor === "" || !Number.isFinite(Number(valor)) ? null : Number(valor);
}


// dia em que foi copiada, no horário daqui ("2026-11-03", como o campo de data)
function diaProposta(iso){

    const data = new Date(iso);

    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, "0"),
        String(data.getDate()).padStart(2, "0")
    ].join("-");
}


// algum equipamento (do modelo escolhido, se tiver) com o desconto na faixa
function descontoNoFiltro(proposta, modelo, minimo, maximo){

    if(minimo === null && maximo === null) return true;

    return (proposta.dados?.equipamentos || []).some(item => {

        if(modelo && (item.modelo || VAZIO_FILTRO_PROPOSTAS) !== modelo) return false;

        const desconto = descontoEquipamentoAdmin(item);

        return (
            desconto !== null &&
            (minimo === null || desconto >= minimo) &&
            (maximo === null || desconto <= maximo)
        );
    });
}


function propostasVisiveis(){

    const termos =
        normalizarBuscaAdmin($("buscaPropostas").value).split(/\s+/).filter(Boolean);

    const escolhidos =
        Object.entries(SELECTS_FILTRO_PROPOSTAS)
            .map(([id, select]) => [select, $(id).value])
            .filter(([, valor]) => valor);

    const modelo = $("filtroPropostasModelo").value;

    const descontoMin = numeroFiltroPropostas("filtroPropostasDescontoMin");

    const descontoMax = numeroFiltroPropostas("filtroPropostasDescontoMax");

    const dataDe = $("filtroPropostasDataDe").value;

    const dataAte = $("filtroPropostasDataAte").value;

    return propostasAdmin.filter(proposta => {

        const noSelect =
            escolhidos.every(([select, valor]) =>
                valoresFiltroProposta(select, proposta).includes(valor)
            );

        if(!noSelect) return false;

        const dia = diaProposta(proposta.criado_em);

        if(dataDe && dia < dataDe) return false;

        if(dataAte && dia > dataAte) return false;

        if(!descontoNoFiltro(proposta, modelo, descontoMin, descontoMax)) return false;

        const texto = textoBuscaProposta(proposta);

        return termos.every(termo => texto.includes(termo));
    });
}


function filtrandoPropostas(){

    return IDS_FILTROS_PROPOSTAS.some(id => $(id).value.trim() !== "");
}


// opções dos selects tiradas das propostas carregadas; a escolha continua se
// ainda existir
function desenharFiltrosPropostas(){

    Object.entries(SELECTS_FILTRO_PROPOSTAS).forEach(([id, select]) => {

        const elemento = $(id);

        const escolhido = elemento.value;

        const valores = new Set();

        propostasAdmin.forEach(proposta => {

            valoresFiltroProposta(select, proposta).forEach(valor => valores.add(valor));
        });

        const opcoes =
            [...valores]
                .filter(valor => valor !== VAZIO_FILTRO_PROPOSTAS)
                .map(valor => [valor, select.rotulo ? select.rotulo(valor) : valor])
                .sort((a, b) => a[1].localeCompare(b[1], "pt-BR", { numeric: true }));

        if(valores.has(VAZIO_FILTRO_PROPOSTAS)) opcoes.push([VAZIO_FILTRO_PROPOSTAS, select.vazio]);

        elemento.innerHTML = "";

        [["", select.todos], ...opcoes].forEach(([valor, texto]) => {

            const opcao = criar("option", "", texto);

            opcao.value = valor;

            elemento.appendChild(opcao);
        });

        elemento.value = valores.has(escolhido) ? escolhido : "";
    });
}


function limparFiltrosPropostas(){

    IDS_FILTROS_PROPOSTAS.forEach(id => { $(id).value = ""; });

    desenharPropostasAdmin();
}
