// ======================================
// CONSULTAR TABELAS
// ======================================
// Só leitura: mostra tabela_precos e tabela_fretes
// (uma aba por transportadora).
// Depende de helpers.js (precisa vir carregado antes).

// ======================================
// DADOS
// ======================================

// { MODELO: { dias: valor } }
let precosTabela = {};

// { transportadora: { MODELO: { CIDADE: valor } } }
let fretesTabela = {};

// nome "bonito" de cada cidade (chave sem acento -> nome exibido)
let nomesCidadesTabela = {};

// abas: [{ tipo: "precos" } | { tipo: "frete", nome: "Magnus" }]
let abasTabelas = [];

let abaAtual = 0;

// Avisos (cópia offline em uso / falha de carregamento)
let avisosTabelas = [];


// ======================================
// NORMALIZAR
// ======================================

function normalizarModeloTabela(valor){

    return String(valor || "")
        .replace(/\uFEFF/g, "")
        .trim()
        .toUpperCase();
}


function normalizarCidadeTabela(valor){

    return String(valor || "")
        .replace(/\uFEFF/g, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}


// ======================================
// CARREGAR (Supabase, com cópia offline como reserva)
// ======================================
// Usa as mesmas cópias que a página de propostas grava
// no localStorage (cacheTabelaPrecos / cacheTabelaFretes).

function lerCopiaOffline(chave){

    try{

        const salvo =
            localStorage.getItem(chave);

        if(!salvo) return null;

        const copia =
            JSON.parse(salvo);

        if(
            !copia ||
            !Array.isArray(copia.linhas) ||
            !copia.linhas.length
        ){
            return null;
        }

        return copia;

    }catch(erro){

        return null;
    }
}


function formatarDataHora(iso){

    return new Date(iso).toLocaleString(
        "pt-BR",
        { dateStyle: "short", timeStyle: "short" }
    );
}


async function buscarLinhas(buscar, chaveCache, rotulo){

    try{

        return await buscar();

    }catch(erro){

        console.error(`[${rotulo}] Falha ao carregar:`, erro);

        const copia =
            lerCopiaOffline(chaveCache);

        if(copia){

            avisosTabelas.push({
                texto: `⚠️ ${rotulo}: sem conexão, usando cópia salva em ${formatarDataHora(copia.salvoEm)}. Os valores podem estar desatualizados.`,
                erro: false
            });

            return copia.linhas;
        }

        avisosTabelas.push({
            texto: `⚠️ ${rotulo} não carregada (verifique conexão/login)`,
            erro: true
        });

        return [];
    }
}


function processarPrecos(linhas){

    precosTabela = {};

    linhas.forEach(linha => {

        const modelo =
            normalizarModeloTabela(linha.modelo);

        if(!modelo) return;

        const valor =
            Number(linha.valor);

        if(isNaN(valor)) return;

        if(!precosTabela[modelo]){
            precosTabela[modelo] = {};
        }

        precosTabela[modelo][linha.dias] = valor;
    });
}


function processarFretes(linhas){

    fretesTabela = {};

    nomesCidadesTabela = {};

    linhas.forEach(linha => {

        const transportador =
            linha.transportadora;

        const modelo =
            normalizarModeloTabela(linha.modelo);

        const cidade =
            normalizarCidadeTabela(linha.cidade);

        if(!transportador || !modelo || !cidade) return;

        if(!fretesTabela[transportador]){
            fretesTabela[transportador] = {};
        }

        if(!fretesTabela[transportador][modelo]){
            fretesTabela[transportador][modelo] = {};
        }

        fretesTabela[transportador][modelo][cidade] =
            linha.valor;

        nomesCidadesTabela[cidade] =
            String(linha.cidade)
                .trim()
                .replace(/\s+/g, " ")
                .toUpperCase();
    });
}


// ======================================
// ABAS
// ======================================

function montarAbas(){

    abasTabelas = [{ tipo: "precos" }];

    Object.keys(fretesTabela)
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .forEach(nome => {

            abasTabelas.push({
                tipo: "frete",
                nome: nome
            });
        });

    const container =
        $("abasTabelas");

    container.innerHTML = "";

    abasTabelas.forEach((aba, indice) => {

        const botao =
            document.createElement("button");

        botao.type = "button";

        botao.className =
            "btn-toggle" +
            (indice === abaAtual ? " ativo" : "");

        botao.innerText =
            aba.tipo === "precos"
                ? "💰 Tabela de preços"
                : "🚚 Frete: " + aba.nome;

        botao.onclick = () => {

            abaAtual = indice;

            $("buscaTabela").value = "";

            montarAbas();

            renderizarTabela();
        };

        container.appendChild(botao);
    });
}


// ======================================
// RENDERIZAR
// ======================================

function celulaValor(valor){

    if(valor === undefined || valor === null || valor === ""){

        return `<td class="vazio">—</td>`;
    }

    // valor numérico vira moeda BR; texto (ex: "1.200,00") aparece como está
    const texto =
        typeof valor === "number"
            ? formatarMoedaBR(valor)
            : String(valor);

    return `<td>${texto}</td>`;
}


function renderizarPrecos(busca){

    const modelos =
        Object.keys(precosTabela)
            .sort()
            .filter(modelo => modelo.includes(busca));

    const dias =
        [...new Set(
            Object.values(precosTabela)
                .flatMap(item => Object.keys(item))
        )]
        .map(Number)
        .sort((a, b) => a - b);

    if(!modelos.length){

        $("infoTabela").innerText = "";

        return "<p style='padding:16px'>Nenhum modelo encontrado</p>";
    }

    let html = `
        <table class="tabela-dados">
            <thead>
                <tr>
                    <th>Modelo</th>
                    ${dias.map(d => `<th>${d} ${d === 1 ? "dia" : "dias"}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
    `;

    modelos.forEach(modelo => {

        html += `<tr><td>${modelo}</td>`;

        dias.forEach(d => {
            html += celulaValor(precosTabela[modelo][d]);
        });

        html += `</tr>`;
    });

    html += `</tbody></table>`;

    $("infoTabela").innerText =
        `${modelos.length} modelos · valores em R$`;

    return html;
}


function renderizarFrete(transportador, busca){

    const dadosTransportador =
        fretesTabela[transportador] || {};

    // mesma ordem do banco (igual à planilha): modelos nas
    // linhas, cidades nas colunas
    const modelos =
        Object.keys(dadosTransportador);

    const buscaCidade =
        normalizarCidadeTabela(busca);

    const cidades =
        [...new Set(
            modelos.flatMap(modelo =>
                Object.keys(dadosTransportador[modelo])
            )
        )]
        .filter(cidade => cidade.includes(buscaCidade));

    if(!cidades.length){

        $("infoTabela").innerText = "";

        return "<p style='padding:16px'>Nenhuma cidade encontrada</p>";
    }

    let html = `
        <table class="tabela-dados">
            <thead>
                <tr>
                    <th>Modelo</th>
                    ${cidades.map(c => `<th>${nomesCidadesTabela[c] || c}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
    `;

    modelos.forEach(modelo => {

        html += `<tr><td>${modelo}</td>`;

        cidades.forEach(cidade => {
            html += celulaValor(dadosTransportador[modelo][cidade]);
        });

        html += `</tr>`;
    });

    html += `</tbody></table>`;

    $("infoTabela").innerText =
        `${modelos.length} modelos · ${cidades.length} cidades · valores em R$`;

    return html;
}


function renderizarTabela(){

    const aba =
        abasTabelas[abaAtual];

    const campoBusca =
        $("buscaTabela");

    if(!aba) return;

    const busca =
        campoBusca.value.trim();

    let html;

    if(aba.tipo === "precos"){

        campoBusca.placeholder = "Buscar modelo...";

        html = renderizarPrecos(busca.toUpperCase());

    }else{

        campoBusca.placeholder = "Buscar cidade...";

        html = renderizarFrete(aba.nome, busca);
    }

    $("conteudoTabela").innerHTML = html;
}


function renderizarAvisos(){

    $("avisoTabelas").innerHTML =
        avisosTabelas
            .map(aviso =>
                `<div class="aviso-tabelas${aviso.erro ? " erro" : ""}">${aviso.texto}</div>`
            )
            .join("");
}


// ======================================
// INIT
// ======================================

(async function init(){

    const [linhasPrecos, linhasFretes] =
        await Promise.all([

            buscarLinhas(
                async () => {

                    const { data, error } =
                        await supabaseClient
                            .from("tabela_precos")
                            .select("modelo, dias, valor");

                    if(error) throw error;

                    return data || [];
                },
                "cacheTabelaPrecos",
                "Tabela de preços"
            ),

            buscarLinhas(
                buscarLinhasFretes,
                "cacheTabelaFretes",
                "Tabelas de fretes"
            )
        ]);

    processarPrecos(linhasPrecos);

    processarFretes(linhasFretes);

    renderizarAvisos();

    montarAbas();

    renderizarTabela();

    $("buscaTabela")
        .addEventListener(
            "input",
            renderizarTabela
        );

})();
