// ======================================
// HELPERS
// ======================================
const VERSAO_SISTEMA = "5.7.1";

document.querySelectorAll(".versao").forEach(elemento => {
    elemento.innerText = "v" + VERSAO_SISTEMA;
});


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


// ======================================
// CONVERSOR DE TEXTO (index.html)
// ======================================

function maiusculo(){

    const campo = $("texto");

    if(!campo) return;

    campo.value =
        campo.value.toUpperCase();
}


function minusculo(){

    const campo = $("texto");

    if(!campo) return;

    campo.value =
        campo.value.toLowerCase();
}


function formatarCNPJ(){

    const campo = $("texto");

    if(!campo) return;

    // Mantém só os dígitos, limitado a 14 (tamanho do CNPJ)
    const numeros =
        campo.value
            .replace(/\D/g, "")
            .slice(0, 14);

    let formatado = numeros;

    if(numeros.length > 12){

        formatado = numeros.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/,
            "$1.$2.$3/$4-$5"
        );

    }else if(numeros.length > 8){

        formatado = numeros.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{1,4})$/,
            "$1.$2.$3/$4"
        );

    }else if(numeros.length > 5){

        formatado = numeros.replace(
            /^(\d{2})(\d{3})(\d{1,3})$/,
            "$1.$2.$3"
        );

    }else if(numeros.length > 2){

        formatado = numeros.replace(
            /^(\d{2})(\d{1,3})$/,
            "$1.$2"
        );
    }

    campo.value = formatado;
}


// ======================================
// CALCULADORA DE BOLETOS (index.html)
// ======================================

function calcularBoletos(){

    const dataTexto =
        $("data")?.value;

    const valorTexto =
        $("valor")?.value;


    if(dataTexto){

        const data =
            new Date(dataTexto + "T00:00:00");

        const data28 =
            new Date(data);

        data28.setDate(
            data28.getDate() + 28
        );

        const data56 =
            new Date(data);

        data56.setDate(
            data56.getDate() + 56
        );

        $("d28").innerText =
            formatarData(data28);

        $("d56").innerText =
            formatarData(data56);

    }else{

        $("d28").innerText = "";
        $("d56").innerText = "";
    }


    if(valorTexto){

        const valor =
            brToNumber(valorTexto);

        if(
            Number.isFinite(valor) &&
            valor > 0
        ){

            $("metade").innerText =
                "R$ " + formatarMoedaBR(valor / 2);

        }else{

            $("metade").innerText = "";
        }

    }else{

        $("metade").innerText = "";
    }


    calcularDiasPersonalizados();
}


function calcularDiasPersonalizados(){

    const dataTexto =
        $("data")?.value;

    const diasTexto =
        $("dias")?.value;


    if(!dataTexto || !diasTexto){

        $("resultadoDias").innerText = "";

        return;
    }


    const dias =
        Number(diasTexto);


    if(!Number.isFinite(dias)){

        $("resultadoDias").innerText = "";

        return;
    }


    const data =
        new Date(dataTexto + "T00:00:00");

    data.setDate(
        data.getDate() + dias
    );


    $("resultadoDias").innerText =
        formatarData(data);
}


// ======================================
// STATUS
// ======================================

function gerarStatus(tipo){

    const hoje =
        new Date();


    const data =
        String(
            hoje.getDate()
        ).padStart(2,"0")
        + "/"
        +
        String(
            hoje.getMonth() + 1
        ).padStart(2,"0");


    const nome =
        "Eduardo";


    const cidade =
        $("cidade")
            ? $("cidade")
                .value
                .toUpperCase()
            : "CIDADE";


    const frete =
        $("valorFrete")
            ? $("valorFrete").value
            : "0,00";


    const mensagens = {


        faturado:
            `${data} - Faturado - ${nome}`,


        renovacaoEmail:
            `${data} - Enviado email de renovação - ${nome}`,


        renovacaoZap:
            `${data} - Enviado zap de renovação - ${nome}`,


        autorizado:
            `Autorizado Via Contrato XXX - Responsável: XXX <XXX>`,


        FreteZOHO:
`FRETE POR CONTA DO CLIENTE / FATURADOS DO TRANSPORTADOR DIRETO PARA O CLIENTE

* Frete entrega: R$ ${frete} - ITAJAÍ x ${cidade}
* Frete retirada: R$ ${frete} - ${cidade} x ITAJAÍ

Transportadores Indicados:
JEAN RICARDO SPIESS 47 99763-3333
KUNG 47 9616-5616
MAGNUS 47 9754-0321
RR (SOMENTE ATÉ WTE12)

PROPOSTA VÁLIDA POR 7 DIAS`,


        FreteZOHOLocComp:
`* FRETE INCLUSO NO ITEM LOCAÇÃO COMPLEMENTAR *
PROPOSTA VÁLIDA POR 7 DIAS`,


        CHEKLIST_Titulo:
            `CHEKLIST - PTA - ${
                $("nomeCliente")
                    ? $("nomeCliente")
                        .value
                        .toUpperCase()
                    : ""
            }`,


        CHEKLIST_Mensagem:
`Prezado Cliente,

Segue checklist de saída do equipamento locado.

Obrigada.`,


        ICMS:
            `Saida sem incidencia de ICMS cfe Cap. II, art 6 do RICMS/SC`

    };


    const texto =
        mensagens[tipo];


    if(!texto) return;


    copiar(texto);

    mostrarToast(
        tipo + " copiado"
    );
}


// ======================================
// INIT — CALCULADORA DE BOLETOS
// ======================================
// Só existe na index.html; os "if" abaixo garantem que
// isso não faz nada quando helpers.js é carregado em
// outra página que não tem esses campos.

(function initCalculadoraBoletos(){

    if($("data")){

        $("data")
            .addEventListener(
                "input",
                calcularBoletos
            );
    }

    if($("valor")){

        $("valor")
            .addEventListener(
                "input",
                calcularBoletos
            );
    }

    if($("dias")){

        $("dias")
            .addEventListener(
                "input",
                calcularDiasPersonalizados
            );
    }

})();
