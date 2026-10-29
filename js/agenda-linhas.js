// ======================================
// AGENDA - LINHAS E CÉLULAS
// ======================================
// Montagem de cada linha/célula da tabela, cabeçalho e seletor de status.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// local de entrega/retirada: nome e endereço completo na mesma linha
// (pra gastar pouca altura) e o link embaixo, se tiver
function criarBlocoLocal(nome, endereco, link){

    const bloco = criar("div", "ag-local");

    if(nome || endereco){

        const linha = criar("p", "ag-local-linha");

        if(nome){

            linha.appendChild(criar("strong", "ag-local-texto", nome));
        }

        if(nome && endereco){

            linha.appendChild(criar("span", "", " — "));
        }

        if(endereco){

            linha.appendChild(criar("span", "ag-local-endereco", endereco));
        }

        bloco.appendChild(linha);
    }

    if(link){

        const enderecoLink = criar("a", "ag-link", link);

        // sem http no começo, o navegador trataria como página do próprio sistema
        enderecoLink.href =
            /^https?:\/\//i.test(link)
                ? link
                : "https://" + link;

        enderecoLink.target = "_blank";

        enderecoLink.rel = "noopener";

        bloco.appendChild(enderecoLink);
    }

    return bloco;
}


// o status é uma etiqueta colorida que também troca o status ao clicar
function criarSeletorStatus(item){

    const select = criar("select", "tag tag-select");

    select.dataset.status = item.status;

    select.title = "Trocar status";

    STATUS_AGENDA.forEach(nome => {

        const opcao = criar("option", "", nome);

        opcao.value = nome;

        select.appendChild(opcao);
    });

    select.value = item.status;

    select.addEventListener(
        "change",
        async () => {

            try{

                const atualizado =
                    await atualizarAgendamento(
                        item.id,
                        { status: select.value }
                    );

                Object.assign(item, atualizado);

            }catch(erro){

                console.error("[agenda] Falha ao trocar status:", detalhesErro(erro));

                mostrarToast("Erro ao salvar o status", true);
            }

            // se falhou, a tela volta pro status que está salvo
            renderizarAgenda();
        }
    );

    return select;
}


// cada informação vai numa célula (coluna) própria; a ordem final
// vem de colunasAtuais(). coluna = { maxLargura, semQuebra } (ver COLUNAS_*).
function criarCelula(coluna, ...filhos){

    const celula =
        criar(
            "td",
            "ag-celula" + (coluna.semQuebra ? " ag-sem-quebra" : "")
        );

    const conteudo = criar("div", "ag-conteudo");

    if(coluna.maxLargura) conteudo.style.maxWidth = coluna.maxLargura;

    filhos.forEach(filho => {

        if(filho) conteudo.appendChild(filho);
    });

    celula.appendChild(conteudo);

    return celula;
}


// patrimônio em negrito. Só o modelo (ex: WAE15) = patrimônio ainda não
// definido: fica em destaque (fundo amarelo e aviso) pra manutenção ver
// quais máquinas faltam.
function criarMaquina(patrimonio){

    const maquina = criar("span", "ag-maquina");

    const texto = criar("strong", "ag-patrimonio", patrimonio);

    maquina.appendChild(texto);

    if(patrimonioIncompleto(patrimonio)){

        texto.classList.add("ag-patr-incompleto");

        texto.title = "Patrimônio ainda não definido (só o modelo)";

        maquina.appendChild(
            criar("span", "ag-patr-aviso", "definir patrimônio")
        );
    }

    return maquina;
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

    const tagTipo = criar("span", "tag", item.tipo);

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

    // ---------- transportador: local e frete ----------
    // (a expedição não mostra local nem valor)

    if(!expedicao){

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
    }

    return colunas.map(coluna => celulas[coluna.id]);
}


// linha de títulos das colunas (aparece uma vez, no topo da lista)
function criarCabecalhoAgenda(){

    const cabecalho = criar("thead");

    const linha = criar("tr");

    colunasAtuais().forEach(coluna => {

        linha.appendChild(criarTituloColuna(coluna));
    });

    // à direita do traço de corte do print: proposta e botões
    linha.appendChild(criar("th", "ag-cab-proposta", "Proposta"));

    linha.appendChild(criar("th", "ag-cab-lado"));

    cabecalho.appendChild(linha);

    return cabecalho;
}


function criarItemAgenda(item){

    const linha = criar("tr", "ag-item");

    linha.dataset.tipo = item.tipo;

    linha.dataset.status = item.status;

    // ---------- conteúdo (a parte do print) ----------

    criarCelulasAgenda(item).forEach(celula => {

        linha.appendChild(celula);
    });

    // ---------- proposta e controles (fora da área do print) ----------

    linha.appendChild(
        criar("td", "ag-proposta", item.proposta || "")
    );

    const lado = criar("td", "ag-lado");

    const botoes = criar("div", "ag-botoes");

    const botaoZap = criar("button", "btn-zap", "📋");

    botaoZap.type = "button";

    botaoZap.title = "Copiar mensagem para o Zap";

    botaoZap.addEventListener(
        "click",
        () => copiarAgendamentoZap(item)
    );

    botoes.appendChild(botaoZap);

    // faturamento (forma, prazo e e-mails): só entrega tem. Nos outros
    // tipos fica invisível, pra manter os botões alinhados.
    const botaoFaturamento = criar("button", "btn-faturamento", "🧾");

    botaoFaturamento.type = "button";

    if(item.tipo === "Entrega"){

        botaoFaturamento.title = "Copiar faturamento (pagamento, prazo e e-mails)";

        botaoFaturamento.addEventListener(
            "click",
            () => copiarFaturamento(item)
        );

    }else{

        botaoFaturamento.style.visibility = "hidden";

        botaoFaturamento.tabIndex = -1;
    }

    botoes.appendChild(botaoFaturamento);

    // entrega: cria uma coleta a partir dela. Nos outros tipos fica um
    // botão invisível, só pra os botões da direita ficarem alinhados.
    const botaoColeta = criar("button", "btn-coleta", "↩️");

    botaoColeta.type = "button";

    if(item.tipo === "Entrega"){

        botaoColeta.title = "Criar uma coleta a partir desta entrega";

        botaoColeta.addEventListener(
            "click",
            () => copiarEntregaParaColeta(item)
        );

    }else{

        botaoColeta.style.visibility = "hidden";

        botaoColeta.tabIndex = -1;
    }

    botoes.appendChild(botaoColeta);

    const botaoEditar = criar("button", "", "✏️");

    botaoEditar.type = "button";

    botaoEditar.title = "Editar";

    botaoEditar.addEventListener(
        "click",
        () => abrirModalAgenda(item.id)
    );

    botoes.appendChild(botaoEditar);

    const botaoExcluir = criar("button", "btn-secundario btn-excluir-ag", "🗑️");

    botaoExcluir.type = "button";

    botaoExcluir.title = "Excluir";

    botaoExcluir.addEventListener(
        "click",
        () => excluirAgendamento(item.id)
    );

    botoes.appendChild(botaoExcluir);

    lado.appendChild(botoes);

    linha.appendChild(lado);

    return linha;
}
