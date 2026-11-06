// ======================================
// AGENDA - SUGESTÕES DE CLIENTE
// ======================================
// Ao digitar o cliente, sugere o nome completo dos clientes de agendamentos
// anteriores (inclusive os de antes dos 30 dias da agenda, buscados uma vez).
// Escolhido um cliente, puxa do último agendamento dele os e-mails do
// faturamento e, em entrega, a forma de pagamento e os prazos. Os locais que o
// cliente já usou (entrega e troca = local de entrega; coleta = local de
// retirada; transferência não tem) aparecem como botões com o nome do local e
// a cidade: com um local só, ele já vem preenchido; com mais de um, a pessoa
// escolhe. Escolher um local troca endereço, nome, link e contato, mesmo que já
// tenha outro (clicou no errado: é só clicar no certo). Trocar de cliente só
// troca o que foi preenchido sozinho; o que a pessoa digitou fica.
// Carregar depois de agenda-pagamento.js e antes de agenda-init.js.

// quantos agendamentos antigos entram nas sugestões (os mais recentes)
const LIMITE_HISTORICO_CLIENTES = 3000;

// depois disso, abrir o formulário busca de novo
const VALIDADE_HISTORICO_CLIENTES_MS = 10 * 60 * 1000;

const MAX_LOCAIS_CLIENTE = 15;

const COLUNAS_HISTORICO_CLIENTES = [
    "id", "data", "tipo", "cliente",
    "origem_nome", "origem_endereco", "link_origem",
    "destino_nome", "destino_endereco", "link_destino",
    "contato", "emails", "forma_pagamento", "prazos_pagamento"
].join(", ");

let historicoClientes = [];

let historicoClientesEm = 0;

let cargaHistoricoClientes = null;

// clientes montados ao abrir o formulário e ao chegar o histórico
let clientesAgenda = new Map();

// cliente cujos dados já foram puxados neste formulário (não puxa duas vezes)
let clientePreenchido = "";

// o que foi preenchido sozinho neste formulário (id do campo -> valor). Se
// continua igual, outro cliente pode trocar; se a pessoa mudou, fica.
let preenchidosAuto = {};

// forma e prazos que foram preenchidos sozinhos (mesma ideia)
let pagamentoAuto = null;


function chaveCliente(nome){

    return semAcento(nome).toUpperCase().replace(/\s+/g, " ").trim();
}


function carregarHistoricoClientes(){

    if(cargaHistoricoClientes) return cargaHistoricoClientes;

    if(Date.now() - historicoClientesEm < VALIDADE_HISTORICO_CLIENTES_MS){

        return Promise.resolve();
    }

    cargaHistoricoClientes = (async () => {

        try{

            const { data, error } =
                await supabaseClient
                    .from(TABELA_AGENDAMENTOS)
                    .select(COLUNAS_HISTORICO_CLIENTES)
                    .neq("cliente", "")
                    .is("excluido_em", null)
                    .order("data", { ascending: false, nullsFirst: true })
                    .order("id", { ascending: false })
                    .limit(LIMITE_HISTORICO_CLIENTES);

            if(error) throw error;

            historicoClientes = (data || []).map(doBanco);

            historicoClientesEm = Date.now();

        }catch(erro){

            // sem o histórico, sugere só o que a agenda já carregou
            console.warn("[agenda] Falha ao carregar os clientes antigos:", detalhesErro(erro));
        }

        cargaHistoricoClientes = null;

        desenharSugestoesClientes();
    })();

    return cargaHistoricoClientes;
}


// mais recente primeiro: sem data (ainda vai acontecer), depois a data maior
function compararRecentes(a, b){

    if(!a.data !== !b.data) return a.data ? 1 : -1;

    if(a.data !== b.data) return a.data < b.data ? 1 : -1;

    return (Number(b.id) || 0) - (Number(a.id) || 0);
}


// a agenda carregada vale sobre o histórico (pode ter sido editada agora);
// o agendamento aberto no formulário não entra
function agendamentosComCliente(){

    const porId = new Map();

    historicoClientes.forEach(item => porId.set(item.id, item));

    agendamentos.forEach(item => porId.set(item.id, item));

    return [...porId.values()]
        .filter(item => item.id !== idEmEdicao && chaveCliente(item.cliente))
        .sort(compararRecentes);
}


// { chave: { nome, itens (mais recente primeiro) } }
function clientesConhecidos(){

    const clientes = new Map();

    agendamentosComCliente().forEach(item => {

        const chave = chaveCliente(item.cliente);

        if(!clientes.has(chave)){

            clientes.set(chave, { nome: item.cliente.trim().replace(/\s+/g, " "), itens: [] });
        }

        clientes.get(chave).itens.push(item);
    });

    return clientes;
}


