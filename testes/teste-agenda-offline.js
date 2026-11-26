// Agenda sem internet (agenda-offline-dados/fila/tela.js e site/sw.js): a página abre sem
// internet pelo service worker, mostra a cópia guardada no aparelho, guarda numa fila o que
// foi salvo, trocado e excluído, e sobe tudo quando a internet volta: sem gravar duas vezes
// o mesmo agendamento (id_local) e sem passar por cima do que outra pessoa mudou no mesmo campo.
// Servidor de verdade em 127.0.0.1 (o navegador só liga o service worker em https ou no
// próprio computador). O "Supabase" também é simulado nele (/__supabase): derrubar o
// servidor é o mesmo que ficar sem internet. Nada aqui sai para a internet.
const { chromium } = require("playwright-core");
const http = require("http");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..", "site");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });

const dia = (n) => {
    const data = new Date();
    data.setDate(data.getDate() + n);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
};

const base = { status: "Confirmado", periodo: "28 dias", frete_conta: "nossa", excluido_em: null, id_local: null };

const linhasIniciais = () => [
    { ...base, id: 1, tipo: "Entrega", data: dia(0), horario: "08:00", plataforma: "WAE18R001", cliente: "Construtora Alfa", proposta: "1", transportadora: "Trans A" },
    { ...base, id: 2, tipo: "Coleta", data: dia(0), horario: "10:00", plataforma: "WTE12R002", cliente: "Beta Ltda", proposta: "2" },
    { ...base, id: 3, tipo: "Coleta", data: dia(1), horario: "14:00", plataforma: "WAE15R003", cliente: "Delta", proposta: "3", obs_entrega: "portão azul" }
];

// ---------- o "banco" do servidor ----------
const banco = { agendamentos: linhasIniciais(), proximoId: 100, chamadas: [], semIdLocal: false, perderResposta: false, recusar: null };

const executar = (p) => {

    if(p.rpc){
        if(p.rpc !== "mover_agendamento_lixeira") return { data: null, error: null };
        const linha = banco.agendamentos.find(l => l.id === p.args.p_id && !l.excluido_em);
        if(linha) linha.excluido_em = new Date().toISOString();
        return { data: !!linha, error: null };
    }

    const tabela =
        p.tabela === "agendamentos" ? banco.agendamentos :
        p.tabela === "transportadoras" ? [{ id: 1, nome: "Trans A" }] :
        p.tabela === "motoristas" ? [{ id: 1, transportadora: "Trans A", nome: "João" }] :
        p.tabela === "perfis" ? [{ id: "u1", acessos: ["agenda"], filiais: [], ativo: true }] : [];

    const filtradas = () => tabela.filter(l => p.filtros.every(([tipo, coluna, valor]) => (l[coluna] ?? null) === valor || tipo === "outro"));

    if(p.acao === "insert"){
        if(banco.semIdLocal && "id_local" in p.valores){
            return { data: null, error: { code: "PGRST204", message: "Could not find the 'id_local' column of 'agendamentos' in the schema cache", details: "", hint: "" } };
        }
        if(p.valores.id_local && banco.agendamentos.some(l => l.id_local === p.valores.id_local)){
            return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint \"agendamentos_id_local_key\"", details: `Key (id_local)=(${p.valores.id_local}) already exists.`, hint: "" } };
        }
        const nova = { ...base, id: banco.proximoId++, ...p.valores };
        banco.agendamentos.push(nova);
        return { data: p.unico ? nova : [nova], error: null };
    }

    if(p.acao === "update"){
        const alvo = filtradas();
        if(banco.recusar && alvo.some(l => l.id === banco.recusar)){
            return { data: null, error: { code: "42501", message: "new row violates row-level security policy for table \"agendamentos\"", details: "", hint: "" } };
        }
        alvo.forEach(l => Object.assign(l, p.valores));
        return { data: alvo, error: null };
    }

    const resultado = p.inicio ? [] : filtradas();
    if(p.unico === "maybe") return { data: resultado[0] || null, error: null };
    if(p.unico === "single") return { data: resultado[0] || null, error: null };
    return { data: resultado, error: null };
};

