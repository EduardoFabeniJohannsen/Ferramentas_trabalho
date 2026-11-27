// Login de motorista: a página "Minhas entregas" (motorista.html) e a coluna Motorista do
// Admin. A página: entregas por dia (hoje e amanhã com o nome, os 7 dias anteriores
// fechados), o que aparece em cada uma (horário, tipo, status, máquina e a que volta,
// carregamento, saída e entrega com o mapa, contato com Ligar e WhatsApp, observação),
// texto de fora nunca vira HTML, link estranho não vira link, os avisos (sem motorista
// ligado, sem SQL, sem internet), recarga pelo aviso da agenda e o "Ver como" do admin.
// O Admin: escolher o motorista de cada login (perfis.motorista_id) e funcionar sem a
// coluna. Banco simulado: nada aqui toca o Supabase de produção.
const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..", "site");
const saida = path.join(__dirname, "capturas");
fs.mkdirSync(saida, { recursive: true });

const FUSO = "America/Sao_Paulo";

// AAAA-MM-DD de hoje + n dias, no fuso da página
const dia = (n) => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date(Date.now() + n * 86400000));
const ddmm = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const semana = (iso) => {
    const nome = new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" });
    return nome.charAt(0).toUpperCase() + nome.slice(1);
};

// banco simulado: cada consulta guarda as chamadas e a resposta vem de responderFalso
// (no arquivo servido: a CSP não deixa montar função de texto na página)
const clienteFalso = () => `
window.__responder = ${responderFalso.toString()};
window.supabase = { createClient(){
    const consulta = (tabela) => {
        const chamadas = [];
        const q = new Proxy(function(){}, {
            get(_, nome){
                if(nome === "then") return (ok, falha) => Promise.resolve(window.__responder(tabela, chamadas)).then(ok, falha);
                return (...args) => { chamadas.push([nome, args]); (window.__chamadas = window.__chamadas || []).push([tabela, nome, args]); return q; };
            }
        });
        return q;
    };
    const canal = () => ({
        on(tipo, filtro, aviso){ (window.__ouvintes = window.__ouvintes || []).push(aviso); return this; },
        subscribe(aviso){ if(typeof aviso === "function") aviso("SUBSCRIBED"); return this; },
        track: async () => "ok", untrack: async () => "ok", send: async () => "ok",
        unsubscribe: async () => "ok", presenceState: () => ({})
    });
    return {
        from: consulta,
        rpc: async (nome, args) => {
            (window.__rpcs = window.__rpcs || []).push([nome, args]);
            if(nome !== "entregas_motorista") return { data: null, error: null };
            return window.__respostaRpc ? window.__respostaRpc(args) : { data: null, error: null };
        },
        channel: canal,
        removeChannel: async () => "ok",
        auth: {
            getSession: async () => ({ data: { session: { user: { id: "u1", email: "joao@motoristas.com", app_metadata: {} } } }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe(){} } } })
        },
        functions: { invoke: async () => ({ data: null, error: null }) },
        storage: { from: () => ({}) }
    };
}};`;

const authFalso = (arquivo) => `
function ehAdmin(){ return Promise.resolve(!!window.__admin); }
function temAcesso(){ return true; }
function temFilial(){ return true; }
function existeLoginSalvo(){ return true; }
function carregarPerfil(){ return Promise.resolve({}); }
function fazerLogout(){}
function recursoDaPagina(nome){ return String(nome || "").replace(/\\.html$/i, "").toLowerCase(); }
function nomeArquivoAtual(){ return "${arquivo}"; }`;

const MOTORISTA = { id: 7, nome: "João Silva", transportadora: "Transportes Alfa" };

