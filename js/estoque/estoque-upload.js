// ======================================
// ESTOQUE - UPLOAD E PUBLICAÇÃO
// ======================================
// Ler o Excel, prévia e publicar.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// UPLOAD (lê o Excel e mostra a prévia)
// ======================================

async function lerArquivo(evento){

    const arquivo = evento.target.files[0];

    // permite escolher o mesmo arquivo de novo depois
    evento.target.value = "";

    if(!arquivo) return;

    try{

        const buffer = await arquivo.arrayBuffer();

        const planilha =
            XLSX.read(buffer, { type: "array" });

        const aba =
            planilha.Sheets[planilha.SheetNames[0]];

        const linhas =
            XLSX.utils.sheet_to_json(
                aba,
                { header: 1, raw: true, defval: "" }
            );

        previaAtual =
            resumirEstoque(linhas, arquivo.name);

    }catch(erro){

        console.error("[estoque] Falha ao ler arquivo:", erro);

        return mostrarToast(
            erro.message || "Não foi possível ler o arquivo",
            true
        );
    }

    $("estoqueAtualizado").innerText =
        "PRÉVIA, ainda não publicada";

    $("textoPrevia").innerText =
        `Arquivo: ${previaAtual.arquivo}. Será publicado no estoque de ${FILIAIS[filialAtual].nome}. Confira os números e clique em Publicar para todos verem (substitui o resumo atual).`;

    $("faixaPrevia").classList.remove("oculto");

    desenharResumo(previaAtual);

    mostrarAvisosEstoque(previaAtual.avisos);
}


function cancelarPrevia(){

    mostrarPublicado();
}


// ======================================
// PUBLICAR (sobrescreve o resumo)
// ======================================

async function publicarResumo(){

    if(!previaAtual) return;

    const botao = $("btnPublicar");

    botao.disabled = true;

    const filial = filialAtual;

    try{

        const { data: sessao } =
            await supabaseClient.auth.getSession();

        const email =
            sessao?.session?.user?.email || "";

        const { data, error } =
            await supabaseClient
                .from("resumo_estoque")
                .upsert(
                    {
                        id: FILIAIS[filial].id,
                        dados: previaAtual,
                        atualizado_por: email
                    },
                    { onConflict: "id" }
                )
                .select("dados, atualizado_em, atualizado_por")
                .single();

        if(error) throw error;

        resumoPublicado = data;

        mostrarPublicado();

        mostrarToast(`Resumo publicado (${FILIAIS[filial].nome})`);

    }catch(erro){

        console.error("[estoque] Falha ao publicar:", erro);

        mostrarToast("Erro ao publicar o resumo", true);

    }finally{

        botao.disabled = false;
    }
}
