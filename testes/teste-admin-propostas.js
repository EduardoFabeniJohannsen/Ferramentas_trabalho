// Seção "Propostas Zap copiadas" do Admin: largura da página e os filtros (busca em
// qualquer campo, usuário, local de quem fez, aparelho, modelo, desconto e datas).
// Banco simulado: nada aqui toca o Supabase de produção.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });

const clienteFalso = `
window.supabase = { createClient(){
    const consulta = (tabela) => {
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then") return (ok) => ok({ data: tabela === "propostas_copiadas" ? window.__propostas : [], error: null, count: 0 });
                return () => q;
            }
        });
        return q;
    };
    return {
        from: consulta,
        rpc: async () => ({ data: null, error: null }),
        channel: () => ({ on(){ return this; }, subscribe(){ return this; }, track: async () => "ok", send: async () => "ok", presenceState: () => ({}) }),
        auth: {
            getSession: async () => ({ data: { session: { user: { id: "u1", email: "chefe@t" } } } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
        },
        functions: { invoke: async () => ({ data: null, error: null }) },
        storage: { from: () => ({}) }
    };
}};`;

const authFalso = `
function ehAdmin(){ return Promise.resolve(true); }
function temAcesso(){ return true; }
function temFilial(){ return true; }
function existeLoginSalvo(){ return true; }
function carregarPerfil(){ return Promise.resolve({}); }
function fazerLogout(){}
function recursoDaPagina(){ return "admin"; }
function nomeArquivoAtual(){ return "admin.html"; }`;

const PROPOSTAS = [
    {
        id: 3, criado_em: "2026-11-01T15:00:00Z", usuario_email: "ana@exemplo.com", cliente: "Gama", cidade: "Itajaí", valor_total: 1070,
        aparelho: { tipo: "computador", aparelho: "Windows", navegador: "Chrome" },
        dados: { dias: 28, frete: 0, configuracoes: { emojis: true }, equipamentos: [{ modelo: "THP", quantidade: 1, valorTabela: null, valorFinal: 1000 }] },
        texto: "Proposta com observação especial"
    },
    {
        id: 2, criado_em: "2026-10-20T15:00:00Z", usuario_email: "bia@exemplo.com", cliente: "Beta Ltda", cidade: "Blumenau", valor_total: 5000,
        aparelho: { tipo: "computador", aparelho: "Windows", navegador: "Edge", cidade: "Joinville/Santa Catarina" },
        dados: { dias: 28, frete: 300, configuracoes: { emojis: true }, equipamentos: [
            { modelo: "WAE18", quantidade: 1, valorTabela: 3000, valorFinal: 2850 },
            { modelo: "WAE16", quantidade: 1, valorTabela: 2000, valorFinal: 2000 }
        ] },
        texto: "Proposta Beta"
    },
    {
        id: 1, criado_em: "2026-10-05T15:00:00Z", usuario_email: "ana@exemplo.com", cliente: "Construtora Alfa", cidade: "Brusque", valor_total: 1570,
        aparelho: { tipo: "celular", aparelho: "Samsung SM-S918B", navegador: "Chrome", cidade: "Itajaí/Santa Catarina" },
        dados: { dias: 28, frete: 500, configuracoes: { emojis: true, locacaoComplementar: true, bitributacao: true }, pagamento: { forma: "Boleto", prazo: "28" },
            equipamentos: [{ modelo: "WAE16", quantidade: 1, valorTabela: 2000, valorFinal: 1500 }] },
        texto: "Proposta Alfa"
    }
];

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

