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

    // sem nada salvo, a forma é a do HTML (Cliente novo): mostra a dica do prazo
    atualizarCampoPrazo();


    // ==================================
    // VEIO DA PÁGINA DE LEADS
    // ==================================
    // propostas.html?cliente=X&cidade=Y. Vem depois do cache pra valer sobre
    // ele, e limpa o endereço pra um F5 não apagar o que for digitado depois.

    const parametros =
        new URLSearchParams(window.location.search);

    if(parametros.has("cliente") || parametros.has("cidade")){

        if(parametros.has("cliente")){

            $("nomeCliente").value = parametros.get("cliente");
        }

        if(parametros.has("cidade")){

            $("cidade").value = parametros.get("cidade");
        }

        gerarTextos();

        mostrarFretes();

        salvarCache();

        history.replaceState(null, "", window.location.pathname);
    }


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

        // gerarTextos refaz o Calcular Desconto e o Resumo da proposta
        $("valorFrete")
            .addEventListener(
                "input",
                gerarTextos
            );
    }


    // frete bonificado: muda a locação complementar, o Total com seguro e o Resumo
    if($("freteBonificado")){

        $("freteBonificado")
            .addEventListener(
                "change",
                gerarTextos
            );
    }

})();
