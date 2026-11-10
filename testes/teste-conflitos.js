const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..", "site");

const hoje = new Date().toLocaleDateString("en-CA");
const ontem = new Date(Date.now() - 86400000).toLocaleDateString("en-CA");

const base = { data: hoje, horario: "08:00", tipo: "Entrega", status: "Confirmado", prazos_pagamento: ["28"], forma_pagamento: "Boleto", emails: "a@b.com", frete_conta: "nossa" };

const linhas = [
    { ...base, id: 1, plataforma: "WAE18R001", cliente: "Cliente Um" },
    { ...base, id: 2, plataforma: "WAE18R002", cliente: "Cliente Dois" },
    { ...base, id: 3, plataforma: "WAE18R003", cliente: "Cliente Cancelado", status: "Cancelado" },
    { ...base, id: 4, plataforma: "WAE18R005", cliente: "Cliente Coleta", tipo: "Coleta" },
    { ...base, id: 5, plataforma: "WTE8o079", cliente: "Cliente Oito" },
    { ...base, id: 6, plataforma: "WAE18R006", cliente: "Cliente Passado", data: ontem }
];

const clienteFalso = `
window.__gravacoes = [];
window.__rpcModo = "ok";
window.supabase = { createClient(){
    const linhas = ${JSON.stringify(linhas)};
    let proximoId = 100;
    const consulta = (tabela) => {
        let inicio = 0, gravando = null, idAlvo = null, unica = false;
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then"){
                    let data;
                    if(gravando){
                        const atual = linhas.find(l => l.id === idAlvo) || {};
                        const linha = { ...atual, ...gravando, id: idAlvo || proximoId++ };
                        window.__gravacoes.push(gravando);
                        data = unica ? linha : [linha];
                    }else{
                        data = inicio !== 0 ? [] : tabela === "agendamentos" ? linhas : [];
                    }
                    return (ok) => ok({ data, error: null, count: 0 });
                }
                if(nome === "range") return (a) => { inicio = a; return q; };
                if(nome === "insert" || nome === "update") return (d) => { gravando = d; return q; };
                if(nome === "eq") return (c, v) => { if(c === "id") idAlvo = v; return q; };
                if(nome === "single") return () => { unica = true; return q; };
                return () => q;
            }
        });
        return q;
    };
    return {
        from: consulta,
        rpc: async () => {
            if(window.__rpcModo === "erro") return { data: null, error: { code: "500", message: "falhou" } };
            if(window.__rpcModo === "travado") return new Promise(() => {});
            window.__rpcChamadas = (window.__rpcChamadas || 0) + 1;
            return { data: [{ filial_id: 1, atualizado_em: "2026-10-31T09:30:00Z",
                disponiveis: { WAE18: [{ p: "WAE18R009" }] },
                manutencao: { WAE18: [{ p: "WAE18R004" }] } }], error: null };
        },
        channel: () => ({ on(){ return this; }, subscribe(){ return this; }, track: async () => "ok", send: async () => "ok" }),
        auth: {
            getSession: async () => ({ data: { session: { user: { id: "u1", email: "t@t" } } } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
        },
        storage: { from: () => ({ upload: async () => ({}), remove: async () => ({}) }) }
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
        if(url.pathname.endsWith("/vendor/supabase-2.45.0.js")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso });
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

    const novo = async (patrimonios, opcoes = {}) => {
        await pagina.evaluate(() => { removerRascunho("novo"); encerrarModalAgenda(); abrirModalAgenda(); });
        for(let i = 1; i < patrimonios.length; i++){
            await pagina.locator(".ag-plataforma-linha button:has-text('+')").last().click();
        }
        for(let i = 0; i < patrimonios.length; i++){
            await pagina.locator(".ag-plataforma-item").nth(i).fill(patrimonios[i]);
        }
        await pagina.fill("#agCliente", "Cliente Novo");
        await pagina.selectOption("#agTipo", opcoes.tipo || "Transferência");
        if(opcoes.status) await pagina.selectOption("#agStatus", opcoes.status);
    };

    const salvar = async () => {
        dialogos = [];
        const antes = await pagina.evaluate(() => window.__gravacoes.length);
        await pagina.evaluate(() => salvarAgendamento());
        const depois = await pagina.evaluate(() => window.__gravacoes.length);
        return { avisos: dialogos.filter(t => t.includes("conflito")), gravou: depois - antes };
    };

    const semAviso = async (nome, patrimonios, opcoes) => {
        await novo(patrimonios, opcoes);
        const r = await salvar();
        confere(nome, r.avisos.length === 0 && r.gravou === 1, r);
    };

    // ---------- não avisa ----------
    await semAviso("máquina livre salva sem aviso", ["WAE18R009"]);
    await semAviso("agendamento cancelado não conta", ["WAE18R003"]);
    await semAviso("coleta não conta", ["WAE18R005"]);
    await semAviso("agendamento de ontem não conta", ["WAE18R006"]);
    await semAviso("só o modelo não avisa", ["WAE18"]);
    await semAviso("salvar uma coleta não avisa", ["WAE18R002"], { tipo: "Coleta" });
    await semAviso("salvar cancelado não avisa", ["WAE18R002"], { status: "Cancelado" });

    // ---------- avisa e deixa decidir ----------
    aceitar = false;
    await novo(["WAE18R002"]);
    let r = await salvar();
    confere("conflito com outra demanda avisa", r.avisos.length === 1 && r.avisos[0].includes("WAE18R002 já está em demanda") && r.avisos[0].includes("Cliente Dois"), r.avisos);
    confere("mostra a pergunta", r.avisos[0].includes("Salvar mesmo assim?"));
    confere("cancelar não grava", r.gravou === 0);
    confere("cancelar mantém o formulário aberto", await pagina.isVisible("#agCliente") && (await pagina.inputValue("#agCliente")) === "Cliente Novo");
    r = await salvar();
    confere("depois de cancelar dá para tentar de novo", r.avisos.length === 1 && r.gravou === 0, r);

    aceitar = true;
    r = await salvar();
    confere("aceitar grava", r.gravou === 1, r);
    confere("aceitar fecha o formulário", !(await pagina.isVisible("#agCliente")));

    await pagina.evaluate(() => { agendamentos = agendamentos.filter(i => i.cliente !== "Cliente Novo"); });

    await semAviso("manutenção não avisa", ["WAE18R004"]);
    await pagina.evaluate(() => { agendamentos = agendamentos.filter(i => i.cliente !== "Cliente Novo"); });

    await novo(["wte8O079"]);
    r = await salvar();
    confere("acha mesmo com o O minúsculo", r.avisos.length === 1 && r.avisos[0].includes("WTE8O079") && r.avisos[0].includes("Cliente Oito"), r.avisos);
    await pagina.evaluate(() => { agendamentos = agendamentos.filter(i => i.cliente !== "Cliente Novo"); });

    await novo(["WAE18R002", "WAE18R004", "WAE18R009"]);
    r = await salvar();
    confere("vários equipamentos: só o que está em demanda", r.avisos.length === 1 && r.avisos[0].includes("WAE18R002") && !r.avisos[0].includes("WAE18R004") && !r.avisos[0].includes("WAE18R009"), r.avisos);
    await pagina.evaluate(() => { agendamentos = agendamentos.filter(i => i.cliente !== "Cliente Novo"); });

    // ---------- clique duplo ----------
    await novo(["WAE18R002"]);
    dialogos = [];
    const antesDuplo = await pagina.evaluate(() => window.__gravacoes.length);
    await pagina.evaluate(() => Promise.all([salvarAgendamento(), salvarAgendamento()]));
    confere("clique duplo grava e avisa uma vez só", dialogos.filter(t => t.includes("conflito")).length === 1 && (await pagina.evaluate(() => window.__gravacoes.length)) - antesDuplo === 1, dialogos.length);
    await pagina.evaluate(() => { agendamentos = agendamentos.filter(i => i.cliente !== "Cliente Novo"); });

    // ---------- edição ----------
    const editar = async (id, alterar) => {
        await pagina.evaluate((i) => { removerRascunho(`edit:${i}`); encerrarModalAgenda(); abrirModalAgenda(i); }, id);
        await alterar();
        return salvar();
    };

    r = await editar(5, () => pagina.fill("#agCliente", "Cliente Oito Editado"));
    confere("editar sem trocar a máquina não avisa", r.avisos.length === 0 && r.gravou === 1, r);

    r = await editar(1, () => pagina.locator(".ag-plataforma-item").first().fill("WAE18R002"));
    confere("trocar para máquina ocupada avisa", r.avisos.length === 1 && r.avisos[0].includes("Cliente Dois") && r.gravou === 1, r.avisos);
    r = await editar(1, () => pagina.locator(".ag-plataforma-item").first().fill("WAE18R001"));
    confere("voltar para máquina livre não avisa", r.avisos.length === 0 && r.gravou === 1, r);

    // reativar um cancelado: as máquinas dele voltam a contar
    r = await editar(3, async () => {
        await pagina.locator(".ag-plataforma-item").first().fill("WAE18R002");
        await pagina.selectOption("#agStatus", "Confirmado");
    });
    confere("reativar cancelado avisa", r.avisos.length === 1, r.avisos);

    // ---------- salvar não depende do estoque ----------
    await pagina.evaluate(() => { window.__rpcModo = "travado"; window.__rpcChamadas = 0; });
    await novo(["WAE18R002"]);
    const inicio = Date.now();
    r = await salvar();
    // salvar não consulta o estoque: o limite folgado é só para máquina lenta
    confere("estoque travado não atrasa nem impede", r.gravou === 1 && r.avisos.length === 1 && Date.now() - inicio < 15000, Date.now() - inicio);
    await pagina.evaluate(() => { agendamentos = agendamentos.filter(i => i.cliente !== "Cliente Novo"); });

    await pagina.evaluate(() => { window.__rpcModo = "ok"; window.__rpcChamadas = 0; });
    await novo(["WAE18R009"]);
    await salvar();
    confere("salvar nem consulta o estoque", (await pagina.evaluate(() => window.__rpcChamadas)) === 0);

    // ---------- lupa segue igual ----------
    await pagina.evaluate(() => { window.__rpcModo = "ok"; });
    await pagina.click("#btnModoTransportador");
    await pagina.locator("tr.ag-item .btn-estoque").first().click();
    await pagina.waitForSelector("#listaEstoqueAgenda table");
    await pagina.click("#listaEstoqueAgenda .estoque-topo button").catch(() => {});
    confere("lupa continua abrindo", await pagina.isVisible("#modalEstoque"));
    await pagina.click("#modalEstoque .btn-fechar");

    confere("sem erros além dos esperados", erros.length === 0, erros);

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exitCode = falhas ? 1 : 0;

})().catch(e => { console.error(e); process.exit(1); });
