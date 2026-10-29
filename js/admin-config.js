// ======================================
// ADMIN - CONFIGURAÇÃO
// ======================================
// Páginas, filiais e estado da tela de usuários e acessos.

// ======================================
// ACESSOS QUE O ADMIN PODE LIBERAR
// ======================================
// chave = nome do arquivo da página sem .html, em minúsculas
// (mesma regra de recursoDaPagina em auth-guard.js).
// "fretes" não é página: libera os dados das tabelas de frete.
// Página nova no menu? Some uma linha aqui.

const ACESSOS_ADMIN = [

    { chave: "index", rotulo: "Início" },

    { chave: "propostas", rotulo: "Propostas" },

    { chave: "agenda", rotulo: "Agenda" },

    { chave: "estoque", rotulo: "Estoque" },

    { chave: "tabelas", rotulo: "Tabelas" },

    { chave: "weg", rotulo: "WEG" },

    // só ver: cadastrar, editar e excluir continua só com o admin
    { chave: "transportadoras", rotulo: "Transportadoras (ver)" },

    { chave: "fretes", rotulo: "Dados de frete" }
];

// filiais do estoque (mesmas chaves de FILIAIS em estoque-config.js)
const FILIAIS_ADMIN = [

    { chave: "ITAJAI", rotulo: "Itajaí" },

    { chave: "JOINVILLE", rotulo: "Joinville" }
];

const TABELA_PERFIS = "perfis";

// [{ id, email, acessos, filiais, ativo }]
let perfisAdmin = [];
