// Agenda: tipo "Entrega/Coleta" (o cliente troca de máquina: numa viagem leva a nova e traz a
// que tinha). Igual à troca técnica no caminho (máquina de coleta, ⇄ na lista, 🔁 no Zap, vai
// para a expedição e reserva a máquina nova), mas cada máquina é de uma proposta: duas referências
// da mensagem do Zap digitadas inteiras (a da coleta, coluna referencia_recolha, sai primeiro) e
// faturamento como a entrega. Na 📦 Demanda a nova sai e a outra volta.
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

const base = { status: "Confirmado", horario: "08:00", transportadora: "Trans A", frete_conta: "nossa", prazos_pagamento: [] };

const linhas = [
    // devolve a WTE12 e passa para uma WTE16: uma referência para cada proposta (a da entrega em
    // branco: montada como sempre)
    { ...base, id: 1, tipo: "Entrega/Coleta", data: dia(0), plataforma: "WTE16R010", plataforma_recolha: "WTE12R020",
        cliente: "Construtora Alfa", proposta: "713000", periodo: "28 dias",
        referencia_recolha: "ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA CONSTRUTORA ALFA_WTE12_15 DIAS - Proposta: 712804",
        destino_nome: "Obra Alfa", destino_endereco: "Rua X, 10, Brusque/SC", frete: 400, contato: "João", card: "CARD-1" },
    { ...base, id: 2, tipo: "Troca técnica", data: dia(0), horario: "09:00", plataforma: "WAE18R030", plataforma_recolha: "WAE18R031",
        cliente: "Beta", proposta: "700100", destino_endereco: "Rua Y, Itajaí/SC", frete: 200 },
    { ...base, id: 3, tipo: "Entrega", data: dia(0), horario: "10:00", plataforma: "WTE12R040", cliente: "Gama", proposta: "713500",
        destino_endereco: "Rua Z, Itajaí/SC", frete: 300 }
];

