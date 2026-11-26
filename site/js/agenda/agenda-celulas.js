// ======================================
// AGENDA - CÉLULAS DA LINHA
// ======================================
// Monta o conteúdo de cada coluna de um agendamento.

// entrega, troca e entrega/coleta saem da W Rental e coleta volta pra ela, quando
// o local fica vazio (também usado para ordenar pela coluna, agenda-ordem-colunas.js)
function origemNomeDaTela(item){

    if(
        !item.origemNome &&
        !item.origemEndereco &&
        (item.tipo === "Entrega" || TIPOS_COM_RECOLHA.includes(item.tipo))
    ){
        return LOCAL_PADRAO;
    }

    return item.origemNome;
}


function destinoNomeDaTela(item){

    if(
        !item.destinoNome &&
        !item.destinoEndereco &&
        item.tipo === "Coleta"
    ){
        return LOCAL_PADRAO;
    }

    return item.destinoNome;
}


function criarCelulasAgenda(item){

    const expedicao =
        modoVisualizacao === "expedicao";

    const colunas = colunasAtuais();

    const celula = (id, ...filhos) =>
        criarCelula(
            colunas.find(coluna => coluna.id === id) || {},
            ...filhos
        );

    const celulas = {};

    // ---------- horário ----------

    // expedição: o horário do carregamento, se carrega antes (agenda-carregamento.js)
    const textoHorario = horarioDaTela(item) || "—";

    // horário em texto (ex: CONFIRMAR) usa letra menor pra caber
    celulas.horario =
        criar(
            "td",
            "ag-celula ag-hora" + (
                /^\d/.test(textoHorario) || textoHorario === "—"
                    ? ""
                    : " ag-hora-texto"
            ),
            textoHorario
        );

    // carrega num dia e entrega em outro: o outro dia embaixo do horário
    const outroDia = textoOutroDiaDaLinha(item);

    if(outroDia){

        celulas.horario.appendChild(criar("span", "ag-outro-dia", outroDia));
    }

    // ordenado por outra coluna (sem a separação por dia): a data em cima do horário
    if(!agrupaPorDia() && dataDaTela(item)){

        celulas.horario.prepend(criar("span", "ag-data-linha", textoDataNaLinha(dataDaTela(item))));
    }

    // ---------- tipo ----------

    const tagTipo = criar("span", "tag", rotuloTipo(item.tipo));

    tagTipo.dataset.tipo = item.tipo;

    celulas.tipo = celula("tipo", tagTipo);

    // ---------- plataforma / cliente ----------
    // troca técnica e entrega/coleta mostram as duas máquinas: a que vai e a que volta

    const titulo = criar("p", "ag-titulo");

    titulo.appendChild(criarMaquina(item.plataforma));

    if(TIPOS_COM_RECOLHA.includes(item.tipo) && item.plataformaRecolha){

        titulo.appendChild(criar("span", "", " ⇄ "));

        titulo.appendChild(criarMaquina(item.plataformaRecolha));
    }

    // coleta com mais de um contrato: "Alfa + Beta (2 contratos)" (agenda-contratos.js)
    const clientes = textoClientesAgendamento(item);

    const contratos = contratosDoAgendamento(item).length;

    if(clientes){

        titulo.appendChild(
            criar("span", "", ` — ${clientes}${contratos > 1 ? ` (${contratos} contratos)` : ""}`)
        );
    }

    celulas.titulo = celula("titulo", titulo);

    // ---------- transportadora, motorista, período, status ----------

    celulas.transportadora =
        celula(
            "transportadora",
            item.transportadora
                ? criar("span", "tag", item.transportadora)
                : criar("span", "tag sem-transp", "A definir")
        );

    celulas.motorista =
        celula(
            "motorista",
            item.motorista
                ? criar("span", "", item.motorista)
                : null
        );

    celulas.periodo =
        celula(
            "periodo",
            item.periodo
                ? criar("span", "", item.periodo)
                : null
        );

    celulas.status = celula("status", criarSeletorStatus(item));

    // ---------- observação (cada modo tem a sua) ----------

    const textoObs =
        expedicao
            ? item.obsExpedicao
            : item.obsEntrega;

    celulas.obs =
        celula(
            "obs",
            textoObs
                ? criar("p", "ag-extra", textoObs)
                : null
        );

    // ---------- local e frete ----------
    // (na expedição só aparecem se o usuário ligar a coluna)

    const origemNome = origemNomeDaTela(item);

    const destinoNome = destinoNomeDaTela(item);

    celulas.retirada =
        celula(
            "retirada",
            (origemNome || item.origemEndereco || item.linkOrigem)
                ? criarBlocoLocal(
                    origemNome,
                    item.origemEndereco,
                    item.linkOrigem
                )
                : null
        );

    celulas.entrega =
        celula(
            "entrega",
            (destinoNome || item.destinoEndereco || item.linkDestino)
                ? criarBlocoLocal(
                    destinoNome,
                    item.destinoEndereco,
                    item.linkDestino
                )
                : null
        );

    const frete = brToNumber(item.frete);

    celulas.frete =
        celula(
            "frete",
            (Number.isFinite(frete) && frete > 0)
                ? criar("p", "ag-extra", `R$ ${formatarMoedaBR(frete)}`)
                : null
        );

    // ---------- informações que só aparecem se o usuário ligar a coluna ----------

    const celulaTexto = (id, texto) =>
        celula(id, texto ? criar("span", "", texto) : null);

    celulas.cidade =
        celulaTexto("cidade", cidadeDoEndereco(item.destinoEndereco));

    // transferência entre obras: os dois, com o local (agenda-transferencia-obras.js)
    celulas.contato = celulaTexto("contato", textoContatoCelula(item));

    celulas.obsEntrega = celulaTexto("obsEntrega", item.obsEntrega);

    celulas.referencia = celulaTexto("referencia", item.referencia);

    // dividido: "Cliente R$ 300,00 + nossa R$ 200,00" (agenda-utils.js)
    const partes = partesFrete(item);

    celulas.freteConta =
        celulaTexto(
            "freteConta",
            partes
                ? `Cliente R$ ${formatarMoedaBR(partes.cliente)} + nossa R$ ${formatarMoedaBR(partes.nossa)}`
                : item.freteConta === "cliente" ? "Conta do cliente" : "Nossa conta"
        );

    celulas.card = celulaTexto("card", item.card);

    celulas.emails = celulaTexto("emails", item.emails);

    // só entrega tem faturamento
    celulas.pagamento =
        celulaTexto(
            "pagamento",
            item.formaPagamento
                ? [
                    item.formaPagamento,
                    item.prazosPagamento.length
                        ? `${item.prazosPagamento.join("/")} DD`
                        : ""
                ].filter(Boolean).join(" – ")
                : ""
        );

    celulas.pedido =
        celulaTexto(
            "pedido",
            item.pedidoCompra
                ? (item.pedidoNumero || "Sim")
                : ""
        );

    celulas.vendedor = celulaTexto("vendedor", item.vendedor);

    // ---------- proposta ----------

    celulas.proposta = celulaTexto("proposta", textoPropostasAgendamento(item));

    celulas.proposta.classList.add("ag-proposta");

    // no celular a linha vira um cartão e cada informação ganha o nome da
    // coluna na frente (agenda-celular.css)
    return colunas.map(coluna => {

        const celulaDaColuna = celulas[coluna.id];

        celulaDaColuna.dataset.coluna = coluna.id;

        celulaDaColuna.dataset.rotulo = coluna.titulo;

        return celulaDaColuna;
    });
}
