// ======================================
// ANÁLISE DE FRETES - GRÁFICO DE VIAGENS
// ======================================
// Colunas de viagens por dia (ou por semana, no período longo) em SVG, sem biblioteca (a CSP só deixa script do próprio site). Passar o mouse ou tocar mostra o dia: viagens, valor e quem fez. Redesenha quando a tela muda de largura.

const ALTURA_GRAFICO_VIAGENS = 190;

const MARGEM_GRAFICO_VIAGENS = { topo: 12, direita: 8, base: 24, esquerda: 32 };

// coluna nunca mais larga que isso (período curto ficaria com barras gordas)
const LARGURA_MAXIMA_BARRA = 28;

// espaço mínimo para cada data embaixo, sem encavalar
const ESPACO_DATA_GRAFICO = 46;

// na dica, as transportadoras do dia (o resto vira "+N outras")
const TRANSPORTADORAS_NA_DICA = 5;

const NOMES_DIA_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

let graficoViagens = null;


function elementoSvg(tag, atributos = {}){

    const elemento = document.createElementNS("http://www.w3.org/2000/svg", tag);

    Object.entries(atributos).forEach(([nome, valor]) => elemento.setAttribute(nome, valor));

    return elemento;
}


// "2026-11-03" -> "03/11"
function diaMes(iso){

    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}


function tituloBarraViagens(barra, porSemana){

    if(!porSemana) return `${NOMES_DIA_SEMANA[diaDaSemana(barra.inicio)]}, ${diaMes(barra.inicio)}`;

    if(barra.inicio === barra.fim) return diaMes(barra.inicio);

    return `${diaMes(barra.inicio)} a ${diaMes(barra.fim)}`;
}


// topo do eixo redondo, com no máximo 4 faixas: 7 -> 0, 2, 4, 6, 8
function eixoViagens(maximo){

    const passos = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

    const passo = passos.find(item => Math.ceil(maximo / item) <= 4) || Math.ceil(maximo / 4);

    return { passo, topo: Math.max(passo, Math.ceil(maximo / passo) * passo) };
}


// topo arredondado (4px), base reta na linha do zero
function caminhoBarra(x, y, largura, altura){

    const raio = Math.min(4, largura / 2, altura);

    return [
        `M${x},${y + altura}`,
        `V${y + raio}`,
        `Q${x},${y} ${x + raio},${y}`,
        `H${x + largura - raio}`,
        `Q${x + largura},${y} ${x + largura},${y + raio}`,
        `V${y + altura}`,
        "Z"
    ].join(" ");
}


function esconderDicaViagens(){

    const dica = $("dicaViagens");

    if(dica) dica.hidden = true;

    document.querySelectorAll("#graficoViagens .barra-viagens.destacada")
        .forEach(barra => barra.classList.remove("destacada"));
}


function conteudoDicaViagens(barra, porSemana){

    const linhas = [criar("strong", "", tituloBarraViagens(barra, porSemana))];

    if(!barra.viagens){

        linhas.push(criar("div", "", "Nenhuma viagem"));

        return linhas;
    }

    linhas.push(criar("div", "", `${barra.viagens} ${barra.viagens === 1 ? "viagem" : "viagens"}`));

    if(barra.valor > 0) linhas.push(criar("div", "", `R$ ${formatarMoedaBR(barra.valor)} em fretes`));

    barra.transportadoras.slice(0, TRANSPORTADORAS_NA_DICA).forEach(item => {

        linhas.push(criar("div", "dica-transportadora", `${item.nome}: ${item.viagens}`));
    });

    const outras = barra.transportadoras.length - TRANSPORTADORAS_NA_DICA;

    if(outras > 0) linhas.push(criar("div", "dica-transportadora", `+${outras} outras`));

    return linhas;
}


function mostrarDicaViagens(indice){

    const grafico = graficoViagens;

    if(!grafico) return;

    const barra = grafico.barras[indice];

    if(!barra) return;

    esconderDicaViagens();

    grafico.svg.querySelector(`.barra-viagens[data-indice="${indice}"]`)?.classList.add("destacada");

    const dica = $("dicaViagens");

    dica.replaceChildren(...conteudoDicaViagens(barra, grafico.porSemana));

    dica.hidden = false;

    // centralizada na coluna, sem sair da área do gráfico
    const centro = grafico.inicioX + (indice + 0.5) * grafico.passoX;

    const largura = dica.offsetWidth;

    const esquerda = Math.min(Math.max(0, centro - largura / 2), grafico.largura - largura);

    dica.style.left = `${esquerda}px`;
}


