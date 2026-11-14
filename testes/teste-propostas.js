const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..", "site");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });

const clienteFalso = `
window.supabase = { createClient(){
    const consulta = () => {
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then") return (ok) => ok({ data: [], error: null, count: 0 });
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
function recursoDaPagina(){ return "propostas"; }
function nomeArquivoAtual(){ return "propostas.html"; }`;

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

(async () => {

    const navegador = await chromium.launch({ channel: "chrome", headless: true });
    const contexto = await navegador.newContext({ viewport: { width: 1400, height: 900 } });
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
    pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_FAILED/.test(m.text())) erros.push(m.text()); });
    pagina.on("dialog", d => d.accept());

    const abrir = async () => {
        await pagina.goto("http://agenda.test/propostas.html");
        await pagina.waitForSelector("#formaPagamento", { state: "attached" });
        await pagina.waitForTimeout(150);
        await pagina.evaluate(() => {
            window.__copiado = null;
            Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t) => { window.__copiado = t; } } });
        });
    };

    const preencher = async () => {
        await pagina.fill(".equipamento-linha .equipamento", "WAE18");
        await pagina.fill("#periodo", "28");
        await pagina.fill("#cidade", "Brusque");
        await pagina.fill("#valorFrete", "500,00");
    };

    const abrirConfig = async () => { if(!(await pagina.isVisible("#formaPagamento"))) await pagina.click("[data-clique='abrirConfiguracoes']"); };
    const fecharConfig = async () => { if(await pagina.isVisible("#formaPagamento")) await pagina.click("#modalConfig .btn-fechar"); };
    const escolher = async (forma) => { await abrirConfig(); await pagina.selectOption("#formaPagamento", forma); };
    const prazo = async (valor) => { await abrirConfig(); await pagina.fill("#prazoPagamento", valor); };

    const mensagem = async () => {
        await pagina.evaluate(() => {
            window.__copiado = null;
            if(!document.querySelector(".desconto-item")) gerarTextos();
            document.querySelector(".desconto-item").dataset.valorFinal = "1000";
        });
        await fecharConfig();
        await pagina.click("button:has-text('Copiar Proposta Zap')");
        await pagina.waitForTimeout(60);
        const texto = await pagina.evaluate(() => window.__copiado);
        if(!texto) console.log("   toast:", await pagina.innerText("#toast"));
        return texto || "";
    };
    const linhaPagamento = (texto) => (texto.split("\n").find(l => l.includes("Forma de pagamento")) || "").trim();

    await pagina.goto("http://agenda.test/propostas.html");
    await pagina.evaluate(() => localStorage.clear());
    await abrir();

    confere("fora do formulário: escondido até abrir Configurações", !(await pagina.isVisible("#formaPagamento")));
    confere("nada de pagamento dentro do card", await pagina.locator(".card #formaPagamento").count() === 0);
    await abrirConfig();
    confere("está nas Configurações", await pagina.locator("#modalConfig #formaPagamento").isVisible());
    confere("prazo escondido de início", !(await pagina.isVisible("#prazoPagamento")));
    confere("aparelho novo começa no Cliente novo, com a dica da regra", (await pagina.inputValue("#formaPagamento")) === "Cliente novo" && await pagina.isVisible("#dicaClienteNovo"), await pagina.inputValue("#formaPagamento"));
    await pagina.screenshot({ path: path.join(saida, "21-config-padrao.png") });
    await fecharConfig();
    await preencher();

    // ---------- layout: PC em colunas, tela estreita um embaixo do outro ----------
    const caixas = () => pagina.evaluate(() => {
        const caixa = (seletor) => document.querySelector(seletor).getBoundingClientRect();
        const [t, d, r, f] = [caixa(".card-com-engrenagem"), caixa(".desconto-card"), caixa("#resumoProposta"), caixa("#painelFretes")];
        const fretesEmbaixoDoDesconto = Math.abs(f.left - d.left) < 2 && f.top >= d.bottom && f.top - d.bottom < 30;
        return {
            pc: r.left >= t.right && Math.abs(r.top - t.top) < 2 && d.left >= r.right && Math.abs(d.top - t.top) < 2 && fretesEmbaixoDoDesconto,
            meio: d.left >= t.right && Math.abs(d.top - t.top) < 2 && r.top >= t.bottom && Math.abs(r.left - t.left) < 2 && fretesEmbaixoDoDesconto,
            celular: d.top >= t.bottom && r.top >= d.bottom && f.top >= r.bottom && Math.abs(d.left - t.left) < 2 && Math.abs(r.left - t.left) < 2
        };
    });
    let layout = await caixas();
    confere("PC (1400px): textos | resumo | desconto, fretes embaixo do desconto", layout.pc, layout);
    await pagina.screenshot({ path: path.join(saida, "26-propostas-pc-colunas.png") });
    await pagina.setViewportSize({ width: 1000, height: 900 });
    layout = await caixas();
    confere("1000px: textos e resumo à esquerda, desconto e fretes à direita", layout.meio, layout);
    await pagina.setViewportSize({ width: 390, height: 900 });
    layout = await caixas();
    confere("390px: textos, desconto, resumo e fretes um embaixo do outro", layout.celular, layout);
    await pagina.setViewportSize({ width: 1400, height: 900 });

    // ---------- texto padrão (sem forma) não muda ----------
    await escolher("");
    let l = linhaPagamento(await mensagem());
    confere("padrão com emojis igual a antes", l.endsWith("Forma de pagamento: Mediante aprovação cadastral."), l);
    await pagina.evaluate(() => { emojisAtivo = false; });
    l = linhaPagamento(await mensagem());
    confere("padrão sem emojis igual a antes", l.endsWith("Forma de pagamento: 28 dias, mediante aprovação cadastral."), l);
    await pagina.evaluate(() => { emojisAtivo = true; });

    // ---------- boleto ----------
    await escolher("Boleto");
    confere("prazo aparece com 28", await pagina.isVisible("#prazoPagamento") && (await pagina.inputValue("#prazoPagamento")) === "28");
    await pagina.screenshot({ path: path.join(saida, "22-config-boleto.png") });
    l = linhaPagamento(await mensagem());
    confere("boleto", l.endsWith("Forma de pagamento: Boleto com emissão no dia seguinte à entrega do equipamento, mediante aprovação cadastral, prazo de 28 dias."), l);
    await pagina.screenshot({ path: path.join(saida, "20-propostas-boleto.png") });

    await prazo("45");
    l = linhaPagamento(await mensagem());
    confere("outro prazo", l.includes("prazo de 45 dias."), l);

    await prazo("28 e 56");
    l = linhaPagamento(await mensagem());
    confere("dois vencimentos", l.includes("prazo de 28/56 dias."), l);

    await prazo("");
    l = linhaPagamento(await mensagem());
    confere("sem prazo: não cita prazo", l.endsWith("mediante aprovação cadastral.") && !l.includes("prazo"), l);

    // ---------- depósito ----------
    await escolher("Depósito");
    confere("volta a sugerir 28", (await pagina.inputValue("#prazoPagamento")) === "28");
    await prazo("30");
    l = linhaPagamento(await mensagem());
    confere("depósito", l.endsWith("Forma de pagamento: Depósito com emissão no dia seguinte à entrega do equipamento, mediante aprovação cadastral, prazo de 30 dias."), l);

    // ---------- mesmo texto sem emojis ----------
    await pagina.evaluate(() => { emojisAtivo = false; });
    l = linhaPagamento(await mensagem());
    confere("sem emojis usa a escolha", l.endsWith("Forma de pagamento: Depósito com emissão no dia seguinte à entrega do equipamento, mediante aprovação cadastral, prazo de 30 dias."), l);
    await pagina.evaluate(() => { emojisAtivo = true; });

    // ---------- recarregar mantém ----------
    await pagina.waitForTimeout(100);
    await abrir();
    confere("recarregar mantém a forma", (await pagina.inputValue("#formaPagamento")) === "Depósito");
    await abrirConfig();
    confere("recarregar mantém o prazo", (await pagina.inputValue("#prazoPagamento")) === "30" && await pagina.isVisible("#prazoPagamento"));
    await pagina.selectOption("#formaPagamento", "Boleto");
    await abrir();
    confere("só trocar a forma já salva", (await pagina.inputValue("#formaPagamento")) === "Boleto");
    await escolher("Depósito");

    // ---------- trocar forma mantém o prazo digitado ----------
    await escolher("Boleto");
    confere("trocar a forma mantém o prazo", (await pagina.inputValue("#prazoPagamento")) === "30");

    // ---------- voltar ao padrão ----------
    await escolher("");
    confere("padrão esconde o prazo", !(await pagina.isVisible("#prazoPagamento")));
    await preencher();
    l = linhaPagamento(await mensagem());
    confere("padrão ignora o prazo escondido", l.endsWith("Forma de pagamento: Mediante aprovação cadastral."), l);

    // ---------- cliente novo (regra do financeiro: prazo pelo tamanho da locação) ----------
    await escolher("Cliente novo");
    confere("cliente novo: sem o campo de prazo, com o prazo da regra na dica", !(await pagina.isVisible("#prazoPagamento")) && (await pagina.innerText("#dicaClienteNovo")).startsWith("Prazo de 28 dias (locação de 28 dias). Na mensagem sai como Boleto."), await pagina.innerText("#dicaClienteNovo"));
    await pagina.screenshot({ path: path.join(saida, "21-config-cliente-novo.png") });
    l = linhaPagamento(await mensagem());
    confere("cliente novo sai como boleto, com o prazo da regra", l.endsWith("Forma de pagamento: Boleto com emissão no dia seguinte à entrega do equipamento, mediante aprovação cadastral, prazo de 28 dias."), l);
    const prazosRegra = [];
    for(const [dias, periodos] of [["1", ""], ["7", ""], ["8", ""], ["15", ""], ["16", ""], ["21", ""], ["22", ""], ["30", ""], ["60", ""], ["28", "3"], ["7", "2"]]){
        await pagina.fill("#periodo", dias);
        await pagina.fill("#periodos", periodos);
        prazosRegra.push(await pagina.evaluate(() => prazoPagamentoTexto()));
    }
    confere("cliente novo: até 7 dias = 6, até 15 = 14, até 21 = 20, até 30 e acima = 28 (conta os períodos)", prazosRegra.join() === "6,6,14,14,20,20,28,28,28,28,14", prazosRegra);
    await pagina.fill("#periodo", "15");
    await pagina.fill("#periodos", "");
    l = linhaPagamento(await mensagem());
    confere("cliente novo: locação de 15 dias = prazo de 14 na mensagem", l.endsWith("prazo de 14 dias."), l);
    await abrirConfig();
    confere("abrir o ⚙️ atualiza a dica com o período novo", (await pagina.innerText("#dicaClienteNovo")).startsWith("Prazo de 14 dias (locação de 15 dias)."), await pagina.innerText("#dicaClienteNovo"));
    await pagina.fill("#periodo", "");
    confere("cliente novo sem período: sem prazo", (await pagina.evaluate(() => prazoPagamentoTexto())) === "");
    await pagina.fill("#periodo", "28");
    await escolher("Boleto");
    confere("voltar ao boleto: o prazo digitado continua", (await pagina.inputValue("#prazoPagamento")) === "30" && await pagina.isVisible("#prazoPagamento") && !(await pagina.isVisible("#dicaClienteNovo")));
    await escolher("");

    // ---------- Cliente novo virou o padrão: o salvo de antes passa uma vez ----------
    await pagina.waitForTimeout(100);
    await pagina.evaluate(() => {
        const salvo = JSON.parse(localStorage.getItem("propostaCache"));
        salvo.formaPagamento = "Depósito";
        salvo.prazoPagamento = "45";
        delete salvo.pagamentoClienteNovoPadrao;
        localStorage.setItem("propostaCache", JSON.stringify(salvo));
    });
    await abrir();
    confere("escolha salva antes desta versão passa uma vez para Cliente novo, guardando o prazo", (await pagina.inputValue("#formaPagamento")) === "Cliente novo" && (await pagina.inputValue("#prazoPagamento")) === "45", [await pagina.inputValue("#formaPagamento"), await pagina.inputValue("#prazoPagamento")]);
    await escolher("Depósito");
    await pagina.waitForTimeout(100);
    await abrir();
    confere("depois disso vale a escolha de cada um", (await pagina.inputValue("#formaPagamento")) === "Depósito" && (await pagina.inputValue("#prazoPagamento")) === "45");
    await escolher("");
    await pagina.waitForTimeout(100);
    await abrir();
    confere("o texto padrão escolhido depois também fica", (await pagina.inputValue("#formaPagamento")) === "");

    // ---------- registro para o admin ----------
    await pagina.evaluate(() => {
        window.__registros = [];
        supabaseClient.from = (tabela) => ({ insert: async (linha) => { window.__registros.push({ tabela, linha }); return { error: null }; } });
    });
    await pagina.fill("#nomeCliente", "Cliente Teste");
    const copiado = await mensagem();
    let registros = await pagina.evaluate(() => window.__registros);
    const r = registros[0]?.linha || {};
    const equip = r.dados?.equipamentos?.[0] || {};
    confere("copiar registra uma vez", registros.length === 1 && registros[0].tabela === "propostas_copiadas", registros.length);
    confere("registro tem cliente, cidade e o texto copiado", r.cliente === "Cliente Teste" && r.cidade === "Brusque" && r.texto === copiado, { cliente: r.cliente, cidade: r.cidade });
    confere("registro tem o equipamento e os valores", equip.modelo === "WAE18" && equip.quantidade === 1 && equip.valorFinal === 1000 && equip.seguro === 70 && r.valor_total === 1070, equip);
    confere("registro tem período, frete e configurações", r.dados.diasTotal === 28 && r.dados.frete === 500 && r.dados.configuracoes.emojis === true && r.dados.configuracoes.locacaoComplementar === false && r.dados.cidadeSaida === "Itajaí", r.dados);
    confere("registro tem o aparelho", r.aparelho?.tipo === "computador" && !!r.aparelho.navegador, r.aparelho);
    confere("quem fez o banco preenche (não vai do navegador)", !("usuario_email" in r) && !("usuario_id" in r), Object.keys(r));
    await mensagem();
    registros = await pagina.evaluate(() => window.__registros);
    confere("copiar a mesma proposta de novo não repete o registro", registros.length === 1, registros.length);
    await pagina.fill("#nomeCliente", "Outro Cliente");
    await mensagem();
    registros = await pagina.evaluate(() => window.__registros);
    confere("outro cliente com o mesmo texto registra", registros.length === 2, registros.length);
    await pagina.evaluate(() => { supabaseClient.from = () => ({ insert: async () => { throw new Error("sem rede"); } }); });
    await pagina.fill("#nomeCliente", "Terceiro");
    const mesmoAssim = await mensagem();
    confere("falha ao registrar não impede a cópia", mesmoAssim.length > 0);
    erros.splice(0, erros.length, ...erros.filter(e => !e.includes("Falha ao registrar a Proposta Zap")));

    // ---------- limpar tudo ----------
    await escolher("Boleto");
    await fecharConfig();
    await pagina.selectOption("#freteBonificado", "entrega");
    await pagina.click(".btn-limpar-tudo");
    await pagina.waitForTimeout(100);
    confere("limpar tudo não mexe na configuração", (await pagina.inputValue("#formaPagamento")) === "Boleto");
    confere("limpar tudo limpa o formulário", (await pagina.inputValue("#cidade")) === "" && (await pagina.inputValue("#freteBonificado")) === "");

    // ---------- total com seguro ----------
    const usarTabela = () => pagina.evaluate(() => {
        tabelaPrecos = { WAE18: { "28": 5500, "30": 6000 }, WTE12: { "28": 3000, "30": 3200 } };
        erroTabelaPrecos = "";
        supabaseClient.from = () => ({ insert: async () => ({ error: null }) });
        gerarTextos();
    });
    const zapAtual = async () => {
        await pagina.evaluate(() => { window.__copiado = null; });
        await pagina.click("button:has-text('Copiar Proposta Zap')");
        await pagina.waitForTimeout(60);
        return (await pagina.evaluate(() => window.__copiado)) || "";
    };
    const linhaZap = (texto, trecho) => (texto.split("\n").find(l => l.includes(trecho)) || "").trim();

    // o tipo do Zap sai do código do modelo; TL é telescópica (WTLD41 era barrado como "fora do padrão")
    const modelos = await pagina.evaluate(() =>
        ["WTLD41", "WTLE20", "WTE12", "WTD15", "WAE18", "WAD26", "WME10", "WQ12", "WXE10", "WAE"]
            .map(modelo => [modelo, partesDoModeloZap(modelo)]));
    const textoModelo = (p) => p ? `${p.tipo} ${p.energia} ${p.altura}` : null;
    confere(
        "Zap: tipo pelo código do modelo (telescópica, tesoura, articulada, mastro)",
        JSON.stringify(modelos.map(([m, p]) => [m, textoModelo(p)])) === JSON.stringify([
            ["WTLD41", "Telescópica diesel 41"], ["WTLE20", "Telescópica elétrica 20"], ["WTE12", "Tesoura elétrica 12"],
            ["WTD15", "Tesoura diesel 15"], ["WAE18", "Articulada elétrica 18"], ["WAD26", "Articulada diesel 26"],
            ["WME10", "Mastro elétrica 10"], ["WQ12", null], ["WXE10", null], ["WAE", null]
        ]),
        modelos.map(([m, p]) => [m, textoModelo(p)])
    );

    // Resumo da proposta lido por seção: { periodo, vazio, eq: [...], frete, total },
    // cada seção com o título, as linhas { rótulo: valor } e as notas juntas
    const resumo = () => pagina.evaluate(() => {
        const limpar = (t) => (t || "").replace(/ /g, " ").trim();
        const secoes = Array.from(document.querySelectorAll("#conteudoResumo .resumo-secao")).map(secao => ({
            tipo: secao.classList.contains("resumo-frete") ? "frete" : secao.classList.contains("resumo-total") ? "total" : "eq",
            titulo: limpar(secao.querySelector(".resumo-titulo")?.innerText),
            linhas: Object.fromEntries(Array.from(secao.querySelectorAll(".resumo-linha")).map(l => [limpar(l.querySelector(".resumo-rotulo").innerText), limpar(l.querySelector(".resumo-valor").innerText)])),
            notas: Array.from(secao.querySelectorAll(".resumo-nota")).map(n => limpar(n.innerText)).join(" | "),
            descontoAlto: !!secao.querySelector(".resumo-desconto-alto")
        }));
        return {
            periodo: limpar(document.querySelector("#conteudoResumo .resumo-periodo")?.innerText),
            vazio: !!document.querySelector("#conteudoResumo .resumo-vazio"),
            eq: secoes.filter(s => s.tipo === "eq"),
            frete: secoes.find(s => s.tipo === "frete") || {},
            total: secoes.find(s => s.tipo === "total") || {}
        };
    });

    await usarTabela();
    await preencher();
    await pagina.fill(".descTotalSeguro", "5.000,00");
    confere("total com seguro preenche o valor desejado", (await pagina.inputValue(".descValorDesejado")) === "4.672,90", await pagina.inputValue(".descValorDesejado"));
    let rs = await resumo();
    confere("resumo: tabela, desconto, locação, seguro e máquina + seguro", rs.eq[0]?.titulo === "WAE18" && rs.eq[0].linhas["Tabela"] === "R$ 5.500,00" && rs.eq[0].linhas["Desconto"] === "R$ 827,10 (15,04%)" && rs.eq[0].linhas["Locação"] === "R$ 4.672,90" && rs.eq[0].linhas["Seguro (7%)"] === "R$ 327,10" && rs.eq[0].linhas["Máquina + seguro"] === "R$ 5.000,00", rs.eq[0]);
    confere("resumo: frete terceirizado fora do valor final", rs.frete.linhas?.["Entrega + retirada"] === "R$ 1.000,00" && rs.total.linhas["Valor final"] === "R$ 5.000,00" && rs.total.linhas["Com o frete terceirizado"] === "R$ 6.000,00", [rs.frete, rs.total]);
    confere("o bloco do desconto fica só com os campos", (await pagina.innerText(".desconto-item-resultado")) === "");
    let zap = await zapAtual();
    confere("Zap: total máquina + seguro bate com o digitado", linhaZap(zap, "Total máquina + seguro").endsWith("R$ 5.000,00*"), linhaZap(zap, "Total máquina + seguro"));
    confere("Zap: locação e seguro iguais aos do resumo", linhaZap(zap, "Valor da locação").endsWith("R$ 4.672,90") && linhaZap(zap, "Seguro contra").endsWith("R$ 327,10"), [linhaZap(zap, "Valor da locação"), linhaZap(zap, "Seguro contra")]);
    confere("Zap: frete terceirizado avisa o boleto de 14 dias da transportadora", zap.includes("(Nosso frete é terceirizado, sendo um boleto na entrega e outro na retirada, boleto com vencimento em 14 dias)"), linhaZap(zap, "terceirizado"));

    await pagina.fill("#periodo", "60");
    rs = await resumo();
    confere("com 2 períodos divide o total", (await pagina.inputValue(".descValorDesejado")) === "2.336,45" && rs.periodo === "60 dias (2 períodos de 30)" && rs.eq[0].linhas["Locação"] === "R$ 4.672,90" && rs.eq[0].linhas["Tabela"] === "R$ 12.000,00" && rs.eq[0].linhas["Máquina + seguro"] === "R$ 5.000,00", [await pagina.inputValue(".descValorDesejado"), rs.periodo, rs.eq[0]]);
    zap = await zapAtual();
    confere("Zap com 2 períodos continua no total digitado", linhaZap(zap, "Total máquina + seguro").endsWith("R$ 5.000,00*"), linhaZap(zap, "Total máquina + seguro"));

    await pagina.waitForTimeout(100);
    await abrir();
    confere("recarregar mantém o total com seguro", (await pagina.inputValue(".descTotalSeguro")) === "5.000,00");
    await usarTabela();
    confere("recarregado recalcula pelo total", (await pagina.inputValue(".descValorDesejado")) === "2.336,45", await pagina.inputValue(".descValorDesejado"));

    await pagina.fill(".descPercentual", "10");
    confere("digitar % limpa o total com seguro", (await pagina.inputValue(".descTotalSeguro")) === "" && (await pagina.inputValue(".descValorDesejado")) === "5.400,00");
    await pagina.fill(".descTotalSeguro", "6420");
    confere("digitar o total limpa o %", (await pagina.inputValue(".descPercentual")) === "" && (await pagina.inputValue(".descValorDesejado")) === "3.000,00", await pagina.inputValue(".descValorDesejado"));
    await pagina.screenshot({ path: path.join(saida, "23-propostas-total-seguro.png") });

    // ---------- frete no total com seguro ----------
    const desejado = (n = 0) => pagina.locator(".descValorDesejado").nth(n).inputValue();
    const resultadoBloco = (n = 0) => pagina.locator(".desconto-item-resultado").nth(n).innerText();
    await pagina.fill("#periodo", "28");
    await pagina.fill(".descTotalSeguro", "5.000,00");
    rs = await resumo();
    confere("frete fora do total por padrão", (await pagina.innerText("#btnFreteNoTotal")).includes("Não") && (await desejado()) === "4.672,90" && !rs.frete.notas.includes("Dentro do Total"), rs.frete);

    await pagina.click("#btnFreteNoTotal");
    rs = await resumo();
    confere("frete terceirizado: ida e volta sem bitributação", (await desejado()) === "3.738,32" && !(await pagina.isVisible("#btnBitributacaoDesconto")) && rs.frete.linhas["Entrega + retirada"] === "R$ 1.000,00" && rs.frete.notas.includes("Dentro do Total com seguro do WAE18"), [await desejado(), rs.frete]);
    confere("resumo com o frete dentro do total", rs.eq[0].linhas["Locação"] === "R$ 3.738,32" && rs.eq[0].linhas["Seguro (7%)"] === "R$ 261,68" && rs.total.linhas["Valor final"] === "R$ 4.000,00" && rs.total.linhas["Com o frete terceirizado"] === "R$ 5.000,00", [rs.eq[0], rs.total]);

    await pagina.evaluate(() => alternarLocacaoComplementar());
    rs = await resumo();
    confere("locação complementar com bitributação: frete x 2 + 20%", (await desejado()) === "3.551,40" && await pagina.isVisible("#btnBitributacaoDesconto") && rs.frete.linhas["Locação complementar"] === "R$ 1.200,00" && rs.frete.notas.includes("R$ 500,00 x 2 (ida e volta) + 20% bitributação") && rs.total.linhas["Valor final com frete"] === "R$ 5.000,00", [await desejado(), rs.frete, rs.total]);
    zap = await zapAtual();
    confere("Zap: total com frete +20% bate com o digitado", linhaZap(zap, "Total máquina + seguro").endsWith("R$ 5.000,00*") && linhaZap(zap, "Total máquina + seguro").includes("(+20%)"), linhaZap(zap, "Total máquina + seguro"));

    // 📋 do resumo: copia desconto e locação complementar no formato do Zoho
    const zoho = await pagina.evaluate(async () => {
        const copiados = [];
        for(const botao of document.querySelectorAll("#conteudoResumo .resumo-zoho")){
            window.__copiado = null;
            botao.click();
            await new Promise(r => setTimeout(r, 30));
            copiados.push([(botao.closest(".resumo-linha")?.querySelector(".resumo-rotulo").innerText || botao.closest(".resumo-nota").innerText).trim(), window.__copiado]);
        }
        return { copiados, toast: document.getElementById("toast").innerText };
    });
    const descontoTela = rs.eq[0].linhas["Desconto"] || "";
    const descontoZoho = descontoTela.replace(/^R\$ /, "").replace(/ \(.*$/, "").replace(/\./g, "").replace(",", ".");
    confere("📋 Zoho: só no desconto e na locação complementar", zoho.copiados.map(z => z[0]).join() === "Desconto,Locação complementar", zoho);
    confere("📋 Zoho: sem o ponto do milhar e com ponto nos centavos", /^\d+\.\d\d$/.test(descontoZoho) && zoho.copiados[0][1] === descontoZoho && zoho.copiados[1][1] === "1200.00" && zoho.toast.includes("1200.00 copiado"), [zoho, descontoTela]);
    confere("formato Zoho: milhões e centavos", (await pagina.evaluate(() => [formatarNumeroPonto(1234567.891), formatarNumeroPonto(0.5), formatarNumeroPonto(2160)].join())) === "1234567.89,0.50,2160.00");

    // botão "Frete ZOHO - Loc Complementar": a rota da entrega e da retirada
    const freteLocComp = async () => {
        await pagina.evaluate(() => { window.__copiado = null; });
        await pagina.click("button:has-text('Frete ZOHO - Loc Complementar')");
        await pagina.waitForTimeout(60);
        return pagina.evaluate(() => window.__copiado);
    };
    await pagina.fill("#cidade", " Brusque ");
    let locComp = await freteLocComp();
    confere("Frete ZOHO - Loc Complementar: entrega e retirada com as cidades", locComp === "- FRETE INCLUSO NO ITEM LOCAÇÃO COMPLEMENTAR - ENTREGA ( ITAJAÍ x BRUSQUE ) - RETIRADA ( BRUSQUE x ITAJAÍ )", locComp);
    await pagina.evaluate(() => { cidadeSaidaAtual = "JOINVILLE"; });
    locComp = await freteLocComp();
    confere("Frete ZOHO - Loc Complementar: sai da cidade de saída escolhida", locComp === "- FRETE INCLUSO NO ITEM LOCAÇÃO COMPLEMENTAR - ENTREGA ( JOINVILLE x BRUSQUE ) - RETIRADA ( BRUSQUE x JOINVILLE )", locComp);
    await pagina.evaluate(() => { cidadeSaidaAtual = "ITAJAI"; });
    await pagina.fill("#cidade", "");
    locComp = await freteLocComp();
    confere("Frete ZOHO - Loc Complementar: sem cidade não copia e avisa", locComp === null && (await pagina.innerText("#toast")).includes("Informe a cidade"), [locComp, await pagina.innerText("#toast")]);
    await pagina.fill("#cidade", "Brusque");

    // ---------- frete bonificado (a entrega ou a retirada de graça) ----------
    const freteZoho = async () => {
        await pagina.evaluate(() => { window.__copiado = null; gerarStatus("FreteZOHO"); });
        await pagina.waitForTimeout(60);
        return (await pagina.evaluate(() => window.__copiado)) || "";
    };
    const bordaBonificado = () => pagina.evaluate(() => getComputedStyle(document.getElementById("freteBonificado")).borderColor);
    const VERDE = "rgb(22, 163, 74)";
    confere("frete bonificado: nenhum por padrão, sem destaque", (await pagina.inputValue("#freteBonificado")) === "" && (await bordaBonificado()) !== VERDE, await bordaBonificado());
    await pagina.selectOption("#freteBonificado", "entrega");
    rs = await resumo();
    confere("entrega bonificada: locação complementar de um frete só", (await desejado()) === "4.112,15" && rs.frete.linhas["Locação complementar"] === "R$ 600,00" && rs.frete.notas.includes("R$ 500,00 x 1 (entrega bonificada) + 20% bitributação") && rs.total.linhas["Valor final com frete"] === "R$ 5.000,00", [await desejado(), rs.frete, rs.total]);
    confere("frete bonificado fica em verde", (await bordaBonificado()) === VERDE, await bordaBonificado());
    await pagina.screenshot({ path: path.join(saida, "28-propostas-frete-bonificado.png") });
    zap = await zapAtual();
    confere("Zap: entrega bonificada e a retirada com o valor", linhaZap(zap, "Frete entrega") === "🚚 Frete entrega: Bonificado de Itajai x Brusque" && linhaZap(zap, "Frete retirada") === "🚚 Frete retirada: R$ 500,00 de Brusque x Itajai" && linhaZap(zap, "Total máquina + seguro").endsWith("R$ 5.000,00*"), [linhaZap(zap, "Frete entrega"), linhaZap(zap, "Frete retirada"), linhaZap(zap, "Total máquina + seguro")]);
    locComp = await freteLocComp();
    confere("Frete ZOHO - Loc Complementar: entrega bonificada", locComp === "- FRETE INCLUSO NO ITEM LOCAÇÃO COMPLEMENTAR - ENTREGA BONIFICADA ( ITAJAÍ x BRUSQUE ) - RETIRADA ( BRUSQUE x ITAJAÍ )", locComp);
    let zohoFrete = await freteZoho();
    confere("Frete ZOHO: BONIFICADO no lugar do valor da entrega", zohoFrete.includes("- Frete entrega: BONIFICADO - ITAJAÍ x BRUSQUE\n- Frete retirada: R$ 500,00 - BRUSQUE x ITAJAÍ"), zohoFrete);

    await pagina.selectOption("#freteBonificado", "retirada");
    zap = await zapAtual();
    confere("Zap: retirada bonificada", linhaZap(zap, "Frete entrega") === "🚚 Frete entrega: R$ 500,00 de Itajai x Brusque" && linhaZap(zap, "Frete retirada") === "🚚 Frete retirada: Bonificado de Brusque x Itajai", [linhaZap(zap, "Frete entrega"), linhaZap(zap, "Frete retirada")]);
    locComp = await freteLocComp();
    confere("Frete ZOHO - Loc Complementar: retirada bonificada", locComp === "- FRETE INCLUSO NO ITEM LOCAÇÃO COMPLEMENTAR - ENTREGA ( ITAJAÍ x BRUSQUE ) - RETIRADA BONIFICADA ( BRUSQUE x ITAJAÍ )", locComp);
    zohoFrete = await freteZoho();
    confere("Frete ZOHO: retirada bonificada", zohoFrete.includes("- Frete entrega: R$ 500,00 - ITAJAÍ x BRUSQUE\n- Frete retirada: BONIFICADO - BRUSQUE x ITAJAÍ"), zohoFrete);

    // terceirizado: um boleto só
    await pagina.evaluate(() => alternarLocacaoComplementar());
    rs = await resumo();
    confere("terceirizado com a retirada bonificada: um frete no total e no resumo", (await desejado()) === "4.205,61" && rs.frete.linhas["Só a entrega"] === "R$ 500,00" && rs.frete.notas.includes("Retirada bonificada. Terceirizado: um boleto na entrega") && rs.total.linhas["Valor final"] === "R$ 4.500,00" && rs.total.linhas["Com o frete terceirizado"] === "R$ 5.000,00", [await desejado(), rs.frete, rs.total]);
    zap = await zapAtual();
    confere("Zap: terceirizado com um boleto só", zap.includes("(Nosso frete é terceirizado, sendo um boleto na entrega, boleto com vencimento em 14 dias)"), linhaZap(zap, "terceirizado"));

    // fica salvo (até trocar ou Limpar tudo)
    await pagina.waitForTimeout(100);
    confere("frete bonificado vai para o cache", (await pagina.evaluate(() => JSON.parse(localStorage.getItem("propostaCache")).freteBonificado)) === "retirada");
    await abrir();
    confere("recarregar mantém o frete bonificado", (await pagina.inputValue("#freteBonificado")) === "retirada" && (await bordaBonificado()) === VERDE, await bordaBonificado());
    await usarTabela();
    confere("recarregado recalcula com um frete só", (await desejado()) === "4.205,61", await desejado());
    await pagina.evaluate(() => alternarLocacaoComplementar());

    // as duas bonificadas: sem frete nenhum (nem precisa do valor)
    await pagina.selectOption("#freteBonificado", "ambas");
    rs = await resumo();
    confere("entrega e retirada bonificadas: nada de frete nas contas", (await desejado()) === "4.672,90" && rs.frete.linhas["Entrega e retirada"] === "Bonificadas" && !("Locação complementar" in rs.frete.linhas) && !rs.frete.notas.includes("Dentro do Total") && rs.total.linhas["Valor final"] === "R$ 5.000,00" && !("Com o frete terceirizado" in rs.total.linhas), [await desejado(), rs.frete, rs.total]);
    await pagina.fill("#valorFrete", "");
    zap = await zapAtual();
    confere("Zap: as duas bonificadas, sem o valor do frete e sem a observação", linhaZap(zap, "Frete entrega") === "🚚 Frete entrega: Bonificado de Itajai x Brusque" && linhaZap(zap, "Frete retirada") === "🚚 Frete retirada: Bonificado de Brusque x Itajai" && zap.includes("de Brusque x Itajai\n\n🎁 Cortesia") && !zap.includes("terceirizado") && !zap.includes("Locação Complementar") && linhaZap(zap, "Total máquina + seguro") === "💵 *Total máquina + seguro: R$ 5.000,00*", zap);
    const soBonificados = "- Frete entrega: BONIFICADO - ITAJAÍ x BRUSQUE\n- Frete retirada: BONIFICADO - BRUSQUE x ITAJAÍ";
    zohoFrete = await freteZoho();
    locComp = await freteLocComp();
    confere("Frete ZOHO e Loc Complementar: as duas bonificadas copiam só as duas linhas", zohoFrete === soBonificados && locComp === soBonificados, [zohoFrete, locComp]);
    await pagina.fill("#cidade", "");
    zohoFrete = await freteZoho();
    confere("Frete ZOHO com as duas bonificadas ainda pede a cidade", zohoFrete === "" && (await pagina.innerText("#toast")).includes("Informe a cidade"), [zohoFrete, await pagina.innerText("#toast")]);
    await pagina.fill("#cidade", "Brusque");
    await pagina.fill("#valorFrete", "500,00");

    await pagina.selectOption("#freteBonificado", "");
    rs = await resumo();
    confere("nenhum bonificado: volta ao frete x 2", (await desejado()) === "3.551,40" && rs.frete.notas.includes("R$ 500,00 x 2 (ida e volta) + 20% bitributação") && (await bordaBonificado()) !== VERDE, [await desejado(), rs.frete]);

    await pagina.click("#btnBitributacaoDesconto");
    rs = await resumo();
    confere("tirar a bitributação no card: frete x 2", (await desejado()) === "3.738,32" && (await pagina.innerText("#btnBitributacao")).includes("Desativada") && rs.frete.linhas["Locação complementar"] === "R$ 1.000,00" && !rs.frete.notas.includes("20%"), [await desejado(), rs.frete]);
    zap = await zapAtual();
    confere("Zap: total com frete sem bitributação bate", linhaZap(zap, "Total máquina + seguro").endsWith("R$ 5.000,00*") && !linhaZap(zap, "Total máquina + seguro").includes("(+20%)"), linhaZap(zap, "Total máquina + seguro"));
    await pagina.screenshot({ path: path.join(saida, "24-propostas-frete-no-total.png") });

    // dois equipamentos: o frete sai só do primeiro que usa o total
    await pagina.click(".equipamento-linha .btn-add-equipamento");
    await pagina.locator(".equipamento-linha .equipamento").nth(1).fill("WTE12");
    await pagina.locator(".descTotalSeguro").nth(1).fill("3.000,00");
    rs = await resumo();
    confere("segundo equipamento sem o frete", (await desejado(0)) === "3.738,32" && (await desejado(1)) === "2.803,74" && rs.frete.notas.includes("Dentro do Total com seguro do WAE18") && rs.total.linhas["Valor final com frete"] === "R$ 8.000,00", [await desejado(0), await desejado(1), rs.total]);
    zap = await zapAtual();
    confere("Zap: valor final = soma dos totais digitados", linhaZap(zap, "Valor final da proposta").endsWith("R$ 8.000,00"), linhaZap(zap, "Valor final da proposta"));
    await pagina.locator(".descPercentual").nth(0).fill("10");
    rs = await resumo();
    confere("o primeiro sai do total: o frete passa para o segundo", (await desejado(1)) === "1.869,16" && rs.frete.notas.includes("Dentro do Total com seguro do WTE12"), [await desejado(1), rs.frete]);
    await pagina.locator(".descTotalSeguro").nth(0).fill("800");
    rs = await resumo();
    confere("total que não cobre o frete avisa no bloco e no resumo", (await desejado(0)) === "" && (await resultadoBloco(0)).includes("não cobre o frete") && (await desejado(1)) === "2.803,74" && rs.eq[0].notas.includes("Confira o valor") && rs.total.notas.includes("Falta o valor"), [await desejado(0), await resultadoBloco(0), rs.total]);

    await pagina.click("#btnFreteNoTotal");
    confere("desligar volta ao total sem frete", (await desejado(0)) === "747,66" && !(await pagina.isVisible("#btnBitributacaoDesconto")), await desejado(0));
    await pagina.click("#btnFreteNoTotal");
    await pagina.waitForTimeout(100);
    await abrir();
    confere("recarregar mantém o frete no total", (await pagina.innerText("#btnFreteNoTotal")).includes("Sim"));
    await usarTabela();
    confere("recarregado recalcula com o frete", (await desejado(0)) === "" && (await desejado(1)) === "2.803,74", [await desejado(0), await desejado(1)]);
    await pagina.evaluate(() => { alternarLocacaoComplementar(); alternarBitributacao(); });

    // ---------- diária (no resumo) ----------
    await pagina.click("#btnFreteNoTotal");
    await pagina.locator(".descTotalSeguro").nth(0).fill("");
    await pagina.locator(".descTotalSeguro").nth(1).fill("");
    rs = await resumo();
    confere("diária sem desconto, com o seguro ao lado", rs.eq[0].linhas["📅 Diária"] === "R$ 196,43" && rs.eq[0].notas.includes("com seguro R$ 210,18") && !rs.eq[0].notas.includes("tabela") && !("Tabela" in rs.eq[0].linhas), rs.eq[0]);
    await pagina.locator(".descPercentual").nth(0).fill("10");
    rs = await resumo();
    confere("com desconto mostra a diária de tabela", rs.eq[0].linhas["📅 Diária"] === "R$ 176,79" && rs.eq[0].notas.includes("tabela R$ 196,43") && rs.eq[0].linhas["Desconto"] === "R$ 550,00 (10,00%)", rs.eq[0]);
    confere("10% de desconto não fica vermelho", !rs.eq[0].descontoAlto && !rs.eq[0].notas.includes("acima de 20%"), rs.eq[0]);
    await pagina.locator(".descPercentual").nth(0).fill("20");
    rs = await resumo();
    confere("20% certinho não fica vermelho", !rs.eq[0].descontoAlto, rs.eq[0]);
    await pagina.locator(".descPercentual").nth(0).fill("20,5");
    rs = await resumo();
    const corDesconto = await pagina.evaluate(() => getComputedStyle(document.querySelector(".resumo-desconto-alto .resumo-valor")).color);
    confere("acima de 20%: desconto em vermelho com destaque e aviso", rs.eq[0].descontoAlto && rs.eq[0].linhas["Desconto"] === "R$ 1.127,50 (20,50%)" && rs.eq[0].notas.includes("⚠️ Desconto acima de 20%") && corDesconto === "rgb(248, 113, 113)", [rs.eq[0], corDesconto]);
    await pagina.locator(".desconto-card").scrollIntoViewIfNeeded();
    await pagina.screenshot({ path: path.join(saida, "27-propostas-desconto-alto.png") });
    await pagina.locator(".descPercentual").nth(0).fill("10");
    await pagina.locator(".quantidadeEquipamento").nth(1).fill("2");
    rs = await resumo();
    confere("quantidade: diária da linha e por máquina", rs.eq[1]?.titulo === "2x WTE12" && rs.eq[1].linhas["📅 Diária"] === "R$ 214,29" && rs.eq[1].notas.includes("R$ 107,14 por máquina"), rs.eq[1]);
    confere("com 2 equipamentos mostra a diária da proposta", rs.total.linhas["📅 Diária da proposta"] === "R$ 391,07" && rs.total.notas.includes("com seguro R$ 418,45"), rs.total);
    await pagina.screenshot({ path: path.join(saida, "25-propostas-resumo.png"), fullPage: true });
    // acréscimo: no Zoho entra como desconto negativo; o por máquina já sai no formato de lá
    const numeroTela = (texto) => Number(String(texto).replace(/^R\$ /, "").replace(/ \(.*$/, "").replace(/\./g, "").replace(",", "."));
    await pagina.locator(".quantidadeEquipamento").nth(0).fill("2");
    rs = await resumo();
    await pagina.locator(".descValorDesejado").nth(0).fill(String(Math.round(numeroTela(rs.eq[0].linhas["Tabela"]) * 1.3)));
    rs = await resumo();
    const acrescimo = numeroTela(rs.eq[0].linhas["Acréscimo"] || "0");
    const porMaquina = "-" + (acrescimo / 2).toFixed(2);
    const zohoAcrescimo = await pagina.evaluate(async () => {
        const secao = document.querySelectorAll("#conteudoResumo .resumo-secao")[0];
        const copiados = [];
        for(const botao of secao.querySelectorAll(".resumo-zoho")){
            window.__copiado = null;
            botao.click();
            await new Promise(r => setTimeout(r, 30));
            copiados.push(window.__copiado);
        }
        return copiados;
    });
    confere("acréscimo por máquina no formato do Zoho, com menos", acrescimo > 0 && rs.eq[0].notas.includes(`${porMaquina} por máquina`), [porMaquina, rs.eq[0]]);
    confere("📋 do acréscimo copia negativo (total e por máquina)", zohoAcrescimo.join() === [(-acrescimo).toFixed(2), porMaquina].join(), zohoAcrescimo);
    await pagina.locator("#conteudoResumo .resumo-secao").nth(0).screenshot({ path: path.join(saida, "25b-propostas-acrescimo-por-maquina.png") });
    // volta como estava: os testes seguintes usam o primeiro com 1 máquina e 10%
    await pagina.locator(".quantidadeEquipamento").nth(0).fill("1");
    await pagina.locator(".descPercentual").nth(0).fill("10");

    await pagina.fill("#periodo", "60");
    rs = await resumo();
    confere("60 dias: diária pelo total de dias", rs.eq[0].linhas["📅 Diária"] === "R$ 180,00" && rs.periodo === "60 dias (2 períodos de 30)" && rs.eq[0].notas.includes("tabela R$ 200,00"), [rs.periodo, rs.eq[0]]);
    await pagina.evaluate(() => { valorDiariaAtivo = true; });
    zap = await zapAtual();
    confere("a Proposta Zap mostra a mesma diária", linhaZap(zap, "Valor da locação").includes("( Diária = R$ 180,00 )"), linhaZap(zap, "Valor da locação"));
    await pagina.evaluate(() => { valorDiariaAtivo = false; });

    await pagina.fill("#periodo", "45");
    confere("período inválido: resumo pede para preencher", (await resumo()).vazio);
    await pagina.fill("#periodo", "28");
    await pagina.locator(".equipamento-linha .btn-remover-equipamento").nth(1).click();
    rs = await resumo();
    confere("um equipamento: sem a diária da proposta", rs.eq.length === 1 && !("📅 Diária da proposta" in rs.total.linhas), rs.total);
    await pagina.click(".btn-limpar-tudo");
    await pagina.waitForTimeout(100);
    confere("limpar tudo esvazia o resumo", (await resumo()).vazio);

    confere("sem erros no console", erros.length === 0, erros);

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exitCode = falhas ? 1 : 0;

})().catch(e => { console.error(e); process.exit(1); });
