// Agenda, modo transportador: ordenar clicando no título da coluna (▲, ▼, volta),
// Horário ▼ (dias mais recentes primeiro), lista sem a separação por dia quando
// ordena por outra coluna, atalho "Hoje e anteriores" e a escolha salva.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..", "site");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });

// datas no fuso do computador (é o que a página usa)
const dia = (n) => {
    const data = new Date();
    data.setDate(data.getDate() + n);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
};

const base = { tipo: "Entrega", status: "Confirmado", motorista: "Motorista A", periodo: "3 dias", frete_conta: "nossa", prazos_pagamento: [] };

// R001 hoje 08h Trans B 500 com card · R002 hoje 14h Trans A 1200 · R003 ontem sem transportadora 300
// R004 anteontem Trans A sem frete · R005 amanhã Trans B 800
const linhas = [
    { ...base, id: 1, data: dia(0), horario: "08:00", plataforma: "WAE18R001", cliente: "Ana", transportadora: "Trans B", frete: 500, card: "CARD-1" },
    { ...base, id: 2, data: dia(0), horario: "14:00", plataforma: "WAE18R002", cliente: "Bia", transportadora: "Trans A", frete: 1200 },
    { ...base, id: 3, data: dia(-1), horario: "09:00", plataforma: "WAE18R003", cliente: "Caio", transportadora: "", frete: 300 },
    { ...base, id: 4, data: dia(-2), horario: "10:00", plataforma: "WAE18R004", cliente: "Duda", transportadora: "Trans A", frete: null },
    { ...base, id: 5, data: dia(1), horario: "08:00", plataforma: "WAE18R005", cliente: "Edu", transportadora: "Trans B", frete: 800 }
];

