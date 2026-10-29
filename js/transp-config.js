// ======================================
// TRANSPORTADORAS - CONFIGURAÇÃO E ESTADO
// ======================================
// Tabelas, bucket, medidas do veículo, rótulos de documento e variáveis de estado.
// Página só para admin (as policies de RLS no Supabase é que protegem os dados).

// ======================================
// CONFIGURAÇÃO
// ======================================

const TRANSP_TABELAS = {
    transportadoras: "transportadoras",
    veiculos: "veiculos",
    motoristas: "motoristas",
    motoristasDados: "motoristas_dados",
    docs: "transportadora_docs",
    agendamentos: "agendamentos"
};

// bucket privado: os PDFs só abrem por link temporário
const BUCKET_DOCS = "docs-transportadoras";

const LIMITE_PDF_BYTES = 5 * 1024 * 1024;

// carreta tem 2 placas (cavalo + carreta); prancha tem 1
const TIPOS_VEICULO = ["Prancha", "Carreta"];

// medidas em metros; capacidade de carga em kg
const MEDIDAS_VEICULO = [
    { campo: "largura", rotulo: "Largura (m)" },
    { campo: "comprimento", rotulo: "Comprimento (m)" },
    { campo: "altura_com_patola", rotulo: "Altura com patola (m)" },
    { campo: "altura_sem_patola", rotulo: "Altura sem patola (m)" },
    { campo: "capacidade_carga", rotulo: "Capacidade de carga (kg)" }
];

// sugestões de rótulo ao anexar PDF (o campo aceita qualquer texto)
const ROTULOS_DOC = {
    veiculo: ["CRLV", "ANTT", "Seguro", "Outro"],
    motorista: ["CNH", "ASO", "Comprovante de residência", "Outro"]
};

// o navegador lembra a última transportadora escolhida
const CHAVE_TRANSP_ULTIMA = "transportadorasUltima";


// ======================================
// ESTADO
// ======================================

// nomes das transportadoras (tabela "transportadoras")
let transpLista = [];

let transpAtual = "";

// "veiculos" ou "motoristas"
let abaTransp = "veiculos";

// da transportadora escolhida
let veiculosTransp = [];

// { id, transportadora, nome, cpf, data_nascimento, cnh }
let motoristasTransp = [];

// documentos dos veículos e motoristas da transportadora escolhida
let docsTransp = [];

let carregandoTransp = true;

let erroTransp = "";

// descarta resposta antiga se trocou de transportadora enquanto carregava
let cargaTransp = 0;

// formulário aberto: { tipo: "veiculo" | "motorista", id: null (novo) | número }
let modalTransp = { tipo: "", id: null };

// quem não é admin só vê (lista, dados e PDFs): some tudo que edita.
// Começa travado; o transp-init.js libera para o admin.
let transpSoLeitura = true;

// evita salvar duas vezes com clique duplo
let salvandoTransp = false;
