// ======================================
// AGENDA - MAPA: ONDE FICA CADA LOCAL
// ======================================
// Acha as coordenadas do local do cliente de cada agendamento para o 🗺️ Mapa (agenda-mapa.js), nesta ordem: as que já vêm no link (agenda-mapa-links.js); o link curto (maps.app.goo.gl), aberto pela função mapa-agenda do Supabase (o navegador não consegue abrir link de outro site); o nome do lugar que vem no link; o endereço escrito, pela busca de endereços do Google (Geocoder). Com o link aproximado, o endereço escrito ainda pode achar melhor. O que achou fica guardado neste navegador (agendaMapaLocais) para não buscar de novo. Carregar depois de agenda-mapa-links.js e antes de agenda-mapa.js.

// função do Supabase que abre o link curto e entrega a chave do Google Maps
const FUNCAO_MAPA = "mapa-agenda";

// quantos locais o navegador guarda (os mais antigos saem)
const MAX_LOCAIS_MAPA = 600;

// quantos locais procura ao mesmo tempo
const BUSCAS_MAPA_JUNTAS = 4;


// o que deu errado nesta abertura do mapa (avisos no topo do mapa)
const problemasMapa = { funcao: "", busca: "" };

// links que já falharam nesta abertura do mapa (não pergunta de novo)
const linksSemLocal = new Set();

let geocoderMapa = null;


// ---------- guardados neste navegador ----------

function locaisMapaGuardados(){

    const guardados = lerLocalJSON(CHAVE_AGENDA_MAPA_LOCAIS, {});

    return guardados && typeof guardados === "object" && !Array.isArray(guardados) ? guardados : {};
}


function chaveLinkMapa(link){

    return link ? "link:" + link.trim() : "";
}


function chaveEnderecoMapa(endereco){

    return endereco ? "end:" + semAcentoMinusculo(enderecoParaBusca(endereco)) : "";
}


function localMapaGuardado(chave){

    const ponto = chave && locaisMapaGuardados()[chave];

    return ponto && coordenadaValida(ponto.lat, ponto.lng) ? ponto : null;
}


function guardarLocalMapa(chave, ponto){

    const guardados = locaisMapaGuardados();

    guardados[chave] = { lat: ponto.lat, lng: ponto.lng, exato: ponto.exato, fonte: ponto.fonte, quando: Date.now() };

    const chaves = Object.keys(guardados);

    if(chaves.length > MAX_LOCAIS_MAPA){

        chaves
            .sort((a, b) => (guardados[a].quando || 0) - (guardados[b].quando || 0))
            .slice(0, chaves.length - MAX_LOCAIS_MAPA)
            .forEach(velha => delete guardados[velha]);
    }

    gravarLocalJSON(CHAVE_AGENDA_MAPA_LOCAIS, guardados);

    return guardados[chave];
}


// ---------- buscas ----------

// cada abertura do mapa começa sem os avisos e as falhas da anterior
function recomecarBuscasMapa(){

    problemasMapa.funcao = "";

    problemasMapa.busca = "";

    linksSemLocal.clear();
}


// { url } = o link longo do link curto (a função segue o redirecionamento)
async function abrirLinkCurto(link){

    const { data, error } =
        await supabaseClient.functions.invoke(FUNCAO_MAPA, { body: { acao: "link", url: link } });

    if(error) throw error;

    return data || {};
}


// a busca de endereços do Google: { lat, lng, exato } ou null (não achou)
async function buscarEnderecoGoogle(texto, tentativa = 1){

    if(problemasMapa.busca) return null;

    geocoderMapa = geocoderMapa || new google.maps.Geocoder();

    let resultados = [];

    try{

        const resposta =
            await geocoderMapa.geocode({ address: texto, region: "br", componentRestrictions: { country: "BR" } });

        resultados = resposta?.results || [];

    }catch(erro){

        const codigo = erro?.code || "";

        if(codigo === "ZERO_RESULTS") return null;

        if(codigo === "OVER_QUERY_LIMIT" && tentativa < 3){

            await new Promise(pronto => setTimeout(pronto, 1500 * tentativa));

            return buscarEnderecoGoogle(texto, tentativa + 1);
        }

        if(codigo === "REQUEST_DENIED"){

            problemasMapa.busca = "A busca de endereços do Google está desligada na chave: ative a Geocoding API no Google Cloud.";

            return null;
        }

        throw erro;
    }

    const primeiro = resultados[0];

    if(!primeiro) return null;

    const local = primeiro.geometry.location;

    return {
        lat: local.lat(),
        lng: local.lng(),
        exato: !primeiro.partial_match && ["ROOFTOP", "RANGE_INTERPOLATED"].includes(primeiro.geometry.location_type)
    };
}


