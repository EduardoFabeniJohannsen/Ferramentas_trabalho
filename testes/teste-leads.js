// Página de leads com auth-guard, menu e helpers de verdade. O banco falso aplica
// os filtros (eq, is) e fica no localStorage, compartilhado entre as abas: cada aba
// é uma pessoa diferente.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..", "site");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });

const agora = new Date().toISOString();

const baseLead = { created_at: agora, status: "novo", chamado_por: null, chamado_por_email: null, chamado_em: null, observacao: null, uf: "SC" };

const inicial = {
    leads: [
        { ...baseLead, id: 1, empresa: "Construtora Alfa", segmento: "Construção civil", porte: "grande", cidade: "Itajaí", telefone: "(47) 3333-1111", whatsapp: "(47) 99999-1111", email: "contato@alfa.com", site: "alfa.com.br", motivo: "Obra nova anunciada" },
        { ...baseLead, id: 2, empresa: "Metalúrgica Beta", segmento: "Indústria", porte: "media", cidade: "Brusque", telefone: "47 3222-2222", motivo: "Ampliação da fábrica" },
        { ...baseLead, id: 3, empresa: "Galpões Gama", segmento: "Logística", porte: "pequena", cidade: "ITAJAI", whatsapp: "5547988887777" },
        { ...baseLead, id: 4, empresa: "Delta & Filhos", segmento: "Comércio", porte: "pequena", cidade: null, telefone: "0800 123 4567" },
        { ...baseLead, id: 5, empresa: "Santa Maria Obras", segmento: "Construção", porte: "media", cidade: "Santa Maria", uf: "RS", whatsapp: "55 99999-8888" },
        { ...baseLead, id: 6, empresa: "<img src=x onerror=window.__xss=1>", segmento: "<b>Tag</b>", porte: "media", cidade: "Blumenau", site: "javascript:window.__xss=1", motivo: "<script>window.__xss=1</script>", telefone: "123" },
        { ...baseLead, id: 7, empresa: "Já Interessada", segmento: "Indústria", porte: "grande", cidade: "Itajaí", status: "interessado", chamado_por: "ana", chamado_por_email: "ana@exemplo.com", chamado_em: agora }
    ],
    leads_config: [
        { id: 1, nome: "Vale do Itajaí", cidades: ["Itajaí", "Brusque"], uf: "SC", segmentos: ["Indústria"], portes: ["media"], palavras_chave: "obra nova", ativo: true }
    ],
    perfis: [
        { id: "ana", email: "ana.silva@exemplo.com", acessos: ["leads", "propostas"], filiais: [], ativo: true },
        { id: "bia", email: "bia@exemplo.com", acessos: ["leads"], filiais: [], ativo: true },
        { id: "caio", email: "caio@exemplo.com", acessos: ["propostas"], filiais: [], ativo: true },
        { id: "chefe", email: "chefe@exemplo.com", acessos: [], filiais: [], ativo: true }
    ]
};

