// ======================================
// AGENDA - PATRIMÔNIO
// ======================================
// Regras do patrimônio da máquina: formato (tudo em maiúsculo, menos a
// letra O depois dos números, que fica minúscula pra não confundir com
// zero), patrimônio ainda não definido (só o modelo, ex: WAE15 em vez de
// WAE1520) e vários equipamentos juntos na mesma plataforma.
// Carregar depois de agenda-utils.js.

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
// VÁRIOS EQUIPAMENTOS NO MESMO AGENDAMENTO
// ======================================
// Ficam juntos na coluna plataforma, separados por "+", com a quantidade
// na frente quando passa de 1: "2x WAD16 + WTE12". Um só fica como era.
// Digitado à mão também pode vir com / , ; ou "e" ("WAE18R001 / WAE18R002").
// separarPlataformas() e modeloDaPlataforma() ficam em js/agendamento-comum.js.

// o contrário de separarPlataformas: lista -> "2x WAD16 + WTE12" (linha sem
// patrimônio não entra)
function juntarPlataformas(lista){

    return lista
        .filter(item => item.patrimonio)
        .map(item =>
            (item.quantidade > 1 ? `${item.quantidade}x ` : "") +
            item.patrimonio
        )
        .join(" + ");
}


// patrimonioFormatado() em cada equipamento da lista
function plataformasFormatadas(texto){

    return juntarPlataformas(
        separarPlataformas(texto).map(item => ({
            quantidade: item.quantidade,
            patrimonio: patrimonioFormatado(item.patrimonio)
        }))
    );
}


// ======================================
// PATRIMÔNIO AINDA NÃO DEFINIDO
// ======================================
// Só o modelo (WAE15, WTE8) tem menos de 3 números. Patrimônio completo
// (WAE1520, WTE14046, WTE8o079) tem 3 ou mais. Campo vazio não conta.
// Com vários equipamentos, basta um estar só no modelo.

function patrimonioIncompleto(texto){

    return separarPlataformas(texto).some(item => {

        const numeros =
            (item.patrimonio.match(/\d/g) || []).length;

        return numeros < 3;
    });
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
