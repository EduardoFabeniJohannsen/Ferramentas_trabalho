// ======================================
// AGENDA - PATRIMÔNIO
// ======================================
// Regras do patrimônio da máquina: formato (tudo em maiúsculo, menos a
// letra O depois dos números, que fica minúscula pra não confundir com
// zero) e patrimônio ainda não definido (só o modelo, ex: WAE15 em vez de
// WAE1520). Carregar depois de agenda-utils.js.

// ======================================
// FORMATO
// ======================================

// WTE8O079 -> WTE8o079. Antes do primeiro número tudo é maiúsculo.
function patrimonioFormatado(texto){

    const maiusculo =
        String(texto || "").toUpperCase();

    const primeiroNumero =
        maiusculo.search(/\d/);

    if(primeiroNumero < 0) return maiusculo;

    return (
        maiusculo.slice(0, primeiroNumero) +
        maiusculo.slice(primeiroNumero).replace(/O/g, "o")
    );
}


// ======================================
// PATRIMÔNIO AINDA NÃO DEFINIDO
// ======================================
// Só o modelo (WAE15, WTE8) tem menos de 3 números. Patrimônio completo
// (WAE1520, WTE14046, WTE8o079) tem 3 ou mais. Campo vazio não conta.

function patrimonioIncompleto(texto){

    const valor =
        String(texto || "").trim();

    if(!valor) return false;

    const numeros =
        (valor.match(/\d/g) || []).length;

    return numeros < 3;
}


// na troca técnica vale também a máquina de recolha
function itemSemPatrimonio(item){

    return (
        patrimonioIncompleto(item.plataforma) ||
        (
            item.tipo === "Troca técnica" &&
            patrimonioIncompleto(item.plataformaRecolha)
        )
    );
}


// aviso embaixo dos campos do formulário
function atualizarAvisoPatrimonio(){

    [
        ["agPlataforma", "avisoPatrimonio"],
        ["agPlataformaRecolha", "avisoPatrimonioRecolha"]
    ].forEach(([idCampo, idAviso]) => {

        const aviso = $(idAviso);

        if(!aviso) return;

        const incompleto =
            patrimonioIncompleto($(idCampo).value);

        aviso.innerText =
            incompleto
                ? "⚠️ Só o modelo: patrimônio ainda não definido"
                : "";

        aviso.style.display =
            incompleto ? "" : "none";
    });
}
