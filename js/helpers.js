// ======================================
// VERSÃO DO SISTEMA
// ======================================
// Só precisa trocar aqui — aparece sozinho nas duas páginas.

const VERSAO_SISTEMA = "10.1.0";

document.querySelectorAll(".versao").forEach(elemento => {
    elemento.innerText = "v" + VERSAO_SISTEMA;
});


// ======================================
// HELPERS
// ======================================

const $ = (id) => document.getElementById(id);


const formatarData = (data) => {

    const dia =
        String(data.getDate()).padStart(2, "0");

    const mes =
        String(data.getMonth() + 1).padStart(2, "0");

    const ano =
        data.getFullYear();

    return `${dia}/${mes}/${ano}`;
};


const brToNumber = (valor) => {

    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return 0;
    }

    valor = String(valor).trim();

    if (!valor) return 0;

    // Tira "R$", espaços e qualquer coisa que não seja número
    valor = valor.replace(/[^\d.,-]/g, "");

    // Sem nenhum dígito (ex: "abc") = valor inválido
    if (!/\d/.test(valor)) return NaN;

    // Formato brasileiro:
    // 1.234,56
    if (valor.includes(",")) {

        valor =
            valor
                .replace(/\./g, "")
                .replace(",", ".");

    }else if (/^-?\d{1,3}(\.\d{3})+$/.test(valor)) {

        // Sem vírgula, mas no padrão de milhar:
        // 1.234 ou 1.234.567 (100.50 continua decimal)
        valor =
            valor.replace(/\./g, "");
    }

    return Number(valor);
};


const formatarMoedaBR = (valor) => {

    return Number(valor).toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits:2,
            maximumFractionDigits:2
        }
    );
};


const formatarNumeroPonto = (valor) => {

    return Number(valor).toFixed(2);
};


// ======================================
// BUSCAR FRETES (uma tabela por transportadora)
// ======================================
// Junta as linhas das tabelas de frete de cada transportadora
// no formato { transportadora, modelo, cidade, valor }, que é
// o que processarLinhasFretes (propostas-dados.js) espera.
// Se uma tabela falhar, o erro sobe e o carregarFretes usa
// a cópia salva no navegador.
// Pra incluir outra transportadora, é só somar aqui.

const TABELAS_FRETES = {

    Dionizio: "frete_dionizio",

    Magnus: "frete_magnus"
};


async function buscarLinhasFretes(){

    // o Supabase devolve no máximo 1000 linhas por consulta,
    // então busca em páginas até acabar
    const tamanhoPagina = 1000;

    const buscarTabela = async (transportadora, tabela) => {

        let inicio = 0;

        let linhas = [];

        while(true){

            const { data, error } =
                await supabaseClient
                    .from(tabela)
                    .select("modelo, cidade, valor")
                    .order("id")
                    .range(inicio, inicio + tamanhoPagina - 1);

            if(error) throw error;

            linhas = linhas.concat(
                data.map(linha => ({
                    transportadora: transportadora,
                    modelo: linha.modelo,
                    cidade: linha.cidade,
                    valor: linha.valor
                }))
            );

            if(data.length < tamanhoPagina) break;

            inicio += tamanhoPagina;
        }

        return linhas;
    };

    const resultados =
        await Promise.all(
            Object.entries(TABELAS_FRETES).map(
                ([transportadora, tabela]) =>
                    buscarTabela(transportadora, tabela)
            )
        );

    return resultados.flat();
}


// Copia pro clipboard e já mostra o toast (sucesso ou erro).
// Se o navegador bloquear o clipboard (ex: fora de HTTPS/localhost),
// tenta o método antigo com textarea antes de desistir.
const copiar = async (texto, mensagem) => {

    let copiou = false;

    try {

        await navigator.clipboard.writeText(texto);

        copiou = true;

    } catch (erro) {

        try {

            const area = document.createElement("textarea");

            area.value = texto;

            area.style.position = "fixed";

            area.style.opacity = "0";

            document.body.appendChild(area);

            area.select();

            copiou = document.execCommand("copy");

            document.body.removeChild(area);

        } catch (erro2) {

            console.error("Erro ao copiar:", erro2);
        }
    }

    if (mensagem) {

        if (copiou) {

            mostrarToast(mensagem);

        } else {

            mostrarToast("Não foi possível copiar", true);
        }
    }

    return copiou;
};


