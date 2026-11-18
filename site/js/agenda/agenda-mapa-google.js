// ======================================
// AGENDA - MAPA: O GOOGLE MAPS
// ======================================
// Carrega o Google Maps para o 🗺️ Mapa (agenda-mapa.js): a chave vem da função mapa-agenda do Supabase (segredo GOOGLE_MAPS_CHAVE; não fica no código, que é público) e o script do Google só baixa quando o mapa abre. Sem a chave, com a função fora do ar ou com a chave recusada pelo Google, o mapa avisa o que falta. Também desenha as unidades da W Rental (quadrados "W"). Carregar antes de agenda-mapa.js.

let chaveGoogleMaps = "";

// o script do Google Maps (carrega uma vez só)
let carregandoGoogleMaps = null;

// o Google recusou a chave (site não liberado, faturamento desligado...)
let chaveMapaRecusada = false;


function erroDoMapa(aviso, causa){

    const erro = new Error(aviso);

    erro.aviso = aviso;

    erro.causa = causa;

    return erro;
}


async function buscarChaveGoogleMaps(){

    if(chaveGoogleMaps) return chaveGoogleMaps;

    let resposta;

    try{

        resposta = await supabaseClient.functions.invoke(FUNCAO_MAPA, { body: { acao: "chave" } });

    }catch(erro){

        resposta = { error: erro };
    }

    if(resposta.error){

        throw erroDoMapa(
            "O mapa não abriu: a função mapa-agenda do Supabase não respondeu (ela já foi criada?).",
            resposta.error
        );
    }

    chaveGoogleMaps = String(resposta.data?.chave || "").trim();

    if(!chaveGoogleMaps){

        throw erroDoMapa("O mapa ainda não está configurado: falta a chave do Google Maps no Supabase (segredo GOOGLE_MAPS_CHAVE).");
    }

    return chaveGoogleMaps;
}


function carregarGoogleMaps(chave){

    if(window.google?.maps?.Map) return Promise.resolve();

    if(carregandoGoogleMaps) return carregandoGoogleMaps;

    carregandoGoogleMaps = new Promise((pronto, falhou) => {

        window.googleMapsAgendaPronto = () => pronto();

        // o Google chama esta quando recusa a chave
        window.gm_authFailure = () => {

            chaveMapaRecusada = true;

            mostrarAvisosMapa([problemasMapa.funcao, problemasMapa.busca]);
        };

        const script = document.createElement("script");

        script.src =
            "https://maps.googleapis.com/maps/api/js?" +
            new URLSearchParams({
                key: chave,
                callback: "googleMapsAgendaPronto",
                loading: "async",
                language: "pt-BR",
                region: "BR",
                v: "weekly"
            });

        script.async = true;

        script.onerror = () => {

            carregandoGoogleMaps = null;

            script.remove();

            falhou(erroDoMapa("O Google Maps não carregou. Confira a internet e tente de novo."));
        };

        document.head.appendChild(script);
    });

    return carregandoGoogleMaps;
}


function prepararMapaGoogle(){

    janelaMapa = janelaMapa || new google.maps.InfoWindow();

    if(mapaGoogle) return;

    mapaGoogle = new google.maps.Map($("mapaAgenda"), {
        center: CENTRO_MAPA_PADRAO,
        zoom: 10,
        // Mapa / Satélite
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        clickableIcons: false,
        // a roda do mouse dá zoom sem segurar o Ctrl
        gestureHandling: "greedy"
    });
}


// as unidades da W Rental, como quadrados "W" (uma vez por página)
async function desenharUnidadesMapa(){

    if(unidadesNoMapa || !mapaGoogle) return;

    unidadesNoMapa = true;

    for(const unidade of UNIDADES_WRENTAL){

        const ponto = await coordenadasDoLado({ endereco: unidade.endereco });

        if(ponto.erro) continue;

        const marcador = new google.maps.Marker({
            map: mapaGoogle,
            position: latLngMapa(ponto),
            title: nomeUnidade(unidade),
            label: { text: "W", color: "#ffffff", fontSize: "11px", fontWeight: "bold" },
            icon: {
                path: "M -9 -9 L 9 -9 L 9 9 L -9 9 Z",
                fillColor: "#0f172a",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2
            },
            zIndex: 1
        });

        marcador.addListener("click", () => {

            const caixa = criar("div", "mapa-info");

            caixa.append(criar("strong", "", "🏠 " + nomeUnidade(unidade)), criar("div", "mapa-info-linha", unidade.endereco));

            janelaMapa.setContent(caixa);

            janelaMapa.open({ map: mapaGoogle, anchor: marcador });
        });
    }
}


// ---------- avisos ----------

function mostrarAvisosMapa(avisos){

    const area = $("avisosMapa");

    area.innerHTML = "";

    const lista = [...avisos];

    if(chaveMapaRecusada){

        lista.unshift("O Google recusou a chave do Google Maps: confira no Google Cloud se o faturamento está ativo e se o endereço do site está liberado na chave.");
    }

    lista.filter(Boolean).forEach(aviso => area.appendChild(criar("p", "aviso-mapa", "⚠️ " + aviso)));
}
