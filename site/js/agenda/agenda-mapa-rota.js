// ======================================
// AGENDA - MAPA: A ROTA DO DIA
// ======================================
// "Rota ↗" de cada dia do 🗺️ Mapa: abre no Google Maps a rota que sai da W Rental Itajaí e passa pelos locais do dia na ordem do horário (o Google abre até 10 paradas pelo link; as demais ficam de fora, com aviso). Carregar depois de agenda-mapa-lista.js.

// o Google Maps abre até 10 paradas pelo link (9 no caminho + o destino)
const MAX_PARADAS_ROTA = 10;


function linkRotaMapa(paradas){

    const pontos =
        paradas
            .filter(parada => parada.ponto)
            .slice(0, MAX_PARADAS_ROTA)
            .map(parada => `${parada.ponto.lat},${parada.ponto.lng}`);

    if(!pontos.length) return "";

    // a saída: a unidade padrão (pelas coordenadas, se já achou; senão o endereço)
    const saida = unidadePorCidade(UNIDADE_SAIDA_PADRAO);

    const pontoSaida = localMapaGuardado(chaveEnderecoMapa(saida.endereco));

    const parametros = new URLSearchParams({
        api: "1",
        origin: pontoSaida ? `${pontoSaida.lat},${pontoSaida.lng}` : saida.endereco,
        destination: pontos[pontos.length - 1],
        travelmode: "driving"
    });

    if(pontos.length > 1) parametros.set("waypoints", pontos.slice(0, -1).join("|"));

    return "https://www.google.com/maps/dir/?" + parametros;
}


function abrirRotaDoDia(dia){

    const paradas = paradasMapa.filter(parada => (parada.dia || "") === (dia || "") && parada.ponto);

    const link = linkRotaMapa(paradas);

    if(!link) return;

    if(paradas.length > MAX_PARADAS_ROTA){

        mostrarToast(`O Google Maps abre até ${MAX_PARADAS_ROTA} paradas: foram as ${MAX_PARADAS_ROTA} primeiras do dia`);
    }

    window.open(link, "_blank", "noopener");
}
