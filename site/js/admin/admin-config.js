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
// Página nova no menu? Some uma linha aqui (e no PAGINAS_DESTINO do
// auth-guard.js); o teste-paginas confere. Só o Admin fica de fora: quem é
// admin vem do papel no login (app_metadata.role), não desta lista.

const ACESSOS_ADMIN = [

    { chave: "index", rotulo: "Início" },

    { chave: "propostas", rotulo: "Propostas" },

    { chave: "agenda", rotulo: "Agenda" },

    { chave: "estoque", rotulo: "Estoque" },

    { chave: "tabelas", rotulo: "Tabelas" },

    { chave: "weg", rotulo: "WEG" },

    // só ver: cadastrar, editar e excluir continua só com o admin
    { chave: "transportadoras", rotulo: "Transportadoras (ver)" },

    { chave: "leads", rotulo: "Leads" },

    // ver as Propostas Zap copiadas de todo mundo (propostas-copiadas.html);
    // os dados vêm pela policy com tem_acesso('propostas-copiadas')
    { chave: "propostas-copiadas", rotulo: "Propostas Zap" },

    // as análises leem os agendamentos (só ler): no banco, pela policy
    // "agendamentos: leitura das analises", com tem_acesso de cada uma
    { chave: "analise-fretes", rotulo: "Análise de fretes" },

    { chave: "analise-movimentacoes", rotulo: "Análise de movimentações" },

    { chave: "fretes", rotulo: "Dados de frete" },

    // login de motorista (motorista.html): só as entregas do motorista escolhido
    // na coluna Motorista (perfis.motorista_id), pela função entregas_motorista
    { chave: "motorista", rotulo: "Minhas entregas (motorista)" }
];

// filiais do estoque (mesmas chaves de FILIAIS em estoque-config.js)
const FILIAIS_ADMIN = [

    { chave: "ITAJAI", rotulo: "Itajaí" },

    { chave: "JOINVILLE", rotulo: "Joinville" }
];

const TABELA_PERFIS = "perfis";

// [{ id, email, acessos, filiais, ativo, motorista_id }]
let perfisAdmin = [];

// motoristas cadastrados (página Transportadoras): [{ id, transportadora, nome }]
// para a coluna Motorista (admin-motoristas.js)
let motoristasAdmin = [];

// o banco ainda não tem perfis.motorista_id (SQL do login de motorista)
let semColunaMotoristaAdmin = false;