const clienteFalso = `
window.__gravados = [];
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
            remove: async () => ({ data: null, error: null }),
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

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2" };

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
    const quantosGravados = () => pagina.evaluate(() => window.__gravados.filter(g => g.tabela === "agendamentos").length);
    const visivel = (seletor) => pagina.isVisible(seletor);
    const salvar = async () => { await pagina.click("#btnSalvarAgenda"); await pagina.waitForTimeout(200); };
    const linhaDe = (id) => pagina.locator("tr.ag-item", { has: pagina.locator(`.ag-titulo:has-text("${id}")`) });

    // ---------- o tipo e a lista ----------
    confere("Entrega/Coleta na lista de tipos do formulário", await pagina.evaluate(() => [...document.getElementById("agTipo").options].some(opcao => opcao.value === "Entrega/Coleta")));
    confere("vai para a expedição e reserva a máquina nova (como a entrega)", await pagina.evaluate(() =>
        TIPOS_EXPEDICAO.includes("Entrega/Coleta") &&
        agendamentoReservaMaquina({ tipo: "Entrega/Coleta", status: "Confirmado", plataforma: "WTE16R010" })
    ));
    const linha1 = linhaDe("WTE16R010");
    const tag = await linha1.locator(".tag[data-tipo]").evaluate(t => [t.textContent, getComputedStyle(t).backgroundColor]);
    confere("na lista: a etiqueta Entrega/Coleta em verde", tag[0] === "Entrega/Coleta" && tag[1] === "rgb(21, 128, 61)", tag);
    const textoLinha = await linha1.innerText();
    confere("na lista: as duas máquinas (a que vai ⇄ a que volta)", textoLinha.includes("WTE16R010") && textoLinha.includes("⇄") && textoLinha.includes("WTE12R020"), textoLinha);
    confere("na lista: o botão 🧾 do faturamento e o ↩️ da coleta da máquina nova", await linha1.locator(".btn-faturamento").evaluate(b => b.style.visibility !== "hidden") && await linha1.locator(".btn-coleta").evaluate(b => b.style.visibility !== "hidden"));
    await pagina.screenshot({ path: path.join(saida, "agenda-entrega-coleta.png") });

    // ---------- mensagem do Zap ----------
    const zap = await pagina.evaluate(() => montarTextoZap(agendamentos.find(a => a.id === 1)).texto || "");
    confere("Zap: o nome do tipo no título", zap.startsWith("🚚 AGENDAMENTO DE ENTREGA/COLETA"), zap.split("\n")[0]);
    confere("Zap: a máquina nova no equipamento e a outra na coleta do mesmo local", zap.includes("*Equipamento:* WTE16R010") && zap.includes("🔁 Coleta no mesmo local WTE12R020 e retorna para WR."), zap);
    confere("Zap: as duas referências, a da coleta (digitada) e depois a da entrega (montada)", zap.includes("* ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA CONSTRUTORA ALFA_WTE12_15 DIAS - Proposta: 712804\n* CONSTRUTORA ALFA_WTE16_28 DIAS - Proposta: 713000"), zap);
    const zapTroca = await pagina.evaluate(() => montarTextoZap(agendamentos.find(a => a.id === 2)).texto || "");
    confere("Zap da troca técnica continua igual", zapTroca.startsWith("🚚 AGENDAMENTO DE TROCA") && zapTroca.includes("🔁 Coleta no mesmo local WAE18R031"), zapTroca.split("\n")[0]);
    const erroZap = await pagina.evaluate(() => montarTextoZap({ ...agendamentos.find(a => a.id === 1), plataformaRecolha: "" }).erro);
    confere("Zap sem a máquina de coleta: avisa", erroZap === "Informe a máquina de coleta", erroZap);

    // referência digitada à mão (o nome da proposta no sistema): a da coleta sai no mesmo jeito
    const referencias = (extra) => pagina.evaluate((extra) => {
        const resultado = montarTextoZap({ ...agendamentos.find(a => a.id === 1), ...extra });
        return resultado.erro || resultado.texto.split(String.fromCharCode(10)).filter(linha => linha.startsWith("* ") && linha.includes("Proposta"));
    }, extra);
    // o exemplo de verdade: as duas digitadas, saem do jeito que foram digitadas
    const orbmaq = {
        plataforma: "WTE16L007", plataformaRecolha: "WTE14L060", cliente: "ORBMAQ", proposta: "", periodo: "",
        referenciaRecolha: "ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA ORBMAQ_WTE14_2 DIAS - Proposta: 713740",
        referencia: "ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA ORBMAQ_WTE16_2 DIAS - Proposta: 713833"
    };
    let refs = await referencias(orbmaq);
    confere("Zap: as duas propostas, cada uma do jeito que foi digitada (a da coleta primeiro)", JSON.stringify(refs) === JSON.stringify([
        "* ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA ORBMAQ_WTE14_2 DIAS - Proposta: 713740",
        "* ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA ORBMAQ_WTE16_2 DIAS - Proposta: 713833"
    ]), refs);
    refs = await referencias({ ...orbmaq, referenciaRecolha: "" });
    confere("Zap sem a referência da coleta: avisa (não sai com uma proposta só)", refs === "Informe a referência da coleta (mensagem do Zap)", refs);

    // ---------- 📦 Demanda ----------
    const demanda = await pagina.evaluate(([de, ate]) => demandaPorModelo(agendamentos, de, ate).modelos.map(m => `${m.modelo}:${m.saem}/${m.voltam}`).sort().join(" "), [dia(0), dia(0)]);
    confere("Demanda: a máquina nova sai e a da coleta volta (a recolha da troca técnica não volta)", demanda === "WAE18:1/0 WTE12:1/1 WTE16:1/0", demanda);

    // ---------- formulário ----------
    await pagina.evaluate(() => abrirModalAgenda(1));
    const formulario = await pagina.evaluate(() => ({
        recolha: document.getElementById("rotuloRecolha").innerText,
        plataforma: document.getElementById("rotuloPlataforma").innerText,
        referencia: document.getElementById("rotuloReferencia").innerText,
        referenciaColeta: document.getElementById("agReferenciaRecolha").value,
        retiradaRecolhida: document.getElementById("tituloRetirada").classList.contains("recolhida")
    }));
    confere("formulário: máquina de entrega e máquina de coleta", await visivel("#blocoRecolha") && formulario.plataforma === "Máquina de entrega" && formulario.recolha.startsWith("Máquina de coleta"), formulario);
    confere("formulário: a referência da coleta e a de sempre como a da entrega", formulario.referencia.startsWith("Referência da entrega") && await visivel("#agReferenciaRecolha") && formulario.referenciaColeta.includes("Proposta: 712804"), formulario);
    confere("formulário: sem número nem período da proposta da coleta", !(await pagina.$("#agPropostaRecolha")) && !(await pagina.$("#agPeriodoRecolha")));
    await pagina.locator("#agReferenciaRecolha").scrollIntoViewIfNeeded();
    await pagina.screenshot({ path: path.join(saida, "agenda-entrega-coleta-formulario.png") });
    confere("formulário: tem o faturamento (contrato novo) e a retirada vem recolhida (W Rental)", await visivel(".etapa-faturamento") && formulario.retiradaRecolhida, formulario.retiradaRecolhida);

    await pagina.fill("#agReferenciaRecolha", "ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA CONSTRUTORA ALFA_WTE12_20 DIAS - Proposta: 712804");
    await salvar();
    let gravado = await ultimoGravado();
    confere("salva a máquina e a referência da coleta", gravado?.modo === "update" && gravado.dados.tipo === "Entrega/Coleta" && gravado.dados.plataforma_recolha === "WTE12R020" && gravado.dados.referencia_recolha === "ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA CONSTRUTORA ALFA_WTE12_20 DIAS - Proposta: 712804" && gravado.dados.proposta === "713000", gravado?.dados);

    await pagina.evaluate(() => abrirModalAgenda(1));
    await pagina.fill("#agPlataformaRecolha", "");
    const antes = await quantosGravados();
    await salvar();
    confere("sem a máquina de coleta: avisa e não salva", (await quantosGravados()) === antes && (await pagina.innerText("#toast")).includes("Informe a máquina de coleta"), await pagina.innerText("#toast"));
    await pagina.evaluate(() => fecharModalAgenda?.());
    await pagina.waitForTimeout(100);

    // ---------- os outros tipos ----------
    await pagina.evaluate(() => abrirModalAgenda(2));
    confere("troca técnica: máquina de recolha, sem a referência da coleta e sem faturamento", (await pagina.innerText("#rotuloRecolha")).startsWith("Máquina de recolha") && !(await visivel("#agReferenciaRecolha")) && !(await visivel(".etapa-faturamento")) && (await pagina.innerText("#rotuloReferencia")).startsWith("Referência da mensagem do Zap"));
    await salvar();
    gravado = await ultimoGravado();
    confere("outro tipo que nunca teve: a referência da coleta nem vai para o banco (salvar funciona antes do SQL)", gravado?.dados.tipo === "Troca técnica" && !("referencia_recolha" in gravado.dados), gravado && Object.keys(gravado.dados));

    await pagina.evaluate(() => abrirModalAgenda(1));
    await pagina.selectOption("#agTipo", "Entrega");
    confere("virou Entrega: a referência da coleta some", !(await visivel("#agReferenciaRecolha")) && !(await visivel("#blocoRecolha")));
    await salvar();
    gravado = await ultimoGravado();
    confere("virou Entrega: a máquina e a referência da coleta são apagadas", gravado?.dados.tipo === "Entrega" && gravado.dados.plataforma_recolha === "" && gravado.dados.referencia_recolha === "", gravado?.dados);

    // ---------- ↩️ coleta da máquina nova ----------
    await pagina.evaluate(() => copiarEntregaParaColeta({ ...agendamentos.find(a => a.id === 1), tipo: "Entrega/Coleta", plataformaRecolha: "WTE12R020", referenciaRecolha: "ORÇAMENTO DE LOCAÇÃO DE PLATAFORMA CONSTRUTORA ALFA_WTE12_15 DIAS - Proposta: 712804" }));
    const coleta = await pagina.evaluate(() => ({
        tipo: document.getElementById("agTipo").value,
        plataforma: document.getElementById("agPlataforma").value,
        proposta: document.getElementById("agProposta").value,
        referenciaColeta: document.getElementById("agReferenciaRecolha").value,
        recolha: document.getElementById("agPlataformaRecolha").value
    }));
    confere("↩️: a coleta da máquina nova, com a proposta da entrega", coleta.tipo === "Coleta" && coleta.plataforma === "WTE16R010" && coleta.proposta === "713000" && !coleta.referenciaColeta && !coleta.recolha, coleta);

    confere("sem erros na página", erros.length === 0, erros);

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exitCode = falhas ? 1 : 0;

})().catch(async erro => {
    console.error(erro);
    await navegador?.close();
    process.exitCode = 1;
});
