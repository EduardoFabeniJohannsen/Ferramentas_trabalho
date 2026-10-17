// ======================================
// PROPOSTAS - TEXTOS
// ======================================
// Oportunidade e proposta ZOHO, copiarTexto().
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

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
