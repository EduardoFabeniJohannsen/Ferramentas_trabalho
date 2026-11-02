const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });

const hoje = new Date().toISOString().slice(0, 10);

const base = {
    data: hoje, horario: "08:00", tipo: "Entrega", status: "Confirmado",
    transportadora: "Trans A", motorista: "Motorista A", periodo: "3 dias",
    frete: 1150, frete_conta: "nossa", prazos_pagamento: []
};

const linhas = [
    { ...base, id: 1, plataforma: "WAE18R001", cliente: "Cliente Um", proposta: "712804",
      destino_nome: "Obra Um", destino_endereco: "Rua B, 200, Centro, Brusque/SC",
      contato: "João 47 9999", obs_expedicao: "levar chave", obs_entrega: "ligar antes",
      forma_pagamento: "Boleto", prazos_pagamento: ["28", "56"], pedido_compra: true, pedido_numero: "PC-9",
      emails: "a@cliente.com", referencia: "FICHA 1", card: "CARD-1" },
    { ...base, id: 2, horario: "10:00", plataforma: "WTE14", cliente: "Cliente Dois", proposta: "712900",
      destino_endereco: "Rua sem cidade, 10", status: "A confirmar" },
    { ...base, id: 3, horario: "11:00", plataforma: "WAE18R002", cliente: "Cliente Três", proposta: "1" },
    { ...base, id: 4, horario: "12:00", plataforma: "WAE18R003", cliente: "Cliente Quatro", proposta: "2", status: "Cancelado" },
    { ...base, id: 5, horario: "13:00", plataforma: "WAE18R004", cliente: "Cliente Cinco", proposta: "3" }
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
        rpc: async (nome) => {
            if(window.__rpcErro) return { data: null, error: window.__rpcErro };
            if(nome !== "estoque_disponiveis") return { data: null, error: null };
            if(window.__rpcAntiga) return { data: [{ filial_id: 1, atualizado_em: "2026-10-31T09:30:00Z", disponiveis: { WAE18: [{ p: "WAE18R001", m: "GENIE", f: "Z45" }] } }], error: null };
            return { data: [
                { filial_id: 2, atualizado_em: "2026-10-30T14:05:00Z", disponiveis: { WAE18: [{ p: "WAE18R003", m: "GENIE", f: "Z45" }] }, manutencao: null },
                { filial_id: 1, atualizado_em: "2026-10-31T09:30:00Z", disponiveis: {
                    WAE18: [{ p: "WAE18R002", m: "JLG", f: "E450" }, { p: "WAE18R001", m: "GENIE", f: "Z45", a: "2019" }],
                    WTE14: [{ p: "WTE14046", e: "TESOURA 14M" }]
                }, manutencao: { WAE18: [{ p: "WAE18R004", m: "JLG", f: "E450" }, { p: "WAE18R005", m: "GENIE", f: "Z45" }] } }
            ], error: null };
        },
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
    const contexto = await navegador.newContext({ viewport: { width: 1500, height: 700 } });
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
    pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_FAILED/.test(m.text())) erros.push(m.text()); });

    const abrir = async () => {
        await pagina.goto("http://agenda.test/agenda.html");
        await pagina.waitForSelector(".ag-tabela thead th");
    };
    const titulos = () => pagina.$$eval(".ag-tabela thead th", l => l.map(t => t.textContent.trim()));
    const borda = (sel) => pagina.$eval(sel, e => getComputedStyle(e).borderLeftWidth);
    const modo = async (m) => { await pagina.click(m === "expedicao" ? "#btnModoExpedicao" : "#btnModoTransportador"); await pagina.waitForTimeout(50); };

    const abreOpcao = async (sel) => { if(!(await pagina.isVisible("#painelFiltros"))) await pagina.click("#btnFiltros"); await pagina.click(sel); };

    await abrir();

    // ---------- transportador ----------
    await modo("transportador");
    let t = await titulos();
    confere("transportador: Proposta é a última coluna", t[t.length - 2] === "Proposta", t);
    confere("transportador: sem botão Colunas", !(await pagina.isVisible("#btnColunas")));

    // ---------- expedição: padrão ----------
    await modo("expedicao");
    t = await titulos();
    confere("expedição: colunas padrão", t.join() === "Horário,Plataforma / Cliente,Transportadora,Motorista,Período,Status,Observação,Proposta,", t);
    confere("botão mostra contagem", (await pagina.innerText("#btnColunas")).includes("8 de 21"), await pagina.innerText("#btnColunas"));
    confere("traço de corte na proposta", (await borda("tr.ag-item td.ag-proposta")) === "2px");
    confere("colunas padrão oculto de início", !(await pagina.isVisible("#btnColunasPadrao")));
    await pagina.screenshot({ path: path.join(saida, "1-expedicao-padrao.png") });

    // ---------- arrastar a proposta ----------
    const cabProposta = pagina.locator("th.ag-cab-proposta");
    confere("proposta arrastável", await cabProposta.getAttribute("draggable") === "true");
    await cabProposta.dragTo(pagina.locator("th.ag-cab-periodo"), { targetPosition: { x: 3, y: 5 } });
    t = await titulos();
    confere("proposta foi para antes de Período", t.indexOf("Proposta") === t.indexOf("Período") - 1, t);
    const celulas = await pagina.$$eval("tr.ag-item:first-of-type td, tr.ag-item td", () => null).catch(() => null);
    const posTd = await pagina.$eval("tr.ag-item", l => [...l.children].findIndex(c => c.classList.contains("ag-proposta")));
    confere("célula acompanha o título", posTd === t.indexOf("Proposta"), posTd);
    confere("traço de corte vai para os botões", (await borda("tr.ag-item td.ag-lado")) === "2px");
    confere("sem traço grosso na proposta do meio", (await borda("tr.ag-item td.ag-proposta")) === "1px");

    // ---------- largura da proposta ----------
    const alca = cabProposta.locator(".ag-redimensiona");
    confere("proposta tem alça de largura", await alca.count() === 1);
    const antes = (await cabProposta.boundingBox()).width;
    const caixa = await alca.boundingBox();
    await pagina.mouse.move(caixa.x + 3, caixa.y + 5);
    await pagina.mouse.down();
    await pagina.mouse.move(caixa.x + 83, caixa.y + 5, { steps: 5 });
    await pagina.mouse.up();
    const depois = (await cabProposta.boundingBox()).width;
    confere("largura da proposta aumentou ~80px", Math.abs(depois - antes - 80) < 6, [antes, depois]);

    // ---------- mostrar e ocultar ----------
    await abreOpcao("#btnColunas");
    confere("painel abre", await pagina.isVisible("#painelColunas"));
    await pagina.locator("#listaColunasVisiveis label", { hasText: "Status" }).locator("input").uncheck();
    await pagina.locator("#listaColunasVisiveis label", { hasText: "Cidade de entrega" }).locator("input").check();
    for(const nome of ["Pagamento", "Pedido de compra", "Frete", "Contato", "Obs. de entrega"]){
        await pagina.locator("#listaColunasVisiveis label").filter({ hasText: new RegExp("^" + nome + "$") }).locator("input").check();
    }
    confere("painel continua aberto ao marcar", await pagina.isVisible("#painelColunas"));
    await pagina.screenshot({ path: path.join(saida, "2-painel-aberto.png") });
    const lista = await pagina.$eval("#listaColunasVisiveis", e => [e.scrollHeight, e.clientHeight]);
    confere("painel mostra as opções", lista[0] <= lista[1] || lista[1] >= 400, lista);
    for(const largura of [1500, 1100, 800, 420]){
        await pagina.mouse.click(5, 5);
        await pagina.setViewportSize({ width: largura, height: 700 });
        await abreOpcao("#btnColunas");
        const c = await pagina.locator("#painelColunas").boundingBox();
        confere(`painel cabe na tela com ${largura}px`, c.x >= 0 && c.x + c.width <= largura, c);
    }
    await pagina.screenshot({ path: path.join(saida, "2b-painel-estreito.png") });
    await pagina.mouse.click(5, 5);
    await pagina.setViewportSize({ width: 1500, height: 700 });
    await abreOpcao("#btnColunas");
    t = await titulos();
    confere("Status sumiu", !t.includes("Status"), t);
    confere("Cidade apareceu", t.includes("Cidade de entrega"));

    const textoCelula = (id, nome) => pagina.$eval("tr.ag-item", (l, i) => l.children[i].textContent.trim(), t.indexOf(nome));
    confere("cidade da 1ª linha", (await textoCelula(0, "Cidade de entrega")) === "Brusque/SC", await textoCelula(0, "Cidade de entrega"));
    confere("pagamento", (await textoCelula(0, "Pagamento")) === "Boleto – 28/56 DD", await textoCelula(0, "Pagamento"));
    confere("pedido", (await textoCelula(0, "Pedido de compra")) === "PC-9");
    confere("frete", (await textoCelula(0, "Frete")).includes("1.150,00"), await textoCelula(0, "Frete"));
    confere("obs. de entrega", (await textoCelula(0, "Obs. de entrega")) === "ligar antes");
    const cidade2 = await pagina.$$eval("tr.ag-item", (l, i) => l[1].children[i].textContent.trim(), t.indexOf("Cidade de entrega"));
    confere("endereço sem UF fica vazio", cidade2 === "", cidade2);
    const colspan = await pagina.$eval("tr.ag-dia th", e => e.colSpan);
    confere("cabeçalho do dia cobre tudo", colspan === t.length, [colspan, t.length]);
    const colunasTd = await pagina.$eval("tr.ag-item", l => l.children.length);
    confere("linha tem uma célula por coluna", colunasTd === t.length, [colunasTd, t.length]);

    await pagina.mouse.click(5, 5);
    confere("painel fecha ao clicar fora", !(await pagina.isVisible("#painelColunas")));
    await pagina.screenshot({ path: path.join(saida, "3-colunas-escolhidas.png") });

    // ---------- continua salvo ----------
    const ordemAntes = await titulos();
    await abrir();
    await pagina.waitForTimeout(100);
    const ordemDepois = await titulos();
    confere("escolhas continuam ao recarregar", ordemAntes.join() === ordemDepois.join(), ordemDepois);

    // ---------- transportador não é afetado ----------
    await modo("transportador");
    t = await titulos();
    confere("transportador não mudou", t.includes("Status") && !t.includes("Cidade de entrega"), t);
    await pagina.click("#btnTema");
    await pagina.screenshot({ path: path.join(saida, "4-transportador-claro.png") });
    await modo("expedicao");
    await abreOpcao("#btnColunas");
    await pagina.screenshot({ path: path.join(saida, "5-expedicao-claro.png") });
    await pagina.click("#btnTema");
    await abreOpcao("#btnColunas");

    // ---------- pelo menos uma coluna ----------
    const marcadas = pagina.locator("#listaColunasVisiveis input:checked:not(:disabled)");
    while(await marcadas.count() > 0){ await marcadas.first().click(); }
    confere("última coluna não pode ser desligada", await pagina.locator("#listaColunasVisiveis input:checked:disabled").count() === 1);
    await pagina.mouse.click(5, 5);

    // ---------- padrão ----------
    await abreOpcao("#btnColunasPadrao");
    t = await titulos();
    confere("Colunas padrão restaura tudo", t.join() === "Horário,Plataforma / Cliente,Transportadora,Motorista,Período,Status,Observação,Proposta,", t);
    confere("botão padrão some de novo", !(await pagina.isVisible("#btnColunasPadrao")));

    // ---------- ordem/largura salvas antes desta versão ----------
    await pagina.evaluate(() => {
        localStorage.setItem("agendaColunas:u1", JSON.stringify({ expedicao: ["status", "horario", "titulo"], transportador: [] }));
        localStorage.setItem("agendaLarguras:u1", JSON.stringify({ expedicao: { horario: 80, proposta: 90, lado: 300 }, transportador: {} }));
    });
    await abrir();
    await pagina.waitForTimeout(100);
    t = await titulos();
    confere("ordem antiga: Proposta continua por último", t[0] === "Status" && t[t.length - 2] === "Proposta", t);
    const largura = (await pagina.locator("th.ag-cab-proposta").boundingBox()).width;
    confere("largura antiga da proposta vale", Math.abs(largura - 90) < 2, largura);

    // ---------- botões da linha ----------
    await pagina.evaluate(() => { localStorage.clear(); });
    await abrir();
    await pagina.waitForTimeout(100);
    await modo("expedicao");
    const qtdBotoes = () => pagina.$eval("tr.ag-item .ag-botoes", b => b.children.length);
    const caixaBotao = (nome) => pagina.locator("#listaBotoesLinha label", { hasText: nome }).locator("input");
    confere("todos os botões de início", (await qtdBotoes()) === 6, await qtdBotoes());
    confere("texto do botão", (await pagina.innerText("#btnBotoes")).includes("6 de 6"), await pagina.innerText("#btnBotoes"));
    await abreOpcao("#btnBotoes");
    await pagina.screenshot({ path: path.join(saida, "6-painel-botoes.png") });
    await caixaBotao("Copiar faturamento").uncheck();
    await caixaBotao("Criar coleta").uncheck();
    confere("oculta dois botões", (await qtdBotoes()) === 4);
    const classes = await pagina.$eval("tr.ag-item .ag-botoes", b => [...b.children].map(c => c.className).join("|"));
    confere("sumiram os botões certos", !classes.includes("btn-faturamento") && !classes.includes("btn-coleta"), classes);
    confere("painel segue aberto", await pagina.isVisible("#painelBotoes"));
    await pagina.mouse.click(5, 5);
    await pagina.screenshot({ path: path.join(saida, "7-tres-botoes.png") });

    await abrir();
    await pagina.waitForTimeout(100);
    confere("escolha continua ao recarregar", (await qtdBotoes()) === 4);
    await modo("transportador");
    confere("vale também no transportador", (await qtdBotoes()) === 4);
    await pagina.click("#btnFiltros"); confere("botão aparece no transportador", await pagina.isVisible("#btnBotoes")); await pagina.mouse.click(5, 5);

    // clique dos que ficaram continua certo
    await pagina.click("tr.ag-item .ag-botoes button[title='Editar']");
    await pagina.waitForSelector(".modal-overlay.aberto");
    confere("Editar abre o agendamento", true);
    await pagina.evaluate(() => fecharModalAgenda());
    await pagina.waitForTimeout(100);
    await modo("expedicao");

    // outro usuário não herda
    const outro = await pagina.evaluate(() => {
        const antes = usuarioAgenda;
        usuarioAgenda = "u2";
        carregarBotoesLinha();
        const qtd = botoesOcultos.length;
        usuarioAgenda = antes;
        carregarBotoesLinha();
        return qtd;
    });
    confere("outro usuário tem a própria escolha", outro === 0, outro);

    // larguras fixas: congela com 3 botões e liga os 5, tudo tem que caber
    const alcaMot = pagina.locator("th.ag-cab-motorista .ag-redimensiona");
    const cx = await alcaMot.boundingBox();
    await pagina.mouse.move(cx.x + 3, cx.y + 5);
    await pagina.mouse.down();
    await pagina.mouse.move(cx.x + 40, cx.y + 5, { steps: 4 });
    await pagina.mouse.up();
    const cabe = () => pagina.$eval("tr.ag-item td.ag-lado", td => {
        const b = [...td.querySelectorAll("button")];
        return b[b.length - 1].getBoundingClientRect().right <= td.getBoundingClientRect().right + 1;
    });
    confere("largura fixa: 3 botões cabem", await cabe());
    const lado3 = await pagina.$eval("tr.ag-item td.ag-lado", e => e.getBoundingClientRect().width);
    await abreOpcao("#btnBotoes");
    await caixaBotao("Copiar faturamento").check();
    await caixaBotao("Criar coleta").check();
    confere("largura fixa: 5 botões cabem", await cabe());
    const lado5 = await pagina.$eval("tr.ag-item td.ag-lado", e => e.getBoundingClientRect().width);
    confere("coluna cresceu com os botões", lado5 > lado3, [lado3, lado5]);
    await pagina.screenshot({ path: path.join(saida, "8-fixa-cinco.png") });

    // só o excluir: sem margem sobrando, e o último não desliga
    for(const nome of ["Copiar agendamento", "Copiar faturamento", "Criar coleta", "Consultar estoque", "Editar"]){
        await caixaBotao(nome).uncheck();
    }
    confere("largura fixa: só excluir cabe", await cabe());
    confere("último botão não pode ser desligado", await caixaBotao("Excluir").isDisabled());
    await pagina.mouse.click(5, 5);
    await pagina.screenshot({ path: path.join(saida, "9-so-excluir.png") });

    // lixo salvo não quebra
    await pagina.evaluate(() => localStorage.setItem("agendaBotoes:u1", "{quebrado"));
    await abrir();
    await pagina.waitForTimeout(100);
    confere("dado inválido é ignorado", (await qtdBotoes()) === 6);
    erros.length = erros.filter(e => !/inválidos/.test(e)).length;

    // ---------- botão único de filtros ----------
    await pagina.evaluate(() => { localStorage.clear(); });
    await abrir();
    await pagina.waitForTimeout(100);
    await modo("transportador");
    const visivelAgora = (sel) => pagina.isVisible(sel);
    for(const sel of ["#btnDatas", "#btnStatus", "#btnSemPatrimonio", "#ordemAgenda", "#filtroTipo", "#btnBotoes", "#chipsTransportadora"]){
        confere(`${sel} escondido com o painel fechado`, !(await visivelAgora(sel)));
    }
    for(const sel of ["#btnFiltros", "#buscaAgenda", "#btnTema"]){
        confere(`${sel} continua na barra`, await visivelAgora(sel));
    }
    confere("sem filtro: botão limpo", (await pagina.innerText("#btnFiltros")).trim() === "⚙️ Filtros ▾", await pagina.innerText("#btnFiltros"));
    confere("sem filtro: sem aviso", !(await visivelAgora("#btnLimparFiltros")));
    await pagina.screenshot({ path: path.join(saida, "10-barra-limpa.png") });

    await pagina.click("#btnFiltros");
    confere("painel abre", await visivelAgora("#painelFiltros"));
    await pagina.screenshot({ path: path.join(saida, "11-painel-filtros.png") });

    // chip redesenha a si mesmo e o painel tem que continuar aberto
    await pagina.locator("#chipsTransportadora .chip", { hasText: "Trans A" }).click();
    confere("chip mantém o painel aberto", await visivelAgora("#painelFiltros"));
    confere("chip filtra", (await pagina.innerText("#contagemAgenda")).startsWith("5 "), await pagina.innerText("#contagemAgenda"));
    await pagina.locator("#chipsTransportadora .chip", { hasText: "Sem transportadora" }).click();
    confere("sem transportadora filtra", (await pagina.innerText("#contagemAgenda")).startsWith("0 "), await pagina.innerText("#contagemAgenda"));
    confere("lista vazia ainda mostra o aviso", (await pagina.innerText("#resumoFiltros")).includes("sem transportadora"), await pagina.innerText("#resumoFiltros"));
    await pagina.locator("#chipsTransportadora .chip", { hasText: "Todas" }).click();

    // status abre dentro do painel
    await pagina.click("#btnStatus");
    confere("lista de status abre", await visivelAgora("#painelStatus"));
    confere("painel continua aberto", await visivelAgora("#painelFiltros"));
    await pagina.locator("#listaStatusFiltro label", { hasText: "A confirmar" }).locator("input").uncheck();
    confere("status filtra", (await pagina.innerText("#contagemAgenda")).startsWith("4 "));
    confere("lista de status segue aberta", await visivelAgora("#painelStatus"));

    // datas: abrir fecha a de status
    await pagina.click("#btnDatas");
    confere("uma lista por vez", await visivelAgora("#painelDatas") && !(await visivelAgora("#painelStatus")));
    await pagina.click("button:has-text('Próximos 7 dias')");
    confere("atalho de datas mantém aberto", await visivelAgora("#painelDatas"));
    await pagina.screenshot({ path: path.join(saida, "12-datas-no-painel.png") });
    const fp = await pagina.locator("#painelFiltros").boundingBox();
    confere("painel não passa do fim da tela", fp.y + fp.height <= 700, fp);
    confere("o resto rola dentro do painel", await pagina.$eval("#painelFiltros", e => e.scrollHeight > e.clientHeight));

    await pagina.selectOption("#filtroTipo", "Entrega");
    await pagina.click("#btnSemPatrimonio");
    confere("sem patrimônio mantém aberto", await visivelAgora("#painelFiltros"));

    await pagina.mouse.click(5, 5);
    confere("clicar fora fecha", !(await visivelAgora("#painelFiltros")));
    const textoBotao = await pagina.innerText("#btnFiltros");
    confere("botão conta os ativos", textoBotao.includes("3 ativos"), textoBotao);
    const resumo = await pagina.innerText("#resumoFiltros");
    confere("aviso lista os ativos", resumo.includes("status") && resumo.includes("tipo Entrega") && resumo.includes("só sem patrimônio"), resumo);
    await pagina.screenshot({ path: path.join(saida, "13-filtros-ativos.png") });

    // tipo não vale na expedição
    await modo("expedicao");
    confere("tipo não conta na expedição", !(await pagina.innerText("#resumoFiltros")).includes("tipo"), await pagina.innerText("#resumoFiltros"));
    await modo("transportador");

    // pesquisando, datas e status não escondem nada
    await pagina.fill("#buscaAgenda", "Cliente");
    await pagina.waitForTimeout(500);
    confere("pesquisa ignora status no aviso", !(await pagina.innerText("#resumoFiltros")).includes("status"), await pagina.innerText("#resumoFiltros"));
    await pagina.fill("#buscaAgenda", "");
    await pagina.waitForTimeout(500);

    await pagina.click("#btnLimparFiltros");
    confere("limpar zera tudo", (await pagina.innerText("#btnFiltros")).trim() === "⚙️ Filtros ▾" && !(await visivelAgora("#btnLimparFiltros")));
    confere("limpar mostra tudo de novo", (await pagina.innerText("#contagemAgenda")).startsWith("5 "), await pagina.innerText("#contagemAgenda"));
    confere("limpar solta os selects", (await pagina.$eval("#filtroTipo", e => e.value)) === "");

    // Esc fecha
    await pagina.click("#btnFiltros");
    await pagina.keyboard.press("Escape");
    confere("Esc fecha o painel", !(await visivelAgora("#painelFiltros")));

    // cabe na tela
    for(const largura of [1500, 1000, 420]){
        await pagina.setViewportSize({ width: largura, height: 700 });
        await pagina.click("#btnFiltros");
        const c = await pagina.locator("#painelFiltros").boundingBox();
        confere(`painel de filtros cabe com ${largura}px`, c.x >= 0 && c.x + c.width <= largura, c);
        if(largura === 420) await pagina.screenshot({ path: path.join(saida, "14-celular.png") });
        await pagina.mouse.click(5, 5);
    }
    await pagina.setViewportSize({ width: 1500, height: 700 });

    // tema claro
    await pagina.click("#btnTema");
    await pagina.click("#btnFiltros");
    await pagina.click("#btnBotoes");
    await pagina.screenshot({ path: path.join(saida, "15-painel-claro.png") });
    await pagina.mouse.click(5, 5);
    await pagina.click("#btnTema");

    // ---------- consulta ao estoque (lupa) ----------
    await pagina.evaluate(() => { localStorage.clear(); });
    await abrir();
    await pagina.waitForTimeout(100);
    await modo("transportador");
    const linhasEstoque = () => pagina.$$eval("#listaEstoqueAgenda tbody tr", l => l.map(t => [...t.children].map(c => c.textContent.trim())));

    confere("lupa aparece na linha", await pagina.locator("tr.ag-item .btn-estoque").count() === 5);
    await pagina.locator("tr.ag-item .btn-estoque").first().click();
    await pagina.waitForSelector("#listaEstoqueAgenda table");
    let le = await linhasEstoque();
    confere("abre com o mesmo modelo", le.every(l => l[0].startsWith("WAE18")) && le.length === 5, le);
    confere("patrimônio, marca e modelo", le[0][0] === "WAE18R001" && le[0][1] === "GENIE" && le[0][2] === "Z45", le[0]);
    confere("mostra o ano de fabricação", le[0][3] === "2019", le[0]);
    confere("sem ano: mostra traço", le.find(l => l[0] === "WAE18R002")[3] === "—", le.find(l => l[0] === "WAE18R002"));
    confere("marca neste agendamento", le[0][5] === "neste agendamento", le[0][5]);
    const outraReserva = le.find(l => l[0] === "WAE18R002");
    confere("avisa máquina já agendada", outraReserva && outraReserva[5].includes("já em demanda") && outraReserva[5].includes("Cliente Três"), outraReserva);
    confere("agendamento cancelado não reserva", le.find(l => l[0] === "WAE18R003")[5] === "", le.find(l => l[0] === "WAE18R003"));
    const texto = await pagina.innerText("#listaEstoqueAgenda");
    confere("separa as filiais", texto.includes("Itajaí: 2 disponível(is), 2 em manutenção") && texto.includes("Joinville: 1 disponível(is), 0 em manutenção"), texto.slice(0, 200));
    confere("mostra a data do estoque", texto.includes("Estoque publicado em"));
    const classeDa = (patrimonio) => pagina.$$eval("#listaEstoqueAgenda tbody tr", (l, p) => l.find(t => t.children[0].textContent.trim() === p).className, patrimonio);
    const fundoDa = (patrimonio) => pagina.$$eval("#listaEstoqueAgenda tbody tr", (l, p) => getComputedStyle(l.find(t => t.children[0].textContent.trim() === p).children[1]).backgroundColor, patrimonio);
    const man = le.find(l => l[0] === "WAE18R004");
    confere("manutenção aparece com a situação", man && man[4] === "Manutenção", man);
    confere("manutenção em demanda fica destacada", (await classeDa("WAE18R004")) === "estoque-em-demanda" && man[5].includes("Cliente Cinco"), man);
    confere("manutenção livre sem destaque", (await classeDa("WAE18R005")) === "", await classeDa("WAE18R005"));
    confere("disponível em demanda fica destacada", (await classeDa("WAE18R002")) === "estoque-em-demanda");
    confere("disponível livre sem destaque", (await classeDa("WAE18R003")) === "");
    confere("este agendamento tem destaque próprio", (await classeDa("WAE18R001")) === "estoque-neste-agendamento");
    confere("destaque muda o fundo de verdade", (await fundoDa("WAE18R002")) !== (await fundoDa("WAE18R003")), [await fundoDa("WAE18R002"), await fundoDa("WAE18R003")]);
    confere("sem aviso de função antiga", !texto.includes("falta atualizar"));
    confere("sem nome de cliente do estoque", !texto.includes("Pátio secreto"));
    await pagina.screenshot({ path: path.join(saida, "16-lupa-modelo.png") });

    await pagina.click("#listaEstoqueAgenda .estoque-topo button");
    le = await linhasEstoque();
    confere("ver todos mostra outros modelos", le.some(l => l[0].startsWith("WTE14")), le.map(l => l[0]));
    const fallback = le.find(l => l[0] === "WTE14046");
    confere("sem marca: usa o equipamento e o modelo calculado", fallback[1] === "TESOURA 14M" && fallback[2] === "WTE14", fallback);
    await pagina.screenshot({ path: path.join(saida, "17-lupa-todos.png") });
    await pagina.click("#listaEstoqueAgenda .estoque-topo button");
    confere("volta para o modelo", (await linhasEstoque()).every(l => l[0].startsWith("WAE18")));
    await pagina.keyboard.press("Escape");
    confere("Esc fecha a janela", !(await pagina.isVisible("#modalEstoque")));

    // tema claro
    await pagina.click("#btnTema");
    await pagina.locator("tr.ag-item .btn-estoque").first().click();
    await pagina.waitForSelector("#listaEstoqueAgenda table");
    await pagina.screenshot({ path: path.join(saida, "18-lupa-claro.png") });
    await pagina.click("#modalEstoque .btn-fechar");
    await pagina.click("#btnTema");

    // função ainda não criada no banco
    await pagina.evaluate(() => { window.__rpcErro = { code: "PGRST202", message: "not found" }; });
    await pagina.locator("tr.ag-item .btn-estoque").first().click();
    await pagina.waitForFunction(() => document.getElementById("listaEstoqueAgenda").innerText.includes("estoque_disponiveis"));
    confere("sem a função: explica o que falta", true);
    await pagina.click("#modalEstoque .btn-fechar");
    await pagina.evaluate(() => { window.__rpcErro = { code: "500", message: "falhou" }; });
    await pagina.locator("tr.ag-item .btn-estoque").first().click();
    await pagina.waitForFunction(() => document.getElementById("listaEstoqueAgenda").innerText.includes("Não foi possível"));
    confere("erro geral: mensagem clara", true);
    await pagina.click("#modalEstoque .btn-fechar");
    await pagina.evaluate(() => { window.__rpcErro = null; });
    erros.length = 0; // os dois erros acima vão de propósito para o console

    // função antiga no banco (ainda sem a coluna manutencao)
    await pagina.evaluate(() => { window.__rpcAntiga = true; });
    await pagina.locator("tr.ag-item .btn-estoque").first().click();
    await pagina.waitForSelector("#listaEstoqueAgenda table");
    confere("função antiga: funciona e avisa", (await pagina.innerText("#listaEstoqueAgenda")).includes("falta atualizar a função"));
    await pagina.click("#modalEstoque .btn-fechar");
    await pagina.evaluate(() => { window.__rpcAntiga = false; });

    // pode ocultar
    await pagina.click("#btnFiltros");
    await pagina.click("#btnBotoes");
    await pagina.locator("#listaBotoesLinha label", { hasText: "Consultar estoque" }).locator("input").uncheck();
    confere("lupa pode ser ocultada", await pagina.locator("tr.ag-item .btn-estoque").count() === 0);
    await pagina.mouse.click(5, 5);
    await pagina.evaluate(() => { localStorage.clear(); });

    confere("sem erros no console", erros.length === 0, erros);

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exitCode = falhas ? 1 : 0;

})().catch(e => { console.error(e); process.exit(1); });
