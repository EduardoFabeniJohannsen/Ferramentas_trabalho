// ======================================
// PROPOSTAS - EQUIPAMENTOS
// ======================================
// Gestão das linhas de equipamento do card "Gerar Textos"
// (adicionar, remover, ler os valores digitados). Depende de
// helpers.js e propostas-csv.js (precisam vir carregados antes).

// A linha fixa do HTML já nasce com data-equip-id="1"
let proximoEquipId = 2;


// ======================================
// PEGAR EQUIPAMENTOS
// ======================================

function obterEquipamentos(){

    const linhas =
        document.querySelectorAll(
            ".equipamento-linha"
        );


    const equipamentos = [];


    linhas.forEach(linha => {

        const campoModelo =
            linha.querySelector(
                ".equipamento"
            );


        const campoQuantidade =
            linha.querySelector(
                ".quantidadeEquipamento"
            );


        const modelo =
            normalizarModelo(
                campoModelo?.value
            );


        let quantidade =
            parseInt(
                campoQuantidade?.value,
                10
            );


        if(
            !Number.isFinite(quantidade) ||
            quantidade < 1
        ){
            quantidade = 1;
        }


        if(modelo){

            equipamentos.push({

                id: linha.dataset.equipId,

                modelo: modelo,

                quantidade: quantidade

            });
        }

    });


    return equipamentos;
}


// ======================================
// ADICIONAR EQUIPAMENTO
// ======================================

function adicionarEquipamento(){

    const lista =
        $("listaEquipamentosProposta");


    const div =
        document.createElement("div");


    div.className =
        "equipamento-linha";


    div.dataset.equipId =
        proximoEquipId++;


    div.innerHTML = `

        <input
            type="text"
            class="equipamento"
            placeholder="Equipamento"
            list="listaEquipamentos"
        >

        <input
            type="text"
            class="quantidadeEquipamento"
            value="1"
            inputmode="numeric"
            title="Quantidade"
        >

        <button
            type="button"
            class="btn-remover-equipamento"
            onclick="removerEquipamento(this)"
            title="Remover"
        >
            −
        </button>

        <button
            type="button"
            class="btn-add-equipamento"
            onclick="adicionarEquipamento()"
        >
            +
        </button>

    `;


    lista.appendChild(div);


    configurarEventosEquipamentos();


    // foco no novo equipamento
    div.querySelector(
        ".equipamento"
    ).focus();
}


// ======================================
// REMOVER EQUIPAMENTO
// ======================================

function removerEquipamento(botao){

    const linha =
        botao.closest(".equipamento-linha");

    if(!linha) return;

    const equipId =
        linha.dataset.equipId;

    const lista =
        $("listaEquipamentosProposta");

    const totalLinhas =
        lista.querySelectorAll(
            ".equipamento-linha"
        ).length;

    // Se for a única linha, só limpa os campos
    // em vez de remover (sempre precisa sobrar
    // pelo menos uma linha com o botão "+").
    if(totalLinhas <= 1){

        const campoModelo =
            linha.querySelector(".equipamento");

        const campoQuantidade =
            linha.querySelector(".quantidadeEquipamento");

        if(campoModelo) campoModelo.value = "";
        if(campoQuantidade) campoQuantidade.value = "1";

    }else{

        linha.remove();
    }

    // remove o bloco de desconto correspondente,
    // se existir
    const bloco =
        document.querySelector(
            `.desconto-item[data-equip-id="${equipId}"]`
        );

    if(bloco) bloco.remove();

    gerarTextos();

    mostrarFretes();
}


// ======================================
// CONFIGURAR EVENTOS DOS EQUIPAMENTOS
// ======================================

function configurarEventosEquipamentos(){

    const campos =
        document.querySelectorAll(
            ".equipamento, .quantidadeEquipamento"
        );


    campos.forEach(campo => {

        if(campo.dataset.evento === "1"){
            return;
        }


        campo.dataset.evento = "1";


        campo.addEventListener(
            "input",
            () => {

                gerarTextos();

                mostrarFretes();

            }
        );

    });


    // Valida quantidade ao sair do campo: se não for
    // um número inteiro >= 1, corrige pra 1 na tela
    // (evita total travado em NaN sem o usuário notar).

    const camposQuantidade =
        document.querySelectorAll(
            ".quantidadeEquipamento"
        );


    camposQuantidade.forEach(campo => {

        if(campo.dataset.eventoBlur === "1"){
            return;
        }


        campo.dataset.eventoBlur = "1";


        campo.addEventListener(
            "blur",
            () => {

                const numero =
                    parseInt(campo.value, 10);

                if(
                    !Number.isFinite(numero) ||
                    numero < 1
                ){

                    campo.value = "1";

                    gerarTextos();

                    mostrarFretes();
                }

            }
        );

    });
}
