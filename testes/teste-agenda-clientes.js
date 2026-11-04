// Sugestões de cliente no formulário da agenda: nome completo dos clientes
// anteriores (inclusive os de antes dos 30 dias), e ao escolher puxa endereço,
// contato, e-mails e pagamento só nos campos vazios. Banco simulado.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");

const hoje = new Date().toISOString().slice(0, 10);

const base = {
    horario: "08:00", status: "Confirmado", transportadora: "Trans A", motorista: "",
    periodo: "3 dias", frete: 500, frete_conta: "nossa", prazos_pagamento: []
};

// os que a agenda carrega (últimos 30 dias)
const linhas = [
    { ...base, id: 1, data: hoje, tipo: "Entrega", plataforma: "WAE18R001", cliente: "Construtora Alfa Ltda",
      destino_nome: "Obra Centro", destino_endereco: "Rua B, 200, Centro, Brusque/SC", link_destino: "",
      contato: "João 47 9999", emails: "fin@alfa.com", forma_pagamento: "Boleto", prazos_pagamento: ["28", "56"] },
    { ...base, id: 2, data: hoje, tipo: "Transferência", plataforma: "WTE14", cliente: "Gama Transferências",
      origem_nome: "Obra 1", origem_endereco: "Rua X, 1, Itajaí/SC", destino_nome: "Obra 2", destino_endereco: "Rua Y, 2, Itajaí/SC" }
];

// só no histórico (mais antigos que os 30 dias)
const antigas = [
    { ...base, id: 10, data: "2026-01-10", tipo: "Coleta", plataforma: "WAE18R002", cliente: "CONSTRUTORA ALFA LTDA",
      origem_nome: "Obra Norte", origem_endereco: "Rua C, 5, Itajaí/SC", link_origem: "https://maps/norte",
      contato: "Pedro 47 8888", emails: "velho@alfa.com" },
    { ...base, id: 11, data: "2025-12-01", tipo: "Entrega", plataforma: "WAE18R003", cliente: "Mercado Beta",
      destino_nome: "Loja", destino_endereco: "Av D, 9, Blumenau/SC", contato: "Ana", emails: "beta@x.com",
      forma_pagamento: "Depósito", prazos_pagamento: ["30"] }
];