const ENTREGAS = [
    { id: 6, data: dia(-2), horario: "09:00", tipo: "Coleta", status: "Concluído", plataforma: "WTE12C090", cliente: "Antiga Ltda",
        origem_nome: "Obra Antiga", origem_endereco: "Rua Velha, 5 - Centro, Itajaí - SC" },
    { id: 1, data: dia(0), horario: "08:00", tipo: "Entrega", status: "Confirmado", plataforma: "WTE14L039 + WTE14L060", cliente: "Balneario Shopping",
        origem_nome: "", destino_nome: "Balneário Shopping", destino_endereco: "Av. Santa Catarina, 1 - Estados, Balneário Camboriú - SC",
        link_destino: "https://maps.app.goo.gl/abc123", contato: "Carlos (47) 99999-1234", obs_entrega: "Portão 3, falar com a segurança" },
    { id: 2, data: dia(0), horario: "CONFIRMAR", tipo: "Troca técnica", status: "A confirmar", plataforma: "WAE18R009", plataforma_recolha: "WTE12C001",
        cliente: "<img src=x onerror=window.__xss=1>Gama", destino_nome: "Obra Gama", destino_endereco: "Rua B, 200, Centro, Brusque/SC",
        link_destino: "javascript:window.__xss=1", contato: "Ana 47 3333-1234 / Beto (47) 98888-0000" },
    { id: 3, data: dia(1), horario: "07:30", tipo: "Coleta", status: "Em rota", plataforma: "WTE8C15", cliente: "Diagonal",
        origem_nome: "Diagonal Tecidos", origem_endereco: "Rua C, 10 - Centro, Gaspar - SC", destino_nome: "" },
    { id: 4, data: dia(1), horario: "13:00", tipo: "Transferência", status: "Confirmado", plataforma: "WAD16010", cliente: "Construtora Delta",
        origem_nome: "Obra 1", origem_endereco: "Rua 1, 100, Blumenau - SC", destino_nome: "Obra 2", destino_endereco: "Rua 2, 200, Blumenau - SC",
        contato_origem: "Paulo 47 99111-2222", contato: "Rita" },
    { id: 5, data: dia(3), horario: "IMEDIATO", tipo: "Entrega", status: "Cancelado", plataforma: "WAD16011", cliente: "Epsilon",
        data_carregamento: dia(2), horario_carregamento: "16:00", destino_nome: "Obra Epsilon" }
];

const MOTORISTAS = [
    { id: 8, transportadora: "Beta Cargas", nome: "Pedro Souza" },
    { id: 7, transportadora: "Transportes Alfa", nome: "João Silva" }
];

const PERFIS = [
    { id: "p1", email: "joao@motoristas.com", acessos: ["motorista"], filiais: [], ativo: true, motorista_id: null },
    { id: "p2", email: "ana@exemplo.com", acessos: ["propostas"], filiais: [], ativo: true, motorista_id: 99 }
];

// a resposta de cada tabela (perfis, motoristas; as outras vêm vazias)
function responderFalso(tabela, chamadas){
    const chamou = (nome) => chamadas.find(([metodo]) => metodo === nome);
    const umaLinha = !!chamou("maybeSingle") || !!chamou("single");
    if(tabela === "motoristas") return { data: window.__motoristas || [], error: null };
    if(tabela === "perfis"){
        const update = chamou("update");
        const campos = String((chamou("select") || [, [""]])[1][0] || "");
        if(window.__semColuna && campos.includes("motorista_id")) return { data: null, error: { code: "42703", message: "column perfis.motorista_id does not exist" } };
        if(update){
            (window.__updates = window.__updates || []).push(update[1][0]);
            if(window.__falharUpdate) return { data: null, error: { message: "falhou" } };
            const id = chamou("eq")[1][1];
            const perfil = window.__perfis.find(p => p.id === id);
            Object.assign(perfil, update[1][0]);
            return { data: [{ ...perfil }], error: null };
        }
        return { data: umaLinha ? null : window.__perfis.map(p => ({ ...p })), error: null };
    }
    return { data: umaLinha ? null : [], error: null, count: 0 };
}

const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2" };

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

