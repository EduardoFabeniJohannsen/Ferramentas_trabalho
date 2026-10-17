// ======================================
// WEG - TEXTO DE CONFIRMAÇÃO
// ======================================
// Texto copiado para o e-mail.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// TEXTO DE CONFIRMAÇÃO (copiar pro e-mail)
// ======================================
// Fica fora da área de print (botão ao lado do documento). Copia em HTML (cola
// formatado no Outlook/Gmail) e em texto simples como reserva.

const confirmacaoLocacao = {

    titulo: "Para confirmação da locação, favor enviar:",

    campos: [
        "CNPJ de faturamento:",
        "Data da necessidade:",
        "Prédio e setor onde a máquina ficará:",
        "Responsável pelo recebimento:"
    ]
};


function htmlConfirmacaoEmail() {

    const itens =
        confirmacaoLocacao.campos
            .map((campo) => `<li><b>${campo}</b>&nbsp;</li>`)
            .join("");

    return `<div style="font-family:Calibri,Arial,sans-serif;font-size:14px;">` +
        `<p><b>${confirmacaoLocacao.titulo}</b></p>` +
        `<ul>${itens}</ul>` +
        `</div>`;
}


function textoConfirmacaoEmail() {

    const itens =
        confirmacaoLocacao.campos
            .map((campo) => `• ${campo} `)
            .join("\n");

    return `${confirmacaoLocacao.titulo}\n\n${itens}`;
}


async function copiarParaEmail() {

    try {

        if (navigator.clipboard && window.ClipboardItem) {

            await navigator.clipboard.write([
                new ClipboardItem({
                    "text/html": new Blob(
                        [htmlConfirmacaoEmail()],
                        { type: "text/html" }
                    ),
                    "text/plain": new Blob(
                        [textoConfirmacaoEmail()],
                        { type: "text/plain" }
                    )
                })
            ]);

            mostrarToast("Texto copiado");

            return;
        }

    } catch (erro) {

        console.error("Erro ao copiar em HTML:", erro);
    }

    // navegador bloqueou o HTML: copia só o texto
    copiar(textoConfirmacaoEmail(), "Texto copiado (sem formatação)");
}
