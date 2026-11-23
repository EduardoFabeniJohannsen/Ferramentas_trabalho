// ======================================
// ANÁLISE DE FRETES - EXCEL
// ======================================
// Botão 📥 Excel: baixa os fretes filtrados na tela (período, tipo, transportadora e só concluídos), para a prestação de contas com a transportadora. Uma aba por transportadora (data, cliente, máquinas, de onde sai, para onde vai, motorista, valor e de quem é a conta, com o total em fórmula) e, com mais de uma, uma aba Resumo na frente. A biblioteca de planilha (SheetJS, js/vendor/) só é baixada no primeiro clique.

const ARQUIVO_SHEETJS = "js/vendor/xlsx-0.18.5.full.min.js";

const FORMATO_DINHEIRO_EXCEL = '"R$" #,##0.00';

const FORMATO_DATA_EXCEL = "dd/mm/yyyy";

const ROTULOS_CONTA_EXCEL = { nossa: "Nossa conta", cliente: "Conta do cliente", dividido: "Dividido" };

// a tabela começa nesta linha (em cima: título, filtros e uma linha em branco)
const LINHA_CABECALHO_EXCEL = 4;

// aba de cada transportadora: [título, largura, valor do frete, formato, soma no
// total]. As colunas de dinheiro sempre somam
const COLUNAS_EXCEL_FRETES = [
    ["Data", 11, frete => serialExcel(frete.data), FORMATO_DATA_EXCEL],
    ["Horário", 10, frete => frete.detalhe.horario],
    ["Tipo", 18, frete => rotuloTipo(frete.tipo)],
    ["Status", 12, frete => frete.status],
    ["Cliente", 30, frete => frete.detalhe.cliente],
    ["Proposta", 10, frete => frete.detalhe.proposta],
    ["Máquinas", 24, frete => textoMaquinasExcel(frete)],
    ["Sai de", 34, frete => frete.detalhe.origem],
    ["Vai para", 34, frete => frete.detalhe.destino],
    ["Motorista", 18, frete => frete.detalhe.motorista],
    ["Frete por conta de", 17, frete => ROTULOS_CONTA_EXCEL[frete.conta] || frete.conta],
    ["Valor do frete", 15, frete => frete.valor, FORMATO_DINHEIRO_EXCEL],
    ["Por nossa conta", 15, frete => frete.nossoCusto, FORMATO_DINHEIRO_EXCEL],
    ["Por conta do cliente", 18, frete => frete.valor === null ? null : frete.valor - frete.nossoCusto, FORMATO_DINHEIRO_EXCEL]
];

// aba Resumo: uma linha por transportadora (porTransportadora, em analise-calculo.js)
const COLUNAS_EXCEL_RESUMO = [
    ["Transportadora", 30, item => item.nome],
    ["Fretes", 9, item => item.fretes, null, true],
    ["Máquinas", 10, item => item.maquinas, null, true],
    ["Valor dos fretes", 16, item => item.valor, FORMATO_DINHEIRO_EXCEL],
    ["Por nossa conta", 16, item => item.nossoCusto, FORMATO_DINHEIRO_EXCEL],
    ["Por conta do cliente", 19, item => item.valor - item.nossoCusto, FORMATO_DINHEIRO_EXCEL],
    ["Fretes sem valor", 15, item => item.semValor, null, true]
];

let promessaSheetJS = null;


// baixa a biblioteca uma vez só; falhou, a próxima tentativa baixa de novo
function carregarSheetJS(){

    if(window.XLSX) return Promise.resolve();

    if(!promessaSheetJS){

        promessaSheetJS = new Promise((pronto, falhou) => {

            const script = document.createElement("script");

            script.src = ARQUIVO_SHEETJS;

            script.onload = pronto;

            script.onerror = () => {

                promessaSheetJS = null;

                script.remove();

                falhou(new Error(`Não carregou ${ARQUIVO_SHEETJS}`));
            };

            document.head.appendChild(script);
        });
    }

    return promessaSheetJS;
}


// "2026-10-02" -> número de dia do Excel (sem passar pelo fuso do computador)
function serialExcel(iso){

    const [ano, mes, dia] = iso.split("-").map(Number);

    return (Date.UTC(ano, mes - 1, dia) - Date.UTC(1899, 11, 30)) / 86400000;
}


// troca técnica: "WTE12050 (recolhe WTE12045)"
function textoMaquinasExcel(frete){

    const { plataforma, recolha } = frete.detalhe;

    return recolha ? `${plataforma} (recolhe ${recolha})` : plataforma;
}


function textoFiltrosExcel(filtro){

    return [
        `Período: ${dataBR(filtro.de)} a ${dataBR(filtro.ate)}`,
        filtro.tipo ? `Tipo: ${rotuloTipo(filtro.tipo)}` : "Todos os tipos",
        filtro.soConcluidos ? "Só concluídos" : "Concluídos e não concluídos (sem os cancelados)"
    ].join(" · ");
}


