// ======================================
// PROPOSTAS - FORMA DE PAGAMENTO
// ======================================
// Boleto, depósito ou cliente novo e o prazo em dias (⚙️ Configurações), na mensagem da Proposta Zap. Cliente novo sai como Boleto, com o prazo pela regra do financeiro. Sem escolher a forma, sai com o texto padrão de sempre.

const PRAZO_PAGAMENTO_PADRAO = "28";


// ======================================
// CLIENTE NOVO (regra do financeiro)
// ======================================
// Prazo menor para dar mais giro ao caixa: o prazo vem do tamanho da locação
// (total de dias, com os Períodos: 28 + 3 = 84). Para o cliente sai como
// Boleto, igual ao de sempre, só que com esse prazo. Quem já tem prazo
// combinado (indústrias, clientes com fluxo de locação) continua no Boleto
// ou Depósito com o prazo digitado.

const FORMA_CLIENTE_NOVO = "Cliente novo";

// locação de até N dias -> prazo de pagamento em dias
const PRAZOS_CLIENTE_NOVO = [
    { ate: 7, prazo: "6" },
    { ate: 15, prazo: "14" },
    { ate: 21, prazo: "20" },
    { ate: 30, prazo: "28" }
];

// acima de 30 dias (60 dias, 3 períodos de 28...)
const PRAZO_CLIENTE_NOVO_ACIMA = "28";


// o prazo da regra para o período da proposta ("" sem período)
function prazoClienteNovo(){

    const dias = obterPeriodoProposta().diasTotal;

    if(!Number.isFinite(dias) || dias <= 0) return "";

    const faixa = PRAZOS_CLIENTE_NOVO.find(item => dias <= item.ate);

    return faixa ? faixa.prazo : PRAZO_CLIENTE_NOVO_ACIMA;
}


// embaixo da forma de pagamento: o prazo que a regra deu
function atualizarDicaClienteNovo(){

    const dica = $("dicaClienteNovo");

    if(!dica) return;

    const clienteNovo =
        $("formaPagamento").value === FORMA_CLIENTE_NOVO;

    dica.style.display = clienteNovo ? "" : "none";

    if(!clienteNovo) return;

    const prazo = prazoClienteNovo();

    const regra =
        "Até 7 dias de locação: 6 dias; até 15: 14; até 21: 20; até 30 ou mais: 28.";

    dica.innerText =
        prazo
            ? `Prazo de ${prazo} dias (locação de ${obterPeriodoProposta().diasTotal} dias). Na mensagem sai como Boleto. ${regra}`
            : `Informe o período da proposta para calcular o prazo. ${regra}`;
}


// ======================================
// FORMA E PRAZO
// ======================================

// o prazo só aparece depois de escolher a forma (no cliente novo é da regra)
function atualizarCampoPrazo(){

    const forma = $("formaPagamento").value;

    $("prazoPagamento").style.display =
        forma && forma !== FORMA_CLIENTE_NOVO ? "" : "none";

    atualizarDicaClienteNovo();
}


function trocarFormaPagamento(){

    const forma = $("formaPagamento").value;

    // cliente novo não mexe no prazo digitado (fica para quando voltar ao boleto)
    if(forma && forma !== FORMA_CLIENTE_NOVO && !$("prazoPagamento").value.trim()){

        $("prazoPagamento").value = PRAZO_PAGAMENTO_PADRAO;
    }

    atualizarCampoPrazo();

    // o modal fica fora dos cards que salvam sozinhos ao digitar
    salvarCache();
}


// "28", "28/56" ou "28 e 56" -> "28" ou "28/56"; cliente novo: o da regra
function prazoPagamentoTexto(){

    if($("formaPagamento").value === FORMA_CLIENTE_NOVO){

        return prazoClienteNovo();
    }

    return ($("prazoPagamento").value.match(/\d+/g) || []).join("/");
}


function textoFormaPagamento(){

    const forma = $("formaPagamento").value;

    if(!forma){

        return emojisAtivo
            ? "Mediante aprovação cadastral."
            : "28 dias, mediante aprovação cadastral.";
    }

    // cliente novo: para o cliente é um boleto como outro qualquer
    const nome =
        forma === FORMA_CLIENTE_NOVO ? "Boleto" : forma;

    const prazo = prazoPagamentoTexto();

    return (
        `${nome} com emissão no dia seguinte à entrega do equipamento, mediante aprovação cadastral` +
        (prazo ? `, prazo de ${prazo} dias.` : ".")
    );
}
