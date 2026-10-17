// ======================================
// PROPOSTAS - ESTADO E NORMALIZAÇÃO
// ======================================
// Variáveis das tabelas carregadas, normalizarModelo() e normalizarCidade().
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// PROPOSTAS - DADOS
// ======================================
// Carregamento de tabela/frete, gestão de equipamentos
// e cálculo de desconto por equipamento.
// Depende de helpers.js (precisa vir carregado antes).


// ======================================
// TABELAS
// ======================================

let tabelaPrecos = {};

let tabelasFrete = {};

// nome "bonito" de cada cidade (chave normalizada -> nome pra datalist)
let nomesCidades = {};

// Avisos de falha no carregamento (vazio = tudo certo).
// Aparecem na tela pra não parecer que o modelo/cidade não existe.
let erroTabelaPrecos = "";

let erroTabelaFretes = "";

// A linha fixa do HTML já nasce com data-equip-id="1"
let proximoEquipId = 2;


// ======================================
// NORMALIZAR MODELO
// ======================================

function normalizarModelo(valor){

    return String(valor || "")
        .replace(/\uFEFF/g, "")
        .trim()
        .toUpperCase();
}


// ======================================
// NORMALIZAR CIDADE
// ======================================
// Maiúsculas, sem acento e sem espaço sobrando:
// "Itajaí " e "ITAJAI" viram a mesma chave.

function normalizarCidade(valor){

    return String(valor || "")
        .replace(/\uFEFF/g, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}
