// ======================================
// AGENDA - CAMPOS DO FORMULÁRIO
// ======================================
// CAMPOS_AGENDA, máscaras de horário/período e regras dos campos.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// MODAL (novo / editar)
// ======================================

const CAMPOS_AGENDA = [
    ["data", "agData"],
    ["horario", "agHorario"],
    ["tipo", "agTipo"],
    ["status", "agStatus"],
    ["plataforma", "agPlataforma"],
    ["plataformaRecolha", "agPlataformaRecolha"],
    ["transportadora", "agTransportadora"],
    ["motorista", "agMotorista"],
    ["cliente", "agCliente"],
    ["proposta", "agProposta"],
    ["periodo", "agPeriodo"],
    ["origemNome", "agOrigemNome"],
    ["origemEndereco", "agOrigemEndereco"],
    ["linkOrigem", "agLinkOrigem"],
    ["destinoNome", "agDestinoNome"],
    ["destinoEndereco", "agDestinoEndereco"],
    ["linkDestino", "agLinkDestino"],
    ["frete", "agFrete"],
    ["freteConta", "agFreteConta"],
    ["obsExpedicao", "agObsExpedicao"],
    ["obsEntrega", "agObsEntrega"],
    ["referencia", "agReferencia"],
    ["contato", "agContato"],
    ["card", "agCard"],
    ["emails", "agEmails"]
];


function preencherSelect(id, valores, textoVazio){

    const select = $(id);

    select.innerHTML = "";

    if(textoVazio !== undefined){

        const vazio = criar("option", "", textoVazio);

        vazio.value = "";

        select.appendChild(vazio);
    }

    valores.forEach(valor => {

        const opcao = criar("option", "", valor);

        opcao.value = valor;

        select.appendChild(opcao);
    });
}


// ======================================
// CAMPOS DO FORMULÁRIO (máscaras e regras)
// ======================================

// maiúsculo enquanto digita, sem pular o cursor
function forcarMaiusculo(evento){

    const campo = evento.target;

    const maiusculo = campo.value.toUpperCase();

    if(campo.value === maiusculo) return;

    const inicio = campo.selectionStart;

    const fim = campo.selectionEnd;

    campo.value = maiusculo;

    try{

        campo.setSelectionRange(inicio, fim);

    }catch(erro){

        // alguns tipos de campo não aceitam seleção
    }
}


// Horário: número vira HH:MM sozinho (0800 -> 08:00, 830 -> 08:30).
// Começando com letra vale texto livre (CONFIRMAR / IMEDIATO).
function mascararHorario(texto){

    const bruto = String(texto || "").toUpperCase();

    if(/^\s*[^\d\s]/.test(bruto)){

        return bruto.replace(/[^A-Z]/g, "").slice(0, 9);
    }

    let digitos = bruto.replace(/\D/g, "").slice(0, 4);

    // primeiro dígito maior que 2 (ex: 8) é hora de um dígito: vira 08
    if(digitos.length && Number(digitos[0]) > 2){

        digitos = ("0" + digitos).slice(0, 4);
    }

    if(digitos.length <= 2) return digitos;

    return digitos.slice(0, 2) + ":" + digitos.slice(2);
}


function mascararCampoHorario(evento){

    const campo = evento.target;

    const mascarado = mascararHorario(campo.value);

    if(campo.value !== mascarado) campo.value = mascarado;
}


function horarioValido(valor){

    return (
        valor === "" ||
        valor === "CONFIRMAR" ||
        valor === "IMEDIATO" ||
        /^([01]\d|2[0-3]):[0-5]\d$/.test(valor)
    );
}


// Período: só 3 formatos. "16 dias", "3 períodos" ou "Anual".
// Só o número vale como dias.
function textoDias(numero){

    return numero === 1 ? "1 dia" : `${numero} dias`;
}


function textoPeriodos(numero){

    return numero === 1 ? "1 período" : `${numero} períodos`;
}


// devolve { valor } já no formato certo, ou { erro }
function normalizarPeriodo(texto){

    const valor =
        String(texto || "").trim().replace(/\s+/g, " ");

    if(!valor) return { valor: "" };

    if(/^anual$/i.test(valor)) return { valor: "Anual" };

    let partes =
        valor.match(/^(\d+)(?:\s*(?:d|dias?))?$/i);

    if(partes && Number(partes[1]) >= 1){

        return { valor: textoDias(Number(partes[1])) };
    }

    partes =
        valor.match(/^(\d+)\s*(?:p|per[ií]odos?)$/i);

    if(partes && Number(partes[1]) >= 1){

        return { valor: textoPeriodos(Number(partes[1])) };
    }

    return {
        erro: "Período inválido (use: 16 dias, 3 períodos ou Anual)"
    };
}


// sugestões enquanto digita: começou um número, oferece "N dias",
// "N períodos" e os dias de 1 a 30 que começam com o que foi digitado
function atualizarSugestoesPeriodo(){

    const lista = $("listaPeriodos");

    if(!lista) return;

    const texto =
        $("agPeriodo").value.trim();

    const opcoes = [];

    const partes = texto.match(/^(\d+)/);

    if(partes){

        const digitos = partes[1];

        const numero = Number(digitos);

        if(numero >= 1){

            opcoes.push(textoDias(numero));

            opcoes.push(textoPeriodos(numero));
        }

        for(let dia = 1; dia <= 30; dia++){

            if(String(dia).startsWith(digitos) && dia !== numero){

                opcoes.push(textoDias(dia));
            }
        }

    }else{

        opcoes.push("Anual");

        for(let dia = 1; dia <= 30; dia++){

            opcoes.push(textoDias(dia));
        }
    }

    lista.innerHTML = "";

    opcoes.forEach(opcao => {

        const item = criar("option");

        item.value = opcao;

        lista.appendChild(item);
    });
}


// troca técnica: aparece a máquina de recolha
function atualizarCamposTipo(){

    const troca =
        $("agTipo").value === "Troca técnica";

    $("blocoRecolha").style.display =
        troca ? "" : "none";

    $("rotuloPlataforma").innerText =
        troca ? "Máquina de entrega" : "Plataforma";
}


// mantém no select a transportadora do agendamento mesmo que ela não
// esteja mais no cadastro, pra não perder o dado ao salvar
function garantirOpcaoTransportadora(nome){

    preencherSelect("agTransportadora", TRANSPORTADORAS, "Sem transportadora");

    if(nome && !TRANSPORTADORAS.includes(nome)){

        const extra =
            criar("option", "", `${nome} (fora do cadastro)`);

        extra.value = nome;

        $("agTransportadora").appendChild(extra);
    }
}
