const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });
const hoje = new Date().toLocaleDateString("en-CA");

const base = { data: hoje, horario: "08:00", tipo: "Transferência", status: "Confirmado", prazos_pagamento: [], frete_conta: "nossa" };

const linhas = [
    { ...base, id: 1, plataforma: "WAE18", cliente: "Só Modelo" },
    { ...base, id: 2, plataforma: "2x WAD16 + WTE12", cliente: "Vários" },
    { ...base, id: 3, plataforma: "WAE18R001", cliente: "Definido" },
    { ...base, id: 4, plataforma: "WAE18R002 + WTE12046", cliente: "Dois Definidos" },
    { ...base, id: 5, plataforma: "WAE18R005", cliente: "Coleta", tipo: "Coleta" },
    { ...base, id: 6, plataforma: "WAE18", cliente: "Cancelado", status: "Cancelado" },
    { ...base, id: 7, plataforma: "WAE18", cliente: "Com Rascunho" },
    { ...base, id: 8, plataforma: "WAE18R007", cliente: "Outra Demanda" },
    { ...base, id: 9, plataforma: "WTE8", cliente: "Letra O" },
    { ...base, id: 10, plataforma: "WAE18", cliente: "Conflito" },
    { ...base, id: 11, plataforma: "WAE18", cliente: "Manutencao" },
    { ...base, id: 12, plataforma: "WAE18", cliente: "Erro" },
    { ...base, id: 13, plataforma: "WAE18", cliente: "Duplo" },
    { ...base, id: 14, plataforma: "WAE18", cliente: "Outro Modelo" },
    { ...base, id: 15, plataforma: "WAE18", cliente: "Pela Tela" },
    { ...base, id: 16, plataforma: "WAE18R020 + WAE18R021", cliente: "Com Mais" },
    { ...base, id: 17, plataforma: "WAE18R022 / WAE18R023", cliente: "Com Barra" },
    { ...base, id: 18, plataforma: "WAE18R024, WAE18R025", cliente: "Com Virgula" },
    { ...base, id: 19, plataforma: "WAE18R026 e WAE18R027", cliente: "Com E" },
    { ...base, id: 20, plataforma: "WAE18R028 + WAE18R029 + WTE12070", cliente: "Tres" },
    { ...base, id: 21, plataforma: "WAE18R030 + WTE12", cliente: "Um Sem Patrimonio" },
    { ...base, id: 22, plataforma: "2x WAE18R031", cliente: "Quantidade" },
    { ...base, id: 23, plataforma: "WAE18R032 + WAE18R033", cliente: "Cancelar" },
    { ...base, id: 24, plataforma: "WAE18R034 + WAE18R035", cliente: "Conflito Multi" },
    { ...base, id: 25, plataforma: "WAE18R036 / WAE18R037", cliente: "Lista" }
];

