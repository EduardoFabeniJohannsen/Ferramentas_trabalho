// O navegador pode bloquear o armazenamento local ou guardar algo corrompido: as
// páginas têm que abrir mesmo assim. E o que foi salvo tem que voltar ao reabrir.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..", "site");

const PAGINAS = ["index.html", "propostas.html", "agenda.html", "estoque.html", "tabelas.html", "transportadoras.html", "WEG.html", "leads.html"];

const CHAVES = [
    "agendaModo", "agendaOrdem", "agendaTema",
    "agendaColunas:u1", "agendaColunasVisiveis:u1", "agendaBotoes:u1", "agendaLarguras:u1", "agendaEtapas:u1", "agendaRascunhos",
    "leadsVendedor:u1", "estoqueFilial", "propostaCache", "cacheTabelaPrecos", "cacheTabelaFretes", "transportadorasUltima", "wegCache"
];

// o que já pode estar guardado num navegador
const CORROMPIDOS = ["{quebrado", "null", "5", "[]", "\"texto\"", "{}", "true", "{\"linhas\":5}"];

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

const clienteFalso = `
window.supabase = { createClient(){
    const consulta = () => {
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then") return (ok) => ok({ data: [], error: null, count: 0 });
                if(nome === "maybeSingle" || nome === "single") return async () => ({ data: null, error: null });
                return () => q;
            }
        });
        return q;
    };
    const sessao = { user: { id: "u1", email: "ana.silva@exemplo.com", app_metadata: { role: "admin" } } };
    return {
        from: consulta,
        rpc: async () => ({ data: [], error: null }),
        channel: () => ({ on(){ return this; }, subscribe(){ return this; }, track: async () => "ok", untrack: async () => "ok", send: async () => "ok", presenceState: () => ({}) }),
        auth: {
            getSession: async () => ({ data: { session: sessao }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }),
            signOut: async () => ({ error: null })
        },
        storage: { from: () => ({}) },
        functions: { invoke: async () => ({ data: null, error: null }) }
    };
}};`;

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

