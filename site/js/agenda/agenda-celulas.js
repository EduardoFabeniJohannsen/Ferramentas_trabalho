// ======================================
// AGENDA - CÉLULAS DA LINHA
// ======================================
// Monta o conteúdo de cada coluna de um agendamento.

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

    const textoHorario = item.horario || "—";

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

    // ---------- tipo ----------

    const tagTipo = criar("span", "tag", rotuloTipo(item.tipo));

    tagTipo.dataset.tipo = item.tipo;

    celulas.tipo = celula("tipo", tagTipo);

    // ---------- plataforma / cliente ----------
    // troca técnica mostra as duas máquinas: a que vai e a que volta

    const titulo = criar("p", "ag-titulo");

    titulo.appendChild(criarMaquina(item.plataforma));

    if(item.tipo === "Troca técnica" && item.plataformaRecolha){

        titulo.appendChild(criar("span", "", " ⇄ "));

        titulo.appendChild(criarMaquina(item.plataformaRecolha));
    }

    if(item.cliente){

        titulo.appendChild(criar("span", "", ` — ${item.cliente}`));
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

    // entrega e troca saem da W Rental e coleta volta pra ela,
    // quando o local fica vazio
    let origemNome = item.origemNome;

    if(
        !origemNome &&
        !item.origemEndereco &&
        (item.tipo === "Entrega" || item.tipo === "Troca técnica")
    ){
        origemNome = LOCAL_PADRAO;
    }

    let destinoNome = item.destinoNome;

    if(
        !destinoNome &&
        !item.destinoEndereco &&
        item.tipo === "Coleta"
    ){
        destinoNome = LOCAL_PADRAO;
    }

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

    celulas.contato = celulaTexto("contato", item.contato);

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

    celulas.proposta = celulaTexto("proposta", item.proposta);

    celulas.proposta.classList.add("ag-proposta");

    return colunas.map(coluna => celulas[coluna.id]);
}
