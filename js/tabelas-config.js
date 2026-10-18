// ======================================
// TABELAS - CONFIGURAÇÃO
// ======================================
// Definição das tabelas editáveis e estado.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// TABELAS (ADMIN)
// ======================================
// Consulta das tabelas do Supabase (qualquer usuário logado) e
// edição direta só para admin (app_metadata.role = "admin"): as
// policies de RLS bloqueiam insert/update/delete para os demais.
// Depende de helpers.js e auth-guard.js (precisam vir antes).


// ======================================
// CONFIGURAÇÃO DAS TABELAS
// ======================================
// obrigatorio = não aceita vazio
// tipo "numeric" = número (aceita vírgula, ex: 1.234,56)
// recurso = permissão necessária pra ver a tabela (ver perfis /
// auth-guard.js); sem "recurso", todo usuário com acesso à página vê

const TABELAS = {

    tabela_precos: {

        nome: "Preços (tabela_precos)",

        colunas: [
            { campo: "modelo", tipo: "text", obrigatorio: true },
            { campo: "dias", tipo: "text", obrigatorio: true },
            { campo: "valor", tipo: "numeric", obrigatorio: true }
        ],

        // consulta: linhas = modelo, colunas = dias, valor no meio
        matriz: { linha: ["modelo"], coluna: "dias", numerico: true }
    },

    tabela_fretes: {

        nome: "Fretes (tabela_fretes)",

        recurso: "fretes",

        colunas: [
            { campo: "transportadora", tipo: "text", obrigatorio: true },
            { campo: "modelo", tipo: "text", obrigatorio: true },
            { campo: "cidade", tipo: "text", obrigatorio: true },
            { campo: "valor", tipo: "text", obrigatorio: false }
        ],

        // consulta: linhas = transportadora + modelo, colunas = cidade
        matriz: { linha: ["transportadora", "modelo"], coluna: "cidade" }
    },

    frete_dionizio: {

        nome: "Frete Dionizio (frete_dionizio)",

        recurso: "fretes",

        colunas: [
            { campo: "modelo", tipo: "text", obrigatorio: true },
            { campo: "cidade", tipo: "text", obrigatorio: true },
            { campo: "valor", tipo: "text", obrigatorio: false }
        ],

        // consulta: linhas = modelo, colunas = cidade, valor no meio
        matriz: { linha: ["modelo"], coluna: "cidade" }
    },

    frete_magnus: {

        nome: "Frete Magnus (frete_magnus)",

        recurso: "fretes",

        colunas: [
            { campo: "modelo", tipo: "text", obrigatorio: true },
            { campo: "cidade", tipo: "text", obrigatorio: true },
            { campo: "valor", tipo: "text", obrigatorio: false }
        ],

        // consulta: linhas = modelo, colunas = cidade, valor no meio
        matriz: { linha: ["modelo"], coluna: "cidade" }
    }
};


// mesmos períodos válidos da tabela de preços
const DIAS_VALIDOS_TABELA = [
    "1", "2", "3", "4", "5", "6", "7",
    "10", "14", "15", "21", "28", "30"
];

// máximo de linhas desenhadas na tela de uma vez (o filtro
// busca em todas, mas só desenha as primeiras)
const LIMITE_LINHAS_TELA = 200;

let tabelaAtual = "tabela_precos";

let linhasAtuais = [];

// admin logado (definido no init). Só ele vê o botão de editar.
let ehAdminLogado = false;

// false = consulta (matriz, igual pra todos); true = editor (só admin)
let podeEditar = false;
