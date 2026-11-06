// ======================================
// ESTOQUE - PARSER DO EXCEL
// ======================================
// Relatório bruto -> resumo (resumirEstoque).
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// PARSER (relatório bruto -> resumo)
// ======================================
// INICIO_PARSER

function normalizarTexto(valor){

    return semAcento(valor)
        .trim()
        .toLowerCase();
}


// Modelo = 3 letras + altura (WTE14046 -> WTE14, WAE16L022 -> WAE16,
// WTE8O079 -> WTE8). Letras no fim (L = lítio, R, O...) são ignoradas,
// então WTE16L e WTE16 são o mesmo modelo. Prefixos como SUB e INUTI
// FICAM no modelo (SUBWAD2601 -> SUBWAD26, INUTIWTE16L048 -> INUTIWTE16),
// porque são diferentes do normal. A altura vem do nome do equipamento
// ("12M") quando bate com o patrimônio; senão usa o próprio patrimônio.
function modeloDoPatrimonio(patrimonio, equipamento){

    const partes =
        patrimonio.match(/^([A-Z]+?)(\d+)/);

    if(!partes) return patrimonio;

    const letras = partes[1];

    const digitos = partes[2];

    const achou =
        String(equipamento || "").match(/(\d+)\s*M\b/i);

    const alturaNome =
        achou ? achou[1] : "";

    if(
        alturaNome &&
        digitos.startsWith(alturaNome) &&
        digitos.length > alturaNome.length
    ){
        return letras + alturaNome;
    }

    return letras + (
        digitos.length > 2
            ? digitos.slice(0, 2)
            : digitos
    );
}


// Previsão de retorno: o Excel entrega data como número (serial),
// texto ISO ou texto livre ("Sem previsão"). Devolve dd/mm/aaaa
// quando é data; senão devolve o texto como veio.
function formatarPrevisao(valor){

    if(valor === null || valor === undefined) return "";

    let data = null;

    if(valor instanceof Date){

        data = new Date(valor.getTime() + 12 * 3600 * 1000);

    }else if(typeof valor === "number" && valor > 20000){

        data = new Date(
            Date.UTC(1899, 11, 30) + Math.floor(valor) * 86400000
        );

    }else if(/^\d{4}-\d{2}-\d{2}/.test(String(valor))){

        return dataBR(valor);
    }

    if(data){

        const dia =
            String(data.getUTCDate()).padStart(2, "0");

        const mes =
            String(data.getUTCMonth() + 1).padStart(2, "0");

        return `${dia}/${mes}/${data.getUTCFullYear()}`;
    }

    return String(valor).trim();
}


// Ano de fabricação: o Excel entrega número (2019), data (serial) ou texto
// ("2019", "15/03/2019"). Devolve só o ano, em texto; não achou, devolve "".
function formatarAnoFabricacao(valor){

    if(valor instanceof Date){

        return String(new Date(valor.getTime() + 12 * 3600 * 1000).getUTCFullYear());
    }

    if(typeof valor === "number"){

        if(valor > 20000){

            return String(
                new Date(Date.UTC(1899, 11, 30) + Math.floor(valor) * 86400000)
                    .getUTCFullYear()
            );
        }

        return valor >= 1900 && valor <= 2100 ? String(Math.trunc(valor)) : "";
    }

    const achou =
        String(valor ?? "").match(/\b(19|20)\d{2}\b/);

    return achou ? achou[0] : "";
}


// "12", "12 e 87", "12, 40 e 87"
function textoLinhasExcel(numeros){

    if(numeros.length < 2) return String(numeros[0] ?? "");

    return `${numeros.slice(0, -1).join(", ")} e ${numeros[numeros.length - 1]}`;
}


