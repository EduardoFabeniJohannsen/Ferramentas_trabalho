// Agenda: ✉️ Email de agendamento da coleta (na coleta, o mesmo botão que na entrega é o da
// renovação). O texto do modelo real (coleta de 18/11/2026 no Balneário Shopping) sai igual;
// cliente sem Inscrição Estadual troca as instruções da NF de devolução pelo aviso de que a W
// Rental emite. A janela: preenchida pela coleta (endereço do Sisloc arrumado, CONFIRMAR vira
// "A confirmar"), alertas, prévia, cópias (assunto e email formatado) e o Esc. Banco simulado:
// nada aqui toca o Supabase de produção.
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
const br = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const base = { status: "Concluído", horario: "08:00", transportadora: "Trans A", frete_conta: "nossa", prazos_pagamento: [], periodo: "28 dias" };

const linhas = [
    // o exemplo do email real (com a data daqui a 3 dias)
    { ...base, id: 1, tipo: "Coleta", data: dia(3), horario: "23:00", plataforma: "WTE14L039 + WTE14L060", cliente: "Balneario Shopping Center Ltda",
        origem_nome: "Balneário Shopping", origem_endereco: "Av. Santa Catarina, 1 - Estados, Balneário Camboriú - SC, 88339-005" },
    // endereço do Sisloc, horário a confirmar, uma máquina, data que já passou
    { ...base, id: 2, tipo: "Coleta", data: dia(-1), horario: "CONFIRMAR", plataforma: "WAE18R009", cliente: "Gama Obras",
        origem_endereco: "R PRESIDENTE COSTA E SILVA Numero: 740 Complemento: - Bairro: TESTO REGA Cidade: POMERODE Estado: SC" },
    { ...base, id: 3, tipo: "Entrega", data: dia(-20), periodo: "25 dias", plataforma: "WTE8C15", cliente: "Diagonal Tecidos", destino_nome: "Diagonal" },
    { ...base, id: 4, tipo: "Troca técnica", data: dia(-5), plataforma: "WTE12C001", cliente: "Delta Troca", destino_nome: "Obra Delta" }
];

