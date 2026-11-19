// Página "Análise de movimentações" (analise-movimentacoes.html, só admin): máquinas que saíram
// (entrega e a que vai na troca técnica) e que voltaram (coleta e a recolha da troca), saldo,
// transferências e fretes frustrados à parte, gráfico com saídas para cima e retornos para baixo
// (com a dica), por modelo, por cliente (com "Mostrar todos"), filtros e a busca no banco. Os
// números esperados foram feitos à mão a partir dos agendamentos abaixo. Banco simulado: nada
// aqui toca o Supabase de produção.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..", "site");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });

// guarda cada consulta (tabela e chamadas) e responde a faixa pedida em .range()
const clienteFalso = `
window.__consultas = [];
window.supabase = { createClient(){
    const consulta = (tabela) => {
        const chamadas = [];
        window.__consultas.push({ tabela, chamadas });
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then") return (ok) => {
                    if(tabela !== "agendamentos") return ok({ data: [], error: null });
                    if(window.__falhaBanco) return ok({ data: null, error: { message: "falhou", code: "500" } });
                    const faixa = chamadas.find(chamada => chamada[0] === "range");
                    const linhas = window.__agendamentos || [];
                    return ok({ data: faixa ? linhas.slice(faixa[1], faixa[2] + 1) : linhas, error: null });
                };
                return (...argumentos) => { chamadas.push([nome, ...argumentos]); return q; };
            }
        });
        return q;
    };
    return {
        from: consulta,
        rpc: async () => ({ data: null, error: null }),
        channel: () => ({ on(){ return this; }, subscribe(){ return this; }, track: async () => "ok", send: async () => "ok", presenceState: () => ({}) }),
        auth: {
            getSession: async () => ({ data: { session: { user: { id: "u1", email: "chefe@t" } } } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
        },
        functions: { invoke: async () => ({ data: null, error: null }) },
        storage: { from: () => ({}) }
    };
}};`;

const authFalso = `
function ehAdmin(){ return Promise.resolve(true); }
function temAcesso(){ return true; }
function temFilial(){ return true; }
function existeLoginSalvo(){ return true; }
function carregarPerfil(){ return Promise.resolve({}); }
function fazerLogout(){}
function recursoDaPagina(){ return "analise-movimentacoes"; }
function nomeArquivoAtual(){ return "analise-movimentacoes.html"; }`;

const ag = (id, data, tipo, status, plataforma, cliente, recolha = null) => ({
    id, data, tipo, status, plataforma, plataforma_recolha: recolha, cliente
});

// outubro/2026 (1º de outubro é quinta)
const AGENDAMENTOS = [
    ag(1, "2026-10-02", "Entrega", "Concluído", "WTE12045", "Construtora Alfa"),
    ag(2, "2026-10-02", "Entrega", "Concluído", "2x WTE12 + WAE15030", "Construtora Alfa"),
    ag(3, "2026-10-03", "Coleta", "Confirmado", "WAE15030", "Beta Obras"),
    // troca: vai uma, volta a recolha (o mesmo cliente escrito em minúsculas)
    ag(4, "2026-10-05", "Troca técnica", "Concluído", "WTE12050", "construtora alfa", "WTE12045"),
    ag(5, "2026-10-05", "Entrega", "Cancelado", "WTE12", "Gama"),
    // fora do saldo
    ag(6, "2026-10-07", "Transferência", "Concluído", "WAE15030", "Beta Obras"),
    ag(7, "2026-10-07", "Transferência entre unidades", "Concluído", "2x WTE14", "W Rental Joinville"),
    ag(8, "2026-10-08", "Frete frustrado", "Concluído", "WTE12", "Delta"),
    // fora do período de outubro (o banco simulado não filtra: a página confere também)
    ag(9, "2026-09-15", "Entrega", "Concluído", "WTE12", "Alfa"),
    // coleta sem máquina nem cliente: conta 1, "sem máquina informada"
    ag(10, "2026-10-09", "Coleta", "Concluído", "", ""),
    ag(11, "2026-10-10", "Coleta", "Concluído", "WTE12045 + WTE12050", "Construtora Alfa"),
    ag(12, "2026-10-12", "Entrega", "Confirmado", "WAE15", "Beta Obras")
];

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2" };

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

// fora do bloco: uma exceção no meio fecha o navegador (senão o processo fica preso)
let navegador = null;

