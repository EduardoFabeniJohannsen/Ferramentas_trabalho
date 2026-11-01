// ======================================
// TRANSPORTADORAS - DOCUMENTOS (PDF)
// ======================================
// Envio, abertura e exclusão dos PDFs de veículos e motoristas, e o bloco de
// documentos do formulário. Os arquivos ficam no bucket privado (BUCKET_DOCS);
// abrir é sempre por link temporário.
// dono = { tipo: "veiculo" | "motorista", id: número }

function docsDoDono(dono){

    const campo =
        dono.tipo === "veiculo"
            ? "veiculo_id"
            : "motorista_id";

    return docsTransp.filter(doc => doc[campo] === dono.id);
}


// apaga os arquivos do bucket (se falhar só registra: o arquivo fica sem registro)
async function removerArquivosStorage(caminhos){

    if(!caminhos.length) return;

    const { error } =
        await supabaseClient
            .storage
            .from(BUCKET_DOCS)
            .remove(caminhos);

    if(error){

        console.error("[transportadoras] Falha ao apagar PDF:", detalhesErroTransp(error));
    }
}


async function enviarDocumento(dono, rotulo, arquivo){

    // nome sem acento e sem símbolos (o Storage não aceita todos)
    const nomeSeguro =
        semAcento(arquivo.name)
            .replace(/[^a-zA-Z0-9._-]/g, "_");

    const caminho =
        `${dono.tipo}-${dono.id}/${Date.now()}-${nomeSeguro}`;

    const { error: erroEnvio } =
        await supabaseClient
            .storage
            .from(BUCKET_DOCS)
            .upload(
                caminho,
                arquivo,
                { contentType: "application/pdf", upsert: false }
            );

    if(erroEnvio) throw erroEnvio;

    const linha = {
        rotulo: rotulo,
        caminho: caminho,
        nome_original: arquivo.name
    };

    linha[dono.tipo === "veiculo" ? "veiculo_id" : "motorista_id"] = dono.id;

    const { data, error } =
        await supabaseClient
            .from(TRANSP_TABELAS.docs)
            .insert(linha)
            .select()
            .single();

    if(error){

        // não deixa o PDF solto no bucket sem registro
        await removerArquivosStorage([caminho]);

        throw error;
    }

    return data;
}


async function abrirDocumento(doc){

    // abre a aba já no clique (senão o navegador bloqueia o pop-up)
    const janela = window.open("about:blank", "_blank");

    const { data, error } =
        await supabaseClient
            .storage
            .from(BUCKET_DOCS)
            .createSignedUrl(doc.caminho, 120);

    if(error || !data?.signedUrl){

        console.error("[transportadoras] Falha ao abrir PDF:", detalhesErroTransp(error));

        if(janela) janela.close();

        return mostrarToast("Não foi possível abrir o PDF", true);
    }

    if(!janela){

        return mostrarToast("Libere os pop-ups do navegador para abrir o PDF", true);
    }

    janela.location.href = data.signedUrl;
}


async function excluirDocumento(doc, container, dono){

    if(!confirm(`Excluir o documento "${doc.rotulo}"?`)) return;

    const { data, error } =
        await supabaseClient
            .from(TRANSP_TABELAS.docs)
            .delete()
            .eq("id", doc.id)
            .select();

    if(error || !data.length){

        console.error("[transportadoras] Falha ao excluir documento:", detalhesErroTransp(error));

        return mostrarToast("Erro ao excluir o documento", true);
    }

    await removerArquivosStorage([doc.caminho]);

    docsTransp = docsTransp.filter(item => item.id !== doc.id);

    desenharBlocoDocumentos(container, dono);

    desenharListaTransp();

    mostrarToast("Documento excluído");
}


// ======================================
// BLOCO DE DOCUMENTOS (dentro do formulário)
// ======================================

function criarBlocoDocumentos(dono){

    const container = criar("div");

    desenharBlocoDocumentos(container, dono);

    return container;
}


function desenharBlocoDocumentos(container, dono){

    container.innerHTML = "";

    container.className = "docs-transp";

    container.appendChild(
        criar(
            "p",
            "subtitulo-transp",
            "📎 Documentos (PDF, até 5 MB cada)"
        )
    );

    const documentos = docsDoDono(dono);

    if(!documentos.length){

        container.appendChild(
            criar("div", "vazio-transp", "Nenhum documento anexado")
        );
    }

    documentos.forEach(doc => {

        const linha = criar("div", "doc-linha");

        linha.appendChild(criar("strong", "", doc.rotulo));

        linha.appendChild(
            criar("span", "doc-nome", doc.nome_original || "")
        );

        linha.appendChild(
            criarBotao("👁", "Abrir PDF", "btn-secundario", () => abrirDocumento(doc))
        );

        if(!transpSoLeitura){

            linha.appendChild(
                criarBotao(
                    "🗑️",
                    "Excluir documento",
                    "btn-secundario",
                    () => excluirDocumento(doc, container, dono)
                )
            );
        }

        container.appendChild(linha);
    });

    // quem só vê: abre os PDFs, mas não anexa
    if(transpSoLeitura) return;

    // ---------- anexar novo ----------

    const idLista = "listaRotulosDoc";

    const sugestoes = criar("datalist");

    sugestoes.id = idLista;

    ROTULOS_DOC[dono.tipo].forEach(rotulo => {

        const opcao = criar("option");

        opcao.value = rotulo;

        sugestoes.appendChild(opcao);
    });

    container.appendChild(sugestoes);

    const novo = criar("div", "doc-novo");

    const campoRotulo = criar("input");

    campoRotulo.type = "text";

    campoRotulo.placeholder = "Rótulo (ex: " + ROTULOS_DOC[dono.tipo][0] + ")";

    campoRotulo.setAttribute("list", idLista);

    campoRotulo.autocomplete = "off";

    const campoArquivo = criar("input");

    campoArquivo.type = "file";

    campoArquivo.accept = "application/pdf,.pdf";

    const botaoAnexar = criarBotao("📤 Anexar", "", "", async () => {

        const rotulo =
            campoRotulo.value.trim().replace(/\s+/g, " ");

        const arquivo = campoArquivo.files[0];

        if(!rotulo){

            return mostrarToast("Informe o rótulo do documento (ex: CRLV)", true);
        }

        if(!arquivo){

            return mostrarToast("Escolha o arquivo PDF", true);
        }

        if(
            !/\.pdf$/i.test(arquivo.name) ||
            (arquivo.type && arquivo.type !== "application/pdf")
        ){
            return mostrarToast("Só arquivos PDF", true);
        }

        if(arquivo.size > LIMITE_PDF_BYTES){

            return mostrarToast("PDF maior que 5 MB", true);
        }

        botaoAnexar.disabled = true;

        try{

            const doc = await enviarDocumento(dono, rotulo, arquivo);

            docsTransp.push(doc);

            desenharBlocoDocumentos(container, dono);

            desenharListaTransp();

            mostrarToast("Documento anexado");

        }catch(erro){

            console.error("[transportadoras] Falha ao anexar:", detalhesErroTransp(erro));

            botaoAnexar.disabled = false;

            mostrarToast("Erro ao anexar o PDF", true);
        }
    });

    novo.appendChild(campoRotulo);

    novo.appendChild(campoArquivo);

    novo.appendChild(botaoAnexar);

    container.appendChild(novo);
}
