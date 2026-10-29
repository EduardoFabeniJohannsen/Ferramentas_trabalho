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
    // PERÍODOS (quantidade; vazio = 1)
    // ==================================

    if($("periodos")){

        $("periodos")
            .addEventListener(
                "input",
                () => {

                    gerarTextos();

                    mostrarFretes();

                }
            );

        // valor inválido (letra, 0, negativo) é apagado ao
        // sair do campo (vazio = 1 período)
        $("periodos")
            .addEventListener(
                "blur",
                () => {

                    const campo = $("periodos");

                    const numero =
                        parseInt(campo.value, 10);

                    if(
                        campo.value.trim() &&
                        (!Number.isFinite(numero) || numero < 1)
                    ){

                        campo.value = "";

                        gerarTextos();

                        mostrarFretes();

                        salvarCache();
                    }
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

        $("valorFrete")
            .addEventListener(
                "input",
                atualizarResumoComplementar
            );
    }

})();
