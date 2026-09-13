// ======================================
// PROPOSTAS - DADOS
// ======================================
// Carregamento de tabela/frete, gestão de equipamentos
// e cálculo de desconto por equipamento.
// Depende de helpers.js (precisa vir carregado antes).

// ======================================
// TABELAS
// ======================================

let tabelaPrecos = {};

let tabelasFrete = {};

// A linha fixa do HTML já nasce com data-equip-id="1"
let proximoEquipId = 2;


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

    const periodoValido =
        periodo &&
        diasValidos.includes(diasBusca);

    // Usa obterEquipamentos(), a mesma fonte usada por
    // gerarTextos() e mostrarFretes(), pra que TODA linha
    // de equipamento (fixa ou adicionada com "+") entre
    // no cálculo aqui também.

    const equipamentos =
        obterEquipamentos();

    const dadosPorEquipamento =
        equipamentos.map((equipamento) => {

            if (!periodoValido) {

                return {
                    ...equipamento,
                    valorTabela: null,
                    erro: "Informe um período válido"
                };
            }

            const tabelaModelo =
                tabelaPrecos[equipamento.modelo];

            if (!tabelaModelo) {

                return {
                    ...equipamento,
                    valorTabela: null,
                    erro: `Modelo ${equipamento.modelo} não encontrado`
                };
            }

            const valorUnitario =
                tabelaModelo[diasBusca];

            if (
                valorUnitario === undefined ||
                valorUnitario === null ||
                isNaN(valorUnitario)
            ) {

                return {
                    ...equipamento,
                    valorTabela: null,
                    erro: `Período ${diasBusca} dias não encontrado para ${equipamento.modelo}`
                };
            }

            return {
                ...equipamento,
                valorTabela: valorUnitario * equipamento.quantidade,
                erro: null
            };
        });

    renderizarDescontosPorEquipamento(
        dadosPorEquipamento
    );
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
// DESCONTO POR EQUIPAMENTO
// ======================================

function renderizarDescontosPorEquipamento(dadosPorEquipamento){

    const lista =
        $("listaDescontosEquipamentos");

    if(!lista) return;

    if(!dadosPorEquipamento.length){

        lista.innerHTML = `
            <p class="desconto-placeholder" style="color:#94a3b8">
                Adicione um equipamento e o período pra calcular.
            </p>
        `;

        $("valorFinalProposta").innerText = "";

        return;
    }

    // remove bloco de qualquer equipamento que já não existe mais
    lista.querySelectorAll(".desconto-item").forEach(bloco => {

        const aindaExiste =
            dadosPorEquipamento.some(
                equip => String(equip.id) === bloco.dataset.equipId
            );

        if(!aindaExiste) bloco.remove();
    });

    // remove a mensagem inicial de placeholder, se ainda estiver lá
    const placeholder =
        lista.querySelector(".desconto-placeholder");

    if(placeholder) placeholder.remove();

    dadosPorEquipamento.forEach(equipamento => {

        let bloco =
            lista.querySelector(
                `.desconto-item[data-equip-id="${equipamento.id}"]`
            );

        // cria o bloco na primeira vez que esse equipamento aparece;
        // se já existe, só atualiza (preserva o desconto já digitado)
        if(!bloco){

            bloco =
                document.createElement("div");

            bloco.className = "desconto-item";
            bloco.dataset.equipId = equipamento.id;

            bloco.innerHTML = `
                <p class="desconto-item-titulo"></p>
                <input type="text" class="descValorTabela" placeholder="Valor tabela">
                <input type="text" class="descValorDesejado" placeholder="Valor desejado">
                <input type="text" class="descPercentual" placeholder="% desconto">
                <p class="desconto-item-erro"></p>
                <p class="desconto-item-resultado"></p>
            `;

            lista.appendChild(bloco);
        }

        const titulo =
            (equipamento.quantidade > 1
                ? equipamento.quantidade + "x "
                : ""
            ) + equipamento.modelo;

        bloco.querySelector(".desconto-item-titulo").innerText =
            titulo;

        const campoValorTabela =
            bloco.querySelector(".descValorTabela");

        // Se o modelo dessa linha mudou (virou outro equipamento),
        // qualquer edição manual anterior perde o sentido — reseta.
        if(bloco.dataset.modeloRastreado !== equipamento.modelo){

            bloco.dataset.modeloRastreado = equipamento.modelo;
            bloco.dataset.editadoManual = "";
        }

        if(equipamento.erro){

            bloco.querySelector(".desconto-item-erro").innerHTML =
                `<span style="color:#ef4444">${equipamento.erro}</span>`;

            bloco.querySelector(".desconto-item-resultado").innerHTML = "";

            campoValorTabela.value = "";
            bloco.dataset.valorTabela = "";
            bloco.dataset.valorFinal = "";

        }else{

            bloco.querySelector(".desconto-item-erro").innerHTML = "";

            // Só sobrescreve o campo se o usuário NÃO tiver editado
            // manualmente — assim uma edição digitada nunca é apagada
            // sozinha quando outra coisa na tela muda.
            if(bloco.dataset.editadoManual !== "1"){

                campoValorTabela.value =
                    formatarMoedaBR(equipamento.valorTabela);
            }

            bloco.dataset.valorTabela =
                brToNumber(campoValorTabela.value);

            calcularDescontoBloco(bloco);
        }
    });

    atualizarValorFinalProposta();
}


