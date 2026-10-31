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

    // 07.626.346/0001-49 -> 07626346000149. Tira só a pontuação (e espaços),
    // pra não estragar o CNPJ novo, que também tem letras.
    campo.value =
        campo.value
            .split("\n")
            .map(linha => linha.replace(/[.\/\\\-–—\s]/g, ""))
            .join("\n");
}


// ======================================
// CALCULADORA DE BOLETOS (index.html)
// ======================================

function calcularBoletos(){

    const dataTexto =
        $("data")?.value;

    const valorTexto =
        $("valor")?.value;

    const parcelasTexto =
        $("parcelas")?.value;


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


    const valor =
        brToNumber(valorTexto);

    const parcelas =
        parseInt(parcelasTexto, 10);


    if(
        !valorTexto ||
        !Number.isFinite(valor) ||
        valor <= 0 ||
        !Number.isFinite(parcelas) ||
        parcelas < 1
    ){

        $("metade").innerText = "";

        return calcularDiasPersonalizados();
    }


    // Conta em centavos para não perder valor no arredondamento.
    // A sobra da divisão vai inteira para a 1ª parcela.
    const totalCentavos =
        Math.round(valor * 100);

    const baseCentavos =
        Math.floor(totalCentavos / parcelas);

    const restoCentavos =
        totalCentavos - (baseCentavos * parcelas);


    const linhas = [];

    for(let i = 0; i < parcelas; i++){

        const centavos =
            i === 0
                ? baseCentavos + restoCentavos
                : baseCentavos;

        linhas.push(
            `${i + 1}ª: R$ ` + formatarMoedaBR(centavos / 100)
        );
    }

    $("metade").innerText =
        linhas.join("\n");


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

    if($("parcelas")){

        $("parcelas")
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
