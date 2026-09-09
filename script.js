// ======================================
// HELPERS
// ======================================

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
// TABELAS
// ======================================

let tabelaPrecos = {};

let tabelasFrete = {};


// ======================================
// NORMALIZAR MODELO
// ======================================

function normalizarModelo(valor){

    return String(valor || "")
        .replace(/\uFEFF/g, "")
        .trim()
        .toUpperCase();
}


// ======================================
// CARREGAR TABELA DE PREÇOS
// ======================================

async function carregarTabela() {

    try {

        const resposta = await fetch("./tabela.csv");

        if (!resposta.ok) {
            throw new Error(
                `Erro HTTP ${resposta.status} ao carregar tabela.csv`
            );
        }

        const texto = await resposta.text();

        const linhas = texto
            .replace(/^\uFEFF/, "")
            .trim()
            .split(/\r?\n/);

        if (linhas.length < 2) {
            throw new Error("tabela.csv está vazia");
        }

        const cabecalho = linhas[0]
            .split(";")
            .map(item => item.trim());

        tabelaPrecos = {};

        for (let i = 1; i < linhas.length; i++) {

            if (!linhas[i].trim()) continue;

            const colunas = linhas[i]
                .split(";")
                .map(item => item.trim());

            let modelo = colunas[0]
                .replace(/^\uFEFF/, "")
                .trim()
                .toUpperCase();

            // Corrige possíveis diferenças no CSV
            modelo = modelo.replace(/\s+/g, "");

            if (!modelo) continue;

            tabelaPrecos[modelo] = {};

            for (let j = 1; j < cabecalho.length; j++) {

                const dias = cabecalho[j].trim();

                const valorTexto = colunas[j];

                if (
                    valorTexto === undefined ||
                    valorTexto === ""
                ) {
                    continue;
                }

                // Se tiver vírgula, é formato BR (1.234,56).
                // Se não tiver, é ponto decimal simples (913.5),
                // que é o formato real do tabela.csv.
                const valorFinal =
                    valorTexto.includes(",")
                        ? parseFloat(
                            valorTexto
                                .replace(/\./g, "")
                                .replace(",", ".")
                        )
                        : parseFloat(valorTexto);

                if (!isNaN(valorFinal)) {
                    tabelaPrecos[modelo][dias] = valorFinal;
                }
            }
        }

        console.log(
            "Tabela carregada:",
            Object.keys(tabelaPrecos)
        );

        console.log(
            "WTE10:",
            tabelaPrecos["WTE10"]
        );

    } catch (erro) {

        console.error(
            "ERRO AO CARREGAR tabela.csv:",
            erro
        );

    }
}


// ======================================
// CARREGAR FRETES
// ======================================

async function carregarFretes(){

    const arquivos = [

        "frete_Magnus.csv",
        "frete_Kung.csv",
        "frete_Jean.csv",
        "frete_Dionizio.csv",
        "frete_RR.csv"

    ];


    for(const arquivo of arquivos){

        try{

            const resposta =
                await fetch(
                    arquivo,
                    {cache:"no-store"}
                );


            if(!resposta.ok){

                throw new Error(
                    `HTTP ${resposta.status}`
                );
            }


            const texto =
                await resposta.text();


            const linhas =
                texto
                    .replace(/\r/g, "")
                    .trim()
                    .split("\n");


            if(!linhas.length) continue;


            const cabecalho =
                linhas[0]
                    .replace(/^\uFEFF/, "")
                    .split(";")
                    .map(item =>
                        item
                            .trim()
                            .toUpperCase()
                    );


            const transportador =
                arquivo
                    .replace("frete_", "")
                    .replace(".csv", "");


            tabelasFrete[transportador] = {};


            for(
                let i = 1;
                i < linhas.length;
                i++
            ){

                if(!linhas[i].trim()) continue;


                const colunas =
                    linhas[i].split(";");


                const modelo =
                    normalizarModelo(
                        colunas[0]
                    );


                if(!modelo) continue;


                tabelasFrete[
                    transportador
                ][modelo] = {};


                for(
                    let j = 1;
                    j < cabecalho.length;
                    j++
                ){

                    const cidade =
                        cabecalho[j];


                    const valor =
                        colunas[j]
                            ?.trim();


                    tabelasFrete[
                        transportador
                    ][modelo][cidade] =
                        valor;
                }
            }


        }catch(erro){

            console.error(
                "Erro no arquivo:",
                arquivo,
                erro
            );
        }
    }


    console.log(
        "Fretes carregados:",
        tabelasFrete
    );
}


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


