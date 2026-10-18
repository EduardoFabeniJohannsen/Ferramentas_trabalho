// ======================================
// ESTOQUE - INIT
// ======================================
// Ligações iniciais. Sempre o ÚLTIMO script da página.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// INIT
// ======================================

(async function init(){

    // filiais que o usuário pode ver (tabela "perfis")
    await carregarPerfil();

    const liberadas =
        Object.keys(FILIAIS).filter(chave => temFilial(chave));

    if(!liberadas.length){

        $("estoqueAtualizado").innerText =
            "Sem acesso a nenhuma filial do estoque. Fale com o administrador.";

        document.querySelector(".troca-filial").style.display = "none";

        document.querySelector(".barra-upload").style.display = "none";

        return;
    }

    try{

        const salva =
            localStorage.getItem(CHAVE_FILIAL_ESTOQUE);

        if(FILIAIS[salva]) filialAtual = salva;

    }catch(erro){

        filialAtual = "ITAJAI";
    }

    // filial salva (ou padrão) sem acesso: usa a primeira liberada
    if(!liberadas.includes(filialAtual)) filialAtual = liberadas[0];

    // esconde o botão das filiais sem acesso (e a troca, se sobrou só uma)
    document.querySelectorAll(".btn-filial").forEach(botao => {

        if(!liberadas.includes(botao.dataset.filial)){

            botao.style.display = "none";
        }
    });

    if(liberadas.length === 1){

        document.querySelector(".troca-filial").style.display = "none";
    }

    atualizarFilialNaTela();

    $("btnEnviarEstoque").addEventListener(
        "click",
        () => $("arquivoEstoque").click()
    );

    $("arquivoEstoque").addEventListener(
        "change",
        lerArquivo
    );

    await carregarResumoPublicado(false);

    // ao voltar pra aba, puxa o resumo mais novo de quem publicou
    document.addEventListener(
        "visibilitychange",
        () => {

            if(!document.hidden && !previaAtual){

                carregarResumoPublicado(true);
            }
        }
    );

})();
