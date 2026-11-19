// Página "Análise de fretes" (analise-fretes.html, só admin): resumo (fretes, valor, nosso
// custo, médias, viagens por dia), tabela por transportadora, gráfico de viagens com a dica,
// comparação por cidade (alerta quando a mais usada cobra mais), frete por modelo, filtros
// e a busca no banco (período, lixeira, de 1000 em 1000). Os números esperados foram feitos
// à mão a partir dos agendamentos abaixo. Banco simulado: nada aqui toca o Supabase de produção.
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
function recursoDaPagina(){ return "analise-fretes"; }
function nomeArquivoAtual(){ return "analise-fretes.html"; }`;

const ag = (id, data, tipo, status, transportadora, plataforma, frete, conta, extra = {}) => ({
    id, data, tipo, status, transportadora, plataforma, frete, frete_conta: conta,
    frete_nossa: null, origem_endereco: "W Rental", destino_endereco: "", ...extra
});

// outubro/2026 (1º de outubro é quinta)
const AGENDAMENTOS = [
    ag(1, "2026-10-02", "Entrega", "Concluído", "Transp A", "WAE1520", 300, "nossa", { destino_endereco: "Rua X, 10, Centro, Brusque/SC" }),
    ag(2, "2026-10-02", "Entrega", "Concluído", "Transp A", "2x WAE15 + WTE14046", 600, "nossa", { destino_endereco: "Rua Y, Brusque - SC" }),
    // coleta: a cidade do cliente é a origem; o frete é por conta do cliente
    ag(3, "2026-10-03", "Coleta", "Confirmado", "Transp B", "WAE1530", 250, "cliente", { origem_endereco: "Rua Z, 5, Brusque/SC", destino_endereco: "W Rental" }),
    // dividido: nosso custo é só a nossa parte
    ag(4, "2026-10-05", "Entrega", "Concluído", "Transp B", "WTE14046", 400, "dividido", { frete_nossa: 100, destino_endereco: "Av. Brasil, 200, Blumenau/SC" }),
    ag(5, "2026-10-05", "Entrega", "Cancelado", "Transp A", "WAE1520", 999, "nossa", { destino_endereco: "Brusque/SC" }),
    ag(6, "2026-10-07", "Entrega", "Confirmado", "Transp A", "WAE1520", null, "nossa", { destino_endereco: "Rua A, Brusque/SC" }),
    ag(7, "2026-10-07", "Troca técnica", "Concluído", "", "WAE1540", null, null),
    // fora do período (o banco simulado não filtra: a página confere também)
    ag(8, "2026-09-15", "Entrega", "Concluído", "Transp B", "WAE1520", 100, "nossa", { destino_endereco: "Itajaí/SC" }),
    ag(9, "2026-10-10", "Entrega", "Concluído", "Transp A", "WAE1520", 500, "nossa", { destino_endereco: "Rua B, Itajaí/SC" }),
    ag(10, "2026-10-11", "Entrega", "Concluído", "Transp A", "WAE1520", 540, "nossa", { destino_endereco: "Rua C, Itajaí/SC" }),
    ag(11, "2026-10-12", "Entrega", "Concluído", "Transp B", "WAE1520", 400, "nossa", { destino_endereco: "Rua D, Itajaí/SC" })
];

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

// fora do bloco: uma exceção no meio fecha o navegador (senão o processo fica preso)
let navegador = null;

(async () => {

    navegador = await chromium.launch({ channel: "chrome", headless: true });

    const abrir = async (tela, agendamentos, opcoes = {}) => {
        const contexto = await navegador.newContext({ viewport: tela, timezoneId: "America/Sao_Paulo" });
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
                ? Array.from({ length: quantos }, (_, i) => ({ id: i + 1, data: "2026-10-15", tipo: "Entrega", status: "Confirmado", transportadora: "Transp A", plataforma: "WAE1520", frete: 100, frete_conta: "nossa", destino_endereco: "Itajaí/SC" }))
                : agendamentos;
            window.__falhaBanco = !!falha;
        }, { agendamentos, falha: opcoes.falha, quantos: opcoes.quantos });
        const pagina = await contexto.newPage();
        const erros = [];
        pagina.on("pageerror", e => erros.push(e.message));
        pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_FAILED/.test(m.text())) erros.push(m.text()); });
        await pagina.goto("http://admin.test/analise-fretes.html");
        await pagina.waitForSelector("#resumoFretes .cartao-resumo");
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
            document.getElementById("analiseDe").value = de;
            document.getElementById("analiseAte").value = ate;
            document.getElementById("analiseAte").dispatchEvent(new Event("change", { bubbles: true }));
        }, [de, ate]);
        await esperar(pagina, () => !carregandoAnalise);
    };

    const resumo = (pagina) => pagina.$$eval(".cartao-resumo", cartoes => Object.fromEntries(cartoes.map(cartao => [
        cartao.querySelector(".cartao-titulo").innerText,
        [cartao.querySelector(".cartao-valor").innerText, cartao.querySelector(".cartao-detalhe")?.innerText || ""]
    ])));

    const tabela = (pagina, id) => pagina.$$eval(`#${id} tr`, linhas => linhas.map(linha => [...linha.cells].map(celula => celula.innerText.trim())));

    // ---------- abre: últimos 30 dias, busca no banco certo ----------
    const { contexto, pagina, erros } = await abrir({ width: 1400, height: 900 }, AGENDAMENTOS);

    const busca = await pagina.evaluate(() => {
        const consulta = window.__consultas.filter(item => item.tabela === "agendamentos").pop();
        return { chamadas: consulta.chamadas, de: document.getElementById("analiseDe").value, ate: document.getElementById("analiseAte").value };
    });
    const chamada = (nome) => busca.chamadas.find(item => item[0] === nome);
    const hoje = await pagina.evaluate(() => isoDaData(new Date()));
    const trintaDias = await pagina.evaluate(() => isoDaData(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 29)));
    confere("abre nos últimos 30 dias (com hoje)", busca.de === trintaDias && busca.ate === hoje, [busca.de, busca.ate]);
    confere("o atalho 30 dias fica marcado", await pagina.evaluate(() => document.querySelector('[data-arg="30"]').classList.contains("ativo")));
    confere("pede ao banco só o período", JSON.stringify(chamada("gte")) === JSON.stringify(["gte", "data", busca.de]) && JSON.stringify(chamada("lte")) === JSON.stringify(["lte", "data", busca.ate]), busca.chamadas);
    confere("sem os da lixeira", JSON.stringify(chamada("is")) === JSON.stringify(["is", "excluido_em", null]), busca.chamadas);
    confere("só as colunas que usa", !chamada("select")[1].includes("*") && chamada("select")[1].includes("frete_nossa"), chamada("select"));
    confere("na própria página, o menu não repete o link dela", await pagina.evaluate(() => !!document.querySelector('.topbar a[href="admin.html"]') && !document.querySelector('.topbar a[href="analise-fretes.html"]')));

    // ---------- outubro ----------
    await definirPeriodo(pagina, "2026-10-01", "2026-10-31");

    let r = await resumo(pagina);
    confere("conta 9 agendamentos (sem o cancelado e o de setembro)", (await pagina.innerText("#contagemAnalise")) === "9 agendamentos", await pagina.innerText("#contagemAnalise"));
    confere("resumo: fretes, com o que está sem transportadora", r["Fretes"][0] === "9" && r["Fretes"][1] === "1 sem transportadora", r["Fretes"]);
    confere("resumo: valor (só o que tem valor) e aviso dos sem valor", r["Valor dos fretes"][0] === "R$ 2.990,00" && r["Valor dos fretes"][1].includes("2 fretes sem valor"), r["Valor dos fretes"]);
    confere("resumo: nosso custo (conta do cliente fica fora; do dividido, só a nossa parte)", r["Nosso custo"][0] === "R$ 2.440,00" && r["Nosso custo"][1] === "R$ 550,00 por conta do cliente", r["Nosso custo"]);
    confere("resumo: frete médio", r["Frete médio"][0] === "R$ 427,14", r["Frete médio"]);
    confere("resumo: frete por máquina (2x conta 2)", r["Frete por máquina"][0] === "R$ 332,22" && r["Frete por máquina"][1] === "11 máquinas transportadas", r["Frete por máquina"]);
    confere("resumo: viagens por dia e o dia mais cheio", r["Viagens por dia"][0] === "1,3" && r["Viagens por dia"][1].includes("02/10 (2)"), r["Viagens por dia"]);

    let linhas = await tabela(pagina, "corpoTransportadorasAnalise");
    confere("por transportadora: mais fretes primeiro, sem transportadora por último", linhas.map(l => l[0]).join("|") === "Transp A|Transp B|(Sem transportadora)", linhas.map(l => l[0]));
    confere("Transp A: fretes, parte, valor, parte do valor, custo, médio, por máquina e sem valor", JSON.stringify(linhas[0]) === JSON.stringify(["Transp A", "5", "56%", "R$ 1.940,00", "65%", "R$ 1.940,00", "R$ 485,00", "R$ 323,33", "1"]), linhas[0]);
    confere("Transp B: nosso custo menor que o valor (cliente e dividido)", JSON.stringify(linhas[1]) === JSON.stringify(["Transp B", "3", "33%", "R$ 1.050,00", "35%", "R$ 500,00", "R$ 350,00", "R$ 350,00", ""]), linhas[1]);
    confere("a barrinha da parte acompanha o número", (await pagina.$eval("#corpoTransportadorasAnalise tr .preenchido-parte", barra => barra.style.width)).startsWith("55.5"));

    linhas = await tabela(pagina, "corpoCidadesAnalise");
    confere("cidades com 2 ou mais transportadoras (Blumenau só teve uma)", linhas.filter(l => l.length === 1).map(l => l[0].split(" · ")[0]).join("|") === "Brusque/SC|Itajaí/SC", linhas);
    confere("coleta conta a cidade da origem (Transp B em Brusque)", linhas.some(l => l[0] === "Transp B" && l[1] === "1" && l[2] === "R$ 250,00"), linhas);
    confere("Brusque: a mais usada é mais cara por frete, mas não por máquina: sem alerta", !linhas.find(l => l[0].startsWith("Brusque")).join(" ").includes("⚠️"), linhas);
    confere("Itajaí: alerta da mais usada cobrando mais", linhas.find(l => l[0].startsWith("Itajaí"))[0].includes("⚠️ Transp A é a mais usada e cobra 30% a mais por máquina que Transp B"), linhas.find(l => l[0].startsWith("Itajaí")));

    linhas = await tabela(pagina, "corpoModelosAnalise");
    confere("por modelo: o frete de várias máquinas se divide entre elas", JSON.stringify(linhas) === JSON.stringify([["WAE15", "9", "R$ 341,43"], ["WTE14", "2", "R$ 300,00"]]), linhas);

    // ---------- gráfico ----------
    confere("uma coluna por dia com viagem (31 dias, 7 com viagem)", (await pagina.$$("#graficoViagens .barra-viagens")).length === 7 && (await pagina.innerText("#tituloViagens")) === "Viagens por dia");
    // a letra do site (Inter) chegando depois muda a altura do texto e o gráfico desce:
    // mede só com ela carregada, senão o mouse cai fora do gráfico
    await pagina.evaluate(() => document.fonts.ready.then(() => true));
    const caixa = await pagina.$eval("#graficoViagens svg", svg => { const c = svg.getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; });
    const passo = (caixa.w - 32 - 8) / 31;
    await pagina.mouse.move(caixa.x + 32 + passo * 1.5, caixa.y + caixa.h - 30);
    let dica = await pagina.innerText("#dicaViagens");
    confere("passar o mouse: dia, viagens, valor e quem fez", dica.includes("sex, 02/10") && dica.includes("2 viagens") && dica.includes("R$ 900,00 em fretes") && dica.includes("Transp A: 2"), dica);
    confere("a coluna fica em destaque", (await pagina.$$("#graficoViagens .barra-viagens.destacada")).length === 1);
    await pagina.mouse.move(caixa.x + 32 + passo * 3.5, caixa.y + 20);
    dica = await pagina.innerText("#dicaViagens");
    confere("o alto da coluna (fora da barra) também responde; dia vazio diz isso", dica.includes("dom, 04/10") && dica.includes("Nenhuma viagem"), dica);
    await pagina.mouse.move(caixa.x + caixa.w / 2, caixa.y + caixa.h + 60);
    confere("saiu do gráfico: a dica some", await pagina.$eval("#dicaViagens", d => d.hidden));
    await pagina.click(".numeros-viagens summary");
    linhas = await tabela(pagina, "corpoViagensAnalise");
    confere("os números do gráfico em tabela (só dias com viagem)", linhas.length === 7 && JSON.stringify(linhas[0]) === JSON.stringify(["sex, 02/10", "2", "R$ 900,00", "Transp A: 2"]), linhas[0]);
    await pagina.screenshot({ path: path.join(saida, "analise-fretes.png"), fullPage: true });

    // ---------- filtros ----------
    await pagina.selectOption("#analiseTipo", "Coleta");
    r = await resumo(pagina);
    confere("tipo Coleta: só a coleta, por conta do cliente", r["Fretes"][0] === "1" && r["Valor dos fretes"][0] === "R$ 250,00" && r["Nosso custo"][0] === "R$ 0,00", r);
    confere("tipo mostra o nome da tela (Transferência entre obras)", await pagina.evaluate(() => [...document.getElementById("analiseTipo").options].some(opcao => opcao.value === "Transferência" && opcao.text === "Transferência entre obras")));
    await pagina.selectOption("#analiseTipo", "");
    await pagina.check("#analiseConcluidos");
    confere("só concluídos", (await resumo(pagina))["Fretes"][0] === "7", (await resumo(pagina))["Fretes"]);
    await pagina.uncheck("#analiseConcluidos");

    await definirPeriodo(pagina, "2026-01-01", "2026-10-31");
    confere("período longo: uma coluna por semana", (await pagina.innerText("#tituloViagens")) === "Viagens por semana" && (await pagina.$$("#graficoViagens .barra-viagens")).length === 4, (await pagina.$$("#graficoViagens .barra-viagens")).length);
    confere("a semana na tabela: segunda a domingo", (await tabela(pagina, "corpoViagensAnalise"))[1][0] === "28/09 a 04/10" && (await tabela(pagina, "corpoViagensAnalise"))[1][1] === "3", (await tabela(pagina, "corpoViagensAnalise"))[1]);
    confere("nenhum atalho marcado com datas escolhidas à mão", await pagina.evaluate(() => !document.querySelector(".atalhos-periodo .ativo")));

    await definirPeriodo(pagina, "2026-10-31", "2026-10-01");
    confere("data inicial depois da final: avisa", (await pagina.innerText("#corpoTransportadorasAnalise")).includes("a data inicial não pode passar da final"));

    await pagina.click('[data-arg="mes-passado"]');
    await esperar(pagina, () => !carregandoAnalise);
    const mesPassado = await pagina.evaluate(() => [document.getElementById("analiseDe").value, document.getElementById("analiseAte").value, periodoDoAtalho("mes-passado", new Date(2026, 0, 17))]);
    confere("mês passado: do dia 1 ao último dia (e em janeiro volta para dezembro)", mesPassado[0].endsWith("-01") && mesPassado[2].de === "2025-12-01" && mesPassado[2].ate === "2025-12-31", mesPassado);
    confere("o atalho clicado fica marcado", await pagina.evaluate(() => document.querySelector('[data-arg="mes-passado"]').classList.contains("ativo")));

    confere("sem erros no console", erros.length === 0, erros);
    await contexto.close();

    // ---------- celular ----------
    {
        const { contexto, pagina, erros } = await abrir({ width: 390, height: 844 }, AGENDAMENTOS);
        await definirPeriodo(pagina, "2026-10-01", "2026-10-31");
        const larguras = await pagina.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
        confere("celular: a página não passa da largura da tela (as tabelas rolam dentro)", larguras[0] <= larguras[1], larguras);
        const caixa = await pagina.$eval("#graficoViagens svg", svg => svg.getBoundingClientRect().width);
        confere("celular: o gráfico cabe na tela", caixa <= larguras[1], caixa);
        await pagina.screenshot({ path: path.join(saida, "analise-fretes-celular.png"), fullPage: true });
        confere("celular: sem erros", erros.length === 0, erros);
        await contexto.close();
    }

    // ---------- muitos agendamentos: busca de 1000 em 1000 ----------
    {
        const { contexto, pagina, erros } = await abrir({ width: 1400, height: 900 }, [], { quantos: 2300 });
        await definirPeriodo(pagina, "2026-10-01", "2026-10-31");
        const faixas = await pagina.evaluate(() => window.__consultas.filter(item => item.tabela === "agendamentos").slice(-3).map(item => item.chamadas.find(chamada => chamada[0] === "range")));
        confere("busca em páginas de 1000 até acabar", (await pagina.innerText("#contagemAnalise")) === "2.300 agendamentos" && JSON.stringify(faixas) === JSON.stringify([["range", 0, 999], ["range", 1000, 1999], ["range", 2000, 2999]]), faixas);
        confere("muitos: sem erros", erros.length === 0, erros);
        await contexto.close();
    }

    // ---------- banco fora ----------
    {
        const { contexto, pagina, erros } = await abrir({ width: 1400, height: 900 }, [], { falha: true });
        await esperar(pagina, () => !carregandoAnalise);
        confere("falha no banco: avisa nas tabelas", (await pagina.innerText("#corpoTransportadorasAnalise")).includes("Não foi possível carregar os agendamentos"));
        confere("falha no banco: registra o erro para o admin", erros.some(texto => texto.includes("[analise-fretes] Falha ao carregar")), erros);
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
