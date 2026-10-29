// ======================================
// HELPERS GERAIS
// ======================================
// Versão do sistema, $, formatadores, copiar() e mostrarToast().
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// VERSÃO DO SISTEMA
// ======================================
// Só precisa trocar aqui — aparece sozinho nas duas páginas.

const VERSAO_SISTEMA = "16.7.1";

document.querySelectorAll(".versao").forEach(elemento => {
    elemento.innerText = "v" + VERSAO_SISTEMA;
});


// ======================================
// HELPERS
// ======================================

const $ = (id) => document.getElementById(id);


const formatarData = (data) => {

    const dia =
        String(data.getDate()).padStart(2, "0");

    const mes =
        String(data.getMonth() + 1).padStart(2, "0");

    const ano =
        data.getFullYear();

    return `${dia}/${mes}/${ano}`;
};


const brToNumber = (valor) => {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return 0;
    }

    valor = String(valor).trim();

    if (!valor) return 0;

    // Tira "R$", espaços e qualquer coisa que não seja número
    valor = valor.replace(/[^\d.,-]/g, "");

    // Sem nenhum dígito (ex: "abc") = valor inválido
    if (!/\d/.test(valor)) return NaN;

    // Formato brasileiro:
    // 1.234,56
    if (valor.includes(",")) {

        valor =
            valor
                .replace(/\./g, "")
                .replace(",", ".");

    }else if (/^-?\d{1,3}(\.\d{3})+$/.test(valor)) {

        // Sem vírgula, mas no padrão de milhar:
        // 1.234 ou 1.234.567 (100.50 continua decimal)
        valor =
            valor.replace(/\./g, "");
    }

    return Number(valor);
};


const formatarMoedaBR = (valor) => {

    return Number(valor).toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits:2,
            maximumFractionDigits:2
        }
    );
};


const formatarNumeroPonto = (valor) => {

    return Number(valor).toFixed(2);
};


// Copia pro clipboard e já mostra o toast (sucesso ou erro).
// Se o navegador bloquear o clipboard (ex: fora de HTTPS/localhost),
// tenta o método antigo com textarea antes de desistir.
const copiar = async (texto, mensagem) => {

    let copiou = false;

    try {

        await navigator.clipboard.writeText(texto);

        copiou = true;

    } catch (erro) {

        try {

            const area = document.createElement("textarea");

            area.value = texto;

            area.style.position = "fixed";

            area.style.opacity = "0";

            document.body.appendChild(area);

            area.select();

            copiou = document.execCommand("copy");

            document.body.removeChild(area);

        } catch (erro2) {

            console.error("Erro ao copiar:", erro2);
        }
    }

    if (mensagem) {

        if (copiou) {

            mostrarToast(mensagem);

        } else {

            mostrarToast("Não foi possível copiar", true);
        }
    }

    return copiou;
};


let toastTimer;


// erro = true deixa o toast vermelho e um pouco mais na tela
const mostrarToast = (msg, erro = false) => {

    const toast = $("toast");

    if (!toast) return;

    toast.innerText = msg;

    toast.classList.toggle("erro", erro);

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, erro ? Math.max(4000, msg.length * 70) : 2000);
};