// linhas = matriz da planilha (array de arrays). primeiraLinha = número
// da linha do Excel de linhas[0] (para os avisos apontarem a linha certa)
function resumirEstoque(linhas, nomeArquivo, primeiraLinha = 1){

    const indiceCabecalho =
        linhas.findIndex(linha =>
            linha.some(c => normalizarTexto(c) === "patrimonio") &&
            linha.some(c => normalizarTexto(c) === "status")
        );

    if(indiceCabecalho < 0){

        throw new Error(
            "Não achei as colunas Patrimônio e Status. É o relatório de estoque?"
        );
    }

    const cabecalho =
        linhas[indiceCabecalho].map(normalizarTexto);

    const colPatrimonio =
        cabecalho.indexOf("patrimonio");

    const colStatus =
        cabecalho.indexOf("status");

    const colCliente =
        cabecalho.findIndex(c => c.startsWith("localizacao"));

    const colEquipamento =
        cabecalho.indexOf("equipamento");

    const colPrevisao =
        cabecalho.indexOf("previsao retorno");

    // marca, modelo de fábrica e ano: só guardados para a lupa da agenda
    const colMarca =
        cabecalho.findIndex(c => c.startsWith("marca") || c.startsWith("fabricante"));

    const colModeloFabrica =
        cabecalho.findIndex(c => c.startsWith("modelo"));

    // "Ano", "Ano de fabricação", "Fabricação" (mas não "Anotações")
    const colAno =
        cabecalho.findIndex(c =>
            /^ano\b/.test(c) ||
            (c.includes("fabricacao") && !c.startsWith("modelo"))
        );

    const statusPorTexto = {};

    STATUS_ESTOQUE.forEach(item => {

        statusPorTexto[normalizarTexto(item.excel)] = item.chave;
    });

    const resultado = {

        arquivo: nomeArquivo || "",

        status: {},

        totais: {},

        ignoradas: 0,

        avisos: []
    };

    STATUS_ESTOQUE.forEach(item => {

        resultado.status[item.chave] = {};

        resultado.totais[item.chave] = 0;
    });

    // patrimônio -> linhas do Excel em que apareceu (repetido = mais de uma)
    const vistos = new Map();

    const desconhecidos = new Set();

    for(let i = indiceCabecalho + 1; i < linhas.length; i++){

        const linha = linhas[i];

        const patrimonio =
            String(linha[colPatrimonio] ?? "")
                .trim()
                .toUpperCase();

        // pula linha vazia e linha "quebrada" (a de baixo, deslocada)
        if(!/^[A-Z]+\d/.test(patrimonio)) continue;

        let chave =
            statusPorTexto[normalizarTexto(linha[colStatus])];

        let equipamento =
            colEquipamento >= 0
                ? String(linha[colEquipamento] ?? "")
                : "";

        const cliente =
            colCliente >= 0
                ? String(linha[colCliente] ?? "").trim()
                : "";

        // (nos registros quebrados a previsão vem na 1ª linha, junto
        // com o patrimônio, então esta leitura já serve)
        const previsao =
            colPrevisao >= 0
                ? formatarPrevisao(linha[colPrevisao])
                : "";

        // Registro quebrado em 2 linhas: a primeira traz patrimônio
        // e cliente (sem status); o status vem na linha de baixo,
        // deslocado de coluna.
        if(!chave && !String(linha[colStatus] ?? "").trim()){

            const proxima = linhas[i + 1] || [];

            const achou =
                proxima
                    .map(normalizarTexto)
                    .find(texto => statusPorTexto[texto]);

            if(achou){

                chave = statusPorTexto[achou];

                const textoEquip =
                    proxima
                        .map(c => String(c ?? ""))
                        .find(c => /\d+\s*M\b/i.test(c));

                equipamento = textoEquip || equipamento;
            }
        }

        // status que não está na lista: não entra no resumo,
        // mas avisa na tela pra não sumir sem ninguém ver
        if(!chave){

            resultado.ignoradas++;

            desconhecidos.add(
                String(linha[colStatus] ?? "").trim() || "(vazio)"
            );

            continue;
        }

        const linhaExcel = primeiraLinha + i;

        if(vistos.has(patrimonio)){

            vistos.get(patrimonio).push(linhaExcel);

            continue;
        }

        vistos.set(patrimonio, [linhaExcel]);

        const modelo =
            modeloDoPatrimonio(patrimonio, equipamento);

        if(!resultado.status[chave][modelo]){

            resultado.status[chave][modelo] = [];
        }

        const item = { p: patrimonio };

        if(cliente) item.c = cliente;

        if(previsao) item.r = previsao;

        const marca =
            colMarca >= 0 ? String(linha[colMarca] ?? "").trim() : "";

        const modeloFabrica =
            colModeloFabrica >= 0 ? String(linha[colModeloFabrica] ?? "").trim() : "";

        if(marca) item.m = marca;

        if(modeloFabrica) item.f = modeloFabrica;

        const ano =
            colAno >= 0 ? formatarAnoFabricacao(linha[colAno]) : "";

        if(ano) item.a = ano;

        if(equipamento.trim()) item.e = equipamento.trim();

        resultado.status[chave][modelo].push(item);

        resultado.totais[chave]++;
    }

    if(desconhecidos.size){

        resultado.avisos.push(
            `${resultado.ignoradas} linha(s) com status não reconhecido ficaram de fora: ${[...desconhecidos].join(", ")}`
        );
    }

    // quais são e em que linhas, para corrigir no relatório
    const repetidos =
        [...vistos].filter(([, numeros]) => numeros.length > 1);

    if(repetidos.length){

        const lista =
            repetidos
                .map(([patrimonio, numeros]) => `${patrimonio} (linhas ${textoLinhasExcel(numeros)})`)
                .join(", ");

        resultado.avisos.push(
            `${repetidos.length} patrimônio(s) repetido(s) no arquivo (contados uma vez): ${lista}`
        );
    }

    if(colMarca < 0){

        resultado.avisos.push(
            "Não achei a coluna Marca no relatório: a lupa da agenda mostra o nome do equipamento no lugar."
        );
    }

    if(colAno < 0){

        resultado.avisos.push(
            "Não achei a coluna de ano de fabricação no relatório: a lupa da agenda fica sem o ano."
        );
    }

    const totalGeral =
        Object.values(resultado.totais)
            .reduce((soma, n) => soma + n, 0);

    if(!totalGeral){

        throw new Error(
            "Nenhuma máquina com status reconhecido foi encontrada."
        );
    }

    return resultado;
}

// FIM_PARSER
