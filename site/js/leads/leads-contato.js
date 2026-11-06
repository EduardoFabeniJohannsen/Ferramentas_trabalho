// ======================================
// LEADS - CONTATO
// ======================================
// Mensagem por segmento e links de WhatsApp, telefone e site.

// ======================================
// MENSAGENS
// ======================================
// Variáveis: {saudacao}, {empresa}, {cidade}, {vendedor}.
// "busca" = pedaços do nome do segmento (sem acento, em minúsculas).
// Segmento que não bate com nenhum usa a genérica.

const MENSAGEM_GENERICA =
    "{saudacao}! Aqui é {vendedor}, da W Rental. Trabalhamos com locação de plataformas elevatórias (tesoura e articulada), com entrega rápida e suporte técnico. A {empresa} tem alguma demanda de trabalho em altura em {cidade}? Posso passar um orçamento sem compromisso.";

const MENSAGENS_SEGMENTO = [
    {
        busca: ["constru", "obra", "incorpora", "engenharia"],
        texto: "{saudacao}! Aqui é {vendedor}, da W Rental. Vi a {empresa} e queria apresentar nossa locação de plataformas elevatórias para obras em {cidade}: tesoura e articulada, com entrega rápida e suporte técnico durante a locação. Posso passar um orçamento para a próxima etapa da obra?"
    },
    {
        busca: ["industr", "fabrica", "metal"],
        texto: "{saudacao}! Aqui é {vendedor}, da W Rental. Alugamos plataformas elevatórias (tesoura e articulada) para manutenção e montagem industrial, com entrega rápida em {cidade} e suporte técnico. A {empresa} tem alguma parada ou serviço em altura previsto?"
    },
    {
        busca: ["logistic", "galp", "armaz", "transport"],
        texto: "{saudacao}! Aqui é {vendedor}, da W Rental. Para galpões e centros de distribuição em {cidade}, alugamos plataformas elevatórias tesoura e articulada, com entrega rápida e suporte técnico. A {empresa} precisa de algum serviço em altura, como iluminação, cobertura ou estrutura?"
    },
    // antes da manutenção predial: "manutenção naval" também contém "manutenc"
    {
        busca: ["naval", "estaleiro", "embarca", "marina"],
        texto: "{saudacao}! Aqui é {vendedor}, da W Rental. Alugamos plataformas elevatórias (tesoura e articulada) para reparo e manutenção naval em {cidade}, como alternativa a andaimes e escadas, com entrega rápida e suporte técnico. A {empresa} tem algum serviço em altura previsto?"
    },
    {
        busca: ["manutenc", "predial", "facilit", "condomin"],
        texto: "{saudacao}! Aqui é {vendedor}, da W Rental. Alugamos plataformas elevatórias (tesoura e articulada) para manutenção predial e fachadas em {cidade}, com entrega rápida e suporte técnico. A {empresa} tem algum serviço em altura para os próximos dias?"
    },
    {
        busca: ["evento", "feira", "montagem"],
        texto: "{saudacao}! Aqui é {vendedor}, da W Rental. Para montagem de eventos e feiras em {cidade}, alugamos plataformas elevatórias tesoura e articulada, com entrega rápida e suporte técnico. A {empresa} tem alguma montagem chegando?"
    }
];


function semAcentoLeads(texto){

    return semAcento(texto || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}


function saudacaoAgora(){

    const hora = new Date().getHours();

    if(hora < 12) return "Bom dia";

    if(hora < 18) return "Boa tarde";

    return "Boa noite";
}


function montarMensagemLead(lead){

    const segmento = semAcentoLeads(lead.segmento);

    const modelo =
        MENSAGENS_SEGMENTO.find(item =>
            item.busca.some(pedaco => segmento.includes(pedaco))
        );

    let texto = modelo ? modelo.texto : MENSAGEM_GENERICA;

    // sem cidade: tira o "em {cidade}" pra frase não ficar pela metade
    if(!lead.cidade) texto = texto.replace(/ em \{cidade\}/g, "");

    return texto
        .replace(/\{saudacao\}/g, saudacaoAgora())
        .replace(/\{empresa\}/g, lead.empresa || "sua empresa")
        .replace(/\{cidade\}/g, lead.cidade || "")
        .replace(/\{vendedor\}/g, $("nomeVendedor").value.trim() || "a equipe");
}


// ======================================
// TELEFONE
// ======================================

// número com DDI 55, só dígitos ("" = não dá pra usar).
// Número brasileiro começando em 55 é DDI só se tiver 12 ou 13 dígitos:
// com 10 ou 11 o 55 é o DDD (Santa Maria/RS).
function numeroComDDI(valor){

    const digitos =
        String(valor || "")
            .replace(/\D/g, "")
            .replace(/^0+/, "");

    if(digitos.length < 10) return "";

    if(digitos.startsWith("55") && digitos.length >= 12) return digitos;

    return "55" + digitos;
}


function linkWhatsApp(lead){

    const numero = numeroComDDI(lead.whatsapp || lead.telefone);

    if(!numero) return "";

    return `https://wa.me/${numero}?text=${encodeURIComponent(montarMensagemLead(lead))}`;
}


function linkLigar(lead){

    const original = String(lead.telefone || lead.whatsapp || "");

    const digitos = original.replace(/\D/g, "");

    // 0800 e 0300 não levam DDI
    if(/^0(800|300)/.test(digitos)) return `tel:${digitos}`;

    const numero = numeroComDDI(original);

    return numero ? `tel:+${numero}` : "";
}


// o site vem de fora: só abre http e https (nada de javascript:)
function linkSite(site){

    const texto = String(site || "").trim();

    if(!texto) return "";

    const completo = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`;

    return /^https?:\/\//i.test(completo) ? completo : "";
}
