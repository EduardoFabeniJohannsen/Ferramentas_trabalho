// ======================================
// ESTOQUE - INIT
// ======================================
// Ligações iniciais. Sempre o ÚLTIMO script da página.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// INIT
// ======================================

(async function init(){

    try{

        const salva =
            localStorage.getItem(CHAVE_FILIAL_ESTOQUE);

        if(FILIAIS[salva]) filialAtual = salva;

    }catch(erro){

        filialAtual = "ITAJAI";
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

    // busca por modelo: redesenha a tela com o que já está carregado
    $("buscaModelo").addEventListener(
        "input",
        () => {

            if(dadosExibidos && $("resumoEstoque").innerHTML){

                desenharResumo(dadosExibidos);
            }
        }
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
