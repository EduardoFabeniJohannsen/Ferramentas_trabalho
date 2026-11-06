// ======================================
// PROPOSTAS ZAP COPIADAS - FILTRO DAS COLUNAS (ESTILO EXCEL)
// ======================================
// Clicar no título de uma coluna da tabela abre caixinhas como no filtro do Excel: desmarcou, some. Usuário, Cliente e Configurações têm um grupo por tipo de informação; Equipamentos mostra a proposta se algum modelo dela estiver marcado; Total tem faixa de valor. Vale junto com os filtros de cima.
// As opções e as contagens de cada lista vêm das propostas que passam nos
// outros filtros (como no Excel). O painel em si fica em copiadas-filtro-painel.js.

// Colunas com filtro (data-coluna no <th> da tabela). Cada grupo:
// valores(proposta) = o que a proposta tem nele (vazio vira VAZIO_FILTRO_PROPOSTAS);
// texto(valor) = como aparece na lista; recentes = do mais novo pro mais antigo.
const COLUNAS_FILTRO_PROPOSTAS = {
    quando: {
        titulo: "Quando",
        grupos: [
            { id: "dia", rotulo: "Dia", valores: (p) => [diaProposta(p.criado_em)], texto: dataBR, recentes: true }
        ]
    },
    usuario: {
        titulo: "Usuário e aparelho",
        grupos: [
            { id: "usuario", rotulo: "Usuário", valores: (p) => [p.usuario_email], vazio: "(sem e-mail)" },
            { id: "aparelho", rotulo: "Aparelho", valores: (p) => [p.aparelho?.tipo], texto: (tipo) => TEXTO_TIPO_APARELHO[tipo] || tipo, vazio: "(não identificado)" },
            { id: "local", rotulo: "Local de quem fez", valores: (p) => [p.aparelho?.cidade], vazio: "(sem cidade)" }
        ]
    },
    cliente: {
        titulo: "Cliente",
        grupos: [
            { id: "cliente", rotulo: "Cliente", valores: (p) => [p.cliente], vazio: "(sem cliente)" },
            { id: "cidade", rotulo: "Cidade", valores: (p) => [p.cidade], vazio: "(sem cidade)" },
            { id: "periodo", rotulo: "Período", valores: (p) => [textoPeriodoAdmin(p.dados)] }
        ]
    },
    equipamentos: {
        titulo: "Equipamentos",
        grupos: [
            { id: "modelo", rotulo: "Modelo", valores: (p) => (p.dados?.equipamentos || []).map(item => item.modelo), vazio: "(sem modelo)" }
        ]
    },
    total: {
        titulo: "Total",
        faixa: true
    },
    config: {
        titulo: "Configurações",
        grupos: [
            { id: "saida", rotulo: "Cidade de saída", valores: (p) => [`Saída ${p.dados?.cidadeSaida || "Itajaí"}`] },
            { id: "complementar", rotulo: "Locação complementar", valores: (p) => [textoComplementarAdmin(p.dados) || "Sem locação complementar"] },
            { id: "pagamento", rotulo: "Pagamento", valores: (p) => [textoPagamentoAdmin(p.dados)] },
            { id: "diaria", rotulo: "Diária", valores: (p) => [p.dados?.configuracoes?.diaria ? "Com diária" : "Sem diária"] },
            { id: "emojis", rotulo: "Emojis", valores: (p) => [p.dados?.configuracoes?.emojis === false ? "Sem emojis" : "Com emojis"] },
            { id: "linha", rotulo: "Linha em branco no pagamento", valores: (p) => [p.dados?.configuracoes?.separarPagamento ? "Com linha em branco" : "Sem linha em branco"] },
            { id: "bonificado", rotulo: "Frete bonificado", valores: (p) => [textoBonificadoAdmin(p.dados) || "Sem frete bonificado"] }
        ]
    }
};

// id do grupo -> Set dos valores desmarcados (sem Set ou vazio = não filtra).
// Guardar o desmarcado (e não o marcado) faz proposta nova aparecer sozinha.
const ocultosColunaPropostas = {};

// faixa da coluna Total em R$ (null = sem limite)
const faixaTotalPropostas = { minimo: null, maximo: null };


function gruposFiltroColuna(){

    return Object.values(COLUNAS_FILTRO_PROPOSTAS).flatMap(coluna => coluna.grupos || []);
}


function valoresDoGrupo(grupo, proposta){

    const valores =
        grupo.valores(proposta).map(valor =>
            valor === null || valor === undefined || valor === ""
                ? VAZIO_FILTRO_PROPOSTAS
                : String(valor)
        );

    return valores.length ? valores : [VAZIO_FILTRO_PROPOSTAS];
}


