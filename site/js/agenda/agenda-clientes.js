// ======================================
// AGENDA - SUGESTÕES DE CLIENTE
// ======================================
// Ao digitar o cliente, sugere o nome completo dos clientes de agendamentos
// anteriores (inclusive os de antes dos 30 dias da agenda, buscados uma vez).
// Escolhido um cliente, puxa do último agendamento dele os e-mails do
// faturamento e, em entrega, a forma de pagamento e os prazos. Com um local só,
// ele já vem preenchido (na transferência entre obras, no local de coleta: a
// máquina está lá); com mais de um, a pessoa escolhe nos botões (os locais do
// cliente ficam em agenda-clientes-locais.js). Trocar de cliente só troca o que
// foi preenchido sozinho; o que a pessoa digitou fica.
// Carregar depois de agenda-pagamento.js e antes de agenda-init.js.

// quantos agendamentos antigos entram nas sugestões (os mais recentes)
const LIMITE_HISTORICO_CLIENTES = 3000;

// depois disso, abrir o formulário busca de novo
const VALIDADE_HISTORICO_CLIENTES_MS = 10 * 60 * 1000;

const COLUNAS_HISTORICO_CLIENTES = [
    "id", "data", "tipo", "cliente",
    "origem_nome", "origem_endereco", "link_origem",
    "destino_nome", "destino_endereco", "link_destino",
    "contato", "emails", "forma_pagamento", "prazos_pagamento"
].join(", ");

// transferência entre obras: o contato do local de coleta (sem a coluna no
// banco, o SQL ainda não aplicado, busca sem ela)
const COLUNA_CONTATO_COLETA = "contato_origem";

let historicoSemContatoColeta = false;

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

            const buscar = () =>
                comTempoLimite(
                    supabaseClient
                        .from(TABELA_AGENDAMENTOS)
                        .select(
                            historicoSemContatoColeta
                                ? COLUNAS_HISTORICO_CLIENTES
                                : `${COLUNAS_HISTORICO_CLIENTES}, ${COLUNA_CONTATO_COLETA}`
                        )
                        .neq("cliente", "")
                        .is("excluido_em", null)
                        .order("data", { ascending: false, nullsFirst: true })
                        .order("id", { ascending: false })
                        .limit(LIMITE_HISTORICO_CLIENTES),
                    TEMPO_LIMITE_CARGA_MS
                );

            let { data, error } = await buscar();

            if(error && !historicoSemContatoColeta && String(error.message || "").includes(COLUNA_CONTATO_COLETA)){

                historicoSemContatoColeta = true;

                ({ data, error } = await buscar());
            }

            if(error) throw error;

            historicoClientes = (data || []).map(doBanco);

            historicoClientesEm = Date.now();

            guardarCopiaOffline("clientes", data || []);

        }catch(erro){

            // sem internet: os clientes da cópia do aparelho (agenda-offline-dados.js);
            // sem ela, sugere só o que a agenda já carregou
            const copia = erroDeRede(erro) ? await lerCopiaOffline("clientes") : null;

            if(copia){

                historicoClientes = copia.valor.map(doBanco);

            }else{

                console.warn("[agenda] Falha ao carregar os clientes antigos:", detalhesErro(erro));
            }
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


// em entrega (e entrega/coleta): forma e prazos da última entrega dele, se o
// faturamento está vazio ou ainda com o que foi preenchido sozinho
function preencherPagamentoCliente(cliente){

    if(!TIPOS_CONTRATO_NOVO.includes($("agTipo").value)) return false;

    const livre =
        !faturamentoPreenchido() ||
        (pagamentoAuto !== null && pagamentoAuto === textoPagamentoFormulario());

    if(!livre) return false;

    const ultima =
        cliente.itens.find(item => TIPOS_CONTRATO_NOVO.includes(item.tipo) && item.formaPagamento);

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

    const lados = ladosLocalCliente();

    const locais = lados.length ? locaisDoCliente(cliente) : [];

    // um local só já vai no 1º lado (na transferência, a coleta: a máquina está
    // lá); com mais de um a pessoa escolhe nos botões. O que veio sozinho de
    // outro cliente sai (no outro lado da transferência também)
    lados.forEach((lado, indice) => {

        const local = (indice === 0 && locais.length === 1) ? locais[0] : {};

        if(preencherAuto(lado.endereco, local.endereco)) puxados.push("endereço");

        preencherAuto(lado.nome, local.nome);

        preencherAuto(lado.link, local.link);

        if(preencherAuto(lado.contato, local.contato)) puxados.push("contato");
    });

    const transferencia = $("agTipo").value === TIPO_TRANSFERENCIA_OBRAS;

    const emails = cliente.itens.map(item => item.emails).find(Boolean);

    if(preencherAuto("agEmails", emails)) puxados.push("e-mails");

    if(preencherPagamentoCliente(cliente)) puxados.push("pagamento");

    desenharLocaisCliente();

    atualizarRetirada();

    agendarRascunho();

    const aviso = [];

    if(puxados.length) aviso.push(`Do último agendamento de ${cliente.nome}: ${puxados.join(", ")}.`);

    if(locais.length > 1 || (transferencia && locais.length)){

        aviso.push(
            transferencia
                ? `Escolha ${locais.length > 1 ? "os locais de coleta e de entrega" : "o local de entrega"} em "Local e entrega".`
                : `Escolha um dos ${locais.length} locais em "Local e entrega".`
        );

        mostrarEtapa("local", true);
    }

    if(puxados.length) aviso.push("Confira antes de salvar.");

    if(aviso.length) mostrarToast(aviso.join(" "));
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
