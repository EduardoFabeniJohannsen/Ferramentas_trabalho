// ======================================
// AGENDA - CONSULTA AO ESTOQUE: TABELA
// ======================================
// Data da publicação, máquinas de cada filial e a tabela da janela.

// "há 40 minutos", "há 15 horas", "há 1 dia e 3 horas"
function tempoDesde(milissegundos){

    const plural = (quantidade, nome) =>
        `${quantidade} ${nome}${quantidade === 1 ? "" : "s"}`;

    const minutos = Math.floor(milissegundos / 60000);

    if(minutos < 1) return "agora há pouco";

    if(minutos < 60) return `há ${plural(minutos, "minuto")}`;

    const horas = Math.floor(minutos / 60);

    if(horas < 24) return `há ${plural(horas, "hora")}`;

    const dias = Math.floor(horas / 24);

    return horas % 24
        ? `há ${plural(dias, "dia")} e ${plural(horas % 24, "hora")}`
        : `há ${plural(dias, "dia")}`;
}


// data da publicação e o tempo que passou; estoque antigo fica em destaque
function criarDataEstoque(atualizadoEm){

    const decorrido = Date.now() - new Date(atualizadoEm).getTime();

    // data vazia viraria 1969
    if(!atualizadoEm || !Number.isFinite(decorrido)){

        return criar("small", "", "Estoque sem data de publicação");
    }

    const antigo = decorrido > LIMITE_ESTOQUE_ANTIGO_MS;

    return criar(
        "small",
        antigo ? "estoque-desatualizado" : "",
        `${antigo ? "⚠️ " : ""}Estoque publicado em ${dataHoraBR(atualizadoEm)} — ${tempoDesde(decorrido)}`
    );
}


// máquinas da filial nos dois status da consulta; modelos = null mostra todas
function maquinasDaFilial(filial, modelos){

    return [
        ["disponiveis", "Disponível"],
        ["manutencao", "Manutenção"]
    ]
        .flatMap(([campo, situacao]) =>
            Object.entries(filial[campo] || {})
                .filter(([modelo]) => !modelos || modelos.includes(modelo))
                .flatMap(([modelo, lista]) =>
                    lista.map(maquina => ({ ...maquina, modelo, situacao }))
                )
        )
        .sort((a, b) =>
            a.p.localeCompare(b.p, "pt-BR", { numeric: true })
        );
}


function criarTabelaEstoque(maquinas, reservas){

    const tabela = criar("table", "estoque-tabela");

    const cabecalho = criar("tr");

    // botão "Usar" (agenda-usar-patrimonio.js): coleta, cancelado e concluído
    // não escolhem máquina
    const podeUsar = agendamentoReservaMaquina(estoqueItemAberto);

    [
        "Patrimônio", "Marca", "Modelo", "Ano", "Situação", "",
        ...(podeUsar ? [""] : [])
    ].forEach(titulo => {

        cabecalho.appendChild(criar("th", "", titulo));
    });

    const topo = criar("thead");

    topo.appendChild(cabecalho);

    tabela.appendChild(topo);

    const corpo = criar("tbody");

    maquinas.forEach(maquina => {

        const linha = criar("tr");

        linha.appendChild(criar("td", "estoque-patrimonio", maquina.p));

        // relatório sem a coluna Marca: o nome do equipamento ajuda no lugar
        linha.appendChild(criar("td", "", maquina.m || maquina.e || "—"));

        linha.appendChild(criar("td", "", maquina.f || maquina.modelo));

        linha.appendChild(criar("td", "", maquina.a || "—"));

        linha.appendChild(
            criar(
                "td",
                maquina.situacao === "Manutenção" ? "estoque-em-manutencao" : "",
                maquina.situacao
            )
        );

        const reserva = reservas[maquina.p.toUpperCase()];

        // já está em demanda: a linha inteira fica em destaque
        if(reserva){

            linha.classList.add(
                reserva.id === estoqueItemAberto.id
                    ? "estoque-neste-agendamento"
                    : "estoque-em-demanda"
            );
        }

        linha.appendChild(
            criar("td", "estoque-reserva", reserva ? textoReserva(reserva) : "")
        );

        if(podeUsar){

            const celulaUsar = criar("td", "estoque-usar");

            // a que já está neste agendamento não tem o que usar
            if(!reserva || reserva.id !== estoqueItemAberto.id){

                const usar = criar("button", "", "Usar");

                usar.type = "button";

                usar.title = `Usar ${maquina.p} neste agendamento`;

                usar.addEventListener("click", () => usarPatrimonio(maquina));

                celulaUsar.appendChild(usar);
            }

            linha.appendChild(celulaUsar);
        }

        corpo.appendChild(linha);
    });

    tabela.appendChild(corpo);

    return tabela;
}
