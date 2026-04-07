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

function gerarTextos(){

    let nome = document.getElementById("nomeCliente").value.toUpperCase();
    let equipamento = document.getElementById("equipamento").value.toUpperCase();
    let periodoInput = document.getElementById("periodo").value;

    let periodo = "";
    if(periodoInput){
        periodo = periodoInput.toUpperCase();

        // se for número puro, adiciona DIAS
        if(!isNaN(periodoInput)){
            periodo = periodoInput + " DIAS";
        }
    }
    let cidade = document.getElementById("cidade").value.toUpperCase();

    // data hoje
    let hoje = new Date();
    let dia = String(hoje.getDate()).padStart(2,'0');
    let mes = String(hoje.getMonth()+1).padStart(2,'0');
    let ano = hoje.getFullYear();
    let data = dia + "/" + mes + "/" + ano;

    // TEXTO 1
    if(nome){
        let texto1 = `OPORTUNIDADE DE LOCAÇÃO_${nome}_${data}`;
        document.getElementById("textoOportunidade").innerText = texto1;
    }

    // TEXTO 2
    if(nome && equipamento && periodo && cidade){
        let texto2 = `ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA_${nome}_${equipamento}_${periodo}_${cidade}`;
        document.getElementById("textoOrcamento").innerText = texto2;
    }
}

function copiarTexto(id){
    let texto = document.getElementById(id).innerText;
    if(!texto) return;

    navigator.clipboard.writeText(texto);
}

function gerarStatus(tipo){

    let hoje = new Date();

    let dia = String(hoje.getDate()).padStart(2,'0');
    let mes = String(hoje.getMonth()+1).padStart(2,'0');

    let data = dia + "/" + mes;

    let nome = "Eduardo";

    // 🔥 MENSAGENS PADRÃO
    const mensagens = {

        faturado: `${data} - Faturado - ${nome}`,

        renovacaoEmail: `${data} - Enviado email de renovação - ${nome}`,
        
        renovacaoZap: `${data} - Enviado zap de renovação - ${nome}`,

        autorizado: "Autorizado Via Contrato XXX - Responsável: XXX <XXX>",

        FreteZOHO: `FRETE POR CONTA DO CLIENTE / FATURADOS DO TRANSPORTADOR DIRETO PARA O CLIENTE
R$ 800,00 ENTREGA
R$ 800,00 RETORNO

Transportadores Indicados:
JEAN RICARDO SPIESS 47 99763-3333
KUNG 47 9616-5616
MAGNUS 47 9754-0321
RR ( SOMENTE ATE WTE12 ) - 47 9180-5385 
NÃO NOS RESPONSABILIZAMOS POR HORA PARADA, VALORES DE ACORDO COM A DISPONIBILIDADE DO TRANSPORTADOR
ENTREGA TÉCNICA GRATUITA
PROPOSTA VALIDA POR 7 DIAS`,

        CHEKLIST_Titulo: "CHEKLIST - PTA  - NOME_CLIENTE",

        CHEKLIST_Mensagem: `Prezado Cliente,

        Apresento em anexo Checklist de saída do equipamento locado.

        Saliento algumas cláusulas presentes no contrato de locação:

        * A LOCATÁRIA e/ou o preposto da LOCATÁRIA reconhece e declara ter recebido o(s) equipamento(s) em perfeito estado de conservação e uso (conforme check list). E, assim como o(s) recebeu, se compromete a conservá-lo(s) e a devolvê-lo(s), de forma a permitir sua imediata utilização pela LOCADORA, sem que haja necessidade de reparo(s) e substituição (ões) de peça(s) e componente(s).

        É de obrigação da locatária a realização de "check-list" diário do(s) equipamento(s). Serão fornecidas instruções e modelo a ser seguido, caso solicitado.

        O combustível, água de bateria (reposição), consertos de furos e cortes em pneus é de responsabilidade da LOCATÁRIA
        * Os equipamentos denominados PTA - Plataforma de Trabalho Aéreo, independentemente do fabricante e do tipo de propulsão, não foram projetados para realizarem deslocamentos ininterruptos acima de 400 metros para equipamento diesel e 200 metros para equipamento elétrico. Portanto, sua dirigibilidade fica limitada ao número de metros acima informado. A não observância dessa orientação acarretará em superaquecimento do sistema hidráulico que poderá ocasionar vazamentos de óleo hidráulico, desgastes excessivos no sistema elétrico e até mesmo graves defeitos. Após a constatação do nosso corpo técnico que tais orientações não foram observadas, ficará caracterizado o "mau uso" da plataforma e a assistência técnica será cobrada conforme custos de atendimento. Km rodado: R$ 1,20 Hora do Técnico: R$ 120,00.

        * Em caso de problemas no(s) equipamento(s) locado(s), somente técnico da W Rental está autorizado a proceder o reparo. Para tanto, solicitamos contatar nossa assistência técnica.

        Obrigada`, 

        ICMS: "Saida sem incidencia de ICMS cfe Cap. II, art 6 do RICMS/SC"

    };

    let texto = mensagens[tipo];
    if(!texto) return;

    navigator.clipboard.writeText(texto);

    // 🔥 nome amigável no popup
    let titulo = tipo;

    mostrarToast(titulo + " copiado");
}

function mostrarToast(mensagem){

    let toast = document.getElementById("toast");

    toast.innerText = mensagem;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}

// EVENTOS
document.getElementById("data").addEventListener("change", calcular);
document.getElementById("data").addEventListener("change", calcularDiasCustom);

document.getElementById("dias").addEventListener("input", calcularDiasCustom);
document.getElementById("valor").addEventListener("input", calcularValor);

document.getElementById("valorTabela").addEventListener("input", calcularDesconto);
document.getElementById("valorDesejado").addEventListener("input", calcularDesconto);

document.getElementById("nomeCliente").addEventListener("input", gerarTextos);
document.getElementById("equipamento").addEventListener("input", gerarTextos);
document.getElementById("periodo").addEventListener("input", gerarTextos);
document.getElementById("cidade").addEventListener("input", gerarTextos);