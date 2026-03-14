function maiusculo(){
    let texto = document.getElementById("texto");
    texto.value = texto.value.toUpperCase();
}

function minusculo(){
    let texto = document.getElementById("texto");
    texto.value = texto.value.toLowerCase();
}

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

function formatarData(data){
    let dia = String(data.getDate()).padStart(2,'0');
    let mes = String(data.getMonth()+1).padStart(2,'0');
    let ano = data.getFullYear();

    return dia + "/" + mes + "/" + ano;
}

/* colocar data atual automaticamente */
let hoje = new Date().toISOString().split('T')[0];
document.getElementById("data").value = hoje;

/* calcular automaticamente ao carregar */
calcular();

/* recalcular quando mudar a data */
document.getElementById("data").addEventListener("change", calcular);

/* calcular valor dos boletos automaticamente */
document.getElementById("valor").addEventListener("input", calcularValor);


function calcularValor(){

    let valor = document.getElementById("valor").value;

    if(!valor) return;

    valor = valor.replace(",", ".");

    valor = parseFloat(valor);

    if(isNaN(valor)) return;

    let metade = valor / 2;

    document.getElementById("metade").innerText = metade.toFixed(2);

}

