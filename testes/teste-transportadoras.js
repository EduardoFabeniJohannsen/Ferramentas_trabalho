// Página de transportadoras com dados: lista, abas, modais, documentos e só leitura.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..", "site");

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

const LINHAS = {
    transportadoras: [{ nome: "Trans A" }, { nome: "Trans B" }],
    veiculos: [
        { id: 1, transportadora: "Trans A", placa: "AAA1A11", tipo: "Prancha", largura: 2.6, capacidade_carga: 30000 },
        { id: 2, transportadora: "Trans A", placa: "BBB2B22", placa2: "CCC3C33", tipo: "Carreta" },
        { id: 3, transportadora: "Trans B", placa: "DDD4D44", tipo: "Prancha" }
    ],
    motoristas: [
        { id: 10, transportadora: "Trans A", nome: "Motorista Um" },
        { id: 11, transportadora: "Trans B", nome: "Motorista Dois" }
    ],
    motoristas_dados: [{ motorista_id: 10, cpf: "11122233344", nascimento: "1980-05-31" }],
    transportadora_docs: [
        { id: 100, veiculo_id: 1, motorista_id: null, rotulo: "CRLV", nome_arquivo: "crlv.pdf", caminho: "veiculo-1/crlv.pdf", criado_em: "2026-01-01" },
        { id: 101, veiculo_id: null, motorista_id: 10, rotulo: "CNH", nome_arquivo: "cnh.pdf", caminho: "motorista-10/cnh.pdf", criado_em: "2026-01-01" }
    ]
};

const clienteFalso = (admin) => `
window.supabase = { createClient(){
    const LINHAS = ${JSON.stringify(LINHAS)};
    const consulta = (tabela) => {
        let linhas = LINHAS[tabela] || [];
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then") return (ok) => ok({ data: linhas, error: null, count: linhas.length });
                if(nome === "maybeSingle") return async () => ({ data: { acessos: ["transportadoras"], filiais: [], ativo: true }, error: null });
                if(nome === "eq") return (campo, valor) => { linhas = linhas.filter(l => l[campo] === valor); return q; };
                if(nome === "in") return (campo, valores) => { linhas = linhas.filter(l => valores.includes(l[campo])); return q; };
                return () => q;
            }
        });
        return q;
    };
    return {
        from: consulta,
        rpc: async () => ({ data: [], error: null }),
        channel: () => ({ on(){ return this; }, subscribe(){ return this; }, track: async () => "ok", untrack: async () => "ok", send: async () => "ok", presenceState: () => ({}) }),
        auth: {
            getSession: async () => ({ data: { session: { user: { id: "u1", email: "teste@exemplo.com", app_metadata: ${admin ? '{ role: "admin" }' : "{}"} } } }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
        },
        storage: { from: () => ({}) }
    };
}};`;

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

