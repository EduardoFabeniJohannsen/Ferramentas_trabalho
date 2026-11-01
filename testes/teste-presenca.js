// supabase-js de verdade com um servidor local que fala o protocolo de presença
// do Realtime. Três pessoas em navegadores separados. Não toca a produção.
const { chromium } = require("playwright-core");
const { WebSocketServer } = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });
const umd = fs.readFileSync(path.join(raiz, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"));

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

// ---------- servidor de presença ----------
const conexoes = new Map(); // socket -> { topic: { key, meta } }
const rastreados = [];
let ref = 0;

const servidor = http.createServer((req, res) => { res.writeHead(404); res.end(); });
const ws = new WebSocketServer({ server: servidor, path: "/realtime/v1/websocket" });

const nosTopicos = (topic) => [...conexoes.entries()].filter(([, t]) => t[topic]);

const estadoDe = (topic) => {
    const estado = {};
    nosTopicos(topic).forEach(([, t]) => {
        const { key, meta } = t[topic];
        if(!meta) return;
        (estado[key] = estado[key] || { metas: [] }).metas.push(meta);
    });
    return estado;
};

const paraTodos = (topic, event, payload) => {
    nosTopicos(topic).forEach(([s]) => s.send(JSON.stringify({ topic, event, ref: null, payload })));
};

ws.on("connection", (socket) => {
    conexoes.set(socket, {});
    socket.on("message", (bruto) => {
        const m = JSON.parse(bruto);
        const responder = (payload) => socket.send(JSON.stringify({ topic: m.topic, event: "phx_reply", ref: m.ref, payload }));
        const t = conexoes.get(socket);
        if(m.event === "phx_join"){
            t[m.topic] = { key: m.payload?.config?.presence?.key || "", meta: null };
            responder({ status: "ok", response: { postgres_changes: [] } });
            socket.send(JSON.stringify({ topic: m.topic, event: "presence_state", ref: null, payload: estadoDe(m.topic) }));
        }else if(m.event === "heartbeat" || m.event === "access_token"){
            responder({ status: "ok", response: {} });
        }else if(m.event === "presence"){
            responder({ status: "ok", response: {} });
            const eu = t[m.topic];
            const velho = eu.meta;
            rastreados.push(m.payload.payload);
            eu.meta = { ...m.payload.payload, phx_ref: String(++ref), ...(velho ? { phx_ref_prev: velho.phx_ref } : {}) };
            paraTodos(m.topic, "presence_diff", {
                joins: { [eu.key]: { metas: [eu.meta] } },
                leaves: velho ? { [eu.key]: { metas: [velho] } } : {}
            });
        }
    });
    socket.on("close", () => {
        const t = conexoes.get(socket);
        conexoes.delete(socket);
        Object.entries(t).forEach(([topic, eu]) => {
            if(eu.meta) paraTodos(topic, "presence_diff", { joins: {}, leaves: { [eu.key]: { metas: [eu.meta] } } });
        });
    });
});

servidor.listen(0, "127.0.0.1", async () => {

    const porta = servidor.address().port;
    const base = `http://127.0.0.1:${porta}`;

    const authFalso = `let perfilUsuario = { admin: true, acessos: [], filiais: [] };
function ehAdmin(){ return Promise.resolve(true); }
function temAcesso(){ return true; }
function temFilial(){ return true; }
function existeLoginSalvo(){ return true; }
function carregarPerfil(){ return Promise.resolve(perfilUsuario); }
function fazerLogout(){}
function recursoDaPagina(arquivo){ return String(arquivo || "").replace(/\\.html$/i, "").toLowerCase(); }
function nomeArquivoAtual(){ return location.pathname.split("/").pop() || "index.html"; }`;

    const perfis = [
        { id: "admin1", email: "admin@exemplo.com", acessos: [], filiais: [], ativo: true },
        { id: "ana", email: "ana@exemplo.com", acessos: [], filiais: [], ativo: true },
        { id: "bia", email: "<b>bia</b>@exemplo.com", acessos: [], filiais: [], ativo: true }
    ];

    const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

    const navegador = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessRespectPreflightResults"] });

    const erros = [];

    const contextoDe = async (usuario) => {
        const ctx = await navegador.newContext({ viewport: { width: 1200, height: 750 } });
        await ctx.route("**/*", (rota) => {
            const url = new URL(rota.request().url());
            if(url.hostname.includes("jsdelivr")) return rota.fulfill({ contentType: "text/javascript", body: umd });
            if(url.pathname.startsWith("/realtime/")) return rota.continue();
            if(url.pathname.startsWith("/rest/")){
                const corpo = url.pathname.endsWith("/perfis") ? perfis : [];
                return rota.fulfill({ contentType: "application/json", body: JSON.stringify(corpo) });
            }
            if(url.hostname !== "127.0.0.1") return rota.abort();
            if(url.pathname.endsWith("auth-guard.js")) return rota.fulfill({ contentType: "text/javascript", body: authFalso });
            if(url.pathname.endsWith("supabase-config.js")){
                return rota.fulfill({ contentType: "text/javascript", body: `const SUPABASE_URL = "${base}"; const SUPABASE_ANON_KEY = "chave-falsa"; const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    supabaseClient.auth.getSession = async () => ({ data: { session: ${usuario ? `{ user: { id: "${usuario}", email: "${usuario}@x" } }` : "null"} } });` });
            }
            const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
            if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
            return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
        });
        return ctx;
    };

    const abrir = async (ctx, pagina) => {
        const p = await ctx.newPage();
        p.on("pageerror", e => erros.push(`${pagina}: ${e.message}`));
        await p.goto(`${base}/${pagina}`);
        return p;
    };

    const esperar = async (cond, ms = 5000) => {
        const fim = Date.now() + ms;
        while(Date.now() < fim){ try{ if(await cond()) return true; }catch(e){} await new Promise(r => setTimeout(r, 80)); }
        return false;
    };

    const ctxAdmin = await contextoDe("admin1");
    const admin = await abrir(ctxAdmin, "admin.html");

    const linhas = () => admin.$$eval("#listaOnline li", l => l.map(e => ({ classe: e.className, texto: e.innerText.replace(/\n/g, " ") })));
    const linhaDe = async (trecho) => (await linhas()).find(l => l.texto.includes(trecho));
    const titulo = () => admin.innerText("#tituloOnline");

    confere("admin aparece online", await esperar(async () => !!(await linhaDe("admin@exemplo.com"))), await linhas());

    // ---------- outra pessoa entra ----------
    const ctxAna = await contextoDe("ana");
    const anaAgenda = await abrir(ctxAna, "agenda.html");
    confere("pessoa entra: aparece sozinha", await esperar(async () => !!(await linhaDe("ana@exemplo.com"))));
    let l = await linhaDe("ana@");
    confere("mostra a página e que está usando", l.texto.includes("Agenda: usando agora") && l.classe.includes("online-usando"), l);

    const ctxBia = await contextoDe("bia");
    const biaPropostas = await abrir(ctxBia, "propostas.html");
    confere("segunda pessoa", await esperar(async () => !!(await linhaDe("bia"))));
    l = await linhaDe("bia");
    confere("e-mail aparece como texto, sem virar HTML", l.texto.includes("<b>bia</b>@exemplo.com") && (await admin.locator("#listaOnline b").count()) === 0, l);
    confere("página Propostas", l.texto.includes("Propostas: usando agora"), l);
    confere("título conta as pessoas", (await titulo()) === "Online agora: 3 (3 usando)", await titulo());

    // ---------- parado ----------
    await anaAgenda.evaluate(() => { ultimoUsoPresenca = Date.now() - 3 * 60 * 1000; enviarPresenca(); });
    confere("sem mexer 2 min: parado", await esperar(async () => (await linhaDe("ana@")).classe.includes("online-parado")));
    l = await linhaDe("ana@");
    confere("mostra há quanto tempo", l.texto.includes("Agenda: parado há menos de 1 min"), l);
    confere("título separa quem usa", (await titulo()) === "Online agora: 3 (2 usando)", await titulo());
    await admin.screenshot({ path: path.join(saida, "60-online.png") });

    // conta o tempo sem ninguém avisar
    await admin.evaluate(() => {
        const original = Date.now;
        const atraso = 12 * 60 * 1000;
        Date.now = () => original() + atraso;
        desenharUsuariosOnline();
        Date.now = original;
    });
    l = await linhaDe("ana@");
    confere("o tempo avança", l.texto.includes("parado há 12 min"), l);

    await anaAgenda.mouse.move(100, 100);
    await anaAgenda.mouse.move(120, 120);
    confere("mexeu: volta a usando na hora", await esperar(async () => (await linhaDe("ana@")).classe.includes("online-usando"), 2500));

    // ---------- aba em segundo plano ----------
    await biaPropostas.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
    });
    confere("aba escondida", await esperar(async () => (await linhaDe("bia")).classe.includes("online-oculto")));
    l = await linhaDe("bia");
    confere("texto de segundo plano", l.texto.includes("Propostas: em segundo plano há menos de 1 min"), l);
    await biaPropostas.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
        document.dispatchEvent(new Event("visibilitychange"));
    });
    confere("voltou para a aba: usando", await esperar(async () => (await linhaDe("bia")).classe.includes("online-usando")));

    // ---------- mudou de página ----------
    await anaAgenda.goto(`${base}/estoque.html`);
    confere("mudou de página: atualiza", await esperar(async () => { const x = await linhaDe("ana@"); return x && x.texto.includes("Estoque: usando agora") && !x.texto.includes("Agenda"); }), await linhaDe("ana@"));

    // ---------- várias abas ----------
    const anaSegunda = await abrir(ctxAna, "tabelas.html");
    await esperar(async () => (await linhaDe("ana@")).texto.includes("Tabelas"));
    l = await linhaDe("ana@");
    confere("duas abas da mesma pessoa numa linha só", l.texto.includes("Estoque") && l.texto.includes("Tabelas") && (await linhas()).filter(x => x.texto.includes("ana@")).length === 1, l);
    await anaSegunda.evaluate(() => { ultimoUsoPresenca = Date.now() - 3 * 60 * 1000; enviarPresenca(); });
    await esperar(async () => (await linhaDe("ana@")).texto.includes("parado"));
    l = await linhaDe("ana@");
    confere("vale o melhor estado das abas", l.classe.includes("online-usando") && l.texto.indexOf("Estoque") < l.texto.indexOf("Tabelas"), l);
    await admin.screenshot({ path: path.join(saida, "61-online-abas.png") });
    await anaSegunda.close();
    confere("fechou uma aba: some só ela", await esperar(async () => { const x = await linhaDe("ana@"); return x && !x.texto.includes("Tabelas") && x.texto.includes("Estoque"); }));

    // ---------- saiu ----------
    await anaAgenda.close();
    confere("fechou tudo: some da lista", await esperar(async () => !(await linhaDe("ana@"))));

    // ---------- sem login ----------
    const antes = rastreados.length;
    const ctxAnonimo = await contextoDe(null);
    const anonimo = await abrir(ctxAnonimo, "index.html");
    await anonimo.waitForTimeout(600);
    confere("sem login não informa nada", rastreados.length === antes);

    // ---------- o que trafega ----------
    const chaves = [...new Set(rastreados.flatMap(p => Object.keys(p)))].sort().join();
    confere("só vai página, estado e horário", chaves === "desde,estado,pagina", chaves);
    confere("nenhum e-mail no canal", !JSON.stringify(rastreados).includes("@"));

    // ---------- desconhecido ----------
    const ctxNovo = await contextoDe("fantasma");
    await abrir(ctxNovo, "WEG.html");
    confere("id fora da lista: identifica como desconhecido", await esperar(async () => { const x = await linhaDe("não identificado"); return x && x.texto.includes("WEG"); }));

    // ---------- atualizar a tabela mantém ----------
    await admin.click("button:has-text('Atualizar')");
    await admin.waitForTimeout(300);
    confere("Atualizar mantém o painel", !!(await linhaDe("admin@exemplo.com")));

    // ---------- a tabela de acessos segue igual ----------
    confere("tabela de usuários continua", (await admin.locator("#corpoAdmin tr").count()) === 3);

    // ---------- reconexão ----------
    ws.clients.forEach(c => c.terminate());
    await admin.waitForTimeout(300);
    confere("conexão caiu e voltou: todos reaparecem", await esperar(async () => !!(await linhaDe("admin@exemplo.com")) && !!(await linhaDe("bia")), 20000), await linhas());

    // ---------- todas as páginas ----------
    const ctxTodas = await contextoDe("carla");
    for(const [arquivo, nome] of [["index.html", "Início"], ["propostas.html", "Propostas"], ["agenda.html", "Agenda"], ["estoque.html", "Estoque"], ["tabelas.html", "Tabelas"], ["WEG.html", "WEG"], ["transportadoras.html", "Transportadoras"]]){
        const p = await abrir(ctxTodas, arquivo);
        const ok = await esperar(async () => {
            const x = (await linhas()).find(y => y.texto.includes("não identificado") && y.texto.includes(`${nome}:`));
            return !!x;
        });
        confere(`${arquivo} aparece como ${nome}`, ok, ok ? undefined : await linhas());
        await p.close();
    }

    const semEstoque = erros.filter(e => !e.includes("reading 'status'") && !e.includes("reading 'avisos'"));
    confere("sem erros de página", semEstoque.length === 0, semEstoque);

    await navegador.close();
    servidor.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exit(falhas ? 1 : 0);
});
