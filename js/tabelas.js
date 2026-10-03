// ======================================
// TABELAS (ADMIN)
// ======================================
// Consulta das tabelas do Supabase (qualquer usuário logado) e
// edição direta só para admin (app_metadata.role = "admin"): as
// policies de RLS bloqueiam insert/update/delete para os demais.
// Depende de helpers.js e auth-guard.js (precisam vir antes).

// ======================================
// CONFIGURAÇÃO DAS TABELAS
// ======================================
// obrigatorio = não aceita vazio
// tipo "numeric" = número (aceita vírgula, ex: 1.234,56)

const TABELAS = {

    tabela_precos: {

        nome: "Preços (tabela_precos)",

        colunas: [
            { campo: "modelo", tipo: "text", obrigatorio: true },
            { campo: "dias", tipo: "text", obrigatorio: true },
            { campo: "valor", tipo: "numeric", obrigatorio: true }
        ],

        // consulta: linhas = modelo, colunas = dias, valor no meio
        matriz: { linha: ["modelo"], coluna: "dias", numerico: true }
    },

    tabela_fretes: {

        nome: "Fretes (tabela_fretes)",

        colunas: [
            { campo: "transportadora", tipo: "text", obrigatorio: true },
            { campo: "modelo", tipo: "text", obrigatorio: true },
            { campo: "cidade", tipo: "text", obrigatorio: true },
            { campo: "valor", tipo: "text", obrigatorio: false }
        ],

        // consulta: linhas = transportadora + modelo, colunas = cidade
        matriz: { linha: ["transportadora", "modelo"], coluna: "cidade" }
    },

    frete_dionizio: {

        nome: "Frete Dionizio (frete_dionizio)",

        colunas: [
            { campo: "modelo", tipo: "text", obrigatorio: true },
            { campo: "cidade", tipo: "text", obrigatorio: true },
            { campo: "valor", tipo: "text", obrigatorio: false }
        ],

        // consulta: linhas = modelo, colunas = cidade, valor no meio
        matriz: { linha: ["modelo"], coluna: "cidade" }
    },

    frete_magnus: {

        nome: "Frete Magnus (frete_magnus)",

        colunas: [
            { campo: "modelo", tipo: "text", obrigatorio: true },
            { campo: "cidade", tipo: "text", obrigatorio: true },
            { campo: "valor", tipo: "text", obrigatorio: false }
        ],

        // consulta: linhas = modelo, colunas = cidade, valor no meio
        matriz: { linha: ["modelo"], coluna: "cidade" }
    }
};


// mesmos períodos válidos da tabela de preços
const DIAS_VALIDOS_TABELA = [
    "1", "2", "3", "4", "5", "6", "7",
    "10", "14", "15", "21", "28", "30"
];

// máximo de linhas desenhadas na tela de uma vez (o filtro
// busca em todas, mas só desenha as primeiras)
const LIMITE_LINHAS_TELA = 200;

let tabelaAtual = "tabela_precos";

let linhasAtuais = [];

// admin logado (definido no init). Só ele vê o botão de editar.
let ehAdminLogado = false;

// false = consulta (matriz, igual pra todos); true = editor (só admin)
let podeEditar = false;


// ======================================
// TRATAR VALOR DIGITADO
// ======================================
// Devolve { valor } pronto pro banco ou { erro }.

function tratarValor(tabela, campo, texto){

    const coluna =
        TABELAS[tabela].colunas.find(
            item => item.campo === campo
        );

    let valor =
        String(texto ?? "")
            .trim()
            .replace(/\s+/g, " ");

    // modelo e cidade sempre em maiúsculas (como o sistema lê)
    if(campo === "modelo" || campo === "cidade"){

        valor = valor.toUpperCase();
    }

    if(!valor){

        if(coluna.obrigatorio){

            return { erro: `${campo} é obrigatório` };
        }

        return { valor: null };
    }

    if(coluna.tipo === "numeric"){

        const numero = brToNumber(valor);

        if(!Number.isFinite(numero)){

            return { erro: "Valor inválido" };
        }

        return { valor: numero };
    }

    if(
        tabela === "tabela_precos" &&
        campo === "dias" &&
        !DIAS_VALIDOS_TABELA.includes(valor)
    ){

        return {
            erro: `Dias inválido (use: ${DIAS_VALIDOS_TABELA.join(", ")})`
        };
    }

    return { valor: valor };
}


