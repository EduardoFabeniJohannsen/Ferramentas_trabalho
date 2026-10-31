// ======================================
// LEADS
// ======================================
// Lista de empresas para a equipe chamar. Não é um CRM: mostra a lista, evita
// duas pessoas chamando a mesma empresa e ajuda no contato. Os leads vêm de um
// agente externo; aqui ninguém cria nem apaga (ver leads.sql).
// Os dados vêm de fora: nada entra na tela como HTML.
// Depende de supabase-config.js, auth-guard.js e helpers.js.

// ======================================
// CONFIGURAÇÃO
// ======================================

const TABELA_LEADS = "leads";

const TABELA_LEADS_CONFIG = "leads_config";

const STATUS_LEADS = [
    { valor: "novo", rotulo: "Novo" },
    { valor: "chamado", rotulo: "Chamado" },
    { valor: "interessado", rotulo: "Interessado" },
    { valor: "sem_interesse", rotulo: "Sem interesse" }
];

const PORTES_LEADS = [
    { valor: "pequena", rotulo: "Pequena" },
    { valor: "media", rotulo: "Média" },
    { valor: "grande", rotulo: "Grande" }
];

// muitos cards deixariam a página pesada: o resto aparece filtrando
const LIMITE_CARDS_LEADS = 200;

// ao voltar pra aba, recarrega se passou mais que isso
const INTERVALO_RECARGA_LEADS_MS = 30000;

// espera parar de digitar pra gravar a observação
const ATRASO_SALVAR_OBS_MS = 800;

// nome do vendedor nas mensagens (fica neste navegador)
const CHAVE_VENDEDOR_LEADS = "leadsVendedor";

let leads = [];

let erroLeads = "";

let carregandoLeads = true;

let ultimaCargaLeads = 0;

let usuarioLeads = { id: "", email: "" };

let adminLeads = false;

let configsBusca = [];

// null = criando uma configuração nova
let idConfigEditando = null;


// ======================================
// MENSAGENS
// ======================================
// Variáveis: {saudacao}, {empresa}, {cidade}, {vendedor}.
// "busca" = pedaços do nome do segmento (sem acento, em minúsculas).
// Segmento que não bate com nenhum usa a genérica.

const MENSAGEM_GENERICA =
    "{saudacao}! Aqui é {vendedor}, da W Rental. Trabalhamos com locação de plataformas elevatórias (tesoura e articulada), com entrega rápida e suporte técnico. A {empresa} tem alguma demanda de trabalho em altura em {cidade}? Posso passar um orçamento sem compromisso.";

const MENSAGENS_SEGMENTO = [
    {
        busca: ["constru", "obra", "incorpora", "engenharia"],
        texto: "{saudacao}! Aqui é {vendedor}, da W Rental. Vi a {empresa} e queria apresentar nossa locação de plataformas elevatórias para obras em {cidade}: tesoura e articulada, com entrega rápida e suporte técnico durante a locação. Posso passar um orçamento para a próxima etapa da obra?"
    },
    {
        busca: ["industr", "fabrica", "metal"],
        texto: "{saudacao}! Aqui é {vendedor}, da W Rental. Alugamos plataformas elevatórias (tesoura e articulada) para manutenção e montagem industrial, com entrega rápida em {cidade} e suporte técnico. A {empresa} tem alguma parada ou serviço em altura previsto?"
    },
    {
        busca: ["logistic", "galp", "armaz", "transport"],
        texto: "{saudacao}! Aqui é {vendedor}, da W Rental. Para galpões e centros de distribuição em {cidade}, alugamos plataformas elevatórias tesoura e articulada, com entrega rápida e suporte técnico. A {empresa} precisa de algum serviço em altura, como iluminação, cobertura ou estrutura?"
    },
    {
        busca: ["manutenc", "predial", "facilit", "condomin"],
        texto: "{saudacao}! Aqui é {vendedor}, da W Rental. Alugamos plataformas elevatórias (tesoura e articulada) para manutenção predial e fachadas em {cidade}, com entrega rápida e suporte técnico. A {empresa} tem algum serviço em altura para os próximos dias?"
    },
    {
        busca: ["evento", "feira", "montagem"],
        texto: "{saudacao}! Aqui é {vendedor}, da W Rental. Para montagem de eventos e feiras em {cidade}, alugamos plataformas elevatórias tesoura e articulada, com entrega rápida e suporte técnico. A {empresa} tem alguma montagem chegando?"
    }
];


