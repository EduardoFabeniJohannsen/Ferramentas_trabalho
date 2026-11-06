// ======================================
// CIDADE DE SAÍDA E MENSAGENS DE STATUS
// ======================================
// obterCidadeSaida(), obterFreteBonificado() (entrega, retirada ou as duas de graça), freteWRental() (a parte do frete paga pela W Rental) e gerarStatus() (botões Autorizado, ICMS, Frete ZOHO).
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
// FRETE BONIFICADO
// ======================================
// A entrega, a retirada ou as duas saem de graça para o cliente. A caixa fica
// embaixo do Valor frete (propostas.html); em outra página, as duas são cobradas.
// "" = as duas cobradas, "entrega" ou "retirada" = a bonificada, "ambas" = as duas.

const FRETES_BONIFICADOS = ["entrega", "retirada", "ambas"];


function obterFreteBonificado(){

    const valor = $("freteBonificado")?.value;

    return FRETES_BONIFICADOS.includes(valor) ? valor : "";
}


// qual = "entrega" ou "retirada"
function freteEstaBonificado(qual){

    const bonificado = obterFreteBonificado();

    return bonificado === qual || bonificado === "ambas";
}


// quantos fretes o cliente paga: 2 (ida e volta), 1 ou 0 (os dois bonificados)
function fretesCobrados(){

    const bonificado = obterFreteBonificado();

    return bonificado === "ambas" ? 0 : bonificado ? 1 : 2;
}


// ======================================
// PARTE DA W RENTAL NO FRETE
// ======================================
// Campo "W Rental paga" (embaixo do Valor frete, propostas.html): quanto a
// W Rental paga de cada frete cobrado; o cliente paga o resto. Ex: frete
// R$ 1.000,00 e W Rental R$ 400,00 = o cliente paga R$ 600,00 na entrega e
// R$ 600,00 na retirada. Vazio ou em outra página = 0.

function freteWRental(){

    const valor = brToNumber($("freteWRental")?.value || "");

    return Number.isFinite(valor) && valor > 0 ? valor : 0;
}


// o que o cliente paga em cada frete (0 ou menos = a parte da W Rental não cabe no frete)
function freteDoCliente(frete){

    return frete - freteWRental();
}


// a parte da W Rental precisa ser menor que o frete (o frete todo é o Frete bonificado)
function parteWRentalInvalida(frete){

    return freteWRental() > 0 && !(freteDoCliente(frete) > 0);
}


// Valor de um frete cobrado nas mensagens (Proposta Zap e Frete ZOHO), a partir
// do Valor frete digitado. Sem a parte da W Rental, o texto digitado e sem nota.
// Com ela: valor = "R$ 600,00" e nota = " (frete R$ 1.000,00, sendo R$ 400,00
// por conta da W Rental)".
function valorFreteMensagem(textoFrete){

    const parte = freteWRental();

    if(!parte) return { valor: `R$ ${textoFrete}`, nota: "" };

    const frete = brToNumber(textoFrete);

    return {
        valor: `R$ ${formatarMoedaBR(freteDoCliente(frete))}`,
        nota: ` (frete R$ ${formatarMoedaBR(frete)}, sendo R$ ${formatarMoedaBR(parte)} por conta da W Rental)`
    };
}


// ======================================
// STATUS
// ======================================

function gerarStatus(tipo){

    const cidade =
        $("cidade")
            ? $("cidade")
                .value
                .trim()
                .toUpperCase()
            : "CIDADE";


    const frete =
        $("valorFrete")
            ? $("valorFrete").value
            : "0,00";


    // entrega e retirada bonificadas: o cliente não paga frete, não precisa do valor
    const semFrete =
        fretesCobrados() === 0;


    // FreteZOHO só faz sentido com cidade e frete preenchidos
    if(
        tipo === "FreteZOHO" &&
        (!cidade || (!frete.trim() && !semFrete))
    ){

        return mostrarToast(
            semFrete ? "Informe a cidade" : "Informe cidade e frete",
            true
        );
    }


    // a parte da W Rental precisa caber no frete
    if(tipo === "FreteZOHO" && !semFrete && parteWRentalInvalida(brToNumber(frete))){

        return mostrarToast(
            "A parte da W Rental precisa ser menor que o frete",
            true
        );
    }


    // locação complementar: a mensagem diz a rota, precisa da cidade
    if(tipo === "FreteZOHOLocComp" && !cidade){

        return mostrarToast(
            "Informe a cidade",
            true
        );
    }


    const saida =
        obterCidadeSaida().zoho;


    // o frete cobrado (com a parte da W Rental, a do cliente e a nota)
    const cobrado =
        valorFreteMensagem(frete.trim());

    // o frete bonificado sai sem valor (BONIFICADO no lugar do R$)
    // qual = "entrega" ou "retirada"
    const valorZoho = (qual) =>
        freteEstaBonificado(qual) ? "BONIFICADO" : cobrado.valor;

    const notaZoho = (qual) =>
        freteEstaBonificado(qual) ? "" : cobrado.nota;

    const nomeZoho = (qual, nome) =>
        freteEstaBonificado(qual) ? `${nome} BONIFICADA` : nome;


    const linhasFreteZoho =
`- Frete entrega: ${valorZoho("entrega")} - ${saida} x ${cidade}${notaZoho("entrega")}
- Frete retirada: ${valorZoho("retirada")} - ${cidade} x ${saida}${notaZoho("retirada")}`;


    // os dois bonificados: os dois botões copiam só essas duas linhas
    // (sem boleto, valores, transportadores nem locação complementar)
    if(semFrete && (tipo === "FreteZOHO" || tipo === "FreteZOHOLocComp")){

        return copiar(linhasFreteZoho, "Frete bonificado copiado");
    }


    const mensagens = {


        autorizado:
            `Autorizado Via Contrato XXX - Responsável: XXX <XXX>`,


        FreteZOHO:
`- FRETE POR CONTA DO CLIENTE / FATURADOS DO TRANSPORTADOR DIRETO PARA O CLIENTE ( Boleto - 14 DD )

${linhasFreteZoho}

- Valores sujeitos à alteração no retorno conforme reajustes de mercado, combustível, pedágios e inflação do período (IPCA).
- Alteração de endereço de entrega/coleta poderá alterar o valor do frete.

Transportadores Indicados:
Dionizio Transportes:
47 9784-0248

Magnus Guinchos:
47 9754-0321

RR Guinchos:
47 9180-5385

JGR Guinchos:
47 9720-5094`,


        // o valor do frete já está no item, então vai só a rota
        FreteZOHOLocComp:
`- FRETE INCLUSO NO ITEM LOCAÇÃO COMPLEMENTAR - ${nomeZoho("entrega", "ENTREGA")} ( ${saida} x ${cidade} ) - ${nomeZoho("retirada", "RETIRADA")} ( ${cidade} x ${saida} )`,


        ICMS:
            `Saida sem incidencia de ICMS cfe Cap. II, art 6 do RICMS/SC`

    };


    const texto =
        mensagens[tipo];


    if(!texto) return;


    copiar(texto, tipo + " copiado");
}
