// ======================================
// PROPOSTAS - FORMA DE PAGAMENTO
// ======================================
// Boleto ou depósito e o prazo em dias (⚙️ Configurações), na mensagem da
// Proposta Zap. Sem escolher a forma, sai com o texto padrão de sempre.

const PRAZO_PAGAMENTO_PADRAO = "28";


// o prazo só aparece depois de escolher a forma
function atualizarCampoPrazo(){

    $("prazoPagamento").style.display =
        $("formaPagamento").value ? "" : "none";
}


function trocarFormaPagamento(){

    if($("formaPagamento").value && !$("prazoPagamento").value.trim()){

        $("prazoPagamento").value = PRAZO_PAGAMENTO_PADRAO;
    }

    atualizarCampoPrazo();

    // o modal fica fora dos cards que salvam sozinhos ao digitar
    salvarCache();
}


// "28", "28/56" ou "28 e 56" -> "28" ou "28/56"
function prazoPagamentoTexto(){

    return ($("prazoPagamento").value.match(/\d+/g) || []).join("/");
}


function textoFormaPagamento(){

    const forma = $("formaPagamento").value;

    if(!forma){

        return emojisAtivo
            ? "Mediante aprovação cadastral."
            : "28 dias, mediante aprovação cadastral.";
    }

    const prazo = prazoPagamentoTexto();

    return (
        `${forma} com emissão no dia seguinte à entrega do equipamento, mediante aprovação cadastral` +
        (prazo ? `, prazo de ${prazo} dias.` : ".")
    );
}
