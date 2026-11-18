// ======================================
// AGENDA - MAPA: A LISTA AO LADO E OS DADOS DO PINO
// ======================================
// As paradas do 🗺️ Mapa (agenda-mapa.js): os agendamentos da lista em ordem de dia e horário, numerados como os pinos. Ao lado do mapa, separadas por dia, com a situação de cada uma (procurando, aproximado, sem local e o motivo) e o "Rota ↗" do dia (agenda-mapa-rota.js); clicar leva ao pino. A janela do pino mostra tipo, horário, cliente, máquina, transportadora, status e o local, com "Abrir no Google Maps" e "Editar". Carregar depois de agenda-mapa-locais.js.


// "08:00" antes de "14:30"; sem horário (CONFIRMAR, IMEDIATO, vazio) no fim do dia
function chaveHorarioMapa(horario){

    const texto = String(horario || "").trim();

    return /^\d{1,2}:\d{2}/.test(texto) ? texto.padStart(5, "0") : "99:99" + texto;
}


// os agendamentos da lista (os filtros valem), por dia e horário; sem data no fim
function agendamentosDoMapa(){

    return [...filtrarAgendamentos()].sort((a, b) => {

        const diaA = dataDaTela(a) || "9999-99-99";

        const diaB = dataDaTela(b) || "9999-99-99";

        if(diaA !== diaB) return diaA < diaB ? -1 : 1;

        const horaA = chaveHorarioMapa(horarioDaTela(a));

        const horaB = chaveHorarioMapa(horarioDaTela(b));

        if(horaA !== horaB) return horaA < horaB ? -1 : 1;

        return (Number(a.id) || 0) - (Number(b.id) || 0);
    });
}


// uma parada por local (a transferência entre obras tem duas)
function montarParadasMapa(itens){

    let numero = 0;

    return itens.flatMap(item => {

        const lados = ladosNoMapa(item);

        return lados.map(lado => ({
            numero: ++numero,
            item,
            lado,
            dia: dataDaTela(item),
            // na transferência entre obras: "Retirada" ou "Entrega"
            papel: lados.length > 1 ? lado.papel : ""
        }));
    });
}


function tituloParadaMapa(parada){

    const { item, lado } = parada;

    return [
        horarioDaTela(item) || "sem horário",
        rotuloTipo(item.tipo) + (parada.papel ? ` (${parada.papel.toLowerCase()})` : ""),
        item.cliente || lado.nome || "sem cliente"
    ].join(" · ");
}


// [[dia, paradas], ...] na ordem da lista
function paradasPorDia(){

    const dias = new Map();

    paradasMapa.forEach(parada => {

        if(!dias.has(parada.dia)) dias.set(parada.dia, []);

        dias.get(parada.dia).push(parada);
    });

    return [...dias];
}


// ---------- a lista ao lado do mapa ----------

function desenharListaMapa(){

    const lista = $("listaMapa");

    lista.innerHTML = "";

    if(!paradasMapa.length){

        lista.appendChild(criar("p", "agenda-vazia", "Nenhum local para mostrar: a lista da agenda está vazia ou sem endereço do cliente (confira os filtros)."));

        return;
    }

    paradasPorDia().forEach(([dia, paradas]) => {

        const bloco = criar("section", "mapa-dia");

        bloco.style.setProperty("--cor-dia", corDoDia(dia));

        const topo = criar("div", "mapa-dia-topo");

        topo.appendChild(criar("strong", "", dia ? tituloDoDia(dia) : "📌 Sem data"));

        const rota = criar("button", "btn-secundario btn-rota-mapa", "Rota ↗");

        rota.type = "button";

        rota.dataset.dia = dia;

        rota.disabled = true;

        rota.title = `Abre no Google Maps a rota do dia: sai da W Rental ${UNIDADE_SAIDA_PADRAO} e passa pelos locais na ordem do horário (até ${MAX_PARADAS_ROTA})`;

        rota.addEventListener("click", () => abrirRotaDoDia(dia));

        topo.appendChild(rota);

        const itens = criar("ol", "mapa-paradas");

        paradas.forEach(parada => itens.appendChild(criarItemListaMapa(parada)));

        bloco.append(topo, itens);

        lista.appendChild(bloco);
    });
}