// ======================================
// OBTER PERÍODO DA TABELA
// ======================================

function obterPeriodoTabela(){

    const valor =
        $("periodo")?.value.trim();


    if(!valor) return null;


    const numero =
        Number(valor);


    if(
        !Number.isFinite(numero) ||
        numero <= 0
    ){
        return null;
    }


    if(
        numero > 30 &&
        numero % 30 === 0
    ){
        return "30";
    }


    const diasValidos = [

        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "10",
        "14",
        "15",
        "21",
        "28",
        "30"

    ];


    if(
        !diasValidos.includes(
            String(numero)
        )
    ){

        return null;
    }


    return String(numero);
}


// ======================================
// CALCULAR VALOR TOTAL DA TABELA
// ======================================

function calcularValorTabela(){

    const equipamentos =
        obterEquipamentos();


    const periodo =
        obterPeriodoTabela();


    if(
        !equipamentos.length ||
        !periodo
    ){
        return null;
    }


    let total = 0;


    for(
        const equipamento
        of equipamentos
    ){

        const tabelaModelo =
            tabelaPrecos[
                equipamento.modelo
            ];


        if(!tabelaModelo){

            return {
                erro:
                    `Modelo ${equipamento.modelo} não encontrado`
            };
        }


        const valor =
            tabelaModelo[periodo];


        if(
            valor === undefined ||
            valor === null
        ){

            return {
                erro:
                    `Período ${periodo} dias não encontrado para ${equipamento.modelo}`
            };
        }


        total +=
            valor *
            equipamento.quantidade;
    }


    return {
        total: total
    };
}


// ======================================
// PREENCHER VALOR TABELA
// ======================================

function preencherValorTabela() {

    const periodo =
        $("periodo")?.value.trim();

    if (!periodo) return;

    const diasNumero = Number(periodo);

    let diasBusca = periodo;

    if (
        diasNumero > 30 &&
        diasNumero % 30 === 0
    ) {
        diasBusca = "30";
    }

    const diasValidos = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "10",
        "14",
        "15",
        "21",
        "28",
        "30"
    ];

    if (!diasValidos.includes(diasBusca)) {

        $("valorTabela").value = "";

        $("desconto").innerHTML = `
            <span style="color:#ef4444">
                Valor fora de tabela
            </span>
        `;

        return;
    }

    // Usa obterEquipamentos(), a mesma fonte usada por
    // gerarTextos() e mostrarFretes(), pra que TODA linha
    // de equipamento (fixa ou adicionada com "+") entre
    // no cálculo aqui também.

    const equipamentos =
        obterEquipamentos();

    let total = 0;
    let encontrou = false;
    let erroModelo = "";

    equipamentos.forEach((equipamento) => {

        const modelo = equipamento.modelo;
        const quantidade = equipamento.quantidade;

        if (!tabelaPrecos[modelo]) {

            erroModelo = modelo;
            return;
        }

        const valor =
            tabelaPrecos[modelo][diasBusca];

        if (
            valor === undefined ||
            valor === null ||
            isNaN(valor)
        ) {

            erroModelo = modelo;
            return;
        }

        total +=
            valor * quantidade;

        encontrou = true;
    });

    if (!encontrou) {

        $("valorTabela").value = "";

        $("desconto").innerHTML = `
            <span style="color:#ef4444">
                ${erroModelo
                    ? `Modelo ${erroModelo} não encontrado`
                    : "Informe um equipamento"
                }
            </span>
        `;

        return;
    }

    $("valorTabela").value =
        total.toFixed(2);

    calcularDesconto();
}


// ======================================
// FRETES
// ======================================

