// ======================================
// WEG - TEXTO PARA O E-MAIL
// ======================================
// Texto copiado para enviar junto com o print por e-mail.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// TEXTO DO E-MAIL (botão ao lado do documento)
// ======================================
// Fica fora da área de print. O nome da máquina sai dos equipamentos
// escolhidos (quantidade maior que 0). Copia formatado (copiarFormatado):
// no Outlook os campos saem em negrito com um exemplo em cinza embaixo;
// onde não aceita formatação, vai o texto simples.

const confirmacaoLocacao = {

    titulo: "Para confirmação, por favor informar os dados abaixo:",

    // exemplo: função = muda com a tela (a data de início escolhida)
    campos: [
        { rotulo: "Data da entrega", exemplo: () => exemploDataEntregaEmail() },
        { rotulo: "CNPJ de faturamento", exemplo: () => "12.345.678/0001-90" },
        {
            rotulo: "Endereço completo de entrega",
            dica: "com a portaria e o prédio/setor onde a máquina vai ficar",
            exemplo: () => "Rua das Indústrias, 1000 – Centro – Jaraguá do Sul/SC · Portaria 2 · Prédio B (setor Usinagem)"
        },
        { rotulo: "E-mails para envio da fatura de locação", exemplo: () => "financeiro@empresa.com.br; compras@empresa.com.br" }
    ]
};


// a data de início da tela ("18/12/2026"); sem data, uma qualquer
function exemploDataEntregaEmail() {

    const datas = obterDatas();

    return datas
        ? datas.inicio.toLocaleDateString("pt-BR")
        : "20/12/2026";
}


function escaparHtmlEmail(texto) {

    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}


// antes do meio-dia: "Bom dia"; depois: "Boa tarde"
function saudacaoEmail() {

    return new Date().getHours() < 12
        ? "Bom dia, tudo bem?"
        : "Boa tarde, tudo bem?";
}


// "ARTICULADA ELÉTRICA 15M" -> "Articulada Elétrica de 15 metros de Altura de trabalho"
function nomeEquipamentoEmail(descricao) {

    const altura = descricao.match(/(\d+)\s*M$/i);

    const nome =
        descricao
            .replace(/\s*\d+\s*M$/i, "")
            .toLowerCase()
            .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());

    return altura
        ? `${nome} de ${altura[1]} metros de Altura de trabalho`
        : nome;
}


// "da Tesoura Elétrica de 10 metros... e da Articulada Elétrica de 15 metros..."
function equipamentosEmail() {

    const nomes =
        contratoWEG.itens
            .filter((item) => obterQuantidade(item.modelo) > 0)
            .sort((a, b) => ordemDoGrupo(a.modelo) - ordemDoGrupo(b.modelo))
            .map((item) => {

                const quantidade = obterQuantidade(item.modelo);

                const unidades = quantidade > 1 ? ` (${quantidade} unidades)` : "";

                // mastro é masculino: "do Mastro", "da Tesoura"
                const artigo = /^mastro/i.test(item.descricao) ? "do" : "da";

                return `${artigo} ${nomeEquipamentoEmail(item.descricao)}${unidades}`;
            });

    if (!nomes.length) return "do equipamento";

    if (nomes.length === 1) return nomes[0];

    return nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1];
}


// "do ciclo de 30 dias" / "de 4 ciclos de 30 dias"
function cicloEmail() {

    const periodos = obterPeriodos();

    return periodos > 1
        ? `de ${periodos} ciclos de ${contratoWEG.periodoDias} dias`
        : `do ciclo de ${contratoWEG.periodoDias} dias`;
}


function textoConfirmacaoEmail() {

    const campos =
        confirmacaoLocacao.campos.map(campo =>
            `${campo.rotulo}${campo.dica ? ` (${campo.dica})` : ""}:\n` +
            `   Exemplo: ${campo.exemplo()}`
        );

    return `${saudacaoEmail()}\n\n` +
        `Conforme solicitado, seguem abaixo os valores do BID WEG para locação ${cicloEmail()} ${equipamentosEmail()}.\n\n` +
        `${confirmacaoLocacao.titulo}\n\n` +
        campos.join("\n\n");
}


// tabela com estilo na própria tag: é o que o Outlook respeita
function htmlConfirmacaoEmail() {

    const fonte = "font-family:Calibri,Aptos,Arial,sans-serif;font-size:11pt;color:#1f2937;";

    const linhas =
        confirmacaoLocacao.campos.map(campo =>
            `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;${fonte}">` +
            `<b>${escaparHtmlEmail(campo.rotulo)}:</b>` +
            (campo.dica ? ` <span style="color:#4b5563;">(${escaparHtmlEmail(campo.dica)})</span>` : "") +
            `<br><span style="color:#9ca3af;font-style:italic;font-size:10pt;">Exemplo: ${escaparHtmlEmail(campo.exemplo())}</span>` +
            `</td></tr>`
        ).join("");

    return `<div style="${fonte}">` +
        `<p style="margin:0 0 12px;">${escaparHtmlEmail(saudacaoEmail())}</p>` +
        `<p style="margin:0 0 16px;">Conforme solicitado, seguem abaixo os valores do BID WEG para locação <b>${escaparHtmlEmail(cicloEmail())}</b> <b>${escaparHtmlEmail(equipamentosEmail())}</b>.</p>` +
        `<p style="margin:0 0 8px;color:#1e3a8a;font-weight:bold;">${escaparHtmlEmail(confirmacaoLocacao.titulo)}</p>` +
        `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-left:4px solid #1e40af;background:#f8fafc;min-width:420px;">${linhas}</table>` +
        `</div>`;
}


function copiarParaEmail() {

    copiarFormatado(htmlConfirmacaoEmail(), textoConfirmacaoEmail(), "Texto do e-mail copiado");
}