(async () => {

    const navegador = await chromium.launch({ channel: "chrome", headless: true });

    const abrir = async (tela) => {
        const contexto = await navegador.newContext({ viewport: tela, timezoneId: "America/Sao_Paulo" });
        await contexto.route("**/*", (rota) => {
            const url = new URL(rota.request().url());
            if(url.hostname.includes("jsdelivr")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso });
            if(url.hostname !== "admin.test") return rota.abort();
            if(url.pathname.endsWith("auth-guard.js")) return rota.fulfill({ contentType: "text/javascript", body: authFalso });
            const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
            if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
            return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
        });
        await contexto.addInitScript((propostas) => { window.__propostas = propostas; }, PROPOSTAS);
        const pagina = await contexto.newPage();
        const erros = [];
        pagina.on("pageerror", e => erros.push(e.message));
        pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_FAILED/.test(m.text())) erros.push(m.text()); });
        await pagina.goto("http://admin.test/admin.html");
        await pagina.waitForSelector("#corpoPropostas td.col-quando");
        return { contexto, pagina, erros };
    };

    const { contexto, pagina, erros } = await abrir({ width: 1600, height: 900 });

    const clientes = () => pagina.$$eval("#corpoPropostas td.col-proposta-cliente strong", l => l.map(c => c.innerText));
    const contagem = () => pagina.innerText("#contagemPropostas");

    // ---------- largura ----------
    const larguras = await pagina.evaluate(() => {
        const area = document.querySelector(".tabela-propostas").parentElement;
        return { card: document.querySelector(".card-admin").getBoundingClientRect().width, tela: document.documentElement.clientWidth, rola: area.scrollWidth > area.clientWidth };
    });
    confere("a página usa a largura da tela", larguras.card > larguras.tela - 60, larguras);
    confere("a tabela de propostas não rola pro lado", !larguras.rola, larguras);

    // ---------- começo ----------
    confere("mostra todas", (await clientes()).length === 3, await clientes());
    confere("contagem sem filtro", (await contagem()) === "3 proposta(s)", await contagem());
    confere("Limpar filtros escondido sem filtro", !(await pagina.isVisible("#btnLimparFiltrosPropostas")));
    confere("desconto continua na tabela", (await pagina.innerText("#corpoPropostas")).includes("(−25%)"));

    // ---------- desconto médio por usuário ----------
    const descontos = () => pagina.$$eval("#corpoDescontosUsuarios tr", l => l.map(t => [...t.cells].map(c => c.innerText.trim())));
    confere("desconto médio por usuário (maior média primeiro; sem tabela não entra)", JSON.stringify(await descontos()) === JSON.stringify([
        ["ana@exemplo.com", "2", "1", "25%", "25%", "R$ 500,00", "25%"],
        ["bia@exemplo.com", "1", "2", "2,5%", "3%", "R$ 150,00", "5%"]
    ]), await descontos());

    const opcoes = (id) => pagina.$$eval(`#${id} option`, l => l.map(o => o.innerText));
    confere("locais de quem fez", JSON.stringify(await opcoes("filtroPropostasLocal")) === JSON.stringify(["Todos os locais", "Itajaí/Santa Catarina", "Joinville/Santa Catarina", "(sem cidade)"]), await opcoes("filtroPropostasLocal"));
    confere("modelos", JSON.stringify(await opcoes("filtroPropostasModelo")) === JSON.stringify(["Todos os modelos", "THP", "WAE16", "WAE18"]), await opcoes("filtroPropostasModelo"));
    confere("aparelhos", (await opcoes("filtroPropostasAparelho")).length === 3, await opcoes("filtroPropostasAparelho"));

    // ---------- busca em qualquer campo ----------
    const buscar = async (texto) => { await pagina.fill("#buscaPropostas", texto); return clientes(); };
    confere("busca pelo cliente", JSON.stringify(await buscar("alfa")) === '["Construtora Alfa"]');
    confere("busca pela configuração", JSON.stringify(await buscar("boleto")) === '["Construtora Alfa"]');
    confere("busca pelo aparelho", JSON.stringify(await buscar("samsung")) === '["Construtora Alfa"]');
    confere("busca pela mensagem, sem acento", JSON.stringify(await buscar("observacao")) === '["Gama"]');
    confere("busca pelo usuário", (await buscar("bia@")).length === 1);
    confere("várias palavras: todas precisam aparecer", JSON.stringify(await buscar("wae16 blumenau")) === '["Beta Ltda"]');
    confere("contagem filtrando", (await contagem()) === "1 de 3 proposta(s)", await contagem());
    confere("Limpar filtros aparece", await pagina.isVisible("#btnLimparFiltrosPropostas"));
    await buscar("nada disso");
    confere("sem resultado: avisa", (await pagina.innerText("#corpoPropostas")).includes("Nenhuma proposta com esses filtros"));
    await buscar("");

    // ---------- selects ----------
    await pagina.selectOption("#filtroPropostasLocal", "Joinville/Santa Catarina");
    confere("local de quem fez", JSON.stringify(await clientes()) === '["Beta Ltda"]', await clientes());
    await pagina.selectOption("#filtroPropostasLocal", "__vazio__");
    confere("local: sem cidade", JSON.stringify(await clientes()) === '["Gama"]', await clientes());
    await pagina.selectOption("#filtroPropostasLocal", "");
    await pagina.selectOption("#filtroPropostasAparelho", "celular");
    confere("aparelho", JSON.stringify(await clientes()) === '["Construtora Alfa"]', await clientes());
    await pagina.selectOption("#filtroPropostasAparelho", "");
    await pagina.selectOption("#filtroPropostasUsuario", "ana@exemplo.com");
    confere("usuário", JSON.stringify(await clientes()) === '["Gama","Construtora Alfa"]', await clientes());
    confere("desconto médio segue os filtros", (await descontos()).length === 1 && (await descontos())[0][0] === "ana@exemplo.com", await descontos());
    await pagina.selectOption("#filtroPropostasUsuario", "");
    await pagina.selectOption("#filtroPropostasModelo", "WAE16");
    confere("modelo", JSON.stringify(await clientes()) === '["Beta Ltda","Construtora Alfa"]', await clientes());

    // ---------- desconto ----------
    await pagina.fill("#filtroPropostasDescontoMin", "1");
    confere("modelo + desconto valem para o mesmo equipamento", JSON.stringify(await clientes()) === '["Construtora Alfa"]', await clientes());
    await pagina.selectOption("#filtroPropostasModelo", "");
    confere("desconto a partir de 1%", JSON.stringify(await clientes()) === '["Beta Ltda","Construtora Alfa"]', await clientes());
    await pagina.fill("#filtroPropostasDescontoMin", "20");
    await pagina.fill("#filtroPropostasDescontoMax", "30");
    confere("desconto de 20% a 30%", JSON.stringify(await clientes()) === '["Construtora Alfa"]', await clientes());
    await pagina.fill("#filtroPropostasDescontoMin", "");
    await pagina.fill("#filtroPropostasDescontoMax", "0");
    confere("sem desconto (até 0%); sem valor de tabela não entra", JSON.stringify(await clientes()) === '["Beta Ltda"]', await clientes());
    await pagina.fill("#filtroPropostasDescontoMax", "");

    // ---------- datas ----------
    await pagina.fill("#filtroPropostasDataDe", "2026-10-20");
    confere("data a partir de", JSON.stringify(await clientes()) === '["Gama","Beta Ltda"]', await clientes());
    await pagina.fill("#filtroPropostasDataDe", "");
    await pagina.fill("#filtroPropostasDataAte", "2026-10-19");
    confere("data até", JSON.stringify(await clientes()) === '["Construtora Alfa"]', await clientes());

    // ---------- atualizar mantém, limpar tira tudo ----------
    await pagina.selectOption("#filtroPropostasUsuario", "ana@exemplo.com");
    await pagina.click(".secao-propostas button:has-text('Atualizar')");
    await pagina.waitForFunction(() => document.querySelectorAll("#corpoPropostas td.col-quando").length > 0);
    confere("Atualizar mantém os filtros", (await pagina.inputValue("#filtroPropostasUsuario")) === "ana@exemplo.com" && JSON.stringify(await clientes()) === '["Construtora Alfa"]', await clientes());
    await pagina.click("#btnLimparFiltrosPropostas");
    confere("Limpar filtros mostra todas", (await clientes()).length === 3 && (await contagem()) === "3 proposta(s)", await contagem());
    confere("Limpar filtros esvazia os campos", await pagina.evaluate(() => IDS_FILTROS_PROPOSTAS.every(id => $(id).value === "")));

    await pagina.screenshot({ path: path.join(saida, "92-propostas-admin.png"), fullPage: true });
    confere("sem erros no console", erros.length === 0, erros);
    await contexto.close();

    // ---------- celular ----------
    {
        const { contexto, pagina, erros } = await abrir({ width: 400, height: 800 });
        await pagina.screenshot({ path: path.join(saida, "93-propostas-admin-celular.png"), fullPage: true });
        confere("no celular: os filtros não estouram a tela", await pagina.evaluate(() => {
            const filtros = document.querySelector(".filtros-propostas").getBoundingClientRect();
            return filtros.left >= 0 && filtros.right <= document.documentElement.clientWidth;
        }));
        confere("no celular: sem erros", erros.length === 0, erros);
        await contexto.close();
    }

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exitCode = falhas ? 1 : 0;

})().catch(e => { console.error(e); process.exit(1); });
