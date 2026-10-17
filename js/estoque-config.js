// ======================================
// ESTOQUE - CONFIGURAÇÃO
// ======================================
// Status, tipos, listas fixas, filiais e estado.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// ESTOQUE - RESUMO DIÁRIO
// ======================================
// Qualquer usuário logado sobe o Excel bruto do estoque; o
// resumo (por status e modelo) é salvo na tabela resumo_estoque
// (1 linha só, cada envio sobrescreve) e todos veem o mesmo.
// Depende de helpers.js e auth-guard.js (precisam vir antes)
// e da biblioteca XLSX (SheetJS) carregada no estoque.html.


// ======================================
// CONFIGURAÇÃO
// ======================================

// ordem dos blocos na tela
// "excel" = texto do Status no relatório bruto
const STATUS_ESTOQUE = [

    { chave: "disponivel", nome: "Disponível", excel: "Disponível" },

    { chave: "locado", nome: "Locado", excel: "Locado - Locação" },

    { chave: "locado_manutencao", nome: "Locado em manutenção", excel: "Locado - Manutenção" },

    { chave: "manutencao", nome: "Manutenção", excel: "Manutenção" },

    { chave: "fora_uso", nome: "Fora de uso", excel: "Fora de Uso" },

    { chave: "devolvido", nome: "Devolvido sublocadora", excel: "Devolvido Subl." },

    { chave: "a_vender", nome: "A vender", excel: "A Vender" }
];

// tipo do equipamento = 3 primeiras letras do patrimônio
// (a ordem aqui é a ordem dos grupos na tela)
const TIPOS_ESTOQUE = [

    { prefixo: "WTE", titulo: "TESOURAS ELÉTRICAS" },

    { prefixo: "WAE", titulo: "ARTICULADAS ELÉTRICAS" },

    { prefixo: "WME", titulo: "MASTRO ELÉTRICO" },

    { prefixo: "WAD", titulo: "ARTICULADAS A DIESEL" },

    // prefixos que NÃO são o mesmo modelo do normal (SUBWAD20 != WAD20)
    { prefixo: "SUB", titulo: "SUB" },

    { prefixo: "INUTI", titulo: "INUTI" }
];

const TITULO_OUTROS = "OUTROS";

// bloco "Disponível": lista fixa (aparece mesmo com 0), igual
// ao resumo manual. Modelo fora daqui entra em "OUTROS MODELOS".
const LISTA_FIXA_DISPONIVEL = {

    WTE: ["WTE8", "WTE10", "WTE12", "WTE14", "WTE16"],

    WAE: ["WAE12", "WAE14", "WAE15", "WAE16", "WAE18"],

    WME: ["WME10"],

    WAD: ["WAD16", "WAD20", "WAD26"]
};

// nome mostrado na tela quando difere do modelo calculado
// (vazio: mostra o modelo como foi calculado)
const ROTULO_MODELO = {};

const TITULO_OUTROS_MODELOS = "OUTROS MODELOS";

// cada filial tem a sua linha na tabela resumo_estoque (coluna id)
const FILIAIS = {

    ITAJAI: { id: 1, nome: "Itajaí" },

    JOINVILLE: { id: 2, nome: "Joinville" }
};

// o navegador lembra a última filial escolhida
const CHAVE_FILIAL_ESTOQUE = "estoqueFilial";

let filialAtual = "ITAJAI";

let resumoPublicado = null;

let previaAtual = null;