const clienteFalso = `
window.supabase = { createClient(){
    const linhas = ${JSON.stringify(linhas)};
    const consulta = (tabela) => {
        let inicio = 0;
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then"){
                    const data = inicio !== 0 ? [] : tabela === "agendamentos" ? linhas : tabela === "transportadoras" ? [{ id: 1, nome: "Trans A" }] : [];
                    return (ok) => ok({ data, error: null, count: data.length });
                }
                if(nome === "range") return (a) => { inicio = a; return q; };
                return () => q;
            }
        });
        return q;
    };
    return {
        from: consulta,
        rpc: async () => ({ data: [], error: null }),
        channel: () => ({ on(){ return this; }, subscribe(){ return this; }, track: async () => "ok", send: async () => "ok" }),
        auth: {
            getSession: async () => ({ data: { session: { user: { id: "u1", email: "t@t" } } } }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
        },
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
    const contexto = await navegador.newContext({ viewport: { width: 1400, height: 1000 } });
    await contexto.route("**/*", (rota) => {
        const url = new URL(rota.request().url());
        if(url.pathname.endsWith("/vendor/supabase-2.45.0.js")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso });
        if(url.hostname !== "agenda.test") return rota.abort();
        if(url.pathname.endsWith("auth-guard.js")) return rota.fulfill({ contentType: "text/javascript", body: authFalso });
        const arquivo = path.join(raiz, decodeURIComponent(url.pathname));
        if(!fs.existsSync(arquivo)) return rota.fulfill({ status: 404, body: "" });
        return rota.fulfill({ contentType: tipos[path.extname(arquivo)] || "text/plain", body: fs.readFileSync(arquivo) });
    });
    // o que foi copiado (texto e HTML)
    await contexto.addInitScript(() => {
        window.__copiado = null;
        window.__copiadoHtml = null;
        // o teste roda sem https, onde o navegador não tem o ClipboardItem (no site tem)
        window.ClipboardItem = class { constructor(itens){ this.itens = itens; } async getType(tipo){ return this.itens[tipo]; } };
        Object.defineProperty(navigator, "clipboard", { value: {
            writeText: async (texto) => { window.__copiado = texto; },
            write: async (itens) => {
                window.__copiadoHtml = await (await itens[0].getType("text/html")).text();
                window.__copiado = await (await itens[0].getType("text/plain")).text();
            }
        } });
    });
    const pagina = await contexto.newPage();
    const erros = [];
    pagina.on("pageerror", e => erros.push(e.message));
    pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_FAILED|Valor salvo inválido/.test(m.text())) erros.push(m.text()); });
    await pagina.goto("http://agenda.test/agenda.html");
    await pagina.click("#btnModoTransportador");
    await pagina.waitForSelector("tr.ag-item");
    await pagina.waitForTimeout(50);

    // espera a página (sem waitForFunction: a CSP da agenda bloqueia)
    const esperar = async (condicao) => {
        for(let vez = 0; vez < 60; vez++){
            if(await pagina.evaluate(condicao)) return true;
            await pagina.waitForTimeout(50);
        }
        return false;
    };

    // ---------- o texto do exemplo real ----------
    const exemplo = await pagina.evaluate(() => {
        const dados = {
            cliente: "Balneario Shopping Center Ltda", data: "2026-11-18", horario: "23:00",
            equipamentos: equipamentosColeta("WTE14L039 + WTE14L060"),
            local: "Balneário Shopping", endereco: "Av. Santa Catarina, 1 - Estados, Balneário Camboriú - SC, 88339-005",
            semIe: false
        };
        const campos = camposEmailColeta(dados);
        const semIe = camposEmailColeta({ ...dados, semIe: true });
        const uma = camposEmailColeta({ ...dados, equipamentos: "WAE18R009", horario: "confirmar" });
        const perigoso = htmlEmailColeta(camposEmailColeta({ ...dados, local: "<b>Obra</b>" }));
        return {
            assunto: assuntoEmailColeta(campos), texto: textoEmailColeta(campos), html: htmlEmailColeta(campos),
            semIe: textoEmailColeta(semIe), semIeHtml: htmlEmailColeta(semIe),
            uma: textoEmailColeta(uma).split("\n").slice(2, 4),
            varias: equipamentosColeta("2x WTE12 + WAE18R001"),
            perigoso: perigoso.includes("&lt;b&gt;Obra&lt;/b&gt;") && !perigoso.includes("<b>Obra</b>")
        };
    });
    // o modelo que o pessoal usa, com o dia da semana escrito certo ("Quarta-feira") e
    // os itens com • (no Outlook eram marcadores de lista)
    const esperado = [
        "⚠️ Instruções para Coleta do Equipamento",
        "📅 Data da coleta: 18/11/2026 – Quarta-feira",
        "🕒 Horário previsto: 23:00",
        "🚜Equipamentos: WTE14L039 / WTE14L060",
        "",
        "📍Local: Balneário Shopping",
        "📍Endereço: Av. Santa Catarina, 1 - Estados, Balneário Camboriú - SC, 88339-005",
        "",
        "• Para garantir agilidade, segurança e evitar contratempos no momento da retirada, solicitamos atenção às orientações abaixo:",
        "🚛 Acesso para o caminhão",
        "• Deixar a máquina em local que permita fácil aproximação e manobra do caminhão transportador.",
        "",
        "📍 Localização clara dentro da obra",
        "• Informar previamente o ponto exato onde o equipamento estará disponível.",
        "• Em obras de grande porte, é indispensável que a equipe responsável saiba indicar corretamente a localização da máquina.",
        "",
        "🔋 Equipamentos elétricos",
        "• Devem ser devolvidos com carga na bateria.",
        "",
        "⛽ Equipamentos a diesel",
        "• Devem ser devolvidos com, no mínimo, meio tanque de combustível.",
        "",
        "O não atendimento das orientações acima poderá gerar atrasos e custos adicionais por reprogramação.",
        "",
        "⚠️ Instruções para Emissão de Nota Fiscal",
        "🚫 ATENÇÃO",
        "• A nota de retorno deve referenciar no campo de observação a nota de remessa do equipamento exemplo \"REF NF 018908\"",
        "",
        "⚠️ CFOP aceitos para NF de devolução:",
        "• CFOP 5.909 – Retorno de bem recebido por conta de contrato de comodato.",
        "• CFOP 6.909 – Retorno de bem recebido por conta de contrato de comodato ou locação.",
        "",
        "📎 NF DE REMESSA EM ANEXO",
        "• Encaminharemos em anexo a Nota Fiscal de Remessa para auxiliar na correta emissão da NF de Devolução"
    ].join("\n");
    confere("corpo: o modelo do email real", exemplo.texto === esperado, exemplo.texto);
    confere("assunto: no padrão do da renovação, com os marcadores", exemplo.assunto === "AGENDAMENTO DE COLETA -> NÚMEROCONTRATO ( WTE14L039 / WTE14L060 ) -> NÚMERO - BALNEARIO SHOPPING CENTER LTDA", exemplo.assunto);
    const fimSemIe = "\n\n⚠️ Nota Fiscal de Retorno\n• Como o cliente não possui Inscrição Estadual, a NF de Retorno será emitida pela W Rental: não é necessário emitir a NF de devolução.";
    confere("sem Inscrição Estadual: no lugar das instruções da NF, a W Rental emite", exemplo.semIe === esperado.slice(0, esperado.indexOf("\n\n⚠️ Instruções para Emissão")) + fimSemIe && !exemplo.semIeHtml.includes("CFOP"), exemplo.semIe.slice(-400));
    confere("uma máquina: Equipamento; CONFIRMAR vira A confirmar", JSON.stringify(exemplo.uma) === JSON.stringify(["🕒 Horário previsto: A confirmar", "🚜Equipamento: WAE18R009"]), exemplo.uma);
    confere("quantidade fica junto da máquina", exemplo.varias === "2x WTE12 / WAE18R001", exemplo.varias);
    confere("HTML: Calibri 11, data e horário em amarelo, títulos em negrito", exemplo.html.includes("font-family:Calibri,sans-serif;font-size:11pt") && exemplo.html.includes('<span style="background:yellow">18/11/2026 – Quarta-feira</span>') && exemplo.html.includes('<span style="background:yellow">23:00</span>') && exemplo.html.includes("<b>🚛 Acesso para o caminhão</b>") && exemplo.html.includes("<b>📎 NF DE REMESSA EM ANEXO</b>"));
    confere("HTML: o que vem da agenda entra como texto", exemplo.perigoso);
    // o HTML tem as mesmas linhas do texto (as em branco também)
    const linhasHtml = await pagina.evaluate((html) => { const div = document.createElement("div"); div.innerHTML = html; return [...div.querySelectorAll("p")].map(p => p.textContent.replace(/ /g, " ").trim()).join("\n"); }, exemplo.html);
    confere("HTML: as mesmas linhas do texto", linhasHtml === esperado, linhasHtml);

    // ---------- o botão ----------
    const botao = (cliente) => pagina.locator("tr.ag-item", { hasText: cliente }).locator(".btn-renovacao");
    confere("✉️ na coleta (email da coleta) e na entrega (renovação); na troca técnica fica invisível",
        await botao("Balneario").isVisible() && (await botao("Balneario").getAttribute("title")).includes("agendamento da coleta") &&
        (await botao("Diagonal").getAttribute("title")).includes("renovação") &&
        (await botao("Delta Troca").evaluate(b => b.style.visibility)) === "hidden");

    // ---------- a janela ----------
    await botao("Balneario").click();
    await esperar(() => document.getElementById("modalEmailColeta").classList.contains("aberto"));
    const janela = await pagina.evaluate(() => ({
        renovacao: document.getElementById("modalRenovacao").classList.contains("aberto"),
        data: document.getElementById("emailColetaData").value,
        horario: document.getElementById("emailColetaHorario").value,
        equipamentos: document.getElementById("emailColetaEquipamentos").value,
        local: document.getElementById("emailColetaLocal").value,
        endereco: document.getElementById("emailColetaEndereco").value,
        semIe: document.getElementById("emailColetaSemIe").checked,
        assunto: document.getElementById("assuntoEmailColeta").innerText,
        previa: document.getElementById("previaEmailColeta").innerText,
        alertas: document.getElementById("alertasEmailColeta").innerText,
        semana: diaDaSemanaColeta(document.getElementById("emailColetaData").value)
    }));
    confere("abre preenchida pela coleta (data, horário, máquinas, local e endereço da retirada)", !janela.renovacao && janela.data === dia(3) && janela.horario === "23:00" && janela.equipamentos === "WTE14L039 / WTE14L060" && janela.local === "Balneário Shopping" && janela.endereco.startsWith("Av. Santa Catarina") && !janela.semIe, janela);
    confere("prévia com a data e o dia da semana; sem alertas", janela.previa.includes(`Data da coleta: ${br(dia(3))} – ${janela.semana}`) && janela.previa.includes("CFOP 5.909") && janela.alertas === "" && janela.assunto.includes("( WTE14L039 / WTE14L060 )"), [janela.previa.split("\n").slice(0, 3), janela.alertas]);
    await pagina.screenshot({ path: path.join(saida, "agenda-email-coleta.png") });

    // sem Inscrição Estadual
    await pagina.check("#emailColetaSemIe");
    const previaSemIe = await pagina.innerText("#previaEmailColeta");
    confere("marcar sem Inscrição Estadual troca as instruções da NF", previaSemIe.includes("a NF de Retorno será emitida pela W Rental") && !previaSemIe.includes("CFOP") && !previaSemIe.includes("NF DE REMESSA EM ANEXO"), previaSemIe.slice(-300));
    await pagina.click("#btnCopiarEmailColeta");
    await pagina.waitForTimeout(100);
    let copia = await pagina.evaluate(() => ({ texto: window.__copiado, html: window.__copiadoHtml }));
    confere("copia o email sem IE (formatado e o texto), sem pedir o anexo", copia.html?.includes("background:yellow") && copia.texto.includes("emitida pela W Rental") && !copia.texto.includes("CFOP") && (await pagina.innerText("#toast")) === "Email copiado", [copia.texto?.slice(-200), await pagina.innerText("#toast")]);
    await pagina.uncheck("#emailColetaSemIe");

    // campos editados entram no email
    await pagina.fill("#emailColetaHorario", "14:00");
    await pagina.fill("#emailColetaLocal", "Balneário Shopping - Doca 2");
    const previaEditada = await pagina.innerText("#previaEmailColeta");
    confere("horário e local digitados entram no email", previaEditada.includes("Horário previsto: 14:00") && previaEditada.includes("Local: Balneário Shopping - Doca 2"), previaEditada.split("\n").slice(0, 7));

    // copiar
    await pagina.click("#btnCopiarAssuntoEmailColeta");
    await pagina.waitForTimeout(100);
    confere("copia o assunto e avisa o que trocar", (await pagina.evaluate(() => window.__copiado)) === "AGENDAMENTO DE COLETA -> NÚMEROCONTRATO ( WTE14L039 / WTE14L060 ) -> NÚMERO - BALNEARIO SHOPPING CENTER LTDA" && (await pagina.innerText("#toast")).includes("troque NÚMEROCONTRATO e NÚMERO"), await pagina.evaluate(() => window.__copiado));
    await pagina.click("#btnCopiarEmailColeta");
    await pagina.waitForTimeout(100);
    copia = await pagina.evaluate(() => ({ texto: window.__copiado, html: window.__copiadoHtml }));
    confere("copia o email com as instruções da NF e lembra do anexo", copia.html?.includes("CFOP 6.909") && copia.texto.includes("Horário previsto: 14:00") && copia.texto.endsWith("correta emissão da NF de Devolução") && (await pagina.innerText("#toast")).includes("anexe a NF de remessa"), [copia.texto?.slice(-120), await pagina.innerText("#toast")]);

    // sem data: não copia
    await pagina.fill("#emailColetaData", "");
    await pagina.locator("#emailColetaData").dispatchEvent("change");
    confere("sem data: pede a data e não copia", await pagina.isDisabled("#btnCopiarEmailColeta") && await pagina.isDisabled("#btnCopiarAssuntoEmailColeta") && (await pagina.innerText("#previaEmailColeta")).includes("Informe a data da coleta") && (await pagina.innerText("#alertasEmailColeta")).includes("Informe a data da coleta"));

    await pagina.keyboard.press("Escape");
    confere("Esc fecha", !(await pagina.isVisible("#modalEmailColeta")));

    // ---------- endereço do Sisloc, horário a confirmar, data que passou ----------
    await botao("Gama Obras").click();
    await esperar(() => document.getElementById("modalEmailColeta").classList.contains("aberto"));
    const gama = await pagina.evaluate(() => ({
        endereco: document.getElementById("emailColetaEndereco").value,
        previa: document.getElementById("previaEmailColeta").innerText,
        alertas: document.getElementById("alertasEmailColeta").innerText
    }));
    confere("endereço do Sisloc arrumado e CONFIRMAR como A confirmar", gama.endereco === "R Presidente Costa e Silva, 740 - Testo Rega, Pomerode/SC" && gama.previa.includes("Horário previsto: A confirmar") && gama.previa.includes("Equipamento: WAE18R009"), gama);
    confere("data que passou e local em branco: avisa", gama.alertas.includes("A data da coleta já passou") && gama.alertas.includes("Em branco: Local"), gama.alertas);
    await pagina.click("#modalEmailColeta .btn-fechar");
    confere("× fecha", !(await pagina.isVisible("#modalEmailColeta")));

    confere("sem erros na página", erros.length === 0, erros);

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exitCode = falhas ? 1 : 0;

})().catch(async erro => {
    console.error(erro);
    await navegador?.close();
    process.exitCode = 1;
});