// o lado do cliente no agendamento (o outro lado é a W Rental)
function localDoCliente(item){

    const lado =
        item.tipo === "Coleta"
            ? { nome: item.origemNome, endereco: item.origemEndereco, link: item.linkOrigem }
            : (item.tipo === "Entrega" || item.tipo === "Troca técnica")
                ? { nome: item.destinoNome, endereco: item.destinoEndereco, link: item.linkDestino }
                : null;

    if(!lado || !String(lado.endereco || "").trim() || ehLocalWR(lado.nome)) return null;

    return { ...lado, contato: item.contato };
}


// um por endereço, o mais recente primeiro (com o nome, link e contato da
// última vez que foi usado)
function locaisDoCliente(cliente){

    const locais = new Map();

    cliente.itens.forEach(item => {

        const local = localDoCliente(item);

        if(!local) return;

        const chave = chaveCliente(local.endereco);

        if(!locais.has(chave)) locais.set(chave, local);
    });

    return [...locais.values()].slice(0, MAX_LOCAIS_CLIENTE);
}


// campos do formulário onde fica o local do cliente, pelo tipo escolhido
// (transferência não tem lado do cliente: nada é sugerido)
function camposLocalCliente(){

    const tipo = $("agTipo").value;

    if(tipo === "Coleta"){

        return { nome: "agOrigemNome", endereco: "agOrigemEndereco", link: "agLinkOrigem" };
    }

    if(tipo === "Entrega" || tipo === "Troca técnica"){

        return { nome: "agDestinoNome", endereco: "agDestinoEndereco", link: "agLinkDestino" };
    }

    return null;
}


function clienteDoFormulario(){

    return clientesAgenda.get(chaveCliente($("agCliente").value)) || null;
}


function preencherOpcoes(idLista, opcoes){

    const lista = $(idLista);

    lista.innerHTML = "";

    opcoes.forEach(([valor, rotulo]) => {

        const opcao = criar("option");

        opcao.value = valor;

        if(rotulo) opcao.label = rotulo;

        lista.appendChild(opcao);
    });
}


// "Obra Centro · Brusque/SC" (o que tiver dos dois; sem nenhum, o endereço)
function rotuloLocal(local){

    return [local.nome, cidadeDoEndereco(local.endereco)].filter(Boolean).join(" · ") ||
        local.endereco;
}


// nome completo de cada cliente, com o último local (ou quantos locais tem)
function desenharSugestoesClientes(){

    clientesAgenda = clientesConhecidos();

    const opcoes =
        [...clientesAgenda.values()].map(cliente => {

            const locais = locaisDoCliente(cliente);

            const rotulo =
                locais.length > 1
                    ? `${locais.length} locais · último: ${rotuloLocal(locais[0])}`
                    : locais.length ? rotuloLocal(locais[0]) : "";

            return [cliente.nome, rotulo];
        })
        .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));

    preencherOpcoes("listaClientesAgenda", opcoes);

    desenharLocaisCliente();
}


// botões com os locais do cliente (e a lista do campo de endereço)
function desenharLocaisCliente(){

    const cliente = clienteDoFormulario();

    const campos = camposLocalCliente();

    const locais = cliente && campos ? locaisDoCliente(cliente) : [];

    ["agOrigemEndereco", "agDestinoEndereco"].forEach(id => $(id).removeAttribute("list"));

    preencherOpcoes(
        "listaLocaisCliente",
        locais.map(local => [local.endereco, rotuloLocal(local)])
    );

    $("blocoLocaisCliente").style.display = locais.length ? "" : "none";

    const chips = $("chipsLocaisCliente");

    chips.innerHTML = "";

    if(!locais.length) return;

    $(campos.endereco).setAttribute("list", "listaLocaisCliente");

    $("tituloLocaisCliente").innerText =
        locais.length > 1
            ? `📍 ${cliente.nome} já usou ${locais.length} locais: escolha um`
            : `📍 Local já usado por ${cliente.nome}`;

    locais.forEach(local => {

        const botao = criar("button", "chip chip-local");

        botao.type = "button";

        botao.title = local.endereco;

        botao.dataset.endereco = chaveCliente(local.endereco);

        botao.append(
            criar("strong", "", local.nome || "(sem nome do local)"),
            criar("small", "", cidadeDoEndereco(local.endereco) || local.endereco)
        );

        botao.addEventListener("click", () => usarLocalCliente(local));

        chips.appendChild(botao);
    });

    marcarLocalAtivo();
}


// destaca o botão do endereço que está no formulário
function marcarLocalAtivo(){

    const campos = camposLocalCliente();

    const atual = campos ? chaveCliente($(campos.endereco).value) : "";

    $("chipsLocaisCliente").querySelectorAll(".chip-local").forEach(botao => {

        botao.classList.toggle("ativo", !!atual && botao.dataset.endereco === atual);
    });
}


// preenche se o campo está vazio ou ainda com o que foi preenchido sozinho
function preencherAuto(id, valor){

    const atual = $(id).value;

    if(atual.trim() && atual !== preenchidosAuto[id]) return false;

    $(id).value = valor || "";

    preenchidosAuto[id] = $(id).value;

    return !!valor;
}


