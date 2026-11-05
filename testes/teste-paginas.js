// Abre todas as páginas com o auth-guard real e o banco simulado. É a rede de
// segurança das reorganizações: arquivo que mudou de lugar, script fora de ordem,
// função que sumiu ou página que aparece antes de conferir o login.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");

// página -> acesso exigido por ela (o mesmo nome usado no auth-guard.js)
const PAGINAS = {
    "index.html": "index",
    "propostas.html": "propostas",
    "agenda.html": "agenda",
    "estoque.html": "estoque",
    "tabelas.html": "tabelas",
    "transportadoras.html": "transportadoras",
    "WEG.html": "weg",
    "admin.html": "admin",
    "propostas-copiadas.html": "propostas-copiadas",
    "leads.html": "leads"
};

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

// usuario: null = sem login; acessos e ativo vêm da tabela "perfis" simulada
const clienteFalso = (usuario) => `
window.supabase = { createClient(){
    const usuario = ${JSON.stringify(usuario)};
    const consulta = (tabela) => {
        let umaLinha = false;
        const perfil = usuario && { acessos: usuario.acessos || [], filiais: [], ativo: usuario.ativo !== false };
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then") return (ok) => ok({
                    data: tabela === "perfis" && umaLinha ? perfil : (umaLinha ? null : []),
                    error: null,
                    count: 0
                });
                if(nome === "maybeSingle" || nome === "single") return () => { umaLinha = true; return q; };
                return () => q;
            }
        });
        return q;
    };
    const canal = () => ({
        on(){ return this; },
        subscribe(aviso){ if(aviso) aviso("SUBSCRIBED"); return this; },
        track: async () => "ok",
        untrack: async () => "ok",
        send: async () => "ok",
        unsubscribe: async () => "ok",
        presenceState: () => ({})
    });
    const sessao = () => ({
        data: {
            session: usuario && !localStorage.getItem("__saiu") && {
                user: { id: "u1", email: "teste@exemplo.com", app_metadata: usuario.admin ? { role: "admin" } : {} }
            }
        },
        error: null
    });
    return {
        from: consulta,
        rpc: async () => ({ data: [], error: null }),
        channel: canal,
        removeChannel: async () => "ok",
        auth: {
            getSession: async () => sessao(),
            getUser: async () => ({ data: { user: sessao().data.session?.user || null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }),
            signOut: async () => { localStorage.setItem("__saiu", "1"); return { error: null }; }
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

    // ---------- organização dos arquivos ----------
    const paginasDoScript = {};

    for(const arquivo of [...Object.keys(PAGINAS), "login.html"]){
        const html = fs.readFileSync(path.join(raiz, arquivo), "utf8");
        for(const achou of html.matchAll(/src="(js\/[^"]+)"/g)){
            (paginasDoScript[achou[1]] = paginasDoScript[achou[1]] || []).push(arquivo);
        }
    }

    const scriptsNoDisco = fs.readdirSync(path.join(raiz, "js"), { recursive: true })
        .filter(nome => nome.endsWith(".js"))
        .map(nome => "js/" + nome.split(path.sep).join("/"));

    const semUso = scriptsNoDisco.filter(script => !paginasDoScript[script]);
    confere("todo script é carregado por alguma página", semUso.length === 0, semUso.length ? semUso : undefined);

    // js/agenda/ só na agenda; quem é usado por mais de uma página fica direto em js/
    const foraDoLugar = Object.entries(paginasDoScript).filter(([script, paginas]) => {
        const pasta = script.split("/").length > 2 ? script.split("/")[1] : null;
        return pasta
            ? !(paginas.length === 1 && paginas[0].toLowerCase() === `${pasta}.html`)
            : paginas.length === 1;
    }).map(([script]) => script);
    confere("cada script está na pasta certa", foraDoLugar.length === 0, foraDoLugar.length ? foraDoLugar : undefined);

    const navegador = await chromium.launch({ channel: "chrome", headless: true });

    const novoContexto = async (usuario) => {

        const contexto = await navegador.newContext({ viewport: { width: 1300, height: 700 } });
        const sumiram = [];

        await contexto.route("**/*", (rota) => {
            const url = new URL(rota.request().url());
            if(url.hostname.includes("jsdelivr")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso(usuario) });
            if(url.hostname.includes("cdnjs")) return rota.fulfill({ contentType: "text/javascript", body: "window.XLSX = {};" });
            if(url.hostname !== "site.test") return rota.abort();
            const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
            if(!fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()){
                sumiram.push(url.pathname);
                return rota.fulfill({ status: 404, body: "" });
            }
            return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
        });

        return { contexto, sumiram };
    };

    // abre e devolve a página já parada, com tudo o que deu errado no caminho
    const abrir = async (contexto, arquivo) => {

        const pagina = await contexto.newPage();
        const erros = [];

        pagina.on("pageerror", e => erros.push(e.message));
        pagina.on("console", m => {
            if(m.type() === "error" && !/Failed to load resource/.test(m.text())) erros.push(m.text());
        });
        pagina.on("dialog", d => d.accept());

        await pagina.goto(`http://site.test/${arquivo}`);
        await pagina.waitForLoadState("networkidle");

        return { pagina, erros };
    };

    // ---------- admin: toda página abre inteira ----------
    const admin = await novoContexto({ admin: true });

    for(const arquivo of Object.keys(PAGINAS)){

        const { pagina, erros } = await abrir(admin.contexto, arquivo);
        const sumiramAqui = admin.sumiram.splice(0).filter(item => item !== "/favicon.ico");

        confere(`${arquivo}: sem erro ao abrir`, erros.length === 0, erros.length ? erros : undefined);
        confere(`${arquivo}: todos os arquivos existem`, sumiramAqui.length === 0, sumiramAqui.length ? sumiramAqui : undefined);
        confere(`${arquivo}: fica visível`, (await pagina.evaluate(() => document.documentElement.style.visibility)) === "");

        const resumo = await pagina.evaluate(() => {

            // onclick="abrirX()": a função precisa existir (roda no escopo global,
            // que enxerga const e let dos scripts)
            const chamadas = new Set();

            document.querySelectorAll("*").forEach(elemento => {
                for(const atributo of elemento.attributes){
                    if(!/^on/.test(atributo.name)) continue;
                    const achou = atributo.value.match(/^\s*(?:return\s+)?([A-Za-z_$][\w$]*)\s*\(/);
                    if(achou && !["if", "return"].includes(achou[1])) chamadas.add(achou[1]);
                }
            });

            return {
                semFuncao: [...chamadas].filter(nome => new Function(`return typeof ${nome}`)() !== "function"),
                versao: document.querySelector(".versao")?.innerText,
                versaoCerta: "v" + new Function("return VERSAO_SISTEMA")(),
                links: [...document.querySelectorAll(".topbar a[href]")].map(link => link.getAttribute("href")),
                // a topbar é fixa: o conteúdo precisa começar abaixo dela (--altura-topbar, menu.js)
                topbarCobre: (() => {
                    const topbar = document.querySelector(".topbar");
                    const container = document.querySelector(".container");
                    if(!topbar || !container) return false;
                    return parseFloat(getComputedStyle(container).paddingTop) < topbar.offsetHeight;
                })(),
                scripts: [...document.scripts].map(script => script.getAttribute("src")).filter(Boolean)
            };
        });

        confere(`${arquivo}: botões chamam funções que existem`, resumo.semFuncao.length === 0, resumo.semFuncao.length ? resumo.semFuncao : undefined);
        confere(`${arquivo}: mostra a versão`, resumo.versao === resumo.versaoCerta, resumo.versao);

        confere(`${arquivo}: a topbar não cobre o conteúdo`, !resumo.topbarCobre);

        const linksQuebrados = resumo.links.filter(link => !fs.existsSync(path.join(raiz, link.split(/[?#]/)[0])));
        confere(`${arquivo}: menu montado e sem link quebrado`, resumo.links.length > 0 && linksQuebrados.length === 0, linksQuebrados.length ? linksQuebrados : undefined);

        const repetidos = resumo.scripts.filter((src, i) => resumo.scripts.indexOf(src) !== i);
        confere(`${arquivo}: nenhum script carregado duas vezes`, repetidos.length === 0, repetidos.length ? repetidos : undefined);

        // a atualização automática das abas abertas depende deste endereço
        confere(`${arquivo}: usa js/helpers.js`, resumo.scripts.includes("js/helpers.js"), resumo.scripts.length);

        await pagina.close();
    }

    await admin.contexto.close();

    // ---------- sem login: nenhuma página aparece ----------
    const visitante = await novoContexto(null);

    const login = await abrir(visitante.contexto, "login.html");
    confere("login.html: abre sem erro", login.erros.length === 0, login.erros.length ? login.erros : undefined);
    confere("login.html: formulário visível", await login.pagina.locator("input").first().isVisible());
    await login.pagina.close();

    for(const arquivo of Object.keys(PAGINAS)){

        const pagina = await visitante.contexto.newPage();

        // visibilidade quando o HTML terminou de carregar: a página precisa estar
        // escondida até o login ser conferido
        let apareceu = null;

        await pagina.exposeFunction("__anotar", valor => { if(apareceu === null) apareceu = valor; });
        await pagina.addInitScript(() => {
            document.addEventListener("DOMContentLoaded", () => {
                if(!location.pathname.endsWith("login.html")) window.__anotar(document.documentElement.style.visibility);
            });
        });

        await pagina.goto(`http://site.test/${arquivo}`);
        await pagina.waitForURL("**/login.html", { timeout: 5000 }).catch(() => {});

        confere(`${arquivo}: sem login vai para o login`, pagina.url().endsWith("/login.html"), pagina.url());
        confere(`${arquivo}: sem login fica escondida`, apareceu === "hidden" || apareceu === null, apareceu);

        await pagina.close();
    }

    await visitante.contexto.close();

    // ---------- sem acesso: vai para uma página liberada ----------
    const vendedor = await novoContexto({ acessos: ["propostas"] });

    for(const arquivo of Object.keys(PAGINAS).filter(nome => nome !== "propostas.html")){

        const pagina = await vendedor.contexto.newPage();

        pagina.on("dialog", d => d.accept());

        await pagina.goto(`http://site.test/${arquivo}`);
        await pagina.waitForURL("**/propostas.html", { timeout: 5000 }).catch(() => {});

        confere(`${arquivo}: sem acesso vai para propostas`, pagina.url().endsWith("/propostas.html"), pagina.url());

        await pagina.close();
    }

    await vendedor.contexto.close();

    // ---------- acesso marcado no Admin ----------
    // propostas-copiadas abre com o acesso dela; o Admin continua só de admin
    const comAcessoMarcado = await novoContexto({ acessos: ["propostas", "admin", "propostas-copiadas"] });

    {
        const pagina = await comAcessoMarcado.contexto.newPage();

        pagina.on("dialog", d => d.accept());

        await pagina.goto("http://site.test/admin.html");
        await pagina.waitForURL("**/propostas.html", { timeout: 5000 }).catch(() => {});

        confere("admin.html: só admin, mesmo com \"admin\" marcado", pagina.url().endsWith("/propostas.html"), pagina.url());

        // na página de propostas o link aparece (comAcesso) e o do Admin não
        await pagina.waitForFunction(() => document.querySelector('.topbar a[href="propostas-copiadas.html"]')?.style.display === "", null, { timeout: 5000 }).catch(() => {});
        const links = await pagina.$$eval(".topbar a", l => l.filter(a => a.style.display !== "none").map(a => a.getAttribute("href")));
        confere("com o acesso, o link 📊 Propostas Zap aparece no menu", links.includes("propostas-copiadas.html") && !links.includes("admin.html"), links);

        await pagina.close();
    }

    {
        const { pagina, erros } = await abrir(comAcessoMarcado.contexto, "propostas-copiadas.html");

        confere("propostas-copiadas.html: abre com o acesso marcado", pagina.url().endsWith("/propostas-copiadas.html") && erros.length === 0, erros.length ? erros : pagina.url());

        await pagina.close();
    }

    await comAcessoMarcado.contexto.close();

    // ---------- usuário desativado ----------
    const desativado = await novoContexto({ acessos: ["propostas"], ativo: false });
    const bloqueada = await desativado.contexto.newPage();
    let avisoBloqueio = "";

    bloqueada.on("dialog", d => { avisoBloqueio = d.message(); d.accept(); });

    await bloqueada.goto("http://site.test/propostas.html");
    await bloqueada.waitForURL("**/login.html", { timeout: 5000 }).catch(() => {});

    confere("usuário desativado sai do sistema", bloqueada.url().endsWith("/login.html") && avisoBloqueio.includes("desativado"), avisoBloqueio);

    await navegador.close();

    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exit(falhas ? 1 : 0);

})().catch(e => { console.error(e); process.exit(1); });