(async () => {

    navegador = await chromium.launch({ channel: "chrome", headless: true });

    const abrir = async (opcoesContexto, agendamentos, opcoes = {}) => {
        const contexto = await navegador.newContext({ timezoneId: "America/Sao_Paulo", ...opcoesContexto });
        await contexto.route("**/*", (rota) => {
            const url = new URL(rota.request().url());
            if(url.pathname.endsWith("/vendor/supabase-2.45.0.js")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso });
            if(url.hostname !== "admin.test") return rota.abort();
            if(url.pathname.endsWith("auth-guard.js")) return rota.fulfill({ contentType: "text/javascript", body: authFalso });
            const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
            if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
            return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
        });
        await contexto.addInitScript(({ agendamentos, falha, quantos }) => {
            window.__agendamentos = quantos
                ? Array.from({ length: quantos }, (_, i) => ({ id: i + 1, data: "2026-10-15", tipo: "Entrega", status: "Confirmado", plataforma: "WTE12", plataforma_recolha: null, cliente: `Cliente ${String(i % 20).padStart(2, "0")}` }))
                : agendamentos;
            window.__falhaBanco = !!falha;
        }, { agendamentos, falha: opcoes.falha, quantos: opcoes.quantos });
        const pagina = await contexto.newPage();
        const erros = [];
        pagina.on("pageerror", e => erros.push(e.message));
        pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_FAILED/.test(m.text())) erros.push(m.text()); });
        await pagina.goto("http://admin.test/analise-movimentacoes.html");
        await pagina.waitForSelector("#resumoMovimentos .cartao-resumo");
        return { contexto, pagina, erros };
    };

    // espera a página terminar (sem waitForFunction: a CSP da página bloqueia)
    const esperar = async (pagina, condicao, argumento) => {
        for(let vez = 0; vez < 60; vez++){
            if(await pagina.evaluate(condicao, argumento)) return true;
            await pagina.waitForTimeout(50);
        }
        return false;
    };

    const definirPeriodo = async (pagina, de, ate) => {
        await pagina.evaluate(([de, ate]) => {
            document.getElementById("movimentosDe").value = de;
            document.getElementById("movimentosAte").value = ate;
            document.getElementById("movimentosAte").dispatchEvent(new Event("change", { bubbles: true }));
        }, [de, ate]);
        await esperar(pagina, () => !carregandoMovimentos);
    };

    const resumo = (pagina) => pagina.$$eval(".cartao-resumo", cartoes => Object.fromEntries(cartoes.map(cartao => [
        cartao.querySelector(".cartao-titulo").innerText,
        [cartao.querySelector(".cartao-valor").innerText, cartao.querySelector(".cartao-detalhe")?.innerText || ""]
    ])));

    const tabela = (pagina, id) => pagina.$$eval(`#${id} tr`, linhas => linhas.map(linha => [...linha.cells].map(celula => celula.innerText.trim())));

    // ---------- abre: últimos 30 dias, busca no banco certo ----------
    const { contexto, pagina, erros } = await abrir({ viewport: { width: 1400, height: 900 } }, AGENDAMENTOS);

    const busca = await pagina.evaluate(() => {
        const consulta = window.__consultas.filter(item => item.tabela === "agendamentos").pop();
        return { chamadas: consulta.chamadas, de: document.getElementById("movimentosDe").value, ate: document.getElementById("movimentosAte").value };
    });
    const chamada = (nome) => busca.chamadas.find(item => item[0] === nome);
    const hoje = await pagina.evaluate(() => isoDaData(new Date()));
    const trintaDias = await pagina.evaluate(() => isoDaData(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 29)));
    confere("abre nos últimos 30 dias (com hoje)", busca.de === trintaDias && busca.ate === hoje, [busca.de, busca.ate]);
    confere("o atalho 30 dias fica marcado", await pagina.evaluate(() => document.querySelector('[data-arg="30"]').classList.contains("ativo")));
    confere("pede ao banco só o período, sem os da lixeira", JSON.stringify(chamada("gte")) === JSON.stringify(["gte", "data", busca.de]) && JSON.stringify(chamada("lte")) === JSON.stringify(["lte", "data", busca.ate]) && JSON.stringify(chamada("is")) === JSON.stringify(["is", "excluido_em", null]), busca.chamadas);
    confere("só as colunas que usa (com a máquina recolhida na troca)", !chamada("select")[1].includes("*") && chamada("select")[1].includes("plataforma_recolha") && chamada("select")[1].includes("cliente"), chamada("select"));
    confere("na própria página, o menu não repete o link dela (e tem o da Análise de fretes)", await pagina.evaluate(() => !!document.querySelector('.topbar a[href="analise-fretes.html"]') && !document.querySelector('.topbar a[href="analise-movimentacoes.html"]')));

    // ---------- outubro ----------
    await definirPeriodo(pagina, "2026-10-01", "2026-10-31");

    let r = await resumo(pagina);
    confere("conta 10 agendamentos (sem o cancelado e o de setembro)", (await pagina.innerText("#contagemMovimentos")) === "10 agendamentos", await pagina.innerText("#contagemMovimentos"));
    confere("saídas: entregas e a máquina que vai na troca ('2x' conta 2)", r["Saídas"][0] === "6" && r["Saídas"][1] === "em 3 entregas e 1 troca técnica", r["Saídas"]);
    confere("retornos: coletas e a recolha da troca (coleta sem máquina conta 1)", r["Retornos"][0] === "5" && r["Retornos"][1] === "em 3 coletas e 1 troca técnica", r["Retornos"]);
    confere("saldo com sinal", r["Saldo"][0] === "+1" && r["Saldo"][1] === "saíram mais do que voltaram", r["Saldo"]);
    confere("máquinas por dia (11 em 6 dias) e o dia mais cheio", r["Máquinas por dia"][0] === "1,8" && r["Máquinas por dia"][1].includes("02/10 (4)"), r["Máquinas por dia"]);
    confere("transferências (entre obras e entre unidades) fora do saldo", r["Transferências"][0] === "3" && r["Transferências"][1] === "2 agendamentos entre obras ou unidades (fora do saldo)", r["Transferências"]);
    confere("frete frustrado fora do saldo", r["Fretes frustrados"][0] === "1", r["Fretes frustrados"]);

    let linhas = await tabela(pagina, "corpoModelosMovimentos");
    confere("por modelo: mais movimento primeiro, sem máquina por último (transferência não entra)", JSON.stringify(linhas) === JSON.stringify([["WTE12", "4", "3", "+1"], ["WAE15", "2", "1", "+1"], ["Sem máquina informada", "0", "1", "−1"]]), linhas);

    linhas = await tabela(pagina, "corpoClientesMovimentos");
    confere("por cliente: o mesmo cliente em minúsculas fica junto; sem cliente por último", JSON.stringify(linhas) === JSON.stringify([["Construtora Alfa", "5", "3", "+2"], ["Beta Obras", "1", "1", "0"], ["(Sem cliente)", "0", "1", "−1"]]), linhas);
    confere("poucos clientes: sem o botão Mostrar todos", await pagina.$eval("#btnTodosClientes", botao => botao.hidden && botao.offsetParent === null));

    confere("modelos na caixa: os que saíram ou voltaram, sem máquina por último", JSON.stringify(await pagina.$$eval("#movimentosModelo option", opcoes => opcoes.map(opcao => opcao.value))) === JSON.stringify(["", "WAE15", "WTE12", "Sem máquina informada"]), await pagina.$$eval("#movimentosModelo option", opcoes => opcoes.map(opcao => opcao.value)));

    // ---------- gráfico ----------
    confere("saídas sobem nos dias com saída e retornos descem nos dias com retorno", (await pagina.$$("#graficoMovimentos .barra-saida")).length === 3 && (await pagina.$$("#graficoMovimentos .barra-retorno")).length === 4 && (await pagina.innerText("#tituloMovimentos")) === "Saídas e retornos por dia");
    const posicoes = await pagina.evaluate(() => {
        const base = document.querySelector("#graficoMovimentos .base-grafico").getAttribute("y1");
        const caixa = (seletor) => { const c = document.querySelector(seletor).getBBox(); return { y: c.y, height: c.height }; };
        return { base: Number(base), saida: caixa("#graficoMovimentos .barra-saida"), retorno: caixa("#graficoMovimentos .barra-retorno") };
    });
    confere("saída acima da linha do zero e retorno abaixo, sem encostar nela", posicoes.saida.y + posicoes.saida.height <= posicoes.base - 0.9 && posicoes.retorno.y >= posicoes.base + 0.9, posicoes);
    confere("legenda das duas cores", (await pagina.innerText(".legenda-movimentos")).includes("Saídas") && (await pagina.innerText(".legenda-movimentos")).includes("Retornos"));
    // a letra do site (Inter) chegando depois muda a altura do texto e o gráfico desce:
    // mede só com ela carregada, senão o mouse cai fora do gráfico
    await pagina.evaluate(() => document.fonts.ready.then(() => true));
    const caixa = await pagina.$eval("#graficoMovimentos svg", svg => { const c = svg.getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; });
    const passo = (caixa.w - 32 - 8) / 31;
    await pagina.mouse.move(caixa.x + 32 + passo * 4.5, caixa.y + 20);
    let dica = await pagina.innerText("#dicaMovimentos");
    confere("passar o mouse (no alto da coluna): dia, saídas, retornos e saldo", dica.includes("seg, 05/10") && dica.includes("1 saída") && dica.includes("1 retorno") && dica.includes("Saldo: 0"), dica);
    confere("as duas colunas do dia ficam em destaque", (await pagina.$$("#graficoMovimentos .destacada")).length === 2);
    await pagina.mouse.move(caixa.x + 32 + passo * 1.5, caixa.y + caixa.h - 30);
    dica = await pagina.innerText("#dicaMovimentos");
    confere("dia só com saídas", dica.includes("sex, 02/10") && dica.includes("4 saídas") && dica.includes("0 retornos") && dica.includes("Saldo: +4"), dica);
    await pagina.mouse.move(caixa.x + 32 + passo * 3.5, caixa.y + 20);
    confere("dia sem movimento diz isso", (await pagina.innerText("#dicaMovimentos")).includes("Nenhum movimento"));
    await pagina.mouse.move(caixa.x + caixa.w / 2, caixa.y + caixa.h + 60);
    confere("saiu do gráfico: a dica some", await pagina.$eval("#dicaMovimentos", d => d.hidden));
    await pagina.click(".numeros-viagens summary");
    linhas = await tabela(pagina, "corpoDiasMovimentos");
    confere("os números do gráfico em tabela (só dias com movimento)", linhas.length === 6 && JSON.stringify(linhas[0]) === JSON.stringify(["sex, 02/10", "4", "0", "+4"]), linhas);
    await pagina.screenshot({ path: path.join(saida, "analise-movimentacoes.png"), fullPage: true });

    // ---------- filtros ----------
    await pagina.selectOption("#movimentosModelo", "WTE12");
    r = await resumo(pagina);
    confere("modelo WTE12: só as dele", r["Saídas"][0] === "4" && r["Retornos"][0] === "3" && r["Saldo"][0] === "+1", r);
    confere("modelo: a tabela por modelo fica só com ele", JSON.stringify(await tabela(pagina, "corpoModelosMovimentos")) === JSON.stringify([["WTE12", "4", "3", "+1"]]));
    await definirPeriodo(pagina, "2026-08-01", "2026-08-31");
    confere("período sem o modelo escolhido: a escolha continua (não volta para todos sem avisar)", (await pagina.$eval("#movimentosModelo", caixa => caixa.value)) === "WTE12" && (await pagina.innerText("#corpoModelosMovimentos")).includes("Nenhuma máquina saiu ou voltou"));
    await pagina.selectOption("#movimentosModelo", "");
    await definirPeriodo(pagina, "2026-10-01", "2026-10-31");

    await pagina.check("#movimentosConcluidos");
    r = await resumo(pagina);
    confere("só concluídos (sem a coleta e a entrega confirmadas)", r["Saídas"][0] === "5" && r["Retornos"][0] === "4", r);
    await pagina.uncheck("#movimentosConcluidos");

    await definirPeriodo(pagina, "2026-01-01", "2026-10-31");
    linhas = await tabela(pagina, "corpoDiasMovimentos");
    confere("período longo: uma coluna por semana (segunda a domingo)", (await pagina.innerText("#tituloMovimentos")) === "Saídas e retornos por semana" && JSON.stringify(linhas) === JSON.stringify([["14/09 a 20/09", "1", "0", "+1"], ["28/09 a 04/10", "4", "1", "+3"], ["05/10 a 11/10", "1", "4", "−3"], ["12/10 a 18/10", "1", "0", "+1"]]), linhas);
    confere("nenhum atalho marcado com datas escolhidas à mão", await pagina.evaluate(() => !document.querySelector(".atalhos-periodo .ativo")));

    await definirPeriodo(pagina, "2026-10-31", "2026-10-01");
    confere("data inicial depois da final: avisa", (await pagina.innerText("#corpoModelosMovimentos")).includes("a data inicial não pode passar da final"));

    await pagina.click('[data-arg="mes-passado"]');
    await esperar(pagina, () => !carregandoMovimentos);
    confere("o atalho clicado fica marcado", await pagina.evaluate(() => document.querySelector('[data-arg="mes-passado"]').classList.contains("ativo")));

    confere("sem erros no console", erros.length === 0, erros);
    await contexto.close();

    // ---------- celular (como o iPhone: respeita a meta viewport) ----------
    {
        const { contexto, pagina, erros } = await abrir({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, AGENDAMENTOS);
        await definirPeriodo(pagina, "2026-10-01", "2026-10-31");
        const larguras = await pagina.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        confere("celular: a página não passa da largura da tela", larguras[0] <= larguras[1] && larguras[1] === 390, larguras);
        const largura = await pagina.$eval("#graficoMovimentos svg", svg => svg.getBoundingClientRect().width);
        confere("celular: o gráfico cabe na tela", largura <= larguras[1], largura);
        await pagina.tap("#graficoMovimentos svg");
        await pagina.waitForTimeout(150);
        confere("celular: tocar no gráfico mostra a dica (e ela fica depois de soltar o dedo)", !(await pagina.$eval("#dicaMovimentos", d => d.hidden)));
        await pagina.tap("h2");
        confere("celular: tocar fora do gráfico fecha a dica", await pagina.$eval("#dicaMovimentos", d => d.hidden));
        await pagina.screenshot({ path: path.join(saida, "analise-movimentacoes-celular.png"), fullPage: true });
        confere("celular: sem erros", erros.length === 0, erros);
        await contexto.close();
    }

    // ---------- muitos agendamentos: busca de 1000 em 1000; muitos clientes ----------
    {
        const { contexto, pagina, erros } = await abrir({ viewport: { width: 1400, height: 900 } }, [], { quantos: 2300 });
        await definirPeriodo(pagina, "2026-10-01", "2026-10-31");
        const faixas = await pagina.evaluate(() => window.__consultas.filter(item => item.tabela === "agendamentos").slice(-3).map(item => item.chamadas.find(chamada => chamada[0] === "range")));
        confere("busca em páginas de 1000 até acabar", (await pagina.innerText("#contagemMovimentos")) === "2.300 agendamentos" && JSON.stringify(faixas) === JSON.stringify([["range", 0, 999], ["range", 1000, 1999], ["range", 2000, 2999]]), faixas);
        confere("saídas com ponto de milhar", (await resumo(pagina))["Saídas"][0] === "2.300");
        confere("muitos clientes: mostra os 15 primeiros e o botão", (await tabela(pagina, "corpoClientesMovimentos")).length === 15 && (await pagina.innerText("#btnTodosClientes")) === "Mostrar todos os 20 clientes");
        await pagina.click("#btnTodosClientes");
        confere("Mostrar todos: os 20, e o botão volta para só os primeiros", (await tabela(pagina, "corpoClientesMovimentos")).length === 20 && (await pagina.innerText("#btnTodosClientes")) === "Mostrar só os 15 primeiros");
        confere("muitos: sem erros", erros.length === 0, erros);
        await contexto.close();
    }

    // ---------- banco fora ----------
    {
        const { contexto, pagina, erros } = await abrir({ viewport: { width: 1400, height: 900 } }, [], { falha: true });
        await esperar(pagina, () => !carregandoMovimentos);
        confere("falha no banco: avisa nas tabelas e no gráfico", (await pagina.innerText("#corpoModelosMovimentos")).includes("Não foi possível carregar os agendamentos") && (await pagina.innerText("#graficoMovimentos")).includes("Não foi possível carregar"));
        confere("falha no banco: registra o erro para o admin", erros.some(texto => texto.includes("[analise-movimentacoes] Falha ao carregar")), erros);
        await contexto.close();
    }

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exitCode = falhas ? 1 : 0;

})().catch(async erro => {
    console.error(erro);
    await navegador?.close();
    process.exitCode = 1;
});
