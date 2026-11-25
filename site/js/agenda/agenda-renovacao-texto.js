// ======================================
// AGENDA - EMAIL DE RENOVAÇÃO: OS TEXTOS
// ======================================
// Só textos, sem tela, para o ✉️ Email de renovação (agenda-renovacao.js): vence/venceu, Bom dia/Boa tarde, máquinas do mesmo modelo juntas, avisos extras pelo local ou cliente, e o assunto e o corpo (texto e HTML com o amarelo e o negrito do modelo do Outlook). As datas (feriados, prazo, dia da semana) ficam em agenda-renovacao-datas.js. O que o site não tem sai como marcador para trocar no Outlook (MARCADORES_RENOVACAO).

// o que o site não tem: sai assim no email e é trocado no Outlook (dois cliques)
const MARCADORES_RENOVACAO = {
    contato: "NOME_CONTATO",
    contrato: "NÚMERO_CONTRATO",
    codigoCliente: "NÚMERO",
    descricao: "DESCRIÇÃO_EQUIPAMENTO"
};


// os três de sempre (depois deles vêm os avisos extras marcados)
const AVISOS_PADRAO_RENOVACAO = [
    "O controle da data de vencimento é essencial para evitar renovações não planejadas.",
    "Equipamentos devolvidos após o prazo terão diárias adicionais, inclusive em finais de semana.",
    "A locação só será oficialmente encerrada com o envio da nota de devolução para o e-mail do comercial."
];

// avisos extras: os com "busca" já vêm marcados quando o local, o endereço ou o
// cliente têm uma dessas palavras (sem ligar para acento e maiúsculas)
const AVISOS_EXTRAS_RENOVACAO = [
    { id: "weg", rotulo: "WEG", busca: [/\bweg\b/],
        texto: "Informamos que a própria WEG não autoriza a retirada do equipamento sem a apresentação da Nota Fiscal de Retorno." },
    { id: "biomedical", rotulo: "Biomedical", busca: [/biomedical/],
        texto: "Informamos que a própria Biomedical não autoriza a retirada do equipamento sem a apresentação da Nota Fiscal de Retorno." },
    { id: "lear", rotulo: "Lear", busca: [/\blear\b/],
        texto: "Como o equipamento locado se encontra na Lear, a mesma não permite realizar a coleta sem a nota fiscal de retorno" },
    { id: "karsten", rotulo: "Karsten", busca: [/karsten/],
        texto: "A Karsten não autoriza retirada dos equipamentos sem apresentar NF na portaria." },
    { id: "beto-carrero", rotulo: "Beto Carrero World", busca: [/beto carrero/, /\bj\.? ?b\.? world\b/],
        texto: "Para a retirada do equipamento, o Beto Carrero World exige a apresentação da nota fiscal de devolução." },
    { id: "sem-ie", rotulo: "Cliente sem Inscrição Estadual",
        texto: "A W Rental somente poderá emitir a NF de Retorno quando o cliente não possuir Inscrição Estadual, situação em que estará impossibilitado de realizar a emissão." },
    { id: "credito", rotulo: "Cliente com restrição de crédito",
        texto: "Ressaltamos que, devido à condição de crédito vigente, o não pagamento das FTs nos respectivos vencimentos poderá resultar no recolhimento do equipamento no vencimento da locação" }
];


// ======================================
// AVISOS EXTRAS
// ======================================

// os avisos que combinam com o local, o endereço ou o cliente (ids)
function avisosDoLocal(item){

    const texto =
        semAcento([item.cliente, item.destinoNome, item.destinoEndereco].join(" ")).toLowerCase();

    return AVISOS_EXTRAS_RENOVACAO
        .filter(aviso => (aviso.busca || []).some(regra => regra.test(texto)))
        .map(aviso => aviso.id);
}


// ======================================
// ASSUNTO E CORPO
// ======================================

// máquinas do mesmo modelo juntas: [{ codigos: "WTE10025 + WTE10N041" }]
function equipamentosRenovacao(plataforma){

    const grupos = new Map();

    separarPlataformas(plataforma).forEach(parte => {

        const modelo = modeloDaPlataforma(parte.patrimonio);

        grupos.set(modelo, [...(grupos.get(modelo) || []), parte]);
    });

    return [...grupos.values()].map(partes => ({
        codigos: partes
            .map(parte => parte.quantidade > 1 ? `${parte.quantidade}x ${parte.patrimonio}` : parte.patrimonio)
            .join(" + ")
    }));
}