// título e filtros em cima, a tabela com filtro nos títulos e o total embaixo.
// Total: o texto na 1ª coluna e a soma (em fórmula) nas colunas de dinheiro e nas
// marcadas para somar
function abaExcel(titulo, filtro, colunas, itens, textoTotal){

    const inicio = LINHA_CABECALHO_EXCEL - 1;

    const fim = inicio + itens.length;

    const linhas = [
        [titulo],
        [textoFiltrosExcel(filtro)],
        [],
        colunas.map(([nome]) => nome),
        ...itens.map(item => colunas.map(([, , valor]) => valor(item) ?? null)),
        colunas.map((coluna, indice) => indice === 0 ? textoTotal : null)
    ];

    const aba = XLSX.utils.aoa_to_sheet(linhas);

    colunas.forEach(([, , valor, formato, soma], indice) => {

        const letra = XLSX.utils.encode_col(indice);

        if(formato){

            for(let linha = inicio + 1; linha <= fim; linha++){

                const celula = aba[XLSX.utils.encode_cell({ r: linha, c: indice })];

                if(celula) celula.z = formato;
            }
        }

        if(formato === FORMATO_DINHEIRO_EXCEL || soma){

            aba[XLSX.utils.encode_cell({ r: fim + 1, c: indice })] = {
                t: "n",
                v: somar(itens, item => valor(item) || 0),
                f: `SUM(${letra}${inicio + 2}:${letra}${fim + 1})`,
                ...(formato ? { z: formato } : {})
            };
        }
    });

    aba["!cols"] = colunas.map(([, largura]) => ({ wch: largura }));

    aba["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: inicio, c: 0 }, e: { r: fim, c: colunas.length - 1 } }) };

    return aba;
}


// nome de aba: até 31 letras, sem \ / ? * [ ] : e sem repetir
function nomeDeAba(nome, usados){

    const base = nome.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Fretes";

    let final = base;

    for(let vez = 2; usados.has(final.toLowerCase()); vez++){

        final = `${base.slice(0, 31 - String(vez).length - 3)} (${vez})`;
    }

    usados.add(final.toLowerCase());

    return final;
}


// na ordem da data e do horário
function ordemExcel(a, b){

    return a.data.localeCompare(b.data) ||
        a.detalhe.horario.localeCompare(b.detalhe.horario) ||
        (Number(a.id) || 0) - (Number(b.id) || 0);
}


function planilhaFretes(lista, filtro){

    const livro = XLSX.utils.book_new();

    const usados = new Set();

    const transportadoras = porTransportadora(lista);

    const deCada = agrupar(lista, frete => frete.transportadora || ROTULO_SEM_TRANSPORTADORA);

    if(transportadoras.length > 1){

        XLSX.utils.book_append_sheet(
            livro,
            abaExcel("Fretes por transportadora", filtro, COLUNAS_EXCEL_RESUMO, transportadoras, "Total"),
            nomeDeAba("Resumo", usados)
        );
    }

    transportadoras.forEach(({ nome }) => {

        const fretes = [...deCada.get(nome)].sort(ordemExcel);

        XLSX.utils.book_append_sheet(
            livro,
            abaExcel(`Fretes - ${nome}`, filtro, COLUNAS_EXCEL_FRETES, fretes, `Total: ${plural(fretes.length, "frete", "fretes")}`),
            nomeDeAba(nome, usados)
        );
    });

    return livro;
}


// "Fretes - Transp A - 01-10-2026 a 31-10-2026.xlsx"
function nomeArquivoExcel(filtro){

    const data = (iso) => dataBR(iso).replace(/\//g, "-");

    const transportadora = filtro.transportadora.replace(/[\\/:*?"<>|]/g, " ").trim();

    return ["Fretes", transportadora, `${data(filtro.de)} a ${data(filtro.ate)}`]
        .filter(Boolean)
        .join(" - ") + ".xlsx";
}


// data-clique do botão 📥 Excel
async function baixarExcelFretes(){

    if(carregandoAnalise) return mostrarToast("Espere terminar de carregar", true);

    if(falhaAnalise) return mostrarToast(falhaAnalise, true);

    const filtro = filtroAnalise();

    const lista = fretesDaAnalise(fretesAnalise, filtro);

    if(!lista.length) return mostrarToast("Nenhum frete com esses filtros para baixar", true);

    const botao = $("btnExcelFretes");

    botao.disabled = true;

    botao.innerText = "Gerando...";

    try{

        await carregarSheetJS();

        XLSX.writeFile(planilhaFretes(lista, filtro), nomeArquivoExcel(filtro), { compression: true });

    }catch(erro){

        console.error("[analise-fretes] Falha ao gerar o Excel:", erro);

        mostrarToast("Não foi possível gerar o Excel (verifique a conexão e tente de novo)", true);

    }finally{

        botao.disabled = false;

        botao.innerText = "📥 Excel";
    }
}
