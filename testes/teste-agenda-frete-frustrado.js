// Agenda: tipo "Frete frustrado" (a máquina carregou, chegou no local e precisou voltar). A
// própria entrega vira frete frustrado (frete digitado = ida + volta) e a entrega nova é criada à
// parte (Duplicar já abre como Entrega). O faturamento da entrega fica guardado: nada de pergunta
// nem de apagar o PDF do pedido. Não reserva a máquina e não vai para a expedição.
// Banco simulado: nada aqui toca o Supabase de produção.
const { chromium } = require("playwright-core");
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

const linhas = [
    // entrega com faturamento e PDF do pedido de compra
    { id: 1, tipo: "Entrega", status: "Em rota", data: dia(0), horario: "08:00", plataforma: "WAE18R001", cliente: "Construtora Alfa", proposta: "712804", periodo: "28 dias",
        transportadora: "Trans A", destino_endereco: "Rua X, 10, Brusque/SC", frete: 350, frete_conta: "nossa",
        forma_pagamento: "Boleto", prazos_pagamento: [28], pedido_compra: true, pedido_numero: "PC-77",
        pedido_pdf_caminho: "1/pedido.pdf", pedido_pdf_nome: "pedido.pdf" }
];

const clienteFalso = `
window.__gravados = [];
window.__removidos = [];
window.supabase = { createClient(){
    const linhas = ${JSON.stringify(linhas)};
    const consulta = (tabela) => {
        let inicio = 0;
        let gravando = null;
        let modo = "";
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then"){
                    if(gravando){
                        const original = linhas.find(l => l.id === gravando.id) || {};
                        const linha = { ...original, id: 99, ...gravando };
                        if(gravando.id) linha.id = gravando.id;
                        return (ok) => ok({ data: modo === "insert" ? linha : [linha], error: null });
                    }
                    const data = inicio !== 0 ? [] : tabela === "agendamentos" ? linhas : tabela === "transportadoras" ? [{ id: 1, nome: "Trans A" }] : [];
                    return (ok) => ok({ data, error: null, count: data.length });
                }
                if(nome === "range") return (a) => { inicio = a; return q; };
                if(nome === "insert" || nome === "update") return (dados) => { modo = nome; gravando = { ...dados }; window.__gravados.push({ tabela, modo: nome, dados }); return q; };
                if(nome === "eq") return (coluna, valor) => { if(gravando && coluna === "id") gravando.id = valor; return q; };
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
        storage: { from: () => ({
            remove: async (caminhos) => { window.__removidos.push(...caminhos); return { data: null, error: null }; },
            upload: async () => ({ data: null, error: null }),
            createSignedUrl: async () => ({ data: { signedUrl: "#" }, error: null })
        }) }
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

let navegador = null;

(async () => {

    navegador = await chromium.launch({ channel: "chrome", headless: true });
    const contexto = await navegador.newContext({ viewport: { width: 1500, height: 1000 } });
    await contexto.route("**/*", (rota) => {
        const url = new URL(rota.request().url());
        if(url.pathname.endsWith("/vendor/supabase-2.45.0.js")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso });
        if(url.hostname !== "agenda.test") return rota.abort();
        if(url.pathname.endsWith("auth-guard.js")) return rota.fulfill({ contentType: "text/javascript", body: authFalso });
        const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
        if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
        return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
    });
    const pagina = await contexto.newPage();
    const erros = [];
    const dialogos = [];
    pagina.on("pageerror", e => erros.push(e.message));
    pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_FAILED|Valor salvo inválido/.test(m.text())) erros.push(m.text()); });
    pagina.on("dialog", d => { dialogos.push(d.message()); d.accept(); });
    await pagina.goto("http://agenda.test/agenda.html");
    await pagina.waitForSelector("tr.ag-item");
    await pagina.waitForTimeout(50);

    const ultimoGravado = () => pagina.evaluate(() => window.__gravados.filter(g => g.tabela === "agendamentos").pop());

    // ---------- o tipo ----------
    confere("Frete frustrado na lista de tipos do formulário", await pagina.evaluate(() => [...document.getElementById("agTipo").options].some(opcao => opcao.value === "Frete frustrado")));
    confere("não reserva a máquina (voltou para o pátio) e não vai para a expedição", await pagina.evaluate(() =>
        !agendamentoReservaMaquina({ tipo: "Frete frustrado", status: "Concluído", plataforma: "WAE18R001" }) &&
        !agendamentoReservaMaquina({ tipo: "Frete frustrado", status: "Confirmado", plataforma: "WAE18R001" }) &&
        !TIPOS_EXPEDICAO.includes("Frete frustrado")
    ));

    // ---------- a entrega vira frete frustrado ----------
    await pagina.evaluate(() => abrirModalAgenda(1));
    await pagina.selectOption("#agTipo", "Frete frustrado");
    confere("frete frustrado: o faturamento some do formulário", !(await pagina.isVisible(".etapa-faturamento")));
    await pagina.evaluate(() => { document.getElementById("agFrete").value = "700,00"; });
    await pagina.click("#btnSalvarAgenda");
    await pagina.waitForTimeout(200);
    const gravado = await ultimoGravado();
    confere("salva como frete frustrado, com o frete digitado (ida + volta)", gravado?.modo === "update" && gravado.dados.tipo === "Frete frustrado" && gravado.dados.frete === 700, gravado?.dados);
    confere("sem a pergunta de apagar o faturamento", dialogos.length === 0, dialogos);
    confere("o faturamento da entrega não vai no salvar (fica como está no banco)", gravado && ["forma_pagamento", "prazos_pagamento", "pedido_compra", "pedido_numero", "pedido_pdf_caminho", "pedido_pdf_nome"].every(coluna => !(coluna in gravado.dados)), gravado && Object.keys(gravado.dados));
    confere("o PDF do pedido não é apagado", (await pagina.evaluate(() => window.__removidos)).length === 0, await pagina.evaluate(() => window.__removidos));
    const item = await pagina.evaluate(() => { const ag = agendamentos.find(a => a.id === 1); return { tipo: ag.tipo, forma: ag.formaPagamento, pdf: ag.pedidoPdfCaminho }; });
    confere("na agenda continua com o faturamento guardado", item.tipo === "Frete frustrado" && item.forma === "Boleto" && item.pdf === "1/pedido.pdf", item);
    const tag = await pagina.$eval("tr.ag-item .tag[data-tipo]", t => [t.textContent, getComputedStyle(t).backgroundColor]);
    confere("na lista: a etiqueta Frete frustrado em vermelho", tag[0] === "Frete frustrado" && tag[1] === "rgb(185, 28, 28)", tag);
    await pagina.screenshot({ path: path.join(saida, "agenda-frete-frustrado.png") });

    // ---------- duplicar: a entrega remarcada ----------
    await pagina.evaluate(() => duplicarAgendamento(agendamentos.find(a => a.id === 1)));
    const copia = await pagina.evaluate(() => ({
        tipo: document.getElementById("agTipo").value,
        frete: document.getElementById("agFrete").value,
        data: document.getElementById("agData").value,
        cliente: document.getElementById("agCliente").value,
        forma: document.getElementById("agFormaPagamento").value,
        aviso: document.getElementById("avisoRascunho").innerText
    }));
    confere("duplicar o frete frustrado abre a entrega remarcada: tipo Entrega, frete e data em branco", copia.tipo === "Entrega" && copia.frete === "" && copia.data === "" && copia.cliente === "Construtora Alfa", copia);
    confere("a forma de pagamento da entrega vai junto", copia.forma === "Boleto", copia.forma);
    confere("o aviso explica", copia.aviso.includes("Entrega remarcada") && copia.aviso.includes("informe o frete"), copia.aviso);

    confere("sem erros no console", erros.length === 0, erros);
    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exitCode = falhas ? 1 : 0;

})().catch(async erro => {
    console.error(erro);
    await navegador?.close();
    process.exitCode = 1;
});