(async () => {

    const navegador = await chromium.launch({ channel: "chrome", headless: true });

    const abrir = async (admin) => {

        const contexto = await navegador.newContext({ viewport: { width: 1300, height: 800 } });
        const erros = [];

        await contexto.route("**/*", (rota) => {
            const url = new URL(rota.request().url());
            if(url.pathname.endsWith("/vendor/supabase-2.45.0.js")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso(admin) });
            if(url.hostname !== "site.test") return rota.abort();
            const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
            if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
            return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
        });

        const pagina = await contexto.newPage();

        pagina.on("pageerror", e => erros.push(e.message));
        pagina.on("console", m => { if(m.type() === "error" && !/Failed to load resource/.test(m.text())) erros.push(m.text()); });

        await pagina.goto("http://site.test/transportadoras.html");
        await pagina.waitForLoadState("networkidle");

        return { contexto, pagina, erros };
    };

    const escolher = async (pagina, valor) => {
        await pagina.selectOption("#selectTransportadora", valor);
        await pagina.waitForTimeout(100);
    };

    const itens = (pagina) => pagina.locator("#listaTransp .item-transp").allInnerTexts();

    // ---------- admin ----------
    const { contexto, pagina, erros } = await abrir(true);

    const opcoes = await pagina.locator("#selectTransportadora option").allInnerTexts();
    confere("lista as transportadoras e a opção Todas", opcoes.join() === "Todas as transportadoras,Trans A,Trans B", opcoes);

    await escolher(pagina, "Trans A");
    let lista = await itens(pagina);
    confere("mostra só os veículos da escolhida", lista.length === 2, lista);
    confere("prancha com medidas formatadas", lista[0].includes("AAA1A11") && lista[0].includes("Prancha") && lista[0].includes("2,6") && lista[0].includes("30.000"), lista[0]);
    confere("carreta com as duas placas", lista[1].includes("BBB2B22 + CCC3C33") && lista[1].includes("Sem medidas cadastradas"), lista[1]);
    confere("conta os documentos", lista[0].includes("1 documento(s)") && lista[1].includes("Sem documentos"));
    confere("contagem", (await pagina.innerText("#contagemTransp")) === "2 veículo(s)");

    await pagina.click("#abaMotoristas");
    lista = await itens(pagina);
    confere("aba de motoristas", lista.length === 1 && lista[0].includes("Motorista Um") && lista[0].includes("1 documento(s)"), lista);
    confere("botão muda para novo motorista", (await pagina.innerText("#btnNovoItem")).includes("Novo motorista"));

    await pagina.locator("#listaTransp .item-transp button[title='Editar']").click();
    let corpo = await pagina.innerText("#corpoModalTransp");
    confere("modal do motorista abre", await pagina.isVisible("#modalTransp") && corpo.includes("CNH"), corpo.slice(0, 120));
    confere("formulário traz o nome", (await pagina.locator("#corpoModalTransp input").first().inputValue()) === "Motorista Um");
    await pagina.evaluate(() => fecharModalTransp());

    await pagina.click("#abaVeiculos");
    await pagina.locator("#listaTransp .item-transp button[title='Editar']").first().click();
    corpo = await pagina.innerText("#corpoModalTransp");
    confere("modal do veículo mostra o documento", corpo.includes("CRLV"), corpo.slice(0, 160));
    confere("modal do veículo tem Salvar", await pagina.isVisible("#btnSalvarTransp"));
    await pagina.evaluate(() => fecharModalTransp());

    await pagina.click("#btnNovoItem");
    confere("novo veículo abre em branco", await pagina.isVisible("#modalTransp") && (await pagina.locator("#corpoModalTransp input[type='text'], #corpoModalTransp input:not([type])").first().inputValue()) === "");
    await pagina.evaluate(() => fecharModalTransp());

    await escolher(pagina, "__todas__");
    lista = await itens(pagina);
    confere("Todas: lista tudo com o nome da transportadora", lista.length === 3 && lista[2].includes("Trans B"), lista);
    confere("Todas: não deixa cadastrar", await pagina.isDisabled("#btnNovoItem"));

    await pagina.click("#btnNovaTransportadora");
    confere("formulário de nova transportadora abre em linha", (await pagina.locator("#formNovaTransp").evaluate(e => getComputedStyle(e).display)) === "flex");

    confere("admin: sem erros no console", erros.length === 0, erros.length ? erros : undefined);
    await contexto.close();

    // ---------- quem só vê ----------
    const leitor = await abrir(false);

    confere("só vê: continua na página", leitor.pagina.url().endsWith("/transportadoras.html"), leitor.pagina.url());
    confere("só vê: esconde os botões de cadastro", !(await leitor.pagina.isVisible("#btnNovoItem")) && !(await leitor.pagina.isVisible("#btnNovaTransportadora")));

    await escolher(leitor.pagina, "Trans A");
    confere("só vê: enxerga a lista", (await itens(leitor.pagina)).length === 2);
    confere("só vê: sem editar nem excluir", (await leitor.pagina.locator("#listaTransp button[title='Editar'], #listaTransp button[title='Excluir']").count()) === 0);

    await leitor.pagina.locator("#listaTransp button[title='Ver dados e documentos']").first().click();
    corpo = await leitor.pagina.innerText("#corpoModalTransp");
    confere("só vê: abre os dados sem Salvar", corpo.includes("CRLV") && !(await leitor.pagina.isVisible("#btnSalvarTransp")), corpo.slice(0, 120));
    confere("só vê: sem erros no console", leitor.erros.length === 0, leitor.erros.length ? leitor.erros : undefined);

    await navegador.close();

    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exit(falhas ? 1 : 0);

})().catch(e => { console.error(e); process.exit(1); });
