// TEXTO
function maiusculo(){
    let texto = document.getElementById("texto");
    texto.value = texto.value.toUpperCase();
}

function minusculo(){
    let texto = document.getElementById("texto");
    texto.value = texto.value.toLowerCase();
}

function formatarCNPJ(){
    let texto = document.getElementById("texto");
    texto.value = texto.value.replace(/[.\-\/]/g, "");
}

// DATAS FIXAS
function calcular(){
    let dataInput = document.getElementById("data").value;
    if(!dataInput) return;

    let data = new Date(dataInput);

    let d28 = new Date(data);
    d28.setDate(d28.getDate() + 28);

    let d56 = new Date(data);
    d56.setDate(d56.getDate() + 56);

    document.getElementById("d28").innerText = formatarData(d28);
    document.getElementById("d56").innerText = formatarData(d56);
}

// DIAS PERSONALIZADOS
function calcularDiasCustom(){
    let dataInput = document.getElementById("data").value;
    let dias = document.getElementById("dias").value;

    if(!dataInput || dias === "") return;

    let data = new Date(dataInput);
    let novaData = new Date(data);

    novaData.setDate(novaData.getDate() + parseInt(dias, 10));

    document.getElementById("resultadoDias").innerText = formatarData(novaData);
}

// VALOR
function calcularValor(){

    let valor = document.getElementById("valor").value;
    if(!valor) return;

    // remove pontos de milhar
    valor = valor.replace(/\./g, "");

    // troca vírgula por ponto
    valor = valor.replace(",", ".");

    let numero = Number(valor);
    if(isNaN(numero)) return;

    let metade = numero / 2;

    document.getElementById("metade").innerText = metade.toFixed(2).replace(".", ",");
}

// FORMATAR DATA
function formatarData(data){
    let dia = String(data.getDate()).padStart(2,'0');
    let mes = String(data.getMonth()+1).padStart(2,'0');
    let ano = data.getFullYear();

    return dia + "/" + mes + "/" + ano;
}

// AUTO LOAD
let hoje = new Date().toISOString().split('T')[0];
document.getElementById("data").value = hoje;

calcular();

function calcularDesconto(){

    let tabela = document.getElementById("valorTabela").value;
    let desejado = document.getElementById("valorDesejado").value;

    if(!tabela || !desejado) return;

    // tabela já vem padrão 16465.69
    let valorTabela = Number(tabela);
    if(isNaN(valorTabela)) return;

    // tratar valor desejado (BR → EN)
    desejado = desejado.replace(/\./g, "");
    desejado = desejado.replace(",", ".");

    let valorDesejado = Number(desejado);
    if(isNaN(valorDesejado)) return;

    let desconto = valorTabela - valorDesejado;

    document.getElementById("desconto").innerText = desconto.toFixed(2);
}


// EVENTOS
document.getElementById("data").addEventListener("change", calcular);
document.getElementById("data").addEventListener("change", calcularDiasCustom);

document.getElementById("dias").addEventListener("input", calcularDiasCustom);
document.getElementById("valor").addEventListener("input", calcularValor);

document.getElementById("valorTabela").addEventListener("input", calcularDesconto);
document.getElementById("valorDesejado").addEventListener("input", calcularDesconto);