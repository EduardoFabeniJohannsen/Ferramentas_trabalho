// ======================================
// AGENDA - EMAIL DE RENOVAÇÃO: A JANELA
// ======================================
// Botão ✉️ da entrega (e da entrega/coleta): abre a janela do email de renovação já preenchida. O vencimento vem da data da entrega e do período (o próximo a partir de hoje; agenda-renovacao-datas.js) e pode ser mudado; o prazo de resposta é calculado (e pode ser mudado); local e endereço vêm da entrega; o aviso da NF de retorno vem com o nome da empresa para editar (marcado nas conhecidas, como a WEG). Mostra a prévia e copia o assunto e o email (formatado, para colar no Outlook). Os textos ficam em agenda-renovacao-texto.js.


let itemRenovacao = null;


// a pessoa mudou o prazo à mão: não recalcula até mudar o vencimento
let prazoRenovacaoManual = false;


// o da NF de retorno vem com o nome da empresa para editar: marcado quando o
// local ou o cliente é uma das conhecidas (WEG...); senão, com o nome do local
function desenharAvisosRenovacao(item){

    const empresa = empresaNfRetorno(item);

    $("avisosRenovacao").replaceChildren(...AVISOS_EXTRAS_RENOVACAO.map(aviso => {

        const linha = criar("div", "renovacao-aviso");

        const rotulo = criar("label");

        const caixa = criar("input");

        caixa.type = "checkbox";

        caixa.value = aviso.id;

        caixa.checked = aviso.id === "empresa" && !!empresa;

        caixa.dataset.mudanca = "desenharRenovacao";

        rotulo.title = textoAvisoExtra(aviso, "EMPRESA");

        rotulo.append(caixa, ` ${aviso.rotulo}`);

        linha.appendChild(rotulo);

        if(aviso.id === "empresa"){

            const nome = criar("input");

            nome.type = "text";

            nome.id = "renovacaoEmpresa";

            nome.autocomplete = "off";

            nome.placeholder = "Nome da empresa";

            nome.value = empresa || item.destinoNome || "";

            nome.dataset.entrada = "desenharRenovacao";

            linha.appendChild(nome);
        }

        return linha;
    }));
}


function abrirRenovacaoAgenda(item){

    if(!TIPOS_CONTRATO_NOVO.includes(item.tipo)) return;

    itemRenovacao = item;

    prazoRenovacaoManual = false;

    $("resumoRenovacao").innerText = [item.cliente, item.plataforma].filter(Boolean).join(" · ");

    $("renovacaoVencimento").value = "";

    $("renovacaoFeriado").checked = false;

    $("renovacaoPrazo").value = "";

    $("renovacaoLocal").value = item.destinoNome || "";

    // o do Sisloc vem arrumado ("R X, 740 - Bairro, Cidade/UF")
    $("renovacaoEndereco").value = enderecoDoSisloc(item.destinoEndereco) || item.linkDestino || "";

    desenharAvisosRenovacao(item);

    // o vencimento: a data da entrega e o período (agenda-renovacao-datas.js)
    const vencimento = proximoVencimento(item.data, item.periodo, isoDoDiaRenovacao(new Date()));

    let origem = "";

    if(vencimento){

        $("renovacaoVencimento").value = vencimento.iso;

        origem = textoOrigemVencimento(item.data, item.periodo, vencimento);

    }else if(!item.data){

        origem = "Entrega sem data: informe o vencimento.";

    }else{

        origem = item.periodo
            ? `Período "${item.periodo}" não reconhecido: informe o vencimento.`
            : "Entrega sem período: informe o vencimento.";
    }

    $("modalRenovacao").classList.add("aberto");

    $("origemVencimento").innerText = origem;

    mudarVencimentoRenovacao();
}


function fecharRenovacaoAgenda(){

    $("modalRenovacao")?.classList.remove("aberto");

    itemRenovacao = null;
}


// ======================================
// CAMPOS
// ======================================

// vencimento novo: a caixinha Feriado volta ao que o calendário diz e o prazo é recalculado
function mudarVencimentoRenovacao(){

    const vencimento = $("renovacaoVencimento").value;

    $("renovacaoFeriado").checked = !!vencimento && ehFeriadoNacional(vencimento);

    prazoRenovacaoManual = false;

    recalcularPrazoRenovacao();
}


