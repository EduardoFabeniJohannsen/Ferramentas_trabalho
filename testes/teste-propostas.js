const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
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

    const abrirConfig = async () => { if(!(await pagina.isVisible("#formaPagamento"))) await pagina.click("[onclick='abrirConfiguracoes()']"); };
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
    await pagina.screenshot({ path: path.join(saida, "21-config-padrao.png") });
    await fecharConfig();
    await preencher();

    // ---------- padrão não muda ----------
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
    await pagina.click(".btn-limpar-tudo");
    await pagina.waitForTimeout(100);
    confere("limpar tudo não mexe na configuração", (await pagina.inputValue("#formaPagamento")) === "Boleto");
    confere("limpar tudo limpa o formulário", (await pagina.inputValue("#cidade")) === "");

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

    await usarTabela();
    await preencher();
    await pagina.fill(".descTotalSeguro", "5.000,00");
    confere("total com seguro preenche o valor desejado", (await pagina.inputValue(".descValorDesejado")) === "4.672,90", await pagina.inputValue(".descValorDesejado"));
    const resultadoSeguro = await pagina.innerText(".desconto-item-resultado");
    confere("total com seguro mostra o desconto e a conta", resultadoSeguro.includes("15.04%") && resultadoSeguro.includes("Locação R$ 4.672,90 + seguro R$ 327,10"), resultadoSeguro);
    let zap = await zapAtual();
    confere("Zap: total máquina + seguro bate com o digitado", linhaZap(zap, "Total máquina + seguro").endsWith("R$ 5.000,00*"), linhaZap(zap, "Total máquina + seguro"));
    confere("Zap: locação e seguro", linhaZap(zap, "Valor da locação").endsWith("R$ 4.672,90") && linhaZap(zap, "Seguro contra").endsWith("R$ 327,10"), [linhaZap(zap, "Valor da locação"), linhaZap(zap, "Seguro contra")]);

    await pagina.fill("#periodo", "60");
    confere("com 2 períodos divide o total", (await pagina.inputValue(".descValorDesejado")) === "2.336,45" && (await pagina.innerText(".desconto-item-resultado")).includes("(2 × R$ 2.336,45)"), await pagina.inputValue(".descValorDesejado"));
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
    confere("frete fora do total por padrão", (await pagina.innerText("#btnFreteNoTotal")).includes("Não") && (await desejado()) === "4.672,90" && !(await pagina.isVisible("#contaFreteTotal")));

    await pagina.click("#btnFreteNoTotal");
    confere("frete terceirizado: ida e volta sem bitributação", (await desejado()) === "3.738,32" && !(await pagina.isVisible("#btnBitributacaoDesconto")) && (await pagina.innerText("#contaFreteTotal")).includes("R$ 500,00 x 2 (ida e volta) = R$ 1.000,00"), [await desejado(), await pagina.innerText("#contaFreteTotal")]);
    confere("a conta do bloco mostra o frete", (await resultadoBloco()).includes("Locação R$ 3.738,32 + seguro R$ 261,68 + frete R$ 1.000,00"), await resultadoBloco());

    await pagina.evaluate(() => alternarLocacaoComplementar());
    confere("locação complementar com bitributação: frete x 2 + 20%", (await desejado()) === "3.551,40" && await pagina.isVisible("#btnBitributacaoDesconto") && (await pagina.innerText("#contaFreteTotal")).includes("+ 20% bitributação = R$ 1.200,00"), [await desejado(), await pagina.innerText("#contaFreteTotal")]);
    zap = await zapAtual();
    confere("Zap: total com frete +20% bate com o digitado", linhaZap(zap, "Total máquina + seguro").endsWith("R$ 5.000,00*") && linhaZap(zap, "Total máquina + seguro").includes("(+20%)"), linhaZap(zap, "Total máquina + seguro"));

    await pagina.click("#btnBitributacaoDesconto");
    confere("tirar a bitributação no card: frete x 2", (await desejado()) === "3.738,32" && (await pagina.innerText("#btnBitributacao")).includes("Desativada"), await desejado());
    zap = await zapAtual();
    confere("Zap: total com frete sem bitributação bate", linhaZap(zap, "Total máquina + seguro").endsWith("R$ 5.000,00*") && !linhaZap(zap, "Total máquina + seguro").includes("(+20%)"), linhaZap(zap, "Total máquina + seguro"));
    await pagina.screenshot({ path: path.join(saida, "24-propostas-frete-no-total.png") });

    // dois equipamentos: o frete sai só do primeiro que usa o total
    await pagina.click(".equipamento-linha .btn-add-equipamento");
    await pagina.locator(".equipamento-linha .equipamento").nth(1).fill("WTE12");
    await pagina.locator(".descTotalSeguro").nth(1).fill("3.000,00");
    confere("segundo equipamento sem o frete", (await desejado(0)) === "3.738,32" && (await desejado(1)) === "2.803,74" && (await resultadoBloco(1)).includes("Frete já entrou no total do WAE18"), [await desejado(0), await desejado(1)]);
    zap = await zapAtual();
    confere("Zap: valor final = soma dos totais digitados", linhaZap(zap, "Valor final da proposta").endsWith("R$ 8.000,00"), linhaZap(zap, "Valor final da proposta"));
    await pagina.locator(".descPercentual").nth(0).fill("10");
    confere("o primeiro sai do total: o frete passa para o segundo", (await desejado(1)) === "1.869,16" && !(await resultadoBloco(1)).includes("Frete já entrou"), await desejado(1));
    await pagina.locator(".descTotalSeguro").nth(0).fill("800");
    confere("total que não cobre o frete avisa", (await desejado(0)) === "" && (await resultadoBloco(0)).includes("não cobre o frete") && (await desejado(1)) === "2.803,74", [await desejado(0), await resultadoBloco(0)]);

    await pagina.click("#btnFreteNoTotal");
    confere("desligar volta ao total sem frete", (await desejado(0)) === "747,66" && !(await pagina.isVisible("#contaFreteTotal")) && !(await pagina.isVisible("#btnBitributacaoDesconto")), await desejado(0));
    await pagina.click("#btnFreteNoTotal");
    await pagina.waitForTimeout(100);
    await abrir();
    confere("recarregar mantém o frete no total", (await pagina.innerText("#btnFreteNoTotal")).includes("Sim") && await pagina.isVisible("#contaFreteTotal"));
    await usarTabela();
    confere("recarregado recalcula com o frete", (await desejado(0)) === "" && (await desejado(1)) === "2.803,74", [await desejado(0), await desejado(1)]);
    await pagina.evaluate(() => { alternarLocacaoComplementar(); alternarBitributacao(); });

    confere("sem erros no console", erros.length === 0, erros);

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exitCode = falhas ? 1 : 0;

})().catch(e => { console.error(e); process.exit(1); });
