// ======================================
// AGENDA - PAGAMENTO (FATURAMENTO)
// ======================================
// Forma de pagamento e prazos do formulário (uma linha por vencimento, em
// dias: 28 numa linha e 56 na outra = 28/56). Só as entregas têm essas
// informações: é pra quem fatura saber onde procurar. O pedido de compra
// fica em agenda-pedido.js. Carregar depois de agenda-coleta.js e antes de agenda-init.js.

// ======================================
// PRAZOS (linhas de vencimento)
// ======================================

// linhas de prazo do formulário (só números, em texto)
let prazosFormulario = [""];


// prazos digitados, sem as linhas vazias
function prazosDigitados(){

    return prazosFormulario
        .map(valor => String(valor || "").trim())
        .filter(Boolean);
}


// 28/56
function atualizarResumoPrazos(){

    const dias = prazosDigitados();

    $("resumoPrazos").innerText =
        dias.length
            ? `Prazo: ${dias.join("/")} dias`
            : "";
}


function desenharPrazos(){

    const lista = $("listaPrazos");

    lista.innerHTML = "";

    prazosFormulario.forEach((valor, indice) => {

        const linha = criar("div", "prazo-linha");

        linha.appendChild(criar("span", "prazo-rotulo", `Prazo ${indice + 1}`));

        const campo = criar("input");

        campo.type = "text";

        campo.inputMode = "numeric";

        campo.maxLength = 3;

        campo.autocomplete = "off";

        campo.placeholder = "dias";

        campo.value = valor;

        campo.addEventListener(
            "input",
            () => {

                const limpo =
                    campo.value.replace(/\D/g, "").slice(0, 3);

                if(campo.value !== limpo) campo.value = limpo;

                prazosFormulario[indice] = limpo;

                atualizarResumoPrazos();
            }
        );

        linha.appendChild(campo);

        linha.appendChild(criar("span", "prazo-unidade", "dias"));

        // sempre sobra pelo menos uma linha
        if(prazosFormulario.length > 1){

            const remover = criar("button", "btn-secundario", "×");

            remover.type = "button";

            remover.title = "Remover este prazo";

            remover.addEventListener(
                "click",
                () => {

                    prazosFormulario.splice(indice, 1);

                    desenharPrazos();

                    agendarRascunho();
                }
            );

            linha.appendChild(remover);
        }

        lista.appendChild(linha);
    });

    atualizarResumoPrazos();
}


// + Adicionar prazo: mais uma linha de vencimento (parcela)
function adicionarPrazo(){

    prazosFormulario.push("");

    desenharPrazos();

    const linhas = $("listaPrazos").children;

    const ultima = linhas[linhas.length - 1];

    // o campo de dias é o 2º item da linha (depois do rótulo)
    if(ultima && ultima.children[1]) ultima.children[1].focus();

    agendarRascunho();
}


// { prazos: [28, 56] } ou { erro }
function validarPrazos(){

    const numeros = prazosDigitados().map(Number);

    if(numeros.some(n => !Number.isInteger(n) || n < 1 || n > 999)){

        return { erro: "Prazo inválido (use só o número de dias, de 1 a 999)" };
    }

    return { prazos: numeros };
}


// ======================================
// BLOCO DE FATURAMENTO NO FORMULÁRIO
// ======================================

// a etapa Faturamento só existe nas entregas (a coleta, a transferência e
// a troca não têm)
function atualizarBlocoFaturamento(){

    document.querySelector(".etapa-faturamento").style.display =
        $("agTipo").value === "Entrega" ? "" : "none";
}


// fonte = agendamento salvo (ou valores iniciais); rascunho = rascunho
// guardado do formulário (vale no lugar da fonte)
function preencherFaturamento(fonte, rascunho){

    const guardado = rascunho ? rascunho.faturamento : null;

    $("agFormaPagamento").value =
        guardado
            ? (guardado.forma || "")
            : (fonte && fonte.formaPagamento ? fonte.formaPagamento : "");

    const prazos =
        guardado
            ? (guardado.prazos || [])
            : (fonte && Array.isArray(fonte.prazosPagamento)
                ? fonte.prazosPagamento.map(String)
                : []);

    prazosFormulario = prazos.length ? prazos.slice() : [""];

    desenharPrazos();

    preencherPedido(fonte, guardado);

    // o bloco só aparece em entrega
    atualizarBlocoFaturamento();
}


// o que o rascunho guarda deste bloco (o PDF novo não entra: arquivo não
// cabe no navegador; só se o PDF já salvo foi apagado)
function faturamentoParaRascunho(){

    return {
        forma: $("agFormaPagamento").value,
        prazos: prazosFormulario.slice(),
        pedido: $("agPedidoCompra").value === "sim",
        numero: $("agPedidoNumero").value,
        pdfRemovido: pedidoPdf.removido
    };
}


// tem alguma informação de faturamento no formulário?
function faturamentoPreenchido(){

    return (
        $("agFormaPagamento").value !== "" ||
        prazosDigitados().length > 0 ||
        $("agPedidoCompra").value === "sim" ||
        pedidoTemPdf() ||
        !!pedidoPdf.salvo
    );
}


// Reúne o faturamento pra salvar. Devolve { dados }, { erro } ou
// { cancelado }. Só entrega tem faturamento: em outro tipo, o que
// houver é apagado (depois de perguntar).
function coletarFaturamento(tipo){

    const vazio = {
        formaPagamento: "",
        prazosPagamento: [],
        pedidoCompra: false,
        pedidoNumero: "",
        pedidoPdfCaminho: "",
        pedidoPdfNome: ""
    };

    if(tipo !== "Entrega"){

        if(
            faturamentoPreenchido() &&
            !confirm(
                "Só entregas têm faturamento (pagamento e pedido de compra). " +
                "O que está preenchido aqui será apagado ao salvar. Continuar?"
            )
        ){
            return { cancelado: true };
        }

        limparPedidoParaSalvar();

        return { dados: vazio };
    }

    const prazos = validarPrazos();

    if(prazos.erro) return { erro: prazos.erro };

    const pedido = lerPedidoFormulario();

    if(pedido.erro) return { erro: pedido.erro };

    return {
        dados: {
            formaPagamento: $("agFormaPagamento").value,
            prazosPagamento: prazos.prazos,
            ...pedido.dados
        }
    };
}


// ======================================
// LIGAÇÕES
// ======================================

(function iniciarPagamento(){

    $("btnAddPrazo").addEventListener("click", adicionarPrazo);

    // trocou o tipo: o bloco aparece só em entrega
    $("agTipo").addEventListener("change", atualizarBlocoFaturamento);

})();
