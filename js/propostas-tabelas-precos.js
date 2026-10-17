// ======================================
// PROPOSTAS - TABELA DE PREÇOS
// ======================================
// Cópia offline (localStorage) e carregamento de tabela_precos.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// CÓPIA OFFLINE DAS TABELAS
// ======================================
// Depois que as tabelas carregam 1x do Supabase, uma cópia
// fica salva no navegador (localStorage). Se a internet cair
// (ou o Supabase não responder), o sistema usa essa cópia.

const CHAVE_CACHE_TABELA_PRECOS = "cacheTabelaPrecos";

const CHAVE_CACHE_TABELA_FRETES = "cacheTabelaFretes";

// Data/hora (ISO) da cópia que está sendo usada.
// Vazio = dados atuais, direto do Supabase.
let tabelaPrecosSalvaEm = "";

let tabelaFretesSalvaEm = "";


function salvarCopiaTabela(chave, linhas){

    try{

        localStorage.setItem(
            chave,
            JSON.stringify({
                salvoEm: new Date().toISOString(),
                linhas: linhas
            })
        );

    }catch(erro){

        console.error(
            `[${chave}] Erro ao salvar cópia offline:`,
            erro
        );
    }
}


function lerCopiaTabela(chave){

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

        console.error(
            `[${chave}] Cópia offline inválida, ignorando:`,
            erro
        );

        return null;
    }
}


// ======================================
// CARREGAR TABELA DE PREÇOS
// ======================================

function processarLinhasPrecos(linhas){

    tabelaPrecos = {};

    linhas.forEach(linha => {

        const modelo =
            normalizarModelo(linha.modelo);

        if (!modelo) return;

        if (!tabelaPrecos[modelo]) {
            tabelaPrecos[modelo] = {};
        }

        const valor = Number(linha.valor);

        if (!isNaN(valor)) {
            tabelaPrecos[modelo][linha.dias] = valor;
        }
    });
}


async function carregarTabela() {

    erroTabelaPrecos = "";

    tabelaPrecosSalvaEm = "";

    try {

        const { data, error } =
            await supabaseClient
                .from("tabela_precos")
                .select("modelo, dias, valor");

        if (error) {
            throw error;
        }

        processarLinhasPrecos(data);

        const totalModelos =
            Object.keys(tabelaPrecos).length;

        // Sem erro mas sem nenhuma linha: quase sempre é
        // login/permissão (RLS) bloqueando, ou tabela vazia.
        if (!totalModelos) {

            erroTabelaPrecos =
                "Tabela de preços vazia (verifique login/permissões)";

            console.warn(
                "[tabela_precos] Nenhuma linha retornada"
            );

        }else{

            // deu certo: atualiza a cópia offline
            salvarCopiaTabela(
                CHAVE_CACHE_TABELA_PRECOS,
                data
            );

            console.log(
                `[tabela_precos] ${data.length} linhas, ${totalModelos} modelos carregados`
            );
        }

    } catch (erro) {

        console.error(
            "[tabela_precos] Falha ao carregar:",
            {
                mensagem: erro?.message,
                codigo: erro?.code,
                detalhes: erro?.details,
                dica: erro?.hint
            }
        );

        // sem internet/servidor: tenta a cópia salva no navegador
        const copia =
            lerCopiaTabela(CHAVE_CACHE_TABELA_PRECOS);

        if (copia) {

            processarLinhasPrecos(copia.linhas);

            tabelaPrecosSalvaEm = copia.salvoEm;

            console.warn(
                `[tabela_precos] Usando cópia salva em ${copia.salvoEm}`
            );

        }else{

            tabelaPrecos = {};

            erroTabelaPrecos =
                "Tabela de preços não carregada (verifique conexão/login)";
        }
    }

    preencherListaEquipamentos();
}
