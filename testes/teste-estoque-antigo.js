const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });
const hoje = new Date().toLocaleDateString("en-CA");

const clienteFalso = `
window.__idades = [3, 15];
window.supabase = { createClient(){
    const linhas = [{ id: 1, data: "${hoje}", horario: "08:00", tipo: "Entrega", status: "Confirmado", plataforma: "WAE18", cliente: "Cliente Um", prazos_pagamento: [] }];
    const consulta = (tabela) => {
        let inicio = 0;
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then") return (ok) => ok({ data: inicio === 0 && tabela === "agendamentos" ? linhas : [], error: null, count: 0 });
                if(nome === "range") return (a) => { inicio = a; return q; };
                return () => q;
            }
        });
        return q;
    };
    const quando = (h) => h === null ? null : new Date(Date.now() - h * 3600000).toISOString();
    return {
        from: consulta,
        rpc: async () => ({ data: window.__idades.map((h, i) => ({
            filial_id: i + 1, atualizado_em: quando(h),
            disponiveis: { WAE18: [{ p: "WAE18R00" + i, m: "GENIE", f: "Z45" }] }, manutencao: null
        })), error: null }),
        channel: () => ({ on(){ return this; }, subscribe(){ return this; }, send: async () => "ok" }),
        auth: {
            getSession: async () => ({ data: { session: { user: { id: "u1", email: "t@t" } } } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
        },
        storage: { from: () => ({}) }
    };
}};`;

const authFalso = `function ehAdmin(){ return Promise.resolve(false); }
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

(async () => {

    const navegador = await chromium.launch({ channel: "chrome", headless: true });
    const contexto = await navegador.newContext({ viewport: { width: 1500, height: 800 } });
    const erros = [];

    await contexto.route("**/*", (rota) => {
        const url = new URL(rota.request().url());
        if(url.hostname.includes("jsdelivr")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso });
        if(url.hostname !== "agenda.test") return rota.abort();
        if(url.pathname.endsWith("auth-guard.js")) return rota.fulfill({ contentType: "text/javascript", body: authFalso });
        const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
        if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
        return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
    });

    const pagina = await contexto.newPage();
    pagina.on("pageerror", e => erros.push(e.message));

    await pagina.goto("http://agenda.test/agenda.html");
    await pagina.waitForSelector(".ag-tabela");
    await pagina.waitForTimeout(100);

    // ---------- texto do tempo ----------
    const H = 3600000, M = 60000;
    const casos = [
        [0, "agora há pouco"], [59000, "agora há pouco"], [M, "há 1 minuto"], [40 * M, "há 40 minutos"],
        [H, "há 1 hora"], [15 * H, "há 15 horas"], [24 * H, "há 1 dia"], [25 * H, "há 1 dia e 1 hora"],
        [51 * H, "há 2 dias e 3 horas"], [48 * H, "há 2 dias"], [-5 * M, "agora há pouco"]
    ];
    for(const [ms, esperado] of casos){
        const obtido = await pagina.evaluate((v) => tempoDesde(v), ms);
        confere(`${ms} ms`, obtido === esperado, obtido);
    }

    // ---------- na janela ----------
    const abrir = async (idades) => {
        await pagina.evaluate((i) => { window.__idades = i; fecharEstoqueAgenda(); return abrirEstoqueAgenda(agendamentos[0]); }, idades);
        await pagina.waitForSelector("#listaEstoqueAgenda .estoque-filial small");
        return pagina.$$eval("#listaEstoqueAgenda .estoque-filial small", l => l.map(e => ({ texto: e.innerText, destaque: e.classList.contains("estoque-desatualizado") })));
    };

    let d = await abrir([3, 15]);
    confere("recente: sem destaque e mostra o tempo", !d[0].destaque && d[0].texto.includes("há 3 horas") && d[0].texto.startsWith("Estoque publicado em"), d[0]);
    confere("mais de 12h: destaque e mostra o tempo", d[1].destaque && d[1].texto.includes("há 15 horas") && d[1].texto.includes("⚠️"), d[1]);
    confere("mantém a data da publicação", /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/.test(d[1].texto), d[1].texto);
    await pagina.screenshot({ path: path.join(saida, "40-estoque-antigo.png") });

    d = await abrir([11.9, 12.1]);
    confere("11h54 ainda não destaca", !d[0].destaque, d[0]);
    confere("12h06 destaca", d[1].destaque, d[1]);

    d = await abrir([30, 75]);
    confere("dias aparecem", d[0].destaque && d[0].texto.includes("há 1 dia e 6 horas") && d[1].texto.includes("há 3 dias e 3 horas"), d.map(x => x.texto));

    d = await abrir([null, 2]);
    confere("sem data não quebra", d[0].texto === "Estoque sem data de publicação" && !d[0].destaque, d[0]);

    const cor = await (async () => {
        await abrir([3, 15]);
        return pagina.$eval(".estoque-desatualizado", e => { const s = getComputedStyle(e); return [s.backgroundColor, s.color, s.opacity]; });
    })();
    confere("destaque é visível de verdade", cor[0] === "rgb(185, 28, 28)" && cor[1] === "rgb(255, 255, 255)" && cor[2] === "1", cor);

    await pagina.evaluate(() => fecharEstoqueAgenda());
    await pagina.click("#btnTema");
    await abrir([3, 15]);
    await pagina.screenshot({ path: path.join(saida, "41-estoque-antigo-claro.png") });

    confere("sem erros de página", erros.length === 0, erros);

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exitCode = falhas ? 1 : 0;

})().catch(e => { console.error(e); process.exit(1); });
