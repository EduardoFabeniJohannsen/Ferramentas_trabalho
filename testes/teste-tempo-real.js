// Duas abas (duas pessoas) com banco falso compartilhado. Os avisos usam a
// supabase-js de verdade até o socket não dá: aqui o canal é simulado com
// BroadcastChannel, que também não entrega para quem enviou (como self: false).
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });
const hoje = new Date().toLocaleDateString("en-CA");

const base = { data: hoje, horario: "08:00", tipo: "Transferência", status: "Confirmado", prazos_pagamento: [], frete_conta: "nossa" };

const inicial = [
    { ...base, id: 1, plataforma: "WAE18R001", cliente: "Cliente Um" },
    { ...base, id: 2, plataforma: "WAE18R002", cliente: "Cliente Dois" },
    { ...base, id: 3, plataforma: "WAE18R003", cliente: "Cliente Três" }
];

const clienteFalso = `
window.__enviados = 0;
window.__falhaEnvio = false;
const lerDb = () => JSON.parse(localStorage.getItem("__db"));
const gravarDb = (d) => localStorage.setItem("__db", JSON.stringify(d));
window.supabase = { createClient(){
    const consulta = (tabela) => {
        let inicio = 0, gravando = null, novo = null, idAlvo = null, unica = false, soExcluidos = false, comFalha = false;
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then"){
                    return (ok) => {
                        const db = lerDb();
                        let data = [];
                        if(novo){
                            const linha = { ...novo, id: Math.max(...db.map(l => l.id)) + 1 };
                            db.push(linha); gravarDb(db);
                            data = unica ? linha : [linha];
                        }else if(gravando){
                            const atual = db.find(l => l.id === idAlvo);
                            Object.assign(atual, gravando); gravarDb(db);
                            data = [atual];
                        }else if(tabela === "agendamentos" && inicio === 0){
                            data = db.filter(l => soExcluidos ? l.excluido_em : !l.excluido_em);
                            window.__cargas = (window.__cargas || 0) + 1;
                            if(window.__atrasoCarga){
                                const copia = data, atraso = window.__atrasoCarga;
                                window.__atrasoCarga = 0;
                                setTimeout(() => ok({ data: copia, error: null, count: 0 }), atraso);
                                return;
                            }
                        }
                        ok({ data, error: null, count: 0 });
                    };
                }
                if(nome === "range") return (a) => { inicio = a; return q; };
                if(nome === "insert") return (d) => { novo = d; return q; };
                if(nome === "update") return (d) => { gravando = d; return q; };
                if(nome === "eq") return (c, v) => { if(c === "id") idAlvo = v; return q; };
                if(nome === "not") return () => { soExcluidos = true; return q; };
                if(nome === "single") return () => { unica = true; return q; };
                return () => q;
            }
        });
        return q;
    };
    return {
        from: consulta,
        rpc: async (nome, args) => {
            if(nome === "mover_agendamento_lixeira"){
                const db = lerDb();
                db.find(l => l.id === args.p_id).excluido_em = "2026-10-31T10:00:00Z";
                gravarDb(db);
                return { data: true, error: null };
            }
            return { data: [], error: null };
        },
        channel(nome){
            const bc = new BroadcastChannel(nome);
            return {
                track: async () => "ok",
                presenceState: () => ({}),
                on(tipo, filtro, cb){ bc.onmessage = (e) => { if(e.data.event === filtro.event) cb({}); }; return this; },
                subscribe(cb){ if(nome === "agenda-mudancas") window.__estadoCanal = cb; setTimeout(() => cb("SUBSCRIBED"), 0); return this; },
                send(m){
                    window.__enviados++;
                    if(window.__falhaEnvio) return Promise.reject(new Error("sem rede"));
                    bc.postMessage(m);
                    return Promise.resolve("ok");
                }
            };
        },
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
    const contexto = await navegador.newContext({ viewport: { width: 1000, height: 600 } });
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

    await contexto.addInitScript((db) => {
        if(!localStorage.getItem("__db")) localStorage.setItem("__db", JSON.stringify(db));
        localStorage.setItem("agendaModo", "transportador");
    }, inicial);

    const abrirAba = async () => {
        const p = await contexto.newPage();
        p.on("pageerror", e => erros.push(e.message));
        p.on("dialog", d => d.accept());
        await p.goto("http://agenda.test/agenda.html");
        await p.waitForSelector(".ag-tabela");
        await p.waitForTimeout(100);
        return p;
    };

    const ana = await abrirAba();
    const bia = await abrirAba();

    const clientes = (p) => p.$$eval("tr.ag-item", l => l.map(t => t.innerText).join("|"));
    const cargas = (p) => p.evaluate(() => window.__cargas || 0);
    const espera = async (p, texto, presente = true) => {
        await p.waitForFunction(([t, pres]) => {
            const achou = [...document.querySelectorAll("tr.ag-item")].some(l => l.innerText.includes(t));
            return achou === pres;
        }, [texto, presente], { timeout: 4000 });
    };
    const chega = async (nome, p, texto, presente = true) => {
        const inicio = Date.now();
        try{
            await espera(p, texto, presente);
            confere(nome, true, `${Date.now() - inicio} ms`);
        }catch(e){
            confere(nome, false, await clientes(p));
        }
    };

    // ---------- novo ----------
    await ana.evaluate(() => abrirModalAgenda());
    await ana.locator(".ag-plataforma-item").first().fill("WAE18R010");
    await ana.fill("#agCliente", "Cliente Novo");
    await ana.selectOption("#agTipo", "Transferência");
    await ana.evaluate(() => salvarAgendamento());
    await chega("novo agendamento aparece para a outra pessoa", bia, "Cliente Novo");

    // ---------- status na lista ----------
    await ana.locator("tr.ag-item", { hasText: "Cliente Um" }).locator("select.tag-select").selectOption("Em rota");
    await bia.waitForFunction(() => agendamentos.find(a => a.id === 1).status === "Em rota", null, { timeout: 4000 }).then(() => confere("troca de status chega", true)).catch(() => confere("troca de status chega", false));

    // ---------- edição ----------
    await ana.evaluate(() => { encerrarModalAgenda(); abrirModalAgenda(2); });
    await ana.fill("#agCliente", "Cliente Dois Editado");
    await ana.evaluate(() => salvarAgendamento());
    await chega("edição chega", bia, "Cliente Dois Editado");

    // ---------- lixeira ----------
    await ana.evaluate(() => excluirAgendamento(3));
    await chega("exclusão some da outra pessoa", bia, "Cliente Três", false);

    // ---------- quem salvou não recarrega à toa ----------
    const cargasAnaAntes = await cargas(ana);
    await bia.evaluate(() => { encerrarModalAgenda(); abrirModalAgenda(2); });
    await bia.fill("#agObsEntrega", "x").catch(() => {});
    await bia.evaluate(() => salvarAgendamento());
    await ana.waitForTimeout(1200);
    const cargasBia = await cargas(bia);
    await bia.waitForTimeout(1200);
    confere("quem salvou não recarrega por causa do próprio aviso", (await cargas(bia)) === cargasBia);
    confere("a outra recarrega", (await cargas(ana)) > cargasAnaAntes);

    // ---------- formulário aberto não é interrompido ----------
    await bia.evaluate(() => { encerrarModalAgenda(); removerRascunho("novo"); abrirModalAgenda(); });
    await bia.fill("#agCliente", "Digitando sem salvar");
    const cargasForm = await cargas(bia);
    await ana.evaluate(() => { encerrarModalAgenda(); abrirModalAgenda(1); });
    await ana.fill("#agCliente", "Cliente Um Mudou");
    await ana.evaluate(() => salvarAgendamento());
    await bia.waitForTimeout(3000);
    confere("formulário aberto: não recarrega", (await cargas(bia)) === cargasForm);
    confere("formulário aberto: nada se perde", (await bia.inputValue("#agCliente")) === "Digitando sem salvar");
    await bia.evaluate(() => encerrarModalAgenda());
    await chega("ao fechar o formulário, atualiza", bia, "Cliente Um Mudou");

    // ---------- lupa aberta ----------
    await bia.evaluate(() => abrirEstoqueAgenda(agendamentos[0]));
    const cargasLupa = await cargas(bia);
    await ana.evaluate(() => { encerrarModalAgenda(); abrirModalAgenda(1); });
    await ana.fill("#agCliente", "Cliente Um De Novo");
    await ana.evaluate(() => salvarAgendamento());
    await bia.waitForTimeout(2500);
    confere("lupa aberta: espera fechar", (await cargas(bia)) === cargasLupa && await bia.isVisible("#modalEstoque"));
    await bia.evaluate(() => fecharEstoqueAgenda());
    await chega("ao fechar a lupa, atualiza", bia, "Cliente Um De Novo");

    // ---------- arrastando coluna ----------
    await bia.evaluate(() => { colunaArrastada = "tipo"; });
    const cargasArrasto = await cargas(bia);
    await ana.evaluate(() => { encerrarModalAgenda(); abrirModalAgenda(1); });
    await ana.fill("#agCliente", "Cliente Arrasto");
    await ana.evaluate(() => salvarAgendamento());
    await bia.waitForTimeout(2500);
    confere("arrastando coluna: espera", (await cargas(bia)) === cargasArrasto);
    await bia.evaluate(() => { colunaArrastada = null; });
    await chega("soltou a coluna, atualiza", bia, "Cliente Arrasto");

    // ---------- rolagem ----------
    await bia.setViewportSize({ width: 700, height: 300 });
    await bia.evaluate(() => { $("listaAgenda").scrollLeft = 200; window.scrollTo(0, 150); });
    const rolagem = await bia.evaluate(() => [$("listaAgenda").scrollLeft, window.scrollY]);
    await ana.evaluate(() => { encerrarModalAgenda(); abrirModalAgenda(1); });
    await ana.fill("#agCliente", "Cliente Rolagem");
    await ana.evaluate(() => salvarAgendamento());
    await espera(bia, "Cliente Rolagem");
    const rolagemDepois = await bia.evaluate(() => [$("listaAgenda").scrollLeft, window.scrollY]);
    confere("mantém a rolagem", rolagem[0] > 0 && rolagem[0] === rolagemDepois[0] && rolagem[1] === rolagemDepois[1], [rolagem, rolagemDepois]);
    await bia.setViewportSize({ width: 1000, height: 600 });

    // ---------- filtros e pesquisa continuam ----------
    await bia.evaluate(() => { filtroTransportadora = "__sem__"; statusOcultos.add("Cancelado"); renderizarAgenda(); });
    await ana.evaluate(() => { encerrarModalAgenda(); abrirModalAgenda(1); });
    await ana.fill("#agCliente", "Cliente Filtro");
    await ana.evaluate(() => salvarAgendamento());
    await espera(bia, "Cliente Filtro");
    confere("filtros continuam ativos", await bia.evaluate(() => filtroTransportadora === "__sem__" && statusOcultos.has("Cancelado")));
    await bia.evaluate(() => { filtroTransportadora = ""; statusOcultos.clear(); renderizarAgenda(); });

    // ---------- vários avisos seguidos ----------
    await bia.waitForTimeout(1200);
    const cargasRajada = await cargas(bia);
    await ana.evaluate(async () => { for(let i = 0; i < 5; i++){ await atualizarAgendamento(1, { obsEntrega: "r" + i }); } });
    await bia.waitForTimeout(1500);
    const novasCargas = (await cargas(bia)) - cargasRajada;
    confere("5 avisos seguidos viram poucas recargas", novasCargas >= 1 && novasCargas <= 2, novasCargas);

    // ---------- aba escondida ----------
    await bia.evaluate(() => {
        window.__escondida = true;
        Object.defineProperty(document, "hidden", { configurable: true, get: () => window.__escondida });
    });
    const cargasAba = await cargas(bia);
    await ana.evaluate(() => { encerrarModalAgenda(); abrirModalAgenda(1); });
    await ana.fill("#agCliente", "Cliente Aba");
    await ana.evaluate(() => salvarAgendamento());
    await bia.waitForTimeout(1500);
    confere("aba escondida não gasta recarga", (await cargas(bia)) === cargasAba);
    await bia.evaluate(() => { window.__escondida = false; document.dispatchEvent(new Event("visibilitychange")); });
    await chega("voltou para a aba, atualiza", bia, "Cliente Aba");

    // ---------- reconexão ----------
    await bia.waitForTimeout(1000);
    const cargasRec = await cargas(bia);
    await bia.evaluate(() => window.__estadoCanal("SUBSCRIBED"));
    await bia.waitForTimeout(1200);
    confere("reconectou: recarrega", (await cargas(bia)) > cargasRec);

    // ---------- gravar durante uma recarga ----------
    await bia.evaluate(() => { window.__atrasoCarga = 1500; });
    await bia.evaluate(() => executarRecargaViva());  // volta depois da demora abaixo
    confere("recarga em andamento terminou", true);

    await bia.evaluate(() => { window.__atrasoCarga = 1200; });
    const emAndamento = bia.evaluate(() => executarRecargaViva());
    await bia.waitForTimeout(100);
    await bia.evaluate(async () => {
        const salvo = await atualizarAgendamento(2, { cliente: "Gravado Durante" });
        Object.assign(agendamentos.find(a => a.id === 2), salvo);
    });
    await emAndamento;
    await chega("gravar no meio de uma recarga não volta dado velho", bia, "Gravado Durante");

    // ---------- falha ao avisar ----------
    await ana.evaluate(() => { window.__falhaEnvio = true; });
    await ana.evaluate(() => { encerrarModalAgenda(); abrirModalAgenda(1); });
    await ana.fill("#agCliente", "Cliente Sem Rede");
    await ana.evaluate(() => salvarAgendamento());
    const fechouAna = !(await ana.isVisible("#agCliente"));
    confere("aviso falhou: o salvamento segue normal", fechouAna && (await clientes(ana)).includes("Cliente Sem Rede"));
    await ana.evaluate(() => { window.__falhaEnvio = false; });

    confere("sem erros de página", erros.length === 0, erros);

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exitCode = falhas ? 1 : 0;

})().catch(e => { console.error(e); process.exit(1); });
