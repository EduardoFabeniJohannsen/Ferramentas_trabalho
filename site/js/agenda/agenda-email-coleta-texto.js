// ======================================
// AGENDA - EMAIL DE AGENDAMENTO DA COLETA: OS TEXTOS
// ======================================
// Só textos, sem tela, para o ✉️ da coleta (agenda-email-coleta.js): as instruções da coleta (data com o dia da semana, horário, equipamentos, local e endereço, acesso do caminhão, bateria e diesel) e as da NF de devolução (referência da NF de remessa, CFOPs, NF de remessa em anexo). Cliente sem Inscrição Estadual não emite a NF: no lugar das instruções dela vai o aviso de que a W Rental emite. Assunto no padrão do da renovação (com os marcadores de agenda-renovacao-texto.js), corpo em texto e em HTML (Calibri 11, para colar no Outlook).


// as orientações da retirada: [título, [itens]]
const ORIENTACOES_COLETA = [
    ["🚛 Acesso para o caminhão", [
        "Deixar a máquina em local que permita fácil aproximação e manobra do caminhão transportador."
    ]],
    ["📍 Localização clara dentro da obra", [
        "Informar previamente o ponto exato onde o equipamento estará disponível.",
        "Em obras de grande porte, é indispensável que a equipe responsável saiba indicar corretamente a localização da máquina."
    ]],
    ["🔋 Equipamentos elétricos", [
        "Devem ser devolvidos com carga na bateria."
    ]],
    ["⛽ Equipamentos a diesel", [
        "Devem ser devolvidos com, no mínimo, meio tanque de combustível."
    ]]
];

// a NF de devolução que o cliente emite (quem tem Inscrição Estadual)
const NOTA_FISCAL_COLETA = [
    ["⚠️ Instruções para Emissão de Nota Fiscal", []],
    ["🚫 ATENÇÃO", [
        "A nota de retorno deve referenciar no campo de observação a nota de remessa do equipamento exemplo \"REF NF 018908\""
    ]],
    ["⚠️ CFOP aceitos para NF de devolução:", [
        "CFOP 5.909 – Retorno de bem recebido por conta de contrato de comodato.",
        "CFOP 6.909 – Retorno de bem recebido por conta de contrato de comodato ou locação."
    ]],
    ["📎 NF DE REMESSA EM ANEXO", [
        "Encaminharemos em anexo a Nota Fiscal de Remessa para auxiliar na correta emissão da NF de Devolução"
    ]]
];

// sem Inscrição Estadual o cliente não pode emitir: a W Rental emite
const NOTA_FISCAL_SEM_IE_COLETA = [
    ["⚠️ Nota Fiscal de Retorno", [
        "Como o cliente não possui Inscrição Estadual, a NF de Retorno será emitida pela W Rental: não é necessário emitir a NF de devolução."
    ]]
];


// o horário da agenda também pode ser CONFIRMAR ou IMEDIATO
const HORARIOS_TEXTO_COLETA = { CONFIRMAR: "A confirmar", IMEDIATO: "Imediato" };


// "2026-11-18" -> "Quarta-feira"
function diaDaSemanaColeta(iso){

    const dia = diaDaSemanaRenovacao(iso);

    return dia.charAt(0).toUpperCase() + dia.slice(1);
}


// "WTE14L039 + WTE14L060" -> "WTE14L039 / WTE14L060" ("2x WTE12" fica assim)
function equipamentosColeta(plataforma){

    return separarPlataformas(plataforma)
        .map(parte => parte.quantidade > 1 ? `${parte.quantidade}x ${parte.patrimonio}` : parte.patrimonio)
        .join(" / ");
}


// tudo o que o email usa. dados: { cliente, data (iso), horario, equipamentos
// ("WTE14L039 / WTE14L060"), local, endereco, semIe }
function camposEmailColeta(dados){

    const equipamentos = String(dados.equipamentos || "").trim();

    const quantos = separarPlataformas(equipamentos).reduce((total, parte) => total + parte.quantidade, 0);

    return {
        data: dataBR(dados.data),
        diaSemana: diaDaSemanaColeta(dados.data),
        horario: HORARIOS_TEXTO_COLETA[String(dados.horario || "").trim().toUpperCase()] || String(dados.horario || "").trim(),
        rotuloEquipamentos: quantos > 1 ? "Equipamentos" : "Equipamento",
        equipamentos,
        cliente: String(dados.cliente || "").trim().toUpperCase(),
        local: String(dados.local || "").trim(),
        endereco: String(dados.endereco || "").trim(),
        notaFiscal: dados.semIe ? NOTA_FISCAL_SEM_IE_COLETA : NOTA_FISCAL_COLETA
    };
}