const clienteFalso = `
window.supabase = { createClient(){
    const linhas = ${JSON.stringify(linhas)};
    const antigas = ${JSON.stringify(antigas)};
    const consulta = (tabela) => {
        let inicio = 0;
        let colunas = "*";
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then"){
                    let data = [];
                    if(tabela === "agendamentos" && inicio === 0){
                        data = colunas.includes("forma_pagamento") ? [...linhas, ...antigas] : linhas;
                    }
                    if(tabela === "transportadoras") data = [{ id: 1, nome: "Trans A" }];
                    return (ok) => ok({ data, error: null, count: data.length });
                }
                if(nome === "range") return (a) => { inicio = a; return q; };
                if(nome === "select") return (c) => { colunas = c || "*"; return q; };
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
function recursoDaPagina(){ return "agenda"; }
function nomeArquivoAtual(){ return "agenda.html"; }`;

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

    await pagina.goto("http://agenda.test/agenda.html");
    await pagina.waitForSelector(".ag-tabela thead th");
    await pagina.waitForFunction(() => typeof agendamentos !== "undefined" && agendamentos.length === 2);

    // formulário novo, limpo, no tipo pedido
    const novo = async (tipo = "Entrega") => {
        await pagina.evaluate((tipo) => {
            encerrarModalAgenda();
            removerRascunho("novo");
            abrirModalAgenda(null);
            $("agTipo").value = tipo;
            $("agTipo").dispatchEvent(new Event("change", { bubbles: true }));
        }, tipo);
        await pagina.waitForFunction(() => historicoClientesEm > 0 && !cargaHistoricoClientes);
    };
    // escolher na lista do navegador
    const escolher = (id, valor) => pagina.evaluate(([id, valor]) => {
        $(id).value = valor;
        $(id).dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertReplacementText" }));
    }, [id, valor]);
    const valor = (id) => pagina.inputValue("#" + id);
    const opcoes = (id) => pagina.$$eval(`#${id} option`, l => l.map(o => [o.value, o.label]));

    // ---------- sugestões ----------
    await novo();
    const clientes = await opcoes("listaClientesAgenda");
    confere("sugere os clientes da agenda e os antigos, um de cada (maiúsculas juntas)", JSON.stringify(clientes.map(c => c[0])) === JSON.stringify(["Construtora Alfa Ltda", "Gama Transferências", "Mercado Beta"]), clientes);
    confere("cada cliente mostra o local (nome e cidade) ou quantos locais tem", clientes[0][1] === "2 locais · último: Obra Centro · Brusque/SC" && clientes[2][1] === "Loja · Blumenau/SC", clientes);

    const botoesLocais = () => pagina.$$eval("#chipsLocaisCliente .chip-local", l => l.map(b => [b.innerText.replace(/\s*\n\s*/g, " | "), b.classList.contains("ativo")]));

    // ---------- cliente com dois locais: digitar o nome inteiro e sair do campo ----------
    await pagina.fill("#agCliente", "construtora alfa ltda");
    await pagina.press("#agCliente", "Tab");
    confere("nome fica como no cadastro", (await valor("agCliente")) === "Construtora Alfa Ltda", await valor("agCliente"));
    confere("com dois locais, o endereço espera a escolha", (await valor("agDestinoEndereco")) === "" && (await valor("agContato")) === "");
    confere("e-mails do último", (await valor("agEmails")) === "fin@alfa.com");
    const pagamento = await pagina.evaluate(() => [$("agFormaPagamento").value, prazosFormulario]);
    confere("pagamento da última entrega", JSON.stringify(pagamento) === JSON.stringify(["Boleto", ["28", "56"]]), pagamento);
    confere("avisa o que foi puxado e pede pra escolher o local", (await pagina.innerText("#toast")).includes("e-mails, pagamento") && (await pagina.innerText("#toast")).includes("Escolha um dos 2 locais"), await pagina.innerText("#toast"));
    confere("botões com nome do local e cidade, o mais recente primeiro", JSON.stringify(await botoesLocais()) === JSON.stringify([["Obra Centro | Brusque/SC", false], ["Obra Norte | Itajaí/SC", false]]), await botoesLocais());
    confere("título diz quantos locais", (await pagina.innerText("#tituloLocaisCliente")).includes("já usou 2 locais"));
    const locais = await opcoes("listaLocaisCliente");
    confere("lista do endereço também mostra nome e cidade", JSON.stringify(locais) === JSON.stringify([["Rua B, 200, Centro, Brusque/SC", "Obra Centro · Brusque/SC"], ["Rua C, 5, Itajaí/SC", "Obra Norte · Itajaí/SC"]]), locais);
    confere("lista ligada no endereço de entrega", (await pagina.getAttribute("#agDestinoEndereco", "list")) === "listaLocaisCliente" && !(await pagina.getAttribute("#agOrigemEndereco", "list")));

    // ---------- clicou no local errado e depois no certo ----------
    await pagina.click("#chipsLocaisCliente .chip-local >> nth=1");
    confere("clicar no local preenche tudo dele", (await valor("agDestinoEndereco")) === "Rua C, 5, Itajaí/SC" && (await valor("agDestinoNome")) === "Obra Norte" && (await valor("agLinkDestino")) === "https://maps/norte" && (await valor("agContato")) === "Pedro 47 8888");
    await pagina.click("#chipsLocaisCliente .chip-local >> nth=0");
    confere("clicar no outro troca endereço, nome, link e contato", (await valor("agDestinoEndereco")) === "Rua B, 200, Centro, Brusque/SC" && (await valor("agDestinoNome")) === "Obra Centro" && (await valor("agLinkDestino")) === "" && (await valor("agContato")) === "João 47 9999");
    confere("botão do local escolhido fica marcado", JSON.stringify((await botoesLocais()).map(b => b[1])) === "[true,false]", await botoesLocais());
    await pagina.$eval("#blocoLocaisCliente", e => e.scrollIntoView({ block: "center" }));
    await pagina.screenshot({ path: path.join(__dirname, "capturas", "agenda-locais-cliente.png") });
    await pagina.fill("#agContato", "Carlos 47 7777");
    await escolher("agDestinoEndereco", "Rua C, 5, Itajaí/SC");
    confere("escolher na lista do endereço também troca tudo, até o contato digitado", (await valor("agDestinoNome")) === "Obra Norte" && (await valor("agContato")) === "Pedro 47 8888");
    confere("retirada continua W Rental", (await valor("agOrigemEndereco")) === "");

    // ---------- um local só: já vem preenchido ----------
    await novo();
    await pagina.fill("#agEmails", "meu@x.com");
    await escolher("agCliente", "Mercado Beta");
    confere("um local só: escolher da lista já preenche", (await valor("agDestinoEndereco")) === "Av D, 9, Blumenau/SC" && (await valor("agDestinoNome")) === "Loja" && (await valor("agContato")) === "Ana");
    confere("e-mail digitado fica", (await valor("agEmails")) === "meu@x.com");
    confere("pagamento do cliente", (await pagina.inputValue("#agFormaPagamento")) === "Depósito");
    confere("um local só: botão já marcado", JSON.stringify(await botoesLocais()) === JSON.stringify([["Loja | Blumenau/SC", true]]), await botoesLocais());

    // ---------- trocou de cliente antes de salvar ----------
    await pagina.fill("#agObsEntrega", "x");
    await pagina.fill("#agDestinoNome", "Loja Nova");
    await pagina.fill("#agCliente", "Construtora Alfa Ltda");
    await pagina.press("#agCliente", "Tab");
    confere("trocar de cliente: o que veio sozinho do outro sai", (await valor("agDestinoEndereco")) === "" && (await valor("agContato")) === "");
    confere("trocar de cliente: o que foi digitado fica", (await valor("agDestinoNome")) === "Loja Nova" && (await valor("agEmails")) === "meu@x.com");
    confere("trocar de cliente: pagamento que veio sozinho é trocado", (await pagina.inputValue("#agFormaPagamento")) === "Boleto");

    // ---------- coleta: local do cliente é a retirada ----------
    await novo("Coleta");
    await escolher("agCliente", "Construtora Alfa Ltda");
    await pagina.click("#chipsLocaisCliente .chip-local >> nth=0");
    confere("coleta: endereço vai na retirada", (await valor("agOrigemEndereco")) === "Rua B, 200, Centro, Brusque/SC" && (await valor("agOrigemNome")) === "Obra Centro" && (await valor("agDestinoEndereco")) === "");
    confere("coleta: sem pagamento", (await pagina.inputValue("#agFormaPagamento")) === "");
    confere("coleta: lista na retirada", (await pagina.getAttribute("#agOrigemEndereco", "list")) === "listaLocaisCliente");

    // ---------- transferência: nada de local ----------
    await novo("Transferência");
    await escolher("agCliente", "Construtora Alfa Ltda");
    confere("transferência: sem botões de local, só e-mails", !(await pagina.isVisible("#blocoLocaisCliente")) && (await valor("agOrigemEndereco")) === "" && (await valor("agDestinoEndereco")) === "" && (await valor("agEmails")) === "fin@alfa.com");

    // ---------- cliente novo e edição ----------
    await novo();
    await pagina.fill("#agCliente", "Cliente Novo");
    await pagina.press("#agCliente", "Tab");
    confere("cliente desconhecido não puxa nada", (await valor("agDestinoEndereco")) === "" && (await valor("agEmails")) === "");

    await pagina.evaluate(() => { encerrarModalAgenda(); abrirModalAgenda(1); });
    await pagina.fill("#agContato", "");
    await pagina.fill("#agCliente", "Construtora Alfa Ltda");
    await pagina.press("#agCliente", "Tab");
    confere("editando: o cliente que já estava não puxa de novo", (await valor("agContato")) === "");
    await pagina.evaluate(() => { encerrarModalAgenda(); removerRascunho(1); });

    confere("sem erros no console", erros.length === 0, erros);

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exitCode = falhas ? 1 : 0;

})().catch(e => { console.error(e); process.exit(1); });
