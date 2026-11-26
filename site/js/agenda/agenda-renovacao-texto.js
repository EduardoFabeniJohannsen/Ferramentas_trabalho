// ======================================
// AGENDA - EMAIL DE RENOVAÇÃO: OS TEXTOS
// ======================================
// Só textos, sem tela, para o ✉️ Email de renovação (agenda-renovacao.js): o endereço do Sisloc arrumado ("R X Numero: 740 ... Cidade: POMERODE Estado: SC" -> "R X, 740 - Bairro, Pomerode/SC"), vence/venceu, Bom dia/Boa tarde, máquinas do mesmo modelo juntas, avisos extras (o da NF de retorno com o nome da empresa), e o assunto e o corpo (texto e HTML com o amarelo e o negrito do modelo do Outlook). As datas (feriados, prazo, dia da semana) ficam em agenda-renovacao-datas.js. O que o site não tem sai como marcador para trocar no Outlook (MARCADORES_RENOVACAO).

// o que o site não tem: sai assim no email e é trocado no Outlook (dois cliques:
// sem "_", senão o clique duplo seleciona só um pedaço)
const MARCADORES_RENOVACAO = {
    contato: "NOMECONTATO",
    contrato: "NÚMEROCONTRATO",
    codigoCliente: "NÚMERO",
    descricao: "DESCRIÇÃOEQUIPAMENTO"
};


// os de sempre (depois deles vêm os avisos extras marcados). A coleta não
// depende da NF de devolução: só quando a portaria do cliente exige (aviso extra)
const AVISOS_PADRAO_RENOVACAO = [
    "O controle da data de vencimento é essencial para evitar renovações não planejadas.",
    "Equipamentos devolvidos após a data de vencimento terão diárias adicionais, inclusive em finais de semana.",
    // renovou e devolveu antes do fim do período novo: a FT não é cancelada
    "Se o contrato for renovado automaticamente e o equipamento for devolvido antes do fim do novo período, a fatura de locação não será cancelada: o valor ficará como crédito.",
    "Para encerrar a locação, basta responder a este e-mail confirmando a coleta ou avisar seu consultor pelo WhatsApp."
];

// avisos extras. O "empresa" é um só para qualquer lugar que não libera a
// coleta sem a NF de retorno: o nome da empresa é escrito na janela
const AVISOS_EXTRAS_RENOVACAO = [
    { id: "empresa", rotulo: "Retirada só com NF de retorno:",
        texto: (empresa) => `Informamos que a ${empresa || "EMPRESA"} não autoriza a retirada do equipamento sem a apresentação da Nota Fiscal de Retorno.` },
    { id: "sem-ie", rotulo: "Cliente sem Inscrição Estadual",
        texto: "A W Rental somente poderá emitir a NF de Retorno quando o cliente não possuir Inscrição Estadual, situação em que estará impossibilitado de realizar a emissão." },
    { id: "credito", rotulo: "Cliente com restrição de crédito",
        texto: "Ressaltamos que, devido à condição de crédito vigente, o não pagamento das FTs nos respectivos vencimentos poderá resultar no recolhimento do equipamento no vencimento da locação" }
];

// as que já se sabe que não liberam sem a NF de retorno: no local, no endereço ou
// no cliente (sem ligar para acento e maiúsculas), o aviso vem marcado com o nome
const EMPRESAS_NF_RETORNO = [
    { nome: "WEG", busca: /\bweg\b/ },
    { nome: "Biomedical", busca: /biomedical/ },
    { nome: "Lear", busca: /\blear\b/ },
    { nome: "Karsten", busca: /karsten/ },
    { nome: "Beto Carrero World", busca: /beto carrero|\bj\.? ?b\.? world\b/ }
];


// ======================================
// AVISOS EXTRAS
// ======================================

// a empresa conhecida no local, no endereço ou no cliente ("WEG"), ou ""
function empresaNfRetorno(item){

    const texto =
        semAcento([item.cliente, item.destinoNome, item.destinoEndereco].join(" ")).toLowerCase();

    return EMPRESAS_NF_RETORNO.find(empresa => empresa.busca.test(texto))?.nome || "";
}


function textoAvisoExtra(aviso, empresa){

    return typeof aviso.texto === "function" ? aviso.texto(String(empresa || "").trim()) : aviso.texto;
}


// ======================================
// ENDEREÇO DO SISLOC
// ======================================

// preposições e artigos ficam minúsculos no meio do nome
const MINUSCULAS_ENDERECO = new Set(["de", "da", "do", "das", "dos", "e", "a", "o"]);

// "PRESIDENTE COSTA E SILVA" -> "Presidente Costa e Silva". Só texto todo em
// maiúsculas; ficam como estão: números romanos (XV), siglas sem vogal (BR, SC)
// e o que tem número
function nomeProprioEndereco(texto){

    const limpo = String(texto || "").trim().replace(/\s+/g, " ");

    if(!limpo || /\p{Ll}/u.test(limpo)) return limpo;

    return limpo.split(" ").map((palavra, indice) => {

        const minuscula = palavra.toLowerCase();

        if(indice > 0 && MINUSCULAS_ENDERECO.has(minuscula)) return minuscula;

        if(/\d/.test(palavra) || /^[IVXLC]+$/.test(palavra) || !/[AEIOUÁÉÍÓÚÂÊÔÃÕ]/.test(palavra)) return palavra;

        return minuscula.charAt(0).toUpperCase() + minuscula.slice(1);
    }).join(" ");
}


