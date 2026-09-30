// ======================================
// PROPOSTAS - TEXTOS
// ======================================
// Geração dos textos/mensagens (ZOHO, Zap, status) e o
// init() da página de propostas.
// Depende de helpers.js e propostas-dados.js (precisam
// vir carregados antes).

// ======================================
// TEXTOS AUTOMÁTICOS
// ======================================

function gerarTextos(){

    const nome =
        $("nomeCliente")?.value
            .toUpperCase()
            .trim();


    const equipamentos =
        obterEquipamentos();


    const cidade =
        $("cidade")?.value
            .toUpperCase()
            .trim();


    const periodoInput =
        $("periodo")?.value.trim();


    let periodo = "";


    if(periodoInput){

        if(isNaN(periodoInput)){

            periodo =
                periodoInput.toUpperCase();

        }else{

            const numero =
                Number(periodoInput);


            if(numero === 1){

                periodo =
                    "DIARIA";

            }else if(
                numero > 30 &&
                numero % 30 === 0
            ){

                periodo =
                    `${numero / 30} PERIODOS`;

            }else{

                periodo =
                    `${numero} DIAS`;
            }
        }
    }


    const hoje =
        formatarData(
            new Date()
        );


    // ==================================
    // OPORTUNIDADE
    // ==================================

    if(nome){

        $("textoOportunidade").innerText =
            `OPORTUNIDADE DE LOCAÇÃO_${nome}_${hoje}`;

    }else{

        $("textoOportunidade").innerText = "";
    }


    // ==================================
    // ORÇAMENTO
    // ==================================

    if(
        nome &&
        equipamentos.length &&
        periodo &&
        cidade
    ){

        const modelosTexto =
            equipamentos
                .map(item => {

                    return (
                        item.quantidade > 1
                            ? `${item.quantidade} ${item.modelo}`
                            : item.modelo
                    );

                })
                .join(" + ");


        $("textoOrcamento").innerText =
            `${nome}_${modelosTexto}_${periodo}`;

    }else{

        $("textoOrcamento").innerText = "";
    }


    preencherValorTabela();
}


// ======================================
// COPIAR TEXTO
// ======================================

function copiarTexto(id){

    const texto =
        $(id)?.innerText.trim();


    if(!texto){

        return mostrarToast(
            id === "textoOportunidade"
                ? "Informe o nome do cliente"
                : "Preencha nome, equipamento, período e cidade",
            true
        );
    }


    copiar(texto, "Copiado");
}

// ======================================
// PROPOSTA ZAP
// ======================================