function textoPagamentoFormulario(){

    return JSON.stringify([$("agFormaPagamento").value, prazosDigitados()]);
}


// em entrega: forma e prazos da última entrega dele, se o faturamento está
// vazio ou ainda com o que foi preenchido sozinho
function preencherPagamentoCliente(cliente){

    if($("agTipo").value !== "Entrega") return false;

    const livre =
        !faturamentoPreenchido() ||
        (pagamentoAuto !== null && pagamentoAuto === textoPagamentoFormulario());

    if(!livre) return false;

    const ultima =
        cliente.itens.find(item => item.tipo === "Entrega" && item.formaPagamento);

    $("agFormaPagamento").value = ultima ? ultima.formaPagamento : "";

    const prazos = ultima ? (ultima.prazosPagamento || []).map(String) : [];

    prazosFormulario = prazos.length ? prazos : [""];

    desenharPrazos();

    pagamentoAuto = textoPagamentoFormulario();

    return !!ultima;
}


// escolheu (ou terminou de digitar) um cliente conhecido
function aplicarCliente(){

    const cliente = clienteDoFormulario();

    if(!cliente || chaveCliente(cliente.nome) === clientePreenchido) return;

    clientePreenchido = chaveCliente(cliente.nome);

    $("agCliente").value = cliente.nome;

    const puxados = [];

    const campos = camposLocalCliente();

    const locais = campos ? locaisDoCliente(cliente) : [];

    if(campos){

        // um local só já vai; com mais de um a pessoa escolhe nos botões (e o
        // que veio sozinho de outro cliente sai)
        const local = locais.length === 1 ? locais[0] : {};

        if(preencherAuto(campos.endereco, local.endereco)) puxados.push("endereço");

        preencherAuto(campos.nome, local.nome);

        preencherAuto(campos.link, local.link);

        if(preencherAuto("agContato", local.contato)) puxados.push("contato");
    }

    const emails = cliente.itens.map(item => item.emails).find(Boolean);

    if(preencherAuto("agEmails", emails)) puxados.push("e-mails");

    if(preencherPagamentoCliente(cliente)) puxados.push("pagamento");

    desenharLocaisCliente();

    atualizarRetirada();

    agendarRascunho();

    const aviso = [];

    if(puxados.length) aviso.push(`Do último agendamento de ${cliente.nome}: ${puxados.join(", ")}.`);

    if(locais.length > 1){

        aviso.push(`Escolha um dos ${locais.length} locais em "Local e entrega".`);

        mostrarEtapa("local", true);
    }

    if(puxados.length) aviso.push("Confira antes de salvar.");

    if(aviso.length) mostrarToast(aviso.join(" "));
}


// escolheu um local: endereço, nome, link e contato passam a ser os dele,
// mesmo que já tivesse outro
function usarLocalCliente(local){

    const campos = camposLocalCliente();

    if(!campos) return;

    [
        [campos.endereco, local.endereco],
        [campos.nome, local.nome],
        [campos.link, local.link],
        ["agContato", local.contato]
    ].forEach(([id, valor]) => {

        $(id).value = valor || "";

        preenchidosAuto[id] = $(id).value;
    });

    marcarLocalAtivo();

    atualizarRetirada();

    agendarRascunho();
}


// escolheu um endereço na lista do campo
function aplicarLocalDaLista(evento){

    const campos = camposLocalCliente();

    const cliente = clienteDoFormulario();

    if(!campos || !cliente || evento.target.id !== campos.endereco) return;

    const local =
        locaisDoCliente(cliente)
            .find(item => chaveCliente(item.endereco) === chaveCliente(evento.target.value));

    if(local) usarLocalCliente(local);
}


// escolha na lista do navegador chega como input sem digitação
function escolheuDaLista(evento){

    return !evento.inputType || evento.inputType === "insertReplacementText";
}


// abrindo o formulário: o cliente que já veio preenchido não puxa nada
function prepararSugestoesClientes(){

    clientePreenchido = chaveCliente($("agCliente").value);

    preenchidosAuto = {};

    pagamentoAuto = null;

    desenharSugestoesClientes();

    carregarHistoricoClientes();
}


function ligarSugestoesClientes(){

    $("agCliente").addEventListener("input", evento => {

        if(escolheuDaLista(evento)) aplicarCliente();

        else desenharLocaisCliente();
    });

    $("agCliente").addEventListener("change", aplicarCliente);

    $("agTipo").addEventListener("change", desenharLocaisCliente);

    ["agOrigemEndereco", "agDestinoEndereco"].forEach(id => {

        $(id).addEventListener("input", evento => {

            if(escolheuDaLista(evento)) aplicarLocalDaLista(evento);

            marcarLocalAtivo();
        });
    });
}
