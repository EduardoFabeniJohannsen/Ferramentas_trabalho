// ======================================
// VERSÃO DO SISTEMA
// ======================================
// Só precisa trocar aqui — aparece sozinho em todas as páginas.

const VERSAO_SISTEMA = "6.4.1";

document.querySelectorAll(".versao").forEach(elemento => {
    elemento.innerText = "v" + VERSAO_SISTEMA;
});


// ======================================
// TRANSPORTADORAS DE FRETE
// ======================================
// Única lista de transportadoras do sistema. Pra adicionar
// ou remover uma, mexe só aqui — desde que exista o arquivo
// frete_NOME.csv correspondente na pasta.

const TRANSPORTADORAS_FRETE = [
    "Magnus",
    "Kung",
    "Jean",
    "Dionizio",
    "RR"
];


// ======================================
// HELPERS GENÉRICOS
// ======================================
// Funções de uso geral, usadas em mais de uma página do sistema.
// IMPORTANTE: não colocar aqui nada específico de uma página só,
// e nem textos de mensagem/template — isso fica em arquivos
// próprios (ex: mensagens-status.js, propostas-zap-template.js).

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

    // Formato brasileiro:
    // 1.234,56
    if (valor.includes(",")) {

        valor =
            valor
                .replace(/\./g, "")
                .replace(",", ".");
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


const copiar = (texto) => {

    return navigator.clipboard.writeText(texto);
};


const mostrarToast = (msg) => {

    const toast = $("toast");

    if (!toast) return;

    toast.innerText = msg;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove("show");

    }, 2000);
};
