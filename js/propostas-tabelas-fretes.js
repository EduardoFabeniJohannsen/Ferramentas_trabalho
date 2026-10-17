// ======================================
// PROPOSTAS - TABELA DE FRETES
// ======================================
// Carregamento de tabela_fretes.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// CARREGAR FRETES
// ======================================

function processarLinhasFretes(linhas){

    tabelasFrete = {};

    nomesCidades = {};

    linhas.forEach(linha => {

        const transportador =
            linha.transportadora;

        const modelo =
            normalizarModelo(linha.modelo);

        const cidade =
            normalizarCidade(linha.cidade);

        if(!modelo || !cidade) return;

        if(!tabelasFrete[transportador]){
            tabelasFrete[transportador] = {};
        }

        if(!tabelasFrete[transportador][modelo]){
            tabelasFrete[transportador][modelo] = {};
        }

        tabelasFrete[transportador][modelo][cidade] =
            linha.valor;

        nomesCidades[cidade] =
            String(linha.cidade)
                .trim()
                .replace(/\s+/g, " ")
                .toUpperCase();
    });
}


async function carregarFretes(){

    erroTabelaFretes = "";

    tabelaFretesSalvaEm = "";

    try{

        const { data, error } =
            await supabaseClient
                .from("tabela_fretes")
                .select("transportadora, modelo, cidade, valor");

        if(error){
            throw error;
        }

        processarLinhasFretes(data);

        // Sem erro mas sem nenhuma linha: quase sempre é
        // login/permissão (RLS) bloqueando, ou tabela vazia.
        if(!Object.keys(tabelasFrete).length){

            erroTabelaFretes =
                "Tabela de fretes vazia (verifique login/permissões)";

            console.warn(
                "[tabela_fretes] Nenhuma linha retornada"
            );

        }else{

            // deu certo: atualiza a cópia offline
            salvarCopiaTabela(
                CHAVE_CACHE_TABELA_FRETES,
                data
            );

            console.log(
                `[tabela_fretes] ${data.length} linhas, ${Object.keys(tabelasFrete).length} transportadoras, ${Object.keys(nomesCidades).length} cidades carregadas`
            );
        }

    }catch(erro){

        console.error(
            "[tabela_fretes] Falha ao carregar:",
            {
                mensagem: erro?.message,
                codigo: erro?.code,
                detalhes: erro?.details,
                dica: erro?.hint
            }
        );

        // sem internet/servidor: tenta a cópia salva no navegador
        const copia =
            lerCopiaTabela(CHAVE_CACHE_TABELA_FRETES);

        if(copia){

            processarLinhasFretes(copia.linhas);

            tabelaFretesSalvaEm = copia.salvoEm;

            console.warn(
                `[tabela_fretes] Usando cópia salva em ${copia.salvoEm}`
            );

        }else{

            tabelasFrete = {};

            nomesCidades = {};

            erroTabelaFretes =
                "Tabela de fretes não carregada (verifique conexão/login)";
        }
    }

    preencherListaCidades();
}