let toastTimer;


// erro = true deixa o toast vermelho e um pouco mais na tela
const mostrarToast = (msg, erro = false) => {

    const toast = $("toast");

    if (!toast) return;

    toast.innerText = msg;

    toast.classList.toggle("erro", erro);

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, erro ? 4000 : 2000);
};


// ======================================
// CIDADE DE SAÍDA DO FRETE
// ======================================
// De onde o equipamento sai, nas mensagens de frete.
// O toggle fica em ⚙️ Configurações (propostas.html) e o estado
// (cidadeSaidaAtual) vive em propostas-dados.js. Em outra página,
// que não tem o toggle, fica sempre Itajaí.
// zap = como aparece na Proposta Zap; zoho = na mensagem Frete ZOHO.

const CIDADES_SAIDA = {

    ITAJAI: {
        zap: "Itajai",
        zoho: "ITAJAÍ"
    },

    JOINVILLE: {
        zap: "Joinville",
        zoho: "JOINVILLE"
    }
};


function obterCidadeSaida(){

    const chave =
        typeof cidadeSaidaAtual !== "undefined"
            ? cidadeSaidaAtual
            : "ITAJAI";

    return CIDADES_SAIDA[chave] || CIDADES_SAIDA.ITAJAI;
}


// ======================================
// CONVERSOR DE TEXTO (index.html)
// ======================================

function maiusculo(){

    const campo = $("texto");

    if(!campo) return;

    campo.value =
        campo.value.toUpperCase();
}


function minusculo(){

    const campo = $("texto");

    if(!campo) return;

    campo.value =
        campo.value.toLowerCase();
}


function formatarCNPJ(){

    const campo = $("texto");

    if(!campo) return;

    const linhasFormatadas =
        campo.value
            .split("\n")
            .map(linha => {

                // Mantém só os dígitos, limitado a 14 (tamanho do CNPJ)
                const numeros =
                    linha
                        .replace(/\D/g, "")
                        .slice(0, 14);

                if(!numeros) return linha;

                let formatado = numeros;

                if(numeros.length > 12){

                    formatado = numeros.replace(
                        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/,
                        "$1.$2.$3/$4-$5"
                    );

                }else if(numeros.length > 8){

                    formatado = numeros.replace(
                        /^(\d{2})(\d{3})(\d{3})(\d{1,4})$/,
                        "$1.$2.$3/$4"
                    );

                }else if(numeros.length > 5){

                    formatado = numeros.replace(
                        /^(\d{2})(\d{3})(\d{1,3})$/,
                        "$1.$2.$3"
                    );

                }else if(numeros.length > 2){

                    formatado = numeros.replace(
                        /^(\d{2})(\d{1,3})$/,
                        "$1.$2"
                    );
                }

                return formatado;
            });

    campo.value = linhasFormatadas.join("\n");
}


// ======================================
// CALCULADORA DE BOLETOS (index.html)
// ======================================

