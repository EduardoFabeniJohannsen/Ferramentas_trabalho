// ======================================
// PROPOSTAS - CSV (tabela de preços e fretes)
// ======================================
// Carregamento dos arquivos tabela.csv e frete_*.csv, montagem
// dos datalists de equipamento/cidade e consulta de frete por
// cidade. Depende de helpers.js (precisa vir carregado antes).

let tabelaPrecos = {};

let tabelasFrete = {};


// ======================================
// NORMALIZAR MODELO
// ======================================

function normalizarModelo(valor){

    return String(valor || "")
        .replace(/\uFEFF/g, "")
        .trim()
        .toUpperCase();
}


// ======================================
// CARREGAR TABELA DE PREÇOS
// ======================================

async function carregarTabela() {

    try {

        const resposta = await fetch("./tabela.csv");

        if (!resposta.ok) {
            throw new Error(
                `Erro HTTP ${resposta.status} ao carregar tabela.csv`
            );
        }

        const texto = await resposta.text();

        const linhas = texto
            .replace(/^\uFEFF/, "")
            .trim()
            .split(/\r?\n/);

        if (linhas.length < 2) {
            throw new Error("tabela.csv está vazia");
        }

        const cabecalho = linhas[0]
            .split(";")
            .map(item => item.trim());

        tabelaPrecos = {};

        for (let i = 1; i < linhas.length; i++) {

            if (!linhas[i].trim()) continue;

            const colunas = linhas[i]
                .split(";")
                .map(item => item.trim());

            let modelo = colunas[0]
                .replace(/^\uFEFF/, "")
                .trim()
                .toUpperCase();

            // Corrige possíveis diferenças no CSV
            modelo = modelo.replace(/\s+/g, "");

            if (!modelo) continue;

            tabelaPrecos[modelo] = {};

            for (let j = 1; j < cabecalho.length; j++) {

                const dias = cabecalho[j].trim();

                const valorTexto = colunas[j];

                if (
                    valorTexto === undefined ||
                    valorTexto === ""
                ) {
                    continue;
                }

                // Se tiver vírgula, é formato BR (1.234,56).
                // Se não tiver, é ponto decimal simples (913.5),
                // que é o formato real do tabela.csv.
                const valorFinal =
                    valorTexto.includes(",")
                        ? parseFloat(
                            valorTexto
                                .replace(/\./g, "")
                                .replace(",", ".")
                        )
                        : parseFloat(valorTexto);

                if (!isNaN(valorFinal)) {
                    tabelaPrecos[modelo][dias] = valorFinal;
                }
            }
        }

        console.log(
            "Tabela carregada:",
            Object.keys(tabelaPrecos)
        );

        console.log(
            "WTE10:",
            tabelaPrecos["WTE10"]
        );

        preencherListaEquipamentos();

    } catch (erro) {

        console.error(
            "ERRO AO CARREGAR tabela.csv:",
            erro
        );

    }
}


// ======================================
// CARREGAR FRETES
// ======================================

async function carregarFretes(){

    const arquivos =
        TRANSPORTADORAS_FRETE.map(
            nome => `frete_${nome}.csv`
        );


    for(const arquivo of arquivos){

        try{

            const resposta =
                await fetch(
                    arquivo,
                    {cache:"no-store"}
                );


            if(!resposta.ok){

                throw new Error(
                    `HTTP ${resposta.status}`
                );
            }


            const texto =
                await resposta.text();


            const linhas =
                texto
                    .replace(/\r/g, "")
                    .trim()
                    .split("\n");


            if(!linhas.length) continue;


            const cabecalho =
                linhas[0]
                    .replace(/^\uFEFF/, "")
                    .split(";")
                    .map(item =>
                        item
                            .trim()
                            .toUpperCase()
                    );


            const transportador =
                arquivo
                    .replace("frete_", "")
                    .replace(".csv", "");


            tabelasFrete[transportador] = {};


            for(
                let i = 1;
                i < linhas.length;
                i++
            ){

                if(!linhas[i].trim()) continue;


                const colunas =
                    linhas[i].split(";");


                const modelo =
                    normalizarModelo(
                        colunas[0]
                    );


                if(!modelo) continue;


                tabelasFrete[
                    transportador
                ][modelo] = {};


                for(
                    let j = 1;
                    j < cabecalho.length;
                    j++
                ){

                    const cidade =
                        cabecalho[j];


                    const valor =
                        colunas[j]
                            ?.trim();


                    tabelasFrete[
                        transportador
                    ][modelo][cidade] =
                        valor;
                }
            }


        }catch(erro){

            console.error(
                "Erro no arquivo:",
                arquivo,
                erro
            );
        }
    }


    console.log(
        "Fretes carregados:",
        tabelasFrete
    );

    preencherListaCidades();
}


// ======================================
// LISTAS DE SUGESTÃO (datalists)
// ======================================
// Geradas automaticamente a partir dos dados carregados,
// em vez de ficarem digitadas fixas no HTML.

function preencherListaEquipamentos(){

    const lista =
        $("listaEquipamentos");

    if(!lista) return;

    const modelos =
        Object.keys(tabelaPrecos).sort();

    lista.innerHTML =
        modelos
            .map(modelo => `<option value="${modelo}">`)
            .join("");
}


function preencherListaCidades(){

    const lista =
        $("listaCidades");

    if(!lista) return;

    // une as cidades de TODAS as transportadoras
    // (não só as que todo mundo atende)
    const cidades = new Set();

    Object.values(tabelasFrete).forEach(modelos => {

        Object.values(modelos).forEach(cidadesModelo => {

            Object.keys(cidadesModelo).forEach(cidade => {

                if(cidade) cidades.add(cidade);
            });
        });
    });

    const cidadesOrdenadas =
        Array.from(cidades).sort();

    lista.innerHTML =
        cidadesOrdenadas
            .map(cidade => `<option value="${cidade}">`)
            .join("");
}


// ======================================
// FRETES
// ======================================

function mostrarFretes(){

    const modelos =
        obterEquipamentos();


    const cidade =
        normalizarModelo(
            $("cidade")?.value
        );


    if(
        !modelos.length ||
        !cidade
    ){

        if($("resultadoFretes")){

            $("resultadoFretes").innerHTML =
                "Nenhum frete consultado";
        }

        return;
    }


    let html = "";


    for(
        const equipamento
        of modelos
    ){

        html += `
            <div class="frete-item">
                <strong>
                    ${equipamento.quantidade > 1
                        ? equipamento.quantidade + " "
                        : ""
                    }${equipamento.modelo}
                </strong>
                <br>
            `;


        for(
            const transportador
            in tabelasFrete
        ){

            const modeloTabela =
                tabelasFrete[
                    transportador
                ][
                    equipamento.modelo
                ];


            if(!modeloTabela){

                html += `
                    ⚠️ ${transportador}:
                    modelo não encontrado
                    <br>
                `;

                continue;
            }


            const valor =
                modeloTabela[cidade];


            if(
                valor === undefined ||
                valor === ""
            ){

                html += `
                    ⚠️ ${transportador}:
                    cidade não encontrada
                    <br>
                `;

            }else{

                html += `
                    ✅ ${transportador}:
                    R$ ${valor}
                    <br>
                `;
            }

        }


        html += `
            </div>
        `;
    }


    $("resultadoFretes").innerHTML =
        html;
}
