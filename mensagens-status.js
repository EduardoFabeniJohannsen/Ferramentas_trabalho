// ======================================
// STATUS / TEMPLATES DE MENSAGEM
// ======================================
// Usado no index.html (botões Faturado, Renovação, Autorizado,
// ICMS) e no propostas.html (botões Frete ZOHO / Frete ZOHO -
// Loc Complementar). Depende de helpers.js (precisa vir
// carregado antes).
//
// Esse é o arquivo pra abrir quando você quiser mexer só no
// TEXTO de uma dessas mensagens, sem risco de esbarrar em
// lógica de cálculo — aqui não tem nenhuma.

function gerarStatus(tipo){

    const hoje =
        new Date();


    const data =
        String(
            hoje.getDate()
        ).padStart(2,"0")
        + "/"
        +
        String(
            hoje.getMonth() + 1
        ).padStart(2,"0");


    const nome =
        "Eduardo";


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


    const mensagens = {


        faturado:
            `${data} - Faturado - ${nome}`,


        renovacaoEmail:
            `${data} - Enviado email de renovação - ${nome}`,


        renovacaoZap:
            `${data} - Enviado zap de renovação - ${nome}`,


        autorizado:
            `Autorizado Via Contrato XXX - Responsável: XXX <XXX>`,


        FreteZOHO:
`FRETE POR CONTA DO CLIENTE / FATURADOS DO TRANSPORTADOR DIRETO PARA O CLIENTE

* Frete entrega: R$ ${frete} - ITAJAÍ x ${cidade}
* Frete retirada: R$ ${frete} - ${cidade} x ITAJAÍ

Transportadores Indicados:
JEAN RICARDO SPIESS 47 99763-3333
KUNG 47 9616-5616
MAGNUS 47 9754-0321
RR (SOMENTE ATÉ WTE12)

PROPOSTA VÁLIDA POR 7 DIAS`,


        FreteZOHOLocComp:
`* FRETE INCLUSO NO ITEM LOCAÇÃO COMPLEMENTAR *
PROPOSTA VÁLIDA POR 7 DIAS`,


        CHEKLIST_Titulo:
            `CHEKLIST - PTA - ${
                $("nomeCliente")
                    ? $("nomeCliente")
                        .value
                        .toUpperCase()
                    : ""
            }`,


        CHEKLIST_Mensagem:
`Prezado Cliente,

Segue checklist de saída do equipamento locado.

Obrigada.`,


        ICMS:
            `Saida sem incidencia de ICMS cfe Cap. II, art 6 do RICMS/SC`

    };


    const texto =
        mensagens[tipo];


    if(!texto) return;


    copiar(texto);

    mostrarToast(
        tipo + " copiado"
    );
}