// ======================================
// CARREGAR LINHAS
// ======================================
// O Supabase devolve no máximo 1000 linhas por consulta,
// então busca em páginas até acabar.

async function carregarLinhasTabela(){

    $("contagemTabela").innerText = "Carregando...";

    const tamanhoPagina = 1000;

    let inicio = 0;

    let todas = [];

    try{

        while(true){

            const { data, error } =
                await supabaseClient
                    .from(tabelaAtual)
                    .select("*")
                    .order("id")
                    .range(inicio, inicio + tamanhoPagina - 1);

            if(error) throw error;

            todas = todas.concat(data);

            if(data.length < tamanhoPagina) break;

            inicio += tamanhoPagina;
        }

        linhasAtuais = todas;

    }catch(erro){

        console.error("[tabelas] Falha ao carregar:", erro);

        linhasAtuais = [];

        mostrarToast("Falha ao carregar a tabela", true);
    }

    desenharTabela();
}


// ======================================
// DESENHAR TABELA
// ======================================

function criarCampo(valor, campo){

    const input =
        document.createElement("input");

    input.type = "text";

    input.value = valor ?? "";

    input.dataset.campo = campo;

    return input;
}


function desenharTabela(){

    const config =
        TABELAS[tabelaAtual];

    const filtro =
        $("filtroTabela").value
            .trim()
            .toLowerCase();

    // consulta: matriz (linhas = modelo, colunas = dias/cidades)
    if(!podeEditar){

        return desenharMatriz(config, filtro);
    }


    // ---------- cabeçalho ----------

    const cabecalho = $("cabecalhoTabela");

    cabecalho.innerHTML = "";

    const linhaCab =
        document.createElement("tr");

    ["id", ...config.colunas.map(c => c.campo), ""]
        .forEach(titulo => {

            const th = document.createElement("th");

            th.innerText = titulo;

            linhaCab.appendChild(th);
        });

    cabecalho.appendChild(linhaCab);


    // ---------- corpo ----------

    const corpo = $("corpoTabela");

    corpo.innerHTML = "";

    // linha de adicionar (sempre no topo)
    corpo.appendChild(criarLinhaNova(config));

    const filtradas =
        linhasAtuais.filter(linha => {

            if(!filtro) return true;

            return config.colunas.some(coluna =>
                String(linha[coluna.campo] ?? "")
                    .toLowerCase()
                    .includes(filtro)
            );
        });

    filtradas
        .slice(0, LIMITE_LINHAS_TELA)
        .forEach(linha => {

            corpo.appendChild(
                criarLinhaTabela(config, linha)
            );
        });

    $("contagemTabela").innerText =
        filtradas.length > LIMITE_LINHAS_TELA
            ? `Mostrando ${LIMITE_LINHAS_TELA} de ${filtradas.length} (use o filtro)`
            : `${filtradas.length} linhas`;
}


// ======================================
// CONSULTA (matriz)
// ======================================
// Linhas = modelo (e transportadora, na tabela_fretes),
// colunas = dias (preços) ou cidade (fretes), valor no meio.
// O filtro procura primeiro nas linhas; se nenhuma bater,
// procura nas colunas (ex: filtrar uma cidade).

