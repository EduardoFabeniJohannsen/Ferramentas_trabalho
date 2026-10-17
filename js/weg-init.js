// ======================================
// WEG - INIT
// ======================================
// Ligações iniciais. Sempre o ÚLTIMO script da página.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// INIT
// ======================================

(function init() {

    montarListaEquipamentos();

    restaurarCacheWEG();

    gerarDocumento();

    // qualquer mudança regera o documento e salva no cache
    const atualizar = () => {

        gerarDocumento();

        salvarCacheWEG();
    };

    document
        .querySelectorAll(".quantidadeEquipamento")
        .forEach((input) => {

            input.addEventListener(
                "input",
                atualizar
            );
        });

    $("dataInicio").addEventListener(
        "input",
        atualizar
    );

    $("valorFrete").addEventListener(
        "input",
        atualizar
    );

    $("periodos").addEventListener(
        "input",
        atualizar
    );

    // períodos inválido (vazio, 0, negativo) volta pra 1 ao sair do campo
    $("periodos").addEventListener(
        "blur",
        () => {

            $("periodos").value = obterPeriodos();

            atualizar();
        }
    );

})();
