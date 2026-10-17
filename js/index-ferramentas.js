// ======================================
// INDEX - CONVERSOR E CALCULADORA DE BOLETOS
// ======================================
// Ferramentas da página inicial.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

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

    const linhasFormatadas =
        campo.value
            .split("\n")
            .map(linha => {

                // Mantém só os dígitos, limitado a 14 (tamanho do CNPJ)
                const numeros =
                    linha
                        .replace(/\D/g, "")
                        .slice(0, 14);

                if(!numeros) return linha;

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

                return formatado;
            });

    campo.value = linhasFormatadas.join("\n");
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

        const data42 =
            new Date(data);

        data42.setDate(
            data42.getDate() + 42
        );

        const data56 =
            new Date(data);

        data56.setDate(
            data56.getDate() + 56
        );

        $("d28").innerText =
            formatarData(data28);

        $("d42").innerText =
            formatarData(data42);

        $("d56").innerText =
            formatarData(data56);

    }else{

        $("d28").innerText = "";
        $("d42").innerText = "";
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
// INIT — CALCULADORA DE BOLETOS
// ======================================
// Só existe na index.html; os "if" abaixo garantem que
// isso não faz nada quando helpers.js é carregado em
// outra página que não tem esses campos.

(function initCalculadoraBoletos(){

    if($("data")){

        // Puxa a data de hoje sozinho, se o campo
        // estiver vazio (ex: assim que a página abre).
        if(!$("data").value){

            const hoje = new Date();

            const ano = hoje.getFullYear();

            const mes =
                String(hoje.getMonth() + 1)
                    .padStart(2, "0");

            const dia =
                String(hoje.getDate())
                    .padStart(2, "0");

            $("data").value =
                `${ano}-${mes}-${dia}`;

            calcularBoletos();
        }

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
