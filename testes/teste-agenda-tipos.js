// Agenda, modo transportador: filtro de tipo com caixinhas (igual ao de status):
// marcar dois tipos específicos, "(Selecionar tudo)", contagem por tipo, aviso
// dos filtros, escolha salva por usuário e a expedição sem o filtro.
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

const base = { status: "Confirmado", motorista: "Motorista A", periodo: "3 dias", frete_conta: "nossa", prazos_pagamento: [] };

// R001 Entrega · R002 Coleta · R003 Transferência entre obras · R004 entre unidades
// R005 Troca técnica · R006 Entrega (Trans B)
const linhas = [
    { ...base, id: 1, tipo: "Entrega", data: dia(0), horario: "08:00", plataforma: "WAE18R001", cliente: "Ana", transportadora: "Trans A" },
    { ...base, id: 2, tipo: "Coleta", data: dia(0), horario: "10:00", plataforma: "WAE18R002", cliente: "Bia", transportadora: "Trans A" },
    { ...base, id: 3, tipo: "Transferência", data: dia(-1), horario: "09:00", plataforma: "WAE18R003", cliente: "Caio", transportadora: "Trans B" },
    { ...base, id: 4, tipo: "Transferência entre unidades", data: dia(0), horario: "12:00", plataforma: "WAE18R004", cliente: "", transportadora: "Trans B" },
    { ...base, id: 5, tipo: "Troca técnica", data: dia(1), horario: "08:00", plataforma: "WAE18R005", cliente: "Edu", transportadora: "Trans A" },
    { ...base, id: 6, tipo: "Entrega", data: dia(1), horario: "09:00", plataforma: "WAE18R006", cliente: "Fê", transportadora: "Trans B", card: "CARD-6" }
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
    const contexto = await navegador.newContext({ viewport: { width: 1500, height: 900 } });
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
        await pagina.waitForTimeout(50);
    };

    // "R001,R002..." na ordem da tela
    const ordem = () => pagina.$$eval("tr.ag-item .ag-titulo", l => l.map(t => (t.textContent.match(/R\d{3}/) || ["?"])[0]).sort().join());
    const botao = async () => (await pagina.innerText("#btnTipos")).trim();
    const resumo = () => pagina.innerText("#resumoFiltros");
    const caixa = (texto) => pagina.locator("#listaTiposFiltro label", { hasText: texto }).locator("input");
    const linhaTipo = (texto) => pagina.locator("#listaTiposFiltro label", { hasText: texto }).innerText();
    const salvo = () => pagina.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("agendaTipos:u1") || "null")?.slice().sort()));
    const visivel = (sel) => pagina.isVisible(sel);

    await abrir();
    await pagina.click("#btnModoTransportador");
    await pagina.waitForTimeout(50);

    // ---------- sem filtro ----------
    confere("sem filtro: todos os tipos", (await ordem()) === "R001,R002,R003,R004,R005,R006", await ordem());
    confere("sem filtro: botão limpo", (await botao()) === "📦 Todos os tipos ▾" && (await pagina.innerText("#btnFiltros")).trim() === "⚙️ Filtros ▾", await botao());

    // ---------- a lista com caixinhas ----------
    await pagina.click("#btnFiltros");
    await pagina.click("#btnTipos");
    confere("a lista de tipos abre dentro do painel de filtros", await visivel("#painelTipos") && await visivel("#painelFiltros"));
    const nomes = await pagina.$$eval("#listaTiposFiltro .tag", l => l.map(e => `${e.textContent}|${e.dataset.tipo}`));
    confere("os seis tipos, com o nome da tela e a cor da coluna Tipo", JSON.stringify(nomes) === JSON.stringify([
        "Entrega|Entrega", "Coleta|Coleta", "Transferência entre obras|Transferência", "Transferência entre unidades|Transferência entre unidades", "Troca técnica|Troca técnica", "Frete frustrado|Frete frustrado"
    ]), nomes);
    confere("contagem de cada tipo", (await linhaTipo("Entrega")).includes("(2)") && (await linhaTipo("Coleta")).includes("(1)"), [await linhaTipo("Entrega"), await linhaTipo("Coleta")]);
    confere("tudo marcado", await pagina.isChecked("#marcarTodosTipos") && await caixa("Coleta").isChecked());

    // desmarcar tudo e marcar só os dois que interessam
    await pagina.uncheck("#marcarTodosTipos");
    confere("(Selecionar tudo) desmarcado: nenhum", (await ordem()) === "" && (await botao()) === "📦 Tipos: nenhum ▾", [await ordem(), await botao()]);
    confere("nenhum tipo aparece no aviso", (await resumo()).includes("nenhum tipo"), await resumo());
    await caixa("Entrega").check();
    confere("um tipo: o nome no botão", (await ordem()) === "R001,R006" && (await botao()) === "📦 Tipo: Entrega ▾", [await ordem(), await botao()]);
    confere("meio-termo no (Selecionar tudo)", await pagina.$eval("#marcarTodosTipos", e => e.indeterminate && !e.checked));
    await caixa("Coleta").check();
    confere("dois tipos específicos: Entrega + Coleta", (await ordem()) === "R001,R002,R006", await ordem());
    confere("dois tipos: os nomes no botão", (await botao()) === "📦 Tipos: Entrega + Coleta ▾" && await pagina.$eval("#btnTipos", e => e.classList.contains("filtrando")), await botao());
    confere("aviso: tipo Entrega + Coleta, 1 filtro ativo", (await resumo()).includes("tipo Entrega + Coleta") && (await pagina.innerText("#btnFiltros")).includes("1 ativo"), await resumo());
    confere("a lista continua aberta", await visivel("#painelTipos"));
    await pagina.screenshot({ path: path.join(saida, "tipos-1-entrega-e-coleta.png") });

    await caixa("Troca técnica").check();
    confere("três tipos: N de 6 no botão", (await ordem()) === "R001,R002,R005,R006" && (await botao()) === "📦 Tipos: 3 de 6 ▾", [await ordem(), await botao()]);
    await caixa("Troca técnica").uncheck();
    confere("fica salvo os desmarcados", (await salvo()) === JSON.stringify(["Frete frustrado", "Transferência", "Transferência entre unidades", "Troca técnica"]), await salvo());

    // a contagem respeita os outros filtros e acompanha com a lista aberta
    await pagina.locator("#chipsTransportadora .chip", { hasText: "Trans A" }).click();
    confere("com Trans A: só Entrega e Coleta dela, contagem da lista aberta atualizada", (await ordem()) === "R001,R002" && await visivel("#painelTipos") && (await linhaTipo("Entrega")).includes("(1)") && (await linhaTipo("Transferência entre unidades")).includes("(0)"), [await ordem(), await linhaTipo("Entrega")]);
    await pagina.locator("#chipsTransportadora .chip", { hasText: "Todas" }).click();

    // salvou com um tipo desmarcado: o aviso diz por que não aparece
    const aviso = await pagina.evaluate(() => avisoSalvoEscondido(agendamentos.find(ag => ag.id === 3)));
    confere("salvo escondido pelo tipo: avisa", aviso.includes('tipo "Transferência entre obras" desmarcado'), aviso);

    // ---------- um painel de cada vez, clicar fora, Esc ----------
    await pagina.click("#btnStatus");
    confere("abrir status fecha tipos", await visivel("#painelStatus") && !(await visivel("#painelTipos")));
    await pagina.click("#btnTipos");
    confere("abrir tipos fecha status", await visivel("#painelTipos") && !(await visivel("#painelStatus")));
    await pagina.click("#painelFiltros .painel-filtros-titulo");
    confere("clicar fora da lista fecha só ela", !(await visivel("#painelTipos")) && await visivel("#painelFiltros"));
    await pagina.click("#btnTipos");
    await pagina.keyboard.press("Escape");
    confere("Esc fecha", !(await visivel("#painelTipos")) && !(await visivel("#painelFiltros")));

    // ---------- reabrir mantém ----------
    await abrir();
    confere("reabrindo: continua Entrega + Coleta", (await ordem()) === "R001,R002,R006" && (await botao()) === "📦 Tipos: Entrega + Coleta ▾", [await ordem(), await botao()]);
    await pagina.click("#btnFiltros");
    await pagina.click("#btnTipos");
    confere("reabrindo: as caixinhas como ficaram", await caixa("Entrega").isChecked() && !(await caixa("Troca técnica").isChecked()));
    await pagina.keyboard.press("Escape");

    // ---------- expedição: sem o filtro de tipo ----------
    await pagina.click("#btnModoExpedicao");
    await pagina.waitForTimeout(50);
    await pagina.click("#btnFiltros");
    confere("expedição: o filtro de tipo some", !(await visivel("#btnTipos")));
    confere("expedição: o tipo não filtra nem aparece no aviso", (await ordem()) === "R001,R004,R005,R006" && !(await resumo()).includes("tipo"), [await ordem(), await resumo()]);
    // limpar na expedição não apaga a escolha do transportador
    await pagina.click("#btnSemCard");
    await pagina.keyboard.press("Escape");
    await pagina.click("#btnLimparFiltros");
    await pagina.click("#btnModoTransportador");
    await pagina.waitForTimeout(50);
    confere("limpar na expedição mantém os tipos do transportador", (await ordem()) === "R001,R002,R006" && (await salvo()) === JSON.stringify(["Frete frustrado", "Transferência", "Transferência entre unidades", "Troca técnica"]), [await ordem(), await salvo()]);

    // ---------- (Selecionar tudo) e limpar ----------
    await pagina.click("#btnFiltros");
    await pagina.click("#btnTipos");
    await pagina.check("#marcarTodosTipos");
    confere("(Selecionar tudo): todos de novo", (await ordem()) === "R001,R002,R003,R004,R005,R006" && (await botao()) === "📦 Todos os tipos ▾" && (await salvo()) === "[]", [await ordem(), await botao(), await salvo()]);
    await caixa("Coleta").uncheck();
    await pagina.keyboard.press("Escape");
    await pagina.click("#btnLimparFiltros");
    confere("limpar filtros solta os tipos e salva", (await ordem()) === "R001,R002,R003,R004,R005,R006" && (await salvo()) === "[]", [await ordem(), await salvo()]);

    // ---------- valor salvo estragado não quebra ----------
    for(const valor of ["{quebrado", '"texto"', '["Xyz"]', '{"Entrega":1}']){
        await pagina.evaluate((v) => localStorage.setItem("agendaTipos:u1", v), valor);
        await abrir();
        confere(`valor salvo inválido (${valor}): todos os tipos`, (await ordem()) === "R001,R002,R003,R004,R005,R006" && (await botao()) === "📦 Todos os tipos ▾", [await ordem(), await botao()]);
    }

    confere("sem erros na página", erros.length === 0, erros);

    await navegador.close();

    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exit(falhas ? 1 : 0);

})().catch(e => { console.error(e); process.exit(1); });
