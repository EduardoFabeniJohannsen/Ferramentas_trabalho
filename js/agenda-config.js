// ======================================
// AGENDA - CONFIGURAÇÃO E ESTADO
// ======================================
// Constantes (tipos, status, colunas, cores) e variáveis de estado da agenda.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// AGENDA
// ======================================
// Os dados ficam no Supabase (tabelas "agendamentos" e "motoristas").
// Qualquer usuário logado lê e altera (policies de RLS no Supabase).
// Modo, ordem e filtros são preferências salvas só neste navegador.
// Depende de supabase-config.js, auth-guard.js e helpers.js
// (precisam vir carregados antes).


// ======================================
// CONFIGURAÇÃO
// ======================================

// nomes das transportadoras (vêm da tabela "transportadoras" do Supabase)
let TRANSPORTADORAS = [];

const TIPOS = ["Entrega", "Coleta", "Transferência", "Troca técnica"];

// horário e status que já vêm preenchidos num agendamento novo
const HORARIO_PADRAO = "08:00";

const STATUS_PADRAO = "Confirmado";

const STATUS_AGENDA = [
    "A confirmar",
    "Confirmado",
    "Em rota",
    "Concluído",
    "Cancelado"
];

// local padrão quando origem (entrega) ou destino (coleta) fica vazio
const LOCAL_PADRAO = "W Rental";

// no modo expedição, o que já saiu (ou foi encerrado) não aparece
const STATUS_OCULTOS_EXPEDICAO = ["Em rota", "Concluído", "Cancelado"];

// cor de cada dia da semana (0 = domingo ... 6 = sábado), pra bater o
// olho e achar as demandas do dia. Sem data fica cinza.
const CORES_DIAS = [
    "#fb7185",
    "#60a5fa",
    "#4ade80",
    "#fbbf24",
    "#c084fc",
    "#22d3ee",
    "#f472b6"
];

const COR_SEM_DATA = "#94a3b8";

// colunas de cada modo, na ordem em que aparecem (id = nome da célula
// montada em criarCelulasAgenda).
// semQuebra = o texto nunca quebra de linha (colunas curtas).
// maxLargura = largura máxima das colunas de texto comprido: o texto só
// quebra de linha se passar dela (ou se a tela não couber a tabela).
const COLUNAS_EXPEDICAO = [
    { id: "horario", titulo: "Horário" },
    { id: "titulo", titulo: "Plataforma / Cliente", maxLargura: "480px" },
    { id: "transportadora", titulo: "Transportadora", semQuebra: true },
    { id: "motorista", titulo: "Motorista", semQuebra: true },
    { id: "periodo", titulo: "Período", semQuebra: true },
    { id: "status", titulo: "Status", semQuebra: true },
    { id: "obs", titulo: "Observação", maxLargura: "480px" }
];

// sem período, e com o frete por último
const COLUNAS_TRANSPORTADOR = [
    { id: "horario", titulo: "Horário" },
    { id: "tipo", titulo: "Tipo", semQuebra: true },
    { id: "titulo", titulo: "Plataforma / Cliente", maxLargura: "480px" },
    { id: "transportadora", titulo: "Transportadora", semQuebra: true },
    { id: "motorista", titulo: "Motorista", semQuebra: true },
    { id: "status", titulo: "Status", semQuebra: true },
    { id: "retirada", titulo: "Retirada", maxLargura: "520px" },
    { id: "entrega", titulo: "Entrega", maxLargura: "560px" },
    { id: "obs", titulo: "Observação", maxLargura: "420px" },
    { id: "frete", titulo: "Frete", semQuebra: true }
];

const CHAVE_AGENDA_MODO = "agendaModo";

const CHAVE_AGENDA_ORDEM = "agendaOrdem";

const CHAVE_AGENDA_TEMA = "agendaTema";

// ordem das colunas de cada usuário (uma por modo), neste navegador
const CHAVE_AGENDA_COLUNAS = "agendaColunas";

// rascunhos do formulário (o que foi digitado e não foi salvo)
const CHAVE_AGENDA_RASCUNHOS = "agendaRascunhos";

// A agenda sempre fica separada por data. Isso é a ordem DENTRO de
// cada data (em todas, o desempate final é o horário).
const ORDENS = [
    { valor: "horario", rotulo: "Ordenar: horário (padrão)" },
    { valor: "motorista", rotulo: "Ordenar: motorista → horário" },
    { valor: "entregas", rotulo: "Ordenar: entregas primeiro", soTransportador: true },
    { valor: "coletas", rotulo: "Ordenar: coletas primeiro", soTransportador: true }
];

// valor especial do filtro: agendamentos sem transportadora
const SEM_TRANSPORTADORA = "__sem__";

let agendamentos = [];

let filtroTransportadora = "";

// "expedicao" ou "transportador"
let modoVisualizacao = "transportador";

// valor de ORDENS
let ordemAgenda = "horario";

// cadastro de motoristas: [{ id, transportadora, nome }]
// (vem da tabela "motoristas" do Supabase)
let motoristasCadastrados = [];

// null = novo agendamento; id = editando
let idEmEdicao = null;

// estado do carregamento (a lista mostra "Carregando..." ou o erro)
let carregandoAgenda = true;

let erroAgenda = "";

// hora (ms) da última carga, pra recarregar ao voltar pra aba
let ultimoCarregamento = 0;

// evita salvar duas vezes com clique duplo
let salvandoAgendamento = false;

// cadastro de transportadoras: [{ id, nome }]
// (vem da tabela "transportadoras" do Supabase)
let transportadorasCadastradas = [];

// o formulário foi mexido desde que abriu (só então vira rascunho)
let formularioAlterado = false;

let timerRascunho = null;

// quem está logado (a ordem das colunas é de cada usuário)
let usuarioAgenda = "";

// ordem das colunas escolhida: { expedicao: [ids], transportador: [ids] }
// (vazio = ordem padrão)
let ordemColunas = { expedicao: [], transportador: [] };

// coluna que está sendo arrastada pelo título
let colunaArrastada = null;

// filtro de datas (estilo Excel): as datas DESMARCADAS ficam aqui
// ("" = agendamentos sem data). Vazio = todas as datas aparecem.
let datasOcultas = new Set();

// filtro de status (igual ao de datas): os status DESMARCADOS ficam aqui.
// Vazio = todos os status aparecem.
let statusOcultos = new Set();

// valores que o agendamento tinha ao abrir (valores antigos fora do
// padrão continuam podendo ser salvos sem mexer neles)
let valoresOriginais = { horario: "", periodo: "" };