function mostrarFretes(){

    const modelos =
        obterEquipamentos();


    const cidade =
        normalizarModelo(
            $("cidade")?.value
        );


    if(
        !modelos.length ||
        !cidade
    ){

        if($("resultadoFretes")){

            $("resultadoFretes").innerHTML =
                "Nenhum frete consultado";
        }

        return;
    }


    let html = "";


    for(
        const equipamento
        of modelos
    ){

        html += `
            <div class="frete-item">
                <strong>
                    ${equipamento.quantidade > 1
                        ? equipamento.quantidade + " "
                        : ""
                    }${equipamento.modelo}
                </strong>
                <br>
            `;


        for(
            const transportador
            in tabelasFrete
        ){

            const modeloTabela =
                tabelasFrete[
                    transportador
                ][
                    equipamento.modelo
                ];


            if(!modeloTabela){

                html += `
                    ⚠️ ${transportador}:
                    modelo não encontrado
                    <br>
                `;

                continue;
            }


            const valor =
                modeloTabela[cidade];


            if(
                valor === undefined ||
                valor === ""
            ){

                html += `
                    ⚠️ ${transportador}:
                    cidade não encontrada
                    <br>
                `;

            }else{

                html += `
                    ✅ ${transportador}:
                    R$ ${valor}
                    <br>
                `;
            }

        }


        html += `
            </div>
        `;
    }


    $("resultadoFretes").innerHTML =
        html;
}


// ======================================
// DESCONTO
// ======================================

function calcularDesconto(){

    const tabelaTexto =
        $("valorTabela")?.value.trim();


    const desejadoTexto =
        $("valorDesejado")?.value.trim();


    const percentualTexto =
        $("percentualDesconto")?.value.trim();


    if(!tabelaTexto){

        $("desconto").innerHTML = "";

        return;
    }


    const valorTabela =
        brToNumber(
            tabelaTexto
        );


    if(
        !Number.isFinite(valorTabela) ||
        valorTabela <= 0
    ){

        $("desconto").innerHTML = "";

        return;
    }


    // ==================================
    // OPÇÃO 1
    // USUÁRIO DIGITOU %
    // ==================================

    if(percentualTexto){

        let percentual =
            brToNumber(
                percentualTexto
            );


        if(
            Number.isFinite(percentual) &&
            percentual >= 0 &&
            percentual <= 100
        ){

            const valorDesconto =
                valorTabela *
                (percentual / 100);


            const valorFinal =
                valorTabela -
                valorDesconto;


            $("valorDesejado").value =
                formatarMoedaBR(
                    valorFinal
                );


            $("desconto").innerHTML = `

                <strong>
                    R$ ${formatarMoedaBR(valorDesconto)}
                </strong>

                <br>

                <span style="color:#94a3b8">
                    ${percentual.toFixed(2)}%
                    →
                    R$ ${formatarMoedaBR(valorFinal)}
                </span>

            `;

            return;
        }
    }


    // ==================================
    // OPÇÃO 2
    // USUÁRIO DIGITOU VALOR FINAL
    // ==================================

    if(desejadoTexto){

        const valorDesejado =
            brToNumber(
                desejadoTexto
            );


        if(
            !Number.isFinite(valorDesejado) ||
            valorDesejado <= 0
        ){

            $("desconto").innerHTML = "";

            return;
        }


        const valorDesconto =
            valorTabela -
            valorDesejado;


        const percentual =
            (
                valorDesconto /
                valorTabela
            ) * 100;


        $("desconto").innerHTML = `

            <strong>
                R$ ${formatarMoedaBR(valorDesconto)}
            </strong>

            <br>

            <span style="color:#94a3b8">
                Desconto de
                ${percentual.toFixed(2)}%
            </span>

        `;

        return;
    }


    $("desconto").innerHTML = "";
}


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
    }


    preencherValorTabela();
}


// ======================================
// COPIAR TEXTO
// ======================================

