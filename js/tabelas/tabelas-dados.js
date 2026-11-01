// ======================================
// TABELAS - DADOS
// ======================================
// tratarValor() e carregarLinhasTabela().
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

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