// { lat, lng, exato, fonte } ou { erro } (o motivo, para a lista do mapa)
async function coordenadasDoLado(lado){

    const link = String(lado.link || "").trim();

    const endereco = String(lado.endereco || "").trim();

    if(!link && !endereco) return { erro: "sem link nem endereço" };

    const chaveLink = chaveLinkMapa(link);

    const chaveEndereco = chaveEnderecoMapa(endereco);

    const guardado = localMapaGuardado(chaveLink) || localMapaGuardado(chaveEndereco);

    if(guardado) return guardado;

    // aproximado pelo link: só fica se o endereço não achar coisa melhor
    let peloLink = null;

    if(link && !linksSemLocal.has(link)){

        peloLink = await coordenadasDoLink(link);

        if(peloLink?.exato) return guardarLocalMapa(chaveLink, peloLink);

        if(!peloLink) linksSemLocal.add(link);
    }

    if(endereco){

        const achado = await buscarEnderecoGoogle(enderecoParaBusca(endereco));

        if(achado && (achado.exato || !peloLink)) return guardarLocalMapa(chaveEndereco, { ...achado, fonte: "endereco" });
    }

    if(peloLink) return guardarLocalMapa(chaveLink, peloLink);

    if(problemasMapa.busca) return { erro: "busca de endereços desligada" };

    if(endereco) return { erro: "não achei o endereço" };

    return { erro: ehLinkCurto(link) ? "não consegui abrir o link" : "o link não tem o local" };
}


// Só pelo link; null = o link não levou a lugar nenhum. O link curto vira o
// longo pela função do Supabase. Sem coordenadas certas no link, procura o
// nome do lugar que vem nele; o centro da tela (@lat,lng) só vale como ponto
// certo na página de um lugar (/maps/place/), senão é o último recurso,
// aproximado.
async function coordenadasDoLink(link){

    let longo = link;

    if(ehLinkCurto(link)){

        try{

            longo = (await abrirLinkCurto(link)).url || "";

        }catch(erro){

            console.error("[agenda] Falha ao abrir o link curto no mapa:", detalhesErro(erro));

            problemasMapa.funcao = "Os links curtos (maps.app.goo.gl) não abriram: a função mapa-agenda do Supabase não respondeu. Esses locais foram procurados pelo endereço escrito.";

            return null;
        }
    }

    const ponto = coordenadasDoTexto(longo);

    const centroDoLugar = ponto?.centro && /\/maps\/place\//.test(longo);

    if(ponto && (!ponto.centro || centroDoLugar)){

        return { lat: ponto.lat, lng: ponto.lng, exato: true, fonte: "link" };
    }

    const lugar = textoDoLugarNoLink(longo);

    const achado = lugar ? await buscarEnderecoGoogle(lugar) : null;

    if(achado) return { ...achado, fonte: "link" };

    return ponto ? { lat: ponto.lat, lng: ponto.lng, exato: false, fonte: "link" } : null;
}


// Procura todas as paradas, BUSCAS_MAPA_JUNTAS de cada vez; avisa cada uma
// que termina (o pino aparece na hora). A parada recebe ponto ou erro.
async function localizarParadas(paradas, aoAchar){

    const fila = [...paradas];

    const trabalhar = async () => {

        while(fila.length){

            const parada = fila.shift();

            try{

                const resultado = await coordenadasDoLado(parada.lado);

                if(resultado.erro) parada.erro = resultado.erro;

                else parada.ponto = resultado;

            }catch(erro){

                console.error("[agenda] Falha ao localizar no mapa:", erro);

                parada.erro = "erro ao procurar";
            }

            aoAchar(parada);
        }
    };

    await Promise.all(Array.from({ length: BUSCAS_MAPA_JUNTAS }, trabalhar));
}
