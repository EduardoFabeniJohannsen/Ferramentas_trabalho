// Agenda no celular (agenda-celular.css): cada agendamento vira um cartão, sem rolar para o lado
// e sem largura de coluna (a escolhida no computador não vale). Horário, tipo e status no alto;
// cada informação com o nome da coluna; coluna vazia some; os botões numa linha, sem os
// invisíveis que só alinham a tabela. Com mais de 700px volta a tabela.
// Supabase simulado: nada aqui sai para a internet.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..", "site");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });

const dia = (n) => {
    const data = new Date();
    data.setDate(data.getDate() + n);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
};

const base = { status: "Confirmado", periodo: "28 dias", frete_conta: "nossa" };

const linhas = [
    { ...base, id: 1, tipo: "Entrega", data: dia(0), horario: "08:00", plataforma: "WAE18R001", cliente: "Construtora Alfa", proposta: "712804",
        transportadora: "Trans A", motorista: "", origem_nome: "W Rental", destino_nome: "Obra Alfa",
        destino_endereco: "Rua das Palmeiras, 1200, Bairro Comprido, Itajaí/SC",
        link_destino: "https://www.google.com/maps/place/Obra/@-26.80,-48.60,17z/data=!3m1!4b1!4m6!3m5!8m2!3d-26.9011!4d-48.6522", frete: "450" },
    { ...base, id: 2, tipo: "Coleta", data: dia(0), horario: "CONFIRMAR", plataforma: "WTE12R002", cliente: "Beta Ltda", proposta: "2",
        transportadora: "", origem_nome: "Obra Beta", origem_endereco: "Rua B, 2, Brusque/SC", destino_nome: "W Rental" },
    { ...base, id: 3, tipo: "Troca técnica", data: dia(1), horario: "14:00", plataforma: "WAE15", plataforma_recolha: "WAE15R004", cliente: "Delta", proposta: "4",
        transportadora: "Trans A", motorista: "João", origem_nome: "W Rental", destino_nome: "Obra Delta", destino_endereco: "Rua X, 10, Brusque/SC" }
];

const clienteFalso = `
window.supabase = { createClient(){
    const linhas = ${JSON.stringify(linhas)};
    const consulta = (tabela) => {
        let inicio = 0;
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then"){
                    const data = inicio !== 0 ? [] : tabela === "agendamentos" ? linhas : tabela === "transportadoras" ? [{ id: 1, nome: "Trans A" }] : [];
                    return (ok) => ok({ data, error: null, count: data.length });
                }
                if(nome === "range") return (a) => { inicio = a; return q; };
                return () => q;
            }
        });
        return q;
    };
    return {
        from: consulta,
        rpc: async () => ({ data: null, error: null }),
        channel: () => ({ on(){ return this; }, subscribe(){ return this; }, track: async () => "ok", send: async () => "ok" }),
        auth: {
            getSession: async () => ({ data: { session: { user: { id: "u1", email: "t@t" } } } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
        },
        storage: { from: () => ({ remove: async () => ({}), upload: async () => ({}), createSignedUrl: async () => ({ data: { signedUrl: "#" } }) }) }
    };
}};`;

const authFalso = `
function ehAdmin(){ return Promise.resolve(false); }
function temAcesso(){ return true; }
function temFilial(){ return true; }
function existeLoginSalvo(){ return true; }
function carregarPerfil(){ return Promise.resolve({}); }
function fazerLogout(){}
function recursoDaPagina(){ return "agenda"; }
function nomeArquivoAtual(){ return "agenda.html"; }`;

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2" };

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

let navegador = null;

