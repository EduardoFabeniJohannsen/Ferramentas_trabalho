// Registro de erros e a seção do Admin, com o supabase-js de verdade (2.45.0, a mesma
// das páginas) falando com um servidor simulado. Nada aqui toca o Supabase de produção.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });

const umd = fs.readFileSync(path.join(raiz, "node_modules/@supabase/supabase-js/dist/umd/supabase.js"));

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

const PAGINAS = ["index.html", "propostas.html", "agenda.html", "estoque.html", "tabelas.html", "transportadoras.html", "WEG.html", "admin.html", "propostas-copiadas.html", "leads.html"];

const base64 = (dados) => Buffer.from(JSON.stringify(dados)).toString("base64url");

const TOKEN = `${base64({ alg: "HS256", typ: "JWT" })}.${base64({ sub: "u1", exp: 4102444800 })}.assinatura`;

const SESSAO = {
    access_token: TOKEN,
    refresh_token: "renovar",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 4102444800,
    user: { id: "u1", aud: "authenticated", email: "chefe@exemplo.com", app_metadata: { role: "admin" }, user_metadata: {} }
};

const agora = new Date().toISOString();

const LINHAS_ERROS = () => [
    { id: 1, criado_em: "2026-10-01T12:00:00Z", atualizado_em: agora, pagina: "agenda", versao: "16.30.0", tipo: "tratado", mensagem: "Falha ao salvar agendamento", detalhe: "at salvar (/js/agenda/agenda-salvar.js:10:5)", usuario_email: "ana@exemplo.com", vezes: 3 },
    { id: 2, criado_em: agora, atualizado_em: agora, pagina: "leads", versao: "16.29.10", tipo: "codigo", mensagem: "<img src=x onerror=\"window.__xss=1\">", detalhe: "<script>window.__xss=1</script>", usuario_email: "bia@exemplo.com", vezes: 1 },
    { id: 3, criado_em: agora, atualizado_em: agora, pagina: "agenda", versao: "16.30.0", tipo: "arquivo", mensagem: "Arquivo não carregou: /js/menu.js", detalhe: null, usuario_email: null, vezes: 2 }
];

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

