const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");

const clienteFalso = `window.supabase = { createClient(){ return {
    from: () => new Proxy(function(){}, { get(t, n, q){ return n === "then" ? (ok) => ok({ data: [], error: null }) : () => q; } }),
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }) }
}; } };`;

const authFalso = `function ehAdmin(){ return Promise.resolve(false); }
function temAcesso(){ return true; }
function temFilial(){ return true; }
function existeLoginSalvo(){ return true; }
function carregarPerfil(){ return Promise.resolve({}); }
function fazerLogout(){}
function recursoDaPagina(){ return "index"; }
function nomeArquivoAtual(){ return "index.html"; }`;

const casos = [
    ["07.626.346/0001-49", "07626346000149"],
    ["07626346000149", "07626346000149"],
    [" 07.626.346 / 0001-49 ", "07626346000149"],
    ["07.626.346/0001–49", "07626346000149"],
    ["12.ABC.345/01DE-35", "12ABC34501DE35"],
    ["07.626.346/0001-49\n11.222.333/0001-81", "07626346000149\n11222333000181"],
    ["", ""]
];

(async () => {

    const navegador = await chromium.launch({ channel: "chrome", headless: true });
    const contexto = await navegador.newContext();
    const erros = [];

    await contexto.route("**/*", (rota) => {
        const url = new URL(rota.request().url());
        if(url.hostname.includes("jsdelivr")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso });
        if(url.hostname !== "agenda.test") return rota.abort();
        if(url.pathname.endsWith("auth-guard.js")) return rota.fulfill({ contentType: "text/javascript", body: authFalso });
        const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
        if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
        const tipo = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" }[path.extname(arquivo)] || "text/plain";
        return rota.fulfill({ contentType: tipo, body: fs.readFileSync(arquivo) });
    });

    const pagina = await contexto.newPage();
    pagina.on("pageerror", e => erros.push(e.message));

    await pagina.goto("http://agenda.test/index.html");
    await pagina.waitForSelector("#texto");

    let falhas = 0;

    for(const [entrada, esperado] of casos){
        await pagina.fill("#texto", entrada);
        await pagina.click("button:has-text('formatar CNPJ')");
        const obtido = await pagina.inputValue("#texto");
        const ok = obtido === esperado;
        if(!ok) falhas++;
        console.log(ok ? "ok   " : "FALHA", JSON.stringify(entrada), "->", JSON.stringify(obtido));
    }

    if(erros.length){ falhas++; console.log("FALHA erros:", erros); }

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exitCode = falhas ? 1 : 0;

})().catch(e => { console.error(e); process.exit(1); });
