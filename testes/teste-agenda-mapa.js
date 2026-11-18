// Agenda: 🗺️ Mapa. Os agendamentos da lista num mapa do Google Maps, um pino por local do
// cliente, achado pelo link (longo; o curto pela função mapa-agenda do Supabase) ou pelo
// endereço escrito (busca de endereços do Google). Lista numerada ao lado, por dia, com a rota
// do dia no Google Maps. O que achou fica guardado no navegador.
// Google Maps e Supabase simulados: nada aqui sai para a internet.
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

const base = { status: "Confirmado", transportadora: "Trans A", periodo: "28 dias", frete_conta: "nossa" };

// na ordem do mapa: hoje 08:00 (1), hoje 10:00 (2), amanhã 09:00 (3), 14:00 (4), 16:00 (5 e 6), CONFIRMAR (7)
const linhas = [
    { ...base, id: 1, tipo: "Entrega", data: dia(0), horario: "10:00", plataforma: "WAE18R001", cliente: "Construtora Alfa", proposta: "1",
        origem_nome: "W Rental", destino_nome: "Obra Alfa", destino_endereco: "Rua A, 1, Itajaí/SC",
        link_destino: "https://www.google.com/maps/place/Obra/@-26.80,-48.60,17z/data=!3m1!4b1!4m6!3m5!8m2!3d-26.9011!4d-48.6522" },
    { ...base, id: 2, tipo: "Coleta", data: dia(0), horario: "08:00", plataforma: "WTE12R002", cliente: "Beta Ltda", proposta: "2",
        origem_nome: "Obra Beta", origem_endereco: "", link_origem: "https://maps.app.goo.gl/Curto1", destino_nome: "W Rental" },
    { ...base, id: 3, tipo: "Entrega", data: dia(1), horario: "09:00", plataforma: "WAD16R003", cliente: "Gama SA", proposta: "3",
        origem_nome: "W Rental", destino_nome: "Praça", link_destino: "maps.app.goo.gl/Lugar" },
    { ...base, id: 4, tipo: "Troca técnica", data: dia(1), horario: "14:00", plataforma: "WAE15R004", cliente: "Delta", proposta: "4",
        origem_nome: "W Rental", destino_nome: "Obra Delta", destino_endereco: "Rua X, 10, Brusque/SC" },
    { ...base, id: 5, tipo: "Entrega", data: dia(1), horario: "CONFIRMAR", plataforma: "WAE15R005", cliente: "Épsilon", proposta: "5",
        origem_nome: "W Rental", destino_nome: "", destino_endereco: "" },
    { ...base, id: 6, tipo: "Transferência", data: dia(1), horario: "16:00", plataforma: "WAE15R006", cliente: "Zeta", proposta: "6",
        origem_nome: "Obra Zeta 1", link_origem: "-27.1, -48.9", destino_nome: "Obra Zeta 2", destino_endereco: "Lugar Nenhum, 0, Nada/SC" }
];

// o que a busca de endereços do Google acha (o resto: ZERO_RESULTS)
const enderecos = {
    "Praça Vidal Ramos, Itajaí - SC": { lat: -26.9075, lng: -48.6616 },
    "Rua X, 10, Brusque - SC": { lat: -27.098, lng: -48.917, tipo: "GEOMETRIC_CENTER" },
    "Av. Vereador Abrahão João Francisco, 3455, Itajaí - SC": { lat: -26.93, lng: -48.70 }
};

// o que a função mapa-agenda devolve para cada link curto
const linksCurtos = {
    "https://maps.app.goo.gl/Curto1": "https://www.google.com/maps/search/-26.95,+-48.70?entry=tts",
    "maps.app.goo.gl/Lugar": "https://www.google.com/maps/place/Pra%C3%A7a+Vidal+Ramos,+Itaja%C3%AD+-+SC/data=!4m2!3m1!1s0x0:0x0?entry=tts"
};

