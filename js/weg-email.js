// ======================================
// WEG - TEXTO PARA O E-MAIL
// ======================================
// Texto copiado para enviar junto com o print por e-mail.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// TEXTO DO E-MAIL (botão ao lado do documento)
// ======================================
// Fica fora da área de print. O nome da máquina sai dos equipamentos
// escolhidos (quantidade maior que 0).

const confirmacaoLocacao = {

    titulo: "Para confirmação por favor informar os dados abaixo:",

    campos: [
        "Data da entrega:",
        "CNPJ de Faturamento:",
        "Endereço completo de entrega, (Portaria e Prédio que a máquina irá ficar (setor)):",
        "E-mails para envio da Fatura de Locação"
    ]
};


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

                return `da ${nomeEquipamentoEmail(item.descricao)}${unidades}`;
            });

    if (!nomes.length) return "do equipamento";

    if (nomes.length === 1) return nomes[0];

    return nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1];
}


function textoConfirmacaoEmail() {

    const periodos = obterPeriodos();

    const ciclo =
        periodos > 1
            ? `${periodos} ciclos de ${contratoWEG.periodoDias} dias`
            : `ciclo de ${contratoWEG.periodoDias} dias`;

    return `${saudacaoEmail()}\n\n` +
        `Conforme solicitado segue abaixo valores do BID WEG para locação do ${ciclo} ${equipamentosEmail()}.\n\n` +
        `${confirmacaoLocacao.titulo}\n` +
        confirmacaoLocacao.campos.join("\n");
}


function copiarParaEmail() {

    copiar(textoConfirmacaoEmail(), "Texto do e-mail copiado");
}