// O endereço que vem do Sisloc, com os rótulos: "R PRESIDENTE COSTA E SILVA
// Numero: 740 Complemento: - Bairro: TESTO REGA Cidade: POMERODE Estado: SC" ->
// "R Presidente Costa e Silva, 740 - Testo Rega, Pomerode/SC". Sem os rótulos
// (digitado ou do Google Maps), fica como está
function enderecoDoSisloc(texto){

    const original = String(texto || "").trim();

    const rotulos = [...original.matchAll(/(N[uú]mero|Complemento|Bairro|Cidade|Estado|UF|CEP)\s*:/gi)];

    if(rotulos.length < 2) return original;

    const partes = {};

    rotulos.forEach((achou, indice) => {

        const fim = indice + 1 < rotulos.length ? rotulos[indice + 1].index : original.length;

        const valor = original.slice(achou.index + achou[0].length, fim).trim();

        const nome = semAcento(achou[1]).toLowerCase();

        partes[nome === "uf" ? "estado" : nome] = valor === "-" ? "" : valor;
    });

    const rua = nomeProprioEndereco(original.slice(0, rotulos[0].index));

    const numero = partes.numero ? `, ${partes.numero}` : "";

    const complemento = partes.complemento ? `, ${nomeProprioEndereco(partes.complemento)}` : "";

    const bairro = partes.bairro ? ` - ${nomeProprioEndereco(partes.bairro)}` : "";

    const cidade = partes.cidade ? `, ${nomeProprioEndereco(partes.cidade)}${partes.estado ? `/${partes.estado.toUpperCase()}` : ""}` : "";

    const cep = partes.cep ? `, CEP ${partes.cep}` : "";

    return `${rua}${numero}${complemento}${bairro}${cidade}${cep}`.replace(/^,\s*/, "");
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
// feriado, local, endereco, avisos (ids), empresa (do aviso da NF de retorno), agora (Date) }
function camposRenovacao(dados){

    const hoje = isoDoDiaRenovacao(dados.agora);

    const equipamentos = equipamentosRenovacao(dados.item.plataforma);

    return {
        saudacao: dados.agora.getHours() < 12 ? "Bom dia" : "Boa tarde",
        verbo: dados.vencimento < hoje ? "venceu" : "vence",
        vencimento: dataBR(dados.vencimento),
        // "(segunda-feira)" ou "(segunda-feira, feriado)"
        diaSemana: `(${diaDaSemanaRenovacao(dados.vencimento)}${dados.feriado ? ", feriado" : ""})`,
        prazo: diaMesRenovacao(dados.prazo),
        // "ao equipamento" ou "aos equipamentos"
        referente: separarPlataformas(dados.item.plataforma).reduce((total, parte) => total + parte.quantidade, 0) > 1
            ? "aos equipamentos"
            : "ao equipamento",
        equipamentos,
        codigos: equipamentos.map(grupo => grupo.codigos).join(" + "),
        cliente: String(dados.item.cliente || "").trim().toUpperCase(),
        local: String(dados.local || "").trim(),
        endereco: String(dados.endereco || "").trim(),
        avisos: [
            ...AVISOS_PADRAO_RENOVACAO,
            ...AVISOS_EXTRAS_RENOVACAO
                .filter(aviso => dados.avisos.includes(aviso.id))
                .map(aviso => textoAvisoExtra(aviso, dados.empresa))
        ]
    };
}


// RENOVAÇÃO DE LOCAÇÃO -> NÚMEROCONTRATO ( WTE8C15 ) -> NÚMERO - CLIENTE
function assuntoRenovacao(campos){

    const m = MARCADORES_RENOVACAO;

    return `RENOVAÇÃO DE LOCAÇÃO -> ${m.contrato} ( ${campos.codigos} ) -> ${m.codigoCliente} - ${campos.cliente}`;
}


function textoRenovacao(campos){

    const m = MARCADORES_RENOVACAO;

    return [
        `${campos.saudacao} ${m.contato}, tudo bem?`,
        "",
        `Estamos entrando em contato para lembrar que o contrato de locação nº ${m.contrato} referente ${campos.referente}:`,
        ...campos.equipamentos.map(grupo => `${m.descricao} - (${grupo.codigos})`),
        "",
        `${campos.verbo} no dia ${campos.vencimento} ${campos.diaSemana}`,
        "",
        `Local:  ${campos.local}`,
        `Endereço: ${campos.endereco}`,
        "",
        `Por gentileza, nos informe até o final do dia ${campos.prazo} se deseja prorrogar ou encerrar a locação.`,
        "Se for encerrar, informe também o melhor dia e horário para a coleta.",
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
        p(`Estamos entrando em contato para lembrar que o contrato de locação nº ${e(m.contrato)} referente ${e(campos.referente)}:`),
        ...campos.equipamentos.map(grupo => p(`${e(m.descricao)} - (${e(grupo.codigos)})`)),
        vazio,
        p(`<b>${amarelo(`${e(campos.verbo)} no dia ${e(campos.vencimento)}`)} ${e(campos.diaSemana)}</b>`),
        vazio,
        p(`<b>Local:&nbsp; </b>${e(campos.local)}`),
        p(`<b>Endereço: </b>${e(campos.endereco)}`),
        vazio,
        p(`Por gentileza, nos informe até o final do dia <b>${amarelo(e(campos.prazo), ";font-size:14pt")}</b> se deseja prorrogar ou encerrar a locação.`),
        p("Se for encerrar, informe também o melhor dia e horário para a coleta."),
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
