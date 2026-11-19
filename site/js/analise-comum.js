// ======================================
// ANÁLISES - O QUE É COMUM
// ======================================
// O que a Análise de fretes e a Análise de movimentações usam: a busca dos agendamentos do período (de 1000 em 1000, sem a lixeira), os atalhos de período, as faixas do gráfico (um dia, ou uma semana no período longo), os formatos de número e as peças da tela (cartão do resumo, célula, tabela vazia e o desenho das colunas em SVG).

const TAMANHO_PAGINA_ANALISE = 1000;

// trava contra laço sem fim (anos de agenda cabem nisso)
const LIMITE_LINHAS_ANALISE = 50000;

// períodos maiores que isso: uma faixa por semana em vez de uma por dia
const DIAS_GRAFICO_POR_DIA = 62;

const NOMES_DIA_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];


// ======================================
// BUSCA NO BANCO
// ======================================

// colunas: só as que a página usa ("id, data, tipo, ...")
async function buscarAgendamentosDoPeriodo(de, ate, colunas){

    let linhas = [];

    for(let inicio = 0; inicio < LIMITE_LINHAS_ANALISE; inicio += TAMANHO_PAGINA_ANALISE){

        const { data, error } =
            await supabaseClient
                .from("agendamentos")
                .select(colunas)
                .gte("data", de)
                .lte("data", ate)
                .is("excluido_em", null)
                .order("id")
                .range(inicio, inicio + TAMANHO_PAGINA_ANALISE - 1);

        if(error) throw error;

        linhas = linhas.concat(data || []);

        if((data || []).length < TAMANHO_PAGINA_ANALISE) break;
    }

    return linhas;
}


// ======================================
// DATAS E PERÍODOS
// ======================================

function isoDaData(data){

    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, "0"),
        String(data.getDate()).padStart(2, "0")
    ].join("-");
}


// "mes", "mes-passado", "ano" ou um número de dias (até hoje)
function periodoDoAtalho(atalho, hoje = new Date()){

    const ano = hoje.getFullYear();

    const mes = hoje.getMonth();

    if(atalho === "mes") return { de: isoDaData(new Date(ano, mes, 1)), ate: isoDaData(hoje) };

    if(atalho === "mes-passado"){

        return { de: isoDaData(new Date(ano, mes - 1, 1)), ate: isoDaData(new Date(ano, mes, 0)) };
    }

    if(atalho === "ano") return { de: isoDaData(new Date(ano, 0, 1)), ate: isoDaData(hoje) };

    return {
        de: isoDaData(new Date(ano, mes, hoje.getDate() - Number(atalho) + 1)),
        ate: isoDaData(hoje)
    };
}


// o atalho que bate com as datas fica marcado
function marcarAtalhosPeriodo(acao, de, ate){

    document.querySelectorAll(`[data-clique='${acao}']`).forEach(botao => {

        const periodo = periodoDoAtalho(String(botao.dataset.arg));

        botao.classList.toggle("ativo", periodo.de === de && periodo.ate === ate);
    });
}


function diaSeguinte(iso, dias = 1){

    const data = new Date(iso + "T00:00:00Z");

    data.setUTCDate(data.getUTCDate() + dias);

    return data.toISOString().slice(0, 10);
}


// 0 = domingo
function diaDaSemana(iso){

    return new Date(iso + "T00:00:00Z").getUTCDay();
}


// "2026-11-03" -> "03/11"
function diaMes(iso){

    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}


// uma faixa por dia do período; período longo, uma por semana (segunda a
// domingo, cortada nas pontas do período). Cada faixa: { inicio, fim, dias }
function faixasDoPeriodo(de, ate){

    const totalDias = Math.round((Date.parse(ate) - Date.parse(de)) / 86400000) + 1;

    const porSemana = totalDias > DIAS_GRAFICO_POR_DIA;

    const faixas = [];

    let inicio = de;

    while(inicio <= ate){

        // até o domingo da semana (ou o fim do período)
        let fim = porSemana ? diaSeguinte(inicio, (7 - diaDaSemana(inicio)) % 7) : inicio;

        if(fim > ate) fim = ate;

        const dias = [];

        for(let dia = inicio; dia <= fim; dia = diaSeguinte(dia)) dias.push(dia);

        faixas.push({ inicio, fim, dias });

        inicio = diaSeguinte(fim);
    }

    return { porSemana, faixas };
}


