// ======================================
// ANÁLISE DE MOVIMENTAÇÕES - GRÁFICO
// ======================================
// Saídas e retornos por dia (ou por semana, no período longo) em SVG, sem biblioteca (a CSP só deixa script do próprio site): as saídas sobem da linha do zero e os retornos descem, na mesma escala. Passar o mouse ou tocar mostra o dia: saídas, retornos e saldo (no celular, até tocar fora). Redesenha quando a tela muda de largura.

const ALTURA_GRAFICO_MOVIMENTOS = 230;

const MARGEM_GRAFICO_MOVIMENTOS = { topo: 10, direita: 8, base: 24, esquerda: 32 };

// coluna nunca mais larga que isso (período curto ficaria com barras gordas)
const LARGURA_MAXIMA_MOVIMENTOS = 24;

// espaço mínimo para cada data embaixo, sem encavalar
const ESPACO_DATA_MOVIMENTOS = 46;

let graficoMovimentos = null;


function esconderDicaMovimentos(){

    const dica = $("dicaMovimentos");

    if(dica) dica.hidden = true;

    document.querySelectorAll("#graficoMovimentos .destacada")
        .forEach(barra => barra.classList.remove("destacada"));
}


// "4 saídas" com o número em destaque e o traço da cor da série na frente
function linhaDicaMovimentos(sentido, quantidade, singular, varios){

    const linha = criar("div", "dica-linha");

    const texto = criar("span");

    texto.append(criar("strong", "", numeroBR(quantidade)), ` ${quantidade === 1 ? singular : varios}`);

    linha.append(criar("span", `chave-dica chave-${sentido}`), texto);

    return linha;
}


function conteudoDicaMovimentos(barra, porSemana){

    const linhas = [criar("div", "dica-titulo", tituloDaFaixa(barra, porSemana))];

    if(!barra.saidas && !barra.retornos){

        linhas.push(criar("div", "", "Nenhum movimento"));

        return linhas;
    }

    linhas.push(
        linhaDicaMovimentos("saida", barra.saidas, "saída", "saídas"),
        linhaDicaMovimentos("retorno", barra.retornos, "retorno", "retornos"),
        criar("div", "dica-saldo", `Saldo: ${textoSaldo(barra.saidas - barra.retornos)}`)
    );

    return linhas;
}


function mostrarDicaMovimentos(indice){

    const grafico = graficoMovimentos;

    const barra = grafico?.barras[indice];

    if(!barra) return;

    esconderDicaMovimentos();

    grafico.svg.querySelectorAll(`[data-indice="${indice}"]`)
        .forEach(elemento => elemento.classList.add("destacada"));

    const dica = $("dicaMovimentos");

    dica.replaceChildren(...conteudoDicaMovimentos(barra, grafico.porSemana));

    dica.hidden = false;

    // centralizada na coluna, sem sair da área do gráfico
    const centro = grafico.inicioX + (indice + 0.5) * grafico.passoX;

    const largura = dica.offsetWidth;

    dica.style.left = `${Math.min(Math.max(0, centro - largura / 2), grafico.largura - largura)}px`;
}


// a coluna inteira (não só a barra) responde ao mouse e ao dedo
function aoMoverNoGraficoMovimentos(evento){

    const grafico = graficoMovimentos;

    const x = evento.clientX - grafico.svg.getBoundingClientRect().left;

    const indice = Math.floor((x - grafico.inicioX) / grafico.passoX);

    if(indice < 0 || indice >= grafico.barras.length){

        esconderDicaMovimentos();

        return;
    }

    mostrarDicaMovimentos(indice);
}


// linhas da grade (a do zero mais forte) e os números do eixo, iguais nos dois lados
function desenharEixoMovimentos(svg, largura, eixo, yDe){

    const margem = MARGEM_GRAFICO_MOVIMENTOS;

    for(let valor = -eixo.topo; valor <= eixo.topo; valor += eixo.passo){

        svg.appendChild(elementoSvg("line", {
            class: valor ? "grade-movimentos" : "base-grafico",
            x1: margem.esquerda, x2: largura - margem.direita, y1: yDe(valor), y2: yDe(valor)
        }));

        const rotulo = elementoSvg("text", { x: margem.esquerda - 6, y: yDe(valor) + 4, "text-anchor": "end" });

        rotulo.textContent = Math.abs(valor);

        svg.appendChild(rotulo);
    }
}


