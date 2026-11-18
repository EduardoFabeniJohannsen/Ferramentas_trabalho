// ======================================
// AGENDA - MAPA: O QUE O LINK DIZ
// ======================================
// Lê o link do Google Maps salvo no agendamento (sem internet): as coordenadas que vêm nele (!3d/!4d, ?q=, /maps/search/, coordenadas digitadas; @lat,lng é só o centro da tela de quem copiou), se é link curto (maps.app.goo.gl, que só a função do Supabase abre) e o nome do lugar (para a busca de endereços). Também diz quais lados do agendamento vão para o 🗺️ Mapa. Carregar antes de agenda-mapa-locais.js.

// link curto do Google: só a função do Supabase consegue abrir
const HOSTS_LINK_CURTO = /^(maps\.app\.goo\.gl|goo\.gl|g\.co|share\.google)$/i;


function coordenadaValida(lat, lng){

    return Number.isFinite(lat) && Number.isFinite(lng) &&
        Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
        !(lat === 0 && lng === 0);
}


function pontoMapa(lat, lng){

    const ponto = { lat: Number(lat), lng: Number(lng) };

    return coordenadaValida(ponto.lat, ponto.lng) ? ponto : null;
}


// Coordenadas escritas no link (ou digitadas no campo), da mais exata para a
// menos: !3d/!4d (o ponto do lugar), ?q= / ll= / query= (pino marcado, Waze),
// /maps/search/lat,lng, "lat, lng" digitado e, por último, @lat,lng, que é só
// o centro da tela de quem copiou o link (volta com centro: true).
// null = o link não tem coordenadas.
function coordenadasDoTexto(texto){

    let t = String(texto || "").trim();

    if(!t) return null;

    try{ t = decodeURIComponent(t); }catch(erro){ /* fica como veio */ }

    const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";

    const padroes = [
        new RegExp(`!3d${NUM}!4d${NUM}`),
        new RegExp(`[?&](?:q|query|ll|daddr|destination|cbll)=\\+?${NUM}\\s*,\\s*\\+?${NUM}(?![\\d.])`),
        new RegExp(`/maps/(?:search|place)/\\+?${NUM}\\s*,\\s*\\+?${NUM}(?![\\d.])`),
        /^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/
    ];

    for(const padrao of padroes){

        const achou = t.match(padrao);

        const ponto = achou && pontoMapa(achou[1], achou[2]);

        if(ponto) return ponto;
    }

    const centro = t.match(new RegExp(`@${NUM},${NUM}(?![\\d.])`));

    const ponto = centro && pontoMapa(centro[1], centro[2]);

    return ponto ? { ...ponto, centro: true } : null;
}


function urlDoLink(link){

    const texto = String(link || "").trim();

    if(!texto) return null;

    try{

        return new URL(/^https?:\/\//i.test(texto) ? texto : "https://" + texto);

    }catch(erro){

        return null;
    }
}


function ehLinkCurto(link){

    const url = urlDoLink(link);

    return !!url && HOSTS_LINK_CURTO.test(url.hostname);
}


// o nome do lugar que vem no link longo (/maps/place/Rua+X,+10/ ou ?q=Rua X):
// procurado na busca de endereços quando o link não traz coordenadas
function textoDoLugarNoLink(link){

    const url = urlDoLink(link);

    if(!url) return "";

    const caminho = url.pathname.match(/\/maps\/(?:place|search)\/([^/]+)/);

    let texto =
        caminho
            ? caminho[1].replace(/\+/g, " ")
            : (["q", "query", "daddr", "destination"].map(nome => url.searchParams.get(nome)).find(Boolean) || "");

    try{ texto = decodeURIComponent(texto); }catch(erro){ /* fica como veio */ }

    texto = texto.replace(/\s+/g, " ").trim();

    // só número (coordenadas) já foi tentado antes
    return /[a-zà-ú]/i.test(texto) ? texto : "";
}


// "Rua X, 10, Brusque/SC" -> "Rua X, 10, Brusque - SC" (a busca entende melhor)
function enderecoParaBusca(endereco){

    return String(endereco || "")
        .replace(/\s*\/\s*([A-Za-z]{2})\b/g, " - $1")
        .replace(/\s+/g, " ")
        .trim();
}


// Os lados do agendamento que vão para o mapa: o local do cliente (entrega,
// troca, frete frustrado e transferência entre unidades: o destino; coleta: a
// origem) e, na transferência entre obras, os dois. O pátio da W Rental (de
// onde a máquina sai) não entra.
function ladosNoMapa(item){

    const origem = { papel: "Retirada", nome: item.origemNome, endereco: item.origemEndereco, link: item.linkOrigem };

    const destino = { papel: "Entrega", nome: item.destinoNome, endereco: item.destinoEndereco, link: item.linkDestino };

    const lados =
        item.tipo === "Coleta"
            ? [origem]
            : item.tipo === "Transferência"
                ? [origem, destino]
                : [destino];

    return lados.filter(lado => !ehLocalWR(lado.nome));
}
