// Servidor local com o mesmo cache do GitHub Pages (max-age=600). Sem page.route,
// que desligaria o cache do navegador: aqui o cache é o de verdade.
const { chromium } = require("playwright-core");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const raiz = path.resolve(__dirname, "..");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });
const hoje = new Date().toLocaleDateString("en-CA");

const estado = { versao: "1.0.0", versaoSemQuery: null, erroHelpers: false, helpersSemVersao: false };
const pedidos = [];

const stubSupabase = `
window.supabase = { createClient(){
    const linhas = [{ id: 1, data: "${hoje}", horario: "08:00", tipo: "Entrega", status: "Confirmado", plataforma: "WAE18R001", cliente: "Cliente Um", prazos_pagamento: [] }];
    const consulta = (tabela) => {
        let inicio = 0;
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then") return (ok) => ok({ data: inicio === 0 && tabela === "agendamentos" ? linhas : [], error: null, count: 0 });
                if(nome === "range") return (a) => { inicio = a; return q; };
                return () => q;
            }
        });
        return q;
    };
    return {
        from: consulta,
        rpc: async () => ({ data: [], error: null }),
        channel: () => ({ on(){ return this; }, subscribe(){ return this; }, send: async () => "ok" }),
        auth: {
            getSession: async () => ({ data: { session: { user: { id: "u1", email: "t@t" } } } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
        },
        storage: { from: () => ({}) }
    };
}};`;

const authFalso = `let perfilUsuario = { admin: true, acessos: [], filiais: [] };
function ehAdmin(){ return Promise.resolve(true); }
function temAcesso(){ return true; }
function temFilial(){ return true; }
function existeLoginSalvo(){ return true; }
function carregarPerfil(){ return Promise.resolve(perfilUsuario); }
function fazerLogout(){}
function recursoDaPagina(){ return "x"; }
function nomeArquivoAtual(){ return "x.html"; }`;

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

const servidor = http.createServer((req, res) => {

    const url = new URL(req.url, "http://x");
    let caminho = decodeURIComponent(url.pathname);
    if(caminho === "/") caminho = "/index.html";
    pedidos.push(req.url);

    let corpo;

    if(caminho === "/__supabase.js"){
        corpo = stubSupabase;
    }else if(caminho.endsWith("auth-guard.js")){
        corpo = authFalso;
    }else{
        const arquivo = path.join(raiz, caminho);
        if(!fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()){ res.writeHead(404); return res.end(); }
        corpo = fs.readFileSync(arquivo);
        if(caminho.endsWith(".html")){
            corpo = corpo.toString().replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[\d.]+/, "/__supabase.js").replace(/<script[^>]+cdn[^>]+><\/script>/g, "");
        }
        if(caminho.endsWith("helpers.js")){
            if(estado.erroHelpers){ res.writeHead(500); return res.end("erro"); }
            // servidor do GitHub atrasado: quem pede sem ?v= ainda recebe a versão velha
            const versao = (estado.versaoSemQuery && !url.search) ? estado.versaoSemQuery : estado.versao;
            corpo = corpo.toString().replace(/VERSAO_SISTEMA = "[^"]+"/, estado.helpersSemVersao ? 'X = "1"' : `VERSAO_SISTEMA = "${versao}"`);
        }
        if(caminho.endsWith("menu.js")){
            corpo = corpo.toString() + `\nwindow.__marca = "${estado.versao}";`;
        }
    }

    const etag = '"' + crypto.createHash("md5").update(corpo).digest("hex") + '"';
    const cabecalhos = { "Content-Type": tipos[path.extname(caminho)] || "text/plain", "Cache-Control": "max-age=600", "ETag": etag };
    if(req.headers["if-none-match"] === etag){ res.writeHead(304, cabecalhos); return res.end(); }
    res.writeHead(200, cabecalhos);
    res.end(corpo);
});

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

