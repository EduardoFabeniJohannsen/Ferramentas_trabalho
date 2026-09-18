// ======================================
// PROPOSTAS - INIT
// ======================================
// Ponto de entrada da página propostas.html: carrega os CSVs,
// liga os eventos dos campos e repõe o cache salvo.
//
// IMPORTANTE: esse arquivo chama funções de todos os outros
// scripts da página (propostas-csv.js, propostas-equipamentos.js,
// propostas-cache.js, propostas-agendamento.js, etc.), então ele
// precisa ser sempre o ÚLTIMO <script> carregado no propostas.html.

(async function init(){

    // ==================================
    // CARREGAR CSVs
    // ==================================

    await carregarTabela();

    await carregarFretes();


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


    // ==================================
    // TIPO FRETE
    // ==================================

    configurarTipoFrete();

})();