(async () => {

    // ---------- as páginas carregam na ordem certa ----------
    PAGINAS.forEach(arquivo => {
        const scripts = [...fs.readFileSync(path.join(raiz, arquivo), "utf8").matchAll(/<script[^>]+src="([^"]+)"/g)].map(a => a[1]);
        confere(`${arquivo}: registra erros logo depois de supabase-config`, scripts.indexOf("js/registro-erros.js") === scripts.indexOf("js/supabase-config.js") + 1 && scripts.includes("js/registro-erros.js"));
        confere(`${arquivo}: confere arquivo faltando logo depois do registro`, scripts.indexOf("js/arquivo-faltando.js") === scripts.indexOf("js/registro-erros.js") + 1);
    });
    confere("login.html não registra (ainda não tem usuário)", !fs.readFileSync(path.join(raiz, "login.html"), "utf8").includes("registro-erros"));

    const navegador = await chromium.launch({ channel: "chrome", headless: true });

    const abrir = async (arquivo = "index.html", opcoes = {}) => {

        const servidor = {
            rpc: [],
            cabecalhosRpc: [],
            gets: [],
            deletes: [],
            linhas: opcoes.linhas || [],
            faltando: new Set(opcoes.faltando || []),
            semRede: new Set(opcoes.semRede || []),
            // cai só no primeiro pedido (falha passageira)
            falhaUmaVez: new Set(opcoes.falhaUmaVez || []),
            extras: opcoes.extras || {},
            respostaRpc: "ok",
            respostaErros: "ok"
        };

        const contexto = await navegador.newContext({ viewport: opcoes.tela || { width: 1300, height: 800 } });

        await contexto.route("**/*", async (rota) => {

            const pedido = rota.request();
            const url = new URL(pedido.url());
            const json = (corpo, status = 200) => rota.fulfill({ status, contentType: "application/json", body: JSON.stringify(corpo) });

            if(servidor.falhaUmaVez.delete(url.pathname)) return rota.abort();

            // o site parou de responder depois de mandar a página
            if(opcoes.paginaSemRede && pedido.resourceType() === "fetch" && url.pathname === `/${arquivo}`) return rota.abort();

            if(url.hostname.includes("jsdelivr")) return rota.fulfill({ contentType: "text/javascript", body: umd });
            if(url.hostname.includes("cdnjs")) return rota.fulfill({ contentType: "text/javascript", body: "window.XLSX = {};" });
            if(url.hostname !== "site.test") return rota.abort();

            if(url.pathname === "/rest/v1/rpc/registrar_erro_site"){
                servidor.rpc.push(pedido.postDataJSON());
                servidor.cabecalhosRpc.push(await pedido.allHeaders());
                if(servidor.respostaRpc === "erro") return json({ code: "PGRST202", message: "Função não existe" }, 404);
                if(servidor.respostaRpc === "sem-rede") return rota.abort();
                return rota.fulfill({ status: 204 });
            }

            if(url.pathname === "/rest/v1/erros_site"){
                if(pedido.method() === "DELETE"){
                    servidor.deletes.push(url.search);
                    const ids = (url.searchParams.get("id") || "").replace(/^in\.\(|\)$/g, "").split(",").map(Number);
                    servidor.linhas = servidor.linhas.filter(linha => !ids.includes(linha.id));
                    return rota.fulfill({ status: 204 });
                }
                servidor.gets.push(url.search);
                if(servidor.respostaErros === "sem-tabela") return json({ code: "PGRST205", message: "Tabela não existe" }, 404);
                if(servidor.respostaErros === "falha") return json({ code: "500", message: "Falhou" }, 500);
                return json(servidor.linhas);
            }

            if(url.pathname.startsWith("/rest/")) return json([]);

            if(url.pathname.endsWith("supabase-config.js")){
                return rota.fulfill({ contentType: "text/javascript", body: 'const SUPABASE_URL = "http://site.test"; const SUPABASE_ANON_KEY = "chave-falsa"; const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);' });
            }

            if(servidor.extras[url.pathname]) return rota.fulfill({ contentType: "text/javascript", body: servidor.extras[url.pathname] });
            if(servidor.faltando.has(url.pathname)) return rota.fulfill({ status: 404, body: "" });
            if(servidor.semRede.has(url.pathname)) return rota.abort();

            const local = path.join(raiz, decodeURIComponent(url.pathname));
            if(!fs.existsSync(local)) return rota.fulfill({ status: 404, body: "" });
            return rota.fulfill({ contentType: tipos[path.extname(local)] || "text/plain", body: fs.readFileSync(local) });
        });

        await contexto.addInitScript(({ sessao }) => {
            localStorage.setItem("sb-site-auth-token", JSON.stringify(sessao));
            // o tempo real não faz parte deste teste
            window.WebSocket = class { constructor(){ this.readyState = 0; } close(){} send(){} };
        }, { sessao: SESSAO });

        // o navegador acha que está sem internet até o teste dizer que voltou
        if(opcoes.semInternet){
            await contexto.addInitScript(() => {
                window.__semInternet = true;
                Object.defineProperty(Navigator.prototype, "onLine", { configurable: true, get: () => !window.__semInternet });
            });
        }

        if(opcoes.semSessionStorage){
            await contexto.addInitScript(() => {
                Object.defineProperty(window, "sessionStorage", { configurable: true, get(){ throw new DOMException("bloqueado", "SecurityError"); } });
            });
        }

        // quem já usou o site: sem o banco, o auth-guard.js usa esta cópia em vez de
        // mandar para a página que todos podem ver
        if(opcoes.perfilSalvo){
            await contexto.addInitScript(() => {
                localStorage.setItem("authPerfil", JSON.stringify({ id: "u1", perfil: { admin: true, acessos: [], filiais: [], ativo: true } }));
            });
        }

        const pagina = await contexto.newPage();
        const errosPagina = [];
        const consoleErros = [];
        const dialogos = { aceitar: true, vistos: [] };

        pagina.on("pageerror", e => errosPagina.push(e.message));
        pagina.on("console", m => { if(m.type() === "error") consoleErros.push(m.text()); });
        pagina.on("dialog", d => { dialogos.vistos.push(d.message()); return dialogos.aceitar ? d.accept() : d.dismiss(); });
        let vezesCarregou = 0;
        pagina.on("load", () => { vezesCarregou++; });
        const cargas = () => vezesCarregou;

        await pagina.goto(`http://site.test/${arquivo}`);
        await pagina.waitForLoadState("networkidle");

        return { contexto, pagina, servidor, errosPagina, consoleErros, dialogos, cargas };
    };

    const enviar = (pagina) => pagina.evaluate(() => enviarErrosPendentes());

    // o navegador avisa do erro quando puder: espera ele chegar, sem tempo fixo
    const esperarAnotado = (pagina, texto) =>
        pagina.waitForFunction(
            (procurado) => [...errosPendentes.values()].some(erro => erro.mensagem.includes(procurado)),
            texto
        );

    const comTexto = (servidor, texto) => servidor.rpc.filter(chamada => chamada.p_mensagem.includes(texto));

    // ---------- página funcionando não registra nada ----------
    for(const arquivo of PAGINAS){

        const { contexto, pagina, servidor, cargas } = await abrir(arquivo);

        await enviar(pagina);

        confere(`${arquivo}: funcionando normal, não registra nada`, servidor.rpc.length === 0, servidor.rpc.length ? servidor.rpc.map(c => c.p_mensagem) : undefined);
        confere(`${arquivo}: funcionando normal, não recarrega`, cargas() === 1, cargas());

        await contexto.close();
    }

    // ---------- o que é registrado ----------
    {
        const { contexto, pagina, servidor, consoleErros, cargas } = await abrir("index.html", {
            extras: { "/js/erro-no-arquivo.js": "function quebrar(){ throw new Error('erro dentro do arquivo'); }\nquebrar();" }
        });

        confere("sem erro nenhum, não envia nada", servidor.rpc.length === 0, servidor.rpc);

        await pagina.evaluate(() => { setTimeout(() => { throw new Error("erro de codigo"); }); });
        await esperarAnotado(pagina, "erro de codigo");
        await enviar(pagina);
        const codigo = comTexto(servidor, "erro de codigo")[0];
        confere("erro de código é registrado", codigo?.p_tipo === "codigo", codigo);
        confere("guarda página, versão e vezes", codigo?.p_pagina === "index" && codigo?.p_versao === (await pagina.evaluate(() => VERSAO_SISTEMA)) && codigo?.p_vezes === 1, codigo);
        confere("guarda onde aconteceu", !!codigo?.p_detalhe, codigo?.p_detalhe);
        confere("envia exatamente os campos da função", Object.keys(codigo || {}).sort().join() === "p_detalhe,p_mensagem,p_pagina,p_tipo,p_versao,p_vezes", Object.keys(codigo || {}));
        confere("envia com o login da pessoa", servidor.cabecalhosRpc[0]?.authorization === `Bearer ${TOKEN}`);

        await pagina.evaluate(() => { Promise.reject(new Error("promessa recusada")); });
        await esperarAnotado(pagina, "promessa recusada");
        await enviar(pagina);
        confere("promessa recusada é registrada", comTexto(servidor, "promessa recusada")[0]?.p_tipo === "codigo");

        await pagina.evaluate(() => { Promise.reject({ message: "Erro do banco", code: "500" }); });
        await esperarAnotado(pagina, "Erro do banco");
        await enviar(pagina);
        confere("promessa recusada com erro do banco", comTexto(servidor, "Erro do banco").length === 1);

        await pagina.evaluate(() => { console.error("[agenda] Falha ao salvar:", { code: "23505", message: "duplicado" }); });
        await enviar(pagina);
        const tratado = comTexto(servidor, "Falha ao salvar")[0];
        confere("falha tratada é registrada", tratado?.p_tipo === "tratado", tratado);
        confere("com os dados do erro no texto", tratado?.p_mensagem.includes("duplicado") && tratado?.p_mensagem.includes("23505"), tratado?.p_mensagem);
        confere("o console do navegador continua recebendo", consoleErros.some(texto => texto.includes("Falha ao salvar")));

        await pagina.evaluate(() => { console.error("Com Error:", new Error("mensagem do erro")); });
        await enviar(pagina);
        const comError = comTexto(servidor, "mensagem do erro")[0];
        confere("console.error com Error usa a mensagem e a pilha", comError?.p_mensagem === "Com Error: mensagem do erro" && comError?.p_detalhe.includes("Error"), comError);

        await pagina.evaluate(() => { console.warn("só um aviso"); });
        await enviar(pagina);
        confere("aviso (console.warn) não é erro", comTexto(servidor, "só um aviso").length === 0);

        await pagina.evaluate(() => {
            const s = document.createElement("script");
            s.src = "js/erro-no-arquivo.js";
            document.body.appendChild(s);
        });
        await esperarAnotado(pagina, "erro dentro do arquivo");
        await enviar(pagina);
        const noArquivo = comTexto(servidor, "erro dentro do arquivo")[0];
        confere("a pilha mostra o arquivo sem o endereço do site", noArquivo?.p_detalhe.includes("/js/erro-no-arquivo.js") && !noArquivo?.p_detalhe.includes("site.test"), noArquivo?.p_detalhe);

        await pagina.evaluate(() => {
            const s = document.createElement("script");
            s.src = "js/nao-existe.js?v=123";
            document.body.appendChild(s);
        });
        await esperarAnotado(pagina, "nao-existe");
        await enviar(pagina);
        const arquivoFaltando = comTexto(servidor, "nao-existe")[0];
        confere("arquivo que não carrega é registrado", arquivoFaltando?.p_tipo === "arquivo", arquivoFaltando);
        confere("sem os parâmetros do endereço", arquivoFaltando?.p_mensagem === "Arquivo não carregou: /js/nao-existe.js", arquivoFaltando?.p_mensagem);
        confere("arquivo que falha com a página já aberta não recarrega", cargas() === 1 && (await pagina.locator("#avisoArquivoFaltando").count()) === 0, cargas());

        await contexto.close();
    }

    // ---------- arquivo faltando desde a abertura ----------
    // a página recarrega sozinha uma vez e, faltando de novo, mostra o aviso: cada
    // abertura registra o seu (a anotação "[arquivos] ..." também cita o arquivo)
    const soArquivo = (servidor, texto) => comTexto(servidor, texto).filter(chamada => chamada.p_tipo === "arquivo");

    // recarregar troca a página no meio: espera do lado de cá, sem tempo fixo
    const esperarCargas = async (aberta, quantas) => {
        const limite = Date.now() + 15000;
        while(aberta.cargas() < quantas && Date.now() < limite) await new Promise(pronto => setTimeout(pronto, 50));
        await aberta.pagina.waitForLoadState("networkidle");
    };

    const avisoArquivo = (pagina) => pagina.locator("#avisoArquivoFaltando");

    const menuMontado = async (pagina) => (await pagina.locator(".topbar a[href]").count()) > 0;

    {
        const { contexto, pagina, servidor } = await abrir("index.html", { faltando: ["/css/style.css", "/js/menu.js"] });
        await avisoArquivo(pagina).waitFor();
        await enviar(pagina);
        const cssFaltando = soArquivo(servidor, "/css/style.css");
        confere("CSS faltando é registrado, uma vez por abertura", cssFaltando.length === 2 && cssFaltando.every(chamada => chamada.p_vezes === 1), cssFaltando);
        confere("script faltando é registrado", soArquivo(servidor, "/js/menu.js").length === 2, servidor.rpc.map(c => c.p_mensagem));
        await contexto.close();

        const cssSemRede = await abrir("index.html", { semRede: ["/css/style.css"] });
        await avisoArquivo(cssSemRede.pagina).waitFor();
        await enviar(cssSemRede.pagina);
        const semRede = soArquivo(cssSemRede.servidor, "/css/style.css");
        confere("CSS que caiu no meio é registrado, uma vez por abertura", semRede.length === 2 && semRede.every(chamada => chamada.p_vezes === 1), semRede);
        await cssSemRede.contexto.close();

        const semHelpers = await abrir("index.html", { faltando: ["/js/helpers.js"] });
        await avisoArquivo(semHelpers.pagina).waitFor();
        await enviar(semHelpers.pagina);
        const chamada = soArquivo(semHelpers.servidor, "/js/helpers.js")[0];
        confere("helpers.js faltando também é registrado, sem versão", chamada?.p_tipo === "arquivo" && chamada?.p_versao === "?", chamada);
        confere("sem o helpers.js a página também se recupera", semHelpers.cargas() === 2, semHelpers.cargas());
        await semHelpers.contexto.close();
    }

    // ---------- arquivo que não carregou: a página se recupera ----------
    {
        const aberta = await abrir("index.html", { falhaUmaVez: ["/js/menu.js"] });
        await esperarCargas(aberta, 2);
        const { contexto, pagina, servidor } = aberta;
        confere("falha passageira: recarrega sozinha uma vez", aberta.cargas() === 2, aberta.cargas());
        confere("depois de recarregar, fica inteira e sem aviso", (await menuMontado(pagina)) && (await avisoArquivo(pagina).count()) === 0);
        confere("registra o arquivo e a recarga antes de recarregar", soArquivo(servidor, "/js/menu.js").length === 1 && comTexto(servidor, "recarregou sozinha: /js/menu.js").length === 1, servidor.rpc.map(c => c.p_mensagem));
        confere("abriu inteira: apaga a marca da recarga", (await pagina.evaluate(() => sessionStorage.getItem("sistemaRecargaArquivoFaltando"))) === null);
        await contexto.close();
    }

    {
        const aberta = await abrir("index.html", { faltando: ["/js/menu.js"] });
        const { contexto, pagina, servidor } = aberta;
        await avisoArquivo(pagina).waitFor();
        await pagina.waitForTimeout(500);
        confere("faltou de novo: recarrega uma vez só e mostra o aviso", aberta.cargas() === 2, aberta.cargas());
        const texto = await avisoArquivo(pagina).innerText();
        confere("o aviso pede para conferir a internet e tem Recarregar", texto.includes("Confira a internet") && texto.includes("Recarregar"), texto);
        await enviar(pagina);
        confere("registra que faltou de novo", comTexto(servidor, "de novo depois de recarregar sozinha: /js/menu.js").length === 1, servidor.rpc.map(c => c.p_mensagem));
        await pagina.screenshot({ path: path.join(saida, "94-arquivo-faltando.png") });

        servidor.faltando.clear();
        await avisoArquivo(pagina).locator("button").click();
        await esperarCargas(aberta, 3);
        confere("Recarregar: com o arquivo de volta, fica inteira e sem aviso", aberta.cargas() === 3 && (await menuMontado(pagina)) && (await avisoArquivo(pagina).count()) === 0, aberta.cargas());
        await contexto.close();
    }

    {
        const aberta = await abrir("index.html", { faltando: ["/js/menu.js"], paginaSemRede: true });
        await avisoArquivo(aberta.pagina).waitFor();
        await aberta.pagina.waitForTimeout(500);
        confere("o site não respondeu: não recarrega (cairia na tela de erro do navegador) e avisa", aberta.cargas() === 1, aberta.cargas());
        await aberta.contexto.close();
    }

    {
        const aberta = await abrir("index.html", { faltando: ["/js/menu.js"], semSessionStorage: true });
        await avisoArquivo(aberta.pagina).waitFor();
        await aberta.pagina.waitForTimeout(500);
        confere("sem onde guardar a marca: não recarrega sozinha (poderia não parar) e avisa", aberta.cargas() === 1, aberta.cargas());
        await aberta.contexto.close();
    }

    {
        const aberta = await abrir("index.html", { semRede: ["/js/menu.js"], semInternet: true });
        const { contexto, pagina, servidor } = aberta;
        await avisoArquivo(pagina).waitFor();
        const texto = await avisoArquivo(pagina).innerText();
        confere("sem internet: avisa e espera a conexão voltar", aberta.cargas() === 1 && texto.includes("quando a conexão voltar"), texto);
        servidor.semRede.clear();
        await pagina.evaluate(() => { window.__semInternet = false; window.dispatchEvent(new Event("online")); });
        await esperarCargas(aberta, 2);
        confere("a internet voltou: recarrega sozinha e fica inteira", aberta.cargas() === 2 && (await menuMontado(pagina)) && (await avisoArquivo(pagina).count()) === 0, aberta.cargas());
        await contexto.close();
    }

    {
        const aberta = await abrir("index.html", { falhaUmaVez: ["/npm/@supabase/supabase-js@2.45.0"], perfilSalvo: true });
        await esperarCargas(aberta, 2);
        confere("supabase-js (vem de outro site) que não carregou também recarrega", aberta.cargas() === 2 && (await aberta.pagina.evaluate(() => typeof supabaseClient)) === "object", aberta.cargas());
        await aberta.contexto.close();
    }

    // ---------- o que fica de fora ----------
    {
        const { contexto, pagina, servidor } = await abrir();

        await pagina.evaluate(() => {
            window.dispatchEvent(new ErrorEvent("error", { message: "Script error." }));
            window.dispatchEvent(new ErrorEvent("error", { message: "ResizeObserver loop completed with undelivered notifications." }));
            window.dispatchEvent(new ErrorEvent("error", { message: "erro de extensão", filename: "chrome-extension://abc/x.js" }));
        });
        await enviar(pagina);
        confere("ignora o que não é erro do site", servidor.rpc.length === 0, servidor.rpc);

        await pagina.evaluate(() => { console.error("com token eyJhbGci.eyJzdWIi.assinaturaXYZ no meio"); });
        await enviar(pagina);
        confere("token de login nunca é enviado", comTexto(servidor, "com token")[0]?.p_mensagem === "com token [token] no meio", servidor.rpc);

        await pagina.evaluate(() => { console.error("g".repeat(3000)); });
        await enviar(pagina);
        confere("corta mensagem grande", comTexto(servidor, "ggg")[0]?.p_mensagem.length === 500);

        servidor.rpc.length = 0;
        await pagina.evaluate(() => { window.dispatchEvent(new Event("pagehide")); console.error("saindo da página"); });
        await enviar(pagina);
        confere("saindo da página: o que foi cancelado não é erro", comTexto(servidor, "saindo").length === 0);

        await pagina.evaluate(() => { window.dispatchEvent(new Event("pageshow")); console.error("voltou para a página"); });
        await enviar(pagina);
        confere("voltou pela seta do navegador: continua registrando", comTexto(servidor, "voltou").length === 1);

        await contexto.setOffline(true);
        await pagina.evaluate(() => { console.error("sem internet"); });
        await contexto.setOffline(false);
        await enviar(pagina);
        confere("sem internet não registra", comTexto(servidor, "sem internet").length === 0);

        await pagina.evaluate(() => {
            localStorage.removeItem("sb-site-auth-token");
            console.error("sem login");
        });
        confere("sem login não envia", (await enviar(pagina)) === false && comTexto(servidor, "sem login").length === 0, servidor.rpc.map(c => c.p_mensagem));

        await contexto.close();
    }

    // ---------- repetição e limites ----------
    {
        const { contexto, pagina, servidor } = await abrir();

        await pagina.evaluate(() => { for(let i = 0; i < 100; i++) console.error("sempre igual"); });
        await enviar(pagina);
        let iguais = comTexto(servidor, "sempre igual");
        confere("erro repetido vira um envio só, com a soma", iguais.length === 1 && iguais[0].p_vezes === 100, iguais);

        await pagina.evaluate(() => { console.error("sempre igual"); console.error("sempre igual"); });
        await enviar(pagina);
        iguais = comTexto(servidor, "sempre igual");
        confere("depois de enviar, continua somando", iguais.length === 2 && iguais[1].p_vezes === 2, iguais.map(c => c.p_vezes));

        await enviar(pagina);
        confere("sem nada novo, não envia de novo", comTexto(servidor, "sempre igual").length === 2);

        servidor.rpc.length = 0;
        const inicioEspera = Date.now();
        const agendou = await pagina.evaluate(() => {
            console.error("sozinho um");
            console.error("sozinho dois");
            return timerEnvioErros !== null && errosPendentes.size === 2;
        });
        confere("espera antes de enviar", agendou && servidor.rpc.length === 0, servidor.rpc.length);
        await pagina.waitForFunction(() => timerEnvioErros === null && errosPendentes.size === 0);
        await enviar(pagina);
        confere("envia sozinho depois de 2 segundos", comTexto(servidor, "sozinho").length === 2 && Date.now() - inicioEspera >= 1900, servidor.rpc.map(c => c.p_mensagem));

        await contexto.close();
    }

    {
        const { contexto, pagina, servidor } = await abrir();
        await pagina.evaluate(() => { for(let i = 0; i < 30; i++) console.error(`diferente ${i}`); });
        await enviar(pagina);
        confere("no máximo 20 erros diferentes por página aberta", comTexto(servidor, "diferente").length === 20, comTexto(servidor, "diferente").length);

        await pagina.evaluate(() => { console.error("diferente 0"); console.error("novo depois do limite"); });
        await enviar(pagina);
        confere("no limite: o que já é conhecido ainda soma, o novo não", comTexto(servidor, "diferente 0").length === 2 && comTexto(servidor, "novo depois").length === 0);
        await contexto.close();
    }

    {
        const { contexto, pagina, servidor } = await abrir();
        await pagina.evaluate(async () => {
            for(let i = 0; i < 60; i++){
                console.error("insistente");
                await enviarErrosPendentes();
            }
        });
        confere("no máximo 50 envios por página aberta", comTexto(servidor, "insistente").length === 50, comTexto(servidor, "insistente").length);
        await contexto.close();
    }

    // ---------- falhar ao registrar não atrapalha ----------
    for(const resposta of ["erro", "sem-rede"]){

        const { contexto, pagina, servidor, errosPagina } = await abrir();

        servidor.respostaRpc = resposta;

        await pagina.evaluate(() => { console.error("banco fora do ar"); });
        const enviou = await enviar(pagina);

        await pagina.waitForTimeout(2500);

        confere(`envio com ${resposta}: avisa quem pediu e não tenta de novo`, enviou === false && servidor.rpc.length === 1, servidor.rpc.length);
        confere(`envio com ${resposta}: a falha não vira outro erro`, errosPagina.length === 0 && comTexto(servidor, "banco fora").length === 1, errosPagina);

        servidor.respostaRpc = "ok";

        await pagina.evaluate(() => { console.error("voltou o banco"); });
        confere(`envio com ${resposta}: depois volta a funcionar`, (await enviar(pagina)) === true && comTexto(servidor, "voltou o banco").length === 1);

        await contexto.close();
    }

    // ---------- seção do Admin ----------
    {
        const { contexto, pagina, servidor, errosPagina, dialogos } = await abrir("admin.html", { linhas: LINHAS_ERROS() });

        const linhas = () => pagina.locator("#corpoErros tr").allInnerTexts();
        const toast = () => pagina.innerText("#toast");

        const consulta = decodeURIComponent(servidor.gets[0] || "");
        confere("pede só os últimos 30 dias", /atualizado_em=gte\.\d{4}-/.test(consulta), consulta);
        confere("mais recentes primeiro, com limite", consulta.includes("order=atualizado_em.desc") && consulta.includes("limit=200"), consulta);
        confere("pede as colunas da tela", ["mensagem", "detalhe", "usuario_email", "vezes", "versao", "tipo", "pagina"].every(campo => consulta.includes(campo)), consulta);
        confere("não pede a assinatura nem o id do usuário", !consulta.includes("assinatura") && !consulta.includes("usuario_id"), consulta);

        let lista = await linhas();
        confere("mostra os erros", lista.length === 3, lista);
        confere("linha completa", ["Agenda", "16.30.0", "ana@exemplo.com", "Falha tratada", "Falha ao salvar agendamento", "3"].every(texto => lista[0].includes(texto)), lista[0]);
        confere("data e hora legíveis", /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/.test(lista[0]), lista[0]);
        confere("mostra a primeira vez ao parar o mouse", (await pagina.locator("#corpoErros tr").first().locator("td").first().getAttribute("title")).startsWith("Primeira vez: 01/10/2026"));
        confere("erro de usuário desconhecido mostra traço", lista[2].includes("—"), lista[2]);
        confere("contagem", (await pagina.innerText("#contagemErros")) === "3 erro(s), 6 ocorrência(s)", await pagina.innerText("#contagemErros"));

        // os textos vêm de fora
        confere("mensagem aparece como texto", lista[1].includes("<img src=x"), lista[1]);
        await pagina.locator("#corpoErros details").nth(1).locator("summary").click();
        confere("detalhe aparece como texto", (await pagina.locator("#corpoErros details").nth(1).innerText()).includes("<script>"));
        confere("nada vira HTML", (await pagina.locator("#corpoErros img, #corpoErros script").count()) === 0 && (await pagina.evaluate(() => window.__xss)) === undefined);

        confere("erro sem detalhe não mostra o botão", (await pagina.locator("#corpoErros tr").nth(2).locator("details").count()) === 0);

        const opcoes = await pagina.locator("#filtroErrosPagina option").allInnerTexts();
        confere("filtro com as páginas que têm erro", opcoes.join() === "Todas as páginas,Agenda,Leads", opcoes);

        await pagina.selectOption("#filtroErrosPagina", "agenda");
        lista = await linhas();
        confere("filtra por página", lista.length === 2 && lista.every(linha => linha.includes("Agenda")), lista);
        confere("contagem acompanha o filtro", (await pagina.innerText("#contagemErros")) === "2 erro(s), 5 ocorrência(s)");

        await pagina.screenshot({ path: path.join(saida, "90-erros-admin.png"), fullPage: true });

        // limpar respeita o filtro e a confirmação
        dialogos.aceitar = false;
        await pagina.click("#btnLimparErros");
        await pagina.waitForTimeout(50);
        confere("Limpar pede confirmação", dialogos.vistos[0] === "Apagar 2 erro(s) da lista?", dialogos.vistos);
        confere("cancelou: não apaga", servidor.deletes.length === 0);

        dialogos.aceitar = true;
        await pagina.click("#btnLimparErros");
        await pagina.waitForFunction(() => document.querySelectorAll("#corpoErros tr").length === 1);
        confere("apaga só o que está na lista", decodeURIComponent(servidor.deletes[0]).includes("id=in.(1,3)"), servidor.deletes);
        confere("avisa", (await toast()).includes("Lista de erros limpa"), await toast());
        lista = await linhas();
        confere("filtro volta para todas quando a página some da lista", lista.length === 1 && lista[0].includes("Leads") && (await pagina.inputValue("#filtroErrosPagina")) === "", lista);

        await pagina.click("#btnLimparErros");
        await pagina.waitForFunction(() => document.querySelector("#corpoErros").innerText.includes("Nenhum erro"));
        confere("lista vazia avisa", (await linhas())[0].includes("Nenhum erro nos últimos 30 dias"), await linhas());
        confere("lista vazia: nada para limpar", await pagina.isDisabled("#btnLimparErros"));
        confere("lista vazia: sem contagem", (await pagina.innerText("#contagemErros")) === "");

        // o botão de teste passa pelo caminho inteiro
        servidor.linhas = [{ ...LINHAS_ERROS()[0], id: 9, mensagem: "Teste do registro de erros (botão do Admin)", vezes: 1 }];
        await pagina.click("#btnTestarErros");
        await pagina.waitForFunction(() => document.querySelector("#corpoErros").innerText.includes("Teste do registro"));
        confere("Testar registro grava", comTexto(servidor, "Teste do registro").length === 1 && comTexto(servidor, "Teste do registro")[0].p_pagina === "admin", servidor.rpc);
        confere("Testar registro avisa", (await toast()).includes("Teste registrado"), await toast());
        confere("Testar registro libera o botão", await pagina.isEnabled("#btnTestarErros"));

        confere("sem erros na página", errosPagina.length === 0, errosPagina);

        await contexto.close();
    }

    // ---------- SQL ainda não rodado e outras falhas ----------
    {
        const { contexto, pagina, servidor, errosPagina } = await abrir("admin.html");

        confere("sem erros: avisa", (await pagina.innerText("#corpoErros")).includes("Nenhum erro"));

        servidor.respostaErros = "sem-tabela";
        await pagina.click(".secao-erros button:has-text('Atualizar')");
        await pagina.waitForFunction(() => document.querySelector("#corpoErros").innerText.includes("rode o SQL"));
        confere("tabela ainda não criada: diz o que fazer", true);

        servidor.respostaRpc = "erro";
        await pagina.click("#btnTestarErros");
        await pagina.waitForFunction(() => document.querySelector("#toast").innerText.includes("confira o SQL"));
        confere("função ainda não criada: Testar registro avisa", (await pagina.locator("#toast.erro").count()) === 1);

        servidor.respostaErros = "falha";
        await pagina.click(".secao-erros button:has-text('Atualizar')");
        await pagina.waitForFunction(() => document.querySelector("#corpoErros").innerText.includes("Não foi possível carregar"));
        confere("outra falha: avisa sem quebrar", errosPagina.length === 0, errosPagina);

        servidor.respostaErros = "ok";
        servidor.linhas = LINHAS_ERROS();
        await pagina.click(".secao-erros button:has-text('Atualizar')");
        await pagina.waitForFunction(() => document.querySelectorAll("#corpoErros tr").length === 3);
        confere("Atualizar traz de novo", true);

        await contexto.close();
    }

    // ---------- celular ----------
    {
        const { contexto, pagina } = await abrir("admin.html", { linhas: LINHAS_ERROS(), tela: { width: 400, height: 800 } });
        await pagina.screenshot({ path: path.join(saida, "91-erros-celular.png"), fullPage: true });
        confere("no celular: a seção não estoura a tela", await pagina.evaluate(() => {
            const secao = document.querySelector(".secao-erros").getBoundingClientRect();
            return secao.left >= 0 && secao.right <= document.documentElement.clientWidth;
        }));
        await contexto.close();
    }

    await navegador.close();

    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exit(falhas ? 1 : 0);

})().catch(e => { console.error(e); process.exit(1); });