servidor.listen(0, "127.0.0.1", async () => {

    const base = `http://127.0.0.1:${servidor.address().port}`;
    const navegador = await chromium.launch({ channel: "chrome", headless: true });

    const novaAba = async (contexto, pagina) => {
        const p = await contexto.newPage();
        p.__recargas = 0;
        p.on("load", () => { p.__recargas++; });
        await p.goto(`${base}/${pagina}`);
        await p.waitForTimeout(400);
        return p;
    };

    const versaoDa = async (p) => { for(let i = 0; i < 30; i++){ try{ return await p.evaluate(() => VERSAO_SISTEMA); }catch(e){ await p.waitForTimeout(100); } } return null; };
    const marcaDa = async (p) => { for(let i = 0; i < 30; i++){ try{ return await p.evaluate(() => window.__marca); }catch(e){ await p.waitForTimeout(100); } } return null; };
    const verificar = (p) => p.evaluate(() => verificarVersaoSistema()).catch(() => {});
    const esperarVersao = async (p, v, ms = 6000) => {
        const fim = Date.now() + ms;
        while(Date.now() < fim){ try{ if(await p.evaluate(() => VERSAO_SISTEMA) === v){ await p.waitForLoadState("networkidle"); return true; } }catch(e){} await new Promise(r => setTimeout(r, 100)); }
        return false;
    };
    const publicar = (v) => { estado.versao = v; };

    let ctx = await navegador.newContext({ viewport: { width: 1300, height: 700 } });

    // ---------- o problema: o navegador guarda os arquivos ----------
    let a = await novaAba(ctx, "agenda.html");
    confere("carrega a versão publicada", (await versaoDa(a)) === "1.0.0");
    confere("em dia: sem aviso", !(await a.isVisible("#avisoNovaVersao")));
    publicar("2.0.0");
    const doCache = await a.evaluate(() => fetch("js/menu.js").then(r => r.text()));
    confere("controle: o navegador está mesmo usando o cache", doCache.includes('__marca = "1.0.0"'));

    // ---------- atualização sozinha ----------
    await verificar(a);
    confere("página parada atualiza sozinha", await esperarVersao(a, "2.0.0"), await versaoDa(a));
    confere("carregou também os outros arquivos novos", (await marcaDa(a)) === "2.0.0", await marcaDa(a));
    await a.waitForSelector("#toast.show", { timeout: 2000 }).catch(() => {});
    confere("avisa que atualizou", (await a.innerText("#toast")).includes("Sistema atualizado para v2.0.0"), await a.innerText("#toast"));
    await a.waitForTimeout(600);
    const recargas = a.__recargas;
    await verificar(a);
    await a.waitForTimeout(600);
    confere("depois de atualizado não recarrega de novo", a.__recargas === recargas, a.__recargas);
    confere("a tentativa foi limpa", (await a.evaluate(() => sessionStorage.getItem("sistemaTentativaAtualizacao"))) === null);

    // ---------- gatilho ao voltar para a aba ----------
    publicar("2.1.0");
    await a.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    confere("ao voltar para a aba, atualiza", await esperarVersao(a, "2.1.0"));

    // ---------- formulário aberto ----------
    publicar("3.0.0");
    await a.waitForTimeout(300);
    await a.evaluate(() => abrirModalAgenda());
    await a.evaluate(() => { ultimaAtividadeUsuario = 0; });
    await a.fill("#agCliente", "Digitando");
    await a.evaluate(() => { ultimaAtividadeUsuario = 0; });
    let antes = a.__recargas;
    await verificar(a);
    await a.waitForTimeout(800);
    confere("formulário aberto: não recarrega", a.__recargas === antes && (await a.inputValue("#agCliente")) === "Digitando");
    confere("formulário aberto: mostra o aviso", await a.isVisible("#avisoNovaVersao"));
    const textoAviso = await a.innerText("#avisoNovaVersao");
    confere("aviso diz a versão e o botão", textoAviso.includes("v3.0.0") && textoAviso.includes("Atualizar agora"), textoAviso);
    await a.screenshot({ path: path.join(saida, "50-aviso-versao.png") });
    await a.evaluate(() => { encerrarModalAgenda(); ultimaAtividadeUsuario = 0; tentarAtualizar(); });
    confere("fechou o formulário: atualiza", await esperarVersao(a, "3.0.0"));

    // ---------- usando agora ----------
    publicar("3.1.0");
    await a.waitForTimeout(300);
    await a.mouse.click(5, 5);
    antes = a.__recargas;
    await verificar(a);
    await a.waitForTimeout(500);
    confere("mexeu há pouco: espera", a.__recargas === antes && await a.isVisible("#avisoNovaVersao"));
    await a.evaluate(() => { ultimaAtividadeUsuario = Date.now() - 61000; tentarAtualizar(); });
    confere("parou 1 minuto: atualiza", await esperarVersao(a, "3.1.0"));

    // ---------- botão ----------
    publicar("3.2.0");
    await a.waitForTimeout(300);
    await a.mouse.click(5, 5);
    await verificar(a);
    await a.waitForTimeout(200);
    await a.click("#avisoNovaVersao button");
    confere("botão Atualizar agora", await esperarVersao(a, "3.2.0"));

    // ---------- aba escondida ----------
    publicar("3.3.0");
    await a.waitForTimeout(300);
    await a.mouse.click(5, 5);
    await a.evaluate(() => Object.defineProperty(document, "hidden", { configurable: true, get: () => true }));
    await verificar(a);
    confere("aba escondida não espera o minuto parado", await esperarVersao(a, "3.3.0"));
    await a.close();

    // ---------- trabalho não salvo em outras páginas ----------
    publicar("4.0.0");
    let p = await novaAba(ctx, "index.html");
    confere("index carregou (cache renovado ou sozinha)", await esperarVersao(p, "4.0.0"));
    publicar("4.1.0");
    await p.evaluate(() => { $("texto").value = "texto importante"; ultimaAtividadeUsuario = 0; });
    antes = p.__recargas;
    await verificar(p);
    await p.waitForTimeout(600);
    confere("conversor com texto: não perde", p.__recargas === antes && (await p.inputValue("#texto")) === "texto importante");
    await p.evaluate(() => { $("texto").value = ""; tentarAtualizar(); });
    confere("conversor vazio: atualiza", await esperarVersao(p, "4.1.0"));
    await p.close();

    p = await novaAba(ctx, "estoque.html");
    confere("estoque em dia", await esperarVersao(p, "4.1.0"));
    publicar("4.2.0");
    await p.evaluate(() => { previaAtual = { arquivo: "x" }; ultimaAtividadeUsuario = 0; });
    antes = p.__recargas;
    await verificar(p);
    await p.waitForTimeout(600);
    confere("prévia do estoque não publicada: espera", p.__recargas === antes && await p.isVisible("#avisoNovaVersao"));
    await p.evaluate(() => { previaAtual = null; tentarAtualizar(); });
    confere("cancelou a prévia: atualiza", await esperarVersao(p, "4.2.0"));
    await p.close();

    p = await novaAba(ctx, "tabelas.html");
    await esperarVersao(p, "4.2.0");
    publicar("4.3.0");
    await p.evaluate(() => {
        const linha = document.createElement("div"); linha.className = "linha-nova";
        const campo = document.createElement("input"); campo.id = "__novo"; campo.value = "digitado";
        linha.appendChild(campo); document.body.appendChild(linha);
        ultimaAtividadeUsuario = 0;
    });
    antes = p.__recargas;
    await verificar(p);
    await p.waitForTimeout(600);
    confere("tabelas com linha nova digitada: espera", p.__recargas === antes && (await p.inputValue("#__novo")) === "digitado");
    await p.close();

    // ---------- arquivo novo ainda não chegou em todos os servidores ----------
    publicar("5.0.0");
    estado.versaoSemQuery = "4.3.0";
    p = await novaAba(ctx, "WEG.html");
    await p.waitForTimeout(600);
    const recargasAtraso = p.__recargas;
    await verificar(p); await p.waitForTimeout(400);
    await verificar(p); await p.waitForTimeout(400);
    confere("servidor atrasado: não recarrega à toa", p.__recargas === recargasAtraso, p.__recargas);
    estado.versaoSemQuery = null;
    await verificar(p);
    confere("servidor em dia: atualiza", await esperarVersao(p, "5.0.0"));
    await p.close();

    // ---------- nunca recarrega sem parar ----------
    publicar("6.0.0");
    p = await novaAba(ctx, "admin.html");
    await esperarVersao(p, "6.0.0");
    await p.waitForTimeout(400);
    await p.evaluate(() => sessionStorage.setItem("sistemaTentativaAtualizacao", "7.0.0"));
    publicar("7.0.0");
    antes = p.__recargas;
    await verificar(p); await p.waitForTimeout(500);
    await verificar(p); await p.waitForTimeout(500);
    confere("já tentou esta versão: não entra em loop", p.__recargas === antes, p.__recargas);
    const manual = await p.innerText("#avisoNovaVersao");
    confere("orienta o CTRL+SHIFT+R", manual.includes("CTRL+SHIFT+R"), manual);
    await p.close();

    // ---------- falhas ----------
    const ctx2 = await navegador.newContext();
    publicar("8.0.0");
    p = await novaAba(ctx2, "index.html");
    const errosPagina = [];
    p.on("pageerror", e => errosPagina.push(e.message));
    estado.erroHelpers = true;
    antes = p.__recargas;
    await verificar(p); await p.waitForTimeout(300);
    confere("erro no servidor: fica como está", p.__recargas === antes && !(await p.isVisible("#avisoNovaVersao")));
    estado.erroHelpers = false;
    estado.helpersSemVersao = true;
    await verificar(p); await p.waitForTimeout(300);
    confere("arquivo sem versão: fica como está", p.__recargas === antes && !(await p.isVisible("#avisoNovaVersao")));
    estado.helpersSemVersao = false;
    await ctx2.setOffline(true);
    await verificar(p); await p.waitForTimeout(300);
    confere("sem internet: fica como está", p.__recargas === antes && errosPagina.length === 0, errosPagina);
    await ctx2.setOffline(false);

    // volta de versão também vale
    publicar("7.5.0");
    await verificar(p);
    confere("voltar para versão anterior também atualiza", await esperarVersao(p, "7.5.0"));
    await p.close();

    // ---------- todas as páginas ----------
    for(const pagina of ["index.html", "propostas.html", "agenda.html", "estoque.html", "tabelas.html", "WEG.html", "admin.html", "transportadoras.html", "leads.html"]){
        const ctx3 = await navegador.newContext();
        publicar("9.0.0");
        const q = await novaAba(ctx3, pagina);
        const erros = [];
        q.on("pageerror", e => erros.push(e.message));
        publicar("9.0.1");
        await q.evaluate(() => { ultimaAtividadeUsuario = 0; if(typeof $ === "function" && $("texto")) $("texto").value = ""; });
        await verificar(q);
        const ok = await esperarVersao(q, "9.0.1");
        confere(`${pagina}: atualiza sozinha`, ok && (await marcaDa(q)) === "9.0.1", erros);
        await ctx3.close();
    }
    confere("login não carrega o script (não tem helpers)", !fs.readFileSync(path.join(raiz, "login.html"), "utf8").includes("atualizacao-sistema"));

    // ---------- verificação de verdade pelo relógio: 2 minutos ----------
    const ctx4 = await navegador.newContext();
    publicar("10.0.0");
    const r = await novaAba(ctx4, "WEG.html");
    publicar("10.0.1");
    const fim = await esperarVersao(r, "10.0.1", 130000);
    confere("sem tocar em nada, atualiza em até 2 minutos", fim);
    await r.close();

    await navegador.close();
    servidor.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exit(falhas ? 1 : 0);
});