function criarItemListaMapa(parada){

    const linha = criar("li", "mapa-parada");

    linha.dataset.numero = parada.numero;

    const texto = criar("div", "mapa-parada-texto");

    parada.situacao = criar("small", "mapa-parada-situacao", "procurando…");

    texto.append(criar("span", "mapa-parada-titulo", tituloParadaMapa(parada)), parada.situacao);

    linha.append(criar("span", "mapa-num", String(parada.numero)), texto);

    linha.addEventListener("click", () => focarParadaMapa(parada));

    parada.linha = linha;

    return linha;
}


function atualizarItemListaMapa(parada){

    if(!parada.linha) return;

    const { lado, ponto } = parada;

    parada.linha.classList.toggle("sem-local", !!parada.erro);

    parada.linha.classList.toggle("aproximado", !!ponto && ponto.exato === false);

    if(parada.erro){

        parada.situacao.textContent = "⚠️ Sem local: " + parada.erro;

        return;
    }

    const onde = lado.endereco || lado.nome || "local do link";

    parada.situacao.textContent = (ponto.exato === false ? "≈ aproximado · " : "") + onde;
}


// o "Rota ↗" de cada dia liga quando o dia tem algum local no mapa
function atualizarRotasMapa(){

    document.querySelectorAll("#listaMapa .btn-rota-mapa").forEach(botao => {

        botao.disabled = !paradasMapa.some(parada => (parada.dia || "") === botao.dataset.dia && parada.ponto);
    });
}


// ---------- a janela do pino ----------

function linkAbrirNoMaps(lado, ponto){

    const link = String(lado.link || "").trim();

    if(link) return /^https?:\/\//i.test(link) ? link : "https://" + link;

    return `https://www.google.com/maps/search/?api=1&query=${ponto.lat},${ponto.lng}`;
}


function conteudoJanelaMapa(parada){

    const { item, lado, ponto } = parada;

    const caixa = criar("div", "mapa-info");

    caixa.appendChild(
        criar(
            "strong",
            "",
            `${parada.numero} · ${rotuloTipo(item.tipo)} · ${horarioDaTela(item) || "sem horário"}` +
            (parada.dia ? ` · ${dataBR(parada.dia).slice(0, 5)}` : "")
        )
    );

    caixa.appendChild(criar("div", "mapa-info-cliente", item.cliente || lado.nome || "Sem cliente"));

    [
        ["Máquina", item.plataforma],
        ["Transportadora", item.transportadora || "A definir"],
        ["Status", item.status],
        [parada.papel || "Local", [lado.nome, lado.endereco].filter(Boolean).join(" — ")]
    ]
        .filter(([, valor]) => valor)
        .forEach(([rotulo, valor]) => {

            const linha = criar("div", "mapa-info-linha");

            linha.append(criar("span", "mapa-info-rotulo", rotulo + ": "), document.createTextNode(valor));

            caixa.appendChild(linha);
        });

    caixa.appendChild(
        criar(
            "small",
            "mapa-info-precisao",
            ponto.exato === false
                ? "≈ Local aproximado (achado pelo endereço)"
                : ponto.fonte === "endereco" ? "📍 Achado pelo endereço" : "📍 Local do link"
        )
    );

    const botoes = criar("div", "mapa-info-botoes");

    const abrir = criar("a", "", "Abrir no Google Maps");

    abrir.href = linkAbrirNoMaps(lado, ponto);

    abrir.target = "_blank";

    abrir.rel = "noopener";

    const editar = criar("button", "btn-secundario", "✏️ Editar");

    editar.type = "button";

    editar.addEventListener("click", () => {

        fecharMapaAgenda();

        abrirModalAgenda(item.id);
    });

    botoes.append(abrir, editar);

    caixa.appendChild(botoes);

    return caixa;
}