// AGENDAMENTO DE COLETA -> NÚMEROCONTRATO ( WTE14L039 / WTE14L060 ) -> NÚMERO - CLIENTE
function assuntoEmailColeta(campos){

    const m = MARCADORES_RENOVACAO;

    return `AGENDAMENTO DE COLETA -> ${m.contrato} ( ${campos.equipamentos} ) -> ${m.codigoCliente} - ${campos.cliente}`;
}


// linha em branco antes do grupo quando o de cima tem itens (o título sem
// itens, como o "Instruções para Emissão de Nota Fiscal", fica junto do próximo)
function brancoAntesDoGrupo(grupos, indice){

    return indice > 0 && grupos[indice - 1][1].length > 0;
}


// [título, [itens]] -> linhas
function linhasDosGrupos(grupos){

    return grupos.flatMap(([titulo, itens], indice) => [
        ...(brancoAntesDoGrupo(grupos, indice) ? [""] : []),
        titulo,
        ...itens.map(item => `• ${item}`)
    ]);
}


function textoEmailColeta(campos){

    return [
        "⚠️ Instruções para Coleta do Equipamento",
        `📅 Data da coleta: ${campos.data} – ${campos.diaSemana}`,
        `🕒 Horário previsto: ${campos.horario}`,
        `🚜${campos.rotuloEquipamentos}: ${campos.equipamentos}`,
        "",
        `📍Local: ${campos.local}`,
        `📍Endereço: ${campos.endereco}`,
        "",
        "• Para garantir agilidade, segurança e evitar contratempos no momento da retirada, solicitamos atenção às orientações abaixo:",
        ...linhasDosGrupos(ORIENTACOES_COLETA),
        "",
        "O não atendimento das orientações acima poderá gerar atrasos e custos adicionais por reprogramação.",
        "",
        ...linhasDosGrupos(campos.notaFiscal)
    ].join("\n");
}


// o mesmo texto com a formatação do Outlook (Calibri 11; títulos em negrito,
// data e horário em amarelo)
function htmlEmailColeta(campos){

    const e = escaparRenovacao;

    const p = (conteudo) => `<p style="margin:0">${conteudo}</p>`;

    const vazio = p("&nbsp;");

    const amarelo = (texto) => `<span style="background:yellow">${texto}</span>`;

    const grupos = (lista) => lista.flatMap(([titulo, itens], indice) => [
        ...(brancoAntesDoGrupo(lista, indice) ? [vazio] : []),
        p(`<b>${e(titulo)}</b>`),
        ...itens.map(item => p(`•&nbsp;${e(item)}`))
    ]);

    return [
        '<div style="font-family:Calibri,sans-serif;font-size:11pt;color:#000">',
        p("<b>⚠️ Instruções para Coleta do Equipamento</b>"),
        p(`<b>📅 Data da coleta:</b> ${amarelo(`${e(campos.data)} – ${e(campos.diaSemana)}`)}`),
        p(`<b>🕒 Horário previsto:</b> ${amarelo(e(campos.horario))}`),
        p(`<b>🚜${e(campos.rotuloEquipamentos)}:</b> ${e(campos.equipamentos)}`),
        vazio,
        p(`<b>📍Local:</b> ${e(campos.local)}`),
        p(`<b>📍Endereço:</b> ${e(campos.endereco)}`),
        vazio,
        p("•&nbsp;Para garantir agilidade, segurança e evitar contratempos no momento da retirada, solicitamos atenção às orientações abaixo:"),
        ...grupos(ORIENTACOES_COLETA),
        vazio,
        p("<b>O não atendimento das orientações acima poderá gerar atrasos e custos adicionais por reprogramação.</b>"),
        vazio,
        ...grupos(campos.notaFiscal),
        "</div>"
    ].join("");
}