function textoValorGrupo(grupo, valor){

    if(valor === VAZIO_FILTRO_PROPOSTAS) return grupo.vazio || "(vazio)";

    return grupo.texto ? grupo.texto(valor) : valor;
}


// ignorar = id de um grupo (ou "total") que não conta: é assim que a lista de
// cada grupo mostra o que existe com os outros filtros
function passaFiltrosColuna(proposta, ignorar){

    const nosGrupos = gruposFiltroColuna().every(grupo => {

        const ocultos = ocultosColunaPropostas[grupo.id];

        if(grupo.id === ignorar || !ocultos?.size) return true;

        // algum valor marcado (Equipamentos: algum modelo da proposta)
        return valoresDoGrupo(grupo, proposta).some(valor => !ocultos.has(valor));
    });

    if(!nosGrupos) return false;

    if(ignorar === "total") return true;

    const total = Number(proposta.valor_total);

    const { minimo, maximo } = faixaTotalPropostas;

    if(minimo !== null && !(total >= minimo)) return false;

    if(maximo !== null && !(total <= maximo)) return false;

    return true;
}


function colunaFiltrando(id){

    const coluna = COLUNAS_FILTRO_PROPOSTAS[id];

    if(coluna.faixa){

        return faixaTotalPropostas.minimo !== null || faixaTotalPropostas.maximo !== null;
    }

    return coluna.grupos.some(grupo => ocultosColunaPropostas[grupo.id]?.size > 0);
}


function filtrandoColunas(){

    return Object.keys(COLUNAS_FILTRO_PROPOSTAS).some(colunaFiltrando);
}


// id da coluna; sem id limpa todas
function limparFiltrosColuna(id){

    Object.entries(COLUNAS_FILTRO_PROPOSTAS)
        .filter(([chave]) => !id || chave === id)
        .forEach(([, coluna]) => {

            (coluna.grupos || []).forEach(grupo => delete ocultosColunaPropostas[grupo.id]);

            if(coluna.faixa){

                faixaTotalPropostas.minimo = null;

                faixaTotalPropostas.maximo = null;
            }
        });
}


// [{ valor, texto, quantos }] de um grupo: o que existe com os outros filtros,
// mais os desmarcados (pra poder marcar de novo). "(vazio)" fica por último.
function opcoesDoGrupo(grupo){

    const quantos = new Map();

    propostasVisiveis(grupo.id).forEach(proposta => {

        new Set(valoresDoGrupo(grupo, proposta)).forEach(valor => {

            quantos.set(valor, (quantos.get(valor) || 0) + 1);
        });
    });

    (ocultosColunaPropostas[grupo.id] || []).forEach(valor => {

        if(!quantos.has(valor)) quantos.set(valor, 0);
    });

    return [...quantos]
        .map(([valor, total]) => ({ valor, texto: textoValorGrupo(grupo, valor), quantos: total }))
        .sort((a, b) => {

            if(a.valor === VAZIO_FILTRO_PROPOSTAS) return 1;

            if(b.valor === VAZIO_FILTRO_PROPOSTAS) return -1;

            return grupo.recentes
                ? b.valor.localeCompare(a.valor)
                : a.texto.localeCompare(b.texto, "pt-BR", { numeric: true });
        });
}


// marca ou desmarca um valor (ou todos, com valor = null) de um grupo
function marcarValorColuna(grupo, valor, marcado){

    const ocultos = ocultosColunaPropostas[grupo.id] || new Set();

    const valores = valor === null ? opcoesDoGrupo(grupo).map(opcao => opcao.valor) : [valor];

    valores.forEach(item => (marcado ? ocultos.delete(item) : ocultos.add(item)));

    ocultosColunaPropostas[grupo.id] = ocultos;
}


// ▾ em cada título com filtro; clicar em qualquer parte do título abre
function prepararCabecalhoFiltros(){

    document.querySelectorAll(".tabela-propostas th[data-coluna]").forEach(th => {

        const coluna = COLUNAS_FILTRO_PROPOSTAS[th.dataset.coluna];

        if(!coluna) return;

        th.classList.add("th-filtro");

        th.title = `Filtrar ${coluna.titulo}`;

        th.appendChild(criar("span", "seta-filtro-coluna", "▾"));

        th.addEventListener("click", (evento) => {

            evento.stopPropagation();

            alternarPainelFiltroColuna(th.dataset.coluna, th);
        });
    });
}


// título em destaque quando a coluna está filtrando
function atualizarCabecalhoFiltros(){

    document.querySelectorAll(".tabela-propostas th.th-filtro").forEach(th => {

        th.classList.toggle("filtrando", colunaFiltrando(th.dataset.coluna));
    });
}