function copiarPropostaZap(){

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

        return mostrarToast(
            "Informe o modelo",
            true
        );
    }


    if(!periodo){

        return mostrarToast(
            "Informe período",
            true
        );
    }


    if(!cidade){

        return mostrarToast(
            "Informe a cidade",
            true
        );
    }


    if(!valorFreteTexto){

        return mostrarToast(
            "Informe o frete",
            true
        );
    }


    const valorFreteNumero =
        brToNumber(valorFreteTexto);


    if(!Number.isFinite(valorFreteNumero)){

        return mostrarToast(
            "Frete inválido",
            true
        );
    }


    // O texto depende do padrão do modelo: 2ª letra A/T/M,
    // 3ª letra E/D e número = altura de trabalho.
    const modeloForaPadrao =
        equipamentos.find(equipamento => {

            const modelo =
                equipamento.modelo;

            const altura =
                parseInt(
                    modelo.replace(/[^\d]/g, ""),
                    10
                );

            return (
                !["A", "T", "M"].includes(modelo.charAt(1)) ||
                !["E", "D"].includes(modelo.charAt(2)) ||
                !Number.isFinite(altura)
            );
        });


    if(modeloForaPadrao){

        return mostrarToast(
            `Modelo ${modeloForaPadrao.modelo} fora do padrão`,
            true
        );
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

        return mostrarToast(
            `Confira o valor de ${semValor.modelo} em Calcular Desconto`,
            true
        );
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

    const valorComplementar =
        locacaoComplementarAtiva
            ? (valorFreteNumero * 2) * 1.2
            : 0;


    // ==================================
    // BLOCOS DOS EQUIPAMENTOS
    // (valor + seguro calculados por equipamento)
    // ==================================

    // Com emojis: "💰 ". Sem emojis: "* ".
    const marca = (emoji) =>
        emojisAtivo ? `${emoji} ` : "* ";

    // Frete mantém o 🚚 nos dois modos; sem emojis ganha "* " na frente.
    const prefixoFrete =
        emojisAtivo ? "" : "* ";


    let blocosEquipamentos =
        "";

    let totalGeral =
        0;


    dadosComValor.forEach(
        (equipamento, index) => {


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


            // Locação complementar só entra na linha de Total
            // do próprio item quando ele é o único da proposta
            // — com mais de um equipamento, ela entra uma única
            // vez lá embaixo, na linha "Valor final da proposta".
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


            if(index > 0){

                blocosEquipamentos +=
                    "\n=======\n\n";
            }


            const rotuloTotal =
                complementarNesteItem > 0
                    ? "Total máquina + seguro + Frete com locação complementar(+20%)"
                    : "Total máquina + seguro";


            const textoDiaria =
                (
                    valorDiariaAtivo &&
                    Number.isFinite(diasNumero) &&
                    diasNumero > 0
                )
                    ? ` ( Diária = R$ ${formatarMoedaBR(valorLocacaoItem / diasNumero)} )`
                    : "";


            blocosEquipamentos +=
`🟡 Modelo: ${
    quantidade > 1
        ? quantidade + " "
        : ""
}${modelo} ${tipo} ${energia} – ${altura} metros de altura de trabalho
* Altura da plataforma: ${alturaPlataforma} metros
* Altura de trabalho: ${altura} metros
* Período de locação: ${periodoExibicao} dias${
    multiplicadorPeriodo > 1
        ? ` (${multiplicadorPeriodo} períodos)`
        : ""
}

${marca("💰")}Valor da locação: R$ ${formatarMoedaBR(valorLocacaoItem)}${textoDiaria}
${marca("🛡️")}Seguro contra acidentes e furtos (opcional): R$ ${formatarMoedaBR(seguroItem)}
${marca("💵")}*${rotuloTotal}: R$ ${formatarMoedaBR(totalItem)}*
`;

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


    const rotuloValorFinal =
        complementarNoTotalGeral > 0
            ? "Valor final da proposta (tudo incluso + Frete com locação complementar(+20%))"
            : "Valor final da proposta (tudo incluso)";


    const linhaValorFinal =
        dadosComValor.length > 1
            ? `\n${marca("💵")}${rotuloValorFinal}: R$ ${formatarMoedaBR(totalGeral + complementarNoTotalGeral)}\n`
            : "";


    const notaFrete =
        locacaoComplementarAtiva
            ? `(Frete incluso como "Locação Complementar")`
            : `(Nosso frete é terceirizado, sendo um boleto na entrega e outro na retirada.)`;


    const textoPagamento =
        emojisAtivo
            ? "Mediante aprovação cadastral."
            : "28 dias, mediante aprovação cadastral.";

    // Sem emojis há uma linha em branco entre Cortesia e Pagamento
    const separadorFinal =
        emojisAtivo ? "\n" : "\n\n";


    // cidade de saída do frete (⚙️ Configurações): Itajai ou Joinville
    const cidadeSaidaTexto =
        obterCidadeSaida().zap;


    let textoFinal =
`${blocosEquipamentos}${linhaValorFinal}
${prefixoFrete}🚚 Frete entrega: R$ ${
    valorFreteTexto || "0,00"
} de ${cidadeSaidaTexto} x ${cidadeFormatada}
${prefixoFrete}🚚 Frete retirada: R$ ${
    valorFreteTexto || "0,00"
} de ${cidadeFormatada} x ${cidadeSaidaTexto}
${notaFrete}

${marca("🎁")}Cortesia: Entrega técnica (mediante solicitação)${separadorFinal}${marca("📄")}Forma de pagamento: ${textoPagamento}`;


    copiar(textoFinal, "Proposta Zap copiada");
}


// ======================================
// INIT
// ======================================

(async function init(){

    // ==================================
    // CARREGAR TABELAS (Supabase)
    // ==================================

    await carregarTabela();

    await carregarFretes();

    avisarFalhaCarregamento();


    // ==================================
    // EQUIPAMENTOS
    // ==================================

    configurarEventosEquipamentos();


    // ==================================
    // CACHE (repõe o que tava salvo)
    // ==================================

    restaurarCache();


    // ==================================
    // NOME CLIENTE
    // ==================================

    if($("nomeCliente")){

        $("nomeCliente")
            .addEventListener(
                "input",
                gerarTextos
            );
    }


    // ==================================
    // PERÍODO
    // ==================================

    if($("periodo")){

        $("periodo")
            .addEventListener(
                "input",
                () => {

                    gerarTextos();

                    mostrarFretes();

                }
            );
    }


    // ==================================
    // CIDADE
    // ==================================

    if($("cidade")){

        $("cidade")
            .addEventListener(
                "input",
                () => {

                    gerarTextos();

                    mostrarFretes();

                }
            );
    }


    // ==================================
    // FRETE
    // ==================================

    if($("valorFrete")){

        $("valorFrete")
            .addEventListener(
                "input",
                gerarTextos
            );
    }

})();