function desenharMatriz(config, filtro){

    const regra = config.matriz;

    const ordenarTexto = (a, b) =>
        String(a).localeCompare(String(b), "pt-BR", { numeric: true });

    const mapa = {};

    const rotulosLinhas = new Map();

    const colunasSet = new Set();

    linhasAtuais.forEach(linha => {

        const partes =
            regra.linha.map(campo => String(linha[campo] ?? ""));

        const chaveLinha = partes.join("\u0001");

        const coluna = String(linha[regra.coluna] ?? "");

        rotulosLinhas.set(chaveLinha, partes);

        colunasSet.add(coluna);

        mapa[chaveLinha + "\u0002" + coluna] = linha.valor;
    });

    let linhas =
        [...rotulosLinhas.entries()]
            .sort((a, b) =>
                ordenarTexto(a[1].join(" "), b[1].join(" "))
            );

    let colunas =
        [...colunasSet]
            .sort(
                regra.numerico
                    ? (a, b) => Number(a) - Number(b)
                    : ordenarTexto
            );

    if(filtro){

        const linhasFiltradas =
            linhas.filter(([, partes]) =>
                partes.join(" ").toLowerCase().includes(filtro)
            );

        if(linhasFiltradas.length){

            linhas = linhasFiltradas;

        }else{

            colunas =
                colunas.filter(coluna =>
                    coluna.toLowerCase().includes(filtro)
                );
        }
    }


    // ---------- cabeçalho ----------

    const cabecalho = $("cabecalhoTabela");

    cabecalho.innerHTML = "";

    const linhaCab = document.createElement("tr");

    const thRotulo = document.createElement("th");

    thRotulo.className = "col-rotulo";

    thRotulo.innerText = regra.linha.join(" / ");

    linhaCab.appendChild(thRotulo);

    colunas.forEach(coluna => {

        const th = document.createElement("th");

        th.innerText = coluna;

        linhaCab.appendChild(th);
    });

    cabecalho.appendChild(linhaCab);


    // ---------- corpo ----------

    const corpo = $("corpoTabela");

    corpo.innerHTML = "";

    linhas.forEach(([chaveLinha, partes]) => {

        const tr = document.createElement("tr");

        const tdRotulo = document.createElement("td");

        tdRotulo.className = "col-rotulo";

        tdRotulo.innerText = partes.join(" / ");

        tr.appendChild(tdRotulo);

        colunas.forEach(coluna => {

            const td = document.createElement("td");

            const valor = mapa[chaveLinha + "\u0002" + coluna];

            if(valor !== undefined && valor !== null && valor !== ""){

                td.innerText =
                    regra.numerico || typeof valor === "number"
                        ? formatarMoedaBR(valor)
                        : valor;
            }

            tr.appendChild(td);
        });

        corpo.appendChild(tr);
    });

    $("contagemTabela").innerText =
        `${linhas.length} linhas`;
}


function criarLinhaTabela(config, linha){

    const tr = document.createElement("tr");

    tr.dataset.id = linha.id;

    const tdId = document.createElement("td");

    tdId.className = "col-id";

    tdId.innerText = linha.id;

    tr.appendChild(tdId);

    config.colunas.forEach(coluna => {

        const td = document.createElement("td");

        const input =
            criarCampo(linha[coluna.campo], coluna.campo);

        input.addEventListener(
            "change",
            () => salvarCampo(linha, input)
        );

        td.appendChild(input);

        tr.appendChild(td);
    });

    const tdAcao = document.createElement("td");

    tdAcao.className = "col-acao";

    const botao = document.createElement("button");

    botao.type = "button";

    botao.className = "btn-excluir";

    botao.title = "Excluir linha";

    botao.innerText = "🗑️";

    botao.addEventListener(
        "click",
        () => excluirLinha(linha)
    );

    tdAcao.appendChild(botao);

    tr.appendChild(tdAcao);

    return tr;
}


function criarLinhaNova(config){

    const tr = document.createElement("tr");

    tr.className = "linha-nova";

    const tdId = document.createElement("td");

    tdId.className = "col-id";

    tdId.innerText = "novo";

    tr.appendChild(tdId);

    config.colunas.forEach(coluna => {

        const td = document.createElement("td");

        const input =
            criarCampo("", coluna.campo);

        input.placeholder = coluna.campo;

        td.appendChild(input);

        tr.appendChild(td);
    });

    const tdAcao = document.createElement("td");

    tdAcao.className = "col-acao";

    const botao = document.createElement("button");

    botao.type = "button";

    botao.className = "btn-adicionar";

    botao.title = "Adicionar linha";

    botao.innerText = "+";

    botao.addEventListener(
        "click",
        () => adicionarLinha(tr)
    );

    tdAcao.appendChild(botao);

    tr.appendChild(tdAcao);

    return tr;
}


// ======================================
// SALVAR CAMPO (update)
// ======================================

async function salvarCampo(linha, input){

    const campo = input.dataset.campo;

    const resultado =
        tratarValor(tabelaAtual, campo, input.value);

    if(resultado.erro){

        input.classList.add("erro");

        // volta pro valor que estava salvo
        input.value = linha[campo] ?? "";

        return mostrarToast(resultado.erro, true);
    }

    // nada mudou
    if(String(resultado.valor ?? "") === String(linha[campo] ?? "")){

        input.value = linha[campo] ?? "";

        input.classList.remove("erro");

        return;
    }

    input.classList.remove("erro");

    input.classList.add("salvando");

    // .select() devolve as linhas alteradas: se vier vazio,
    // o RLS bloqueou (sem erro explícito) — não é admin.
    const { data, error } =
        await supabaseClient
            .from(tabelaAtual)
            .update({ [campo]: resultado.valor })
            .eq("id", linha.id)
            .select();

    input.classList.remove("salvando");

    if(error || !data || !data.length){

        console.error("[tabelas] Falha ao salvar:", error);

        input.classList.add("erro");

        input.value = linha[campo] ?? "";

        return mostrarToast(
            error
                ? "Erro ao salvar"
                : "Sem permissão para alterar (entre como admin)",
            true
        );
    }

    linha[campo] = data[0][campo];

    input.value = linha[campo] ?? "";

    mostrarToast("Salvo");
}