// o que o cartão de cada agendamento mostra
const cartoes = (pagina) => pagina.evaluate(() =>
    [...document.querySelectorAll("#listaAgenda tr.ag-item")].map(linha => {
        const visivel = (celula) => getComputedStyle(celula).display !== "none";
        const caixa = (seletor) => linha.querySelector(seletor)?.getBoundingClientRect();
        // o meio da altura: o que está na mesma linha do cartão tem o mesmo meio
        const meio = (celula) => { const c = celula.getBoundingClientRect(); return Math.round(c.top + c.height / 2); };
        return {
            display: getComputedStyle(linha).display,
            largura: linha.getBoundingClientRect().width,
            rotulos: [...linha.querySelectorAll("td[data-rotulo]")].filter(visivel).map(celula => getComputedStyle(celula, "::before").content.replace(/"/g, "")),
            // na ordem em que aparecem no cartão (de cima para baixo, da esquerda para a direita)
            colunas: [...linha.querySelectorAll("td[data-coluna]")].filter(visivel)
                .sort((a, b) => (meio(a) - meio(b)) || (a.getBoundingClientRect().left - b.getBoundingClientRect().left))
                .map(celula => celula.dataset.coluna),
            meioHorario: meio(linha.querySelector('td[data-coluna="horario"]')),
            meioStatus: meio(linha.querySelector('td[data-coluna="status"]')),
            topoTitulo: Math.round(caixa('td[data-coluna="titulo"]')?.top),
            baseHorario: Math.round(caixa('td[data-coluna="horario"]')?.bottom),
            botoes: [...linha.querySelectorAll(".ag-botoes button")].filter(botao => getComputedStyle(botao).display !== "none").map(botao => Math.round(botao.getBoundingClientRect().top)),
            linkUmaLinha: (() => { const link = linha.querySelector(".ag-link"); return !link || link.getBoundingClientRect().height < 20; })()
        };
    })
);

(async () => {

    navegador = await chromium.launch({ channel: "chrome", headless: true });
    // como o celular de verdade (isMobile): sem a meta viewport a página viria com 980px
    const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await contexto.route("**/*", (rota) => {
        const url = new URL(rota.request().url());
        if(url.pathname.endsWith("/vendor/supabase-2.45.0.js")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso });
        if(url.hostname !== "agenda.test") return rota.abort();
        if(url.pathname.endsWith("auth-guard.js")) return rota.fulfill({ contentType: "text/javascript", body: authFalso });
        const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
        if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
        return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
    });

    const pagina = await contexto.newPage();
    const erros = [];
    pagina.on("pageerror", e => erros.push(e.message));
    pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_FAILED|Valor salvo inválido/.test(m.text())) erros.push(m.text()); });
    // largura de colunas escolhida no computador (agenda-larguras.js): no cartão não vale
    await pagina.addInitScript(() => {
        try{ localStorage.setItem("agendaLarguras:u1", JSON.stringify({ transportador: { titulo: 700, entrega: 900 }, expedicao: { titulo: 700 } })); }catch(e){}
    });
    await pagina.goto("http://agenda.test/agenda.html");
    await pagina.waitForSelector("tr.ag-item");
    await pagina.click("#btnModoTransportador");
    await pagina.waitForTimeout(100);

    // ---------- sem rolar para o lado ----------
    const larguras = await pagina.evaluate(() => ({
        pagina: document.documentElement.scrollWidth, tela: window.innerWidth,
        // o iPhone dá zoom ao tocar num campo com menos de 16px (style.css)
        campos: [...document.querySelectorAll("input, select, textarea")].filter(c => c.offsetParent).map(c => parseFloat(getComputedStyle(c).fontSize)),
        lista: $("listaAgenda").scrollWidth, area: $("listaAgenda").clientWidth,
        cabecalho: getComputedStyle(document.querySelector(".ag-tabela thead")).display,
        larguraFixa: document.querySelector(".ag-tabela").classList.contains("largura-fixa")
    }));
    confere("celular: nem a página nem a lista rolam para o lado (mesmo com largura de coluna escolhida)", larguras.pagina <= larguras.tela && larguras.lista <= larguras.area && larguras.larguraFixa, larguras);
    confere("celular: sem a linha de títulos das colunas", larguras.cabecalho === "none", larguras.cabecalho);
    confere("celular: a página tem a largura da tela (meta viewport)", larguras.tela === 390, larguras.tela);
    confere("celular: todo campo com 16px ou mais (o iPhone não dá zoom ao tocar)", larguras.campos.length > 3 && larguras.campos.every(tamanho => tamanho >= 16), larguras.campos);

    // ---------- o cartão ----------
    const [entrega, coleta, troca] = await cartoes(pagina);
    confere("cada agendamento é um cartão da largura da lista", entrega.display === "flex" && Math.abs(entrega.largura - larguras.area) < 2, entrega);
    confere("horário e status na mesma linha, a máquina e o cliente logo abaixo", Math.abs(entrega.meioHorario - entrega.meioStatus) <= 1 && entrega.topoTitulo >= entrega.baseHorario, entrega);
    confere("cada informação com o nome da coluna na frente", ["Transportadora", "Retirada", "Entrega", "Frete", "Proposta"].every(r => entrega.rotulos.includes(r)), entrega.rotulos);
    confere("horário, tipo, status e máquina sem o nome da coluna", !entrega.rotulos.some(r => ["Horário", "Tipo", "Status", "Plataforma / Cliente"].includes(r)), entrega.rotulos);
    confere("coluna vazia some (sem motorista)", !entrega.colunas.includes("motorista") && troca.colunas.includes("motorista"), [entrega.colunas, troca.colunas]);
    confere("ordem: horário, tipo e status em cima, a máquina e o resto na ordem das colunas", JSON.stringify(entrega.colunas) === JSON.stringify(["horario", "tipo", "status", "titulo", "transportadora", "retirada", "entrega", "frete", "proposta"]), entrega.colunas);
    confere("botões numa linha só", entrega.botoes.length >= 5 && new Set(entrega.botoes).size === 1, entrega.botoes);
    confere("botões que não valem (coleta: faturamento e ↩️; o ✉️ é o do email da coleta) somem em vez de deixar buraco", coleta.botoes.length === entrega.botoes.length - 2, [entrega.botoes.length, coleta.botoes.length]);
    confere("link do mapa numa linha só", entrega.linkUmaLinha);
    await pagina.screenshot({ path: path.join(saida, "agenda-celular.png"), fullPage: true });

    // o status continua sendo trocado pela etiqueta
    confere("status continua uma caixinha de escolher", await pagina.locator('#listaAgenda tr.ag-item td[data-coluna="status"] select').first().isVisible());

    // os botões continuam funcionando
    await pagina.click('#listaAgenda tr.ag-item >> nth=0 >> button[title="Editar"]');
    confere("✏️ do cartão abre o agendamento", await pagina.evaluate(() => $("modalAgenda").classList.contains("aberto") && $("agCliente").value === "Construtora Alfa"));
    await pagina.keyboard.press("Escape");

    // ---------- fundo claro ----------
    await pagina.click("#btnTema");
    await pagina.waitForTimeout(100);
    const fundo = await pagina.evaluate(() => {
        const linha = document.querySelector("#listaAgenda tr.ag-item");
        return { cartao: getComputedStyle(linha).backgroundColor, celula: getComputedStyle(linha.querySelector("td")).backgroundColor };
    });
    // "rgb(212, 192, 249)" ou "color(srgb 0.83 0.75 0.97)" (o color-mix). A cor é a do
    // dia da semana de hoje: vale a média dos três canais (na sexta, azul claro, o
    // vermelho sozinho fica em 146)
    const claridade = (cor) => {
        const canais = (cor.replace(/^color\(srgb/, "").match(/[\d.]+/g) || []).slice(0, 3).map(Number);
        const escala = cor.startsWith("color(") ? 255 : 1;
        return canais.length === 3 ? canais.reduce((soma, n) => soma + n * escala, 0) / 3 : 0;
    };
    confere("fundo claro: o cartão é claro e as células não pintam por cima", claridade(fundo.cartao) > 150 && fundo.celula === "rgba(0, 0, 0, 0)", [fundo, claridade(fundo.cartao)]);
    await pagina.screenshot({ path: path.join(saida, "agenda-celular-claro.png") });
    await pagina.click("#btnTema");

    // ---------- deitado (mais de 700px): volta a tabela ----------
    await pagina.setViewportSize({ width: 900, height: 420 });
    await pagina.waitForTimeout(100);
    const deitado = await pagina.evaluate(() => ({
        linha: getComputedStyle(document.querySelector("#listaAgenda tr.ag-item")).display,
        cabecalho: getComputedStyle(document.querySelector(".ag-tabela thead")).display
    }));
    confere("celular deitado / computador: a tabela de sempre", deitado.linha === "table-row" && deitado.cabecalho === "table-header-group", deitado);

    confere("sem erros na página", erros.length === 0, erros);

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exitCode = falhas ? 1 : 0;

})().catch(async erro => {
    console.error(erro);
    await navegador?.close();
    process.exitCode = 1;
});