function calcularBoletos(){

    const dataTexto =
        $("data")?.value;

    const valorTexto =
        $("valor")?.value;


    if(dataTexto){

        const data =
            new Date(dataTexto + "T00:00:00");

        const data28 =
            new Date(data);

        data28.setDate(
            data28.getDate() + 28
        );

        const data42 =
            new Date(data);

        data42.setDate(
            data42.getDate() + 42
        );

        const data56 =
            new Date(data);

        data56.setDate(
            data56.getDate() + 56
        );

        $("d28").innerText =
            formatarData(data28);

        $("d42").innerText =
            formatarData(data42);

        $("d56").innerText =
            formatarData(data56);

    }else{

        $("d28").innerText = "";
        $("d42").innerText = "";
        $("d56").innerText = "";
    }


    if(valorTexto){

        const valor =
            brToNumber(valorTexto);

        if(
            Number.isFinite(valor) &&
            valor > 0
        ){

            $("metade").innerText =
                "R$ " + formatarMoedaBR(valor / 2);

        }else{

            $("metade").innerText = "";
        }

    }else{

        $("metade").innerText = "";
    }


    calcularDiasPersonalizados();
}


function calcularDiasPersonalizados(){

    const dataTexto =
        $("data")?.value;

    const diasTexto =
        $("dias")?.value;


    if(!dataTexto || !diasTexto){

        $("resultadoDias").innerText = "";

        return;
    }


    const dias =
        Number(diasTexto);


    if(!Number.isFinite(dias)){

        $("resultadoDias").innerText = "";

        return;
    }


    const data =
        new Date(dataTexto + "T00:00:00");

    data.setDate(
        data.getDate() + dias
    );


    $("resultadoDias").innerText =
        formatarData(data);
}


// ======================================
// STATUS
// ======================================

function gerarStatus(tipo){

    const cidade =
        $("cidade")
            ? $("cidade")
                .value
                .toUpperCase()
            : "CIDADE";


    const frete =
        $("valorFrete")
            ? $("valorFrete").value
            : "0,00";


    // FreteZOHO só faz sentido com cidade e frete preenchidos
    if(
        tipo === "FreteZOHO" &&
        (!cidade.trim() || !frete.trim())
    ){

        return mostrarToast(
            "Informe cidade e frete",
            true
        );
    }


    const saida =
        obterCidadeSaida().zoho;


    const mensagens = {


        autorizado:
            `Autorizado Via Contrato XXX - Responsável: XXX <XXX>`,


        FreteZOHO:
`- FRETE POR CONTA DO CLIENTE / FATURADOS DO TRANSPORTADOR DIRETO PARA O CLIENTE ( Boleto - 14 DD )

- Frete entrega: R$ ${frete} - ${saida} x ${cidade}
- Frete retirada: R$ ${frete} - ${cidade} x ${saida}

Transportadores Indicados:
KUNG 47 9616-5616
MAGNUS 47 9754-0321
RR 47 9180-5385`,


        FreteZOHOLocComp:
`- FRETE INCLUSO NO ITEM LOCAÇÃO COMPLEMENTAR`,


        ICMS:
            `Saida sem incidencia de ICMS cfe Cap. II, art 6 do RICMS/SC`

    };


    const texto =
        mensagens[tipo];


    if(!texto) return;


    copiar(texto, tipo + " copiado");
}


// ======================================
// INIT — CALCULADORA DE BOLETOS
// ======================================
// Só existe na index.html; os "if" abaixo garantem que
// isso não faz nada quando helpers.js é carregado em
// outra página que não tem esses campos.

(function initCalculadoraBoletos(){

    if($("data")){

        // Puxa a data de hoje sozinho, se o campo
        // estiver vazio (ex: assim que a página abre).
        if(!$("data").value){

            const hoje = new Date();

            const ano = hoje.getFullYear();

            const mes =
                String(hoje.getMonth() + 1)
                    .padStart(2, "0");

            const dia =
                String(hoje.getDate())
                    .padStart(2, "0");

            $("data").value =
                `${ano}-${mes}-${dia}`;

            calcularBoletos();
        }

        $("data")
            .addEventListener(
                "input",
                calcularBoletos
            );
    }

    if($("valor")){

        $("valor")
            .addEventListener(
                "input",
                calcularBoletos
            );
    }

    if($("dias")){

        $("dias")
            .addEventListener(
                "input",
                calcularDiasPersonalizados
            );
    }

})();