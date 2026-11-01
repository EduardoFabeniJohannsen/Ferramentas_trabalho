// supabase-js de verdade (2.45.0, a mesma das páginas) falando com um servidor
// local que imita o Realtime. Nada aqui toca o Supabase de produção.
const { chromium } = require("playwright-core");
const { WebSocketServer } = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const umd = fs.readFileSync(path.join(raiz, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"));
const hoje = new Date().toLocaleDateString("en-CA");

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

const inscritos = new Map();
const broadcastsHttp = [];
const entradas = [];

const servidor = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if(req.method === "OPTIONS"){ res.writeHead(204); return res.end(); }
    let corpo = "";
    req.on("data", c => corpo += c);
    req.on("end", () => {
        if(req.url.includes("/realtime/v1/api/broadcast")){
            broadcastsHttp.push(JSON.parse(corpo));
            res.writeHead(202); return res.end();
        }
        res.writeHead(404); res.end();
    });
});

const ws = new WebSocketServer({ server: servidor, path: "/realtime/v1/websocket" });

ws.on("connection", (socket) => {
    socket.on("message", (bruto) => {
        const m = JSON.parse(bruto);
        const responder = (payload) => socket.send(JSON.stringify({ topic: m.topic, event: "phx_reply", ref: m.ref, payload }));
        if(m.event === "phx_join"){
            entradas.push(m);
            if(!inscritos.has(m.topic)) inscritos.set(m.topic, new Set());
            inscritos.get(m.topic).add(socket);
            responder({ status: "ok", response: { postgres_changes: [] } });
        }else if(m.event === "heartbeat" || m.event === "access_token"){
            responder({ status: "ok", response: {} });
        }else if(m.event === "broadcast"){
            // self: false = não devolve para quem enviou
            const devolve = m.payload && m.payload.self === true;
            (inscritos.get(m.topic) || []).forEach(s => {
                if(s !== socket || devolve) s.send(JSON.stringify({ topic: m.topic, event: "broadcast", ref: null, payload: m.payload }));
            });
        }
    });
    socket.on("close", () => inscritos.forEach(s => s.delete(socket)));
});

servidor.listen(0, "127.0.0.1", async () => {

    const porta = servidor.address().port;
    const base = `http://127.0.0.1:${porta}`;

    const authFalso = `function ehAdmin(){ return Promise.resolve(false); }
function temAcesso(){ return true; }
function temFilial(){ return true; }
function existeLoginSalvo(){ return true; }
function carregarPerfil(){ return Promise.resolve({}); }
function fazerLogout(){}
function recursoDaPagina(){ return "agenda"; }
function nomeArquivoAtual(){ return "agenda.html"; }`;

    const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

    const navegador = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessRespectPreflightResults"] });
    const contexto = await navegador.newContext();
    const erros = [];
    const cargas = { total: 0 };

    await contexto.route("**/*", (rota) => {
        const url = new URL(rota.request().url());
        if(url.hostname.includes("jsdelivr")) return rota.fulfill({ contentType: "text/javascript", body: umd });
        if(url.hostname === "127.0.0.1" && url.pathname.startsWith("/rest/")){
            if(url.pathname.endsWith("/agendamentos")) cargas.total++;
            const corpo = url.pathname.endsWith("/agendamentos")
                ? [{ id: 1, data: hoje, horario: "08:00", tipo: "Entrega", status: "Confirmado", plataforma: "WAE18R001", cliente: "Cliente Um", prazos_pagamento: [] }]
                : [];
            return rota.fulfill({ contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(corpo) });
        }
        if(url.pathname.startsWith("/realtime/")) return rota.continue();
        if(url.hostname !== "127.0.0.1") return rota.abort();
        if(url.pathname.endsWith("auth-guard.js")) return rota.fulfill({ contentType: "text/javascript", body: authFalso });
        if(url.pathname.endsWith("supabase-config.js")){
            return rota.fulfill({ contentType: "text/javascript", body: `const SUPABASE_URL = "${base}"; const SUPABASE_ANON_KEY = "chave-falsa"; const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);` });
        }
        const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
        if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
        return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
    });

    const abrir = async () => {
        const p = await contexto.newPage();
        p.on("pageerror", e => erros.push(e.message));
        p.on("console", m => { if(m.type() === "error") console.log("   console:", m.text().slice(0, 180)); });
        await p.goto(`http://127.0.0.1:${porta}/agenda.html`);
        await p.waitForSelector(".ag-tabela");
        return p;
    };

    const a = await abrir();
    const b = await abrir();

    const esperar = async (cond, ms = 5000) => {
        const fim = Date.now() + ms;
        while(Date.now() < fim){ if(await cond()) return true; await new Promise(r => setTimeout(r, 50)); }
        return false;
    };

    confere("as duas abas entram no canal", await esperar(() => (inscritos.get("realtime:agenda-mudancas") || new Set()).size === 2), entradas.map(e => e.topic));
    const config = entradas[0]?.payload?.config?.broadcast;
    confere("o canal não devolve o aviso a quem enviou", config && config.self === false, config);

    await new Promise(r => setTimeout(r, 300));

    let antes = cargas.total;
    await a.evaluate(() => avisarAgendaMudou());
    confere("aviso real chega e recarrega a outra aba", await esperar(() => cargas.total === antes + 1, 3000), cargas.total - antes);
    await new Promise(r => setTimeout(r, 1500));
    confere("só a outra aba recarrega", cargas.total === antes + 1, cargas.total - antes);

    // outra página, sem estar inscrita no canal (ex: transportadoras)
    const fora = await contexto.newPage();
    
    const qtdHttp = broadcastsHttp.length;
    antes = cargas.total;
    await b.evaluate(() => {
        const canal = supabaseClient.channel("agenda-mudancas-sem-inscricao");
        return canal.send({ type: "broadcast", event: EVENTO_AGENDA_MUDOU, payload: {} });
    });
    confere("sem inscrição, o envio vai por requisição", await esperar(() => broadcastsHttp.length === qtdHttp + 1, 3000), broadcastsHttp.slice(-1));

    // servidor caiu e voltou: a biblioteca reconecta sozinha
    antes = cargas.total;
    const entradasNoCanal = () => entradas.filter(m => m.topic === "realtime:agenda-mudancas").length;
    const entradasAntes = entradasNoCanal();
    ws.clients.forEach(c => c.terminate());
    // conta as entradas novas: logo depois de cair, o servidor ainda não notou a queda
    const voltou = await esperar(() => entradasNoCanal() >= entradasAntes + 2, 15000);
    confere("conexão caiu: as abas entram de novo", voltou);
    confere("depois de reconectar, recarrega", await esperar(() => cargas.total >= antes + 2, 4000), cargas.total - antes);

    confere("sem erros de página", erros.length === 0, erros);

    await navegador.close();
    servidor.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exit(falhas ? 1 : 0);
});
