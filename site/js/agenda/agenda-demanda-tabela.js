// ======================================
// AGENDA - DEMANDA: A TABELA
// ======================================
// A tabela do 📦 Demanda (agenda-demanda.js), uma linha por modelo: as que saem, as ainda sem patrimônio, as que voltam nas coletas e as disponíveis no último estoque publicado (com quantas em cada filial), e o total embaixo. Clicar no modelo mostra os agendamentos dele; clicar num agendamento fecha a janela e abre ele para editar. Carregar depois de agenda-demanda-calculo.js.

function celulaDemanda(texto, classe){

    return criar("td", classe || "", texto);
}


function celulaEstoqueDemanda(estoque, modelo){

    if(estoqueDaDemanda === null) return celulaDemanda("…", "demanda-num");

    if(falhaEstoqueDemanda) return celulaDemanda("—", "demanda-num");

    const doModelo = estoque[modelo];

    const celula = celulaDemanda(doModelo ? String(doModelo.total) : "0", "demanda-num");

    // com mais de uma filial: quantas em cada uma
    if(doModelo && estoqueDaDemanda.length > 1){

        celula.appendChild(
            criar("small", "demanda-filiais", doModelo.filiais.map(filial => `${filial.nome} ${filial.quantidade}`).join(" · "))
        );
    }

    return celula;
}


function linhaAgendamentoDemanda({ item, quantidade, patrimonio, volta }){

    const linha = criar("li", volta ? "demanda-volta" : "");

    linha.textContent = [
        `${dataBR(item.data).slice(0, 5)} ${item.horario || ""}`.trim(),
        volta ? "↩ " + rotuloTipo(item.tipo) : rotuloTipo(item.tipo),
        textoClientesAgendamento(item) || "Sem cliente",
        (quantidade > 1 ? `${quantidade}x ` : "") + (patrimonio || "sem máquina"),
        !volta && semPatrimonioDemanda(patrimonio) ? "⚠️ sem patrimônio" : ""
    ].filter(Boolean).join(" · ");

    linha.title = "Abrir o agendamento";

    linha.addEventListener("click", () => {

        fecharDemandaAgenda();

        abrirModalAgenda(item.id);
    });

    return linha;
}


function linhasModeloDemanda(conta, estoque){

    const aberto = modelosAbertosDemanda.has(conta.modelo);

    const linha = criar("tr", "demanda-modelo" + (aberto ? " aberto" : ""));

    const nome = criar("button", "demanda-nome", `${aberto ? "▾" : "▸"} ${conta.modelo}`);

    nome.type = "button";

    nome.title = aberto ? "Esconder os agendamentos" : "Ver os agendamentos";

    nome.addEventListener("click", () => {

        if(aberto) modelosAbertosDemanda.delete(conta.modelo);
        else modelosAbertosDemanda.add(conta.modelo);

        desenharDemandaAgenda();
    });

    const primeira = criar("td");

    primeira.appendChild(nome);

    linha.append(
        primeira,
        celulaDemanda(String(conta.saem), "demanda-num demanda-saem"),
        celulaDemanda(conta.semPatrimonio ? String(conta.semPatrimonio) : "—", "demanda-num" + (conta.semPatrimonio ? " demanda-alerta" : "")),
        celulaDemanda(conta.voltam ? String(conta.voltam) : "—", "demanda-num"),
        celulaEstoqueDemanda(estoque, conta.modelo)
    );

    if(!aberto) return [linha];

    const detalhe = criar("tr", "demanda-detalhe");

    const celula = criar("td");

    celula.colSpan = 5;

    const lista = criar("ul", "demanda-agendamentos");

    conta.agendamentos.forEach(registro => lista.appendChild(linhaAgendamentoDemanda(registro)));

    celula.appendChild(lista);

    detalhe.appendChild(celula);

    return [linha, detalhe];
}


function tabelaDemanda(demanda){

    const estoque = estoquePorModelo(estoqueDaDemanda || []);

    const tabela = criar("table", "demanda-tabela");

    const cabecalho = criar("tr");

    [
        ["Modelo", "Clique no modelo para ver os agendamentos"],
        ["Saem", "Máquinas que vão para os clientes no período (entregas e trocas técnicas)"],
        ["Sem patrimônio", "Dessas, quantas ainda não têm a máquina escolhida (só o modelo)"],
        ["Voltam", "Máquinas que voltam nas coletas do período"],
        ["Disponíveis no estoque", "No último estoque publicado (sem as em manutenção)"]
    ].forEach(([texto, dica]) => {

        const titulo = criar("th", "", texto);

        titulo.title = dica;

        cabecalho.appendChild(titulo);
    });

    tabela.appendChild(criar("thead")).appendChild(cabecalho);

    const corpo = criar("tbody");

    demanda.modelos.forEach(conta => linhasModeloDemanda(conta, estoque).forEach(linha => corpo.appendChild(linha)));

    tabela.appendChild(corpo);

    const rodape = criar("tr", "demanda-total");

    rodape.append(
        celulaDemanda("Total"),
        celulaDemanda(String(demanda.total.saem), "demanda-num demanda-saem"),
        celulaDemanda(demanda.total.semPatrimonio ? String(demanda.total.semPatrimonio) : "—", "demanda-num"),
        celulaDemanda(demanda.total.voltam ? String(demanda.total.voltam) : "—", "demanda-num"),
        celulaDemanda("")
    );

    tabela.appendChild(criar("tfoot")).appendChild(rodape);

    return tabela;
}