function copiarTexto(id){

    const texto =
        $(id)?.innerText;


    if(!texto) return;


    copiar(texto);

    mostrarToast(
        "Copiado"
    );
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
            "Informe o modelo"
        );
    }


    if(!periodo){

        return mostrarToast(
            "Informe período"
        );
    }


    const valorLocacaoTexto =
        $("valorDesejado")
            .value
            .trim()
        ||
        $("valorTabela")
            .value
            .trim();


    if(!valorLocacaoTexto){

        return mostrarToast(
            "Informe valor locação"
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
    // VALOR TOTAL
    // ==================================

    const valorLocacao =
        brToNumber(
            valorLocacaoTexto
        );


    const seguro =
        valorLocacao * 0.07;


    const total =
        valorLocacao + seguro;


    // ==================================
    // BLOCOS DOS EQUIPAMENTOS
    // ==================================

    let blocosEquipamentos =
        "";


    equipamentos.forEach(
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


            if(index > 0){

                blocosEquipamentos +=
                    "\n=======\n\n";
            }


            blocosEquipamentos +=
`🟡 Modelo: ${
    quantidade > 1
        ? quantidade + " "
        : ""
}${modelo} ${tipo} ${energia} – ${altura} metros de altura de trabalho

* Altura da plataforma: ${alturaPlataforma} metros
* Altura de trabalho: ${altura} metros
* Período de locação: ${periodoExibicao} dias
`;

        }
    );


    // ==================================
    // QUANTIDADE TOTAL
    // ==================================

    const quantidadeTotal =
        equipamentos.reduce(
            (
                total,
                equipamento
            ) => {

                return total +
                    equipamento.quantidade;

            },
            0
        );


    const textoMaquina =
        quantidadeTotal > 1
            ? "máquinas"
            : "máquina";


    // ==================================
    // VALOR
    // ==================================

    const textoValor =
        equipamentos.length > 1 ||
        quantidadeTotal > 1
            ? "Valor da locação (Ambos juntos)"
            : "Valor da locação";


    const textoTotal =
        equipamentos.length > 1 ||
        quantidadeTotal > 1
            ? "Total máquinas + seguro"
            : "Total máquina + seguro";


    let textoFinal =
`${blocosEquipamentos}

💰 ${textoValor}: R$ ${formatarMoedaBR(valorLocacao)}
🛡️ Seguro contra acidentes e furtos (opcional): R$ ${formatarMoedaBR(seguro)}

💵 ${textoTotal}: R$ ${formatarMoedaBR(total)}`;


    if(
        multiplicadorPeriodo > 1
    ){

        textoFinal +=
            ` * ${multiplicadorPeriodo} períodos = R$ ${formatarMoedaBR(
                total * multiplicadorPeriodo
            )}`;
    }


    textoFinal +=
`

🚚 Frete entrega: R$ ${
    valorFreteTexto || "0,00"
} de Itajai x ${cidadeFormatada}
🚚 Frete retirada: R$ ${
    valorFreteTexto || "0,00"
} de ${cidadeFormatada} x Itajai
(Nosso frete é terceirizado, sendo um boleto na entrega e outro na retirada.)

🎁 Cortesia: Entrega técnica (mediante solicitação)
📄 Forma de pagamento: Mediante aprovação cadastral.`;


    copiar(textoFinal);

    mostrarToast(
        "Proposta Zap copiada"
    );
}


// ======================================
// AGENDAMENTO
// ======================================

