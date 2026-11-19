// Agenda: 📦 Demanda. Quantas máquinas de cada modelo saem para os clientes num período
// (entregas e trocas técnicas, somando "2x WTE12"), quantas sem patrimônio, quantas voltam nas
// coletas e quantas estão disponíveis no último estoque publicado; atalhos de período, a lista de
// agendamentos de cada modelo e o 📋 Copiar. Supabase simulado: nada aqui sai para a internet.
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

const base = { status: "Confirmado", transportadora: "Trans A", periodo: "28 dias", frete_conta: "nossa", origem_nome: "W Rental", destino_nome: "Obra" };

// o período do teste: amanhã até daqui a 8 dias (não bate com nenhum atalho)
const linhas = [
    { ...base, id: 1, tipo: "Entrega", data: dia(1), horario: "08:00", plataforma: "2x WTE12 + WAE18R001", cliente: "Alfa" },
    { ...base, id: 2, tipo: "Entrega", data: dia(2), horario: "09:00", plataforma: "WTE12046", cliente: "Beta" },
    { ...base, id: 3, tipo: "Troca técnica", data: dia(3), horario: "10:00", plataforma: "WTE12", plataforma_recolha: "WTE12050", cliente: "Gama" },
    { ...base, id: 4, tipo: "Coleta", data: dia(4), horario: "11:00", plataforma: "WTE12051 + WAD16010", cliente: "Delta", origem_nome: "Obra", destino_nome: "W Rental" },
    { ...base, id: 5, tipo: "Entrega", data: dia(5), status: "Cancelado", plataforma: "5x WTE12", cliente: "Cancelada" },
    { ...base, id: 6, tipo: "Transferência", data: dia(2), plataforma: "WAE18R009", cliente: "Entre obras" },
    { ...base, id: 7, tipo: "Transferência entre unidades", data: dia(2), plataforma: "WTE12052", cliente: "W Rental Joinville" },
    { ...base, id: 8, tipo: "Frete frustrado", data: dia(2), plataforma: "WTE12", cliente: "Frustrado" },
    { ...base, id: 9, tipo: "Entrega", data: dia(10), plataforma: "WTE12", cliente: "Fora do período" },
    { ...base, id: 10, tipo: "Entrega", data: null, horario: "", plataforma: "WTE12", cliente: "Sem data" },
    { ...base, id: 11, tipo: "Entrega", data: dia(6), horario: "CONFIRMAR", plataforma: "", cliente: "Sem máquina" },
    { ...base, id: 12, tipo: "Entrega", data: dia(1), horario: "07:00", status: "Concluído", plataforma: "WAE18R002", cliente: "Concluída" }
];

const estoque = [
    { filial_id: 1, atualizado_em: new Date().toISOString(), disponiveis: { WTE12: [{ p: "WTE12060" }, { p: "WTE12061" }, { p: "WTE12062" }], WAE18: [{ p: "WAE18R020" }] }, manutencao: { WAD16: [{ p: "WAD16011" }] } },
    { filial_id: 2, atualizado_em: "2026-01-02T09:00:00Z", disponiveis: { WTE12: [{ p: "WTE12070" }, { p: "WTE12071" }] }, manutencao: {} }
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
        rpc: async () => window.__estoqueFora
            ? { data: null, error: { message: "fora do ar" } }
            : { data: ${JSON.stringify(estoque)}, error: null },
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

// waitForFunction usa eval, que a CSP da agenda bloqueia: pergunta de tempo em tempo
async function esperar(pagina, condicao){
    for(let vez = 0; vez < 100; vez++){
        if(await pagina.evaluate(condicao)) return;
        await pagina.waitForTimeout(50);
    }
    throw new Error("esperou demais: " + condicao);
}

async function abrirAgenda(contexto, antes){
    const pagina = await contexto.newPage();
    const erros = [];
    pagina.on("pageerror", e => erros.push(e.message));
    pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_FAILED|Valor salvo inválido|Demanda: falha ao consultar o estoque/.test(m.text())) erros.push(m.text()); });
    // a área de transferência do Chrome sem tela: guarda o que foi copiado
    await pagina.addInitScript(() => {
        window.__copiado = null;
        Object.defineProperty(navigator, "clipboard", { value: { writeText: async (texto) => { window.__copiado = texto; } } });
    });
    if(antes) await pagina.addInitScript(antes);
    await pagina.goto("http://agenda.test/agenda.html");
    await pagina.waitForSelector("tr.ag-item");
    return { pagina, erros };
}

