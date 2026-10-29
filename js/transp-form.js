// ======================================
// TRANSPORTADORAS - FORMULÁRIOS
// ======================================
// Campos, máscara de CPF, abrir/fechar o modal e salvar (veículo e motorista ficam em transp-form-veiculo.js e transp-form-motorista.js).

function criarCampoForm(rotulo, id, valor, extras, largo){

    const bloco =
        criarElemento("div", "campo-form" + (largo ? " largo" : ""));

    bloco.id = "bloco-" + id;

    const label = criarElemento("label", "", rotulo);

    label.htmlFor = id;

    const input = criarElemento("input");

    input.id = id;

    input.type = "text";

    input.autocomplete = "off";

    input.value =
        (valor === null || valor === undefined)
            ? ""
            : valor;

    Object.assign(input, extras || {});

    bloco.appendChild(label);

    bloco.appendChild(input);

    return bloco;
}


// maiúsculo enquanto digita, sem pular o cursor
function maiusculoCampoTransp(evento){

    const campo = evento.target;

    const maiusculo = campo.value.toUpperCase();

    if(campo.value === maiusculo) return;

    const inicio = campo.selectionStart;

    const fim = campo.selectionEnd;

    campo.value = maiusculo;

    campo.setSelectionRange(inicio, fim);
}


function formatarCPF(texto){

    return String(texto || "")
        .replace(/\D/g, "")
        .slice(0, 11)
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
}


function cpfValido(texto){

    const digitos = String(texto || "").replace(/\D/g, "");

    if(digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;

    for(let posicao = 9; posicao < 11; posicao++){

        let soma = 0;

        for(let i = 0; i < posicao; i++){

            soma += Number(digitos[i]) * (posicao + 1 - i);
        }

        if(((soma * 10) % 11) % 10 !== Number(digitos[posicao])) return false;
    }

    return true;
}


// quem só vê: campos travados, sem Salvar e título sem "Editar"
function abrirModalTransp(titulo){

    if(transpSoLeitura){

        titulo = titulo.replace(/^Editar /, "Dados do ");

        $("corpoModalTransp")
            .querySelectorAll(".grade-transp input, .grade-transp select")
            .forEach(campo => { campo.disabled = true; });
    }

    $("btnSalvarTransp").style.display =
        transpSoLeitura ? "none" : "";

    $("tituloModalTransp").innerText = titulo;

    $("modalTransp").classList.add("aberto");

    const caixa = $("modalTransp").querySelector(".modal-transp");

    if(caixa) caixa.scrollTop = 0;
}


function fecharModalTransp(){

    $("modalTransp").classList.remove("aberto");

    modalTransp = { tipo: "", id: null };
}


function salvarModalTransp(){

    if(transpSoLeitura) return;

    if(modalTransp.tipo === "veiculo") return salvarVeiculoTransp();

    if(modalTransp.tipo === "motorista") return salvarMotoristaTransp();
}