function copiarAgendamento(){

    const data =
        $("agData").value ||
        '"hora"';


    const horario =
        $("agHorario").value ||
        '"hora"';


    const equipamento =
        $("agEquipamento").value ||
        '"PEMT"';


    const saida =
        $("agSaida").value ||
        "WR";


    const entrega =
        $("agEntrega").value ||
        '"Nome_do_Local"';


    const endereco =
        $("agEndereco").value ||
        '"Endereço"';


    const contato =
        $("agContato")
            .value
            .trim();


    const numero =
        $("agNumero")
            .value
            .trim();


    const frete =
        $("agendamentoValorFrete")
            .value ||
        '"Valor"';


    const tipoFrete =
        $("tipoFrete").value;


    const nomeProposta =
        $("agNomeProposta")
            .value ||
        '"Nome_Proposta"';


    // ==================================
    // CONTATO
    // ==================================

    let blocoContato = "";


    if(
        contato &&
        numero
    ){

        blocoContato =
`Contato de quem vai receber: ${contato} - ${numero}`;

    }else{

        blocoContato =
`Contato de quem vai receber: abaixo ⤵️`;
    }


    // ==================================
    // FINANCEIRO
    // ==================================

    let financeiroTexto = "";


    if(
        tipoFrete !== "NOSSA"
    ){

        const financeiros =
            document.querySelectorAll(
                ".financeiro-item"
            );


        let listaFinanceiros = "";


        financeiros.forEach(
            (item) => {

                const nome =
                    item.querySelector(
                        ".financeiroNome"
                    )
                    ?.value
                    .trim();


                const telefone =
                    item.querySelector(
                        ".financeiroTelefone"
                    )
                    ?.value
                    .trim();


                const email =
                    item.querySelector(
                        ".financeiroEmail"
                    )
                    ?.value
                    .trim();


                let bloco = "";


                if(nome){

                    bloco +=
                        `Nome: ${nome}\n`;
                }


                if(telefone){

                    bloco +=
                        `Telefone: ${telefone}\n`;
                }


                if(email){

                    bloco +=
                        `Email: ${email}\n`;
                }


                if(bloco.trim()){

                    listaFinanceiros +=
`
${bloco}`;
                }

            }
        );


        if(
            listaFinanceiros.trim()
        ){

            financeiroTexto =
`
* Contatos: ⤵️
📍Financeiro:
${listaFinanceiros}`;
        }
    }


    // ==================================
    // TEXTO
    // ==================================

    const texto =
`🚚 AGENDAMENTO DE ENTREGA

Data: ${data}
Horário: ${horario}
Equipamento: ${equipamento}

Local de Saída: ${saida}
Local de entrega: ${entrega}
Endereço: ${endereco}

${blocoContato}
* FRETE POR ${
    tipoFrete === "NOSSA"
        ? "NOSSA CONTA"
        : "CONTA DO CLIENTE"
} - R$ ${frete}
* ${nomeProposta}${financeiroTexto}`;


    copiar(texto);

    mostrarToast(
        "Agendamento copiado"
    );
}


// ======================================
// TIPO FRETE
// ======================================

function configurarTipoFrete(){

    const tipoFreteSelect =
        $("tipoFrete");


    if(!tipoFreteSelect) return;


    tipoFreteSelect.addEventListener(
        "change",
        () => {

            const bloco =
                $("blocoFinanceiro");


            if(
                tipoFreteSelect.value ===
                "NOSSA"
            ){

                bloco.style.display =
                    "none";

            }else{

                bloco.style.display =
                    "block";
            }

        }
    );
}


// ======================================
// ADICIONAR FINANCEIRO
// ======================================

function adicionarFinanceiro(){

    const lista =
        $("listaFinanceiros");


    lista.insertAdjacentHTML(
        "beforeend",
        `

        <div class="financeiro-item">

            <div class="agendamento-linha">

                <label>Nome:</label>

                <input
                    type="text"
                    class="financeiroNome"
                >

            </div>


            <div class="agendamento-linha">

                <label>Telefone:</label>

                <input
                    type="text"
                    class="financeiroTelefone"
                >

            </div>


            <div class="agendamento-linha">

                <label>Email:</label>

                <input
                    type="text"
                    class="financeiroEmail"
                >

            </div>


            <hr>

        </div>

        `
    );
}


// ======================================
// INIT
// ======================================

(async function init(){

    // ==================================
    // CARREGAR CSVs
    // ==================================

    await carregarTabela();

    await carregarFretes();


    // ==================================
    // EQUIPAMENTOS
    // ==================================

    configurarEventosEquipamentos();


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
    // VALOR TABELA
    // ==================================

    if($("valorTabela")){

        $("valorTabela")
            .addEventListener(
                "input",
                calcularDesconto
            );
    }


    // ==================================
    // VALOR DESEJADO
    // ==================================

    if($("valorDesejado")){

        $("valorDesejado")
            .addEventListener(
                "input",
                () => {

                    // Ao digitar valor desejado,
                    // limpa percentual
                    $("percentualDesconto").value = "";

                    calcularDesconto();

                }
            );
    }


    // ==================================
    // PERCENTUAL
    // ==================================

    if($("percentualDesconto")){

        $("percentualDesconto")
            .addEventListener(
                "input",
                () => {

                    // Ao digitar percentual,
                    // limpa valor desejado
                    $("valorDesejado").value = "";

                    calcularDesconto();

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


    // ==================================
    // TIPO FRETE
    // ==================================

    configurarTipoFrete();

})();