// Abre todas as páginas com o auth-guard real e o banco simulado. É a rede de
// segurança das reorganizações: arquivo que mudou de lugar, script fora de ordem,
// função que sumiu ou página que aparece antes de conferir o login.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..", "site");

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
window.supabase = { createClient(url, chave, opcoes){
    const usuario = ${JSON.stringify(usuario)};
    window.__opcoesCliente = opcoes;
    // usuario.tabelas: dados por tabela (lista, ou objeto no maybeSingle)
    const tabelas = (usuario && usuario.tabelas) || {};
    const consulta = (tabela) => {
        let umaLinha = false;
        const perfil = usuario && { acessos: usuario.acessos || [], filiais: [], ativo: usuario.ativo !== false };
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then") return (ok) => ok({
                    data: tabela === "perfis" && umaLinha ? perfil : (tabela in tabelas ? tabelas[tabela] : (umaLinha ? null : [])),
                    error: null,
                    count: 0
                });
                if(nome === "maybeSingle" || nome === "single") return () => { umaLinha = true; return q; };
                return (...args) => { (window.__chamadas = window.__chamadas || []).push([tabela, nome, args]); return q; };
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
        // registrar_dispositivo: a situação do aparelho (usuario.dispositivo; sem nada = liberado)
        rpc: async (nome, args) => {
            (window.__rpcs = window.__rpcs || []).push([nome, args]);
            if(nome === "registrar_dispositivo") return { data: (usuario && usuario.dispositivo) || "liberado", error: null };
            return { data: [], error: null };
        },
        channel: canal,
        removeChannel: async () => "ok",
        auth: {
            getSession: async () => sessao(),
            getUser: async () => ({ data: { user: sessao().data.session?.user || null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }),
            // login: guarda o que foi enviado e recusa (a página fica no login)
            signInWithPassword: async (dados) => { (window.__logins = window.__logins || []).push(dados); return { data: {}, error: { status: 400, message: "Invalid login credentials" } }; },
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

    // ---------- segurança: política de conteúdo (CSP) ----------
    // Todas as páginas com a mesma CSP, logo no começo do <head>; só scripts
    // do próprio site (js/...), nenhum <script> com código dentro e nenhum CDN.
    const cspDe = (html) => (html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/) || [])[1];
    const cspPadrao = cspDe(fs.readFileSync(path.join(raiz, "index.html"), "utf8"));

    // login: a padrão + a Cloudflare do captcha (login-captcha.js), só nesta página
    const CLOUDFLARE = "https://challenges.cloudflare.com";
    const cspLogin = (cspPadrao || "")
        .replace("script-src 'self';", `script-src 'self' ${CLOUDFLARE};`)
        .replace("https://get.geojs.io;", `https://get.geojs.io ${CLOUDFLARE}; frame-src ${CLOUDFLARE};`);

    confere("CSP: só scripts do próprio site", /(^|; )script-src 'self'(;|$)/.test(cspPadrao || ""), cspPadrao);
    confere("CSP: dados só para o Supabase do projeto", /connect-src 'self' https:\/\/qhneylwmrzuesaloqetr\.supabase\.co wss:\/\/qhneylwmrzuesaloqetr\.supabase\.co https:\/\/get\.geojs\.io;/.test(cspPadrao || ""), cspPadrao);

    for(const arquivo of [...Object.keys(PAGINAS), "login.html"]){
        const html = fs.readFileSync(path.join(raiz, arquivo), "utf8");
        for(const achou of html.matchAll(/src="(js\/[^"]+)"/g)){
            (paginasDoScript[achou[1]] = paginasDoScript[achou[1]] || []).push(arquivo);
        }
        const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map(achou => achou[1]);
        confere(`${arquivo}: tem a CSP padrão`, cspDe(html) === (arquivo === "login.html" ? cspLogin : cspPadrao), cspDe(html));
        confere(`${arquivo}: a CSP vem antes de qualquer script`, html.indexOf("Content-Security-Policy") < html.indexOf("<script"));
        confere(`${arquivo}: nenhum <script> com código dentro`, scripts.every(atributos => /\bsrc="/.test(atributos)));
        confere(`${arquivo}: nenhum script de fora (CDN)`, scripts.every(atributos => /\bsrc="js\//.test(atributos)), scripts.filter(atributos => !/\bsrc="js\//.test(atributos)));
    }

    // a biblioteca do Supabase fica no site: tem que ser a do pacote (mesma versão do package.json)
    const pacote = path.resolve(__dirname, "..", "node_modules", "@supabase", "supabase-js");
    const versaoPacote = require(path.join(pacote, "package.json")).version;
    const copiaSite = path.join(raiz, "js", "vendor", `supabase-${versaoPacote}.js`);
    confere(
        "js/vendor: Supabase igual ao do pacote",
        fs.existsSync(copiaSite) && fs.readFileSync(copiaSite).equals(fs.readFileSync(path.join(pacote, "dist", "umd", "supabase.js"))),
        versaoPacote
    );

    const scriptsNoDisco = fs.readdirSync(path.join(raiz, "js"), { recursive: true })
        .filter(nome => nome.endsWith(".js"))
        .map(nome => "js/" + nome.split(path.sep).join("/"));

    const semUso = scriptsNoDisco.filter(script => !paginasDoScript[script]);
    confere("todo script é carregado por alguma página", semUso.length === 0, semUso.length ? semUso : undefined);

    // js/agenda/ só na agenda; quem é usado por mais de uma página fica direto em js/
    // (js/vendor/: bibliotecas de terceiros, em qualquer página)
    const foraDoLugar = Object.entries(paginasDoScript).filter(([script, paginas]) => {
        const pasta = script.split("/").length > 2 ? script.split("/")[1] : null;
        if(pasta === "vendor") return false;
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
            if(url.pathname.endsWith("/vendor/supabase-2.45.0.js")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso(usuario) });
            if(url.pathname.endsWith("/vendor/xlsx-0.18.5.full.min.js")) return rota.fulfill({ contentType: "text/javascript", body: "window.XLSX = {};" });
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

            // data-clique="abrirX" (acoes.js): a função precisa existir em window
            // (function dos scripts; const e let não ficam em window)
            const ATRIBUTOS_ACAO = ["data-clique", "data-clique-fora", "data-mudanca", "data-entrada"];
            const chamadas = new Set();
            const inline = [];

            document.querySelectorAll("*").forEach(elemento => {
                for(const atributo of elemento.attributes){
                    if(ATRIBUTOS_ACAO.includes(atributo.name)) chamadas.add(atributo.value);
                    // onclick="..." a CSP bloqueia: o botão não faria nada
                    if(/^on/.test(atributo.name)) inline.push(`${elemento.tagName} ${atributo.name}`);
                }
            });

            return {
                semFuncao: [...chamadas].filter(nome => typeof window[nome] !== "function"),
                inline,
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
        confere(`${arquivo}: nenhum onclick (a CSP bloqueia)`, resumo.inline.length === 0, resumo.inline.length ? resumo.inline : undefined);

        // a CSP vale de verdade: código enfiado na página não roda
        const injetado = await pagina.evaluate(() => {
            const script = document.createElement("script");
            script.textContent = "window.__injetado = true";
            document.head.appendChild(script);
            const div = document.createElement("div");
            div.innerHTML = '<img src="data:,x" onerror="window.__injetado = true">';
            document.body.appendChild(div);
            return new Promise(pronto => setTimeout(() => { div.remove(); pronto(window.__injetado === true); }, 100));
        });
        confere(`${arquivo}: CSP bloqueia código injetado`, !injetado);
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

    // ---------- captcha do login (login-captcha.js) ----------
    const tentarLogin = async (pagina) => {
        await pagina.fill("#loginEmail", "a@b.com");
        await pagina.fill("#loginSenha", "senha");
        await pagina.click("[data-clique='fazerLogin']");
        await pagina.waitForTimeout(100);
        return {
            logins: await pagina.evaluate(() => window.__logins || []),
            erro: await pagina.innerText("#loginErro")
        };
    };

    await login.pagina.close();

    // a chave do site (pública) está no repositório
    const textoCaptcha = fs.readFileSync(path.join(raiz, "js", "login", "login-captcha.js"), "utf8");
    confere("captcha: a chave do site está preenchida", /TURNSTILE_SITE_KEY = "0x[0-9A-Za-z_-]+"/.test(textoCaptcha));

    // com chave: Turnstile falso que entrega um token; reset não entrega outro na hora
    const comCaptcha = await novoContexto(null);
    const turnstileFalso = `window.turnstile = {
        render(alvo, opcoes){ window.__captcha = { alvo, chave: opcoes.sitekey }; setTimeout(() => opcoes.callback("token-1"), 0); return "w1"; },
        reset(){ window.__resets = (window.__resets || 0) + 1; }
    };`;
    let cloudflareFora = false;
    let chaveTeste = "";
    await comCaptcha.contexto.route("**/*", (rota) => {
        const url = new URL(rota.request().url());
        if(url.hostname === "challenges.cloudflare.com"){
            return cloudflareFora ? rota.abort() : rota.fulfill({ contentType: "text/javascript", body: turnstileFalso });
        }
        if(url.pathname.endsWith("/login-captcha.js")){
            const texto = fs.readFileSync(path.join(raiz, "js", "login", "login-captcha.js"), "utf8");
            return rota.fulfill({ contentType: "text/javascript", body: texto.replace(/TURNSTILE_SITE_KEY = "[^"]*"/, `TURNSTILE_SITE_KEY = "${chaveTeste}"`) });
        }
        return rota.fallback();
    });

    // sem chave: login normal, sem captcha
    const paginaSemChave = await abrir(comCaptcha.contexto, "login.html");
    const semChave = await tentarLogin(paginaSemChave.pagina);
    confere("captcha: sem chave o login vai sem token", semChave.logins.length === 1 && JSON.stringify(semChave.logins[0].options) === "{}", semChave.logins);
    confere("captcha: senha errada avisa", semChave.erro === "E-mail ou senha inválidos", semChave.erro);
    await paginaSemChave.pagina.close();

    chaveTeste = "chave-teste";
    const comChave = await abrir(comCaptcha.contexto, "login.html");
    const captcha = await comChave.pagina.evaluate(() => window.__captcha);
    confere("captcha: com chave desenha o Turnstile no login", captcha?.alvo === "#captchaLogin" && captcha?.chave === "chave-teste", captcha);
    confere("captcha: a CSP do login deixa a Cloudflare carregar", comChave.erros.length === 0, comChave.erros.length ? comChave.erros : undefined);
    const primeira = await tentarLogin(comChave.pagina);
    confere("captcha: o token vai junto no login", primeira.logins[0]?.options?.captchaToken === "token-1", primeira.logins);
    confere("captcha: depois da tentativa pede outro token", (await comChave.pagina.evaluate(() => window.__resets)) === 1);
    const segunda = await tentarLogin(comChave.pagina);
    confere("captcha: sem token novo não tenta o login", segunda.logins.length === 1 && /Aguarde a verificação/.test(segunda.erro), segunda.erro);
    await comChave.pagina.close();

    cloudflareFora = true;
    const semCloudflare = await abrir(comCaptcha.contexto, "login.html");
    const bloqueado = await tentarLogin(semCloudflare.pagina);
    confere("captcha: Cloudflare bloqueada avisa (não tenta o login)", bloqueado.logins.length === 0 && /não carregou/.test(bloqueado.erro), bloqueado.erro);
    await comCaptcha.contexto.close();

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

    // ---------- trava de aparelhos (dispositivo.js) ----------
    {
        // liberado: a chave do aparelho vai em toda chamada e continua a mesma depois de recarregar
        const liberado = await novoContexto({ acessos: ["propostas"] });
        const { pagina, erros } = await abrir(liberado.contexto, "propostas.html");
        const chave = () => pagina.evaluate(() => window.__opcoesCliente?.global?.headers?.["x-dispositivo"]);
        const primeira = await chave();
        await pagina.reload();
        await pagina.waitForLoadState("networkidle");
        const registro = await pagina.evaluate(() => (window.__rpcs || []).find(([nome]) => nome === "registrar_dispositivo"));
        confere("aparelho: a chave vai no cabeçalho x-dispositivo", /^[0-9a-f]{64}$/.test(primeira || ""), primeira);
        confere("aparelho: a chave é a mesma depois de recarregar", primeira === (await chave()));
        confere("aparelho: confere no banco com a chave e o aparelho", registro?.[1]?.p_chave === primeira && /Computador/.test(registro?.[1]?.p_aparelho || "") && typeof registro?.[1]?.p_cidade === "string", registro);
        confere("aparelho liberado: página normal", erros.length === 0 && (await pagina.evaluate(() => document.documentElement.style.visibility)) === "" && (await pagina.locator("#avisoDispositivo").count()) === 0);
        await liberado.contexto.close();
    }

    {
        // pendente: só "Aguardando liberação" e o Sair (não pede nada à pessoa)
        const pendente = await novoContexto({ acessos: ["propostas"], dispositivo: "pendente" });
        const { pagina, erros } = await abrir(pendente.contexto, "propostas.html");
        confere("aparelho pendente: mostra o aviso", await pagina.locator("#avisoDispositivo").isVisible(), erros.length ? erros : undefined);
        confere("aparelho pendente: a página fica escondida", (await pagina.evaluate(() => document.documentElement.style.visibility)) === "hidden" && !(await pagina.locator(".topbar").isVisible()));
        const aviso = (await pagina.innerText("#avisoDispositivo")).replace(/\s+/g, " ").trim();
        confere("aparelho pendente: só 'Aguardando liberação' e Sair", aviso === "🔒 Aguardando liberação Sair" && (await pagina.locator("#avisoDispositivo input").count()) === 0, aviso);
        await pagina.click("#avisoDispositivo button:has-text('Sair')");
        await pagina.waitForURL("**/login.html", { timeout: 5000 }).catch(() => {});
        confere("aparelho pendente: Sair vai para o login", pagina.url().endsWith("/login.html"), pagina.url());
        await pendente.contexto.close();
    }

    {
        // bloqueado pelo admin: sai do login com o aviso
        const desconectado = await novoContexto({ acessos: ["propostas"], dispositivo: "bloqueado" });
        const pagina = await desconectado.contexto.newPage();
        let aviso = "";
        pagina.on("dialog", d => { aviso = d.message(); d.accept(); });
        await pagina.goto("http://site.test/propostas.html");
        await pagina.waitForURL("**/login.html", { timeout: 5000 }).catch(() => {});
        confere("aparelho desconectado: sai do sistema", pagina.url().endsWith("/login.html") && /desconectado/.test(aviso) && (await pagina.evaluate(() => localStorage.getItem("__saiu"))) === "1", aviso);
        await desconectado.contexto.close();
    }

    {
        // admin: lista com o aguardando primeiro, liberar e ligar a trava
        const tabelas = {
            perfis: [{ id: "u2", email: "filial@empresa.com", acessos: ["propostas"], filiais: [], ativo: true }],
            dispositivos: [
                { id: 1, usuario: "u2", situacao: "liberado", aparelho: "Computador · Windows · Chrome", nome: "PC 1", criado_em: "2026-11-01T10:00:00Z", ultimo_acesso: "2026-11-10T10:00:00Z" },
                { id: 2, usuario: "u2", situacao: "pendente", aparelho: "Celular · iPhone · Safari", nome: "<b>Maria</b>", cidade: "Itajaí/Santa Catarina", ip: "189.4.5.6", criado_em: "2026-11-10T11:00:00Z", ultimo_acesso: "2026-11-10T11:00:00Z" }
            ],
            trava_dispositivos: { ligada: false }
        };
        const admin2 = await novoContexto({ admin: true, tabelas });
        const { pagina, erros } = await abrir(admin2.contexto, "admin.html");
        await pagina.waitForSelector("#corpoAparelhos tr");
        const linhas = await pagina.$$eval("#corpoAparelhos tr", l => l.map(t => t.innerText));
        confere("admin aparelhos: abre sem erro", erros.length === 0, erros.length ? erros : undefined);
        confere("admin aparelhos: aguardando vem primeiro, com o e-mail", /filial@empresa\.com/.test(linhas[0]) && /Aguardando/.test(linhas[0]) && /Liberado/.test(linhas[1]), linhas);
        confere("admin aparelhos: mostra a cidade e o IP de onde acessou", linhas[0].includes("Itajaí/Santa Catarina") && linhas[0].includes("IP 189.4.5.6"), linhas[0]);
        confere("admin aparelhos: nome entra como texto (não HTML)", (await pagina.locator("#corpoAparelhos b").count()) === 0 && linhas[0].includes("<b>Maria</b>"));
        confere("admin aparelhos: título conta quem aguarda", (await pagina.innerText("#tituloAparelhos")) === "Aparelhos (1 aguardando)");
        confere("admin aparelhos: botão da trava desligada", /desligada/.test(await pagina.innerText("#btnTrava")));

        // as perguntas (confirm) o abrir() já aceita
        await pagina.evaluate(() => { window.__chamadas = []; });
        await pagina.click("#corpoAparelhos tr:first-child .btn-liberar-aparelho");
        await pagina.waitForTimeout(100);
        const liberou = await pagina.evaluate(() => window.__chamadas.filter(([tabela, nome]) => tabela === "dispositivos" && (nome === "update" || nome === "eq")));
        confere("admin aparelhos: liberar grava a situação do aparelho certo", liberou.some(([, nome, args]) => nome === "update" && args[0].situacao === "liberado" && args[0].liberado_em) && liberou.some(([, nome, args]) => nome === "eq" && args[0] === "id" && args[1] === 2), liberou);

        await pagina.evaluate(() => { window.__chamadas = []; });
        await pagina.click("#btnTrava");
        await pagina.waitForTimeout(100);
        const trava = await pagina.evaluate(() => window.__chamadas.filter(([tabela, nome]) => tabela === "trava_dispositivos" && nome === "update"));
        confere("admin aparelhos: ligar a trava (depois de confirmar)", trava.length === 1 && trava[0][2][0].ligada === true, trava);
        await admin2.contexto.close();
    }

    await navegador.close();

    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exit(falhas ? 1 : 0);

})().catch(e => { console.error(e); process.exit(1); });
