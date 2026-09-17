// ======================================
// PROPOSTAS - DESCONTO
// ======================================
// Cálculo do valor de tabela por equipamento e do desconto
// (card "Calcular Desconto"). Depende de helpers.js,
// propostas-csv.js e propostas-equipamentos.js (precisam vir
// carregados antes).

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