// tudo o que o email usa, já calculado. dados: { item, vencimento, prazo,
// feriado, local, endereco, avisos (ids), agora (Date) }
function camposRenovacao(dados){

    const hoje = isoDoDiaRenovacao(dados.agora);

    const equipamentos = equipamentosRenovacao(dados.item.plataforma);

    return {
        saudacao: dados.agora.getHours() < 12 ? "Bom dia" : "Boa tarde",
        verbo: dados.vencimento < hoje ? "venceu" : "vence",
        vencimento: dataBR(dados.vencimento),
        diaSemana: diaDaSemanaRenovacao(dados.vencimento) + (dados.feriado ? " ( Feriado )" : ""),
        prazo: diaMesRenovacao(dados.prazo),
        equipamentos,
        codigos: equipamentos.map(grupo => grupo.codigos).join(" + "),
        cliente: String(dados.item.cliente || "").trim().toUpperCase(),
        local: String(dados.local || "").trim(),
        endereco: String(dados.endereco || "").trim(),
        avisos: [
            ...AVISOS_PADRAO_RENOVACAO,
            ...AVISOS_EXTRAS_RENOVACAO.filter(aviso => dados.avisos.includes(aviso.id)).map(aviso => aviso.texto)
        ]
    };
}


// RENOVAÇÃO DE LOCAÇÃO -> NÚMERO_CONTRATO ( WTE8C15 ) -> NÚMERO - CLIENTE
function assuntoRenovacao(campos){

    const m = MARCADORES_RENOVACAO;

    return `RENOVAÇÃO DE LOCAÇÃO -> ${m.contrato} ( ${campos.codigos} ) -> ${m.codigoCliente} - ${campos.cliente}`;
}


function textoRenovacao(campos){

    const m = MARCADORES_RENOVACAO;

    return [
        `${campos.saudacao} ${m.contato}, tudo bem?`,
        "",
        `Estamos entrando em contato para lembrar que o contrato de locação nº ${m.contrato} referente à:`,
        ...campos.equipamentos.map(grupo => `${m.descricao} - (${grupo.codigos})`),
        "",
        `${campos.verbo} dia ${campos.vencimento} – ${campos.diaSemana}`,
        "",
        `Local:  ${campos.local}`,
        `Endereço: ${campos.endereco}`,
        "",
        `Por gentileza, pedimos que nos informes até o final do dia ${campos.prazo} se deseja prorrogar ou encerrar a locação.`,
        "Caso não haja retorno, o contrato será renovado automaticamente por mais um período.",
        "",
        "⚠️ Importante:",
        ...campos.avisos.map(aviso => `• ${aviso}`),
        "",
        "Estamos à disposição para qualquer dúvida.",
        "Desde já, agradecemos pela atenção!"
    ].join("\n");
}


function escaparRenovacao(texto){

    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}


// o mesmo texto com a formatação do modelo do Outlook (Calibri 11, amarelo no
// vencimento, no prazo e no Importante)
function htmlRenovacao(campos){

    const m = MARCADORES_RENOVACAO;

    const e = escaparRenovacao;

    const p = (conteudo) => `<p style="margin:0">${conteudo}</p>`;

    const vazio = p("&nbsp;");

    const amarelo = (texto, extra = "") => `<span style="background:yellow${extra}">${texto}</span>`;

    return [
        '<div style="font-family:Calibri,sans-serif;font-size:11pt;color:#000">',
        p(`${e(campos.saudacao)} ${e(m.contato)}, tudo bem?`),
        vazio,
        p(`Estamos entrando em contato para lembrar que o contrato de locação nº ${e(m.contrato)} referente à:`),
        ...campos.equipamentos.map(grupo => p(`${e(m.descricao)} - (${e(grupo.codigos)})`)),
        vazio,
        p(`<b>${amarelo(`${e(campos.verbo)} dia ${e(campos.vencimento)}`)} – ${e(campos.diaSemana)}</b>`),
        vazio,
        p(`<b>Local:&nbsp; </b>${e(campos.local)}`),
        p(`<b>Endereço: </b>${e(campos.endereco)}`),
        vazio,
        p(`Por gentileza, pedimos que nos informes até o final do dia <b>${amarelo(e(campos.prazo), ";font-size:14pt")}</b> se deseja prorrogar ou encerrar a locação.`),
        p("<b>Caso não haja retorno, o contrato será renovado automaticamente por mais um período.</b>"),
        vazio,
        p(`<b>${amarelo("⚠️ Importante:")}</b>`),
        ...campos.avisos.map(aviso => p(`•&nbsp;${e(aviso)}`)),
        vazio,
        p("Estamos à disposição para qualquer dúvida."),
        p("Desde já, agradecemos pela atenção!"),
        "</div>"
    ].join("");
}
