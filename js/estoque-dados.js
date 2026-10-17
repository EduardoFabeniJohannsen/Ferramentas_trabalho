// ======================================
// ESTOQUE - SUPABASE E FILIAL
// ======================================
// Carregar resumo publicado e trocar de filial.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// CARREGAR RESUMO PUBLICADO (Supabase)
// ======================================

async function carregarResumoPublicado(silencioso){

    const filial = filialAtual;

    const { data, error } =
        await supabaseClient
            .from("resumo_estoque")
            .select("dados, atualizado_em, atualizado_por")
            .eq("id", FILIAIS[filial].id)
            .maybeSingle();

    // trocou de filial enquanto carregava: descarta esta resposta
    if(filial !== filialAtual) return;

    if(error){

        console.error("[estoque] Falha ao carregar:", error);

        if(!silencioso){

            $("estoqueAtualizado").innerText =
                "Não foi possível carregar o resumo (verifique conexão/login).";

            mostrarToast("Falha ao carregar o resumo", true);
        }

        return;
    }

    resumoPublicado = data;

    // não troca a tela se tem uma prévia aberta
    if(!previaAtual) mostrarPublicado();
}


// ======================================
// FILIAL (switch Itajaí / Joinville)
// ======================================

function atualizarFilialNaTela(){

    document.querySelectorAll(".btn-filial").forEach(botao => {

        botao.classList.toggle(
            "ativo",
            botao.dataset.filial === filialAtual
        );
    });

    $("tituloEstoque").innerText =
        `Estoque de plataformas - ${FILIAIS[filialAtual].nome}`;
}


function trocarFilial(chave){

    if(!FILIAIS[chave] || chave === filialAtual) return;

    // prévia aberta é da filial atual: não deixa misturar
    if(previaAtual){

        return mostrarToast(
            "Publique ou cancele a prévia antes de trocar de filial",
            true
        );
    }

    filialAtual = chave;

    try{

        localStorage.setItem(CHAVE_FILIAL_ESTOQUE, chave);

    }catch(erro){

        console.error("[estoque] Erro ao salvar filial:", erro);
    }

    resumoPublicado = null;

    atualizarFilialNaTela();

    $("estoqueAtualizado").innerText = "Carregando...";

    $("resumoEstoque").innerHTML = "";

    mostrarAvisosEstoque([]);

    carregarResumoPublicado(false);
}
