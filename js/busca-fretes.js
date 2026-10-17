// ======================================
// BUSCA DE FRETES POR TRANSPORTADORA
// ======================================
// TABELAS_FRETES e buscarLinhasFretes().
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

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
