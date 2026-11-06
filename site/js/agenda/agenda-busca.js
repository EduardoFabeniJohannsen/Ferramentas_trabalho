// ======================================
// AGENDA - PESQUISA
// ======================================
// Campo 🔍 da barra: procura por endereço, cliente (ou nome do local) e
// patrimônio. A página só carrega os últimos DIAS_PASSADOS_AGENDA dias;
// com a pesquisa, também busca no banco os agendamentos mais antigos que
// combinam (marcados com antigo = true, somem quando a pesquisa é limpa).
// Pesquisando, os filtros de data e de status e o modo não escondem nada
// (tipo e transportadora continuam valendo). Carregar antes de agenda-init.js.

const LIMITE_BUSCA_ANTIGOS = 200;

let timerBuscaAgenda = null;

// descarta resposta antiga se digitou de novo enquanto buscava
let cargaBuscaAgenda = 0;


// palavras digitadas, sem acento e em minúsculo
function palavrasBuscaAgenda(){

    return semAcentoMinusculo($("buscaAgenda")?.value)
        .split(/\s+/)
        .filter(Boolean);
}


function buscandoAgenda(){

    return palavrasBuscaAgenda().length > 0;
}


// todas as palavras precisam aparecer em algum dos campos
function itemCombinaBusca(item){

    const texto =
        semAcentoMinusculo(
            [
                item.cliente,
                item.origemNome,
                item.origemEndereco,
                item.destinoNome,
                item.destinoEndereco,
                item.plataforma,
                item.plataformaRecolha
            ].join(" ")
        );

    return palavrasBuscaAgenda().every(palavra => texto.includes(palavra));
}


// tira da lista o que veio de pesquisas anteriores
function removerAntigosBusca(){

    agendamentos = agendamentos.filter(item => !item.antigo);
}


// agendamentos de antes do limite que combinam com a maior palavra
// (o resto das palavras o itemCombinaBusca confere na tela)
async function buscarAntigosAgenda(){

    const token = ++cargaBuscaAgenda;

    const palavras = palavrasBuscaAgenda();

    // vírgula e parênteses quebram o filtro .or() do Supabase
    const termo =
        palavras
            .map(palavra => palavra.replace(/[,()*%\\]/g, ""))
            .sort((a, b) => b.length - a.length)[0] || "";

    if(termo.length < 3){

        removerAntigosBusca();

        renderizarAgenda();

        return;
    }

    let linhas = [];

    try{

        const padrao = `%${termo}%`;

        const { data, error } =
            await supabaseClient
                .from(TABELA_AGENDAMENTOS)
                .select("*")
                .lt("data", dataISO(-DIAS_PASSADOS_AGENDA))
                .is("excluido_em", null)
                .or(
                    [
                        "cliente",
                        "origem_nome",
                        "origem_endereco",
                        "destino_nome",
                        "destino_endereco",
                        "plataforma",
                        "plataforma_recolha"
                    ]
                        .map(coluna => `${coluna}.ilike.${padrao}`)
                        .join(",")
                )
                .order("data", { ascending: false })
                .limit(LIMITE_BUSCA_ANTIGOS);

        if(error) throw error;

        linhas = data;

    }catch(erro){

        console.error("[agenda] Falha na pesquisa:", detalhesErro(erro));

        if(token === cargaBuscaAgenda){

            mostrarToast("Falha ao pesquisar os agendamentos antigos", true);
        }
    }

    if(token !== cargaBuscaAgenda) return;

    removerAntigosBusca();

    const carregados = new Set(agendamentos.map(item => item.id));

    linhas
        .map(doBanco)
        .filter(item => !carregados.has(item.id))
        .forEach(item => {

            item.antigo = true;

            agendamentos.push(item);
        });

    if(linhas.length >= LIMITE_BUSCA_ANTIGOS){

        mostrarToast(
            `Mostrando os ${LIMITE_BUSCA_ANTIGOS} antigos mais recentes. Digite mais para refinar.`
        );
    }

    renderizarAgenda();
}


// digitando: filtra na hora o que já está na tela e, um pouco depois,
// busca os antigos no banco
function digitarBuscaAgenda(){

    $("btnLimparBusca").style.display = buscandoAgenda() ? "" : "none";

    renderizarAgenda();

    clearTimeout(timerBuscaAgenda);

    timerBuscaAgenda = setTimeout(buscarAntigosAgenda, 400);
}


function limparBuscaAgenda(){

    $("buscaAgenda").value = "";

    clearTimeout(timerBuscaAgenda);

    // invalida uma pesquisa que ainda esteja em andamento
    cargaBuscaAgenda++;

    $("btnLimparBusca").style.display = "none";

    removerAntigosBusca();

    renderizarAgenda();

    $("buscaAgenda").focus();
}