// o supabase-js da página: manda cada consulta para /__supabase (falha de rede vira o
// mesmo erro que o supabase-js de verdade devolve)
const clienteFalso = `
window.supabase = { createClient(){
    const chamar = async (pedido) => {
        try{
            const resposta = await fetch("/__supabase", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(pedido) });
            return await resposta.json();
        }catch(erro){
            return { data: null, error: { message: erro.name + ": " + erro.message, details: "", hint: "", code: "" } };
        }
    };
    const consulta = (tabela) => {
        const pedido = { tabela, acao: "select", filtros: [], valores: null, unico: "", inicio: 0 };
        const q = new Proxy({}, { get(_, nome){
            if(nome === "then") return (ok, falha) => chamar(pedido).then(ok, falha);
            if(nome === "insert" || nome === "update") return (valores) => { pedido.acao = nome; pedido.valores = valores; return q; };
            if(nome === "eq") return (coluna, valor) => { pedido.filtros.push(["eq", coluna, valor]); return q; };
            if(nome === "is") return (coluna, valor) => { pedido.filtros.push(["is", coluna, valor]); return q; };
            if(nome === "single") return () => { pedido.unico = "single"; return q; };
            if(nome === "maybeSingle") return () => { pedido.unico = "maybe"; return q; };
            if(nome === "range") return (inicio) => { pedido.inicio = inicio; return q; };
            return () => q;
        } });
        return q;
    };
    return {
        from: consulta,
        rpc: (nome, args) => ({ then: (ok, falha) => chamar({ rpc: nome, args }).then(ok, falha) }),
        channel: () => ({ on(){ return this; }, subscribe(){ return this; }, track: async () => "ok", untrack: async () => "ok", send: async () => "ok", presenceState: () => ({}) }),
        removeChannel(){},
        auth: {
            // login vencido sem internet: o supabase-js fica 30 s tentando renovar
            getSession: async () => {
                if(localStorage.getItem("__loginVencido") === "1" && !navigator.onLine){
                    await new Promise(pronto => setTimeout(pronto, 30000));
                    return { data: { session: null }, error: { name: "AuthRetryableFetchError", message: "Failed to fetch" } };
                }
                return { data: { session: { user: { id: "u1", email: "t@t", app_metadata: {} } } }, error: null };
            },
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } }),
            signOut: async () => ({ error: null })
        },
        storage: { from: () => ({ remove: async () => ({}), upload: async () => ({}), createSignedUrl: async () => ({ data: { signedUrl: "#" } }) }) }
    };
}};`;

const authFalso = `
function ehAdmin(){ return Promise.resolve(false); }
function temAcesso(){ return true; }
function temFilial(){ return true; }
function existeLoginSalvo(){ return true; }
function carregarPerfil(){ return Promise.resolve({}); }
function fazerLogout(){}
function recursoDaPagina(){ return "agenda"; }
function nomeArquivoAtual(){ return "agenda.html"; }`;

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2" };

// fora = sem internet (derruba toda conexão, como o celular sem sinal)
let fora = false;

// true = o auth-guard.js de verdade (a abertura com o login vencido)
let authReal = false;

const servidor = http.createServer((pedido, resposta) => {

    if(fora) return pedido.socket.destroy();

    const url = new URL(pedido.url, "http://x");

    if(url.pathname === "/__supabase"){
        let corpo = "";
        pedido.on("data", parte => { corpo += parte; });
        pedido.on("end", () => {
            const p = JSON.parse(corpo);
            banco.chamadas.push(p);
            const resultado = executar(p);
            // gravou, mas a resposta se perdeu no caminho (sinal caiu). Vale até o teste
            // desligar: o Chrome repete sozinho o POST que ficou sem resposta
            if(banco.perderResposta && p.acao === "insert") return pedido.socket.destroy();
            resposta.writeHead(200, { "content-type": "application/json" });
            resposta.end(JSON.stringify(resultado));
        });
        return;
    }

    if(url.pathname.endsWith("/vendor/supabase-2.45.0.js")){
        resposta.writeHead(200, { "content-type": "text/javascript" });
        return resposta.end(clienteFalso);
    }

    if(url.pathname.endsWith("/auth-guard.js") && !authReal){
        resposta.writeHead(200, { "content-type": "text/javascript" });
        return resposta.end(authFalso);
    }

    const arquivo = path.join(raiz, decodeURIComponent(url.pathname));

    if(!arquivo.startsWith(raiz) || !fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()){
        resposta.writeHead(404);
        return resposta.end("");
    }

    resposta.writeHead(200, { "content-type": tipos[path.extname(arquivo)] || "text/plain" });
    resposta.end(fs.readFileSync(arquivo));
});

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

let navegador = null;