function calcularDescontoBloco(bloco){

    const valorTabela =
        Number(bloco.dataset.valorTabela);

    const resultado =
        bloco.querySelector(".desconto-item-resultado");

    if(
        !Number.isFinite(valorTabela) ||
        valorTabela <= 0
    ){
        resultado.innerHTML = "";
        bloco.dataset.valorFinal = "";
        atualizarValorFinalProposta();
        return;
    }

    const campoDesejado =
        bloco.querySelector(".descValorDesejado");

    const campoPercentual =
        bloco.querySelector(".descPercentual");

    const desejadoTexto =
        campoDesejado.value.trim();

    const percentualTexto =
        campoPercentual.value.trim();


    // ==================================
    // OPÇÃO 1 — USUÁRIO DIGITOU %
    // ==================================

    if(percentualTexto){

        const percentual =
            brToNumber(percentualTexto);

        if(
            Number.isFinite(percentual) &&
            percentual >= 0 &&
            percentual <= 100
        ){

            const valorDesconto =
                valorTabela * (percentual / 100);

            const valorFinal =
                valorTabela - valorDesconto;

            campoDesejado.value =
                formatarMoedaBR(valorFinal);

            resultado.innerHTML = `
                Desconto: <strong>R$ ${formatarMoedaBR(valorDesconto)}</strong>
                <br>
                <span style="color:#94a3b8">
                    ${percentual.toFixed(2)}% → R$ ${formatarMoedaBR(valorFinal)}
                </span>
            `;

            bloco.dataset.valorFinal = valorFinal;
            atualizarValorFinalProposta();
            return;
        }
    }


    // ==================================
    // OPÇÃO 2 — USUÁRIO DIGITOU VALOR FINAL
    // ==================================

    if(desejadoTexto){

        const valorDesejado =
            brToNumber(desejadoTexto);

        if(
            Number.isFinite(valorDesejado) &&
            valorDesejado > 0
        ){

            const valorDesconto =
                valorTabela - valorDesejado;

            const percentual =
                (valorDesconto / valorTabela) * 100;

            resultado.innerHTML = `
                Desconto: <strong>R$ ${formatarMoedaBR(valorDesconto)}</strong>
                <br>
                <span style="color:#94a3b8">
                    Desconto de ${percentual.toFixed(2)}%
                </span>
            `;

            bloco.dataset.valorFinal = valorDesejado;
            atualizarValorFinalProposta();
            return;
        }
    }


    // sem desconto informado: valor final = valor de tabela
    resultado.innerHTML = "";
    bloco.dataset.valorFinal = valorTabela;
    atualizarValorFinalProposta();
}


function atualizarValorFinalProposta(){

    const blocos =
        document.querySelectorAll(".desconto-item");

    let total = 0;
    let algumValido = false;

    blocos.forEach(bloco => {

        const valorFinal =
            Number(bloco.dataset.valorFinal);

        if(
            Number.isFinite(valorFinal) &&
            valorFinal > 0
        ){
            total += valorFinal;
            algumValido = true;
        }
    });

    const campo = $("valorFinalProposta");

    if(campo){

        campo.innerText =
            algumValido
                ? "R$ " + formatarMoedaBR(total)
                : "";
    }
}


// Delegação de evento: digitar % ou valor desejado em
// QUALQUER bloco de desconto recalcula só aquele bloco,
// sem mexer nos outros.

document.addEventListener("input", (evento) => {

    if(evento.target.classList.contains("descValorTabela")){

        const bloco =
            evento.target.closest(".desconto-item");

        // marca como editado manualmente, pra não ser
        // sobrescrito na próxima recontagem automática
        bloco.dataset.editadoManual = "1";

        bloco.dataset.valorTabela =
            brToNumber(evento.target.value);

        calcularDescontoBloco(bloco);

    }else if(evento.target.classList.contains("descPercentual")){

        const bloco =
            evento.target.closest(".desconto-item");

        bloco.querySelector(".descValorDesejado").value = "";

        calcularDescontoBloco(bloco);

    }else if(evento.target.classList.contains("descValorDesejado")){

        const bloco =
            evento.target.closest(".desconto-item");

        bloco.querySelector(".descPercentual").value = "";

        calcularDescontoBloco(bloco);
    }
});
