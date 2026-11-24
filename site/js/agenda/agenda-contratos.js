// ======================================
// AGENDA - OUTROS CONTRATOS (coleta)
// ======================================
// Coleta de mais de uma proposta no mesmo lugar: 1 cliente com 2 contratos, ou 2 clientes. O primeiro contrato são os campos de sempre (Cliente, Nº da proposta, Período); cada outro é uma linha (cliente, proposta, período), guardada no campo escondido agOutrosContratos e na coluna outros_contratos (lista). As máquinas continuam numa lista só. Na mensagem do Zap vai uma referência por contrato; na lista, os clientes juntos ("Alfa + Beta") e as propostas ("712804 / 713000"). Só na coleta: em outro tipo o bloco some e não conta.

const TIPO_COM_OUTROS_CONTRATOS = "Coleta";


// { cliente, proposta, periodo } sem espaços sobrando
function contratoLimpo(contrato){

    return {
        cliente: String(contrato?.cliente || "").trim().replace(/\s+/g, " "),
        proposta: String(contrato?.proposta || "").trim(),
        periodo: String(contrato?.periodo || "").trim()
    };
}


// do banco (lista) ou do campo escondido (texto JSON); a linha toda em branco
// só fica com manterVazias (o formulário e o rascunho)
function listaOutrosContratos(valor, manterVazias = false){

    let lista = valor;

    if(typeof valor === "string"){

        try{

            lista = JSON.parse(valor || "[]");

        }catch(erro){

            lista = [];
        }
    }

    return (Array.isArray(lista) ? lista : [])
        .map(contratoLimpo)
        .filter(contrato => manterVazias || contrato.cliente || contrato.proposta || contrato.periodo);
}


// o primeiro (os campos de sempre) e os outros; fora da coleta, só o primeiro.
// Entrega/coleta: o da entrega e o da coleta (se tiver proposta ou período;
// contratoDaColeta em agenda-entrega-coleta.js)
function contratosDoAgendamento(item){

    if(item.tipo === TIPO_ENTREGA_COLETA){

        const coleta = contratoDaColeta(item);

        return coleta.proposta || coleta.periodo ? [contratoLimpo(item), coleta] : [contratoLimpo(item)];
    }

    const outros =
        item.tipo === TIPO_COM_OUTROS_CONTRATOS
            ? listaOutrosContratos(item.outrosContratos)
            : [];

    return [contratoLimpo(item), ...outros];
}


// "Construtora Alfa" ou "Alfa + Beta" (o mesmo cliente aparece uma vez só)
function textoClientesAgendamento(item){

    const nomes = [];

    contratosDoAgendamento(item).forEach(({ cliente }) => {

        const repetido =
            nomes.some(nome => semAcentoMinusculo(nome) === semAcentoMinusculo(cliente));

        if(cliente && !repetido) nomes.push(cliente);
    });

    return nomes.join(" + ");
}


// "712804" ou "712804 / 713000"
function textoPropostasAgendamento(item){

    return contratosDoAgendamento(item)
        .map(contrato => contrato.proposta)
        .filter(Boolean)
        .join(" / ");
}


// ======================================
// MENSAGEM DO ZAP: UMA REFERÊNCIA POR CONTRATO
// ======================================
// Um contrato só: a referência de sempre (referenciaZap, agenda-zap.js). Com
// mais, as máquinas não são de um contrato só: cada linha sai sem o modelo,
// CLIENTE_PERÍODO - Proposta: N. A referência digitada à mão vale para o
// primeiro contrato.

function referenciasZap(item){

    // entrega/coleta: sempre as duas, a da entrega e a da coleta (agenda-entrega-coleta.js)
    if(item.tipo === TIPO_ENTREGA_COLETA) return [referenciaZap(item), referenciaColetaZap(item)];

    const contratos = contratosDoAgendamento(item);

    if(contratos.length === 1) return [referenciaZap(item)];

    return contratos.map((contrato, indice) =>
        referenciaZap({
            ...contrato,
            tipo: item.tipo,
            plataforma: "",
            referencia: indice === 0 ? item.referencia : ""
        })
    );
}


// ======================================
// FORMULÁRIO
// ======================================
// As linhas são só a tela: o que vale (salvar, rascunho) é o campo escondido
// agOutrosContratos, em JSON. Carregar antes de agenda-modal.js.