function semAcentoLeads(texto){

    return String(texto || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}


function saudacaoAgora(){

    const hora = new Date().getHours();

    if(hora < 12) return "Bom dia";

    if(hora < 18) return "Boa tarde";

    return "Boa noite";
}


function montarMensagemLead(lead){

    const segmento = semAcentoLeads(lead.segmento);

    const modelo =
        MENSAGENS_SEGMENTO.find(item =>
            item.busca.some(pedaco => segmento.includes(pedaco))
        );

    let texto = modelo ? modelo.texto : MENSAGEM_GENERICA;

    // sem cidade: tira o "em {cidade}" pra frase não ficar pela metade
    if(!lead.cidade) texto = texto.replace(/ em \{cidade\}/g, "");

    return texto
        .replace(/\{saudacao\}/g, saudacaoAgora())
        .replace(/\{empresa\}/g, lead.empresa || "sua empresa")
        .replace(/\{cidade\}/g, lead.cidade || "")
        .replace(/\{vendedor\}/g, $("nomeVendedor").value.trim() || "a equipe");
}


// ======================================
// TELEFONE
// ======================================

// número com DDI 55, só dígitos ("" = não dá pra usar).
// Número brasileiro começando em 55 é DDI só se tiver 12 ou 13 dígitos:
// com 10 ou 11 o 55 é o DDD (Santa Maria/RS).
function numeroComDDI(valor){

    const digitos =
        String(valor || "")
            .replace(/\D/g, "")
            .replace(/^0+/, "");

    if(digitos.length < 10) return "";

    if(digitos.startsWith("55") && digitos.length >= 12) return digitos;

    return "55" + digitos;
}


function linkWhatsApp(lead){

    const numero = numeroComDDI(lead.whatsapp || lead.telefone);

    if(!numero) return "";

    return `https://wa.me/${numero}?text=${encodeURIComponent(montarMensagemLead(lead))}`;
}


function linkLigar(lead){

    const original = String(lead.telefone || lead.whatsapp || "");

    const digitos = original.replace(/\D/g, "");

    // 0800 e 0300 não levam DDI
    if(/^0(800|300)/.test(digitos)) return `tel:${digitos}`;

    const numero = numeroComDDI(original);

    return numero ? `tel:+${numero}` : "";
}


// o site vem de fora: só abre http e https (nada de javascript:)
function linkSite(site){

    const texto = String(site || "").trim();

    if(!texto) return "";

    const completo = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`;

    return /^https?:\/\//i.test(completo) ? completo : "";
}


// ======================================
// UTILITÁRIOS
// ======================================

function criarElLead(tag, classe, texto){

    const elemento = document.createElement(tag);

    if(classe) elemento.className = classe;

    if(texto !== undefined && texto !== null) elemento.textContent = texto;

    return elemento;
}


// 31/10/2026 14:30
function dataHoraLead(iso){

    const data = new Date(iso);

    if(isNaN(data)) return "";

    const hora = String(data.getHours()).padStart(2, "0");

    const minuto = String(data.getMinutes()).padStart(2, "0");

    return `${formatarData(data)} ${hora}:${minuto}`;
}


function rotuloStatusLead(valor){

    const status = STATUS_LEADS.find(item => item.valor === valor);

    return status ? status.rotulo : valor;
}


function rotuloPorteLead(valor){

    const porte = PORTES_LEADS.find(item => item.valor === valor);

    return porte ? porte.rotulo : (valor || "");
}


// "eduardo.johannsen@..." -> "Eduardo Johannsen"
function nomeDoEmail(email){

    return String(email || "")
        .split("@")[0]
        .split(/[._-]+/)
        .filter(Boolean)
        .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
        .join(" ");
}


function mensagemErroLeads(erro){

    const codigo = erro?.code || "";

    if(codigo === "42P01" || codigo === "PGRST205"){

        return "As tabelas de leads ainda não existem: rode o leads.sql no Supabase.";
    }

    if(codigo === "42501"){

        return "Sem permissão. Peça ao admin para liberar o acesso a Leads.";
    }

    return "Não foi possível carregar os leads (verifique conexão/login).";
}


// ======================================
// CARREGAR
// ======================================

// o Supabase devolve no máximo 1000 linhas por consulta
async function carregarLeads(){

    erroLeads = "";

    try{

        const tamanhoPagina = 1000;

        let inicio = 0;

        let linhas = [];

        while(true){

            const { data, error } =
                await supabaseClient
                    .from(TABELA_LEADS)
                    .select("*")
                    .order("created_at", { ascending: false })
                    .order("id")
                    .range(inicio, inicio + tamanhoPagina - 1);

            if(error) throw error;

            linhas = linhas.concat(data);

            if(data.length < tamanhoPagina) break;

            inicio += tamanhoPagina;
        }

        leads = linhas;

    }catch(erro){

        console.error("[leads] Falha ao carregar:", erro);

        erroLeads = mensagemErroLeads(erro);
    }

    carregandoLeads = false;

    ultimaCargaLeads = Date.now();
}


async function recarregarLeads(manual){

    await carregarLeads();

    desenharLeads();

    if(manual && !erroLeads) mostrarToast("Leads atualizados");
}


// ======================================
// FILTROS
// ======================================

// valores que existem nos leads, sem repetir ("Itajaí" e "ITAJAI" são um só)
function opcoesDoCampo(campo){

    const opcoes = new Map();

    leads.forEach(lead => {

        const chave = semAcentoLeads(lead[campo]);

        if(chave && !opcoes.has(chave)) opcoes.set(chave, String(lead[campo]).trim());
    });

    return [...opcoes.entries()]
        .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
}


// troca as opções sem perder o que está escolhido
function preencherSelectLeads(id, todos, opcoes){

    const select = $(id);

    const atual = select.value;

    select.innerHTML = "";

    const primeira = criarElLead("option", "", todos);

    primeira.value = "";

    select.appendChild(primeira);

    opcoes.forEach(([valor, rotulo]) => {

        const opcao = criarElLead("option", "", rotulo);

        opcao.value = valor;

        select.appendChild(opcao);
    });

    if([...select.options].some(opcao => opcao.value === atual)){

        select.value = atual;
    }
}


// todos os filtros menos o status (a seção "em andamento" usa o resto)
function passaNosFiltros(lead){

    const busca = semAcentoLeads($("buscaLeads").value);

    const cidade = $("filtroCidade").value;

    const segmento = $("filtroSegmento").value;

    const porte = $("filtroPorte").value;

    if(busca && !semAcentoLeads(lead.empresa).includes(busca)) return false;

    if(cidade && semAcentoLeads(lead.cidade) !== cidade) return false;

    if(segmento && semAcentoLeads(lead.segmento) !== segmento) return false;

    if(porte && lead.porte !== porte) return false;

    return true;
}


// ======================================
// DESENHAR
// ======================================

function atualizarContadoresLeads(){

    const inicioDoDia = new Date();

    inicioDoDia.setHours(0, 0, 0, 0);

    const contar = (regra) => leads.filter(regra).length;

    $("contadorNovos").innerText =
        contar(lead => lead.status === "novo");

    $("contadorHoje").innerText =
        contar(lead => lead.chamado_em && new Date(lead.chamado_em) >= inicioDoDia);

    $("contadorInteressados").innerText =
        contar(lead => lead.status === "interessado");
}


function desenharLeads(){

    atualizarContadoresLeads();

    preencherSelectLeads("filtroCidade", "Todas as cidades", opcoesDoCampo("cidade"));

    preencherSelectLeads("filtroSegmento", "Todos os segmentos", opcoesDoCampo("segmento"));

    const status = $("filtroStatus").value;

    const filtrados = leads.filter(passaNosFiltros);

    const daLista =
        filtrados.filter(lead => !status || lead.status === status);

    // com o filtro "novo", quem está sendo chamado aparece em cima: sem isso
    // o lead sumiria da tela de quem acabou de pegar
    const emAndamento =
        status === "novo"
            ? filtrados.filter(lead => lead.status === "chamado")
            : [];

    // os meus primeiro
    emAndamento.sort((a, b) =>
        (b.chamado_por === usuarioLeads.id) - (a.chamado_por === usuarioLeads.id)
    );

    $("secaoAndamento").style.display = emAndamento.length ? "" : "none";

    $("tituloAndamento").innerText = `Em andamento (${emAndamento.length})`;

    const andamento = $("listaAndamento");

    andamento.innerHTML = "";

    emAndamento.forEach(lead => andamento.appendChild(criarCardLead(lead)));

    const lista = $("listaLeads");

    lista.innerHTML = "";

    daLista
        .slice(0, LIMITE_CARDS_LEADS)
        .forEach(lead => lista.appendChild(criarCardLead(lead)));

    $("contagemLeads").innerText =
        daLista.length > LIMITE_CARDS_LEADS
            ? `Mostrando ${LIMITE_CARDS_LEADS} de ${daLista.length} leads. Use os filtros para achar os outros.`
            : `${daLista.length} lead(s)`;

    const vazio = $("leadsVazio");

    vazio.style.display = daLista.length ? "none" : "";

    vazio.innerText =
        carregandoLeads
            ? "Carregando..."
            : (erroLeads || "Nenhum lead encontrado");
}


function criarCardLead(lead){

    const comigo = !!lead.chamado_por && lead.chamado_por === usuarioLeads.id;

    const card =
        criarElLead(
            "div",
            "lead" + (comigo ? " comigo" : (lead.chamado_por ? " com-outro" : ""))
        );

    card.dataset.id = lead.id;

    const topo = criarElLead("div", "lead-topo");

    topo.appendChild(criarElLead("span", "lead-empresa", lead.empresa));

    const tag = criarElLead("span", "tag-lead", rotuloStatusLead(lead.status));

    tag.dataset.status = lead.status;

    topo.appendChild(tag);

    card.appendChild(topo);

    const local =
        [lead.cidade, lead.uf].filter(Boolean).join("/");

    const dados =
        [lead.segmento, rotuloPorteLead(lead.porte), local].filter(Boolean).join(" · ");

    if(dados) card.appendChild(criarElLead("div", "lead-dados", dados));

    if(lead.motivo) card.appendChild(criarElLead("div", "lead-motivo", lead.motivo));

    card.appendChild(criarContatoLead(lead));

    if(lead.chamado_por){

        const quem =
            comigo ? "você" : (lead.chamado_por_email || "outro usuário");

        card.appendChild(
            criarElLead(
                "div",
                "lead-chamado",
                `Chamado por ${quem} em ${dataHoraLead(lead.chamado_em)}`
            )
        );
    }

    card.appendChild(criarAcoesLead(lead, comigo));

    card.appendChild(criarObservacaoLead(lead));

    return card;
}


function criarContatoLead(lead){

    const contato = criarElLead("div", "lead-contato");

    const partes = [lead.telefone, lead.whatsapp, lead.email].filter(Boolean);

    contato.textContent = [...new Set(partes)].join(" · ");

    const site = linkSite(lead.site);

    if(site){

        if(contato.textContent) contato.append(" · ");

        const link = criarElLead("a", "", lead.site);

        link.href = site;

        link.target = "_blank";

        link.rel = "noopener";

        contato.appendChild(link);
    }

    return contato;
}


function criarBotaoLead(texto, classe, aoClicar){

    const botao = criarElLead("button", classe, texto);

    botao.type = "button";

    botao.addEventListener("click", aoClicar);

    return botao;
}


function criarLinkLead(texto, classe, href, novaAba){

    const link = criarElLead("a", classe, texto);

    link.href = href;

    if(novaAba){

        link.target = "_blank";

        link.rel = "noopener";
    }

    return link;
}


function criarAcoesLead(lead, comigo){

    const acoes = criarElLead("div", "lead-acoes");

    if(!lead.chamado_por){

        acoes.appendChild(
            criarBotaoLead("🙋 Vou chamar", "btn-pegar", () => pegarLead(lead))
        );
    }

    const whatsapp = linkWhatsApp(lead);

    if(whatsapp){

        const linkZap =
            criarLinkLead("💬 Abrir WhatsApp", "btn-whatsapp", whatsapp, true);

        // monta na hora de usar: a saudação e o nome do vendedor podem ter mudado
        linkZap.addEventListener(
            "pointerdown",
            () => { linkZap.href = linkWhatsApp(lead); }
        );

        linkZap.addEventListener(
            "click",
            () => { linkZap.href = linkWhatsApp(lead); }
        );

        acoes.appendChild(linkZap);
    }

    const ligar = linkLigar(lead);

    if(ligar) acoes.appendChild(criarLinkLead("📞 Ligar", "btn-ligar", ligar, false));

    acoes.appendChild(
        criarBotaoLead(
            "📋 Copiar mensagem",
            "btn-copiar",
            () => copiar(montarMensagemLead(lead), "Mensagem copiada")
        )
    );

    // cliente e cidade seguem pelo endereço (propostas-init.js lê)
    acoes.appendChild(
        criarLinkLead(
            "📄 Gerar proposta",
            "btn-proposta",
            `propostas.html?cliente=${encodeURIComponent(lead.empresa || "")}&cidade=${encodeURIComponent(lead.cidade || "")}`,
            true
        )
    );

    // resultado: só quem marcou. O admin também, pra soltar lead esquecido.
    if(lead.chamado_por && (comigo || adminLeads)){

        acoes.appendChild(
            criarBotaoLead(
                "✅ Interessado",
                "btn-interessado",
                () => registrarResultado(lead, "interessado")
            )
        );

        acoes.appendChild(
            criarBotaoLead(
                "🚫 Sem interesse",
                "btn-sem-interesse",
                () => registrarResultado(lead, "sem_interesse")
            )
        );

        acoes.appendChild(
            criarBotaoLead(
                comigo ? "📵 Não atendeu" : "🔓 Liberar",
                "btn-liberar",
                () => registrarResultado(lead, "novo")
            )
        );
    }

    return acoes;
}


function criarObservacaoLead(lead){

    const area = criarElLead("div", "lead-obs");

    const campo = criarElLead("input");

    campo.type = "text";

    campo.maxLength = 200;

    campo.placeholder = "Observação";

    campo.value = lead.observacao || "";

    const salvo = criarElLead("small");

    let timer = null;

    const gravar = async () => {

        clearTimeout(timer);

        timer = null;

        const { data, error } =
            await supabaseClient
                .from(TABELA_LEADS)
                .update({ observacao: lead.observacao || null })
                .eq("id", lead.id)
                .select("id");

        if(error || !data.length){

            console.error("[leads] Falha ao salvar a observação:", error);

            mostrarToast("Erro ao salvar a observação", true);

            return;
        }

        salvo.textContent = "salva";
    };

    campo.addEventListener(
        "input",
        () => {

            lead.observacao = campo.value;

            salvo.textContent = "";

            clearTimeout(timer);

            timer = setTimeout(gravar, ATRASO_SALVAR_OBS_MS);
        }
    );

    // saiu do campo antes do tempo: grava na hora
    campo.addEventListener(
        "blur",
        () => {

            if(timer) gravar();
        }
    );

    area.append(campo, salvo);

    return area;
}


// ======================================
// AÇÕES
// ======================================

// A condição chamado_por vazio é que garante um só: se duas pessoas clicarem
// juntas, o banco só altera para a primeira e a outra recebe zero linhas.
async function pegarLead(lead){

    const { data, error } =
        await supabaseClient
            .from(TABELA_LEADS)
            .update({
                status: "chamado",
                chamado_por: usuarioLeads.id,
                chamado_por_email: usuarioLeads.email,
                chamado_em: new Date().toISOString()
            })
            .eq("id", lead.id)
            .is("chamado_por", null)
            .select();

    if(error){

        console.error("[leads] Falha ao marcar:", error);

        return mostrarToast("Erro ao marcar o lead", true);
    }

    if(data.length){

        Object.assign(lead, data[0]);

        desenharLeads();

        return mostrarToast("Lead marcado: é com você");
    }

    // alguém pegou antes: mostra quem foi
    await carregarLeads();

    desenharLeads();

    const atual = leads.find(item => item.id === lead.id);

    mostrarToast(
        atual && atual.chamado_por
            ? `${atual.chamado_por_email || "Outra pessoa"} pegou este lead em ${dataHoraLead(atual.chamado_em)}`
            : "Este lead mudou. A lista foi atualizada.",
        true
    );
}


// status = "interessado", "sem_interesse" ou "novo" (não atendeu: libera o lead)
async function registrarResultado(lead, status){

    const dados =
        status === "novo"
            ? { status, chamado_por: null, chamado_por_email: null, chamado_em: null }
            : { status };

    let consulta =
        supabaseClient
            .from(TABELA_LEADS)
            .update(dados)
            .eq("id", lead.id);

    // sem isso, a tela velha mexeria num lead que já passou para outra pessoa
    if(!adminLeads) consulta = consulta.eq("chamado_por", usuarioLeads.id);

    const { data, error } = await consulta.select();

    if(error){

        console.error("[leads] Falha ao registrar o resultado:", error);

        return mostrarToast("Erro ao registrar o resultado", true);
    }

    if(!data.length){

        await carregarLeads();

        desenharLeads();

        return mostrarToast("Este lead não está mais com você. A lista foi atualizada.", true);
    }

    Object.assign(lead, data[0]);

    desenharLeads();

    mostrarToast(
        status === "novo"
            ? "Lead liberado"
            : `Marcado como ${rotuloStatusLead(status)}`
    );
}


// ======================================
// CONFIGURAÇÃO DE BUSCA
// ======================================

// "Itajaí, Brusque; Joinville" -> ["Itajaí", "Brusque", "Joinville"]
function separarListaConfig(texto){

    return [
        ...new Set(
            String(texto || "")
                .split(/[,;\n]/)
                .map(parte => parte.trim())
                .filter(Boolean)
        )
    ];
}


async function carregarConfigsBusca(){

    const { data, error } =
        await supabaseClient
            .from(TABELA_LEADS_CONFIG)
            .select("*")
            .order("nome");

    if(error){

        console.error("[leads] Falha ao carregar as configurações:", error);

        mostrarToast(mensagemErroLeads(error), true);

        return;
    }

    configsBusca = data;
}


function resumoConfig(config){

    return [
        (config.cidades || []).join(", "),
        config.uf,
        (config.segmentos || []).join(", "),
        (config.portes || []).map(rotuloPorteLead).join(", "),
        config.palavras_chave
    ]
        .filter(Boolean)
        .join(" · ");
}


function desenharConfigsBusca(){

    const lista = $("listaConfigBusca");

    lista.innerHTML = "";

    if(!configsBusca.length){

        lista.appendChild(
            criarElLead("p", "dica-leads", "Nenhuma configuração criada.")
        );

        return;
    }

    configsBusca.forEach(config => {

        const linha =
            criarElLead("div", "config-busca" + (config.ativo ? "" : " inativa"));

        const info = criarElLead("div", "config-busca-info");

        info.appendChild(
            criarElLead(
                "strong",
                "",
                config.nome + (config.ativo ? "" : " (desativada)")
            )
        );

        info.appendChild(criarElLead("small", "", resumoConfig(config)));

        const botoes = criarElLead("div", "config-busca-botoes");

        botoes.appendChild(
            criarBotaoLead("✏️ Editar", "btn-secundario", () => editarConfigBusca(config))
        );

        botoes.appendChild(
            criarBotaoLead(
                config.ativo ? "Desativar" : "Ativar",
                config.ativo ? "btn-secundario" : "",
                () => alternarConfigBusca(config)
            )
        );

        linha.append(info, botoes);

        lista.appendChild(linha);
    });
}


function desenharPortesConfig(){

    const area = $("configPortes");

    area.innerHTML = "";

    PORTES_LEADS.forEach(porte => {

        const rotulo = criarElLead("label");

        const caixa = criarElLead("input");

        caixa.type = "checkbox";

        caixa.value = porte.valor;

        rotulo.append(caixa, porte.rotulo);

        area.appendChild(rotulo);
    });
}


function limparFormConfig(){

    idConfigEditando = null;

    $("tituloFormConfig").innerText = "Nova configuração";

    ["configNome", "configCidades", "configUf", "configSegmentos", "configPalavras"]
        .forEach(id => { $(id).value = ""; });

    document
        .querySelectorAll("#configPortes input")
        .forEach(caixa => { caixa.checked = false; });
}


function editarConfigBusca(config){

    idConfigEditando = config.id;

    $("tituloFormConfig").innerText = `Editando: ${config.nome}`;

    $("configNome").value = config.nome || "";

    $("configCidades").value = (config.cidades || []).join(", ");

    $("configUf").value = config.uf || "";

    $("configSegmentos").value = (config.segmentos || []).join(", ");

    $("configPalavras").value = config.palavras_chave || "";

    document
        .querySelectorAll("#configPortes input")
        .forEach(caixa => {

            caixa.checked = (config.portes || []).includes(caixa.value);
        });

    $("configNome").focus();
}


async function salvarConfigBusca(){

    const nome = $("configNome").value.trim();

    if(!nome) return mostrarToast("Informe o nome da configuração", true);

    const dados = {
        nome,
        cidades: separarListaConfig($("configCidades").value),
        uf: $("configUf").value.trim().toUpperCase() || null,
        segmentos: separarListaConfig($("configSegmentos").value),
        portes:
            Array.from(document.querySelectorAll("#configPortes input:checked"))
                .map(caixa => caixa.value),
        palavras_chave: $("configPalavras").value.trim() || null
    };

    const consulta =
        idConfigEditando
            ? supabaseClient
                .from(TABELA_LEADS_CONFIG)
                .update(dados)
                .eq("id", idConfigEditando)
            : supabaseClient
                .from(TABELA_LEADS_CONFIG)
                .insert(dados);

    const { data, error } = await consulta.select();

    if(error || !data.length){

        console.error("[leads] Falha ao salvar a configuração:", error);

        return mostrarToast("Erro ao salvar a configuração", true);
    }

    limparFormConfig();

    await carregarConfigsBusca();

    desenharConfigsBusca();

    mostrarToast("Configuração salva");
}


async function alternarConfigBusca(config){

    const { data, error } =
        await supabaseClient
            .from(TABELA_LEADS_CONFIG)
            .update({ ativo: !config.ativo })
            .eq("id", config.id)
            .select();

    if(error || !data.length){

        console.error("[leads] Falha ao alterar a configuração:", error);

        return mostrarToast("Erro ao alterar a configuração", true);
    }

    config.ativo = data[0].ativo;

    desenharConfigsBusca();
}


async function abrirConfigBusca(){

    $("modalConfigBusca").classList.add("aberto");

    limparFormConfig();

    await carregarConfigsBusca();

    desenharConfigsBusca();
}


function fecharConfigBusca(){

    $("modalConfigBusca").classList.remove("aberto");
}


// ======================================
// INIT
// ======================================

(async function iniciarLeads(){

    preencherSelectLeads(
        "filtroPorte",
        "Todos os portes",
        PORTES_LEADS.map(porte => [porte.valor, porte.rotulo])
    );

    preencherSelectLeads(
        "filtroStatus",
        "Todos os status",
        STATUS_LEADS.map(status => [status.valor, status.rotulo])
    );

    $("filtroStatus").value = "novo";

    desenharPortesConfig();

    ["filtroCidade", "filtroSegmento", "filtroPorte", "filtroStatus"].forEach(id => {

        $(id).addEventListener("change", desenharLeads);
    });

    $("buscaLeads").addEventListener("input", desenharLeads);

    desenharLeads();

    document.addEventListener("keydown", (evento) => {

        if(evento.key === "Escape") fecharConfigBusca();
    });

    const { data } = await supabaseClient.auth.getSession();

    const usuario = data?.session?.user;

    usuarioLeads = {
        id: usuario?.id || "",
        email: usuario?.email || ""
    };

    adminLeads = await ehAdmin();

    // o nome sai do e-mail até a pessoa corrigir
    const campoVendedor = $("nomeVendedor");

    try{

        campoVendedor.value =
            localStorage.getItem(`${CHAVE_VENDEDOR_LEADS}:${usuarioLeads.id}`) ||
            nomeDoEmail(usuarioLeads.email);

    }catch(erro){

        campoVendedor.value = nomeDoEmail(usuarioLeads.email);
    }

    campoVendedor.addEventListener(
        "input",
        () => {

            try{

                localStorage.setItem(
                    `${CHAVE_VENDEDOR_LEADS}:${usuarioLeads.id}`,
                    campoVendedor.value
                );

            }catch(erro){

                console.error("[leads] Erro ao salvar o nome:", erro);
            }
        }
    );

    await recarregarLeads(false);

    // voltou pra aba depois de um tempo: atualiza. Observação sendo digitada
    // ou janela aberta não são interrompidas.
    document.addEventListener("visibilitychange", () => {

        if(document.hidden) return;

        if(Date.now() - ultimaCargaLeads < INTERVALO_RECARGA_LEADS_MS) return;

        if(document.querySelector(".modal-overlay.aberto")) return;

        if(document.activeElement?.closest?.(".lead-obs")) return;

        recarregarLeads(false);
    });

})();