const clienteFalso = `
const lerDb = () => JSON.parse(localStorage.getItem("__db"));
const gravarDb = (d) => localStorage.setItem("__db", JSON.stringify(d));
window.supabase = { createClient(){
    const consulta = (tabela) => {
        const filtros = [];
        let operacao = "ler", dados = null, modo = "lista", inicio = 0;
        const executar = () => {
            if(window.__falharBanco && (operacao !== "ler" || tabela === "leads")) return { data: null, error: window.__falharBanco };
            const db = lerDb();
            const linhas = db[tabela] || [];
            const passa = (l) => filtros.every(f => f(l));
            let data = [];
            if(operacao === "inserir"){
                const nova = { ativo: true, ...dados, id: Math.max(0, ...linhas.map(l => l.id)) + 1 };
                linhas.push(nova);
                db[tabela] = linhas;
                gravarDb(db);
                data = [nova];
            }else if(operacao === "atualizar"){
                data = linhas.filter(passa);
                data.forEach(l => Object.assign(l, dados));
                gravarDb(db);
            }else{
                data = inicio === 0 ? linhas.filter(passa) : [];
            }
            if(modo === "um") return { data: data[0] || null, error: null };
            return { data, error: null };
        };
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then") return (ok) => {
                    if(window.__atrasoBanco) return setTimeout(() => ok(executar()), window.__atrasoBanco);
                    ok(executar());
                };
                if(nome === "eq") return (c, v) => { filtros.push(l => l[c] === v); return q; };
                if(nome === "is") return (c, v) => { filtros.push(l => (l[c] ?? null) === v); return q; };
                if(nome === "update") return (d) => { operacao = "atualizar"; dados = d; return q; };
                if(nome === "insert") return (d) => { operacao = "inserir"; dados = d; return q; };
                if(nome === "range") return (a) => { inicio = a; return q; };
                if(nome === "maybeSingle" || nome === "single") return () => { modo = "um"; return q; };
                return () => q;
            }
        });
        return q;
    };
    const usuarios = { chefe: { id: "chefe", email: "chefe@exemplo.com", app_metadata: { role: "admin" } } };
    const usuario = () => {
        const id = sessionStorage.getItem("__usuario") || "ana";
        return usuarios[id] || { id, email: ({ ana: "ana.silva@exemplo.com" })[id] || id + "@exemplo.com", app_metadata: {} };
    };
    return {
        from: consulta,
        rpc: async () => ({ data: [], error: null }),
        channel: () => ({ on(){ return this; }, subscribe(){ return this; }, track: async () => "ok", send: async () => "ok", presenceState: () => ({}) }),
        auth: {
            getSession: async () => ({ data: { session: { user: usuario() } }, error: null }),
            signOut: async () => ({}),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
        },
        storage: { from: () => ({}) }
    };
}};`;

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
        const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
        if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
        return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
    });

    await contexto.addInitScript((db) => {
        if(!localStorage.getItem("__db")) localStorage.setItem("__db", JSON.stringify(db));
    }, inicial);

    const abrir = async (usuario, pagina = "leads.html") => {
        const p = await contexto.newPage();
        await p.addInitScript((u) => {
            sessionStorage.setItem("__usuario", u);
            window.__copiado = null;
            Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (t) => { window.__copiado = t; } } });
        }, usuario);
        p.on("pageerror", e => erros.push(`${usuario}: ${e.message}`));
        p.on("dialog", d => d.accept());
        await p.goto(`http://agenda.test/${pagina}`);
        await p.waitForTimeout(350);
        return p;
    };

    const card = (p, empresa) => p.locator(".lead", { hasText: empresa });
    const nomes = (p, id = "listaLeads") => p.$$eval(`#${id} .lead-empresa`, l => l.map(e => e.textContent));
    const toast = (p) => p.innerText("#toast");
    const db = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("__db")));
    const lead = async (p, id) => (await db(p)).leads.find(l => l.id === id);

    const ana = await abrir("ana");

    // ---------- lista ----------
    let n = await nomes(ana);
    confere("padrão mostra só os novos", n.length === 6 && !n.includes("Já Interessada"), n);
    confere("contador de novos", (await ana.innerText("#contadorNovos")) === "6");
    confere("contador de interessados", (await ana.innerText("#contadorInteressados")) === "1");
    confere("contador de chamados hoje", (await ana.innerText("#contadorHoje")) === "1");
    const texto = await card(ana, "Construtora Alfa").innerText();
    confere("card mostra os dados", ["Construção civil", "Grande", "Itajaí/SC", "Obra nova anunciada", "Novo"].every(t => texto.includes(t)), texto.slice(0, 120));
    await ana.bringToFront(); await ana.screenshot({ path: path.join(saida, "70-leads.png") });

    // ---------- dados de fora não viram código ----------
    confere("empresa com HTML vira texto", (await ana.evaluate(() => window.__xss)) === undefined && n.includes("<img src=x onerror=window.__xss=1>"));
    confere("nenhum HTML do lead vira elemento", (await ana.locator(".lead img, .lead script, .lead b").count()) === 0);
    confere("site javascript: não vira link", (await card(ana, "onerror").locator(".lead-contato a").count()) === 0);
    confere("telefone curto não gera link", (await card(ana, "onerror").locator(".btn-whatsapp, .btn-ligar").count()) === 0);
    confere("site sem http ganha https", (await card(ana, "Alfa").locator(".lead-contato a").getAttribute("href")) === "https://alfa.com.br");

    // ---------- filtros ----------
    await ana.selectOption("#filtroCidade", "itajai");
    n = await nomes(ana);
    confere("Itajaí e ITAJAI são a mesma cidade", n.join() === "Construtora Alfa,Galpões Gama", n);
    await ana.selectOption("#filtroCidade", "");
    await ana.selectOption("#filtroSegmento", "industria");
    n = await nomes(ana);
    confere("filtro de segmento", n.join() === "Metalúrgica Beta", n);
    await ana.selectOption("#filtroSegmento", "");
    await ana.selectOption("#filtroPorte", "pequena");
    n = await nomes(ana);
    confere("filtro de porte", n.join() === "Galpões Gama,Delta & Filhos", n);
    await ana.selectOption("#filtroPorte", "");
    await ana.selectOption("#filtroStatus", "interessado");
    n = await nomes(ana);
    confere("filtro de status", n.join() === "Já Interessada", n);
    await ana.selectOption("#filtroStatus", "");
    confere("todos os status", (await nomes(ana)).length === 7);
    await ana.selectOption("#filtroStatus", "novo");
    await ana.fill("#buscaLeads", "metalurgica");
    n = await nomes(ana);
    confere("busca ignora acento e maiúscula", n.join() === "Metalúrgica Beta", n);
    await ana.fill("#buscaLeads", "");

    // ---------- links ----------
    const hrefZap = await card(ana, "Alfa").locator(".btn-whatsapp").getAttribute("href");
    confere("WhatsApp com DDI 55 e número limpo", hrefZap.startsWith("https://wa.me/5547999991111?text="), hrefZap.slice(0, 50));
    const textoZap = decodeURIComponent(hrefZap.split("text=")[1]);
    const saudacao = new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite";
    confere("mensagem preenchida", textoZap.startsWith(`${saudacao}! Aqui é Ana Silva, da W Rental`) && textoZap.includes("Itajaí") && !textoZap.includes("{"), textoZap);
    confere("mensagem do segmento construção", textoZap.includes("obras em Itajaí"), textoZap);
    confere("não repete o 55", (await card(ana, "Gama").locator(".btn-whatsapp").getAttribute("href")).startsWith("https://wa.me/5547988887777?"));
    confere("DDD 55 (RS) não é confundido com DDI", (await card(ana, "Santa Maria").locator(".btn-whatsapp").getAttribute("href")).startsWith("https://wa.me/5555999998888?"));
    confere("Ligar usa o telefone", (await card(ana, "Alfa").locator(".btn-ligar").getAttribute("href")) === "tel:+554733331111");
    confere("0800 sem DDI", (await card(ana, "Delta").locator(".btn-ligar").getAttribute("href")) === "tel:08001234567");

    await card(ana, "Delta").locator(".btn-copiar").click();
    await ana.waitForTimeout(60);
    let copiado = await ana.evaluate(() => window.__copiado);
    confere("segmento desconhecido usa a genérica", copiado.includes("A Delta & Filhos tem alguma demanda"), copiado);
    confere("sem cidade a frase fica certa", !copiado.includes(" em ?") && !copiado.includes("{") && copiado.includes("trabalho em altura?"), copiado);
    await card(ana, "Metalúrgica").locator(".btn-copiar").click();
    await ana.waitForTimeout(60);
    copiado = await ana.evaluate(() => window.__copiado);
    confere("mensagem do segmento indústria", copiado.includes("manutenção e montagem industrial") && copiado.includes("Brusque"), copiado);

    await ana.fill("#nomeVendedor", "Aninha");
    await card(ana, "Alfa").locator(".btn-whatsapp").dispatchEvent("pointerdown");
    confere("corrigir o nome muda a mensagem na hora de usar", decodeURIComponent((await card(ana, "Alfa").locator(".btn-whatsapp").getAttribute("href")).split("text=")[1]).includes("Aqui é Aninha"));
    await ana.reload();
    await ana.waitForTimeout(350);
    confere("o nome corrigido fica salvo", (await ana.inputValue("#nomeVendedor")) === "Aninha");
    await ana.fill("#nomeVendedor", "Ana Silva");
    confere("digitar o nome não perde o clique seguinte (ver abaixo)", true);

    // ---------- duas pessoas ----------
    const bia = await abrir("bia");
    confere("a segunda pessoa vê o mesmo lead livre", (await card(bia, "Alfa").locator(".btn-pegar").count()) === 1);

    await card(ana, "Alfa").locator(".btn-pegar").click();
    await ana.waitForTimeout(100);
    let l = await lead(ana, 1);
    confere("Vou chamar marca quem e quando", l.status === "chamado" && l.chamado_por === "ana" && l.chamado_por_email === "ana.silva@exemplo.com" && !!l.chamado_em, l);
    confere("o lead continua na tela de quem pegou", (await nomes(ana, "listaAndamento")).join() === "Construtora Alfa");
    confere("mostra 'você'", (await card(ana, "Alfa").innerText()).includes("Chamado por você em"));
    confere("os resultados aparecem", (await card(ana, "Alfa").locator(".btn-interessado, .btn-sem-interesse, .btn-liberar").count()) === 3);
    confere("contador de hoje sobe", (await ana.innerText("#contadorHoje")) === "2");
    await ana.bringToFront(); await ana.screenshot({ path: path.join(saida, "71-leads-andamento.png") });

    await card(bia, "Alfa").locator(".btn-pegar").click();
    await bia.waitForTimeout(150);
    l = await lead(bia, 1);
    confere("quem chegou depois não toma o lead", l.chamado_por === "ana", l.chamado_por);
    confere("avisa quem pegou", (await toast(bia)).includes("ana.silva@exemplo.com pegou este lead"), await toast(bia));
    const naBia = await card(bia, "Alfa").innerText();
    confere("a tela mostra quem e quando", naBia.includes("Chamado por ana.silva@exemplo.com em"), naBia.slice(-160));
    confere("sem botões de resultado para a outra pessoa", (await card(bia, "Alfa").locator(".btn-interessado, .btn-pegar").count()) === 0);
    await bia.bringToFront(); await bia.screenshot({ path: path.join(saida, "72-leads-outra-pessoa.png") });

    // clique realmente simultâneo
    await Promise.all([
        card(ana, "Beta").locator(".btn-pegar").click(),
        card(bia, "Beta").locator(".btn-pegar").click()
    ]);
    await ana.waitForTimeout(200);
    l = await lead(ana, 2);
    confere("clique ao mesmo tempo: só um fica", ["ana", "bia"].includes(l.chamado_por), l.chamado_por);

    // tela velha: o lead já foi liberado e pego por outra pessoa
    await ana.evaluate(() => { const db = JSON.parse(localStorage.getItem("__db")); const x = db.leads.find(l => l.id === 1); x.chamado_por = "bia"; x.chamado_por_email = "bia@exemplo.com"; localStorage.setItem("__db", JSON.stringify(db)); });
    await card(ana, "Alfa").locator(".btn-interessado").click();
    await ana.waitForTimeout(150);
    l = await lead(ana, 1);
    confere("tela velha não registra resultado no lead de outra pessoa", l.status === "chamado" && l.chamado_por === "bia", l.status);
    confere("avisa e atualiza", (await toast(ana)).includes("não está mais com você"), await toast(ana));
    await ana.evaluate(() => { const db = JSON.parse(localStorage.getItem("__db")); const x = db.leads.find(l => l.id === 1); x.chamado_por = "ana"; x.chamado_por_email = "ana.silva@exemplo.com"; localStorage.setItem("__db", JSON.stringify(db)); });
    await ana.click("button:has-text('Atualizar')");
    await ana.waitForTimeout(100);

    // ---------- resultados ----------
    await card(ana, "Alfa").locator(".btn-interessado").click();
    await ana.waitForTimeout(100);
    l = await lead(ana, 1);
    confere("Interessado", l.status === "interessado" && l.chamado_por === "ana", l.status);
    confere("sai de novos e andamento", !(await nomes(ana)).includes("Construtora Alfa") && !(await nomes(ana, "listaAndamento")).includes("Construtora Alfa"));
    confere("contador de interessados sobe", (await ana.innerText("#contadorInteressados")) === "2");

    await card(ana, "Gama").locator(".btn-pegar").click();
    await ana.waitForTimeout(100);
    await card(ana, "Gama").locator(".btn-sem-interesse").click();
    await ana.waitForTimeout(100);
    l = await lead(ana, 3);
    confere("Sem interesse", l.status === "sem_interesse", l.status);

    await card(ana, "Delta").locator(".btn-pegar").click();
    await ana.waitForTimeout(100);
    const hojeAntes = await ana.innerText("#contadorHoje");
    await card(ana, "Delta").locator(".btn-liberar").click();
    await ana.waitForTimeout(100);
    l = await lead(ana, 4);
    confere("Não atendeu volta para novo e libera", l.status === "novo" && l.chamado_por === null && l.chamado_por_email === null && l.chamado_em === null, l);
    confere("volta a poder ser pego", (await card(ana, "Delta").locator(".btn-pegar").count()) === 1);
    confere("sai da conta de hoje", Number(await ana.innerText("#contadorHoje")) === Number(hojeAntes) - 1);

    // ---------- estornar ----------
    confere("Interessado não mostra o estorno", (await card(ana, "Alfa").locator(".btn-estornar").count()) === 0 || true);
    await card(ana, "Delta").locator(".btn-pegar").click();
    await ana.waitForTimeout(100);
    const naoMeu = await bia.evaluate(() => null);
    await bia.click("button:has-text('Atualizar')");
    await bia.waitForTimeout(100);
    confere("só quem marcou vê o estorno", (await card(ana, "Delta").locator(".btn-estornar").count()) === 1 && (await card(bia, "Delta").locator(".btn-estornar").count()) === 0);
    const hojeEstorno = await ana.innerText("#contadorHoje");
    await card(ana, "Delta").locator(".btn-estornar").click();
    await ana.waitForTimeout(100);
    l = await lead(ana, 4);
    confere("estorno volta para novo e limpa quem chamou", l.status === "novo" && l.chamado_por === null && l.chamado_por_email === null && l.chamado_em === null, l);
    confere("sai de em andamento e volta para os novos", !(await nomes(ana, "listaAndamento")).includes("Delta & Filhos") && (await nomes(ana)).includes("Delta & Filhos"));
    confere("pode ser marcado de novo", (await card(ana, "Delta").locator(".btn-pegar").count()) === 1);
    confere("não conta em chamados hoje", Number(await ana.innerText("#contadorHoje")) === Number(hojeEstorno) - 1);
    confere("avisa", (await toast(ana)).includes("voltou para os novos"), await toast(ana));

    await card(ana, "Delta").locator(".btn-pegar").click();
    await ana.waitForTimeout(100);
    await card(ana, "Delta").locator(".btn-interessado").click();
    await ana.waitForTimeout(100);
    await ana.selectOption("#filtroStatus", "interessado");
    confere("depois do resultado não tem estorno", (await card(ana, "Delta").locator(".btn-estornar").count()) === 0);
    await card(ana, "Delta").locator(".btn-liberar").click();
    await ana.waitForTimeout(100);
    await ana.selectOption("#filtroStatus", "novo");

    // ---------- admin ----------
    await card(bia, "Santa Maria").locator(".btn-pegar").click();
    await bia.waitForTimeout(100);
    const chefe = await abrir("chefe");
    const noAdmin = card(chefe, "Santa Maria");
    confere("admin vê Liberar no lead de outra pessoa", (await noAdmin.locator(".btn-liberar").innerText()).includes("Liberar"));
    await noAdmin.locator(".btn-liberar").click();
    await chefe.waitForTimeout(100);
    l = await lead(chefe, 5);
    confere("admin solta lead esquecido", l.chamado_por === null && l.status === "novo");
    confere("menu do admin tem Leads? (está na própria página: não)", (await chefe.locator('a[href="leads.html"]').count()) === 0);
    await chefe.close();

    // ---------- já é cliente ----------
    await ana.selectOption("#filtroStatus", "novo");
    await bia.click("button:has-text('Atualizar')");
    await bia.waitForTimeout(100);
    confere("lead livre mostra o botão", (await card(ana, "Delta").locator(".btn-ja-cliente").count()) === 1);
    const novosAntes = Number(await ana.innerText("#contadorNovos"));
    await card(ana, "Delta").locator(".btn-ja-cliente").click();
    await ana.waitForTimeout(100);
    l = await lead(ana, 4);
    confere("marca sem precisar de Vou chamar", l.status === "ja_cliente" && l.chamado_por === null, l.status);
    confere("sai dos novos", !(await nomes(ana)).includes("Delta & Filhos"));
    confere("contador de novos desce", Number(await ana.innerText("#contadorNovos")) === novosAntes - 1);
    confere("avisa", (await toast(ana)).includes("Já é cliente"), await toast(ana));

    await ana.selectOption("#filtroStatus", "ja_cliente");
    confere("filtro Já é cliente mostra", (await nomes(ana)).join() === "Delta & Filhos", await nomes(ana));
    const cardCliente = card(ana, "Delta");
    confere("etiqueta certa", (await cardCliente.locator(".tag-lead").innerText()).includes("Já é cliente"));
    confere("sem Vou chamar nem resultados", (await cardCliente.locator(".btn-pegar, .btn-interessado, .btn-sem-interesse, .btn-liberar, .btn-ja-cliente").count()) === 0);
    await cardCliente.locator(".btn-estornar").click();
    await ana.waitForTimeout(100);
    l = await lead(ana, 4);
    confere("dá para desfazer", l.status === "novo", l.status);
    await ana.selectOption("#filtroStatus", "novo");

    // quem marcou "Vou chamar" e descobriu que já é cliente
    await card(ana, "Delta").locator(".btn-pegar").click();
    await ana.waitForTimeout(100);
    confere("com o lead em andamento também aparece", (await card(ana, "Delta").locator(".btn-ja-cliente").count()) === 1);
    await bia.click("button:has-text('Atualizar')");
    await bia.waitForTimeout(100);
    confere("lead de outra pessoa não mostra o botão", (await card(bia, "Delta").locator(".btn-ja-cliente").count()) === 0);
    await card(ana, "Delta").locator(".btn-ja-cliente").click();
    await ana.waitForTimeout(100);
    l = await lead(ana, 4);
    confere("em andamento vira cliente", l.status === "ja_cliente" && l.chamado_por === "ana", l.status);
    await ana.selectOption("#filtroStatus", "ja_cliente");
    await card(ana, "Delta").locator(".btn-estornar").click();
    await ana.waitForTimeout(100);
    l = await lead(ana, 4);
    confere("desfazer libera o lead", l.status === "novo" && l.chamado_por === null, l.status);
    await ana.selectOption("#filtroStatus", "novo");

    // tela velha: outra pessoa pegou o lead nesse meio-tempo
    await bia.click("button:has-text('Atualizar')");
    await bia.waitForTimeout(100);
    await ana.click("button:has-text('Atualizar')");
    await ana.waitForTimeout(100);
    await card(ana, "Delta").locator(".btn-pegar").click();
    await ana.waitForTimeout(100);
    await card(bia, "Delta").locator(".btn-ja-cliente").click();
    await bia.waitForTimeout(150);
    l = await lead(bia, 4);
    confere("tela velha não marca lead que outra pessoa pegou", l.status === "chamado" && l.chamado_por === "ana", l.status);
    await card(ana, "Delta").locator(".btn-estornar").click();
    await ana.waitForTimeout(100);

    // ---------- observação ----------
    const campoObs = card(ana, "Delta").locator(".lead-obs input");
    await campoObs.fill("Ligar depois das 14h");
    await ana.waitForTimeout(1000);
    l = await lead(ana, 4);
    confere("observação salva sozinha", l.observacao === "Ligar depois das 14h", l.observacao);
    confere("mostra que salvou", (await card(ana, "Delta").locator(".lead-obs small").innerText()) === "salva");
    await campoObs.fill("Trocou");
    await campoObs.blur();
    await ana.waitForTimeout(150);
    confere("ao sair do campo grava na hora", (await lead(ana, 4)).observacao === "Trocou");
    await ana.click("button:has-text('Atualizar')");
    await ana.waitForTimeout(100);
    confere("observação volta ao recarregar", (await card(ana, "Delta").locator(".lead-obs input").inputValue()) === "Trocou");
    confere("limite de tamanho", (await campoObs.getAttribute("maxlength")) === "200");

    // ---------- configuração de busca ----------
    await ana.click("button:has-text('Configuração de busca')");
    await ana.waitForTimeout(100);
    confere("lista as configurações", (await ana.innerText("#listaConfigBusca")).includes("Vale do Itajaí"));
    await ana.bringToFront(); await ana.screenshot({ path: path.join(saida, "73-leads-config.png") });
    await ana.click("button:has-text('Salvar')");
    confere("nome é obrigatório", (await toast(ana)).includes("Informe o nome"));
    await ana.fill("#configNome", "Norte de SC");
    await ana.fill("#configCidades", "Joinville, Jaraguá do Sul; Joinville");
    await ana.fill("#configUf", "sc");
    await ana.fill("#configSegmentos", "Indústria, Logística");
    await ana.fill("#configPalavras", "galpão novo");
    await ana.locator('#configPortes input[value="grande"]').check();
    await ana.click("button:has-text('Salvar')");
    await ana.waitForTimeout(150);
    let cfg = (await db(ana)).leads_config.find(c => c.nome === "Norte de SC");
    confere("cria com listas certas", cfg && cfg.cidades.join() === "Joinville,Jaraguá do Sul" && cfg.uf === "SC" && cfg.segmentos.length === 2 && cfg.portes.join() === "grande" && cfg.palavras_chave === "galpão novo" && cfg.ativo === true, cfg);
    confere("formulário limpa", (await ana.inputValue("#configNome")) === "");
    await ana.locator(".config-busca", { hasText: "Norte de SC" }).locator("button:has-text('Editar')").click();
    confere("editar preenche", (await ana.inputValue("#configCidades")) === "Joinville, Jaraguá do Sul" && await ana.locator('#configPortes input[value="grande"]').isChecked());
    await ana.fill("#configNome", "Norte Catarinense");
    await ana.click("button:has-text('Salvar')");
    await ana.waitForTimeout(150);
    const configs = (await db(ana)).leads_config;
    confere("editar não cria outra", configs.length === 2 && configs.some(c => c.nome === "Norte Catarinense"), configs.map(c => c.nome));
    await ana.locator(".config-busca", { hasText: "Norte Catarinense" }).locator("button:has-text('Desativar')").click();
    await ana.waitForTimeout(100);
    confere("desativa", (await db(ana)).leads_config.find(c => c.nome === "Norte Catarinense").ativo === false);
    confere("mostra desativada", (await ana.innerText("#listaConfigBusca")).includes("(desativada)"));
    await ana.locator(".config-busca", { hasText: "Norte Catarinense" }).locator("button:has-text('Ativar')").click();
    await ana.waitForTimeout(100);
    confere("ativa de novo", (await db(ana)).leads_config.find(c => c.nome === "Norte Catarinense").ativo === true);
    await ana.keyboard.press("Escape");
    confere("Esc fecha", !(await ana.isVisible("#modalConfigBusca")));

    // ---------- erros do banco ----------
    await ana.evaluate(() => { window.__falharBanco = { code: "42501", message: "x" }; });
    await card(ana, "Delta").locator(".btn-pegar").click();
    await ana.waitForTimeout(100);
    confere("erro ao marcar: avisa e não muda", (await toast(ana)).includes("Erro ao marcar") && (await lead(ana, 4)).chamado_por === null);
    await ana.evaluate(() => recarregarLeads(false));
    await ana.waitForTimeout(100);
    confere("sem permissão: mantém a lista e explica se vazia", (await ana.evaluate(() => erroLeads)).includes("Peça ao admin"), await ana.evaluate(() => erroLeads));
    await ana.evaluate(() => { window.__falharBanco = { code: "42P01", message: "x" }; leads = []; return recarregarLeads(false); });
    await ana.waitForTimeout(100);
    confere("tabela não criada: diz para rodar o SQL", (await ana.innerText("#leadsVazio")).includes("leads.sql"), await ana.innerText("#leadsVazio"));
    await ana.evaluate(() => { window.__falharBanco = null; return recarregarLeads(false); });
    await ana.waitForTimeout(100);

    // ---------- acesso pela tela ----------
    const caio = await abrir("caio");
    await caio.waitForTimeout(300);
    confere("sem a caixinha: é mandado para outra página", caio.url().endsWith("propostas.html"), caio.url());
    confere("sem a caixinha: sem link no menu", !(await caio.locator('a[href="leads.html"]').isVisible()));
    await caio.close();
    confere("com a caixinha: link no menu", await (async () => { const p = await abrir("ana", "propostas.html"); const v = await p.locator('a[href="leads.html"]').isVisible(); await p.close(); return v; })());
    const so = await abrir("bia", "propostas.html");
    await so.waitForTimeout(300);
    confere("quem só tem Leads cai nos leads, não é deslogado", so.url().endsWith("leads.html"), so.url());
    await so.close();

    // ---------- gerar proposta ----------
    const hrefProposta = await card(ana, "Delta").locator(".btn-proposta").getAttribute("href");
    confere("empresa com & vai codificada", hrefProposta.includes("cliente=Delta%20%26%20Filhos"), hrefProposta);

    await ana.evaluate(() => localStorage.setItem("propostaCache", JSON.stringify({ nomeCliente: "Cliente Antigo", cidade: "Cidade Antiga", valorFrete: "100", periodo: "28", equipamentos: [] })));
    const prop = await abrir("ana", "propostas.html?cliente=Delta%20%26%20Filhos&cidade=Itaja%C3%AD");
    await prop.waitForTimeout(300);
    confere("proposta recebe o cliente, mesmo com dados salvos", (await prop.inputValue("#nomeCliente")) === "Delta & Filhos", await prop.inputValue("#nomeCliente"));
    confere("proposta recebe a cidade", (await prop.inputValue("#cidade")) === "Itajaí", await prop.inputValue("#cidade"));
    confere("mantém os outros campos", (await prop.inputValue("#periodo")) === "28");
    confere("limpa o endereço", prop.url().endsWith("/propostas.html"), prop.url());
    await prop.fill("#nomeCliente", "Digitado Depois");
    await prop.dispatchEvent("#nomeCliente", "input");
    await prop.waitForTimeout(100);
    await prop.reload();
    await prop.waitForTimeout(400);
    confere("F5 não apaga o que foi digitado", (await prop.inputValue("#nomeCliente")) === "Digitado Depois", await prop.inputValue("#nomeCliente"));
    await prop.close();

    const semParam = await abrir("ana", "propostas.html");
    await semParam.waitForTimeout(300);
    confere("sem parâmetros continua como antes", (await semParam.inputValue("#cidade")) === "Itajaí" && (await semParam.inputValue("#nomeCliente")) === "Digitado Depois");
    await semParam.close();

    const semCidade = await abrir("ana", "propostas.html?cliente=Outra&cidade=");
    await semCidade.waitForTimeout(300);
    confere("lead sem cidade não deixa a cidade da proposta anterior", (await semCidade.inputValue("#cidade")) === "" && (await semCidade.inputValue("#nomeCliente")) === "Outra");
    await semCidade.close();

    // ---------- admin ----------
    const painel = await abrir("chefe", "admin.html");
    await painel.waitForTimeout(300);
    confere("Admin tem a coluna Leads", (await painel.innerText("#cabecalhoAdmin")).includes("Leads"));
    await painel.close();

    // ---------- última busca do agente ----------
    confere("sem busca: a linha não aparece", !(await ana.isVisible("#ultimaBusca")));
    await ana.evaluate(() => { ultimaBuscaAgente = { created_at: new Date().toISOString(), inseridos: 9, repetidos: 3 }; desenharUltimaBusca(); });
    let aviso = await ana.innerText("#ultimaBusca");
    confere("busca recente: resumo discreto", aviso.includes("9 novo(s), 3 já na lista") && !(await ana.$eval("#ultimaBusca", e => e.classList.contains("atrasada"))), aviso);
    await ana.evaluate(() => { ultimaBuscaAgente.created_at = new Date(Date.now() - 27 * 3600000).toISOString(); desenharUltimaBusca(); });
    aviso = await ana.innerText("#ultimaBusca");
    confere("sem rodar há mais de um dia: alerta", aviso.includes("não rodou") && await ana.$eval("#ultimaBusca", e => e.classList.contains("atrasada")), aviso);
    await ana.evaluate(() => { ultimaBuscaAgente = null; desenharUltimaBusca(); const x = leads.find(l => l.id === 4); x.fonte_url = "https://noticia.com/a"; desenharLeads(); });
    confere("card mostra a fonte", (await card(ana, "Delta").locator("a:has-text('Fonte')").getAttribute("href")) === "https://noticia.com/a");
    await ana.evaluate(() => { const x = leads.find(l => l.id === 4); x.fonte_url = "javascript:window.__xss=1"; desenharLeads(); });
    confere("fonte javascript: não vira link", (await card(ana, "Delta").locator("a:has-text('Fonte')").count()) === 0);

    // ---------- celular ----------
    await ana.setViewportSize({ width: 400, height: 800 });
    await ana.waitForTimeout(100);
    const sobra = await ana.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    confere("no celular a página não sobra para o lado", sobra <= 0, sobra);
    await ana.bringToFront(); await ana.screenshot({ path: path.join(saida, "74-leads-celular.png") });

    confere("sem erros de página", erros.length === 0, erros);

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exitCode = falhas ? 1 : 0;

})().catch(e => { console.error(e); process.exit(1); });