(async () => {

    await new Promise(resolve => servidor.listen(0, "127.0.0.1", resolve));
    const endereco = `http://127.0.0.1:${servidor.address().port}/agenda.html`;

    navegador = await chromium.launch({ channel: "chrome", headless: true });
    const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    // fora do 127.0.0.1 (Google, cidade pelo IP): nada sai
    await contexto.route(/^https?:\/\/(?!127\.0\.0\.1)/, rota => rota.abort());

    const pagina = await contexto.newPage();
    const erros = [];
    pagina.on("pageerror", e => erros.push(e.message));
    // antivírus (ex: Kaspersky) que mexe nas páginas http do próprio computador: põe um
    // script dele e emenda a CSP ("'form-action' contains 'child-src'"). Não é da página
    const doAntivirus = /kaspersky|'child-src' as a source expression/i;
    pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_|Failed to load resource/.test(m.text()) && !doAntivirus.test(m.text())) erros.push(m.text()); });

    // janelas de confirmar/avisar: guarda o texto e responde o que o teste mandar
    const dialogos = [];
    let respostas = [];
    pagina.on("dialog", d => { dialogos.push(d.message()); const sim = respostas.length ? respostas.shift() : true; (sim ? d.accept() : d.dismiss()).catch(() => {}); });

    const esperar = async (condicao, arg, ms = 8000) => {
        const fim = Date.now() + ms;
        while(Date.now() < fim){
            if(await pagina.evaluate(condicao, arg).catch(() => false)) return true;
            await pagina.waitForTimeout(100);
        }
        return false;
    };
    const aviso = () => pagina.evaluate(() => { const b = $("btnOffline"); return b.style.display === "none" ? "" : b.textContent; });
    const toast = () => pagina.innerText("#toast");
    const fila = () => pagina.evaluate(async () => (await lerFilaOffline()).itens.map(e => ({ acao: e.acao, id: e.id, dados: e.dados, antes: e.antes, erro: e.erro, idLocal: e.idLocal })));
    const naTela = () => pagina.evaluate(() => agendamentos.map(a => ({ id: a.id, cliente: a.cliente, status: a.status, horario: a.horario, pendente: !!a.pendenteOffline })));
    const filaVazia = () => esperar(() => !enviandoFilaOffline && filaOffline.itens.length === 0);
    const sincronizar = async () => { await pagina.evaluate(() => enviarFilaOffline(false)); return filaVazia(); };

    // ---------- 1. com internet: abre, guarda a cópia e prepara o site sem internet ----------
    await pagina.goto(endereco);
    await pagina.waitForSelector("tr.ag-item");
    confere("com internet: sem aviso de conexão", (await aviso()) === "", await aviso());

    const controlada = await esperar(() => !!navigator.serviceWorker.controller, null, 15000);
    confere("o service worker (sw.js) assume a página", controlada);
    const guardados = await esperar(async () => {
        const chaves = (await (await caches.open("site-offline-v1")).keys()).map(r => new URL(r.url).pathname);
        return ["/agenda.html", "/js/helpers.js", "/js/agenda/agenda-init.js", "/js/vendor/supabase-2.45.0.js", "/css/agenda-celular.css", "/icon.png", "/fonts/inter-latin-wght-normal.woff2"].every(c => chaves.includes(c));
    }, null, 15000);
    confere("ao instalar, guarda a agenda.html e os arquivos dela (scripts, CSS, ícone e fonte)", guardados);
    confere("guarda no aparelho a cópia da agenda, dos motoristas e das transportadoras", await esperar(async () =>
        (await lerCopiaOffline("agenda"))?.valor.length === 3 && (await lerCopiaOffline("motoristas"))?.valor.length === 1 && (await lerCopiaOffline("transportadoras"))?.valor.length === 1));

    // ---------- 2. sem internet: a página abre pela cópia ----------
    fora = true;
    await pagina.reload();
    await pagina.waitForSelector("tr.ag-item", { timeout: 15000 }).catch(() => {});
    const semRede = await naTela();
    confere("sem internet: a página abre (arquivos do service worker)", await pagina.evaluate(() => typeof iniciarOffline === "function"));
    confere("sem internet: a agenda mostra a cópia do aparelho", semRede.length === 3, semRede);
    confere("sem internet: o aviso diz de quando são os dados", /Sem conexão · dados de \d\d:\d\d/.test(await aviso()), await aviso());
    confere("sem internet: não aparece erro de carregar a agenda", !(await pagina.innerText("#listaAgenda")).includes("Não foi possível carregar"));
    confere("sem internet: a transportadora vem da cópia", await pagina.evaluate(() => TRANSPORTADORAS.includes("Trans A")));

    // ---------- 3. sem internet: novo agendamento pelo formulário ----------
    const chamadasAntes = banco.chamadas.length;
    await pagina.evaluate(() => abrirModalAgenda());
    await pagina.selectOption("#agTipo", "Coleta");
    await pagina.locator("#listaPlataformas .ag-plataforma-item").first().fill("WAE18R050");
    await pagina.fill("#agCliente", "Cliente Novo");
    await pagina.fill("#agProposta", "777");
    await pagina.fill("#agPeriodo", "28");
    await pagina.click("#btnSalvarAgenda");
    await esperar(() => !$("modalAgenda").classList.contains("aberto"));
    confere("salvar sem internet: avisa que ficou no aparelho", (await toast()).includes("Agendamento salvo neste aparelho: sobe quando a internet voltar"), await toast());
    let f = await fila();
    confere("salvar sem internet: entra na fila com o id_local", f.length === 1 && f[0].acao === "inserir" && f[0].id === `local-${f[0].idLocal}` && f[0].dados.cliente === "Cliente Novo", f);
    confere("salvar sem internet: aparece na lista com a marca ⏳", await pagina.locator("tr.ag-offline .ag-offline-marca").first().innerText().then(t => t.includes("só neste aparelho")).catch(() => false));
    confere("o aviso conta o que falta subir", (await aviso()).includes("1 para enviar"), await aviso());
    await pagina.screenshot({ path: path.join(saida, "agenda-offline.png"), fullPage: true });

    // mexeu de novo no criado sem internet: continua uma entrada só
    await pagina.evaluate(async (id) => { const item = agendamentos.find(a => a.id === id); Object.assign(item, await atualizarAgendamento(id, { cliente: "Cliente Novo 2" })); }, f[0].id);
    f = await fila();
    confere("editar o criado sem internet: junta na mesma entrada", f.length === 1 && f[0].acao === "inserir" && f[0].dados.cliente === "Cliente Novo 2", f);

    // trocar status pela etiqueta, mudar o horário e excluir, tudo sem internet
    await pagina.locator("tr.ag-item", { hasText: "Beta Ltda" }).locator('td[data-coluna="status"] select').selectOption("A confirmar");
    await esperar(() => filaOffline.itens.length === 2);
    await pagina.evaluate(async () => { const item = agendamentos.find(a => a.id === 3); Object.assign(item, await atualizarAgendamento(3, { horario: "16:00", obsEntrega: "portão verde" })); });
    respostas = [true];
    await pagina.evaluate(() => excluirAgendamento(1));
    confere("excluir sem internet: avisa que vai para a lixeira depois", (await toast()).includes("Excluído neste aparelho"), await toast());
    f = await fila();
    confere("a alteração guarda só os campos que mudaram, com o valor de antes", JSON.stringify(f.find(e => e.id === 3)) === JSON.stringify({ acao: "atualizar", id: 3, dados: { horario: "16:00", obsEntrega: "portão verde" }, antes: { horario: "14:00", obsEntrega: "portão azul" }, erro: "" }), f.find(e => e.id === 3));
    confere("fila: novo, status, horário e exclusão", JSON.stringify(f.map(e => [e.acao, e.id])) === JSON.stringify([["inserir", f[0].id], ["atualizar", 2], ["atualizar", 3], ["lixeira", 1]]), f.map(e => [e.acao, e.id]));
    confere("sem internet, nada foi tentado no servidor", banco.chamadas.length === chamadasAntes);

    // ---------- 4. recarregar sem internet: a fila continua por cima da cópia ----------
    await pagina.reload();
    await pagina.waitForSelector("tr.ag-item", { timeout: 15000 }).catch(() => {});
    await esperar(() => agendamentos.length === 3);
    const depois = await naTela();
    confere("recarregou sem internet: o novo continua, o excluído some e o status trocado fica", depois.some(a => a.cliente === "Cliente Novo 2" && a.pendente) && !depois.some(a => a.id === 1) && depois.find(a => a.id === 2)?.status === "A confirmar" && depois.find(a => a.id === 3)?.horario === "16:00", depois);
    confere("recarregou sem internet: o aviso continua contando", (await aviso()).includes("4 para enviar"), await aviso());

    // ---------- 5. a internet volta: sobe tudo ----------
    // enquanto isso, outra pessoa mudou o horário do 3 (e não mexeu na observação)
    banco.agendamentos.find(l => l.id === 3).horario = "15:00";
    fora = false;
    dialogos.length = 0;
    await pagina.evaluate(() => window.dispatchEvent(new Event("online")));
    confere("internet voltou: a fila esvazia sozinha", await filaVazia(), await fila());
    const novo = banco.agendamentos.filter(l => l.plataforma === "WAE18R050");
    confere("o novo chegou ao banco uma vez só, com o id_local e a edição", novo.length === 1 && novo[0].cliente === "Cliente Novo 2" && /^[0-9a-f-]{32,36}$/.test(novo[0].id_local || ""), novo);
    confere("o status trocado chegou", banco.agendamentos.find(l => l.id === 2).status === "A confirmar");
    confere("o excluído foi para a lixeira", !!banco.agendamentos.find(l => l.id === 1).excluido_em);
    const tres = banco.agendamentos.find(l => l.id === 3);
    confere("mesmo campo mudado por outra pessoa: fica o dela; o outro campo sobe", tres.horario === "15:00" && tres.obs_entrega === "portão verde", tres);
    confere("e avisa quem estava sem internet", dialogos.some(t => t.includes("outra pessoa mudou os mesmos dados") && t.includes("Horário ficou \"15:00\" (o seu era \"16:00\")")), dialogos);
    await esperar(() => !agendamentos.some(a => idSoDoAparelho(a.id)) && !document.querySelector("tr.ag-offline"));
    const novoNaTela = await pagina.evaluate((id) => agendamentos.find(a => a.id === id), novo[0]?.id);
    confere("na tela, o novo ganhou o id do banco e perdeu a marca ⏳", !!novoNaTela && !novoNaTela.pendenteOffline && !(await pagina.$("tr.ag-offline")), novoNaTela);
    confere("internet voltou: some o aviso", await esperar(() => $("btnOffline").style.display === "none"), await aviso());

    // ---------- 6. gravou, mas a resposta se perdeu: não grava duas vezes ----------
    banco.perderResposta = true;
    const salvo = await pagina.evaluate(async () => inserirAgendamento({ tipo: "Coleta", status: "Confirmado", plataforma: "WAE18R060", cliente: "Resposta Perdida" }));
    confere("sem resposta do servidor: vai para a fila", typeof salvo.id === "string" && salvo.pendenteOffline, salvo);
    banco.perderResposta = false;
    const tentativas = banco.chamadas.filter(c => c.acao === "insert" && c.valores.cliente === "Resposta Perdida").length;
    confere("e sobe sem duplicar (o id_local já estava no banco)", await sincronizar() && banco.agendamentos.filter(l => l.cliente === "Resposta Perdida").length === 1, banco.agendamentos.filter(l => l.cliente === "Resposta Perdida").length);
    const idsLocais = new Set(banco.chamadas.filter(c => c.acao === "insert" && c.valores.cliente === "Resposta Perdida").map(c => c.valores.id_local));
    confere("todas as tentativas foram com o mesmo id_local", tentativas >= 1 && idsLocais.size === 1, [tentativas, [...idsLocais]]);

    // ---------- 7. navegador avisa que está sem rede: vai direto para a fila ----------
    await contexto.setOffline(true);
    const chamadasOffline = banco.chamadas.length;
    await pagina.evaluate(async () => { const item = agendamentos.find(a => a.id === 2); Object.assign(item, await atualizarAgendamento(2, { status: "Confirmado" })); });
    confere("navegador offline: nem tenta o servidor", banco.chamadas.length === chamadasOffline && (await fila()).length === 1);
    await contexto.setOffline(false);
    confere("navegador online de novo: sobe sozinho", await filaVazia() && banco.agendamentos.find(l => l.id === 2).status === "Confirmado");

    // ---------- 8. o banco recusa (permissão): fica marcado, não trava o resto ----------
    banco.recusar = 3;
    fora = true;
    await pagina.evaluate(async () => {
        for(const [id, dados] of [[3, { horario: "17:00" }], [2, { horario: "11:00" }]]){
            const item = agendamentos.find(a => a.id === id);
            Object.assign(item, await atualizarAgendamento(id, dados));
        }
    });
    fora = false;
    await sincronizar();
    f = await fila();
    confere("recusado pelo banco: fica na fila com o motivo; o outro sobe", f.length === 1 && f[0].id === 3 && f[0].erro.includes("Sem permissão") && banco.agendamentos.find(l => l.id === 2).horario === "11:00", f);
    confere("o aviso fica vermelho dizendo que não subiu", (await aviso()).includes("1 não subiu") && await pagina.evaluate(() => $("btnOffline").classList.contains("com-erro")), await aviso());
    await pagina.evaluate(() => renderizarAgenda());
    confere("a linha recusada mostra ⚠️", (await pagina.locator("tr.ag-offline .ag-offline-marca").first().innerText().catch(() => "")).includes("não subiu"));
    respostas = [false, true];
    dialogos.length = 0;
    await pagina.click("#btnOffline");
    await filaVazia();
    confere("tocar no aviso: mostra o motivo e deixa descartar", dialogos[0]?.includes("Sem permissão") && dialogos[1]?.includes("Descartar") && (await fila()).length === 0, dialogos);
    banco.recusar = null;

    // ---------- 9. banco sem a coluna id_local (SQL não aplicado): grava sem ela ----------
    banco.semIdLocal = true;
    const semColuna = await pagina.evaluate(async () => inserirAgendamento({ tipo: "Coleta", status: "Confirmado", plataforma: "WAE18R070", cliente: "Sem Coluna" }));
    const gravadoSemColuna = banco.agendamentos.find(l => l.cliente === "Sem Coluna");
    confere("sem a coluna id_local: grava do mesmo jeito (sem ela)", typeof semColuna.id === "number" && !!gravadoSemColuna && !("id_local" in gravadoSemColuna && gravadoSemColuna.id_local), gravadoSemColuna);
    banco.semIdLocal = false;

    // ---------- 10. Sair com alteração na fila ----------
    fora = true;
    await pagina.evaluate(async () => { const item = agendamentos.find(a => a.id === 2); Object.assign(item, await atualizarAgendamento(2, { horario: "12:00" })); });
    respostas = [false];
    dialogos.length = 0;
    confere("Sair com alteração na fila: pergunta e, sem confirmar, não sai", (await pagina.evaluate(() => confirmarSaidaOffline())) === false && dialogos[0]?.includes("ainda não subiram") && (await fila()).length === 1, dialogos);
    respostas = [true];
    confere("confirmou: apaga a fila e a cópia deste aparelho", (await pagina.evaluate(() => confirmarSaidaOffline())) === true && (await fila()).length === 0 && (await pagina.evaluate(() => lerCopiaOffline("agenda"))) === null);
    fora = false;

    // ---------- 11. login vencido e sem internet: o auth-guard e a trava de aparelho de verdade ----------
    // sem internet, o supabase-js fica até 30 s tentando renovar o login vencido; a página não espera
    authReal = true;
    await pagina.evaluate(() => {
        localStorage.setItem("sb-teste-auth-token", JSON.stringify({ user: { id: "u1", email: "t@t", app_metadata: {} } }));
    });
    await pagina.reload();
    await pagina.waitForSelector("tr.ag-item", { timeout: 15000 }).catch(() => {});
    confere("auth-guard de verdade: abre com internet", await pagina.evaluate(() => document.documentElement.style.visibility !== "hidden" && typeof lerSessao === "function"));
    confere("e guarda de novo a cópia e o auth-guard de verdade", await esperar(async () =>
        !!(await lerCopiaOffline("agenda")) && (await (await (await caches.open("site-offline-v1")).match(new URL("js/auth-guard.js", location.href).href))?.text() || "").includes("lerSessao")));
    fora = true;
    await contexto.setOffline(true);
    await pagina.evaluate(() => localStorage.setItem("__loginVencido", "1"));
    const abriuEm = Date.now();
    await pagina.reload();
    // (o waitForFunction não roda com a CSP da página: o esperar usa o evaluate)
    const abriu = await esperar(() => document.documentElement.style.visibility !== "hidden" && !!document.querySelector("tr.ag-item"), null, 25000);
    const tempoAbrir = Date.now() - abriuEm;
    confere("login vencido e sem internet: a agenda aparece em poucos segundos (não espera os 30 s)", abriu && tempoAbrir < 6000, tempoAbrir);
    confere("com o usuário do login salvo e a cópia do aparelho", await pagina.evaluate(() => usuarioAgenda === "u1" && agendamentos.length > 0 && $("btnOffline").textContent.includes("Sem conexão")), await aviso());
    await pagina.evaluate(() => localStorage.removeItem("__loginVencido"));
    await contexto.setOffline(false);
    fora = false;

    confere("sem erros na página", erros.length === 0, erros);

    await navegador.close();
    servidor.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exitCode = falhas ? 1 : 0;

})().catch(async erro => {
    console.error(erro);
    await navegador?.close();
    servidor.close();
    process.exitCode = 1;
});