// dados: { porSemana, barras } de barrasDeMovimentos(); sem dados, mostra o texto
function desenharGraficoMovimentos(dados, textoVazio = "Nenhum movimento no período"){

    const area = $("graficoMovimentos");

    graficoMovimentos = null;

    area.querySelector("svg")?.remove();

    area.querySelector(".grafico-vazio")?.remove();

    esconderDicaMovimentos();

    if(!dados || !dados.barras.some(barra => barra.saidas || barra.retornos)){

        area.appendChild(criar("p", "grafico-vazio", textoVazio));

        return;
    }

    const margem = MARGEM_GRAFICO_MOVIMENTOS;

    const largura = Math.max(260, area.clientWidth);

    const altura = ALTURA_GRAFICO_MOVIMENTOS;

    const meio = margem.topo + (altura - margem.topo - margem.base) / 2;

    const passoX = (largura - margem.esquerda - margem.direita) / dados.barras.length;

    const larguraBarra = Math.max(1, Math.min(LARGURA_MAXIMA_MOVIMENTOS, passoX - 2));

    const maximo = Math.max(...dados.barras.map(barra => Math.max(barra.saidas, barra.retornos)));

    const eixo = eixoDoGrafico(maximo);

    // positivo sobe (saídas), negativo desce (retornos)
    const yDe = (valor) => meio - valor / eixo.topo * (meio - margem.topo);

    const saidas = somar(dados.barras, barra => barra.saidas);

    const retornos = somar(dados.barras, barra => barra.retornos);

    const svg = elementoSvg("svg", {
        width: largura,
        height: altura,
        viewBox: `0 0 ${largura} ${altura}`,
        role: "img",
        "aria-label": `${saidas} saídas e ${retornos} retornos, ${dados.porSemana ? "por semana" : "por dia"}. As saídas sobem e os retornos descem.`
    });

    desenharEixoMovimentos(svg, largura, eixo, yDe);

    // 1px de folga dos dois lados da linha do zero: as duas colunas não se tocam
    dados.barras.forEach((barra, indice) => {

        const x = margem.esquerda + indice * passoX + (passoX - larguraBarra) / 2;

        if(barra.saidas){

            const alto = Math.max(1, meio - 1 - yDe(barra.saidas));

            svg.appendChild(elementoSvg("path", {
                class: "barra-saida", "data-indice": indice,
                d: caminhoBarra(x, meio - 1 - alto, larguraBarra, alto)
            }));
        }

        if(barra.retornos){

            const alto = Math.max(1, yDe(-barra.retornos) - meio - 1);

            svg.appendChild(elementoSvg("path", {
                class: "barra-retorno", "data-indice": indice,
                d: caminhoBarra(x, meio + 1, larguraBarra, alto, true)
            }));
        }
    });

    // uma data a cada tantas colunas, para caber
    const pulo = Math.max(1, Math.ceil(ESPACO_DATA_MOVIMENTOS / passoX));

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

    svg.addEventListener("pointermove", aoMoverNoGraficoMovimentos);

    svg.addEventListener("pointerdown", aoMoverNoGraficoMovimentos);

    // no dedo, soltar também conta como sair do gráfico: a dica fica até tocar fora
    svg.addEventListener("pointerleave", evento => {

        if(evento.pointerType !== "touch") esconderDicaMovimentos();
    });

    area.insertBefore(svg, $("dicaMovimentos"));

    graficoMovimentos = { svg, barras: dados.barras, porSemana: dados.porSemana, inicioX: margem.esquerda, passoX, largura };
}


// tocou fora do gráfico (no celular a dica não some sozinha ao soltar o dedo)
document.addEventListener("pointerdown", evento => {

    if(graficoMovimentos && !graficoMovimentos.svg.contains(evento.target)) esconderDicaMovimentos();
});


// a largura da tela mudou (girar o celular, abrir o menu): redesenha
let quadroRedesenhoMovimentos = 0;

window.addEventListener("resize", () => {

    cancelAnimationFrame(quadroRedesenhoMovimentos);

    quadroRedesenhoMovimentos =
        requestAnimationFrame(() => {

            if(graficoMovimentos) desenharGraficoMovimentos(graficoMovimentos);
        });
});