function criarCampoContrato(classe, valor, dica, lista){

    const campo = criar("input", classe);

    campo.type = "text";

    campo.autocomplete = "off";

    campo.placeholder = dica;

    campo.title = dica;

    campo.value = valor;

    if(lista) campo.setAttribute("list", lista);

    return campo;
}


function criarLinhaContrato(contrato, numero){

    const linha = criar("div", "ag-contrato-linha");

    const remover = criar("button", "btn-secundario", "−");

    remover.type = "button";

    remover.title = "Tirar este contrato";

    remover.addEventListener("click", () => removerLinhaContrato(linha));

    linha.append(
        criar("span", "ag-contrato-numero", String(numero)),
        criarCampoContrato("ag-contrato-cliente", contrato.cliente, "Cliente", "listaClientesAgenda"),
        criarCampoContrato("ag-contrato-proposta", contrato.proposta, "Proposta"),
        criarCampoContrato("ag-contrato-periodo", contrato.periodo, "Período", "listaPeriodos"),
        remover
    );

    return linha;
}


// as linhas -> campo escondido (vai também a linha ainda em branco: o
// rascunho guarda o formulário como está)
function sincronizarOutrosContratos(){

    const linhas = Array.from($("listaOutrosContratos").querySelectorAll(".ag-contrato-linha"));

    const lista = linhas.map(linha => contratoLimpo({
        cliente: linha.querySelector(".ag-contrato-cliente").value,
        proposta: linha.querySelector(".ag-contrato-proposta").value,
        periodo: linha.querySelector(".ag-contrato-periodo").value
    }));

    $("agOutrosContratos").value = lista.length ? JSON.stringify(lista) : "";

    // o número de cada linha (o primeiro contrato são os campos de cima)
    linhas.forEach((linha, indice) => {

        linha.querySelector(".ag-contrato-numero").innerText = String(indice + 2);
    });

    atualizarBlocoOutrosContratos();
}


// campo escondido -> linhas (ao abrir o formulário)
function desenharOutrosContratos(){

    $("listaOutrosContratos").replaceChildren(
        ...listaOutrosContratos($("agOutrosContratos").value, true)
            .map((contrato, indice) => criarLinhaContrato(contrato, indice + 2))
    );

    atualizarBlocoOutrosContratos();
}


// o mais comum é o mesmo cliente com outro contrato: a linha já vem com ele
function adicionarOutroContrato(){

    const quantos = $("listaOutrosContratos").querySelectorAll(".ag-contrato-linha").length;

    const linha =
        criarLinhaContrato(contratoLimpo({ cliente: $("agCliente").value }), quantos + 2);

    $("listaOutrosContratos").appendChild(linha);

    sincronizarOutrosContratos();

    linha.querySelector(".ag-contrato-proposta").focus();

    agendarRascunho();
}


function removerLinhaContrato(linha){

    linha.remove();

    sincronizarOutrosContratos();

    agendarRascunho();
}


// só na coleta; com outros contratos, o primeiro ganha o nome "Contrato 1"
function atualizarBlocoOutrosContratos(){

    const coleta = $("agTipo").value === TIPO_COM_OUTROS_CONTRATOS;

    $("blocoOutrosContratos").style.display = coleta ? "" : "none";

    const temOutros =
        coleta && $("listaOutrosContratos").querySelector(".ag-contrato-linha") !== null;

    $("rotuloOutrosContratos").innerText =
        temOutros
            ? "Outros contratos (o 1 é o Cliente, a proposta e o período de cima)"
            : "Mais de um contrato nesta coleta?";
}


// ao salvar: { lista } pronta para o banco, ou { erro }. Fora da coleta, nenhum.
// Contrato sem cliente é do mesmo cliente de cima; período no formato da agenda
function conferirOutrosContratos(dados){

    if(dados.tipo !== TIPO_COM_OUTROS_CONTRATOS) return { lista: [] };

    const lista = listaOutrosContratos(dados.outrosContratos);

    for(let indice = 0; indice < lista.length; indice++){

        const contrato = lista[indice];

        const numero = indice + 2;

        if(!contrato.proposta) return { erro: `Informe o nº da proposta do contrato ${numero}` };

        if(!contrato.cliente) contrato.cliente = dados.cliente;

        if(contrato.periodo){

            const periodo = normalizarPeriodo(contrato.periodo);

            if(periodo.erro) return { erro: `Contrato ${numero}: ${periodo.erro}` };

            contrato.periodo = periodo.valor;
        }
    }

    return { lista };
}