(async () => {

    const navegador = await chromium.launch({ channel: "chrome", headless: true });

    const novoContexto = async (preparar, argumento) => {

        const contexto = await navegador.newContext({ viewport: { width: 1300, height: 800 } });

        await contexto.route("**/*", (rota) => {
            const url = new URL(rota.request().url());
            if(url.pathname.endsWith("/vendor/supabase-2.45.0.js")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso });
            if(url.pathname.endsWith("/vendor/xlsx-0.18.5.full.min.js")) return rota.fulfill({ contentType: "text/javascript", body: "window.XLSX = {};" });
            if(url.hostname !== "site.test") return rota.abort();
            const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
            if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
            return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
        });

        if(preparar) await contexto.addInitScript(preparar, argumento);

        return contexto;
    };

    const abrir = async (contexto, arquivo) => {

        const pagina = await contexto.newPage();
        const erros = [];

        pagina.on("pageerror", e => erros.push(e.message));
        pagina.on("dialog", d => d.accept());

        await pagina.goto(`http://site.test/${arquivo}`);
        await pagina.waitForLoadState("networkidle");

        return { pagina, erros };
    };

    // ---------- navegador bloqueando o armazenamento ----------
    const bloqueado = await novoContexto(() => {
        const negar = { get(){ throw new DOMException("Bloqueado", "SecurityError"); } };
        Object.defineProperty(window, "localStorage", negar);
    });

    for(const arquivo of PAGINAS){

        const { pagina, erros } = await abrir(bloqueado, arquivo);

        confere(`bloqueado: ${arquivo} abre sem erro`, erros.length === 0, erros.length ? erros : undefined);

        await pagina.close();
    }

    // Limpar em Propostas precisa terminar mesmo sem conseguir apagar
    {
        const { pagina, erros } = await abrir(bloqueado, "propostas.html");

        await pagina.evaluate(() => limparTudo());
        await pagina.waitForTimeout(100);

        confere("bloqueado: Limpar termina e avisa", (await pagina.innerText("#toast")).includes("Tudo limpo") && erros.length === 0, erros.length ? erros : await pagina.innerText("#toast"));

        await pagina.close();
    }

    await bloqueado.close();

    // ---------- valor salvo corrompido ----------
    for(const valor of CORROMPIDOS){

        const contexto = await novoContexto(({ chaves, valor }) => {
            chaves.forEach(chave => localStorage.setItem(chave, valor));
        }, { chaves: CHAVES, valor });

        for(const arquivo of PAGINAS){

            const { pagina, erros } = await abrir(contexto, arquivo);

            confere(`salvo ${valor}: ${arquivo} abre sem erro`, erros.length === 0, erros.length ? erros : undefined);

            await pagina.close();
        }

        await contexto.close();
    }

    // ---------- o que foi salvo volta ao reabrir ----------
    const contexto = await novoContexto();

    const lerSalvo = (pagina, chave) => pagina.evaluate(c => localStorage.getItem(c), chave);

    {
        const { pagina } = await abrir(contexto, "agenda.html");

        await pagina.evaluate(() => definirModo("expedicao"));
        confere("agenda: grava o modo", (await lerSalvo(pagina, "agendaModo")) === "expedicao");

        await pagina.evaluate(() => definirOrdem(ORDENS[ORDENS.length - 1].valor));
        const ordem = await pagina.evaluate(() => ordemAgenda);
        confere("agenda: grava a ordem", (await lerSalvo(pagina, "agendaOrdem")) === ordem);

        await pagina.evaluate(() => alternarTema());
        confere("agenda: grava o tema", (await lerSalvo(pagina, "agendaTema")) === "claro");

        await pagina.reload();
        await pagina.waitForLoadState("networkidle");

        confere("agenda: volta o modo", (await pagina.evaluate(() => modoVisualizacao)) === "expedicao");
        confere("agenda: volta a ordem", (await pagina.evaluate(() => ordemAgenda)) === ordem);
        confere("agenda: volta o tema", await pagina.evaluate(() => document.body.classList.contains("tema-claro")));

        await pagina.close();
    }

    {
        const { pagina } = await abrir(contexto, "estoque.html");

        await pagina.evaluate(() => trocarFilial("JOINVILLE"));
        await pagina.waitForTimeout(50);
        confere("estoque: grava a filial", (await lerSalvo(pagina, "estoqueFilial")) === "JOINVILLE");

        await pagina.reload();
        await pagina.waitForLoadState("networkidle");
        confere("estoque: volta a filial", (await pagina.evaluate(() => filialAtual)) === "JOINVILLE");

        await pagina.close();
    }

    {
        const { pagina } = await abrir(contexto, "leads.html");

        await pagina.fill("#nomeVendedor", "Ana Vendas");
        confere("leads: grava o nome por usuário", (await lerSalvo(pagina, "leadsVendedor:u1")) === "Ana Vendas");

        await pagina.reload();
        await pagina.waitForLoadState("networkidle");
        confere("leads: volta o nome", (await pagina.inputValue("#nomeVendedor")) === "Ana Vendas");

        await pagina.close();
    }

    {
        const { pagina } = await abrir(contexto, "propostas.html");

        await pagina.fill("#nomeCliente", "Cliente Salvo");
        await pagina.evaluate(() => salvarCache());
        confere("propostas: grava a proposta", JSON.parse(await lerSalvo(pagina, "propostaCache")).nomeCliente === "Cliente Salvo");

        await pagina.reload();
        await pagina.waitForLoadState("networkidle");
        confere("propostas: volta a proposta", (await pagina.inputValue("#nomeCliente")) === "Cliente Salvo");

        await pagina.evaluate(() => limparTudo());
        await pagina.waitForTimeout(50);
        confere("propostas: Limpar apaga o que estava salvo", (await lerSalvo(pagina, "propostaCache")) === null);

        await pagina.close();
    }

    {
        const { pagina } = await abrir(contexto, "WEG.html");

        await pagina.fill("#dataInicio", "2026-10-31");
        await pagina.evaluate(() => salvarCacheWEG());
        confere("WEG: grava", JSON.parse(await lerSalvo(pagina, "wegCache")).dataInicio === "2026-10-31");

        await pagina.reload();
        await pagina.waitForLoadState("networkidle");
        confere("WEG: volta", (await pagina.inputValue("#dataInicio")) === "2026-10-31");

        // texto do e-mail: copia formatado (negrito no Outlook) e o texto simples junto
        await pagina.fill("#qtd-WME10", "1");
        await pagina.fill("#periodos", "4");
        const copiado = await pagina.evaluate(async () => {
            let itens = null;
            // o site de teste é http: o navegador não dá o clipboard nem o ClipboardItem
            window.ClipboardItem = window.ClipboardItem || class { constructor(dados){ this.dados = dados; } async getType(tipo){ return this.dados[tipo]; } };
            Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write: async (lista) => { itens = lista; } } });
            copiarParaEmail();
            await new Promise(pronto => setTimeout(pronto, 50));
            const ler = async (tipo) => (await itens[0].getType(tipo)).text();
            return { html: await ler("text/html"), texto: await ler("text/plain") };
        });
        confere("WEG e-mail: campos em negrito", copiado.html.includes("<b>Data da entrega:</b>") && copiado.html.includes("<b>CNPJ de faturamento:</b>"), copiado.html);
        confere("WEG e-mail: exemplo da data é o início da tela", copiado.html.includes("Exemplo: 31/10/2026") && copiado.texto.includes("Exemplo: 31/10/2026"), copiado.texto);
        confere("WEG e-mail: ciclo e máquina no texto", copiado.texto.includes("de 4 ciclos de 30 dias do Mastro Elétrico de 10 metros"), copiado.texto);
        confere("WEG e-mail: texto simples sem HTML", !/[<>]/.test(copiado.texto), copiado.texto);

        // como fica colado no e-mail
        await pagina.setContent(`<body style="background:#fff;padding:20px">${copiado.html}</body>`);
        await pagina.screenshot({ path: path.join(__dirname, "capturas", "weg-email.png") });

        await pagina.close();
    }

    await navegador.close();

    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exit(falhas ? 1 : 0);

})().catch(e => { console.error(e); process.exit(1); });
