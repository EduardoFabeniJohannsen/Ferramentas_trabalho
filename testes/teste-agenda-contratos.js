// Agenda: coleta com mais de um contrato (1 cliente com 2 contratos, ou 2 clientes no mesmo
// lugar). O 1º contrato são os campos de sempre; os outros, uma linha cada (agenda-contratos.js),
// gravados em outros_contratos. Confere a lista, a busca, a mensagem do Zap (uma referência por
// contrato), o formulário (só na coleta, rascunho, erros) e o que vai para o banco.
// Banco simulado: nada aqui toca o Supabase de produção.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..", "site");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });

// datas no fuso do computador (é o que a página usa)
const dia = (n) => {
    const data = new Date();
    data.setDate(data.getDate() + n);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
};

const base = { status: "Confirmado", frete_conta: "nossa", prazos_pagamento: [], transportadora: "Trans A", horario: "08:00", data: dia(0), frete: 350, card: "123" };

const linhas = [
    // 1 cliente com 2 contratos
    { ...base, id: 1, tipo: "Coleta", plataforma: "WAE18R001 + WTE12046", cliente: "Construtora Alfa", proposta: "712804", periodo: "28 dias",
        origem_endereco: "Rua X, 10, Brusque/SC", destino_nome: "W Rental",
        outros_contratos: [{ cliente: "Construtora Alfa", proposta: "713000", periodo: "3 períodos" }] },
    // 2 clientes no mesmo lugar
    { ...base, id: 2, tipo: "Coleta", plataforma: "WAE16R002", cliente: "Beta Ltda", proposta: "800100", periodo: "16 dias",
        origem_endereco: "Rua Y, Itajaí/SC", destino_nome: "W Rental",
        outros_contratos: [{ cliente: "Gama SA", proposta: "800200", periodo: "" }] },
    // contrato só na coluna de sempre (banco antes do SQL: sem outros_contratos)
    { ...base, id: 3, tipo: "Coleta", plataforma: "WAE18R003", cliente: "Delta", proposta: "900", periodo: "28 dias", origem_endereco: "Rua Z, Itajaí/SC" },
    // entrega com lista sobrando (o tipo mudou): não conta
    { ...base, id: 4, tipo: "Entrega", plataforma: "WAE18R004", cliente: "Epsilon", proposta: "901", periodo: "28 dias",
        destino_endereco: "Rua W, Itajaí/SC", outros_contratos: [{ cliente: "Zeta", proposta: "902", periodo: "" }] }
];

// guarda o que é gravado (insert/update) e devolve a linha como o banco devolveria
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
                        const linha = { id: 99, ...gravando };
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

// fora do bloco: uma exceção no meio fecha o navegador (senão o processo fica preso)
let navegador = null;

