// ======================================
// CIDADE DE SAÍDA E MENSAGENS DE STATUS
// ======================================
// obterCidadeSaida() e gerarStatus() (botões Autorizado, ICMS, Frete ZOHO).
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// CIDADE DE SAÍDA DO FRETE
// ======================================
// De onde o equipamento sai, nas mensagens de frete.
// O toggle fica em ⚙️ Configurações (propostas.html) e o estado
// (cidadeSaidaAtual) vive em propostas-dados.js. Em outra página,
// que não tem o toggle, fica sempre Itajaí.
// zap = como aparece na Proposta Zap; zoho = na mensagem Frete ZOHO.

const CIDADES_SAIDA = {

    ITAJAI: {
        zap: "Itajai",
        zoho: "ITAJAÍ"
    },

    JOINVILLE: {
        zap: "Joinville",
        zoho: "JOINVILLE"
    }
};


function obterCidadeSaida(){

    const chave =
        typeof cidadeSaidaAtual !== "undefined"
            ? cidadeSaidaAtual
            : "ITAJAI";

    return CIDADES_SAIDA[chave] || CIDADES_SAIDA.ITAJAI;
}


// ======================================
// STATUS
// ======================================

function gerarStatus(tipo){

    const cidade =
        $("cidade")
            ? $("cidade")
                .value
                .toUpperCase()
            : "CIDADE";


    const frete =
        $("valorFrete")
            ? $("valorFrete").value
            : "0,00";


    // FreteZOHO só faz sentido com cidade e frete preenchidos
    if(
        tipo === "FreteZOHO" &&
        (!cidade.trim() || !frete.trim())
    ){

        return mostrarToast(
            "Informe cidade e frete",
            true
        );
    }


    const saida =
        obterCidadeSaida().zoho;


    const mensagens = {


        autorizado:
            `Autorizado Via Contrato XXX - Responsável: XXX <XXX>`,


        FreteZOHO:
`- FRETE POR CONTA DO CLIENTE / FATURADOS DO TRANSPORTADOR DIRETO PARA O CLIENTE ( Boleto - 14 DD )

- Frete entrega: R$ ${frete} - ${saida} x ${cidade}
- Frete retirada: R$ ${frete} - ${cidade} x ${saida}

Transportadores Indicados:
KUNG 47 9616-5616
MAGNUS 47 9754-0321
RR 47 9180-5385`,


        FreteZOHOLocComp:
`- FRETE INCLUSO NO ITEM LOCAÇÃO COMPLEMENTAR`,


        ICMS:
            `Saida sem incidencia de ICMS cfe Cap. II, art 6 do RICMS/SC`

    };


    const texto =
        mensagens[tipo];


    if(!texto) return;


    copiar(texto, tipo + " copiado");
}
