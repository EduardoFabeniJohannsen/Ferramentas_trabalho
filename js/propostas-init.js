// ======================================
// PROPOSTAS - INIT
// ======================================
// Carrega tabelas e liga eventos. Sempre o ÚLTIMO script da página.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// INIT
// ======================================

(async function init(){

    // ==================================
    // CARREGAR TABELAS (Supabase)
    // ==================================

    await carregarTabela();

    await carregarFretes();

    avisarFalhaCarregamento();


    // ==================================
    // EQUIPAMENTOS
    // ==================================

    configurarEventosEquipamentos();


    // ==================================
    // CACHE (repõe o que tava salvo)
    // ==================================

    restaurarCache();


    // ==================================
    // NOME CLIENTE
    // ==================================

    if($("nomeCliente")){

        $("nomeCliente")
            .addEventListener(
                "input",
                gerarTextos
            );
    }


    // ==================================
    // PERÍODO
    // ==================================

    if($("periodo")){

        $("periodo")
            .addEventListener(
                "input",
                () => {

                    gerarTextos();

                    mostrarFretes();

                }
            );
    }


    // ==================================
    // CIDADE
    // ==================================

    if($("cidade")){

        $("cidade")
            .addEventListener(
                "input",
                () => {

                    gerarTextos();

                    mostrarFretes();

                }
            );
    }


    // ==================================
    // FRETE
    // ==================================

    if($("valorFrete")){

        $("valorFrete")
            .addEventListener(
                "input",
                gerarTextos
            );
    }

})();