(async () => {

    navegador = await chromium.launch({ channel: "chrome", headless: true });

    const abrirContexto = async (tela) => {
        const contexto = await navegador.newContext({ viewport: tela });
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
        pagina.on("pageerror", e => erros.push(e.message));
        pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_FAILED|Valor salvo inválido/.test(m.text())) erros.push(m.text()); });
        pagina.on("dialog", d => d.accept());
        await pagina.goto("http://agenda.test/agenda.html");
        await pagina.waitForSelector("tr.ag-item");
        await pagina.waitForTimeout(50);
        return { contexto, pagina, erros };
    };

    const { contexto, pagina, erros } = await abrirContexto({ width: 1500, height: 1000 });

    const titulo = (id) => pagina.evaluate((id) => {
        const item = agendamentos.find(ag => ag.id === id);
        const linha = [...document.querySelectorAll("tr.ag-item")].find(tr => tr.textContent.includes(item.plataforma.split(" ")[0]));
        return linha ? linha.querySelector(".ag-titulo").textContent : "";
    }, id);
    const doItem = (id, funcao) => pagina.evaluate(([id, funcao]) => window[funcao](agendamentos.find(ag => ag.id === id)), [id, funcao]);

    // ---------- lista ----------
    confere("1 cliente com 2 contratos: o cliente uma vez, com quantos contratos", (await titulo(1)).endsWith("— Construtora Alfa (2 contratos)"), await titulo(1));
    confere("2 clientes: os dois juntos", (await titulo(2)).endsWith("— Beta Ltda + Gama SA (2 contratos)"), await titulo(2));
    confere("sem outros contratos (antes do SQL): como sempre", (await titulo(3)).endsWith("— Delta"), await titulo(3));
    confere("entrega com lista sobrando: não conta (só na coleta)", (await titulo(4)).endsWith("— Epsilon"), await titulo(4));
    confere("coluna Proposta: as duas", (await doItem(1, "textoPropostasAgendamento")) === "712804 / 713000" && (await doItem(4, "textoPropostasAgendamento")) === "901");

    // ---------- busca ----------
    const busca = await pagina.evaluate(() => {
        document.getElementById("buscaAgenda").value = "gama";
        const achou = agendamentos.filter(itemCombinaBusca).map(item => item.id);
        document.getElementById("buscaAgenda").value = "";
        return achou;
    });
    confere("a busca acha o cliente do outro contrato", JSON.stringify(busca) === "[2]", busca);

    // ---------- mensagem do Zap ----------
    const referencias = (texto) => texto.split("\n").filter(linha => linha.includes("Proposta:"));
    let zap = (await doItem(1, "montarTextoZap")).texto || "";
    confere("Zap: uma referência por contrato, sem o modelo (as máquinas são de todos)", JSON.stringify(referencias(zap)) === JSON.stringify(["* CONSTRUTORA ALFA_28 DIAS - Proposta: 712804", "* CONSTRUTORA ALFA_3 PERIODOS - Proposta: 713000"]), referencias(zap));
    confere("Zap: as máquinas continuam juntas", zap.includes("*Equipamento:* WAE18R001 + WTE12046"), zap);
    zap = (await doItem(2, "montarTextoZap")).texto || "";
    confere("Zap: 2 clientes, cada um com a sua proposta (sem período, sem o _)", JSON.stringify(referencias(zap)) === JSON.stringify(["* BETA LTDA_16 DIAS - Proposta: 800100", "* GAMA SA - Proposta: 800200"]), referencias(zap));
    zap = (await doItem(3, "montarTextoZap")).texto || "";
    confere("Zap: um contrato só continua igual (com o modelo)", JSON.stringify(referencias(zap)) === JSON.stringify(["* DELTA_WAE18_28 DIAS - Proposta: 900"]), referencias(zap));
    zap = await pagina.evaluate(() => montarTextoZap({ ...agendamentos.find(ag => ag.id === 1), referencia: "FICHA 55" }).texto);
    confere("Zap: a referência digitada à mão vale para o 1º contrato", JSON.stringify(referencias(zap)) === JSON.stringify(["* FICHA 55 - Proposta: 712804", "* CONSTRUTORA ALFA_3 PERIODOS - Proposta: 713000"]), referencias(zap));

    // ---------- formulário ----------
    const bloco = () => pagina.isVisible("#blocoOutrosContratos");
    const linhasContrato = () => pagina.$$eval("#listaOutrosContratos .ag-contrato-linha", l => l.map(linha => [...linha.querySelectorAll("span, input")].map(campo => campo.value ?? campo.textContent)));
    const ultimoGravado = () => pagina.evaluate(() => window.__gravados.filter(g => g.tabela === "agendamentos").pop());
    const toast = () => pagina.innerText("#toast");

    await pagina.evaluate(() => abrirModalAgenda());
    await pagina.selectOption("#agTipo", "Entrega");
    confere("entrega: sem o bloco de outros contratos", !(await bloco()));
    await pagina.selectOption("#agTipo", "Coleta");
    confere("coleta: aparece o bloco, sem nenhuma linha", (await bloco()) && (await linhasContrato()).length === 0 && (await pagina.innerText("#rotuloOutrosContratos")).includes("Mais de um contrato"));
    await pagina.locator("#listaPlataformas .ag-plataforma-item").first().fill("WAE18R010");
    await pagina.fill("#agCliente", "Construtora Alfa");
    await pagina.fill("#agProposta", "712804");
    await pagina.fill("#agPeriodo", "28");
    await pagina.click(".btn-outro-contrato");
    confere("+ Outro contrato: linha 2 já com o cliente de cima", JSON.stringify(await linhasContrato()) === JSON.stringify([["2", "Construtora Alfa", "", ""]]), await linhasContrato());
    confere("com outros contratos, o rótulo explica que o 1 é o de cima", (await pagina.innerText("#rotuloOutrosContratos")).includes("o 1 é o Cliente"));
    await pagina.screenshot({ path: path.join(saida, "agenda-contratos-formulario.png") });

    await pagina.click("#btnSalvarAgenda");
    await pagina.waitForTimeout(100);
    confere("contrato sem proposta: não salva e avisa", (await ultimoGravado()) === undefined && (await toast()).includes("Informe o nº da proposta do contrato 2"), await toast());

    await pagina.locator(".ag-contrato-linha .ag-contrato-proposta").first().fill("713000");
    await pagina.locator(".ag-contrato-linha .ag-contrato-periodo").first().fill("abc");
    await pagina.click("#btnSalvarAgenda");
    await pagina.waitForTimeout(100);
    confere("período inválido no contrato: não salva e diz qual", (await ultimoGravado()) === undefined && (await toast()).includes("Contrato 2: Período inválido"), await toast());

    await pagina.locator(".ag-contrato-linha .ag-contrato-periodo").first().fill("3p");
    await pagina.click(".btn-outro-contrato");
    await pagina.locator(".ag-contrato-linha .ag-contrato-cliente").nth(1).fill("");
    await pagina.locator(".ag-contrato-linha .ag-contrato-proposta").nth(1).fill("714000");
    await pagina.click(".btn-outro-contrato");
    await pagina.locator(".ag-contrato-linha button").nth(2).click();
    confere("− tira a linha", (await linhasContrato()).length === 2);

    // rascunho: fechar e abrir de novo traz as linhas
    await pagina.waitForTimeout(700);
    await pagina.evaluate(() => fecharModalAgenda());
    await pagina.evaluate(() => abrirModalAgenda());
    confere("o rascunho guarda os outros contratos", JSON.stringify(await linhasContrato()) === JSON.stringify([["2", "Construtora Alfa", "713000", "3p"], ["3", "", "714000", ""]]), await linhasContrato());

    await pagina.click("#btnSalvarAgenda");
    await pagina.waitForTimeout(150);
    let gravado = await ultimoGravado();
    confere("salva os outros contratos: período no formato da agenda e, sem cliente, o de cima", gravado?.modo === "insert" && JSON.stringify(gravado.dados.outros_contratos) === JSON.stringify([
        { cliente: "Construtora Alfa", proposta: "713000", periodo: "3 períodos" },
        { cliente: "Construtora Alfa", proposta: "714000", periodo: "" }
    ]) && gravado.dados.proposta === "712804" && gravado.dados.cliente === "Construtora Alfa", gravado?.dados.outros_contratos);
    confere("o novo aparece na lista com os 3 contratos", (await titulo(99)).endsWith("— Construtora Alfa (3 contratos)"), await titulo(99));

    // entrega nova: a coluna nem vai (funciona antes do SQL)
    await pagina.evaluate(() => abrirModalAgenda());
    await pagina.selectOption("#agTipo", "Entrega");
    await pagina.locator("#listaPlataformas .ag-plataforma-item").first().fill("WAE18R011");
    await pagina.fill("#agCliente", "Novo Cliente");
    await pagina.click("#btnSalvarAgenda");
    await pagina.waitForTimeout(150);
    gravado = await ultimoGravado();
    confere("sem outros contratos, a coluna não vai para o banco (funciona antes do SQL)", gravado?.modo === "insert" && gravado.dados.cliente === "Novo Cliente" && !("outros_contratos" in gravado.dados), gravado && Object.keys(gravado.dados));
    await pagina.evaluate(() => encerrarModalAgenda());

    // editar: as linhas voltam; virar entrega apaga a lista no banco
    await pagina.evaluate(() => abrirModalAgenda(2));
    confere("editar: as linhas voltam do banco", JSON.stringify(await linhasContrato()) === JSON.stringify([["2", "Gama SA", "800200", ""]]), await linhasContrato());
    await pagina.selectOption("#agTipo", "Entrega");
    confere("trocar para entrega esconde o bloco", !(await bloco()));
    await pagina.evaluate(() => { document.getElementById("agDestinoEndereco").value = "Rua Y, Itajaí/SC"; });
    await pagina.click("#btnSalvarAgenda");
    await pagina.waitForTimeout(150);
    gravado = await ultimoGravado();
    confere("virou entrega: grava a lista vazia (tinha contratos antes)", gravado?.modo === "update" && JSON.stringify(gravado.dados.outros_contratos) === "[]", gravado?.dados.outros_contratos);

    confere("sem erros no console", erros.length === 0, erros);
    await contexto.close();

    // ---------- celular: a linha do contrato cabe ----------
    {
        const { contexto, pagina, erros } = await abrirContexto({ width: 390, height: 844 });
        await pagina.evaluate(() => abrirModalAgenda(1));
        const caixa = await pagina.$eval(".ag-contrato-linha", linha => {
            const c = linha.getBoundingClientRect();
            return { direita: c.right, largura: window.innerWidth, cliente: linha.querySelector(".ag-contrato-cliente").getBoundingClientRect().width };
        });
        confere("celular: a linha cabe na tela e o cliente tem espaço", caixa.direita <= caixa.largura && caixa.cliente > 200, caixa);
        await pagina.screenshot({ path: path.join(saida, "agenda-contratos-celular.png") });
        confere("celular: sem erros", erros.length === 0, erros);
        await contexto.close();
    }

    await navegador.close();
    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
    process.exitCode = falhas ? 1 : 0;

})().catch(async erro => {
    console.error(erro);
    await navegador?.close();
    process.exitCode = 1;
});
