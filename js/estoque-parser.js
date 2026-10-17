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

    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
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

        const [ano, mes, dia] =
            String(valor).slice(0, 10).split("-");

        return `${dia}/${mes}/${ano}`;
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


// linhas = matriz da planilha (array de arrays)
function resumirEstoque(linhas, nomeArquivo){

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

    const vistos = new Set();

    const desconhecidos = new Set();

    let duplicados = 0;

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

        if(vistos.has(patrimonio)){

            duplicados++;

            continue;
        }

        vistos.add(patrimonio);

        const modelo =
            modeloDoPatrimonio(patrimonio, equipamento);

        if(!resultado.status[chave][modelo]){

            resultado.status[chave][modelo] = [];
        }

        const item = { p: patrimonio };

        if(cliente) item.c = cliente;

        if(previsao) item.r = previsao;

        resultado.status[chave][modelo].push(item);

        resultado.totais[chave]++;
    }

    if(desconhecidos.size){

        resultado.avisos.push(
            `${resultado.ignoradas} linha(s) com status não reconhecido ficaram de fora: ${[...desconhecidos].join(", ")}`
        );
    }

    if(duplicados){

        resultado.avisos.push(
            `${duplicados} patrimônio(s) repetido(s) no arquivo (contados uma vez)`
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
