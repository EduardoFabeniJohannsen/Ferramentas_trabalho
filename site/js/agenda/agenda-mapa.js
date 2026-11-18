// ======================================
// AGENDA - MAPA (botão 🗺️ Mapa)
// ======================================
// Mostra no Google Maps os agendamentos que estão na lista (os filtros valem): um pino por local do cliente, na cor do dia, com o número da lista ao lado do mapa (agenda-mapa-lista.js). Pino apagado = local aproximado (achado pelo endereço). As unidades da W Rental aparecem como quadrados "W" (agenda-mapa-google.js). Carregar depois dos outros agenda-mapa-*.js e de agenda-unidades.js.

// antes de achar os locais: Itajaí
const CENTRO_MAPA_PADRAO = { lat: -26.9078, lng: -48.6619 };

let mapaGoogle = null;

let janelaMapa = null;

let marcadoresMapa = [];

let unidadesNoMapa = false;

// as paradas desta abertura: { numero, item, lado, dia, ponto | erro, marcador }
let paradasMapa = [];

// conta as aberturas: o que chega de uma abertura antiga é ignorado
let aberturaMapa = 0;


// ---------- abrir e fechar ----------

async function abrirMapaAgenda(){

    const abertura = ++aberturaMapa;

    recomecarBuscasMapa();

    limparMarcadoresMapa();

    $("modalMapa").classList.add("aberto");

    paradasMapa = montarParadasMapa(agendamentosDoMapa());

    mostrarAvisosMapa([]);

    desenharListaMapa();

    atualizarResumoMapa();

    try{

        await carregarGoogleMaps(await buscarChaveGoogleMaps());

    }catch(erro){

        if(abertura !== aberturaMapa) return;

        console.error("[agenda] O mapa não carregou:", erro);

        mostrarAvisosMapa([erro.aviso || "O mapa não carregou. Tente de novo."]);

        // sem mapa, nada foi procurado: a lista fica só com os agendamentos
        paradasMapa.forEach(parada => { if(parada.situacao) parada.situacao.textContent = ""; });

        $("resumoMapa").textContent = "";

        return;
    }

    if(abertura !== aberturaMapa) return;

    prepararMapaGoogle();

    await localizarParadas(paradasMapa, parada => {

        if(abertura !== aberturaMapa) return;

        colocarMarcadorMapa(parada);

        atualizarItemListaMapa(parada);

        atualizarResumoMapa();
    });

    if(abertura !== aberturaMapa) return;

    enquadrarMapa();

    atualizarRotasMapa();

    mostrarAvisosMapa([problemasMapa.funcao, problemasMapa.busca]);

    desenharUnidadesMapa().catch(erro => console.error("[agenda] Unidades no mapa:", erro));
}


function fecharMapaAgenda(){

    $("modalMapa").classList.remove("aberto");

    janelaMapa?.close();
}


// ---------- pinos ----------

// só lat e lng para o Google (o guardado no navegador tem mais campos)
function latLngMapa(ponto){

    return { lat: ponto.lat, lng: ponto.lng };
}


function limparMarcadoresMapa(){

    marcadoresMapa.forEach(marcador => marcador.setMap(null));

    marcadoresMapa = [];

    janelaMapa?.close();
}


function colocarMarcadorMapa(parada){

    if(!mapaGoogle || !parada.ponto) return;

    const exato = parada.ponto.exato !== false;

    const marcador = new google.maps.Marker({
        map: mapaGoogle,
        position: latLngMapa(parada.ponto),
        title: `${parada.numero}. ${tituloParadaMapa(parada)}`,
        label: { text: String(parada.numero), color: "#0f172a", fontSize: "12px", fontWeight: "bold" },
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 13,
            fillColor: corDoDia(parada.dia),
            fillOpacity: exato ? 1 : 0.55,
            strokeColor: exato ? "#0f172a" : "#ffffff",
            strokeWeight: 2
        },
        // os primeiros da lista ficam por cima
        zIndex: 10000 - parada.numero
    });

    marcador.addListener("click", () => abrirJanelaMapa(parada));

    parada.marcador = marcador;

    marcadoresMapa.push(marcador);
}


function abrirJanelaMapa(parada){

    if(!mapaGoogle || !parada.marcador) return;

    janelaMapa.setContent(conteudoJanelaMapa(parada));

    janelaMapa.open({ map: mapaGoogle, anchor: parada.marcador });
}


// clique na lista: centraliza no pino e mostra os dados
function focarParadaMapa(parada){

    if(!mapaGoogle || !parada.ponto) return;

    mapaGoogle.panTo(latLngMapa(parada.ponto));

    if((mapaGoogle.getZoom() || 0) < 14) mapaGoogle.setZoom(14);

    abrirJanelaMapa(parada);
}


function enquadrarMapa(){

    const pontos = paradasMapa.filter(parada => parada.ponto).map(parada => latLngMapa(parada.ponto));

    if(!mapaGoogle || !pontos.length) return;

    if(pontos.length === 1){

        mapaGoogle.setCenter(pontos[0]);

        mapaGoogle.setZoom(14);

        return;
    }

    const limites = new google.maps.LatLngBounds();

    pontos.forEach(ponto => limites.extend(ponto));

    mapaGoogle.fitBounds(limites, 48);
}


// ---------- resumo ----------

function atualizarResumoMapa(){

    const total = paradasMapa.length;

    const achados = paradasMapa.filter(parada => parada.ponto).length;

    const aproximados = paradasMapa.filter(parada => parada.ponto && parada.ponto.exato === false).length;

    const semLocal = paradasMapa.filter(parada => parada.erro).length;

    const procurando = total - achados - semLocal;

    const partes = [`${achados} de ${total} no mapa`];

    if(aproximados) partes.push(`${aproximados} aproximado(s)`);

    if(semLocal) partes.push(`${semLocal} sem local`);

    if(procurando) partes.push(`procurando ${procurando}…`);

    $("resumoMapa").textContent = total ? partes.join(" · ") : "";
}