// a coluna inteira (não só a barra) responde ao mouse e ao dedo
function indiceNoGrafico(evento){

    const grafico = graficoViagens;

    const x = evento.clientX - grafico.svg.getBoundingClientRect().left;

    const indice = Math.floor((x - grafico.inicioX) / grafico.passoX);

    return indice >= 0 && indice < grafico.barras.length ? indice : -1;
}


function aoMoverNoGrafico(evento){

    const indice = indiceNoGrafico(evento);

    if(indice < 0){

        esconderDicaViagens();

        return;
    }

    mostrarDicaViagens(indice);
}


// dados: { porSemana, barras } de barrasDeViagens(); sem dados, mostra o texto
function desenharGraficoViagens(dados, textoVazio = "Nenhuma viagem no período"){

    const area = $("graficoViagens");

    graficoViagens = null;

    area.querySelector("svg")?.remove();

    area.querySelector(".grafico-vazio")?.remove();

    esconderDicaViagens();

    if(!dados || !dados.barras.some(barra => barra.viagens)){

        area.appendChild(criar("p", "grafico-vazio", textoVazio));

        return;
    }

    const margem = MARGEM_GRAFICO_VIAGENS;

    const largura = Math.max(260, area.clientWidth);

    const altura = ALTURA_GRAFICO_VIAGENS;

    const alturaUtil = altura - margem.topo - margem.base;

    const passoX = (largura - margem.esquerda - margem.direita) / dados.barras.length;

    const larguraBarra = Math.max(1, Math.min(LARGURA_MAXIMA_BARRA, passoX - 2));

    const maximo = Math.max(...dados.barras.map(barra => barra.viagens));

    const { passo, topo } = eixoViagens(maximo);

    const total = dados.barras.reduce((soma, barra) => soma + barra.viagens, 0);

    const svg = elementoSvg("svg", {
        width: largura,
        height: altura,
        viewBox: `0 0 ${largura} ${altura}`,
        role: "img",
        "aria-label": `${total} viagens, ${dados.porSemana ? "por semana" : "por dia"}. Maior: ${maximo}.`
    });

    const yDe = (valor) => margem.topo + alturaUtil - valor / topo * alturaUtil;

    for(let valor = 0; valor <= topo; valor += passo){

        svg.appendChild(elementoSvg("line", {
            class: valor ? "grade-grafico" : "base-grafico",
            x1: margem.esquerda, x2: largura - margem.direita, y1: yDe(valor), y2: yDe(valor)
        }));

        const rotulo = elementoSvg("text", { x: margem.esquerda - 6, y: yDe(valor) + 4, "text-anchor": "end" });

        rotulo.textContent = valor;

        svg.appendChild(rotulo);
    }

    dados.barras.forEach((barra, indice) => {

        if(!barra.viagens) return;

        const x = margem.esquerda + indice * passoX + (passoX - larguraBarra) / 2;

        svg.appendChild(elementoSvg("path", {
            class: "barra-viagens",
            "data-indice": indice,
            d: caminhoBarra(x, yDe(barra.viagens), larguraBarra, yDe(0) - yDe(barra.viagens))
        }));
    });

    // uma data a cada tantas colunas, para caber
    const pulo = Math.max(1, Math.ceil(ESPACO_DATA_GRAFICO / passoX));

    dados.barras.forEach((barra, indice) => {

        if(indice % pulo) return;

        const data = elementoSvg("text", {
            x: margem.esquerda + (indice + 0.5) * passoX,
            y: altura - 6,
            "text-anchor": "middle"
        });

        data.textContent = diaMes(barra.inicio);

        svg.appendChild(data);
    });

    svg.addEventListener("pointermove", aoMoverNoGrafico);

    svg.addEventListener("pointerdown", aoMoverNoGrafico);

    svg.addEventListener("pointerleave", esconderDicaViagens);

    area.insertBefore(svg, $("dicaViagens"));

    graficoViagens = { svg, barras: dados.barras, porSemana: dados.porSemana, inicioX: margem.esquerda, passoX, largura };
}


// a largura da tela mudou (girar o celular, abrir o menu): redesenha
let quadroRedesenhoViagens = 0;

window.addEventListener("resize", () => {

    cancelAnimationFrame(quadroRedesenhoViagens);

    quadroRedesenhoViagens =
        requestAnimationFrame(() => {

            if(graficoViagens) desenharGraficoViagens(graficoViagens);
        });
});
