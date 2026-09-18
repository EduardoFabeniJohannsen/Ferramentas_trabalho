// ======================================
// PROPOSTA ZAP - CÁLCULO
// ======================================
// Calcula todos os números usados na mensagem "Copiar Proposta
// Zap" (valor de locação, seguro, locação complementar e
// diária por equipamento, além dos totais) — sem montar
// nenhum texto de mensagem. Quem monta o texto final a partir
// daqui é o propostas-zap-template.js.
// Depende de helpers.js, propostas-equipamentos.js e
// propostas-toggles.js (precisam vir carregados antes).

function calcularDadosPropostaZap(){

    const equipamentos =
        obterEquipamentos();


    const periodo =
        $("periodo")
            .value
            .trim();


    const cidade =
        $("cidade")
            .value
            .trim();


    const valorFreteTexto =
        $("valorFrete")
            .value
            .trim();


    if(!equipamentos.length){

        return { erro: "Informe o modelo" };
    }


    if(!periodo){

        return { erro: "Informe período" };
    }


    // Pega o valor final (já com desconto, se houver) de
    // cada equipamento a partir do bloco de desconto dele
    // em "Calcular Desconto".

    const dadosComValor =
        equipamentos.map(equipamento => {

            const bloco =
                document.querySelector(
                    `.desconto-item[data-equip-id="${equipamento.id}"]`
                );

            const valorFinal =
                bloco
                    ? Number(bloco.dataset.valorFinal)
                    : NaN;

            return {
                ...equipamento,
                valorFinal:
                    Number.isFinite(valorFinal) && valorFinal > 0
                        ? valorFinal
                        : null
            };
        });


    const semValor =
        dadosComValor.find(
            equipamento => equipamento.valorFinal === null
        );


    if(semValor){

        return {
            erro: `Confira o valor de ${semValor.modelo} em Calcular Desconto`
        };
    }


    // ==================================
    // PERÍODO
    // ==================================

    const diasNumero =
        Number(periodo);


    let periodoExibicao =
        periodo;


    let multiplicadorPeriodo =
        1;


    if(
        diasNumero > 30 &&
        diasNumero % 30 === 0
    ){

        multiplicadorPeriodo =
            diasNumero / 30;

        periodoExibicao =
            "30";
    }


    // ==================================
    // CIDADE
    // ==================================

    const cidadeFormatada =
        cidade
            ? cidade.charAt(0)
                .toUpperCase()
                +
                cidade.slice(1)
                    .toLowerCase()
            : "Cidade";


    // ==================================
    // LOCAÇÃO COMPLEMENTAR (frete)
    // ==================================

    const valorFreteNumero =
        brToNumber(valorFreteTexto);

    const valorComplementar =
        locacaoComplementarAtiva
            ? (valorFreteNumero * 2) * 1.2
            : 0;


    // ==================================
    // ITENS (valor + seguro por equipamento)
    // ==================================

    let itens =
        [];

    let totalGeral =
        0;


    dadosComValor.forEach(
        (equipamento) => {


            const modelo =
                equipamento.modelo;


            const quantidade =
                equipamento.quantidade;


            const letra2 =
                modelo.charAt(1);


            const letra3 =
                modelo.charAt(2);


            const altura =
                parseInt(
                    modelo.replace(
                        /[^\d]/g,
                        ""
                    )
                );


            let tipo = "";


            if(letra2 === "A")
                tipo = "Articulada";


            if(letra2 === "T")
                tipo = "Tesoura";


            if(letra2 === "M")
                tipo = "Mastro";


            let energia = "";


            if(letra3 === "E")
                energia = "elétrica";


            if(letra3 === "D")
                energia = "diesel";


            const alturaPlataforma =
                altura - 2;


            const valorLocacaoItem =
                equipamento.valorFinal *
                multiplicadorPeriodo;


            const seguroItem =
                valorLocacaoItem * 0.07;


            // Locação complementar só entra no total do próprio
            // item quando ele é o único da proposta — com mais
            // de um equipamento, ela entra uma única vez lá
            // embaixo, no "Valor final da proposta".
            const complementarNesteItem =
                (
                    locacaoComplementarAtiva &&
                    dadosComValor.length === 1
                )
                    ? valorComplementar
                    : 0;


            const totalItem =
                valorLocacaoItem +
                seguroItem +
                complementarNesteItem;


            totalGeral +=
                valorLocacaoItem +
                seguroItem;


            const diariaItem =
                (
                    valorDiariaAtivo &&
                    Number.isFinite(diasNumero) &&
                    diasNumero > 0
                )
                    ? valorLocacaoItem / diasNumero
                    : null;


            itens.push({

                modelo,
                quantidade,
                tipo,
                energia,
                altura,
                alturaPlataforma,
                valorLocacaoItem,
                seguroItem,
                complementarNesteItem,
                totalItem,
                diariaItem

            });
        }
    );


    // Com mais de 1 equipamento, a locação complementar
    // entra uma única vez aqui, não em cada item.
    const complementarNoTotalGeral =
        (
            locacaoComplementarAtiva &&
            dadosComValor.length > 1
        )
            ? valorComplementar
            : 0;


    return {

        erro: null,
        itens: itens,
        quantidadeItens: dadosComValor.length,
        periodoExibicao: periodoExibicao,
        multiplicadorPeriodo: multiplicadorPeriodo,
        cidadeFormatada: cidadeFormatada,
        valorFreteTexto: valorFreteTexto,
        totalGeral: totalGeral,
        complementarNoTotalGeral: complementarNoTotalGeral,
        locacaoComplementarAtiva: locacaoComplementarAtiva

    };
}