const clienteFalso = `
window.supabase = { createClient(){
    const linhas = ${JSON.stringify(linhas)};
    const consulta = (tabela) => {
        let inicio = 0;
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then"){
                    const data = inicio !== 0 ? [] : tabela === "agendamentos" ? linhas : tabela === "transportadoras" ? [{ id: 1, nome: "Trans A" }, { id: 2, nome: "Trans B" }] : [];
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
        storage: { from: () => ({}) }
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
        if(url.pathname.endsWith("/vendor/supabase-2.45.0.js")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso });
        if(url.hostname !== "agenda.test") return rota.abort();
        if(url.pathname.endsWith("auth-guard.js")) return rota.fulfill({ contentType: "text/javascript", body: authFalso });
        const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
        if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
        return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
    });

    const pagina = await contexto.newPage();
    pagina.on("pageerror", e => erros.push(e.message));
    pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_FAILED|Valor salvo inválido/.test(m.text())) erros.push(m.text()); });

    const abrir = async () => {
        await pagina.goto("http://agenda.test/agenda.html");
        await pagina.waitForSelector("tr.ag-item");
    };

    // "R001,R002..." na ordem da tela
    const ordem = () => pagina.$$eval("tr.ag-item .ag-titulo", l => l.map(t => t.textContent.match(/R\d{3}/)[0]).join());
    const dias = () => pagina.$$eval("tr.ag-dia th", l => l.length);
    const clicarTitulo = async (id) => { await pagina.click(`.ag-cab-${id}`, { position: { x: 12, y: 8 } }); await pagina.waitForTimeout(30); };
    const tituloDe = (id) => pagina.$eval(`.ag-cab-${id}`, e => e.textContent.trim());
    const resumo = () => pagina.innerText("#resumoOrdem");
    const salvo = () => pagina.evaluate(() => JSON.parse(localStorage.getItem("agendaOrdemColuna:u1")));

    await abrir();
    await pagina.click("#btnModoTransportador");
    await pagina.waitForTimeout(50);

    // ---------- ordem normal ----------
    confere("normal: por data e horário, separado por dia", (await ordem()) === "R004,R003,R001,R002,R005" && (await dias()) === 4, [await ordem(), await dias()]);
    confere("normal: título sem seta, clicável", !(await tituloDe("frete")).includes("▲") && (await pagina.locator(".ag-cab-frete.ordenavel").count()) === 1);
    confere("normal: sem aviso de ordem", (await resumo()) === "" && !(await pagina.isVisible("#btnOrdemNormal")));

    // ---------- Horário ▼ ----------
    await clicarTitulo("horario");
    confere("Horário: o 1º clique já é ▼ (o ▲ é a ordem normal)", (await tituloDe("horario")).endsWith("▼"), await tituloDe("horario"));
    confere("Horário ▼: dias mais recentes primeiro, horário do dia em ordem", (await ordem()) === "R005,R001,R002,R003,R004" && (await dias()) === 4, await ordem());
    const primeiroDia = await pagina.$eval("tr.ag-dia th", e => e.textContent);
    confere("Horário ▼: amanhã no topo", primeiroDia.includes("amanhã"), primeiroDia);
    confere("Horário ▼: avisa e mostra o ↺", (await resumo()).includes("Horário (dias mais recentes primeiro)") && await pagina.isVisible("#btnOrdemNormal"), await resumo());
    confere("Horário ▼: o select da ordem dentro do dia continua valendo", !(await pagina.isDisabled("#ordemAgenda")));

    // o exemplo: sem card, de hoje para trás
    await pagina.evaluate(() => { alternarSemCard(); selecionarAteHoje(); });
    confere("sem card + hoje e anteriores + Horário ▼: de hoje para trás", (await ordem()) === "R002,R003,R004", await ordem());
    await pagina.screenshot({ path: path.join(saida, "ordem-1-sem-card-hoje-para-tras.png") });
    await pagina.evaluate(() => limparFiltros());
    confere("limpar filtros não mexe na ordem", (await ordem()) === "R005,R001,R002,R003,R004", await ordem());

    await clicarTitulo("horario");
    confere("Horário de novo: volta ao normal", (await ordem()) === "R004,R003,R001,R002,R005" && !(await tituloDe("horario")).includes("▼") && (await resumo()) === "");

    // ---------- Frete ----------
    await clicarTitulo("frete");
    confere("Frete ▲: menor primeiro, sem frete no fim", (await ordem()) === "R003,R001,R005,R002,R004", await ordem());
    confere("Frete ▲: seta no título", (await tituloDe("frete")).endsWith("▲"), await tituloDe("frete"));
    confere("Frete: sem a separação por dia", (await dias()) === 0, await dias());
    const horario = await pagina.$$eval("tr.ag-item td.ag-hora", l => l.map(td => td.innerText.replace(/\s+/g, " ").trim()));
    confere("Frete: a data aparece junto do horário", /^\S+ \d{2}\/\d{2} 09:00$/.test(horario[0]), horario);
    confere("Frete: o select da ordem dentro do dia fica desligado", await pagina.isDisabled("#ordemAgenda"));
    confere("Frete: avisa a ordem", (await resumo()).includes("Frete (menor primeiro)"), await resumo());
    await clicarTitulo("frete");
    confere("Frete ▼: maior primeiro, sem frete continua no fim", (await ordem()) === "R002,R005,R001,R003,R004" && (await tituloDe("frete")).endsWith("▼"), await ordem());
    confere("Frete ▼: avisa", (await resumo()).includes("Frete (maior primeiro)"), await resumo());
    await pagina.screenshot({ path: path.join(saida, "ordem-2-frete-maior.png") });
    confere("Frete ▼: fica salvo", JSON.stringify(await salvo()) === '{"id":"frete","direcao":-1}', await salvo());

    // ---------- Transportadora (outra coluna começa no ▲) ----------
    await clicarTitulo("transportadora");
    confere("Transportadora ▲: A → Z, empate pela data, sem transportadora no fim", (await ordem()) === "R004,R002,R001,R005,R003", await ordem());
    confere("só uma coluna com seta", !(await tituloDe("frete")).includes("▼") && (await pagina.locator(".ag-cab-coluna.ordenada").count()) === 1);

    // a borda (largura) e arrastar o título não ordenam
    await pagina.click(".ag-cab-motorista .ag-redimensiona");
    confere("clique na borda da coluna não ordena", (await tituloDe("motorista")).indexOf("▲") === -1 && (await ordem()) === "R004,R002,R001,R005,R003");
    await pagina.dragAndDrop(".ag-cab-motorista", ".ag-cab-proposta", { targetPosition: { x: 4, y: 8 } });
    const titulosDepois = await pagina.$$eval(".ag-cab-coluna", l => l.map(t => t.textContent.trim()));
    confere("arrastar o título muda a coluna de lugar e não ordena", titulosDepois.indexOf("Motorista") === titulosDepois.indexOf("Proposta") - 1 && (await pagina.locator(".ag-cab-coluna.ordenada").count()) === 1 && (await tituloDe("transportadora")).endsWith("▲") && (await ordem()) === "R004,R002,R001,R005,R003", titulosDepois);
    await pagina.evaluate(() => restaurarOrdemColunas());

    // ---------- salvo ao reabrir ----------
    await abrir();
    confere("reabrindo: continua ordenado por transportadora", (await ordem()) === "R004,R002,R001,R005,R003" && (await tituloDe("transportadora")).endsWith("▲"), await ordem());

    // ---------- expedição não muda ----------
    await pagina.click("#btnModoExpedicao");
    await pagina.waitForTimeout(50);
    confere("expedição: títulos não ordenam e os dias continuam separados", (await pagina.locator(".ag-cab-coluna.ordenavel").count()) === 0 && (await dias()) > 0 && (await resumo()) === "");
    await pagina.click("#btnModoTransportador");
    await pagina.waitForTimeout(50);

    // ---------- coluna oculta: a ordem dela não vale ----------
    await pagina.evaluate(() => ligarColuna(COLUNAS_TRANSPORTADOR.find(c => c.id === "transportadora"), false));
    confere("coluna ordenada escondida: volta à ordem normal", (await ordem()) === "R004,R003,R001,R002,R005" && (await resumo()) === "", await ordem());
    await pagina.evaluate(() => ligarColuna(COLUNAS_TRANSPORTADOR.find(c => c.id === "transportadora"), true));
    confere("mostrou de novo: a ordem volta", (await ordem()) === "R004,R002,R001,R005,R003", await ordem());

    // ---------- ↺ Ordem normal ----------
    await pagina.click("#btnOrdemNormal");
    await pagina.waitForTimeout(30);
    confere("↺ Ordem normal", (await ordem()) === "R004,R003,R001,R002,R005" && (await dias()) === 4 && JSON.stringify(await salvo()) === '{"id":"","direcao":1}', [await ordem(), await salvo()]);

    // ---------- valor salvo estragado não quebra ----------
    for(const valor of ['{"id":"constructor","direcao":1}', '{"id":"frete","direcao":5}', "{quebrado", '"texto"']){
        await pagina.evaluate((v) => localStorage.setItem("agendaOrdemColuna:u1", v), valor);
        await abrir();
        await pagina.click("#btnModoTransportador");
        await pagina.waitForTimeout(30);
        confere(`valor salvo inválido (${valor}): ordem normal`, (await ordem()) === "R004,R003,R001,R002,R005", await ordem());
    }

    confere("sem erros na página", erros.length === 0, erros);

    await navegador.close();

    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exit(falhas ? 1 : 0);

})().catch(e => { console.error(e); process.exit(1); });
