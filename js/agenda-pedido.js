// ======================================
// AGENDA - PEDIDO DE COMPRA
// ======================================
// Pedido de compra (sim/não), número e PDF do pedido, no formulário da
// entrega: controles, anexar/apagar e leitura na hora de salvar. O envio
// do PDF para o Supabase fica em agenda-pedido-pdf.js. Precisa vir
// carregado DEPOIS de agenda-pagamento.js e antes de agenda-init.js.

const LIMITE_PDF_PEDIDO = 5 * 1024 * 1024;

// estado do PDF no formulário:
// salvo = PDF que já está gravado { caminho, nome }
// novo = arquivo escolhido, ainda não enviado (vai ao clicar em Salvar)
// removido = o PDF salvo foi apagado (vale ao clicar em Salvar)
let pedidoPdf = { salvo: null, novo: null, removido: false };

// o que fazer com os PDFs depois de gravar o agendamento
// (apagar = caminho antigo; enviar = arquivo novo)
let pendenciaPdf = { apagar: "", enviar: null };


function pedidoTemPdf(){

    return (
        !!pedidoPdf.novo ||
        (!!pedidoPdf.salvo && !pedidoPdf.removido)
    );
}


// mostra/esconde o número e o PDF; com PDF anexado, trava o "Sim"
// (pra voltar pro "Não" tem que apagar o PDF antes)
function atualizarControlesPedido(){

    const sim = $("agPedidoCompra").value === "sim";

    $("blocoPedido").style.display = sim ? "" : "none";

    const temPdf = pedidoTemPdf();

    $("agPedidoCompra").disabled = temPdf;

    $("agPedidoCompra").title =
        temPdf ? "Apague o PDF para voltar para Não" : "";

    $("agPedidoNumero").placeholder =
        temPdf
            ? "Opcional (o PDF está anexado)"
            : "Obrigatório se não anexar o PDF";

    // linha do PDF anexado
    const nome =
        pedidoPdf.novo
            ? pedidoPdf.novo.name
            : (temPdf ? pedidoPdf.salvo.nome : "");

    $("linhaPedidoPdf").style.display = temPdf ? "" : "none";

    $("nomePedidoPdf").innerText =
        temPdf
            ? `📎 ${nome}${pedidoPdf.novo ? " (será enviado ao salvar)" : ""}`
            : "";

    // só dá pra abrir o que já está salvo
    $("btnAbrirPedidoPdf").style.display =
        (temPdf && !pedidoPdf.novo) ? "" : "none";

    // só anexa quando não tem PDF
    $("campoPedidoPdf").style.display = temPdf ? "none" : "";

    $("avisoPedidoPdf").innerText =
        (pedidoPdf.removido && !pedidoPdf.novo)
            ? "O PDF será apagado ao salvar."
            : "";
}


// fonte = agendamento salvo; guardado = parte do rascunho (vale no lugar)
function preencherPedido(fonte, guardado){

    const sim =
        guardado
            ? !!guardado.pedido
            : !!(fonte && fonte.pedidoCompra);

    $("agPedidoCompra").value = sim ? "sim" : "nao";

    $("agPedidoNumero").value =
        guardado
            ? (guardado.numero || "")
            : (fonte && fonte.pedidoNumero ? fonte.pedidoNumero : "");

    $("arquivoPedidoPdf").value = "";

    pedidoPdf = {
        salvo:
            (fonte && fonte.pedidoPdfCaminho)
                ? { caminho: fonte.pedidoPdfCaminho, nome: fonte.pedidoPdfNome || "pedido.pdf" }
                : null,
        novo: null,
        removido: guardado ? !!guardado.pdfRemovido : false
    };

    pendenciaPdf = { apagar: "", enviar: null };

    atualizarControlesPedido();
}


// ======================================
// ANEXAR, ABRIR E APAGAR
// ======================================

function anexarPedidoPdf(arquivo){

    if(!arquivo) return;

    if(
        !/\.pdf$/i.test(arquivo.name) ||
        (arquivo.type && arquivo.type !== "application/pdf")
    ){
        return mostrarToast("Só arquivos PDF", true);
    }

    if(arquivo.size > LIMITE_PDF_PEDIDO){

        return mostrarToast("PDF maior que 5 MB", true);
    }

    pedidoPdf.novo = arquivo;

    atualizarControlesPedido();

    agendarRascunho();
}


function apagarPedidoPdf(){

    // arquivo que ainda não foi enviado: é só descartar
    if(pedidoPdf.novo){

        pedidoPdf.novo = null;

        $("arquivoPedidoPdf").value = "";

    }else{

        if(!confirm("Apagar o PDF do pedido de compra? A exclusão vale quando você clicar em Salvar.")){

            return;
        }

        pedidoPdf.removido = true;
    }

    atualizarControlesPedido();

    agendarRascunho();
}


// ======================================
// SALVAR (junto com o agendamento)
// ======================================

// { dados } ou { erro }. Também guarda em pendenciaPdf o que precisa ser
// enviado/apagado do Storage depois que o agendamento for gravado.
function lerPedidoFormulario(){

    const sim = $("agPedidoCompra").value === "sim";

    const numero =
        sim
            ? $("agPedidoNumero").value.trim().replace(/\s+/g, " ")
            : "";

    // com o PDF anexado o número é opcional
    if(sim && !numero && !pedidoTemPdf()){

        return { erro: "Informe o número do pedido de compra ou anexe o PDF" };
    }

    const salvo = pedidoPdf.salvo;

    const manterSalvo =
        sim && !!salvo && !pedidoPdf.removido && !pedidoPdf.novo;

    pendenciaPdf = {
        apagar: (salvo && !manterSalvo) ? salvo.caminho : "",
        enviar: sim ? pedidoPdf.novo : null
    };

    return {
        dados: {
            pedidoCompra: sim,
            pedidoNumero: numero,
            // o PDF novo só entra depois do envio (o caminho usa o id)
            pedidoPdfCaminho: manterSalvo ? salvo.caminho : "",
            pedidoPdfNome: manterSalvo ? salvo.nome : ""
        }
    };
}


// tipo que não é entrega: apaga o PDF que existir
function limparPedidoParaSalvar(){

    pendenciaPdf = {
        apagar: pedidoPdf.salvo ? pedidoPdf.salvo.caminho : "",
        enviar: null
    };
}


// ======================================
// LIGAÇÕES
// ======================================

(function iniciarPedido(){

    $("agPedidoCompra").addEventListener(
        "change",
        atualizarControlesPedido
    );

    $("arquivoPedidoPdf").addEventListener(
        "change",
        () => {

            anexarPedidoPdf($("arquivoPedidoPdf").files[0]);

            // permite escolher o mesmo arquivo de novo depois
            $("arquivoPedidoPdf").value = "";
        }
    );

    $("btnApagarPedidoPdf").addEventListener("click", apagarPedidoPdf);

    $("btnAbrirPedidoPdf").addEventListener("click", () => abrirPedidoPdf());

})();
