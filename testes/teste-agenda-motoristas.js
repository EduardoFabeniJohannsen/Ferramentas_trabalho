// Agenda: filtro de motorista com caixinhas (igual ao de status e tipo):
// marcar motoristas específicos, "(Sem motorista)", busca na lista, motorista
// novo fora de um filtro já feito, aviso dos filtros e escolha salva por modo.
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

const base = { status: "Confirmado", periodo: "3 dias", frete_conta: "nossa", prazos_pagamento: [] };

// João: R001, R005 · Pedro: R002, R006 (com espaços) · Ana Paula: R003
// sem motorista: R004 · Zeca: R007 (coleta: só no transportador)
const linhas = [
    { ...base, id: 1, tipo: "Entrega", data: dia(0), horario: "08:00", plataforma: "WAE18R001", cliente: "C1", transportadora: "Trans A", motorista: "João" },
    { ...base, id: 2, tipo: "Coleta", data: dia(0), horario: "10:00", plataforma: "WAE18R002", cliente: "C2", transportadora: "Trans A", motorista: "Pedro" },
    { ...base, id: 3, tipo: "Entrega", data: dia(-1), horario: "09:00", plataforma: "WAE18R003", cliente: "C3", transportadora: "Trans B", motorista: "Ana Paula" },
    { ...base, id: 4, tipo: "Entrega", data: dia(0), horario: "12:00", plataforma: "WAE18R004", cliente: "C4", transportadora: "Trans B", motorista: "" },
    { ...base, id: 5, tipo: "Troca técnica", data: dia(1), horario: "08:00", plataforma: "WAE18R005", cliente: "C5", transportadora: "Trans A", motorista: "João" },
    { ...base, id: 6, tipo: "Entrega", data: dia(1), horario: "09:00", plataforma: "WAE18R006", cliente: "C6", transportadora: "Trans B", motorista: " Pedro " },
    { ...base, id: 7, tipo: "Coleta", data: dia(1), horario: "10:00", plataforma: "WAE18R007", cliente: "C7", transportadora: "Trans B", motorista: "Zeca" }
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
    const contexto = await navegador.newContext({ viewport: { width: 1500, height: 1000 } });
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

    // "R001,R002..." (em ordem, independente da ordem da tela)
    const ordem = () => pagina.$$eval("tr.ag-item .ag-titulo", l => l.map(t => (t.textContent.match(/R\d{3}/) || ["?"])[0]).sort().join());
    const botao = async () => (await pagina.innerText("#btnMotoristas")).trim();
    const resumo = () => pagina.innerText("#resumoFiltros");
    const opcao = (texto) => pagina.locator("#listaMotoristasFiltro label", { hasText: texto });
    const caixa = (texto) => opcao(texto).locator("input");
    const nomesDaLista = () => pagina.$$eval("#listaMotoristasFiltro label", l => l.map(e => e.innerText.replace(/\s+/g, " ").trim()));
    const salvo = () => pagina.evaluate(() => localStorage.getItem("agendaMotoristas:u1"));
    const visivel = (sel) => pagina.isVisible(sel);
    const abrirLista = async () => {
        if(!(await visivel("#painelFiltros"))) await pagina.click("#btnFiltros");
        if(!(await visivel("#painelMotoristas"))) await pagina.click("#btnMotoristas");
    };

    await abrir();
    await pagina.click("#btnModoTransportador");
    await pagina.waitForTimeout(50);

    // ---------- sem filtro ----------
    confere("sem filtro: todos", (await ordem()) === "R001,R002,R003,R004,R005,R006,R007", await ordem());
    confere("sem filtro: botão limpo", (await botao()) === "👤 Todos os motoristas ▾", await botao());

    // ---------- a lista ----------
    await abrirLista();
    confere("a lista abre dentro do painel de filtros", await visivel("#painelMotoristas") && await visivel("#painelFiltros"));
    confere("em ordem alfabética, espaços ignorados, (Sem motorista) no fim, com a contagem",
        JSON.stringify(await nomesDaLista()) === JSON.stringify(["Ana Paula (1)", "João (2)", "Pedro (2)", "Zeca (1)", "(Sem motorista) (1)"]), await nomesDaLista());
    confere("tudo marcado", await pagina.isChecked("#marcarTodosMotoristas") && await caixa("Zeca").isChecked());

    // ---------- dois motoristas específicos ----------
    await pagina.uncheck("#marcarTodosMotoristas");
    confere("(Selecionar tudo) desmarcado: nenhum", (await ordem()) === "" && (await botao()) === "👤 Motoristas: nenhum ▾" && (await resumo()).includes("nenhum motorista"), [await ordem(), await botao(), await resumo()]);
    await caixa("João").check();
    confere("um motorista: o nome no botão", (await ordem()) === "R001,R005" && (await botao()) === "👤 Motorista: João ▾", [await ordem(), await botao()]);
    confere("meio-termo no (Selecionar tudo)", await pagina.$eval("#marcarTodosMotoristas", e => e.indeterminate && !e.checked));
    await caixa("Pedro").check();
    confere("João + Pedro (o ' Pedro ' com espaços entra junto)", (await ordem()) === "R001,R002,R005,R006", await ordem());
    confere("dois: os nomes no botão e no aviso", (await botao()) === "👤 Motoristas: João + Pedro ▾" && (await resumo()).includes("motorista João + Pedro") && (await pagina.innerText("#btnFiltros")).includes("1 ativo"), [await botao(), await resumo()]);
    confere("a lista continua aberta", await visivel("#painelMotoristas"));
    await pagina.screenshot({ path: path.join(saida, "motoristas-1-joao-e-pedro.png") });
    await caixa("(Sem motorista)").check();
    confere("três: N de M", (await ordem()) === "R001,R002,R004,R005,R006" && (await botao()) === "👤 Motoristas: 3 de 5 ▾" && (await resumo()).includes("3 de 5 motoristas"), [await ordem(), await botao(), await resumo()]);
    await caixa("(Sem motorista)").uncheck();
    confere("fica salvo (os marcados, por modo)", (await salvo()) === '{"transportador":["João","Pedro"]}', await salvo());

    // ---------- motorista novo não entra num filtro já feito ----------
    await pagina.evaluate(() => {
        agendamentos.push({ ...agendamentos.find(ag => ag.id === 1), id: 8, plataforma: "WAE18R008", motorista: "Novo" });
        renderizarAgenda();
    });
    confere("motorista novo: não aparece em 'só João + Pedro'", (await ordem()) === "R001,R002,R005,R006", await ordem());
    confere("motorista novo: entra na lista desmarcado", (await caixa("Novo").count()) === 1 && !(await caixa("Novo").isChecked()));
    await pagina.evaluate(() => { agendamentos = agendamentos.filter(ag => ag.id !== 8); renderizarAgenda(); });

    // ---------- contagem acompanha os outros filtros com a lista aberta ----------
    await pagina.locator("#chipsTransportadora .chip", { hasText: "Trans A" }).click();
    confere("com Trans A: a lista mostra só os motoristas dela", JSON.stringify(await nomesDaLista()) === JSON.stringify(["João (2)", "Pedro (1)"]) && (await ordem()) === "R001,R002,R005", [await nomesDaLista(), await ordem()]);
    await pagina.locator("#chipsTransportadora .chip", { hasText: "Todas" }).click();

    // ---------- busca na lista ----------
    await pagina.fill("#buscaMotoristas", "pau");
    confere("busca: só quem combina (sem acento e maiúscula)", JSON.stringify(await nomesDaLista()) === JSON.stringify(["Ana Paula (1)"]), await nomesDaLista());
    confere("busca: não muda o filtro", (await ordem()) === "R001,R002,R005,R006" && (await botao()) === "👤 Motoristas: João + Pedro ▾");
    await pagina.fill("#buscaMotoristas", "joao");
    confere("busca sem acento acha João", JSON.stringify(await nomesDaLista()) === JSON.stringify(["João (2)"]), await nomesDaLista());
    await pagina.fill("#buscaMotoristas", "xyz");
    confere("busca sem resultado: avisa", (await pagina.innerText("#listaMotoristasFiltro")).includes("Nenhum motorista com esse nome"));
    await pagina.fill("#buscaMotoristas", "");

    // salvou um agendamento de motorista desmarcado: o aviso diz por que não aparece
    const aviso = await pagina.evaluate(() => avisoSalvoEscondido(agendamentos.find(ag => ag.id === 3)));
    confere("salvo escondido pelo motorista: avisa", aviso.includes('motorista "Ana Paula" desmarcado'), aviso);
    const avisoSem = await pagina.evaluate(() => avisoSalvoEscondido(agendamentos.find(ag => ag.id === 4)));
    confere("salvo sem motorista escondido: avisa", avisoSem.includes('motorista "(Sem motorista)" desmarcado'), avisoSem);

    // ---------- um painel de cada vez, clicar fora, Esc ----------
    await pagina.click("#btnTipos");
    confere("abrir tipos fecha motoristas", await visivel("#painelTipos") && !(await visivel("#painelMotoristas")));
    await pagina.click("#btnMotoristas");
    confere("abrir motoristas fecha tipos", await visivel("#painelMotoristas") && !(await visivel("#painelTipos")));
    await pagina.click("#btnDatas");
    confere("abrir datas fecha motoristas", await visivel("#painelDatas") && !(await visivel("#painelMotoristas")));
    await pagina.click("#btnMotoristas");
    await pagina.click("#painelFiltros .painel-filtros-titulo");
    confere("clicar fora da lista fecha só ela", !(await visivel("#painelMotoristas")) && await visivel("#painelFiltros"));
    await pagina.click("#btnMotoristas");
    await pagina.keyboard.press("Escape");
    confere("Esc fecha", !(await visivel("#painelMotoristas")) && !(await visivel("#painelFiltros")));

    // ---------- reabrir mantém; a expedição tem o seu ----------
    await abrir();
    confere("reabrindo: continua João + Pedro", (await ordem()) === "R001,R002,R005,R006" && (await botao()) === "👤 Motoristas: João + Pedro ▾", [await ordem(), await botao()]);
    await pagina.click("#btnModoExpedicao");
    await pagina.waitForTimeout(50);
    confere("expedição: o filtro de motorista aparece e é separado", (await botao()) === "👤 Todos os motoristas ▾" && (await ordem()) === "R001,R003,R004,R005,R006", [await botao(), await ordem()]);
    await abrirLista();
    confere("expedição: a lista tem só os motoristas da expedição", JSON.stringify(await nomesDaLista()) === JSON.stringify(["Ana Paula (1)", "João (2)", "Pedro (1)", "(Sem motorista) (1)"]), await nomesDaLista());
    await pagina.uncheck("#marcarTodosMotoristas");
    await caixa("Ana Paula").check();
    confere("expedição: só a Ana Paula", (await ordem()) === "R003" && (await resumo()).includes("motorista Ana Paula"), [await ordem(), await resumo()]);
    await pagina.keyboard.press("Escape");
    await pagina.click("#btnModoTransportador");
    await pagina.waitForTimeout(50);
    confere("voltar ao transportador traz o filtro dele", (await ordem()) === "R001,R002,R005,R006", await ordem());
    confere("cada modo salvo no seu", JSON.stringify(JSON.parse(await salvo())) === JSON.stringify({ transportador: ["João", "Pedro"], expedicao: ["Ana Paula"] }), await salvo());

    // ---------- desmarcar só um, e marcar de novo volta a "todos" ----------
    await abrirLista();
    await pagina.check("#marcarTodosMotoristas");
    confere("(Selecionar tudo): todos de novo, salvo como todos", (await ordem()) === "R001,R002,R003,R004,R005,R006,R007" && (await botao()) === "👤 Todos os motoristas ▾" && JSON.parse(await salvo()).transportador === null, [await ordem(), await salvo()]);
    await caixa("Zeca").uncheck();
    confere("todos menos o Zeca", (await ordem()) === "R001,R002,R003,R004,R005,R006" && (await botao()) === "👤 Motoristas: 4 de 5 ▾", [await ordem(), await botao()]);
    await caixa("Zeca").check();
    confere("marcou o Zeca de novo: volta a todos", (await botao()) === "👤 Todos os motoristas ▾" && JSON.parse(await salvo()).transportador === null && await pagina.isChecked("#marcarTodosMotoristas"), [await botao(), await salvo()]);

    // ---------- limpar ----------
    await caixa("João").uncheck();
    await pagina.keyboard.press("Escape");
    await pagina.click("#btnLimparFiltros");
    confere("limpar filtros solta o motorista e salva", (await ordem()) === "R001,R002,R003,R004,R005,R006,R007" && JSON.parse(await salvo()).transportador === null, [await ordem(), await salvo()]);

    // ---------- valor salvo estragado não quebra ----------
    for(const valor of ["{quebrado", '"texto"', '["João"]', '{"transportador":"João"}', '{"transportador":[1,2]}']){
        await pagina.evaluate((v) => localStorage.setItem("agendaMotoristas:u1", v), valor);
        await abrir();
        confere(`valor salvo inválido (${valor}): todos`, (await ordem()) === "R001,R002,R003,R004,R005,R006,R007" && (await botao()) === "👤 Todos os motoristas ▾", [await ordem(), await botao()]);
    }

    confere("sem erros na página", erros.length === 0, erros);

    await navegador.close();

    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exit(falhas ? 1 : 0);

})().catch(e => { console.error(e); process.exit(1); });