const clienteFalso = `
window.__funcoes = [];
window.supabase = { createClient(){
    const linhas = ${JSON.stringify(linhas)};
    const curtos = ${JSON.stringify(linksCurtos)};
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
        functions: { invoke: async (nome, opcoes) => {
            window.__funcoes.push({ nome, ...opcoes.body });
            if(window.__funcaoFora) return { data: null, error: new Error("Failed to send a request to the Edge Function") };
            if(opcoes.body.acao === "chave") return { data: { chave: window.__chaveMapa ?? "chave-teste" }, error: null };
            return { data: { url: curtos[opcoes.body.url] || opcoes.body.url }, error: null };
        } },
        channel: () => ({ on(){ return this; }, subscribe(){ return this; }, track: async () => "ok", send: async () => "ok" }),
        auth: {
            getSession: async () => ({ data: { session: { user: { id: "u1", email: "t@t" } } } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
        },
        storage: { from: () => ({ remove: async () => ({}), upload: async () => ({}), createSignedUrl: async () => ({ data: { signedUrl: "#" } }) }) }
    };
}};`;

// Google Maps de mentira: guarda o que o site pediu (pinos, buscas, enquadramento)
const googleFalso = `
window.__srcGoogle = document.currentScript.src;
window.__marcadores = [];
window.__buscas = [];
const ENDERECOS = ${JSON.stringify(enderecos)};
class LatLngFalso { constructor(lat, lng){ this.a = lat; this.b = lng; } lat(){ return this.a; } lng(){ return this.b; } }
window.google = { maps: {
    SymbolPath: { CIRCLE: 0 },
    Map: class { constructor(elemento, opcoes){ this.zoom = opcoes.zoom; this.centro = opcoes.center; this.limites = null; window.__mapa = this; }
        setCenter(c){ this.centro = c; } setZoom(z){ this.zoom = z; } getZoom(){ return this.zoom; } panTo(c){ this.centro = c; } fitBounds(l){ this.limites = l.pontos; } },
    Marker: class { constructor(opcoes){ this.opcoes = opcoes; this.mapa = opcoes.map; this.ouvintes = {}; window.__marcadores.push(this); }
        setMap(m){ this.mapa = m; } addListener(nome, f){ this.ouvintes[nome] = f; } },
    InfoWindow: class { setContent(c){ this.conteudo = c; window.__janela = this; } open(o){ this.aberta = o; } close(){ this.aberta = null; } },
    LatLngBounds: class { constructor(){ this.pontos = []; } extend(p){ this.pontos.push(p); } },
    Geocoder: class { async geocode(pedido){
        window.__buscas.push(pedido.address);
        if(window.__buscaNegada){ const e = new Error("negado"); e.code = "REQUEST_DENIED"; throw e; }
        const r = ENDERECOS[pedido.address];
        if(!r){ const e = new Error("nada"); e.code = "ZERO_RESULTS"; throw e; }
        return { results: [{ geometry: { location: new LatLngFalso(r.lat, r.lng), location_type: r.tipo || "ROOFTOP" }, partial_match: false }] };
    } }
} };
window[new URL(document.currentScript.src).searchParams.get("callback")]();`;

const authFalso = `
function ehAdmin(){ return Promise.resolve(false); }
function temAcesso(){ return true; }
function temFilial(){ return true; }
function existeLoginSalvo(){ return true; }
function carregarPerfil(){ return Promise.resolve({}); }
function fazerLogout(){}
function recursoDaPagina(){ return "agenda"; }
function nomeArquivoAtual(){ return "agenda.html"; }`;

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

let navegador = null;

// waitForFunction usa eval, que a CSP da agenda bloqueia: pergunta de tempo em tempo
async function esperar(pagina, condicao){
    for(let vez = 0; vez < 100; vez++){
        if(await pagina.evaluate(condicao)) return;
        await pagina.waitForTimeout(50);
    }
    throw new Error("esperou demais: " + condicao);
}

const mapaPronto = () => !document.getElementById("resumoMapa").textContent.includes("procurando");

async function abrirAgenda(contexto, antes){
    const pagina = await contexto.newPage();
    const erros = [];
    pagina.on("pageerror", e => erros.push(e.message));
    pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_FAILED|Valor salvo inválido|Falha ao abrir o link curto|O mapa não carregou/.test(m.text())) erros.push(m.text()); });
    if(antes) await pagina.addInitScript(antes);
    await pagina.addInitScript(() => { window.__abertos = []; window.open = (url) => { window.__abertos.push(url); return null; }; });
    await pagina.goto("http://agenda.test/agenda.html");
    await pagina.waitForSelector("tr.ag-item");
    await pagina.click("#btnModoTransportador");
    await pagina.waitForTimeout(50);
    return { pagina, erros };
}