function mudarFeriadoRenovacao(){

    prazoRenovacaoManual = false;

    recalcularPrazoRenovacao();
}


function mudarPrazoRenovacao(){

    prazoRenovacaoManual = !!$("renovacaoPrazo").value;

    if(!prazoRenovacaoManual) return recalcularPrazoRenovacao();

    desenharRenovacao();
}


function recalcularPrazoRenovacao(){

    const vencimento = $("renovacaoVencimento").value;

    if(vencimento && !prazoRenovacaoManual){

        $("renovacaoPrazo").value =
            prazoRenovacao(vencimento, $("renovacaoFeriado").checked, isoDoDiaRenovacao(new Date()));
    }

    desenharRenovacao();
}


// os campos do email agora (a saudação depende da hora)
function camposRenovacaoDaJanela(){

    const vencimento = $("renovacaoVencimento").value;

    if(!itemRenovacao || !vencimento) return null;

    return camposRenovacao({
        item: itemRenovacao,
        vencimento,
        prazo: $("renovacaoPrazo").value || vencimento,
        feriado: $("renovacaoFeriado").checked,
        local: $("renovacaoLocal").value,
        endereco: $("renovacaoEndereco").value,
        avisos: [...document.querySelectorAll("#avisosRenovacao input:checked")].map(caixa => caixa.value),
        empresa: $("renovacaoEmpresa")?.value || "",
        agora: new Date()
    });
}


// o que vale a pena conferir antes de copiar
function alertasRenovacao(){

    const vencimento = $("renovacaoVencimento").value;

    const prazo = $("renovacaoPrazo").value;

    const hoje = isoDoDiaRenovacao(new Date());

    const alertas = [];

    if(!vencimento) return ["Informe o vencimento."];

    if(vencimento < hoje) alertas.push(`Já venceu: o email sai com "venceu" e o prazo de resposta hoje.`);

    else if(prazo > vencimento) alertas.push("O prazo de resposta passa do vencimento.");

    else if(prazo < hoje) alertas.push("O prazo de resposta já passou.");

    const dias = Math.round((dataDoIso(vencimento) - dataDoIso(hoje)) / 86400000);

    if(dias > 7) alertas.push(`Vence daqui a ${dias} dias.`);

    if(!$("renovacaoLocal").value.trim()) alertas.push("Local em branco.");

    if(!$("renovacaoEndereco").value.trim()) alertas.push("Endereço em branco.");

    if(document.querySelector("#avisosRenovacao input[value='empresa']")?.checked && !$("renovacaoEmpresa").value.trim()){

        alertas.push("Escreva o nome da empresa no aviso da NF de retorno.");
    }

    return alertas;
}


function desenharRenovacao(){

    const campos = camposRenovacaoDaJanela();

    $("alertasRenovacao").replaceChildren(...alertasRenovacao().map(texto => criar("p", "", `⚠️ ${texto}`)));

    $("btnCopiarAssuntoRenovacao").disabled = !campos;

    $("btnCopiarEmailRenovacao").disabled = !campos;

    if(!campos){

        $("assuntoRenovacao").innerText = "";

        $("previaRenovacao").replaceChildren(criar("p", "renovacao-sem-previa", "Informe o vencimento para ver o email."));

        return;
    }

    $("assuntoRenovacao").innerText = assuntoRenovacao(campos);

    // o HTML é montado aqui mesmo, com tudo o que veio de fora escapado
    $("previaRenovacao").innerHTML = htmlRenovacao(campos);
}


// ======================================
// COPIAR
// ======================================

function copiarAssuntoRenovacao(){

    const campos = camposRenovacaoDaJanela();

    if(campos) copiar(assuntoRenovacao(campos), "Assunto copiado");
}


function copiarEmailRenovacao(){

    const campos = camposRenovacaoDaJanela();

    if(!campos) return;

    copiarFormatado(
        htmlRenovacao(campos),
        textoRenovacao(campos),
        "Email copiado: troque NOMECONTATO, NÚMEROCONTRATO e DESCRIÇÃOEQUIPAMENTO no Outlook"
    );
}
