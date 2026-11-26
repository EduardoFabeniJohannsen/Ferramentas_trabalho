// Agenda: ✉️ Email de renovação (entrega e entrega/coleta). As contas com datas fixas: feriados
// nacionais (os da Páscoa também), prazo de resposta (fim de semana e feriado: o dia útil
// anterior; já vencido: hoje), dia da semana, vence/venceu, Bom dia/Boa tarde, máquinas do
// mesmo modelo juntas e os avisos extras pelo local. O vencimento pela entrega e o período (o dia
// da entrega conta como o 1º; renova por mais um período igual; 1 período = 30 dias; Anual = 1
// ano). O texto do exemplo real (24/11/2026) sai igual, com os marcadores para trocar no Outlook.
// A janela: vencimento, prazo recalculado, alertas, prévia e as cópias (assunto e email
// formatado). Banco simulado: nada aqui toca o Supabase de produção.
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
    // entregue há 20 dias, 25 dias de locação: vence daqui a 4 dias (o dia da entrega conta)
    { ...base, id: 1, tipo: "Entrega", data: dia(-20), periodo: "25 dias", plataforma: "WTE8C15", cliente: "Diagonal Tecidos Ltda", proposta: "712804",
        destino_nome: "Diagonal Tecidos", destino_endereco: "R. José Gall, 1337 - Ressacada, Itajaí - SC, 88307-101" },
    { ...base, id: 2, tipo: "Coleta", data: dia(-19), plataforma: "WAE18R009", cliente: "Beta" },
    // sem período: a pessoa informa o vencimento
    { ...base, id: 3, tipo: "Entrega", data: dia(-18), periodo: "", plataforma: "WAE18R001", cliente: "Gama", destino_nome: "Obra Gama", link_destino: "https://maps.app.goo.gl/abc" },
    // dentro da WEG: o aviso da nota de retorno vem marcado
    { ...base, id: 4, tipo: "Entrega/Coleta", data: dia(-17), periodo: "20 dias", plataforma: "WTE16L007", plataforma_recolha: "WTE14L060", cliente: "Weg Tintas Ltda",
        destino_nome: "Weg Guaramirim", destino_endereco: "Rua X, Guaramirim/SC" }
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

    // ---------- datas (fixas) ----------
    const contas = await pagina.evaluate(() => {
        const feriados = feriadosNacionais(2026);
        return {
            pascoa: pascoa(2026),
            feriados: ["2026-02-16", "2026-02-17", "2026-04-03", "2026-06-04", "2026-11-02", "2026-11-20", "2026-12-25"].every(d => feriados.has(d)),
            naoFeriado: !feriados.has("2026-11-24"),
            domingo: prazoRenovacao("2026-11-29", false, "2026-11-24"),
            quinta: prazoRenovacao("2026-11-26", false, "2026-11-24"),
            finados: prazoRenovacao("2026-11-02", true, "2026-10-28"),
            sabadoDepoisDeFeriado: prazoRenovacao("2026-11-21", false, "2026-11-17"),
            vencido: prazoRenovacao("2026-11-20", false, "2026-11-24"),
            municipal: prazoRenovacao("2026-12-09", true, "2026-12-01"),
            nuncaAntesDeHoje: prazoRenovacao("2026-11-29", false, "2026-11-28"),
            semana: ["2026-11-29", "2026-11-14", "2026-11-02"].map(diaDaSemanaRenovacao)
        };
    });
    confere("Páscoa de 2026 e os feriados nacionais (Carnaval, Sexta Santa, Corpus Christi, Finados, Consciência Negra)", contas.pascoa === "2026-04-05" && contas.feriados && contas.naoFeriado, contas);
    confere("prazo: vence no domingo, responde na sexta (o exemplo real: 29/11 -> 27/11)", contas.domingo === "2026-11-27", contas.domingo);
    confere("prazo: dia útil, o próprio vencimento", contas.quinta === "2026-11-26", contas.quinta);
    confere("prazo: vence em feriado (Finados, segunda), responde na sexta antes", contas.finados === "2026-10-30", contas.finados);
    confere("prazo: sábado depois de feriado na sexta, responde na quinta", contas.sabadoDepoisDeFeriado === "2026-11-19", contas.sabadoDepoisDeFeriado);
    confere("prazo: já vencido, hoje", contas.vencido === "2026-11-24", contas.vencido);
    confere("prazo: feriado municipal marcado na quarta, responde na terça", contas.municipal === "2026-12-08", contas.municipal);
    confere("prazo: nunca antes de hoje", contas.nuncaAntesDeHoje === "2026-11-28", contas.nuncaAntesDeHoje);
    confere("dia da semana calculado (14/11/2026 é sábado)", JSON.stringify(contas.semana) === JSON.stringify(["domingo", "sábado", "segunda-feira"]), contas.semana);

    // ---------- vencimento pela entrega e o período (fixas) ----------
    const vencimentos = await pagina.evaluate(() => {
        const v = (entrega, periodo, hoje) => { const r = proximoVencimento(entrega, periodo, hoje); return r ? `${r.iso} #${r.numero}` : null; };
        return {
            trinta: v("2026-12-01", "30 dias", "2026-11-25"),
            trintaRenovado: v("2026-12-01", "30 dias", "2027-01-05"),
            noDia: v("2026-12-01", "30 dias", "2026-12-30"),
            periodos: v("2026-09-01", "3 períodos", "2026-11-25"),
            periodosRenovado: v("2026-09-01", "3 períodos", "2026-12-01"),
            dezesseis: v("2026-10-01", "16 dias", "2026-11-25"),
            anual: v("2026-12-01", "Anual", "2026-11-25"),
            anualRenovado: v("2026-12-01", "Anual", "2027-12-05"),
            diaria: v("2026-11-25", "1 dia", "2026-11-25"),
            umPeriodo: v("2026-11-01", "1 período", "2026-11-25"),
            invalido: v("2026-11-01", "abc", "2026-11-25"),
            semData: v("", "30 dias", "2026-11-25"),
            origem: textoOrigemVencimento("2026-09-01", "3 períodos", proximoVencimento("2026-09-01", "3 períodos", "2026-12-01"))
        };
    });
    confere("entrega 01/12 + 30 dias vence 30/12 (o dia da entrega conta como o 1º)", vencimentos.trinta === "2026-12-30 #1", vencimentos.trinta);
    confere("passou o 1º: renova por mais 30 (29/01)", vencimentos.trintaRenovado === "2027-01-29 #2", vencimentos.trintaRenovado);
    confere("no dia do vencimento, vale ele mesmo", vencimentos.noDia === "2026-12-30 #1", vencimentos.noDia);
    confere("3 períodos = 90 dias (29/11); depois renova de 30 em 30 (29/12)", vencimentos.periodos === "2026-11-29 #1" && vencimentos.periodosRenovado === "2026-12-29 #2", [vencimentos.periodos, vencimentos.periodosRenovado]);
    confere("16 dias renova de 16 em 16 (16/10, 01/11, 17/11, 03/12)", vencimentos.dezesseis === "2026-12-03 #4", vencimentos.dezesseis);
    confere("Anual: um ano depois (30/11/2027) e renova de ano em ano", vencimentos.anual === "2027-11-30 #1" && vencimentos.anualRenovado === "2028-11-30 #2", [vencimentos.anual, vencimentos.anualRenovado]);
    confere("1 dia vence no dia da entrega; 1 período = 30 dias", vencimentos.diaria === "2026-11-25 #1" && vencimentos.umPeriodo === "2026-11-30 #1", [vencimentos.diaria, vencimentos.umPeriodo]);
    confere("período não reconhecido ou entrega sem data: nenhum (a pessoa informa)", vencimentos.invalido === null && vencimentos.semData === null);
    confere("de onde veio o vencimento, escrito", vencimentos.origem === "2º vencimento: entrega em 01/09/2026 + 3 períodos (o dia da entrega conta como o 1º), renovando de 30 em 30 dias.", vencimentos.origem);

    // ---------- o texto do exemplo real ----------
    const exemplo = await pagina.evaluate(() => {
        const dados = {
            item: { cliente: "Diagonal Tecidos Ltda", plataforma: "WTE8C15" },
            vencimento: "2026-11-29", prazo: "2026-11-27", feriado: false,
            local: "Diagonal Tecidos", endereco: "R. José Gall, 1337 - Ressacada, Itajaí - SC, 88307-101",
            avisos: [], agora: new Date(2026, 10, 24, 14, 30)
        };
        const campos = camposRenovacao(dados);
        const manha = camposRenovacao({ ...dados, agora: new Date(2026, 10, 24, 9, 0) });
        const depois = camposRenovacao({ ...dados, agora: new Date(2026, 10, 30, 9, 0) });
        const feriado = camposRenovacao({ ...dados, vencimento: "2026-11-02", feriado: true, agora: new Date(2026, 9, 28, 9, 0) });
        const varias = camposRenovacao({ ...dados, item: { cliente: "Parisotti", plataforma: "WTE10025 + WTE10N041 + WAE18R001" } });
        const perigoso = htmlRenovacao(camposRenovacao({ ...dados, local: "<b>Obra</b>" }));
        return {
            assunto: assuntoRenovacao(campos), texto: textoRenovacao(campos), html: htmlRenovacao(campos),
            manha: manha.saudacao, venceu: textoRenovacao(depois).split("\n")[5],
            feriado: textoRenovacao(feriado).split("\n")[5],
            variasAssunto: assuntoRenovacao(varias), variasLinhas: textoRenovacao(varias).split("\n").slice(3, 5),
            variasReferente: textoRenovacao(varias).includes("referente aos equipamentos:"),
            perigoso: perigoso.includes("&lt;b&gt;Obra&lt;/b&gt;") && !perigoso.includes("<b>Obra</b>")
        };
    });
    confere("assunto: o padrão das regras do Outlook, com os marcadores", exemplo.assunto === "RENOVAÇÃO DE LOCAÇÃO -> NÚMEROCONTRATO ( WTE8C15 ) -> NÚMERO - DIAGONAL TECIDOS LTDA", exemplo.assunto);
    // o modelo do email real (24/11/2026) com as melhorias aprovadas: "nos informe",
    // "referente ao equipamento", "vence no dia ... (domingo)", a linha da coleta e
    // o encerramento pelo e-mail ou pelo WhatsApp do consultor
    const esperado = [
        "Boa tarde NOMECONTATO, tudo bem?",
        "",
        "Estamos entrando em contato para lembrar que o contrato de locação nº NÚMEROCONTRATO referente ao equipamento:",
        "DESCRIÇÃOEQUIPAMENTO - (WTE8C15)",
        "",
        "vence no dia 29/11/2026 (domingo)",
        "",
        "Local:  Diagonal Tecidos",
        "Endereço: R. José Gall, 1337 - Ressacada, Itajaí - SC, 88307-101",
        "",
        "Por gentileza, nos informe até o final do dia 27/11 se deseja prorrogar ou encerrar a locação.",
        "Se for encerrar, informe também o melhor dia e horário para a coleta.",
        "Caso não haja retorno, o contrato será renovado automaticamente por mais um período.",
        "",
        "⚠️ Importante:",
        "• O controle da data de vencimento é essencial para evitar renovações não planejadas.",
        "• Equipamentos devolvidos após a data de vencimento terão diárias adicionais, inclusive em finais de semana.",
        "• Se o contrato for renovado automaticamente e o equipamento for devolvido antes do fim do novo período, a fatura de locação não será cancelada: o valor ficará como crédito.",
        "• Para encerrar a locação, basta responder a este e-mail confirmando a coleta ou avisar seu consultor pelo WhatsApp.",
        "",
        "Estamos à disposição para qualquer dúvida.",
        "Desde já, agradecemos pela atenção!"
    ].join("\n");
    confere("corpo: o modelo do email real com as melhorias, com os marcadores", exemplo.texto === esperado, exemplo.texto);
    confere("HTML: vencimento e prazo em amarelo, prazo em 14pt, Calibri 11", exemplo.html.includes('<span style="background:yellow">vence no dia 29/11/2026</span> (domingo)') && exemplo.html.includes('<span style="background:yellow;font-size:14pt">27/11</span>') && exemplo.html.includes("font-family:Calibri,sans-serif;font-size:11pt"));
    confere("HTML: o que vem da agenda entra como texto", exemplo.perigoso);
    confere("Bom dia antes do meio-dia", exemplo.manha === "Bom dia");
    confere("já passou: venceu", exemplo.venceu === "venceu no dia 29/11/2026 (domingo)", exemplo.venceu);
    confere("feriado: na linha do vencimento", exemplo.feriado === "vence no dia 02/11/2026 (segunda-feira, feriado)", exemplo.feriado);
    confere("várias máquinas: as do mesmo modelo juntas (+), uma linha por modelo", exemplo.variasAssunto.includes("( WTE10025 + WTE10N041 + WAE18R001 )") && JSON.stringify(exemplo.variasLinhas) === JSON.stringify(["DESCRIÇÃOEQUIPAMENTO - (WTE10025 + WTE10N041)", "DESCRIÇÃOEQUIPAMENTO - (WAE18R001)"]) && exemplo.variasReferente, [exemplo.variasAssunto, exemplo.variasLinhas]);

    const enderecos = await pagina.evaluate(() => [
        enderecoDoSisloc("R PRESIDENTE COSTA E SILVA Numero: 740 Complemento: - Bairro: TESTO REGA Cidade: POMERODE Estado: SC"),
        enderecoDoSisloc("RUA XV DE NOVEMBRO Numero: 10 Complemento: GALPAO 2 Bairro: CENTRO Cidade: BLUMENAU Estado: SC CEP: 89010-000"),
        enderecoDoSisloc("ROD BR 101 Número: 47305 Bairro: ARAQUARI Cidade: JOINVILLE UF: sc"),
        enderecoDoSisloc("R. José Gall, 1337 - Ressacada, Itajaí - SC, 88307-101")
    ]);
    confere("endereço do Sisloc arrumado (o exemplo de Pomerode)", enderecos[0] === "R Presidente Costa e Silva, 740 - Testo Rega, Pomerode/SC", enderecos[0]);
    confere("endereço do Sisloc: complemento, CEP, número romano e BR", enderecos[1] === "Rua XV de Novembro, 10, Galpao 2 - Centro, Blumenau/SC, CEP 89010-000" && enderecos[2] === "Rod BR 101, 47305 - Araquari, Joinville/SC", enderecos.slice(1, 3));
    confere("endereço digitado (sem os rótulos do Sisloc) fica como está", enderecos[3] === "R. José Gall, 1337 - Ressacada, Itajaí - SC, 88307-101", enderecos[3]);

    const empresas = await pagina.evaluate(() => [
        empresaNfRetorno({ cliente: "WEG Tintas Ltda" }),
        empresaNfRetorno({ cliente: "Parisotti", destinoNome: "Lear" }),
        empresaNfRetorno({ cliente: "J.B. World", destinoNome: "Parque" }),
        empresaNfRetorno({ cliente: "Wegner Construções", destinoNome: "Clear Obras" })
    ]);
    confere("empresa que exige a NF de retorno pelo cliente ou local (WEG, Lear, Beto Carrero; palavra inteira)", JSON.stringify(empresas) === JSON.stringify(["WEG", "Lear", "Beto Carrero World", ""]), empresas);
    const avisoEmpresa = await pagina.evaluate(() => textoAvisoExtra(AVISOS_EXTRAS_RENOVACAO[0], "Karsten"));
    confere("um aviso só para todas, com o nome da empresa", avisoEmpresa === "Informamos que a Karsten não autoriza a retirada do equipamento sem a apresentação da Nota Fiscal de Retorno.", avisoEmpresa);

    // ---------- o botão ----------
    const visivel = (seletor) => pagina.isVisible(seletor);
    const botao = (cliente) => pagina.locator("tr.ag-item", { hasText: cliente }).locator(".btn-renovacao");
    confere("✉️ na entrega e na entrega/coleta; na coleta fica invisível", await botao("Diagonal").isVisible() && await botao("Weg Tintas").isVisible() && (await botao("Beta").evaluate(b => b.style.visibility)) === "hidden");

    // ---------- a janela ----------
    await botao("Diagonal").click();
    await esperar(() => document.getElementById("renovacaoVencimento").value !== "");
    const janela = await pagina.evaluate(() => ({
        aberta: document.getElementById("modalRenovacao").classList.contains("aberto"),
        vencimento: document.getElementById("renovacaoVencimento").value,
        prazo: document.getElementById("renovacaoPrazo").value,
        prazoCalculado: prazoRenovacao(document.getElementById("renovacaoVencimento").value, document.getElementById("renovacaoFeriado").checked, isoDoDiaRenovacao(new Date())),
        origem: document.getElementById("origemVencimento").innerText,
        local: document.getElementById("renovacaoLocal").value,
        endereco: document.getElementById("renovacaoEndereco").value,
        assunto: document.getElementById("assuntoRenovacao").innerText,
        previa: document.getElementById("previaRenovacao").innerText,
        semana: diaDaSemanaRenovacao(document.getElementById("renovacaoVencimento").value),
        marcados: [...document.querySelectorAll("#avisosRenovacao input:checked")].length,
        empresa: document.getElementById("renovacaoEmpresa").value
    }));
    confere("abre com o vencimento pela entrega e o período (entregue há 20 dias, 25 dias: daqui a 4)", janela.aberta && janela.vencimento === dia(4) && janela.origem.startsWith("1º vencimento: entrega em"), janela);
    confere("prazo calculado pela regra", janela.prazo === janela.prazoCalculado, [janela.prazo, janela.prazoCalculado]);
    confere("local e endereço da entrega", janela.local === "Diagonal Tecidos" && janela.endereco.startsWith("R. José Gall"), janela);
    confere("prévia com o vencimento e o dia da semana certos", janela.previa.includes(`vence no dia ${br(dia(4))} (${janela.semana})`) && janela.assunto.includes("( WTE8C15 ) -> NÚMERO - DIAGONAL TECIDOS LTDA"), janela.previa.split("\n").slice(0, 8));
    confere("sem aviso extra marcado (não é WEG nem as outras); o nome da empresa vem do local, para editar", janela.marcados === 0 && janela.empresa === "Diagonal Tecidos", janela);
    await pagina.screenshot({ path: path.join(saida, "agenda-renovacao.png") });

    // adiar o vencimento (a entrega atrasou): o prazo acompanha
    await pagina.fill("#renovacaoVencimento", dia(9));
    await pagina.locator("#renovacaoVencimento").dispatchEvent("change");
    const adiado = await pagina.evaluate(() => [document.getElementById("renovacaoPrazo").value, prazoRenovacao(document.getElementById("renovacaoVencimento").value, document.getElementById("renovacaoFeriado").checked, isoDoDiaRenovacao(new Date()))]);
    confere("mudar o vencimento recalcula o prazo", adiado[0] === adiado[1], adiado);
    confere("vencimento longe: avisa", (await pagina.innerText("#alertasRenovacao")).includes("Vence daqui a 9 dias"), await pagina.innerText("#alertasRenovacao"));
    await pagina.fill("#renovacaoPrazo", dia(10));
    await pagina.locator("#renovacaoPrazo").dispatchEvent("change");
    confere("prazo depois do vencimento: avisa", (await pagina.innerText("#alertasRenovacao")).includes("O prazo de resposta passa do vencimento"), await pagina.innerText("#alertasRenovacao"));
    await pagina.fill("#renovacaoVencimento", dia(-2));
    await pagina.locator("#renovacaoVencimento").dispatchEvent("change");
    confere("já vencido: venceu, prazo hoje e o aviso", (await pagina.inputValue("#renovacaoPrazo")) === dia(0) && (await pagina.innerText("#previaRenovacao")).includes(`venceu no dia ${br(dia(-2))}`) && (await pagina.innerText("#alertasRenovacao")).includes("Já venceu"));
    await pagina.fill("#renovacaoVencimento", dia(4));
    await pagina.locator("#renovacaoVencimento").dispatchEvent("change");

    // avisos extras e local digitado entram na prévia
    await pagina.locator("#avisosRenovacao label", { hasText: "restrição de crédito" }).locator("input").check();
    confere("aviso extra marcado entra no email", (await pagina.innerText("#previaRenovacao")).includes("devido à condição de crédito vigente"));
    await pagina.fill("#renovacaoLocal", "Diagonal Tecidos - Galpão 2");
    const previaLocal = (await pagina.innerText("#previaRenovacao")).replace(/ /g, " ").replace(/ +/g, " ");
    confere("local digitado entra no email", previaLocal.includes("Local: Diagonal Tecidos - Galpão 2"), previaLocal.split("\n").filter(linha => linha.startsWith("Local")));

    // copiar
    await pagina.click("#btnCopiarAssuntoRenovacao");
    await pagina.waitForTimeout(100);
    confere("copia o assunto", (await pagina.evaluate(() => window.__copiado)) === "RENOVAÇÃO DE LOCAÇÃO -> NÚMEROCONTRATO ( WTE8C15 ) -> NÚMERO - DIAGONAL TECIDOS LTDA", await pagina.evaluate(() => window.__copiado));
    await pagina.click("#btnCopiarEmailRenovacao");
    await pagina.waitForTimeout(100);
    const copia = await pagina.evaluate(() => ({ texto: window.__copiado, html: window.__copiadoHtml }));
    confere("copia o email formatado (HTML para o Outlook e o texto)", copia.html?.includes("background:yellow") && copia.texto.includes("NOMECONTATO, tudo bem?") && copia.texto.includes("devido à condição de crédito vigente"), [!!copia.html, copia.html?.includes("background:yellow"), copia.texto?.slice(-500)]);
    confere("avisa o que trocar no Outlook", (await pagina.innerText("#toast")).includes("troque NOMECONTATO"), await pagina.innerText("#toast"));

    await pagina.keyboard.press("Escape");
    confere("Esc fecha", !(await visivel("#modalRenovacao")));

    // ---------- entrega sem período e entrega/coleta na WEG ----------
    await pagina.evaluate(() => abrirRenovacaoAgenda(agendamentos.find(a => a.id === 3)));
    await pagina.waitForTimeout(150);
    confere("entrega sem período: pede o vencimento e não copia", (await pagina.innerText("#origemVencimento")).includes("Entrega sem período: informe o vencimento") && await pagina.isDisabled("#btnCopiarEmailRenovacao") && (await pagina.innerText("#previaRenovacao")).includes("Informe o vencimento"), await pagina.innerText("#origemVencimento"));
    await pagina.fill("#renovacaoVencimento", dia(3));
    await pagina.locator("#renovacaoVencimento").dispatchEvent("change");
    confere("informado o vencimento, o email aparece", !(await pagina.isDisabled("#btnCopiarEmailRenovacao")) && (await pagina.innerText("#previaRenovacao")).includes(`vence no dia ${br(dia(3))}`));
    confere("sem endereço, vai o link do mapa", (await pagina.inputValue("#renovacaoEndereco")) === "https://maps.app.goo.gl/abc");
    await pagina.evaluate(() => fecharRenovacaoAgenda());

    await botao("Weg Tintas").click();
    await pagina.waitForTimeout(150);
    confere("entrega/coleta: a máquina nova, pela entrega e o período dela", (await pagina.inputValue("#renovacaoVencimento")) === dia(2) && (await pagina.innerText("#assuntoRenovacao")).includes("( WTE16L007 )"), await pagina.inputValue("#renovacaoVencimento"));
    const caixaEmpresa = pagina.locator("#avisosRenovacao input[value='empresa']");
    confere("na WEG: o aviso da NF de retorno vem marcado, com WEG", await caixaEmpresa.isChecked() && (await pagina.inputValue("#renovacaoEmpresa")) === "WEG" && (await pagina.innerText("#previaRenovacao")).includes("Informamos que a WEG não autoriza a retirada"));
    await pagina.fill("#renovacaoEmpresa", "WEG Guaramirim");
    confere("editar o nome da empresa muda o email", (await pagina.innerText("#previaRenovacao")).includes("a WEG Guaramirim não autoriza"));
    await pagina.fill("#renovacaoEmpresa", "");
    confere("marcado sem o nome: avisa", (await pagina.innerText("#alertasRenovacao")).includes("Escreva o nome da empresa"), await pagina.innerText("#alertasRenovacao"));
    await pagina.evaluate(() => fecharRenovacaoAgenda());

    confere("sem erros na página", erros.length === 0, erros);

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exitCode = falhas ? 1 : 0;

})().catch(async erro => {
    console.error(erro);
    await navegador?.close();
    process.exitCode = 1;
});
