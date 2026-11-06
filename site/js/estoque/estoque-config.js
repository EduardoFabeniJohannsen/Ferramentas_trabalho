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

// tipo do equipamento = letras do patrimônio depois do W:
// 1ª letra: W (logo da empresa, não significa nada)
// 2ª letra: A articulada, T tesoura, TL telescópica, Q quick up, M mastro
// 3ª letra: motor, E elétrico ou D diesel (quick up pode vir sem motor)
// Depois vêm os números (altura). Ex: WAE18 -> AE, WTLD25 -> TLD.
// "codigo" = essas letras. A ordem aqui é a ordem dos grupos na tela.
const TIPOS_ESTOQUE = [

    { codigo: "TE", titulo: "TESOURAS ELÉTRICAS" },

    { codigo: "AE", titulo: "ARTICULADAS ELÉTRICAS" },

    { codigo: "ME", titulo: "MASTRO ELÉTRICO" },

    { codigo: "AD", titulo: "ARTICULADAS A DIESEL" },

    { codigo: "TD", titulo: "TESOURAS A DIESEL" },

    { codigo: "TLE", titulo: "TELESCÓPICAS ELÉTRICAS" },

    { codigo: "TLD", titulo: "TELESCÓPICAS A DIESEL" },

    { codigo: "MD", titulo: "MASTRO A DIESEL" },

    { codigo: "QE", titulo: "QUICK UP ELÉTRICO" },

    { codigo: "Q", titulo: "QUICK UP" },

    // prefixos que NÃO são o mesmo modelo do normal (SUBWAD20 != WAD20)
    { codigo: "SUB", titulo: "SUB" },

    { codigo: "INUTI", titulo: "INUTI" }
];

const TITULO_OUTROS = "OUTROS";

// nome mostrado na tela quando difere do modelo calculado
// (vazio: mostra o modelo como foi calculado)
const ROTULO_MODELO = {};

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
