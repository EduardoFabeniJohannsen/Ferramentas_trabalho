// ======================================
// HELPERS
// ======================================
const $ = (id) => document.getElementById(id);

const formatarData = (data) => {
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();

    return `${dia}/${mes}/${ano}`;
};

const brToNumber = (valor) => {
    if (!valor) return 0;

    valor = valor.trim();

    // se tem vírgula = formato BR
    if (valor.includes(",")) {
        valor = valor.replace(/\./g, "").replace(",", ".");
    }

    return Number(valor);
};

const copiar = (texto) => navigator.clipboard.writeText(texto);

const mostrarToast = (msg) => {
    const toast = $("toast");

    toast.innerText = msg;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
};

const formatarMoedaBR = (valor) => {
    return Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

// ======================================
// TABELA PREÇOS
// ======================================
let tabelaPrecos = {};
let tabelasFrete = {};

async function carregarFretes() {

    const arquivos = [
        "frete_Magnus.csv",
        "frete_Kung.csv",
        "frete_Jean.csv",
        "frete_Dionisio.csv",
        "frete_RR.csv"
    ];

    for (const arquivo of arquivos) {

        try {

            const resposta = await fetch(arquivo);
            const texto = await resposta.text();

            const linhas = texto.trim().split("\n");

            const cabecalho =
                linhas[0]
                .replace("\r", "")
                .split(";");

            const transportador =
                arquivo
                .replace("frete_", "")
                .replace(".csv", "");

            tabelasFrete[transportador] = {};

            for (let i = 1; i < linhas.length; i++) {

                const colunas =
                    linhas[i]
                    .replace("\r", "")
                    .split(";");

                const modelo =
                    colunas[0]
                    .trim()
                    .toUpperCase();

                tabelasFrete[transportador][modelo] = {};

                for (let j = 1; j < cabecalho.length; j++) {

                    const cidade =
                        cabecalho[j]
                        .trim()
                        .toUpperCase();

                    const valor =
                        colunas[j]
                        ?.trim();

                    tabelasFrete[transportador][modelo][cidade] = valor;
                }
            }

        } catch (erro) {

            console.log("Erro no arquivo:", arquivo);
        }
    }

    console.log("Fretes carregados");
}

function mostrarFretes() {

    const modelo =
        $("equipamento").value
        .trim()
        .toUpperCase();

    const cidade =
        $("cidade").value
        .trim()
        .toUpperCase();

    if (!modelo || !cidade) return;

    let html = "";

    for (const transportador in tabelasFrete) {

        // modelo inexistente
        if (!tabelasFrete[transportador][modelo]) {

            html += `
            <div class="frete-item">
                ⚠️ <strong>${transportador}</strong><br>
                Modelo "${modelo}" não encontrado
            </div>
            `;

            continue;
        }

        const valor =
            tabelasFrete[transportador][modelo][cidade];

        // cidade inexistente
        if (!valor || valor === "") {

            html += `
            <div class="frete-item">
                ⚠️ <strong>${transportador}</strong><br>
                Cidade "${cidade}" não encontrada
            </div>
            `;

            continue;
        }

        // sucesso
        html += `
        <div class="frete-item">
            ✅ <strong>${transportador}</strong><br>
            R$ ${valor}
        </div>
        `;
    }

    if ($("resultadoFretes")) {
    $("resultadoFretes").innerHTML = html;
    }
}

async function carregarTabela(){

    try{

        const resposta = await fetch("tabela.csv");
        const texto = await resposta.text();

        const linhas = texto.trim().split("\n");

        const cabecalho = linhas[0].split(";");

        for(let i = 1; i < linhas.length; i++){

            const colunas = linhas[i].split(";");

            const modelo = colunas[0]
                .trim()
                .toUpperCase();

            tabelaPrecos[modelo] = {};

            for(let j = 1; j < cabecalho.length; j++){

                const dias = cabecalho[j].trim();

                let valor = colunas[j].trim();

                valor = valor.replace(",", ".");

                tabelaPrecos[modelo][dias] =
                    parseFloat(valor);
            }
        }

        console.log("Tabela carregada");

    }catch(erro){

        console.log("Erro CSV", erro);
    }
}

function preencherValorTabela(){

    const modelo = $("equipamento").value
        .toUpperCase()
        .trim();

    const dias = $("periodo").value.trim();

    if(!modelo || !dias) return;

    const diasNumero = Number(dias);

    // se for múltiplo de 30 → converter
    let diasBusca = dias;

    if(diasNumero > 30 && diasNumero % 30 === 0){
        diasBusca = "30";
    }

    const diasValidos = [
        "1","2","3","4","5","6","7",
        "10","14","15","21","28","30"
    ];

    if(!diasValidos.includes(diasBusca)){
        $("valorTabela").value = "";
        $("desconto").innerHTML =
            `<span style="color:#ef4444">
                Valor fora de tabela
            </span>`;
        return;
    }

    if(
        tabelaPrecos[modelo] &&
        tabelaPrecos[modelo][diasBusca]
    ){

        $("valorTabela").value =
            tabelaPrecos[modelo][diasBusca].toFixed(2);

        calcularDesconto();

    }else{

        $("valorTabela").value = "";
        $("desconto").innerHTML =
            `<span style="color:#ef4444">
                Modelo não encontrado
            </span>`;
    }
}

// ======================================
// CONVERSOR TEXTO
// ======================================
function maiusculo() {
    $("texto").value = $("texto").value.toUpperCase();
}

function minusculo() {
    $("texto").value = $("texto").value.toLowerCase();
}

function formatarCNPJ() {
    $("texto").value =
        $("texto").value.replace(/[.\-\/]/g, "");
}

// ======================================
// DATAS
// ======================================
function calcularDatas() {
    const valor = $("data").value;
    if (!valor) return;

    const base = new Date(valor);

    const d28 = new Date(base);
    d28.setDate(d28.getDate() + 29);

    const d56 = new Date(base);
    d56.setDate(d56.getDate() + 57);

    $("d28").innerText = formatarData(d28);
    $("d56").innerText = formatarData(d56);
}

function calcularDiasCustom() {
    const valor = $("data").value;
    const dias = $("dias").value;

    if (!valor || dias === "") return;

    const base = new Date(valor);

    base.setDate(base.getDate() + Number(dias) + 1);

    $("resultadoDias").innerText =
        formatarData(base);
}

// ======================================
// BOLETOS
// ======================================
function calcularValor() {
    const valor = $("valor").value;
    if (!valor) return;

    const numero = brToNumber(valor);

    if (isNaN(numero)) return;

    $("metade").innerText =
        (numero / 2).toFixed(2);
}

// ======================================
// DESCONTO
// ======================================
function calcularDesconto() {
    const tabela = $("valorTabela").value;
    const desejado = $("valorDesejado").value;

    if (!tabela || !desejado) return;

    const valorTabela = brToNumber(tabela);
    const valorDesejado = brToNumber(desejado);

    if (!valorTabela || !valorDesejado) return;

    const desconto =
        valorTabela - valorDesejado;

    const percentual =
        (desconto / valorTabela) * 100;

    $("desconto").innerHTML = `
        ${desconto.toFixed(2)}<br>
        <span style="color:#94a3b8">
            Desconto de ${percentual.toFixed(2)}%
        </span>
    `;
}

// ======================================
// TEXTOS AUTOMÁTICOS
// ======================================
function gerarTextos() {
    const nome =
        $("nomeCliente").value.toUpperCase();

    const equipamento =
        $("equipamento").value.toUpperCase();

    const cidade =
        $("cidade").value.toUpperCase();

    const periodoInput =
        $("periodo").value.trim();

    let periodo = "";

    if (periodoInput) {

        if (isNaN(periodoInput)) {
            periodo =
                periodoInput.toUpperCase();

        } else {

            const numero =
                Number(periodoInput);

            if (numero === 1) {
                periodo = "DIARIA";

            } else if (
                numero > 30 &&
                numero % 30 === 0
            ) {
                periodo =
                    `${numero / 30} PERIODOS`;

            } else {
                periodo =
                    `${numero} DIAS`;
            }
        }
    }

    const hoje =
        formatarData(new Date());

    // oportunidade
    if (nome) {
        $("textoOportunidade").innerText =
            `OPORTUNIDADE DE LOCAÇÃO_${nome}_${hoje}`;
    }

    // orçamento
    if (
        nome &&
        equipamento &&
        periodo &&
        cidade
    ) {
        $("textoOrcamento").innerText =
                `${nome}_${equipamento}_${periodo}`;
    }

    preencherValorTabela();
}

// ======================================
// COPIAR
// ======================================
function copiarTexto(id) {
    const texto = $(id).innerText;

    if (!texto) return;

    copiar(texto);
    mostrarToast("Copiado");
}

// ======================================
// STATUS
// ======================================
function gerarStatus(tipo) {

    const hoje = new Date();

    const data =
        String(hoje.getDate()).padStart(2, "0")
        + "/"
        + String(hoje.getMonth() + 1).padStart(2, "0");

    const nome = "Eduardo";

    const cidade =
        $("cidade")
            ? $("cidade").value.toUpperCase()
            : "CIDADE";

    const frete =
        $("valorFrete")
            ? $("valorFrete").value
            : "0.00";

    const mensagens = {

        faturado:
            `${data} - Faturado - ${nome}`,

        renovacaoEmail:
            `${data} - Enviado email de renovação - ${nome}`,

        renovacaoZap:
            `${data} - Enviado zap de renovação - ${nome}`,

        autorizado:
            `Autorizado Via Contrato XXX - Responsável: XXX <XXX>`,

        FreteZOHO:
`FRETE POR CONTA DO CLIENTE / FATURADOS DO TRANSPORTADOR DIRETO PARA O CLIENTE

* Frete entrega: R$ ${frete} - ITAJAÍ x ${cidade}
* Frete retirada: R$ ${frete} - ${cidade} x ITAJAÍ

Transportadores Indicados:
JEAN RICARDO SPIESS 47 99763-3333
KUNG 47 9616-5616
MAGNUS 47 9754-0321
RR (SOMENTE ATÉ WTE12)

PROPOSTA VÁLIDA POR 7 DIAS`,

        FreteZOHOLocComp:
`* FRETE INCLUSO NO ITEM LOCAÇÃO COMPLEMENTAR *
PROPOSTA VÁLIDA POR 7 DIAS`,

    CHEKLIST_Titulo:
        `CHEKLIST - PTA - ${
            $("nomeCliente")
                ? $("nomeCliente").value.toUpperCase()
                : ""
        }`,

        CHEKLIST_Mensagem:
`Prezado Cliente,

Segue checklist de saída do equipamento locado.

Obrigada.`,

        ICMS:
            `Saida sem incidencia de ICMS cfe Cap. II, art 6 do RICMS/SC`
    };

    const texto = mensagens[tipo];

    if (!texto) return;

    copiar(texto);
    mostrarToast(tipo + " copiado");
}

// ======================================
// INIT
// ======================================
// ======================================
// INIT
// ======================================
(async function init() {

    // carregar csv
    await carregarTabela();
    await carregarFretes();

    // =========================
    // DATA
    // =========================
    if ($("data")) {

        $("data").value =
            new Date()
            .toISOString()
            .split("T")[0];

        calcularDatas();

        $("data").addEventListener(
            "change",
            calcularDatas
        );

        $("data").addEventListener(
            "change",
            calcularDiasCustom
        );
    }

    // =========================
    // DIAS
    // =========================
    if ($("dias")) {

        $("dias").addEventListener(
            "input",
            calcularDiasCustom
        );
    }

    // =========================
    // VALOR BOLETO
    // =========================
    if ($("valor")) {

        $("valor").addEventListener(
            "input",
            calcularValor
        );
    }

    // =========================
    // DESCONTO
    // =========================
    if ($("valorTabela")) {

        $("valorTabela").addEventListener(
            "input",
            calcularDesconto
        );
    }

    if ($("valorDesejado")) {

        $("valorDesejado").addEventListener(
            "input",
            calcularDesconto
        );
    }

    // =========================
    // TEXTOS
    // =========================
    if ($("nomeCliente")) {

        $("nomeCliente").addEventListener(
            "input",
            gerarTextos
        );
    }

    if ($("equipamento")) {

        $("equipamento").addEventListener(
            "input",
            () => {

                gerarTextos();

                mostrarFretes();
            }
        );
    }

    if ($("periodo")) {

        $("periodo").addEventListener(
            "input",
            gerarTextos
        );
    }

    // =========================
    // FRETES
    // =========================
    if ($("cidade")) {

        $("cidade").addEventListener(
            "input",
            () => {

                gerarTextos();

                mostrarFretes();
            }
        );
    }

})();


function copiarPropostaZap(){


    const modelo = $("equipamento").value.toUpperCase().trim();
    const periodo = $("periodo").value.trim();
    const cidade = $("cidade").value.trim();
    const valorFrete =
    $("agendamentoValorFrete").value.trim();

    const tipoFrete =
        $("tipoFrete").value;

    const diasNumero = Number(periodo);

    let periodoExibicao = periodo;
    let multiplicador = 1;

    if(diasNumero > 30 && diasNumero % 30 === 0){
        multiplicador = diasNumero / 30;
        periodoExibicao = "30";
    }

    const cidadeFormatada = cidade
    ? cidade.charAt(0).toUpperCase() + cidade.slice(1).toLowerCase()
    : "Cidade";
    
    // prioridade: valor desejado (com desconto)
    const valorLocacaoTexto =
        $("valorDesejado").value.trim() ||
        $("valorTabela").value.trim();

    if(!modelo) return mostrarToast("Informe o modelo");
    if(!periodo) return mostrarToast("Informe período");
    if(!valorLocacaoTexto) return mostrarToast("Informe valor locação");

    // =========================
    // MODELO
    // =========================
    const letra2 = modelo.charAt(1);
    const letra3 = modelo.charAt(2);
    const altura = parseInt(modelo.replace(/[^\d]/g, ""));

    let tipo = "";
    if(letra2 === "A") tipo = "Articulada";
    if(letra2 === "T") tipo = "Tesoura";
    if(letra2 === "M") tipo = "Mastro";

    let energia = "";
    if(letra3 === "E") energia = "elétrica";
    if(letra3 === "D") energia = "diesel";

    const alturaPlataforma = altura - 2;

    // =========================
    // VALORES
    // =========================
    const valorLocacao = brToNumber(valorLocacaoTexto);
    const seguro = valorLocacao * 0.07;
    const total = valorLocacao + seguro;

    // =========================
    // TEXTO
    // =========================
    const texto = `🟡 Modelo: ${modelo} ${tipo} ${energia} – ${altura} metros de altura de trabalho

* Altura da plataforma: ${alturaPlataforma} metros
* Altura de trabalho: ${altura} metros
* Período de locação: ${periodoExibicao} dias

💰 Valor da locação: R$ ${formatarMoedaBR(valorLocacao)}
🛡️ Seguro contra acidentes e furtos (opcional): R$ ${formatarMoedaBR(seguro)}

💵 Total máquina + seguro: R$ ${formatarMoedaBR(total)}${
    multiplicador > 1
        ? ` * ${multiplicador} períodos = R$ ${formatarMoedaBR(total * multiplicador)}`
        : ""
}

🚚 Frete entrega: R$ ${valorFrete} de Itajai x ${cidadeFormatada}
🚚 Frete retirada: R$ ${valorFrete} de ${cidadeFormatada} x Itajai

(Nosso frete é terceirizado, sendo um boleto na entrega e outro na retirada.)

🎁 Cortesia: Entrega técnica (mediante solicitação)

📄 Forma de pagamento: Mediante aprovação cadastral.`;

    navigator.clipboard.writeText(texto);
    mostrarToast("Proposta Zap copiada");
}

function copiarAgendamento(){

    const data =
        $("agData").value || '"hora"';

    const horario =
        $("agHorario").value || '"hora"';

    const equipamento =
        $("agEquipamento").value || '"PEMT"';

    const saida =
        $("agSaida").value || "WR";

    const entrega =
        $("agEntrega").value || '"Nome_do_Local"';

    const endereco =
        $("agEndereco").value || '"Endereço"';

    const contato =
        $("agContato").value.trim();

    const numero =
        $("agNumero").value.trim();

    const frete =
        $("agendamentoValorFrete").value || '"Valor"';

    const tipoFrete =
        $("tipoFrete").value;

    const nomeProposta =
        $("agNomeProposta").value || '"Nome_Proposta"';

    const financeiroNome =
        $("agFinanceiroNome").value || '"nome"';

    const financeiroTelefone =
        $("agFinanceiroTelefone").value || '"telefone"';

    const financeiroEmail =
        $("agFinanceiroEmail").value || '"email"';

    // =========================
    // CONTATO
    // =========================
    let blocoContato = "";

    if(contato && numero){

        blocoContato =
`Contato de quem vai receber: ${contato} - ${numero}`;

    }else{

        blocoContato =
`Contato de quem vai receber: abaixo ⤵️`;
    }

    // =========================
    // FINANCEIRO
    // =========================
    let financeiroTexto = "";

    if(tipoFrete !== "NOSSA"){

        financeiroTexto =
`

* Contatos: ⤵️

📍Financeiro:

Nome: ${financeiroNome}
Telefone: ${financeiroTelefone}
Email: ${financeiroEmail}`;
    }

    // =========================
    // TEXTO FINAL
    // =========================
    const texto =
`🚚 AGENDAMENTO DE ENTREGA

Data: ${data}
Horário: ${horario}
Equipamento: ${equipamento}

Local de Saída: ${saida}
Local de entrega: ${entrega}
Endereço: ${endereco}

${blocoContato}

* FRETE POR ${
    tipoFrete === "NOSSA"
        ? "NOSSA CONTA"
        : "CONTA DO CLIENTE"
} - R$ ${frete}
* ${nomeProposta}${financeiroTexto}`;

    copiar(texto);

    mostrarToast("Agendamento copiado");
}

const tipoFreteSelect = $("tipoFrete");

if(tipoFreteSelect){

    tipoFreteSelect.addEventListener("change", () => {

        const bloco =
            $("blocoFinanceiro");

        if(tipoFreteSelect.value === "NOSSA"){

            bloco.style.display = "none";

        }else{

            bloco.style.display = "block";
        }
    });
}