(async () => {

    navegador = await chromium.launch({ channel: "chrome", headless: true });
    const contexto = await navegador.newContext({ viewport: { width: 1500, height: 950 } });
    await contexto.route("**/*", (rota) => {
        const url = new URL(rota.request().url());
        if(url.pathname.endsWith("/vendor/supabase-2.45.0.js")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso });
        if(url.hostname === "maps.googleapis.com" && url.pathname === "/maps/api/js") return rota.fulfill({ contentType: "text/javascript", body: googleFalso });
        if(url.hostname !== "agenda.test") return rota.abort();
        if(url.pathname.endsWith("auth-guard.js")) return rota.fulfill({ contentType: "text/javascript", body: authFalso });
        const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
        if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
        return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
    });

    const { pagina, erros } = await abrirAgenda(contexto);

    // ---------- coordenadas no link ----------
    const lidos = await pagina.evaluate(() => [
        coordenadasDoTexto("https://www.google.com/maps/place/X/@-26.8,-48.6,17z/data=!4m6!3m5!8m2!3d-26.9011!4d-48.6522"),
        coordenadasDoTexto("https://maps.google.com/?q=-26.91,-48.65&entry=gps"),
        coordenadasDoTexto("https://www.google.com/maps/search/-26.95,+-48.70?entry=tts"),
        coordenadasDoTexto("https://waze.com/ul?ll=-26.92%2C-48.66&navigate=yes"),
        coordenadasDoTexto("  -27.1, -48.9 "),
        coordenadasDoTexto("https://www.google.com/maps/search/rua+x/@-26.93,-48.69,14z"),
        coordenadasDoTexto("https://maps.google.com/?sll=-26.93,-48.69&q=Rua+X"),
        coordenadasDoTexto("https://maps.app.goo.gl/AbC123"),
        coordenadasDoTexto("Rua X, 10")
    ]);
    confere("link: o ponto do lugar (!3d/!4d) vence o centro da tela", lidos[0]?.lat === -26.9011 && lidos[0]?.lng === -48.6522 && !lidos[0].centro, lidos[0]);
    confere("link: pino marcado (?q=), busca por coordenadas, Waze (ll=) e coordenadas digitadas", lidos[1]?.lat === -26.91 && lidos[2]?.lng === -48.70 && lidos[3]?.lat === -26.92 && lidos[4]?.lat === -27.1 && lidos[4]?.lng === -48.9, lidos.slice(1, 5));
    confere("link: @lat,lng é só o centro da tela (marcado como centro)", lidos[5]?.centro === true && lidos[5].lat === -26.93, lidos[5]);
    confere("link: sll (centro da busca), link curto e endereço não são coordenadas", lidos[6] === null && lidos[7] === null && lidos[8] === null, lidos.slice(6));
    const curtos = await pagina.evaluate(() => [ehLinkCurto("https://maps.app.goo.gl/x"), ehLinkCurto("goo.gl/maps/x"), ehLinkCurto("https://www.google.com/maps/place/x"), ehLinkCurto("-27.1, -48.9")]);
    confere("link curto: maps.app.goo.gl e goo.gl sim; link longo e coordenadas não", JSON.stringify(curtos) === "[true,true,false,false]", curtos);
    const lugares = await pagina.evaluate(() => [
        textoDoLugarNoLink("https://www.google.com/maps/place/Pra%C3%A7a+Vidal+Ramos,+Itaja%C3%AD+-+SC/data=!4m2"),
        textoDoLugarNoLink("https://maps.google.com/maps?q=Rua+X,+10+-+Brusque&ftid=0x1:0x2"),
        textoDoLugarNoLink("https://www.google.com/maps/search/-26.95,+-48.70")
    ]);
    confere("nome do lugar no link (para a busca de endereços)", lugares[0] === "Praça Vidal Ramos, Itajaí - SC" && lugares[1] === "Rua X, 10 - Brusque" && lugares[2] === "", lugares);

    // ---------- abrir o mapa ----------
    confere("botão 🗺️ Mapa na barra da agenda", (await pagina.locator("button[data-clique='abrirMapaAgenda']").innerText()).includes("Mapa"));
    await pagina.click("button[data-clique='abrirMapaAgenda']");
    await esperar(pagina, () => !document.getElementById("resumoMapa").textContent.includes("procurando") && !!window.__mapa?.limites);
    await pagina.waitForTimeout(100);

    const src = await pagina.evaluate(() => new URL(window.__srcGoogle).searchParams);
    const parametros = await pagina.evaluate(() => Object.fromEntries(new URL(window.__srcGoogle).searchParams));
    confere("a chave vem da função mapa-agenda e vai no script do Google Maps", parametros.key === "chave-teste" && parametros.callback === "googleMapsAgendaPronto" && parametros.language === "pt-BR" && parametros.region === "BR", parametros || src);

    const pinos = await pagina.evaluate(() => window.__marcadores.filter(m => m.mapa && m.opcoes.label.text !== "W").map(m => ({
        numero: m.opcoes.label.text, lat: m.opcoes.position.lat, lng: m.opcoes.position.lng, cor: m.opcoes.icon.fillColor, opacidade: m.opcoes.icon.fillOpacity
    })));
    const porNumero = Object.fromEntries(pinos.map(p => [p.numero, p]));
    confere("5 pinos (7 locais: 1 sem link nem endereço, 1 endereço que não existe)", pinos.length === 5, pinos.map(p => p.numero));
    confere("1: a coleta das 08:00 de hoje, pelo link curto (função) com coordenadas", porNumero["1"]?.lat === -26.95 && porNumero["1"]?.lng === -48.70, porNumero["1"]);
    confere("2: a entrega das 10:00, pelo link longo (o ponto do lugar)", porNumero["2"]?.lat === -26.9011 && porNumero["2"]?.lng === -48.6522, porNumero["2"]);
    confere("3: link curto sem coordenadas: o nome do lugar na busca de endereços", porNumero["3"]?.lat === -26.9075, porNumero["3"]);
    confere("4: só endereço, achado de forma aproximada: pino apagado", porNumero["4"]?.lat === -27.098 && porNumero["4"]?.opacidade === 0.55, porNumero["4"]);
    confere("5: transferência entre obras: a retirada pelas coordenadas digitadas", porNumero["5"]?.lat === -27.1 && porNumero["5"]?.lng === -48.9, porNumero["5"]);
    const cores = await pagina.evaluate((dias) => [corDoDia(dias[0]), corDoDia(dias[1])], [dia(0), dia(1)]);
    confere("pino na cor do dia", porNumero["1"]?.cor === cores[0] && porNumero["3"]?.cor === cores[1] && porNumero["2"]?.opacidade === 1, [porNumero["1"]?.cor, porNumero["3"]?.cor, cores]);
    const unidades = await pagina.evaluate(() => window.__marcadores.filter(m => m.opcoes.label.text === "W").map(m => m.opcoes.title));
    confere("a unidade achada aparece como W (as outras a busca não achou)", JSON.stringify(unidades) === JSON.stringify(["W Rental Itajaí"]), unidades);
    confere("enquadra os 5 locais", (await pagina.evaluate(() => window.__mapa.limites.length)) === 5);

    const funcoes = await pagina.evaluate(() => window.__funcoes);
    const linksPedidos = funcoes.filter(f => f.acao === "link").map(f => f.url).sort();
    confere("função: a chave e só os 2 links curtos (o longo não precisa)", funcoes.length === 3 && funcoes[0].acao === "chave" && funcoes.every(f => f.nome === "mapa-agenda") && JSON.stringify(linksPedidos) === JSON.stringify(["https://maps.app.goo.gl/Curto1", "maps.app.goo.gl/Lugar"]), funcoes);
    const buscas = await pagina.evaluate(() => window.__buscas);
    confere("busca de endereços: o lugar do link, os endereços e a unidade", buscas.includes("Praça Vidal Ramos, Itajaí - SC") && buscas.includes("Rua X, 10, Brusque - SC") && buscas.includes("Lugar Nenhum, 0, Nada - SC") && !buscas.some(b => /Rua A/.test(b)), buscas);

    // ---------- a lista ao lado ----------
    const lista = await pagina.evaluate(() => [...document.querySelectorAll("#listaMapa .mapa-dia")].map(bloco => ({
        dia: bloco.querySelector(".mapa-dia-topo strong").textContent,
        itens: [...bloco.querySelectorAll(".mapa-parada")].map(li => li.querySelector(".mapa-num").textContent + " " + li.querySelector(".mapa-parada-titulo").textContent + " | " + li.querySelector(".mapa-parada-situacao").textContent)
    })));
    confere("lista: um bloco por dia, hoje e amanhã", lista.length === 2 && lista[0].dia.includes("hoje") && lista[1].dia.includes("amanhã"), lista.map(b => b.dia));
    confere("lista: hoje na ordem do horário", lista[0]?.itens[0]?.startsWith("1 08:00 · Coleta · Beta Ltda") && lista[0]?.itens[1]?.startsWith("2 10:00 · Entrega · Construtora Alfa | Rua A, 1, Itajaí/SC"), lista[0]?.itens);
    const amanha = lista[1]?.itens || [];
    confere("lista: aproximado avisa", amanha[1]?.includes("≈ aproximado · Rua X, 10, Brusque/SC"), amanha[1]);
    confere("lista: transferência entre obras tem retirada e entrega", amanha[2]?.includes("Transferência entre obras (retirada) · Zeta | Obra Zeta 1") && amanha[3]?.includes("Transferência entre obras (entrega) · Zeta | ⚠️ Sem local: não achei o endereço"), amanha.slice(2, 4));
    confere("lista: sem horário no fim do dia e sem local diz o motivo", amanha[4]?.startsWith("7 CONFIRMAR · Entrega · Épsilon | ⚠️ Sem local: sem link nem endereço"), amanha[4]);
    const resumo = await pagina.textContent("#resumoMapa");
    confere("resumo do mapa", resumo === "5 de 7 no mapa · 1 aproximado(s) · 2 sem local", resumo);
    await pagina.screenshot({ path: path.join(saida, "agenda-mapa.png") });

    // ---------- clicar na lista: o pino e os dados ----------
    await pagina.click("#listaMapa .mapa-parada[data-numero='3']");
    const janela = await pagina.evaluate(() => ({
        aberta: !!window.__janela?.aberta,
        texto: window.__janela?.conteudo?.textContent,
        link: window.__janela?.conteudo?.querySelector("a")?.href,
        centro: window.__mapa.centro
    }));
    confere("clicar na lista abre os dados do pino e centraliza", janela.aberta && janela.centro?.lat === -26.9075 && /3 · Entrega · 09:00/.test(janela.texto) && janela.texto.includes("Gama SA") && janela.texto.includes("WAD16R003") && janela.texto.includes("Trans A"), janela);
    confere("Abrir no Google Maps: o link do agendamento", janela.link === "https://maps.app.goo.gl/Lugar", janela.link);

    // ---------- rota do dia ----------
    await pagina.locator("#listaMapa .mapa-dia").nth(1).locator(".btn-rota-mapa").click();
    const rota = await pagina.evaluate(() => window.__abertos.pop());
    const rotaParametros = rota ? Object.fromEntries(new URL(rota).searchParams) : {};
    confere("Rota ↗: sai da unidade de Itajaí e passa pelos locais do dia na ordem", rota?.startsWith("https://www.google.com/maps/dir/?") && rotaParametros.origin === "-26.93,-48.7" && rotaParametros.waypoints === "-26.9075,-48.6616|-27.098,-48.917" && rotaParametros.destination === "-27.1,-48.9" && rotaParametros.travelmode === "driving", rotaParametros);
    const rotaHoje = await pagina.evaluate(() => linkRotaMapa(paradasMapa.filter(p => p.numero <= 2)));
    confere("Rota de 2 paradas: a primeira no caminho, a última no destino", new URL(rotaHoje).searchParams.get("waypoints") === "-26.95,-48.7" && new URL(rotaHoje).searchParams.get("destination") === "-26.9011,-48.6522", rotaHoje);

    // ---------- Editar ----------
    await pagina.evaluate(() => window.__janela.conteudo.querySelector("button").click());
    confere("Editar fecha o mapa e abre o agendamento", !(await pagina.isVisible("#modalMapa")) && (await pagina.isVisible("#modalAgenda")) && (await pagina.inputValue("#agCliente")) === "Gama SA");
    await pagina.keyboard.press("Escape");

    // ---------- de novo: o que achou ficou guardado ----------
    const antes = await pagina.evaluate(() => ({ funcoes: window.__funcoes.length, buscas: window.__buscas.length }));
    await pagina.click("button[data-clique='abrirMapaAgenda']");
    await esperar(pagina, mapaPronto);
    await pagina.waitForTimeout(100);
    const depois = await pagina.evaluate(() => ({ funcoes: window.__funcoes.slice(-3), buscas: window.__buscas.slice(-3), total: window.__funcoes.length, totalBuscas: window.__buscas.length }));
    confere("abrir de novo: nada de função para os links (guardados no navegador)", depois.total === antes.funcoes, depois.funcoes);
    confere("abrir de novo: só procura de novo o endereço que não achou", depois.totalBuscas - antes.buscas === 1 && depois.buscas.pop() === "Lugar Nenhum, 0, Nada - SC", depois.buscas);
    const pinosAtivos = await pagina.evaluate(() => window.__marcadores.filter(m => m.mapa && m.opcoes.label.text !== "W").length);
    confere("abrir de novo: os pinos antigos saem (sem pino repetido)", pinosAtivos === 5, pinosAtivos);
    await pagina.keyboard.press("Escape");
    confere("Esc fecha o mapa", !(await pagina.isVisible("#modalMapa")));

    // os filtros da lista valem no mapa
    await pagina.evaluate(() => { filtroTransportadora = SEM_TRANSPORTADORA; renderizarAgenda(); });
    await pagina.click("button[data-clique='abrirMapaAgenda']");
    await pagina.waitForTimeout(150);
    confere("os filtros da lista valem: sem agendamento, o mapa avisa", (await pagina.textContent("#listaMapa")).includes("Nenhum local para mostrar"));
    await pagina.keyboard.press("Escape");
    confere("sem erros no console", erros.length === 0, erros);
    await pagina.close();

    // ---------- sem configurar ----------
    const semChave = await abrirAgenda(contexto, () => { window.__chaveMapa = ""; });
    await semChave.pagina.click("button[data-clique='abrirMapaAgenda']");
    await semChave.pagina.waitForSelector("#avisosMapa .aviso-mapa");
    const avisoChave = await semChave.pagina.textContent("#avisosMapa");
    confere("sem a chave: avisa o que falta e não carrega o Google", avisoChave.includes("falta a chave do Google Maps") && !(await semChave.pagina.evaluate(() => window.__srcGoogle)), avisoChave);
    confere("sem a chave: a lista mostra os agendamentos, sem dizer 'sem local'", (await semChave.pagina.locator("#listaMapa .mapa-parada").count()) === 7 && !(await semChave.pagina.textContent("#listaMapa")).includes("Sem local"));
    await semChave.pagina.close();

    const semFuncao = await abrirAgenda(contexto, () => { window.__funcaoFora = true; });
    await semFuncao.pagina.click("button[data-clique='abrirMapaAgenda']");
    await semFuncao.pagina.waitForSelector("#avisosMapa .aviso-mapa");
    confere("função fora do ar: avisa", (await semFuncao.pagina.textContent("#avisosMapa")).includes("função mapa-agenda do Supabase não respondeu"));
    await semFuncao.pagina.close();

    // busca de endereços desligada na chave e chave recusada pelo Google
    const negada = await abrirAgenda(contexto, () => { window.__buscaNegada = true; });
    await negada.pagina.click("button[data-clique='abrirMapaAgenda']");
    await esperar(negada.pagina, mapaPronto);
    await negada.pagina.waitForTimeout(100);
    const avisoBusca = await negada.pagina.textContent("#avisosMapa");
    confere("Geocoding desligada: avisa para ativar e o link com coordenadas continua no mapa", avisoBusca.includes("ative a Geocoding API") && (await negada.pagina.evaluate(() => paradasMapa.find(p => p.numero === 2).ponto?.lat)) === -26.9011, avisoBusca);
    await negada.pagina.evaluate(() => window.gm_authFailure());
    confere("chave recusada pelo Google: avisa o que conferir", (await negada.pagina.textContent("#avisosMapa")).includes("O Google recusou a chave"));
    await negada.pagina.close();

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exitCode = falhas ? 1 : 0;

})().catch(async erro => {
    console.error(erro);
    await navegador?.close();
    process.exitCode = 1;
});
