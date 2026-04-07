// =========================
// HELPERS
// =========================
const $ = (id) => document.getElementById(id);

const formatarData = (data) => {
    const dia = String(data.getDate()).padStart(2,'0');
    const mes = String(data.getMonth()+1).padStart(2,'0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
};

const brToNumber = (valor) => {
    return Number(valor.replace(/\./g, "").replace(",", "."));
};

const numberToBR = (num) => {
    return num.toFixed(2).replace(".", ",");
};

// =========================
// TEXTO
// =========================
function maiusculo(){
    $("texto").value = $("texto").value.toUpperCase();
}

function minusculo(){
    $("texto").value = $("texto").value.toLowerCase();
}

function formatarCNPJ(){
    $("texto").value = $("texto").value.replace(/[.\-\/]/g, "");
}

// =========================
// DATAS
// =========================
function calcular(){
    const dataInput = $("data").value;
    if(!dataInput) return;

    const base = new Date(dataInput);

    const d28 = new Date(base);
    d28.setDate(d28.getDate() + 28);

    const d56 = new Date(base);
    d56.setDate(d56.getDate() + 56);

    $("d28").innerText = formatarData(d28);
    $("d56").innerText = formatarData(d56);
}

function calcularDiasCustom(){
    const dataInput = $("data").value;
    const dias = $("dias").value;

    if(!dataInput || dias === "") return;

    const base = new Date(dataInput);
    base.setDate(base.getDate() + parseInt(dias, 10));

    $("resultadoDias").innerText = formatarData(base);
}

// =========================
// VALOR
// =========================
function calcularValor(){
    const valor = $("valor").value;
    if(!valor) return;

    const numero = brToNumber(valor);
    if(isNaN(numero)) return;

    const metade = numero / 2;
    $("metade").innerText = numberToBR(metade);
}

// =========================
// DESCONTO
// =========================
function calcularDesconto(){
    const tabela = $("valorTabela").value;
    const desejado = $("valorDesejado").value;

    if(!tabela || !desejado) return;

    const valorTabela = Number(tabela);
    const valorDesejado = brToNumber(desejado);

    if(isNaN(valorTabela) || valorTabela === 0 || isNaN(valorDesejado)) return;

    const desconto = valorTabela - valorDesejado;
    const percentual = (desconto / valorTabela) * 100;

    $("desconto").innerHTML = `
        ${numberToBR(desconto)}<br>
        <span style="color:#94a3b8">
            Desconto de ${percentual.toFixed(2)}%
        </span>
    `;
}

// =========================
// TEXTOS AUTOMÁTICOS
// =========================
function gerarTextos(){
    const nome = $("nomeCliente").value.toUpperCase();
    const equipamento = $("equipamento").value.toUpperCase();
    const periodoInput = $("periodo").value;
    const cidade = $("cidade").value.toUpperCase();

    let periodo = "";
    if(periodoInput){
        periodo = isNaN(periodoInput)
            ? periodoInput.toUpperCase()
            : `${periodoInput} DIAS`;
    }

    const hoje = new Date();
    const data = formatarData(hoje);

    if(nome){
        $("textoOportunidade").innerText =
            `OPORTUNIDADE DE LOCAÇÃO_${nome}_${data}`;
    }

    if(nome && equipamento && periodo && cidade){
        $("textoOrcamento").innerText =
            `ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA_${nome}_${equipamento}_${periodo}_${cidade}`;
    }
}

// =========================
// COPIAR
// =========================
function copiarTexto(id){
    const texto = $(id).innerText;
    if(!texto) return;
    navigator.clipboard.writeText(texto);
}

// =========================
// STATUS / MENSAGENS
// =========================
function gerarStatus(tipo){

    const hoje = new Date();
    const data = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}`;
    const nome = "Eduardo";

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
NÃO NOS RESPONSABILIZAMOS POR HORA PARADA
ENTREGA TÉCNICA GRATUITA
PROPOSTA VALIDA POR 7 DIAS`,


CHEKLIST_Titulo: "CHEKLIST - PTA  - NOME_CLIENTE",

        CHEKLIST_Mensagem: 
`Prezado Cliente,

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

    const texto = mensagens[tipo];
    if(!texto) return;

    navigator.clipboard.writeText(texto);
    mostrarToast(tipo + " copiado");
}

// =========================
// TOAST
// =========================
function mostrarToast(msg){
    const toast = $("toast");

    toast.innerText = msg;
    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 2000);
}

// =========================
// INIT
// =========================
(function init(){
    $("data").value = new Date().toISOString().split('T')[0];

    calcular();

    $("data").addEventListener("change", calcular);
    $("data").addEventListener("change", calcularDiasCustom);

    $("dias").addEventListener("input", calcularDiasCustom);
    $("valor").addEventListener("input", calcularValor);

    $("valorTabela").addEventListener("input", calcularDesconto);
    $("valorDesejado").addEventListener("input", calcularDesconto);

    $("nomeCliente").addEventListener("input", gerarTextos);
    $("equipamento").addEventListener("input", gerarTextos);
    $("periodo").addEventListener("input", gerarTextos);
    $("cidade").addEventListener("input", gerarTextos);
})();