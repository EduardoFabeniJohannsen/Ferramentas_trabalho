// ======================================
// AGENDA - PEÇAS DAS CÉLULAS
// ======================================
// Bloco de local, seletor de status, célula com a coluna e nome da máquina.

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
