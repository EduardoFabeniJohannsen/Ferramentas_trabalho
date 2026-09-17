// ======================================
// CONVERSOR DE TEXTO (index.html)
// ======================================
// Depende de helpers.js (precisa vir carregado antes).

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