// "sex, 02/10" (um dia) ou "28/09 a 04/10" (uma semana)
function tituloDaFaixa(faixa, porSemana){

    if(!porSemana) return `${NOMES_DIA_SEMANA[diaDaSemana(faixa.inicio)]}, ${diaMes(faixa.inicio)}`;

    if(faixa.inicio === faixa.fim) return diaMes(faixa.inicio);

    return `${diaMes(faixa.inicio)} a ${diaMes(faixa.fim)}`;
}


// ======================================
// CONTAS E FORMATOS
// ======================================

function somar(lista, valorDe){

    return lista.reduce((total, item) => total + valorDe(item), 0);
}


// Map na ordem em que cada chave apareceu
function agrupar(lista, chaveDe){

    const grupos = new Map();

    lista.forEach(item => {

        const chave = chaveDe(item);

        if(!grupos.has(chave)) grupos.set(chave, []);

        grupos.get(chave).push(item);
    });

    return grupos;
}


function numeroBR(valor, casas = 0){

    return valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}


function plural(quantidade, singular, varios){

    return `${numeroBR(quantidade)} ${quantidade === 1 ? singular : varios}`;
}


// ======================================
// PEÇAS DA TELA
// ======================================

// um dos números grandes do topo
function cartaoResumo(titulo, valor, detalhe, aviso){

    const cartao = criar("div", "cartao-resumo");

    cartao.append(
        criar("div", "cartao-titulo", titulo),
        criar("div", "cartao-valor", valor)
    );

    if(detalhe) cartao.appendChild(criar("div", aviso ? "cartao-detalhe aviso" : "cartao-detalhe", detalhe));

    return cartao;
}


function celula(texto, classe){

    return criar("td", classe, texto);
}


// tabela vazia: uma linha só com o motivo
function linhaVaziaAnalise(corpo, colunas, texto){

    const linha = criar("tr");

    const vazia = celula(texto, "analise-vazio");

    vazia.colSpan = colunas;

    linha.appendChild(vazia);

    corpo.replaceChildren(linha);
}


function elementoSvg(tag, atributos = {}){

    const elemento = document.createElementNS("http://www.w3.org/2000/svg", tag);

    Object.entries(atributos).forEach(([nome, valor]) => elemento.setAttribute(nome, valor));

    return elemento;
}


// topo do eixo redondo, com no máximo 4 faixas: 7 -> 0, 2, 4, 6, 8
function eixoDoGrafico(maximo){

    const passos = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

    const passo = passos.find(item => Math.ceil(maximo / item) <= 4) || Math.ceil(maximo / 4);

    return { passo, topo: Math.max(passo, Math.ceil(maximo / passo) * passo) };
}


// coluna com a ponta arredondada (4px) e a base reta na linha do zero. y é o
// alto da coluna; paraBaixo: cresce da linha do zero para baixo (a ponta embaixo)
function caminhoBarra(x, y, largura, altura, paraBaixo = false){

    const raio = Math.min(4, largura / 2, altura);

    if(paraBaixo){

        return [
            `M${x},${y}`,
            `V${y + altura - raio}`,
            `Q${x},${y + altura} ${x + raio},${y + altura}`,
            `H${x + largura - raio}`,
            `Q${x + largura},${y + altura} ${x + largura},${y + altura - raio}`,
            `V${y}`,
            "Z"
        ].join(" ");
    }

    return [
        `M${x},${y + altura}`,
        `V${y + raio}`,
        `Q${x},${y} ${x + raio},${y}`,
        `H${x + largura - raio}`,
        `Q${x + largura},${y} ${x + largura},${y + raio}`,
        `V${y + altura}`,
        "Z"
    ].join(" ");
}
