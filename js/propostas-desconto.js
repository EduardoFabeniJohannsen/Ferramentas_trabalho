// ======================================
// PROPOSTAS - DESCONTO (blocos)
// ======================================
// Desenha e atualiza o bloco de desconto de cada equipamento.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// DESCONTO POR EQUIPAMENTO
// ======================================

function htmlPlaceholderDesconto(){

    if(erroTabelaPrecos){

        return `
            <p class="desconto-placeholder" style="color:#ef4444">
                ⚠️ ${erroTabelaPrecos}
            </p>
        `;
    }

    return `
        <p class="desconto-placeholder" style="color:#94a3b8">
            Adicione um equipamento e o período pra calcular.
        </p>
    `;
}


function renderizarDescontosPorEquipamento(dadosPorEquipamento){

    const lista =
        $("listaDescontosEquipamentos");

    if(!lista) return;

    if(!dadosPorEquipamento.length){

        lista.innerHTML =
            htmlPlaceholderDesconto();

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

    // mantém os blocos na mesma ordem das linhas de equipamento
    // (uma linha que ganhou modelo depois não fica no fim da lista)
    const ordemAtual =
        Array.from(lista.querySelectorAll(".desconto-item"))
            .map(bloco => bloco.dataset.equipId)
            .join(",");

    const ordemDesejada =
        dadosPorEquipamento
            .map(equip => String(equip.id))
            .join(",");

    if(ordemAtual !== ordemDesejada){

        dadosPorEquipamento.forEach(equip => {

            const bloco =
                lista.querySelector(
                    `.desconto-item[data-equip-id="${equip.id}"]`
                );

            if(bloco) lista.appendChild(bloco);
        });
    }

    atualizarValorFinalProposta();
}
