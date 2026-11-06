// semAcento() e as funções que usam ela: cada uma mantém o seu jeito
// (minúscula, maiúscula, espaços, símbolo invisível no início do arquivo).
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = path.resolve(__dirname, "..", "site");

const ctx = { document: { querySelectorAll: () => [] } };
vm.createContext(ctx);

vm.runInContext(fs.readFileSync(path.join(raiz, "js/helpers.js"), "utf8"), ctx);

// pega só a função do arquivo: os arquivos das páginas dependem da tela para carregar
const carregarFuncao = (arquivo, nome) => {

    const texto = fs.readFileSync(path.join(raiz, "js", arquivo), "utf8");
    const inicio = texto.indexOf(`function ${nome}(`);

    if(inicio < 0) throw new Error(`${nome} não está em ${arquivo}`);

    let nivel = 0;
    let fim = texto.indexOf("{", inicio);

    do{
        if(texto[fim] === "{") nivel++;
        if(texto[fim] === "}") nivel--;
        fim++;
    }while(nivel > 0);

    vm.runInContext(texto.slice(inicio, fim), ctx);
};

carregarFuncao("agenda/agenda-filtro-datas.js", "semAcentoMinusculo");
carregarFuncao("agenda/agenda-zap.js", "textoPeriodoReferencia");
carregarFuncao("estoque/estoque-parser.js", "normalizarTexto");
carregarFuncao("leads/leads-contato.js", "semAcentoLeads");
carregarFuncao("propostas/propostas-estado.js", "normalizarCidade");

const CASOS = [
    ["semAcento", "Itajaí São João", "Itajai Sao Joao"],
    ["semAcento", "AÇÃO", "ACAO"],
    ["semAcento", "  mantém  espaços ", "  mantem  espacos "],
    ["semAcento", null, ""],
    ["semAcento", undefined, ""],
    ["semAcento", 0, "0"],

    ["semAcentoMinusculo", "Itajaí", "itajai"],
    ["semAcentoMinusculo", " AÇÃO ", " acao "],
    ["semAcentoMinusculo", 0, ""],
    ["semAcentoMinusculo", null, ""],

    ["textoPeriodoReferencia", "3 períodos", "3 PERIODOS"],
    ["textoPeriodoReferencia", "1 mês", "1 MES"],
    ["textoPeriodoReferencia", "1 dia", "DIÁRIA"],
    ["textoPeriodoReferencia", " 2 meses ", "2 MESES"],
    ["textoPeriodoReferencia", null, ""],

    ["normalizarTexto", " Patrimônio ", "patrimonio"],
    ["normalizarTexto", "LOCAÇÃO", "locacao"],
    ["normalizarTexto", 0, "0"],
    ["normalizarTexto", null, ""],

    ["semAcentoLeads", "  São   João ", "sao joao"],
    ["semAcentoLeads", "Construção\tCivil", "construcao civil"],
    ["semAcentoLeads", 0, ""],
    ["semAcentoLeads", null, ""],

    ["normalizarCidade", " Itajaí ", "ITAJAI"],
    ["normalizarCidade", "﻿São  José", "SAO JOSE"],
    ["normalizarCidade", 0, ""],
    ["normalizarCidade", null, ""]
];

let falhas = 0;

CASOS.forEach(([funcao, entrada, esperado]) => {

    ctx.__entrada = entrada;

    const obtido = vm.runInContext(`${funcao}(__entrada)`, ctx);
    const ok = obtido === esperado;

    if(!ok) falhas++;

    console.log(ok ? "ok   " : "FALHA", `${funcao}(${JSON.stringify(entrada)})`, "->", JSON.stringify(obtido), ok ? "" : "esperado " + JSON.stringify(esperado));
});

console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exit(falhas ? 1 : 0);