(async () => {

    const navegador = await chromium.launch({ channel: "chrome", headless: true });

    // config: { admin, resposta: "normal" | "sem-motorista" | "erro" | "sem-sql" | "vazio", semColuna, verComo }
    const abrir = async (arquivo, config = {}, tela = { width: 1300, height: 900 }) => {
        const contexto = await navegador.newContext({ viewport: tela, timezoneId: FUSO });
        await contexto.route("**/*", (rota) => {
            const url = new URL(rota.request().url());
            if(url.pathname.endsWith("/vendor/supabase-2.45.0.js")) return rota.fulfill({ contentType: "text/javascript", body: clienteFalso() });
            if(url.hostname !== "motorista.test") return rota.abort();
            if(url.pathname.endsWith("auth-guard.js")) return rota.fulfill({ contentType: "text/javascript", body: authFalso(arquivo) });
            const caminho = path.join(raiz, decodeURIComponent(url.pathname));
            if(!fs.existsSync(caminho)) return rota.fulfill({ status: 404, body: "" });
            return rota.fulfill({ contentType: tipos[path.extname(caminho)] || "text/plain", body: fs.readFileSync(caminho) });
        });
        await contexto.addInitScript(({ config, motorista, entregas, motoristas, perfis }) => {
            window.__admin = !!config.admin;
            window.__semColuna = !!config.semColuna;
            window.__motoristas = motoristas;
            window.__perfis = perfis;
            window.__modoRpc = config.resposta || "normal";
            window.__respostaRpc = (args) => {
                const modo = window.__modoRpc;
                if(modo === "erro") return { data: null, error: { message: "Failed to fetch" } };
                if(modo === "sem-sql") return { data: null, error: { code: "PGRST202", message: "Could not find the function public.entregas_motorista" } };
                if(modo === "sem-motorista") return { data: { motorista: null, entregas: [] }, error: null };
                if(modo === "vazio") return { data: { motorista, entregas: entregas.filter(e => e.data < new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())) }, error: null };
                return { data: { motorista: args?.p_motorista_id === 8 ? { id: 8, nome: "Pedro Souza", transportadora: "Beta Cargas" } : motorista, entregas }, error: null };
            };
            if(config.verComo) localStorage.setItem("motoristaVerComo", String(config.verComo));
        }, { config, motorista: MOTORISTA, entregas: ENTREGAS, motoristas: MOTORISTAS, perfis: JSON.parse(JSON.stringify(PERFIS)) });
        const pagina = await contexto.newPage();
        const erros = [];
        pagina.on("pageerror", e => erros.push(e.message));
        pagina.on("console", m => { if(m.type() === "error" && !/404|ERR_FAILED|Falha ao carregar as entregas/.test(m.text())) erros.push(m.text()); });
        await pagina.goto(`http://motorista.test/${arquivo}`);
        await pagina.waitForLoadState("networkidle");
        return { contexto, pagina, erros };
    };

    // (a CSP barra o waitForFunction: confere de tempo em tempo)
    const esperar = async (pagina, teste, tempo = 4000) => {
        const fim = Date.now() + tempo;
        while(Date.now() < fim){
            if(await pagina.evaluate(teste).catch(() => false)) return true;
            await pagina.waitForTimeout(50);
        }
        return false;
    };

    const textoLista = (pagina) => pagina.innerText("#listaMotorista");

    // ---------- motorista: a página ----------
    {
        const { contexto, pagina, erros } = await abrir("motorista.html");
        await esperar(pagina, () => document.querySelectorAll(".entrega-motorista").length > 0);

        confere("abre sem erro", erros.length === 0, erros);
        confere("título da página", (await pagina.title()) === "Minhas entregas");

        const rpcs = await pagina.evaluate(() => window.__rpcs.filter(([nome]) => nome === "entregas_motorista"));
        confere("pede as entregas sem escolher motorista (o banco usa o do login)", rpcs.length === 1 && JSON.stringify(rpcs[0][1]) === "{}", rpcs);
        confere("não lê a tabela agendamentos", await pagina.evaluate(() => !(window.__chamadas || []).some(([tabela]) => tabela === "agendamentos")));
        confere("mostra quem é o motorista", (await pagina.innerText("#motoristaQuem")) === "João Silva · Transportes Alfa", await pagina.innerText("#motoristaQuem"));
        confere("sem o Ver como (não é admin)", !(await pagina.isVisible("#motoristaVerComo")));
        confere("mostra a hora da atualização", /^Atualizado às \d{2}:\d{2}$/.test(await pagina.innerText("#motoristaAtualizado")), await pagina.innerText("#motoristaAtualizado"));

        const titulos = await pagina.$$eval(".lista-motorista > .dia-motorista .titulo-dia-motorista", l => l.map(t => t.firstChild.textContent));
        const esperados = [
            `Hoje · ${ddmm(dia(0))} · ${semana(dia(0))}`,
            `Amanhã · ${ddmm(dia(1))} · ${semana(dia(1))}`,
            `${ddmm(dia(3))} · ${semana(dia(3))}`
        ];
        confere("dias de hoje em diante, com Hoje e Amanhã", JSON.stringify(titulos) === JSON.stringify(esperados), titulos);
        confere("quantos agendamentos no dia", (await pagina.innerText(".dia-hoje .quantos-motorista")) === "2 agendamentos");

        const anteriores = await pagina.evaluate(() => {
            const caixa = document.querySelector("details.anteriores-motorista");
            return caixa && { aberta: caixa.open, resumo: caixa.querySelector("summary").innerText, ids: [...caixa.querySelectorAll(".entrega-motorista")].map(c => c.dataset.id) };
        });
        confere("dias anteriores ficam fechados embaixo", anteriores && !anteriores.aberta && anteriores.resumo === "Dias anteriores (últimos 7 dias): 1" && JSON.stringify(anteriores.ids) === '["6"]', anteriores);

        const cartao = (id) => pagina.evaluate((id) => {
            const c = document.querySelector(`.entrega-motorista[data-id="${id}"]`);
            if(!c) return null;
            return {
                texto: c.innerText.replace(/\n+/g, " | "),
                classes: c.className,
                status: c.querySelector(".status-motorista")?.className,
                links: [...c.querySelectorAll("a")].map(a => [a.innerText, a.getAttribute("href"), a.target || ""])
            };
        }, id);

        const entrega = await cartao(1);
        confere("entrega: horário, tipo e status", /^08:00 \| Entrega \| Confirmado/.test(entrega.texto) && entrega.status.includes("status-confirmado"), entrega.texto);
        confere("entrega: as máquinas e o cliente", entrega.texto.includes("🚜 Equipamento: WTE14L039 + WTE14L060") && entrega.texto.includes("🏢 Cliente: Balneario Shopping"), entrega.texto);
        confere("entrega: saída vazia é a W Rental (sem mapa)", entrega.texto.includes("Saída | W Rental | Entrega | Balneário Shopping"), entrega.texto);
        confere("entrega: o mapa é o link do agendamento (abre em outra aba)", JSON.stringify(entrega.links[0]) === JSON.stringify(["📍 Abrir no mapa", "https://maps.app.goo.gl/abc123", "_blank"]), entrega.links);
        confere("entrega: o telefone do contato vira Ligar e WhatsApp", JSON.stringify(entrega.links.slice(1)) === JSON.stringify([["📞 Ligar", "tel:+5547999991234", ""], ["💬 WhatsApp", "https://wa.me/5547999991234", "_blank"]]), entrega.links);
        confere("entrega: a observação de entrega", entrega.texto.includes("📝 Observação: Portão 3, falar com a segurança"), entrega.texto);

        const troca = await cartao(2);
        confere("troca: CONFIRMAR vira A confirmar", troca.texto.startsWith("A confirmar | Troca técnica | A confirmar"), troca.texto);
        confere("troca: a máquina que volta", troca.texto.includes("🔁 Traz de volta: WTE12C001 (do mesmo local, para a W Rental)"), troca.texto);
        confere("troca: link estranho não vira link (vai a busca do endereço)", troca.links[0][1] === "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Rua B, 200, Centro, Brusque/SC"), troca.links[0]);
        confere("troca: dois telefones, cada um com o número no botão", JSON.stringify(troca.links.slice(1).map(l => l[1])) === JSON.stringify(["tel:+554733331234", "https://wa.me/554733331234", "tel:+5547988880000", "https://wa.me/5547988880000"]) && troca.links[1][0] === "📞 Ligar 47 3333-1234", troca.links);
        confere("texto de fora não vira HTML", troca.texto.includes("<img src=x onerror=window.__xss=1>Gama") && !(await pagina.evaluate(() => window.__xss)));

        const coleta = await cartao(3);
        confere("coleta: sai do cliente, chegada vazia é a W Rental", coleta.texto.includes("Saída | Diagonal Tecidos | Rua C, 10 - Centro, Gaspar - SC | 📍 Abrir no mapa | Entrega | W Rental"), coleta.texto);
        confere("coleta: Em rota", coleta.status.includes("status-em-rota"));

        const transferencia = await cartao(4);
        confere("transferência entre obras: o nome do tipo e um contato em cada local", transferencia.texto.includes("Transferência entre obras") && transferencia.texto.includes("Contato na coleta: Paulo 47 99111-2222") && transferencia.texto.includes("Contato na entrega: Rita"), transferencia.texto);
        confere("transferência: só o contato com telefone ganha os botões", JSON.stringify(transferencia.links.filter(l => l[1].startsWith("tel:")).map(l => l[1])) === '["tel:+5547991112222"]', transferencia.links);

        const cancelada = await cartao(5);
        confere("cancelado fica apagado e IMEDIATO vira Imediato", cancelada.classes.includes("cancelada") && cancelada.texto.startsWith("Imediato | Entrega | Cancelado"), cancelada);
        confere("carrega em outro dia: o carregamento", cancelada.texto.includes(`📦 Carrega na W Rental: ${ddmm(dia(2))} · ${semana(dia(2))} · 16:00`), cancelada.texto);

        const concluida = await cartao(6);
        confere("concluído fica marcado", concluida.classes.includes("concluida"));

        // nada de valores na lista (a função nem manda; a página também não procura)
        const tudo = await textoLista(pagina);
        confere("sem frete, card, e-mail, pagamento ou proposta na tela", !/R\$|CARD|Financeiro|Pagamento|Proposta/i.test(tudo), tudo.match(/R\$|CARD|Financeiro|Pagamento|Proposta/i));

        // ---------- recarga ----------
        const quantasCargas = () => pagina.evaluate(() => window.__rpcs.filter(([nome]) => nome === "entregas_motorista").length);
        await pagina.evaluate(() => window.__ouvintes.forEach(aviso => aviso({})));
        confere("a agenda avisou que mudou: recarrega", await esperar(pagina, () => window.__rpcs.filter(([nome]) => nome === "entregas_motorista").length === 2), await quantasCargas());
        await pagina.evaluate(() => { for(let i = 0; i < 3; i++) window.__ouvintes.forEach(aviso => aviso({})); });
        await pagina.waitForTimeout(1200);
        confere("vários avisos seguidos: uma recarga só", (await quantasCargas()) === 3, await quantasCargas());
        await pagina.click("#btnAtualizarMotorista");
        confere("↻ Atualizar recarrega", await esperar(pagina, () => window.__rpcs.filter(([nome]) => nome === "entregas_motorista").length === 4), await quantasCargas());

        // falhou com a lista na tela: ela fica e avisa
        await pagina.evaluate(() => { window.__modoRpc = "erro"; });
        await pagina.click("#btnAtualizarMotorista");
        await esperar(pagina, () => document.querySelector("#toast")?.innerText.includes("Não deu para atualizar"));
        confere("sem internet: a lista fica e aparece o aviso", (await pagina.$$(".entrega-motorista")).length === 6 && (await pagina.innerText("#toast")).includes("Não deu para atualizar as entregas"), await pagina.innerText("#toast"));

        // celular: cabe na tela, botões de toque
        await pagina.evaluate(() => { window.__modoRpc = "normal"; });
        await pagina.setViewportSize({ width: 390, height: 844 });
        await pagina.waitForTimeout(200);
        const celular = await pagina.evaluate(() => ({
            rola: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            locais: getComputedStyle(document.querySelector(".locais-motorista")).gridTemplateColumns.split(" ").length,
            botao: document.querySelector(".link-mapa").getBoundingClientRect().height
        }));
        confere("celular: nada rola para o lado, um local embaixo do outro", !celular.rola && celular.locais === 1, celular);
        confere("celular: botões com altura para o dedo", celular.botao >= 32, celular);
        await pagina.screenshot({ path: path.join(saida, "motorista-celular.png"), fullPage: true });

        await contexto.close();
    }

    // ---------- os avisos ----------
    {
        const { contexto, pagina } = await abrir("motorista.html", { resposta: "sem-motorista" });
        await esperar(pagina, () => !document.querySelector("#listaMotorista").innerText.includes("Carregando"));
        confere("login sem motorista ligado: avisa para falar com o admin", (await textoLista(pagina)).includes("Este login ainda não está ligado a um motorista"), await textoLista(pagina));
        await contexto.close();
    }

    {
        const { contexto, pagina } = await abrir("motorista.html", { resposta: "vazio" });
        await esperar(pagina, () => !document.querySelector("#listaMotorista").innerText.includes("Carregando"));
        confere("sem entrega de hoje em diante: avisa (as anteriores continuam)", (await textoLista(pagina)).startsWith("Nenhuma entrega sua de hoje em diante.") && (await pagina.$$("details.anteriores-motorista")).length === 1, await textoLista(pagina));
        await contexto.close();
    }

    {
        const { contexto, pagina } = await abrir("motorista.html", { resposta: "erro" });
        await esperar(pagina, () => !document.querySelector("#listaMotorista").innerText.includes("Carregando"));
        confere("sem internet ao abrir: avisa e o ↻ Atualizar continua", (await textoLista(pagina)).includes("Não deu para carregar as entregas") && !(await pagina.isDisabled("#btnAtualizarMotorista")), await textoLista(pagina));
        await contexto.close();
    }

    {
        const { contexto, pagina } = await abrir("motorista.html", { resposta: "sem-sql" });
        await esperar(pagina, () => !document.querySelector("#listaMotorista").innerText.includes("Carregando"));
        confere("sem o SQL no banco: diz o que falta", (await textoLista(pagina)).includes("Falta rodar no Supabase o SQL do login de motorista"), await textoLista(pagina));
        await contexto.close();
    }

    // ---------- admin: ver como o motorista ----------
    {
        const { contexto, pagina, erros } = await abrir("motorista.html", { admin: true });
        await esperar(pagina, () => !document.querySelector("#listaMotorista").innerText.includes("Carregando"));

        confere("admin: abre sem erro", erros.length === 0, erros);
        confere("admin: o Ver como aparece com os motoristas", await pagina.isVisible("#motoristaVerComo") &&
            JSON.stringify(await pagina.$$eval("#motoristaVerComoSelect option", l => l.map(o => o.innerText))) === JSON.stringify(["Escolha o motorista", "Pedro Souza · Beta Cargas", "João Silva · Transportes Alfa"]));
        confere("admin: sem escolher, pede para escolher (e não consulta)", (await textoLista(pagina)).includes("Escolha um motorista acima") &&
            (await pagina.evaluate(() => (window.__rpcs || []).filter(([nome]) => nome === "entregas_motorista").length)) === 0, await textoLista(pagina));

        await pagina.selectOption("#motoristaVerComoSelect", "8");
        await esperar(pagina, () => document.querySelector("#motoristaQuem").innerText.includes("Pedro"));
        const pedido = await pagina.evaluate(() => window.__rpcs.filter(([nome]) => nome === "entregas_motorista").pop());
        confere("admin: escolher pede as entregas daquele motorista", JSON.stringify(pedido[1]) === '{"p_motorista_id":8}' && (await pagina.innerText("#motoristaQuem")) === "Pedro Souza · Beta Cargas", pedido);
        confere("admin: a escolha fica guardada no aparelho", (await pagina.evaluate(() => localStorage.getItem("motoristaVerComo"))) === "8");

        await contexto.close();
    }

    {
        const { contexto, pagina } = await abrir("motorista.html", { admin: true, verComo: 7 });
        await esperar(pagina, () => document.querySelectorAll(".entrega-motorista").length > 0);
        confere("admin: abrir de novo já mostra o motorista guardado", (await pagina.inputValue("#motoristaVerComoSelect")) === "7" && (await pagina.innerText("#motoristaQuem")) === "João Silva · Transportes Alfa");
        await contexto.close();
    }

    // ---------- Admin: a coluna Motorista ----------
    {
        const { contexto, pagina, erros } = await abrir("admin.html", { admin: true });
        await esperar(pagina, () => document.querySelectorAll("#corpoAdmin select.select-motorista-admin optgroup").length > 0);

        confere("Admin: abre sem erro", erros.length === 0, erros);

        const titulos = await pagina.$$eval("#cabecalhoAdmin th", l => l.map(t => t.innerText));
        const indice = titulos.indexOf("Motorista");
        confere("Admin: a caixinha Minhas entregas e a coluna Motorista logo depois", indice > 0 && titulos[indice - 1] === "Minhas entregas (motorista)", titulos);

        const linha = (email) => pagina.locator("#corpoAdmin tr", { hasText: email }).locator("select.select-motorista-admin");
        const grupos = await linha("joao@").evaluate(s => [...s.querySelectorAll("optgroup")].map(g => `${g.label}: ${[...g.querySelectorAll("option")].map(o => o.innerText).join(", ")}`));
        confere("Admin: os motoristas separados por transportadora", JSON.stringify(grupos) === JSON.stringify(["Beta Cargas: Pedro Souza", "Transportes Alfa: João Silva"]), grupos);
        confere("Admin: sem motorista, fica o —", (await linha("joao@").inputValue()) === "");
        confere("Admin: motorista fora do cadastro não some", (await linha("ana@").evaluate(s => s.selectedOptions[0].innerText)) === "Motorista nº 99 (fora do cadastro)");

        await linha("joao@").selectOption("7");
        await esperar(pagina, () => (window.__updates || []).length === 1);
        confere("Admin: escolher salva o motorista do login", JSON.stringify(await pagina.evaluate(() => window.__updates)) === '[{"motorista_id":7}]');

        await linha("ana@").selectOption("8");
        await esperar(pagina, () => document.querySelector("#toast")?.innerText.includes("Marque também"));
        confere("Admin: sem a caixinha Minhas entregas, lembra de marcar", (await pagina.innerText("#toast")).includes("Marque também \"Minhas entregas (motorista)\""), await pagina.innerText("#toast"));

        await linha("joao@").selectOption("");
        await esperar(pagina, () => (window.__updates || []).length === 3);
        confere("Admin: o — tira o motorista", JSON.stringify((await pagina.evaluate(() => window.__updates))[2]) === '{"motorista_id":null}');

        await pagina.evaluate(() => { window.__falharUpdate = true; });
        await linha("joao@").selectOption("8");
        await esperar(pagina, () => (window.__updates || []).length === 4);
        await pagina.waitForTimeout(100);
        confere("Admin: não salvou, volta para o que estava", (await linha("joao@").inputValue()) === "", await linha("joao@").inputValue());

        await pagina.screenshot({ path: path.join(saida, "motorista-admin.png") });
        await contexto.close();
    }

    {
        const { contexto, pagina, erros } = await abrir("admin.html", { admin: true, semColuna: true });
        await esperar(pagina, () => document.querySelectorAll("#corpoAdmin tr").length === 2);
        const selects = await pagina.$$eval("#corpoAdmin select.select-motorista-admin", l => l.map(s => s.disabled));
        confere("Admin sem o SQL: os usuários aparecem e a coluna Motorista fica desligada", erros.length === 0 && selects.length === 2 && selects.every(Boolean), { erros, selects });
        const caixa = pagina.locator("#corpoAdmin tr", { hasText: "ana@" }).locator('input[title="Leads"]');
        await caixa.check();
        await esperar(pagina, () => (window.__updates || []).length === 1);
        const campos = await pagina.evaluate(() => window.__chamadas.filter(([tabela, nome]) => tabela === "perfis" && nome === "select").map(([, , args]) => args[0]).pop());
        confere("Admin sem o SQL: marcar acesso continua salvando (sem a coluna)", !campos.includes("motorista_id") && (await caixa.isChecked()), campos);
        await contexto.close();
    }

    await navegador.close();

    console.log(falhas ? `\n${falhas} falha(s)` : "\ntodos ok");
    process.exit(falhas ? 1 : 0);
})();
