// ======================================
// LEADS - CONFIGURAÇÃO E ESTADO
// ======================================
// Lista de empresas para a equipe chamar. Não é um CRM: mostra a lista, evita
// duas pessoas chamando a mesma empresa e ajuda no contato. Os leads vêm de um
// agente externo; aqui ninguém cria nem apaga.
// Os dados vêm de fora: nada entra na tela como HTML.
// Depende de supabase-config.js, auth-guard.js e helpers.js.

// ======================================
// CONFIGURAÇÃO
// ======================================

const TABELA_LEADS = "leads";

const TABELA_LEADS_CONFIG = "leads_config";

const STATUS_LEADS = [
    { valor: "novo", rotulo: "Novo" },
    { valor: "chamado", rotulo: "Chamado" },
    { valor: "interessado", rotulo: "Interessado" },
    { valor: "sem_interesse", rotulo: "Sem interesse" },
    { valor: "ja_cliente", rotulo: "Já é cliente" }
];

const PORTES_LEADS = [
    { valor: "pequena", rotulo: "Pequena" },
    { valor: "media", rotulo: "Média" },
    { valor: "grande", rotulo: "Grande" }
];

// muitos cards deixariam a página pesada: o resto aparece filtrando
const LIMITE_CARDS_LEADS = 200;

// ao voltar pra aba, recarrega se passou mais que isso
const INTERVALO_RECARGA_LEADS_MS = 30000;

// espera parar de digitar pra gravar a observação
const ATRASO_SALVAR_OBS_MS = 800;

// nome do vendedor nas mensagens (fica neste navegador)
const CHAVE_VENDEDOR_LEADS = "leadsVendedor";

let leads = [];

let erroLeads = "";

let carregandoLeads = true;

let ultimaCargaLeads = 0;

// última busca do agente: { created_at, inseridos, repetidos, ... } ou null
let ultimaBuscaAgente = null;

// a busca roda todo dia: passou disso sem rodar, algo deu errado
const LIMITE_BUSCA_ATRASADA_MS = 26 * 60 * 60 * 1000;

let usuarioLeads = { id: "", email: "" };

let adminLeads = false;

let configsBusca = [];

// null = criando uma configuração nova
let idConfigEditando = null;