// ======================================
// ADICIONAR LINHA (insert)
// ======================================

async function adicionarLinha(tr){

    const config =
        TABELAS[tabelaAtual];

    const novo = {};

    for(const coluna of config.colunas){

        const input =
            tr.querySelector(`input[data-campo="${coluna.campo}"]`);

        const resultado =
            tratarValor(tabelaAtual, coluna.campo, input.value);

        if(resultado.erro){

            input.classList.add("erro");

            return mostrarToast(resultado.erro, true);
        }

        input.classList.remove("erro");

        novo[coluna.campo] = resultado.valor;
    }

    const { data, error } =
        await supabaseClient
            .from(tabelaAtual)
            .insert(novo)
            .select();

    if(error || !data || !data.length){

        console.error("[tabelas] Falha ao adicionar:", error);

        return mostrarToast(
            error
                ? "Erro ao adicionar"
                : "Sem permissão para adicionar (entre como admin)",
            true
        );
    }

    // entra no topo da lista local e redesenha
    linhasAtuais.unshift(data[0]);

    // o filtro some pra a linha nova aparecer
    $("filtroTabela").value = "";

    desenharTabela();

    mostrarToast("Linha adicionada");
}


// ======================================
// EXCLUIR LINHA (delete)
// ======================================

async function excluirLinha(linha){

    const config =
        TABELAS[tabelaAtual];

    const descricao =
        config.colunas
            .map(coluna => linha[coluna.campo])
            .join(" / ");

    if(!confirm(`Excluir esta linha?\n\n${descricao}`)) return;

    const { data, error } =
        await supabaseClient
            .from(tabelaAtual)
            .delete()
            .eq("id", linha.id)
            .select();

    if(error || !data || !data.length){

        console.error("[tabelas] Falha ao excluir:", error);

        return mostrarToast(
            error
                ? "Erro ao excluir"
                : "Sem permissão para excluir (entre como admin)",
            true
        );
    }

    linhasAtuais =
        linhasAtuais.filter(item => item.id !== linha.id);

    desenharTabela();

    mostrarToast("Linha excluída");
}


// ======================================
// MODO CONSULTA / EDIÇÃO
// ======================================

function atualizarModo(){

    const tabela = document.querySelector(".tabela-editor");

    tabela.classList.toggle("tabela-matriz", !podeEditar);

    $("tituloTabelas").innerText =
        podeEditar ? "Editar tabelas" : "Consultar tabelas";

    $("avisoEdicao").innerText =
        podeEditar
            ? "A alteração é salva sozinha ao sair do campo."
            : (
                ehAdminLogado
                    ? "Clique em Editar para alterar os valores."
                    : "Somente consulta."
            );

    $("btnModoEdicao").innerText =
        podeEditar ? "👁 Consultar" : "✏️ Editar";

    desenharTabela();
}


function alternarModoEdicao(){

    if(!ehAdminLogado) return;

    podeEditar = !podeEditar;

    $("filtroTabela").value = "";

    atualizarModo();
}


// ======================================
// INIT
// ======================================

(async function init(){

    // todo mundo consulta; só o admin vê o botão de editar
    ehAdminLogado = await ehAdmin();

    if(ehAdminLogado){

        $("btnModoEdicao").style.display = "";
    }

    const select = $("selectTabela");

    Object.keys(TABELAS).forEach(chave => {

        const opcao = document.createElement("option");

        opcao.value = chave;

        opcao.innerText = TABELAS[chave].nome;

        select.appendChild(opcao);
    });

    select.addEventListener(
        "change",
        () => {

            tabelaAtual = select.value;

            $("filtroTabela").value = "";

            carregarLinhasTabela();
        }
    );

    $("filtroTabela").addEventListener(
        "input",
        desenharTabela
    );

    atualizarModo();

    carregarLinhasTabela();

})();