// as linhas da tabela: [modelo, saem, sem patrimônio, voltam, estoque]
const linhasTabela = (pagina) => pagina.evaluate(() =>
    [...document.querySelectorAll("#tabelaDemanda tbody tr.demanda-modelo")].map(tr =>
        [...tr.children].map(td => td.innerText.replace(/\s+/g, " ").replace(/^[▸▾] /, "").trim())
    )
);

async function escolherPeriodo(pagina, de, ate){
    await pagina.fill("#demandaDe", de);
    await pagina.fill("#demandaAte", ate);
    await pagina.waitForTimeout(50);
}

(async () => {

    navegador = await chromium.launch({ channel: "chrome", headless: true });
    const contexto = await navegador.newContext({ viewport: { width: 1400, height: 950 } });
    await contexto.route("**/*", (rota) => {
        const url = new URL(rota.request().url());
        if(url.pathname.endsWith("/vendor/supabase-2.45.0.js")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso });
        if(url.hostname !== "agenda.test") return rota.abort();
        if(url.pathname.endsWith("auth-guard.js")) return rota.fulfill({ contentType: "text/javascript", body: authFalso });
        const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
        if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
        return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
    });

    const { pagina, erros } = await abrirAgenda(contexto);

    // ---------- atalhos de período ----------
    const periodos = await pagina.evaluate(() => {
        const quinta = new Date(2026, 10, 19);
        return [
            periodoDemanda("semana", quinta),
            periodoDemanda("proxima-semana", quinta),
            periodoDemanda("mes", quinta),
            periodoDemanda("proximo-mes", quinta),
            periodoDemanda("semana", new Date(2026, 10, 22)),
            periodoDemanda("proximo-mes", new Date(2026, 11, 10)),
            periodoDemanda("semana", new Date(2026, 11, 30))
        ];
    });
    confere("esta semana: segunda a domingo", periodos[0].de === "2026-11-16" && periodos[0].ate === "2026-11-22", periodos[0]);
    confere("próxima semana", periodos[1].de === "2026-11-23" && periodos[1].ate === "2026-11-29", periodos[1]);
    confere("este mês e próximo mês", periodos[2].de === "2026-11-01" && periodos[2].ate === "2026-11-30" && periodos[3].de === "2026-12-01" && periodos[3].ate === "2026-12-31", periodos.slice(2, 4));
    confere("domingo ainda é a semana que começou na segunda", periodos[4].de === "2026-11-16" && periodos[4].ate === "2026-11-22", periodos[4]);
    confere("virada do ano: próximo mês de dezembro é janeiro; semana que atravessa o ano", periodos[5].de === "2027-01-01" && periodos[5].ate === "2027-01-31" && periodos[6].de === "2026-12-28" && periodos[6].ate === "2027-01-03", periodos.slice(5));

    // ---------- abrir ----------
    confere("botão 📦 Demanda na barra da agenda", (await pagina.locator("button[data-clique='abrirDemandaAgenda']").innerText()).includes("Demanda"));
    await pagina.click("button[data-clique='abrirDemandaAgenda']");
    await pagina.waitForSelector("#modalDemanda.aberto");
    const padrao = await pagina.evaluate(() => ({ de: $("demandaDe").value, ate: $("demandaAte").value, esperado: periodoDemanda("proxima-semana") }));
    confere("abre na próxima semana", padrao.de === padrao.esperado.de && padrao.ate === padrao.esperado.ate, padrao);
    confere("o atalho 'Próxima semana' fica marcado", (await pagina.locator("#modalDemanda button.ativo").innerText()) === "Próxima semana");

    // ---------- as contas ----------
    await escolherPeriodo(pagina, dia(1), dia(8));
    await pagina.waitForSelector("#tabelaDemanda tbody tr.demanda-modelo");
    await esperar(pagina, () => !document.querySelector("#tabelaDemanda").innerText.includes("…"));
    const tabela = await linhasTabela(pagina);
    const porModelo = Object.fromEntries(tabela.map(linha => [linha[0], linha]));
    confere("ordem: mais máquinas primeiro, sem máquina por último", JSON.stringify(tabela.map(l => l[0])) === JSON.stringify(["WTE12", "WAE18", "WAD16", "Sem máquina informada"]), tabela.map(l => l[0]));
    confere("WTE12: 4 saem (2x + 1 + troca), 3 sem patrimônio, 1 volta, 5 no estoque (3 + 2)",
        JSON.stringify(porModelo.WTE12) === JSON.stringify(["WTE12", "4", "3", "1", "5 Itajaí 3 · Joinville 2"]), porModelo.WTE12);
    confere("WAE18: 2 saem (o concluído conta; a transferência entre obras não), todas com patrimônio",
        JSON.stringify(porModelo.WAE18) === JSON.stringify(["WAE18", "2", "—", "—", "1 Itajaí 1"]), porModelo.WAE18);
    confere("WAD16: só volta na coleta; manutenção não é disponível", JSON.stringify(porModelo.WAD16) === JSON.stringify(["WAD16", "0", "—", "1", "0"]), porModelo.WAD16);
    confere("entrega sem máquina conta como sem patrimônio", JSON.stringify(porModelo["Sem máquina informada"]) === JSON.stringify(["Sem máquina informada", "1", "1", "—", "0"]), porModelo["Sem máquina informada"]);
    const total = await pagina.evaluate(() => [...document.querySelectorAll("#tabelaDemanda tfoot td")].map(td => td.innerText.trim()));
    confere("total: 7 saem, 4 sem patrimônio, 2 voltam", JSON.stringify(total.slice(0, 4)) === JSON.stringify(["Total", "7", "4", "2"]), total);
    const resumo = await pagina.textContent("#resumoDemanda");
    confere("resumo no topo: 7 máquinas em 5 entregas", resumo.startsWith("7 máquina(s) saem em 5 entrega(s)"), resumo);
    const avisos = await pagina.textContent("#avisosDemanda");
    confere("avisa da entrega sem data", avisos.includes("1 entrega(s) sem data não entram na conta"), avisos);
    const datas = await pagina.textContent("#estoqueDataDemanda");
    confere("data do estoque de cada filial (a antiga em destaque)", datas.includes("Itajaí: Estoque publicado em") && datas.includes("Joinville: ⚠️ Estoque publicado em"), datas);
    confere("nenhum atalho marcado num período escolhido à mão", (await pagina.locator("#modalDemanda button.ativo").count()) === 0);

    // ---------- os agendamentos de um modelo ----------
    await pagina.click("#tabelaDemanda .demanda-nome >> text=WTE12");
    const itens = await pagina.locator("#tabelaDemanda .demanda-agendamentos li").allInnerTexts();
    confere("WTE12 aberto: 3 que saem e a coleta, por dia", itens.length === 4 && itens[0].includes("Alfa") && itens[0].includes("2x WTE12") && itens[0].includes("⚠️ sem patrimônio") && itens[1].includes("Beta") && !itens[1].includes("sem patrimônio") && itens[2].includes("Troca técnica") && itens[3].includes("↩ Coleta"), itens);
    await pagina.screenshot({ path: path.join(saida, "agenda-demanda.png") });
    await pagina.click("#tabelaDemanda .demanda-agendamentos li >> text=Beta");
    const depois = await pagina.evaluate(() => ({ demanda: $("modalDemanda").classList.contains("aberto"), editar: $("modalAgenda").classList.contains("aberto"), cliente: $("agCliente")?.value }));
    confere("clicar num agendamento fecha a demanda e abre ele para editar", !depois.demanda && depois.editar && depois.cliente === "Beta", depois);
    await pagina.keyboard.press("Escape");

    // ---------- copiar ----------
    await pagina.click("button[data-clique='abrirDemandaAgenda']");
    const reaberto = await pagina.evaluate(() => [$("demandaDe").value, $("demandaAte").value]);
    confere("reabrir mantém o período escolhido", reaberto[0] === dia(1) && reaberto[1] === dia(8), reaberto);
    await pagina.click("button[data-clique='copiarDemandaAgenda']");
    await pagina.waitForTimeout(100);
    const copiado = await pagina.evaluate(() => window.__copiado);
    const linhasCopiadas = String(copiado).split("\n");
    confere("📋 Copiar: total de cada modelo, sem os que só voltam", linhasCopiadas.includes("• WTE12: 4 (3 sem patrimônio; 1 volta em coleta)") && linhasCopiadas.includes("• WAE18: 2") && linhasCopiadas.includes("• Sem máquina informada: 1 (1 sem patrimônio)") && !copiado.includes("WAD16") && linhasCopiadas.includes("Total: 7 máquinas em 5 entregas"), linhasCopiadas);
    confere("📋 Copiar: período no título", linhasCopiadas[0].includes(`${dia(1).split("-").reverse().join("/")} a ${dia(8).split("-").reverse().join("/")}`), linhasCopiadas[0]);

    // ---------- período sem nada, invertido e Esc ----------
    await escolherPeriodo(pagina, dia(20), dia(25));
    confere("período sem agendamentos: avisa", (await pagina.textContent("#tabelaDemanda")).includes("Nenhuma entrega, troca técnica ou coleta"));
    await escolherPeriodo(pagina, dia(7), dia(1));
    confere("data inicial depois da final: pede o período", (await pagina.textContent("#tabelaDemanda")).includes("a data inicial não pode passar da final") && (await pagina.textContent("#resumoDemanda")) === "");
    await escolherPeriodo(pagina, dia(-60), dia(7));
    confere("antes dos 30 dias carregados: avisa que fica incompleto", (await pagina.textContent("#avisosDemanda")).includes("A agenda só tem os agendamentos a partir de"));
    await pagina.keyboard.press("Escape");
    confere("Esc fecha", !(await pagina.evaluate(() => $("modalDemanda").classList.contains("aberto"))));

    // ---------- celular e fundo claro ----------
    await pagina.setViewportSize({ width: 390, height: 800 });
    await pagina.evaluate(() => document.body.classList.add("tema-claro"));
    await pagina.click("button[data-clique='abrirDemandaAgenda']");
    await escolherPeriodo(pagina, dia(1), dia(8));
    const larguras = await pagina.evaluate(() => ({
        pagina: document.documentElement.scrollWidth, tela: window.innerWidth,
        tabela: $("tabelaDemanda").scrollWidth, area: $("tabelaDemanda").clientWidth
    }));
    confere("celular: nem a página nem a tabela rolam para o lado", larguras.pagina <= larguras.tela && larguras.tabela <= larguras.area, larguras);
    await pagina.screenshot({ path: path.join(saida, "agenda-demanda-celular-claro.png") });

    confere("sem erros na página", erros.length === 0, erros);
    await pagina.close();

    // ---------- estoque fora do ar ----------
    const semEstoque = await abrirAgenda(contexto, () => { window.__estoqueFora = true; });
    await semEstoque.pagina.click("button[data-clique='abrirDemandaAgenda']");
    await escolherPeriodo(semEstoque.pagina, dia(1), dia(8));
    await semEstoque.pagina.waitForSelector("#avisosDemanda .aviso-demanda");
    const linhaSemEstoque = (await linhasTabela(semEstoque.pagina))[0];
    confere("estoque fora do ar: avisa e a demanda continua", (await semEstoque.pagina.textContent("#avisosDemanda")).includes("Não foi possível consultar o estoque") && JSON.stringify(linhaSemEstoque) === JSON.stringify(["WTE12", "4", "3", "1", "—"]), linhaSemEstoque);
    confere("sem erros na página (estoque fora)", semEstoque.erros.length === 0, semEstoque.erros);
    await semEstoque.pagina.close();

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exitCode = falhas ? 1 : 0;

})().catch(async erro => {
    console.error(erro);
    await navegador?.close();
    process.exitCode = 1;
});