const clienteFalso = `
window.__gravacoes = [];
window.supabase = { createClient(){
    const linhas = ${JSON.stringify(linhas)};
    const consulta = (tabela) => {
        let inicio = 0, gravando = null, idAlvo = null;
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then"){
                    if(gravando && window.__gravarErro){
                        return (ok) => ok({ data: null, error: { code: "42501", message: "row-level security" } });
                    }
                    let data;
                    if(gravando){
                        const atual = linhas.find(l => l.id === idAlvo);
                        Object.assign(atual, gravando);
                        window.__gravacoes.push({ id: idAlvo, ...gravando });
                        data = [{ ...atual }];
                    }else{
                        data = inicio !== 0 ? [] : tabela === "agendamentos" ? linhas : [];
                    }
                    return (ok) => ok({ data, error: null, count: 0 });
                }
                if(nome === "range") return (a) => { inicio = a; return q; };
                if(nome === "update") return (d) => { gravando = d; return q; };
                if(nome === "eq") return (c, v) => { if(c === "id") idAlvo = v; return q; };
                return () => q;
            }
        });
        return q;
    };
    return {
        from: consulta,
        rpc: async () => ({ data: [{ filial_id: 1, atualizado_em: "2026-10-31T09:30:00Z",
            disponiveis: {
                WAE18: [{ p: "WAE18R003", m: "GENIE", f: "Z45" }, { p: "WAE18R007", m: "JLG" }, { p: "WAE18R008" }, { p: "WAE18R009" }, { p: "WAE18R010" }, { p: "WAE18R050" }, { p: "WAE18R051" }, { p: "WAE18R052" }, { p: "WAE18R053" }, { p: "WAE18R054" }, { p: "WAE18R055" }, { p: "WAE18R056" }, { p: "WAE18R057" }, { p: "WAE18R058" }],
                WAD16: [{ p: "WAD16010" }, { p: "WAD16011" }],
                WTE12: [{ p: "WTE12050" }, { p: "WTE12051" }, { p: "WTE12052" }],
                WTE8: [{ p: "WTE8O079" }]
            },
            manutencao: { WAE18: [{ p: "WAE18R004" }] } }], error: null }),
        channel: () => ({ on(){ return this; }, subscribe(){ return this; }, track: async () => "ok", send: async () => "ok" }),
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
    const contexto = await navegador.newContext({ viewport: { width: 1500, height: 900 } });
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

    let aceitar = true;
    let dialogos = [];
    pagina.on("dialog", d => {
        dialogos.push(d.message());
        return aceitar ? d.accept() : d.dismiss();
    });

    await pagina.goto("http://agenda.test/agenda.html");
    await pagina.waitForSelector(".ag-tabela");
    await pagina.waitForTimeout(100);
    await pagina.click("#btnModoTransportador");

    const abrir = async (id) => {
        await pagina.evaluate((i) => abrirEstoqueAgenda(agendamentos.find(a => a.id === i)), id);
        await pagina.waitForSelector("#listaEstoqueAgenda table");
    };
    const verTodos = () => pagina.click("#listaEstoqueAgenda .estoque-topo button");
    const fechar = () => pagina.evaluate(() => fecharEstoqueAgenda());
    const usar = async (patrimonio) => {
        dialogos = [];
        const antes = await pagina.evaluate(() => window.__gravacoes.length);
        await pagina.locator("#listaEstoqueAgenda tbody tr", { has: pagina.locator(`td.estoque-patrimonio:text-is("${patrimonio}")`) }).locator(".estoque-usar button").click();
        await pagina.waitForTimeout(60);
        const grav = await pagina.evaluate(() => window.__gravacoes);
        return { gravou: grav.length - antes, ultima: grav[grav.length - 1], dialogos: dialogos.slice() };
    };
    const plataforma = (id) => pagina.evaluate((i) => agendamentos.find(a => a.id === i).plataforma, id);
    const toast = () => pagina.innerText("#toast");
    const janelaAberta = () => pagina.isVisible("#modalEstoque");
    const temUsar = (patrimonio) => pagina.locator("#listaEstoqueAgenda tbody tr", { has: pagina.locator(`td.estoque-patrimonio:text-is("${patrimonio}")`) }).locator(".estoque-usar button").count();

    // ---------- só o modelo ----------
    await abrir(1);
    confere("mostra o botão Usar", (await temUsar("WAE18R003")) === 1);
    await pagina.screenshot({ path: path.join(saida, "30-usar.png") });
    let r = await usar("WAE18R003");
    confere("só o modelo preenche sem perguntar", r.gravou === 1 && r.ultima.plataforma === "WAE18R003" && r.dialogos.length === 0, r);
    confere("salva só a plataforma", Object.keys(r.ultima).sort().join() === "id,plataforma", r.ultima);
    confere("avisa o que fez", (await toast()).includes("WAE18R003 definido em Só Modelo"), await toast());
    confere("completo: fecha a janela", !(await janelaAberta()));
    confere("a lista atualiza", (await pagina.locator("tr.ag-item", { hasText: "Só Modelo" }).innerText()).includes("WAE18R003"));

    // ---------- pelo botão de verdade ----------
    await pagina.locator("tr.ag-item", { hasText: "Pela Tela" }).locator(".btn-estoque").click();
    await pagina.waitForSelector("#listaEstoqueAgenda table");
    r = await usar("WAE18R008");
    confere("funciona clicando na lupa da linha", r.ultima.plataforma === "WAE18R008" && r.ultima.id === 15, r);

    // ---------- vários equipamentos ----------
    await abrir(2);
    r = await usar("WAD16010");
    confere("2x WAD16: uma vira patrimônio, a outra segue", r.ultima.plataforma === "WAD16010 + WAD16 + WTE12", r.ultima);
    confere("falta máquina: janela segue aberta", await janelaAberta());
    confere("a usada fica como 'neste agendamento' e sem botão", (await temUsar("WAD16010")) === 0);
    r = await usar("WAD16011");
    confere("segunda máquina do modelo", r.ultima.plataforma === "WAD16010 + WAD16011 + WTE12", r.ultima);
    r = await usar("WTE12050");
    confere("terceiro equipamento", r.ultima.plataforma === "WAD16010 + WAD16011 + WTE12050", r.ultima);
    confere("tudo definido: fecha", !(await janelaAberta()));

    // ---------- já definido pergunta ----------
    aceitar = false;
    await abrir(3);
    r = await usar("WAE18R009");
    confere("já definido: pergunta antes de trocar", r.dialogos.length === 1 && r.dialogos[0].includes("Trocar WAE18R001 por WAE18R009") && r.dialogos[0].includes("Definido"), r.dialogos);
    confere("cancelar não grava", r.gravou === 0 && (await plataforma(3)) === "WAE18R001");
    confere("cancelar deixa a janela aberta", await janelaAberta());
    aceitar = true;
    r = await usar("WAE18R009");
    confere("confirmar troca", r.gravou === 1 && r.ultima.plataforma === "WAE18R009", r.ultima);
    await fechar();

    // ---------- vários equipamentos: pergunta qual trocar ----------
    const painel = () => pagina.locator("#escolhaTroca");
    const opcoes = () => painel().locator("button").allInnerTexts();

    for(const [id, antes, depois, nome] of [
        [16, ["WAE18R020", "WAE18R021"], "WAE18R020 + WAE18R050", "com +"],
        [17, ["WAE18R022", "WAE18R023"], "WAE18R022 + WAE18R051", "com /"],
        [18, ["WAE18R024", "WAE18R025"], "WAE18R024 + WAE18R052", "com vírgula"],
        [19, ["WAE18R026", "WAE18R027"], "WAE18R026 + WAE18R053", "com e"]
    ]){
        await abrir(id);
        const novo = depois.split(" + ")[1];
        r = await usar(novo);
        const lista = await opcoes();
        confere(`${nome}: pergunta qual trocar`, r.gravou === 0 && lista.join() === [...antes, "Cancelar"].join() && (await painel().innerText()).includes(novo), lista);
        if(id === 16) await pagina.screenshot({ path: path.join(saida, "31-qual-trocar.png") });
        await painel().locator("button", { hasText: antes[1] }).click();
        await pagina.waitForTimeout(60);
        const final = await plataforma(id);
        confere(`${nome}: troca só o escolhido e mantém o outro`, final === depois, final);
        await fechar();
    }

    await abrir(20);
    r = await usar("WAE18R054");
    confere("três equipamentos: lista os três", (await opcoes()).length === 4, await opcoes());
    await painel().locator("button", { hasText: "WTE12070" }).click();
    await pagina.waitForTimeout(60);
    confere("pode trocar por um modelo diferente escolhendo", (await plataforma(20)) === "WAE18R028 + WAE18R029 + WAE18R054", await plataforma(20));
    await fechar();

    // ---------- cancelar ----------
    await abrir(23);
    r = await usar("WAE18R055");
    await painel().locator("button", { hasText: "Cancelar" }).click();
    confere("cancelar não grava e some", r.gravou === 0 && (await plataforma(23)) === "WAE18R032 + WAE18R033" && (await painel().count()) === 0);
    confere("cancelar mantém a janela", await janelaAberta());

    r = await usar("WAE18R055");
    r = await usar("WAE18R056");
    confere("clicar em outra máquina troca a pergunta", (await painel().count()) === 1 && (await painel().innerText()).includes("WAE18R056"), await painel().innerText());
    await verTodos();
    confere("ver todos tira a pergunta", (await painel().count()) === 0);
    await fechar();

    // ---------- preenche direto o que não tem patrimônio ----------
    await abrir(21);
    await verTodos();
    r = await usar("WTE12051");
    confere("mesmo modelo sem patrimônio: preenche sem perguntar", r.gravou === 1 && r.ultima.plataforma === "WAE18R030 + WTE12051" && (await painel().count()) === 0, r.ultima);
    await fechar();

    // ---------- quantidade ----------
    await abrir(22);
    aceitar = true;
    r = await usar("WAE18R057");
    confere("2x do mesmo patrimônio: não some nenhuma", r.ultima && r.ultima.plataforma === "WAE18R057 + WAE18R031", r.ultima);
    await fechar();

    // ---------- alerta do item 1 na troca escolhida ----------
    aceitar = false;
    await abrir(24);
    r = await usar("WAE18R007");
    dialogos = [];
    await painel().locator("button", { hasText: "WAE18R035" }).click();
    await pagina.waitForTimeout(60);
    confere("máquina em outra demanda passa pelo alerta", dialogos.length === 1 && dialogos[0].includes("conflito") && (await plataforma(24)) === "WAE18R034 + WAE18R035", dialogos);
    aceitar = true;
    await fechar();

    // ---------- lista, alerta e lupa entendem os separadores ----------
    const separados = await pagina.evaluate(() => [
        separarPlataformas("WAE18R001 / WAE18R002").length,
        separarPlataformas("WAE18R001, WAE18R002").length,
        separarPlataformas("WAE18R001; WAE18R002").length,
        separarPlataformas("WAE18R001 e WAE18R002").length,
        separarPlataformas("WAE18R001 E WAE18R002").length,
        separarPlataformas("2x WAD16 + WTE12").map(p => p.quantidade + p.patrimonio).join(),
        separarPlataformas("WAE18R001").length,
        separarPlataformas("").length
    ]);
    confere("separadores reconhecidos", separados.join("|") === "2|2|2|2|2|2WAD16,1WTE12|1|0", separados);
    const naLista = await pagina.locator("tr.ag-item", { hasText: "Lista" }).innerText();
    confere("a lista mostra os dois com +", naLista.includes("WAE18R036 + WAE18R037"), naLista.slice(0, 80));
    const reservadas = await pagina.evaluate(() => { const r = reservasDaAgenda(); return [!!r.WAE18R036, !!r.WAE18R037]; });
    confere("as duas máquinas contam como em demanda", reservadas[0] && reservadas[1], reservadas);

    await abrir(14);
    await verTodos();
    r = await usar("WTE12052");
    confere("modelo diferente com um só: troca direto", r.ultima.plataforma === "WTE12052" && r.dialogos.length === 0, r);
    await fechar();

    // ---------- sem botão ----------
    await abrir(5);
    confere("coleta não tem Usar", (await pagina.locator("#listaEstoqueAgenda .estoque-usar").count()) === 0);
    confere("coleta segue com 5 colunas", (await pagina.locator("#listaEstoqueAgenda tbody tr").first().locator("td").count()) === 5);
    await fechar();
    await abrir(6);
    confere("cancelado não tem Usar", (await pagina.locator("#listaEstoqueAgenda .estoque-usar").count()) === 0);
    await fechar();

    // ---------- conflito do item 1 ----------
    aceitar = false;
    await abrir(10);
    r = await usar("WAE18R007");
    confere("máquina em outra demanda passa pelo alerta", r.dialogos.length === 1 && r.dialogos[0].includes("Outra Demanda") && r.gravou === 0, r.dialogos);
    aceitar = true;
    r = await usar("WAE18R007");
    confere("aceitar o alerta grava", r.gravou === 1, r);
    await fechar();

    // ---------- manutenção não avisa ----------
    await abrir(11);
    r = await usar("WAE18R004");
    confere("manutenção usa sem aviso", r.gravou === 1 && r.dialogos.length === 0, r);
    await fechar();

    // ---------- formato ----------
    await abrir(9);
    r = await usar("WTE8O079");
    confere("O depois dos números fica minúsculo", r.ultima.plataforma === "WTE8o079", r.ultima);
    await fechar();

    // ---------- rascunho ----------
    await pagina.evaluate(() => {
        const todos = lerRascunhos();
        todos["edit:7"] = { campos: { plataforma: "WAE18", obsEntrega: "digitado e não salvo" }, faturamento: null, salvoEm: Date.now() };
        gravarRascunhos(todos);
    });
    await abrir(7);
    r = await usar("WAE18R010");
    const rasc = await pagina.evaluate(() => lerRascunhos()["edit:7"].campos);
    confere("rascunho recebe o patrimônio e mantém o resto", rasc.plataforma === "WAE18R010" && rasc.obsEntrega === "digitado e não salvo", rasc);
    await fechar();

    // ---------- erro ao gravar ----------
    await pagina.evaluate(() => { window.__gravarErro = true; });
    await abrir(12);
    r = await usar("WAE18R058");
    confere("erro: mensagem clara", (await toast()).includes("Sem permissão"), await toast());
    confere("erro: nada muda e a janela fica", (await plataforma(12)) === "WAE18" && await janelaAberta());
    await pagina.evaluate(() => { window.__gravarErro = false; });
    r = await usar("WAE18R058").catch(() => null);
    confere("erro: dá para tentar de novo", r && (await plataforma(12)) !== "WAE18", await plataforma(12));
    await fechar();

    // ---------- clique duplo ----------
    await abrir(13);
    const antes = await pagina.evaluate(() => window.__gravacoes.length);
    await pagina.locator("#listaEstoqueAgenda tbody tr", { has: pagina.locator('td.estoque-patrimonio:text-is("WAE18R010")') }).locator(".estoque-usar button").dblclick();
    await pagina.waitForTimeout(100);
    confere("clique duplo grava uma vez", (await pagina.evaluate(() => window.__gravacoes.length)) - antes === 1);

    confere("sem erros no console", erros.length === 0, erros);

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exitCode = falhas ? 1 : 0;

})().catch(e => { console.error(e); process.exit(1); });
