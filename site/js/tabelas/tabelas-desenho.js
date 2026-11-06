// ======================================
// TABELAS - DESENHO (consulta)
// ======================================
// desenharTabela() e matriz de consulta.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

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
