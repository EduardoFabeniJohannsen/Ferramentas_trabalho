// ======================================
// AGENDA
// ======================================
// Os dados ficam no Supabase (tabelas "agendamentos" e "motoristas").
// Qualquer usuário logado lê e altera (policies de RLS no Supabase).
// Modo, ordem e filtros são preferências salvas só neste navegador.
// Depende de supabase-config.js, auth-guard.js e helpers.js
// (precisam vir carregados antes).

// ======================================
// CONFIGURAÇÃO
// ======================================

// nomes das transportadoras (vêm da tabela "transportadoras" do Supabase)
let TRANSPORTADORAS = [];

const TIPOS = ["Entrega", "Coleta", "Transferência", "Troca técnica"];

// horário que já vem preenchido num agendamento novo
const HORARIO_PADRAO = "08:00";

const STATUS_AGENDA = [
    "A confirmar",
    "Confirmado",
    "Em rota",
    "Concluído",
    "Cancelado"
];

// local padrão quando origem (entrega) ou destino (coleta) fica vazio
const LOCAL_PADRAO = "W Rental";

// no modo expedição, o que já saiu (ou foi encerrado) não aparece
const STATUS_OCULTOS_EXPEDICAO = ["Em rota", "Concluído", "Cancelado"];

// cor de cada dia da semana (0 = domingo ... 6 = sábado), pra bater o
// olho e achar as demandas do dia. Sem data fica cinza.
const CORES_DIAS = [
    "#fb7185",
    "#60a5fa",
    "#4ade80",
    "#fbbf24",
    "#c084fc",
    "#22d3ee",
    "#f472b6"
];

const COR_SEM_DATA = "#94a3b8";

// colunas de cada modo, na ordem em que aparecem (id = nome da célula
// montada em criarCelulasAgenda). maxLargura = largura máxima da coluna
// (o texto quebra de linha depois dela); sem maxLargura, a coluna se
// ajusta ao conteúdo.
const COLUNAS_EXPEDICAO = [
    { id: "horario", titulo: "Horário" },
    { id: "titulo", titulo: "Plataforma / Cliente", maxLargura: "340px" },
    { id: "transportadora", titulo: "Transportadora" },
    { id: "motorista", titulo: "Motorista" },
    { id: "periodo", titulo: "Período" },
    { id: "status", titulo: "Status" },
    { id: "obs", titulo: "Observação", maxLargura: "340px" }
];

// sem período, e com o frete por último
const COLUNAS_TRANSPORTADOR = [
    { id: "horario", titulo: "Horário" },
    { id: "tipo", titulo: "Tipo" },
    { id: "titulo", titulo: "Plataforma / Cliente", maxLargura: "340px" },
    { id: "transportadora", titulo: "Transportadora" },
    { id: "motorista", titulo: "Motorista" },
    { id: "status", titulo: "Status" },
    { id: "retirada", titulo: "Retirada", maxLargura: "300px" },
    { id: "entrega", titulo: "Entrega", maxLargura: "340px" },
    { id: "obs", titulo: "Observação", maxLargura: "280px" },
    { id: "frete", titulo: "Frete" }
];

const CHAVE_AGENDA_MODO = "agendaModo";

const CHAVE_AGENDA_ORDEM = "agendaOrdem";

// rascunhos do formulário (o que foi digitado e não foi salvo)
const CHAVE_AGENDA_RASCUNHOS = "agendaRascunhos";

// A agenda sempre fica separada por data. Isso é a ordem DENTRO de
// cada data (em todas, o desempate final é o horário).
const ORDENS = [
    { valor: "horario", rotulo: "Ordenar: horário (padrão)" },
    { valor: "motorista", rotulo: "Ordenar: motorista → horário" },
    { valor: "entregas", rotulo: "Ordenar: entregas primeiro", soTransportador: true },
    { valor: "coletas", rotulo: "Ordenar: coletas primeiro", soTransportador: true }
];

// valor especial do filtro: agendamentos sem transportadora
const SEM_TRANSPORTADORA = "__sem__";

let agendamentos = [];

let filtroTransportadora = "";

// "expedicao" ou "transportador"
let modoVisualizacao = "transportador";

// valor de ORDENS
let ordemAgenda = "horario";

// cadastro de motoristas: [{ id, transportadora, nome }]
// (vem da tabela "motoristas" do Supabase)
let motoristasCadastrados = [];

// null = novo agendamento; id = editando
let idEmEdicao = null;

// estado do carregamento (a lista mostra "Carregando..." ou o erro)
let carregandoAgenda = true;

let erroAgenda = "";

// hora (ms) da última carga, pra recarregar ao voltar pra aba
let ultimoCarregamento = 0;

// evita salvar duas vezes com clique duplo
let salvandoAgendamento = false;

// cadastro de transportadoras: [{ id, nome }]
// (vem da tabela "transportadoras" do Supabase)
let transportadorasCadastradas = [];

// o formulário foi mexido desde que abriu (só então vira rascunho)
let formularioAlterado = false;

let timerRascunho = null;

// valores que o agendamento tinha ao abrir (valores antigos fora do
// padrão continuam podendo ser salvos sem mexer neles)
let valoresOriginais = { horario: "", periodo: "" };


// ======================================
// UTILITÁRIOS
// ======================================

function criar(tag, classe, texto){

    const elemento =
        document.createElement(tag);

    if(classe) elemento.className = classe;

    if(texto !== undefined && texto !== null){

        elemento.textContent = texto;
    }

    return elemento;
}


// data de hoje + deslocamento, no formato do input date (AAAA-MM-DD)
function dataISO(deslocamentoDias){

    const data = new Date();

    data.setDate(data.getDate() + deslocamentoDias);

    const ano = data.getFullYear();

    const mes =
        String(data.getMonth() + 1).padStart(2, "0");

    const dia =
        String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


function corDoDia(iso){

    if(!iso) return COR_SEM_DATA;

    return CORES_DIAS[
        new Date(iso + "T00:00:00").getDay()
    ];
}


function tituloDoDia(iso){

    const data =
        new Date(iso + "T00:00:00");

    const diaSemana =
        data.toLocaleDateString(
            "pt-BR",
            { weekday: "long" }
        );

    let sufixo = "";

    if(iso === dataISO(0)) sufixo = " — hoje";

    if(iso === dataISO(1)) sufixo = " — amanhã";

    return `${diaSemana}, ${formatarData(data)}${sufixo}`;
}


// ======================================
// SUPABASE - AGENDAMENTOS
// ======================================
// O código usa camelCase (origemNome) e o banco snake_case
// (origem_nome): CAMPOS_BANCO faz a tradução nos dois sentidos.

const TABELA_AGENDAMENTOS = "agendamentos";

const TABELA_MOTORISTAS = "motoristas";

const TABELA_TRANSPORTADORAS = "transportadoras";

// quantos dias pra trás a agenda carrega (os sem data vêm sempre)
const DIAS_PASSADOS_AGENDA = 30;

// ao voltar pra aba, recarrega se passou mais que isso (ms)
const INTERVALO_RECARGA_MS = 30000;

const CAMPOS_BANCO = {
    data: "data",
    horario: "horario",
    tipo: "tipo",
    status: "status",
    plataforma: "plataforma",
    plataformaRecolha: "plataforma_recolha",
    cliente: "cliente",
    proposta: "proposta",
    transportadora: "transportadora",
    motorista: "motorista",
    periodo: "periodo",
    origemNome: "origem_nome",
    origemEndereco: "origem_endereco",
    linkOrigem: "link_origem",
    destinoNome: "destino_nome",
    destinoEndereco: "destino_endereco",
    linkDestino: "link_destino",
    frete: "frete",
    freteConta: "frete_conta",
    referencia: "referencia",
    contato: "contato",
    card: "card",
    emails: "emails",
    obsExpedicao: "obs_expedicao",
    obsEntrega: "obs_entrega"
};


// linha do banco -> agendamento do código
function doBanco(linha){

    const item = { id: linha.id };

    Object.entries(CAMPOS_BANCO).forEach(([campo, coluna]) => {

        const valor = linha[coluna];

        item[campo] =
            (valor === null || valor === undefined)
                ? ""
                : valor;
    });

    // o frete é numérico no banco; no código segue como texto "1.150,00"
    item.frete =
        (linha.frete === null || linha.frete === undefined)
            ? ""
            : formatarMoedaBR(linha.frete);

    item.freteConta = linha.frete_conta || "nossa";

    return item;
}


// campos do código (pode ser só alguns) -> colunas do banco
function paraBanco(dados){

    const linha = {};

    Object.entries(dados).forEach(([campo, valor]) => {

        const coluna = CAMPOS_BANCO[campo];

        if(!coluna) return;

        if(campo === "data"){

            // data vazia vira null (agendamento ainda sem data)
            linha[coluna] = valor || null;

        }else if(campo === "frete"){

            const numero = brToNumber(valor);

            linha[coluna] =
                (valor === "" || valor === null || valor === undefined || !Number.isFinite(numero))
                    ? null
                    : numero;

        }else{

            linha[coluna] = valor ?? "";
        }
    });

    return linha;
}


function detalhesErro(erro){

    return {
        mensagem: erro?.message,
        codigo: erro?.code,
        detalhes: erro?.details,
        dica: erro?.hint
    };
}


// o Supabase devolve no máximo 1000 linhas por consulta,
// então busca em páginas até acabar
async function carregarAgenda(){

    erroAgenda = "";

    try{

        const limite = dataISO(-DIAS_PASSADOS_AGENDA);

        const tamanhoPagina = 1000;

        let inicio = 0;

        let linhas = [];

        while(true){

            const { data, error } =
                await supabaseClient
                    .from(TABELA_AGENDAMENTOS)
                    .select("*")
                    .or(`data.gte.${limite},data.is.null`)
                    .order("id")
                    .range(inicio, inicio + tamanhoPagina - 1);

            if(error) throw error;

            linhas = linhas.concat(data);

            if(data.length < tamanhoPagina) break;

            inicio += tamanhoPagina;
        }

        agendamentos = linhas.map(doBanco);

    }catch(erro){

        console.error("[agenda] Falha ao carregar:", detalhesErro(erro));

        erroAgenda =
            "Não foi possível carregar a agenda (verifique conexão/login)";

        mostrarToast("Falha ao carregar a agenda", true);
    }
}


async function inserirAgendamento(dados){

    const { data, error } =
        await supabaseClient
            .from(TABELA_AGENDAMENTOS)
            .insert(paraBanco(dados))
            .select()
            .single();

    if(error) throw error;

    return doBanco(data);
}


// .select() devolve as linhas alteradas: se vier vazio, o agendamento
// não existe mais (alguém excluiu) ou o RLS bloqueou
async function atualizarAgendamento(id, dados){

    const { data, error } =
        await supabaseClient
            .from(TABELA_AGENDAMENTOS)
            .update(paraBanco(dados))
            .eq("id", id)
            .select();

    if(error) throw error;

    if(!data.length){

        throw new Error("Agendamento não encontrado (foi excluído?)");
    }

    return doBanco(data[0]);
}


async function excluirAgendamentoBanco(id){

    const { data, error } =
        await supabaseClient
            .from(TABELA_AGENDAMENTOS)
            .delete()
            .eq("id", id)
            .select();

    if(error) throw error;

    return data.length > 0;
}


// recarrega agendamentos e motoristas (botão ↻ Atualizar, abertura
// da página e volta pra aba). manual = mostra aviso de atualizado.
async function recarregarAgenda(manual){

    await Promise.all([
        carregarAgenda(),
        carregarMotoristas(),
        carregarTransportadoras()
    ]);

    atualizarSelectsTransportadora();

    carregandoAgenda = false;

    ultimoCarregamento = Date.now();

    renderizarAgenda();

    if(manual && !erroAgenda){

        mostrarToast("Agenda atualizada");
    }
}


// ======================================
// MODO DE VISUALIZAÇÃO
// ======================================
// Expedição: só entregas que ainda não saíram (inclui as sem
// data, que já precisam de preparativos). Sem local nem valor.
// Transportador: todos os tipos, informação completa, mas só
// o que já tem data definida.

function definirModo(modo){

    modoVisualizacao =
        modo === "expedicao"
            ? "expedicao"
            : "transportador";

    try{

        localStorage.setItem(
            CHAVE_AGENDA_MODO,
            modoVisualizacao
        );

    }catch(erro){

        console.error("Erro ao salvar modo:", erro);
    }

    renderizarAgenda();
}


function visivelNoModo(item){

    if(modoVisualizacao === "expedicao"){

        return (
            (item.tipo === "Entrega" || item.tipo === "Troca técnica") &&
            !STATUS_OCULTOS_EXPEDICAO.includes(item.status)
        );
    }

    return !!item.data;
}


// ======================================
// FILTROS
// ======================================
// ignorarTransportadora = usado pra contar os botões das
// transportadoras respeitando os outros filtros.

function filtrarAgendamentos(ignorarTransportadora){

    const tipo = $("filtroTipo").value;

    const status = $("filtroStatus").value;

    const periodo = $("filtroPeriodo").value;

    const hoje = dataISO(0);

    const limite = dataISO(7);

    const expedicao =
        modoVisualizacao === "expedicao";

    return agendamentos.filter(item => {

        if(!visivelNoModo(item)) return false;

        if(!ignorarTransportadora){

            if(
                filtroTransportadora === SEM_TRANSPORTADORA &&
                item.transportadora
            ){
                return false;
            }

            if(
                filtroTransportadora &&
                filtroTransportadora !== SEM_TRANSPORTADORA &&
                item.transportadora !== filtroTransportadora
            ){
                return false;
            }
        }

        // na expedição só tem entrega, então o filtro de tipo não vale
        if(!expedicao && tipo && item.tipo !== tipo) return false;

        if(status && item.status !== status) return false;

        if(periodo === "hoje" && item.data !== hoje) return false;

        if(
            periodo === "semana" &&
            (!item.data || item.data < hoje || item.data > limite)
        ){
            return false;
        }

        return true;
    });
}


// Sempre por data (sem data vem primeiro). Dentro de cada data vale a
// ordem escolhida; o horário é sempre o desempate, então com
// "motorista" a rota de cada motorista fica por horário.
function ordemEfetiva(){

    const ordem =
        ORDENS.find(item => item.valor === ordemAgenda);

    if(
        !ordem ||
        (ordem.soTransportador && modoVisualizacao === "expedicao")
    ){
        return "horario";
    }

    return ordem.valor;
}


// horário vazio vai pro fim
function compararHorario(a, b){

    const horarioA = String(a.horario || "");

    const horarioB = String(b.horario || "");

    if(horarioA === horarioB) return 0;

    if(!horarioA) return 1;

    if(!horarioB) return -1;

    return horarioA.localeCompare(horarioB);
}


function ordenarAgendamentos(lista){

    const ordem = ordemEfetiva();

    const ordemTipos =
        ordem === "coletas"
            ? ["Coleta", "Entrega", "Troca técnica", "Transferência"]
            : ["Entrega", "Troca técnica", "Coleta", "Transferência"];

    return lista.sort((a, b) => {

        // 1) data
        if(a.data !== b.data){

            if(!a.data) return -1;

            if(!b.data) return 1;

            return a.data < b.data ? -1 : 1;
        }

        // 2) critério escolhido (dentro da mesma data)
        if(ordem === "motorista"){

            const motoristaA = a.motorista || "";

            const motoristaB = b.motorista || "";

            if(motoristaA !== motoristaB){

                // sem motorista vai pro fim da data
                if(!motoristaA) return 1;

                if(!motoristaB) return -1;

                const comparacao =
                    motoristaA.localeCompare(
                        motoristaB,
                        "pt-BR",
                        { sensitivity: "base" }
                    );

                if(comparacao) return comparacao;
            }
        }

        if(ordem === "entregas" || ordem === "coletas"){

            const diferenca =
                ordemTipos.indexOf(a.tipo) -
                ordemTipos.indexOf(b.tipo);

            if(diferenca) return diferenca;
        }

        // 3) horário
        const porHorario = compararHorario(a, b);

        if(porHorario) return porHorario;

        return String(a.plataforma || "")
            .localeCompare(String(b.plataforma || ""));
    });
}


// ======================================
// DESENHAR
// ======================================

function desenharChips(){

    const area = $("chipsTransportadora");

    area.innerHTML = "";

    const base =
        filtrarAgendamentos(true);

    const opcoes = [
        { valor: "", rotulo: "Todas" },
        ...TRANSPORTADORAS.map(nome => ({ valor: nome, rotulo: nome })),
        { valor: SEM_TRANSPORTADORA, rotulo: "Sem transportadora" }
    ];

    opcoes.forEach(opcao => {

        const quantidade =
            base.filter(item => {

                if(opcao.valor === "") return true;

                if(opcao.valor === SEM_TRANSPORTADORA){

                    return !item.transportadora;
                }

                return item.transportadora === opcao.valor;

            }).length;

        const botao =
            criar(
                "button",
                "chip" + (filtroTransportadora === opcao.valor ? " ativo" : ""),
                `${opcao.rotulo} (${quantidade})`
            );

        botao.type = "button";

        botao.addEventListener(
            "click",
            () => {

                filtroTransportadora = opcao.valor;

                renderizarAgenda();
            }
        );

        area.appendChild(botao);
    });
}


// local de entrega/retirada: nome, endereço completo e link (se tiver)
function criarBlocoLocal(nome, endereco, link){

    const bloco = criar("div", "ag-local");

    if(nome){

        bloco.appendChild(
            criar("p", "ag-local-texto", nome)
        );
    }

    if(endereco){

        bloco.appendChild(
            criar("p", "ag-local-endereco", endereco)
        );
    }

    if(link){

        const enderecoLink = criar("a", "ag-link", link);

        // sem http no começo, o navegador trataria como página do próprio sistema
        enderecoLink.href =
            /^https?:\/\//i.test(link)
                ? link
                : "https://" + link;

        enderecoLink.target = "_blank";

        enderecoLink.rel = "noopener";

        bloco.appendChild(enderecoLink);
    }

    return bloco;
}


// o status é uma etiqueta colorida que também troca o status ao clicar
function criarSeletorStatus(item){

    const select = criar("select", "tag tag-select");

    select.dataset.status = item.status;

    select.title = "Trocar status";

    STATUS_AGENDA.forEach(nome => {

        const opcao = criar("option", "", nome);

        opcao.value = nome;

        select.appendChild(opcao);
    });

    select.value = item.status;

    select.addEventListener(
        "change",
        async () => {

            try{

                const atualizado =
                    await atualizarAgendamento(
                        item.id,
                        { status: select.value }
                    );

                Object.assign(item, atualizado);

            }catch(erro){

                console.error("[agenda] Falha ao trocar status:", detalhesErro(erro));

                mostrarToast("Erro ao salvar o status", true);
            }

            // se falhou, a tela volta pro status que está salvo
            renderizarAgenda();
        }
    );

    return select;
}


// colunas visíveis agora. No transportador a coluna da transportadora
// some quando já tem uma transportadora filtrada (ou "sem transportadora").
function colunasAtuais(){

    if(modoVisualizacao === "expedicao"){

        return COLUNAS_EXPEDICAO;
    }

    return COLUNAS_TRANSPORTADOR.filter(coluna =>
        !(
            coluna.id === "transportadora" &&
            filtroTransportadora !== ""
        )
    );
}


// cada informação vai numa célula (coluna) própria; a ordem final
// vem de colunasAtuais(). maxLargura = largura máxima da coluna.
function criarCelula(maxLargura, ...filhos){

    const celula = criar("td", "ag-celula");

    const conteudo = criar("div", "ag-conteudo");

    if(maxLargura) conteudo.style.maxWidth = maxLargura;

    filhos.forEach(filho => {

        if(filho) conteudo.appendChild(filho);
    });

    celula.appendChild(conteudo);

    return celula;
}


function criarCelulasAgenda(item){

    const expedicao =
        modoVisualizacao === "expedicao";

    const colunas = colunasAtuais();

    const larguraDe = (id) =>
        (colunas.find(coluna => coluna.id === id) || {}).maxLargura;

    const celula = (id, ...filhos) =>
        criarCelula(larguraDe(id), ...filhos);

    const celulas = {};

    // ---------- horário ----------

    const textoHorario = item.horario || "—";

    // horário em texto (ex: CONFIRMAR) usa letra menor pra caber
    celulas.horario =
        criar(
            "td",
            "ag-celula ag-hora" + (
                /^\d/.test(textoHorario) || textoHorario === "—"
                    ? ""
                    : " ag-hora-texto"
            ),
            textoHorario
        );

    // ---------- tipo ----------

    const tagTipo = criar("span", "tag", item.tipo);

    tagTipo.dataset.tipo = item.tipo;

    celulas.tipo = celula("tipo", tagTipo);

    // ---------- plataforma / cliente ----------
    // troca técnica mostra as duas máquinas: a que vai e a que volta

    const maquinas =
        (item.tipo === "Troca técnica" && item.plataformaRecolha)
            ? `${item.plataforma} ⇄ ${item.plataformaRecolha}`
            : item.plataforma;

    const titulo =
        [maquinas, item.cliente]
            .filter(Boolean)
            .join(" — ") +
        (item.proposta ? `  (${item.proposta})` : "");

    celulas.titulo =
        celula("titulo", criar("p", "ag-titulo", titulo));

    // ---------- transportadora, motorista, período, status ----------

    celulas.transportadora =
        celula(
            "transportadora",
            item.transportadora
                ? criar("span", "tag", item.transportadora)
                : criar("span", "tag sem-transp", "A definir")
        );

    celulas.motorista =
        celula(
            "motorista",
            item.motorista
                ? criar("span", "", item.motorista)
                : null
        );

    celulas.periodo =
        celula(
            "periodo",
            item.periodo
                ? criar("span", "", item.periodo)
                : null
        );

    celulas.status = celula("status", criarSeletorStatus(item));

    // ---------- observação (cada modo tem a sua) ----------

    const textoObs =
        expedicao
            ? item.obsExpedicao
            : item.obsEntrega;

    celulas.obs =
        celula(
            "obs",
            textoObs
                ? criar("p", "ag-extra", textoObs)
                : null
        );

    // ---------- transportador: local e frete ----------
    // (a expedição não mostra local nem valor)

    if(!expedicao){

        // entrega e troca saem da W Rental e coleta volta pra ela,
        // quando o local fica vazio
        let origemNome = item.origemNome;

        if(
            !origemNome &&
            !item.origemEndereco &&
            (item.tipo === "Entrega" || item.tipo === "Troca técnica")
        ){
            origemNome = LOCAL_PADRAO;
        }

        let destinoNome = item.destinoNome;

        if(
            !destinoNome &&
            !item.destinoEndereco &&
            item.tipo === "Coleta"
        ){
            destinoNome = LOCAL_PADRAO;
        }

        celulas.retirada =
            celula(
                "retirada",
                (origemNome || item.origemEndereco || item.linkOrigem)
                    ? criarBlocoLocal(
                        origemNome,
                        item.origemEndereco,
                        item.linkOrigem
                    )
                    : null
            );

        celulas.entrega =
            celula(
                "entrega",
                (destinoNome || item.destinoEndereco || item.linkDestino)
                    ? criarBlocoLocal(
                        destinoNome,
                        item.destinoEndereco,
                        item.linkDestino
                    )
                    : null
            );

        const frete = brToNumber(item.frete);

        celulas.frete =
            celula(
                "frete",
                (Number.isFinite(frete) && frete > 0)
                    ? criar("p", "ag-extra", `R$ ${formatarMoedaBR(frete)}`)
                    : null
            );
    }

    return colunas.map(coluna => celulas[coluna.id]);
}


// linha de títulos das colunas (aparece uma vez, no topo da lista)
function criarCabecalhoAgenda(){

    const cabecalho = criar("thead");

    const linha = criar("tr");

    colunasAtuais().forEach(coluna => {

        linha.appendChild(criar("th", "", coluna.titulo));
    });

    // espaço da coluna de botões (zap/editar/excluir)
    linha.appendChild(criar("th", "ag-cab-lado"));

    cabecalho.appendChild(linha);

    return cabecalho;
}


function criarItemAgenda(item){

    const linha = criar("tr", "ag-item");

    linha.dataset.tipo = item.tipo;

    linha.dataset.status = item.status;

    // ---------- conteúdo (a parte do print) ----------

    criarCelulasAgenda(item).forEach(celula => {

        linha.appendChild(celula);
    });

    // ---------- controles (fora da área do print) ----------

    const lado = criar("td", "ag-lado");

    const botoes = criar("div", "ag-botoes");

    const botaoZap = criar("button", "btn-zap", "📋");

    botaoZap.type = "button";

    botaoZap.title = "Copiar mensagem para o Zap";

    botaoZap.addEventListener(
        "click",
        () => copiarAgendamentoZap(item)
    );

    botoes.appendChild(botaoZap);

    const botaoEditar = criar("button", "", "✏️");

    botaoEditar.type = "button";

    botaoEditar.title = "Editar";

    botaoEditar.addEventListener(
        "click",
        () => abrirModalAgenda(item.id)
    );

    botoes.appendChild(botaoEditar);

    const botaoExcluir = criar("button", "btn-secundario btn-excluir-ag", "🗑️");

    botaoExcluir.type = "button";

    botaoExcluir.title = "Excluir";

    botaoExcluir.addEventListener(
        "click",
        () => excluirAgendamento(item.id)
    );

    botoes.appendChild(botaoExcluir);

    lado.appendChild(botoes);

    linha.appendChild(lado);

    return linha;
}


function atualizarSelectOrdem(){

    const select = $("ordemAgenda");

    const expedicao =
        modoVisualizacao === "expedicao";

    select.innerHTML = "";

    ORDENS.forEach(ordem => {

        // entregas/coletas primeiro não faz sentido na expedição
        if(ordem.soTransportador && expedicao) return;

        const opcao = criar("option", "", ordem.rotulo);

        opcao.value = ordem.valor;

        select.appendChild(opcao);
    });

    select.value = ordemEfetiva();
}


function definirOrdem(valor){

    ordemAgenda = valor;

    try{

        localStorage.setItem(
            CHAVE_AGENDA_ORDEM,
            ordemAgenda
        );

    }catch(erro){

        console.error("Erro ao salvar ordem:", erro);
    }

    renderizarAgenda();
}


function atualizarControlesModo(){

    const expedicao =
        modoVisualizacao === "expedicao";

    $("btnModoExpedicao").classList.toggle("ativo", expedicao);

    $("btnModoTransportador").classList.toggle("ativo", !expedicao);

    // na expedição só tem entrega, então o filtro de tipo some
    $("filtroTipo").style.display =
        expedicao ? "none" : "";

    atualizarSelectOrdem();

    $("dicaModo").innerText =
        expedicao
            ? "Só entregas e trocas que ainda não saíram, sem endereço e sem valor. Inclui as sem data (preparar)."
            : "Informação completa. Só o que já tem data definida.";
}


function renderizarAgenda(){

    atualizarControlesModo();

    desenharChips();

    const lista = $("listaAgenda");

    lista.innerHTML = "";

    lista.className = "lista-" + modoVisualizacao;

    const filtrados =
        ordenarAgendamentos(filtrarAgendamentos(false));

    $("contagemAgenda").innerText =
        `${filtrados.length} agendamento(s)`;

    if(!filtrados.length){

        lista.appendChild(
            criar(
                "div",
                "agenda-vazia",
                carregandoAgenda
                    ? "Carregando..."
                    : (erroAgenda || "Nenhum agendamento encontrado")
            )
        );

        return;
    }

    const tabela = criar("table", "ag-tabela");

    tabela.appendChild(criarCabecalhoAgenda());

    const corpo = criar("tbody");

    // +1 = coluna dos botões
    const totalColunas = colunasAtuais().length + 1;

    let dataAtual = null;

    filtrados.forEach(item => {

        const corDoItem = corDoDia(item.data);

        if(item.data !== dataAtual){

            dataAtual = item.data;

            const linhaDia = criar("tr", "ag-dia");

            // cor do dia: o cabeçalho, a borda e o fundo dos itens usam ela
            linhaDia.style.setProperty("--cor-dia", corDoItem);

            const cabecalhoDia =
                criar(
                    "th",
                    "",
                    item.data
                        ? tituloDoDia(item.data)
                        : "📌 Sem data definida — iniciar preparativos"
                );

            cabecalhoDia.colSpan = totalColunas;

            linhaDia.appendChild(cabecalhoDia);

            corpo.appendChild(linhaDia);
        }

        const linha = criarItemAgenda(item);

        linha.style.setProperty("--cor-dia", corDoItem);

        corpo.appendChild(linha);
    });

    tabela.appendChild(corpo);

    lista.appendChild(tabela);
}


// ======================================
// COPIAR PARA O ZAP
// ======================================
// Monta a mensagem de agendamento que vai pro grupo da transportadora.
// Dois modelos: frete por nossa conta (termina com CARD) e por conta
// do cliente (termina com os e-mails do financeiro). A troca técnica
// tem o seu texto (máquina que vai + máquina recolhida no mesmo local).

const DIAS_SEMANA = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"
];


// 09/10 - Sexta-feira
function textoDataZap(iso){

    const data = new Date(iso + "T00:00:00");

    const dia =
        String(data.getDate()).padStart(2, "0");

    const mes =
        String(data.getMonth() + 1).padStart(2, "0");

    return `${dia}/${mes} - ${DIAS_SEMANA[data.getDay()]}`;
}


function ehLocalWR(nome){

    const texto =
        String(nome || "").trim().toUpperCase();

    return texto === "WR" || texto === "W RENTAL";
}


// linhas de um local (saída ou entrega). Local da W Rental sai só
// como "WR", sem endereço. usarWRSeVazio = entrega e troca (saída) e
// coleta (entrega) saem da/para a W Rental quando o local fica vazio.
// linkComRotulo = modelo da troca: "Endereço:" e "Link:" em linhas separadas.
function linhasLocalZap(rotulo, nome, endereco, link, usarWRSeVazio, linkComRotulo){

    const nomeFinal =
        String(nome || "").trim();

    const vazio =
        !nomeFinal && !endereco && !link;

    if(ehLocalWR(nomeFinal) || (vazio && usarWRSeVazio)){

        return [`${rotulo}: WR`];
    }

    const linhas = [`${rotulo}: ${nomeFinal}`.trimEnd()];

    if(linkComRotulo){

        if(endereco) linhas.push(`*Endereço:* ${endereco}`);

        if(link) linhas.push(`*Link:* ${link}`);

        return linhas;
    }

    if(endereco){

        linhas.push(`*Endereço:* ${endereco}`);

        if(link) linhas.push(link);

    }else if(link){

        linhas.push(`*Endereço:* ${link}`);
    }

    return linhas;
}


function montarTextoZap(item){

    if(!item.data){

        return { erro: "Informe a data do agendamento" };
    }

    const frete = brToNumber(item.frete);

    if(!Number.isFinite(frete) || frete <= 0){

        return { erro: "Informe o frete do agendamento" };
    }

    const troca =
        item.tipo === "Troca técnica";

    if(troca && !item.plataformaRecolha){

        return { erro: "Informe a máquina de recolha da troca" };
    }

    const porCliente =
        item.freteConta === "cliente";

    const horario =
        String(item.horario || "").trim();

    // horário vazio fica vazio; "IMEDIATO" vira "Horário imediato"
    const linhaHorario =
        horario.toUpperCase() === "IMEDIATO"
            ? "*Horário imediato*"
            : `*Horário:* ${horario}`.trimEnd();

    // por conta do cliente, sem contato, aponta pros contatos lá embaixo
    const contato =
        String(item.contato || "").trim() ||
        (porCliente ? "abaixo ⤵️" : "");

    const linhas = [

        `🚚 AGENDAMENTO DE ${troca ? "TROCA" : String(item.tipo).toUpperCase()}`,

        "",

        `*Data:* ${textoDataZap(item.data)}`,

        linhaHorario,

        `*Equipamento:* ${item.plataforma}`,

        ...linhasLocalZap(
            "*Local de Saída*",
            item.origemNome,
            item.origemEndereco,
            item.linkOrigem,
            item.tipo === "Entrega" || troca,
            troca
        ),

        ...linhasLocalZap(
            "*Local de Entrega*",
            item.destinoNome,
            item.destinoEndereco,
            item.linkDestino,
            item.tipo === "Coleta",
            troca
        )
    ];

    // troca: a máquina que volta é recolhida no mesmo local da entrega
    if(troca){

        linhas.push("");

        linhas.push(
            `🔁 Coleta no mesmo local ${item.plataformaRecolha} e retorna para WR.`
        );
    }

    linhas.push("");

    linhas.push(`Contato de quem vai receber: ${contato}`.trimEnd());

    linhas.push("");

    linhas.push(
        `* FRETE POR ${porCliente ? "CONTA DO CLIENTE" : "NOSSA CONTA"} - R$ ${formatarMoedaBR(frete)}`
    );

    // ficha/referência é digitada à mão
    linhas.push(`* ${item.referencia || ""}`.trimEnd());

    if(porCliente){

        linhas.push("* *Contatos:* ⤵️");

        linhas.push("📍Financeiro:");

        if(item.emails) linhas.push(item.emails);

    }else{

        linhas.push(`* CARD: ${item.card || ""}`.trimEnd());
    }

    return { texto: linhas.join("\n") };
}


function copiarAgendamentoZap(item){

    const resultado = montarTextoZap(item);

    if(resultado.erro){

        return mostrarToast(resultado.erro, true);
    }

    copiar(resultado.texto, "Agendamento copiado");
}


// ======================================
// TRANSPORTADORAS (cadastro)
// ======================================
// A lista não é mais fixa: vem da tabela "transportadoras". Os
// agendamentos e motoristas guardam só o nome da transportadora.

async function carregarTransportadoras(){

    try{

        const { data, error } =
            await supabaseClient
                .from(TABELA_TRANSPORTADORAS)
                .select("id, nome")
                .order("nome");

        if(error) throw error;

        definirTransportadoras(data);

    }catch(erro){

        console.error("[transportadoras] Falha ao carregar:", detalhesErro(erro));

        mostrarToast("Falha ao carregar as transportadoras", true);
    }
}


function definirTransportadoras(lista){

    transportadorasCadastradas =
        lista
            .slice()
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    TRANSPORTADORAS =
        transportadorasCadastradas.map(item => item.nome);
}


// refaz as listas de transportadora dos formulários (mantém a escolha atual)
function atualizarSelectsTransportadora(){

    const atual = $("agTransportadora").value;

    garantirOpcaoTransportadora(atual);

    $("agTransportadora").value = atual;

    const atualMotoristas = $("motTransportadora").value;

    preencherSelect("motTransportadora", TRANSPORTADORAS);

    if(TRANSPORTADORAS.includes(atualMotoristas)){

        $("motTransportadora").value = atualMotoristas;
    }

    desenharTransportadoras();

    desenharMotoristas();
}


function desenharTransportadoras(){

    const lista = $("listaTransportadorasCadastro");

    lista.innerHTML = "";

    if(!transportadorasCadastradas.length){

        lista.appendChild(
            criar("div", "mot-vazio", "Nenhuma transportadora cadastrada")
        );

        return;
    }

    transportadorasCadastradas.forEach(transportadora => {

        const linha = criar("div", "mot-linha");

        linha.appendChild(criar("span", "", transportadora.nome));

        const botao = criar("button", "btn-secundario", "🗑️");

        botao.type = "button";

        botao.title = "Excluir transportadora";

        botao.addEventListener(
            "click",
            () => excluirTransportadora(transportadora.id)
        );

        linha.appendChild(botao);

        lista.appendChild(linha);
    });
}


async function adicionarTransportadora(){

    const nome =
        $("transNome").value
            .trim()
            .replace(/\s+/g, " ");

    if(!nome){

        return mostrarToast("Informe o nome da transportadora", true);
    }

    const jaExiste =
        TRANSPORTADORAS.some(
            existente =>
                existente.toLowerCase() === nome.toLowerCase()
        );

    if(jaExiste){

        return mostrarToast("Essa transportadora já está cadastrada", true);
    }

    const { data, error } =
        await supabaseClient
            .from(TABELA_TRANSPORTADORAS)
            .insert({ nome: nome })
            .select("id, nome")
            .single();

    if(error){

        console.error("[transportadoras] Falha ao adicionar:", detalhesErro(error));

        // 23505 = já existe (alguém cadastrou ao mesmo tempo)
        return mostrarToast(
            error.code === "23505"
                ? "Essa transportadora já está cadastrada"
                : "Erro ao adicionar a transportadora",
            true
        );
    }

    definirTransportadoras([...transportadorasCadastradas, data]);

    $("transNome").value = "";

    atualizarSelectsTransportadora();

    // a nova transportadora vira o filtro/chip da agenda
    renderizarAgenda();

    mostrarToast("Transportadora adicionada");
}


// só exclui se não tiver motorista cadastrado nem agendamento usando
// (a consulta no banco pega também os agendamentos antigos)
async function excluirTransportadora(id){

    const transportadora =
        transportadorasCadastradas.find(item => item.id === id);

    if(!transportadora) return;

    if(motoristasDe(transportadora.nome).length){

        return mostrarToast(
            `Exclua antes os motoristas da ${transportadora.nome}`,
            true
        );
    }

    const { count, error: erroContagem } =
        await supabaseClient
            .from(TABELA_AGENDAMENTOS)
            .select("id", { count: "exact", head: true })
            .eq("transportadora", transportadora.nome);

    if(erroContagem){

        console.error("[transportadoras] Falha ao conferir uso:", detalhesErro(erroContagem));

        return mostrarToast("Erro ao conferir se a transportadora está em uso", true);
    }

    if(count > 0){

        return mostrarToast(
            `${transportadora.nome} está em ${count} agendamento(s) e não pode ser excluída`,
            true
        );
    }

    if(!confirm(`Excluir a transportadora ${transportadora.nome}?`)) return;

    const { data, error } =
        await supabaseClient
            .from(TABELA_TRANSPORTADORAS)
            .delete()
            .eq("id", id)
            .select();

    if(error){

        console.error("[transportadoras] Falha ao excluir:", detalhesErro(error));

        return mostrarToast("Erro ao excluir a transportadora", true);
    }

    definirTransportadoras(
        transportadorasCadastradas.filter(item => item.id !== id)
    );

    // se era o filtro escolhido, volta pra "Todas"
    if(filtroTransportadora === transportadora.nome){

        filtroTransportadora = "";
    }

    atualizarSelectsTransportadora();

    renderizarAgenda();

    mostrarToast(
        data.length
            ? "Transportadora excluída"
            : "Essa transportadora já tinha sido excluída"
    );
}


// ======================================
// MOTORISTAS (cadastro por transportadora)
// ======================================
// Ao escolher a transportadora no agendamento, o campo motorista
// só oferece os motoristas cadastrados nela.

async function carregarMotoristas(){

    try{

        const { data, error } =
            await supabaseClient
                .from(TABELA_MOTORISTAS)
                .select("id, transportadora, nome")
                .order("nome");

        if(error) throw error;

        motoristasCadastrados = data;

    }catch(erro){

        console.error("[motoristas] Falha ao carregar:", detalhesErro(erro));

        mostrarToast("Falha ao carregar os motoristas", true);
    }
}


// nomes dos motoristas de uma transportadora, em ordem alfabética
function motoristasDe(transportadora){

    return motoristasCadastrados
        .filter(item => item.transportadora === transportadora)
        .map(item => item.nome)
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
}


// monta as opções do campo motorista do agendamento
function atualizarOpcoesMotorista(transportadora, motoristaAtual){

    const select = $("agMotorista");

    select.innerHTML = "";

    const vazio =
        criar(
            "option",
            "",
            transportadora ? "Sem motorista" : "Escolha a transportadora"
        );

    vazio.value = "";

    select.appendChild(vazio);

    const nomes = motoristasDe(transportadora);

    nomes.forEach(nome => {

        const opcao = criar("option", "", nome);

        opcao.value = nome;

        select.appendChild(opcao);
    });

    // motorista que não está (mais) no cadastro: mantém, pra não perder o dado
    if(motoristaAtual && !nomes.includes(motoristaAtual)){

        const extra =
            criar("option", "", `${motoristaAtual} (fora do cadastro)`);

        extra.value = motoristaAtual;

        select.appendChild(extra);
    }

    select.disabled =
        !transportadora && !motoristaAtual;

    select.value = motoristaAtual || "";
}


// ---------- modal de cadastro ----------

function abrirModalMotoristas(){

    $("modalMotoristas").classList.add("aberto");

    desenharTransportadoras();

    desenharMotoristas();

    $("transNome").focus();
}


function fecharModalMotoristas(){

    $("modalMotoristas").classList.remove("aberto");
}


function desenharMotoristas(){

    const lista = $("listaMotoristasCadastro");

    lista.innerHTML = "";

    const transportadora =
        $("motTransportadora").value;

    const motoristas =
        motoristasCadastrados
            .filter(item => item.transportadora === transportadora)
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    if(!motoristas.length){

        lista.appendChild(
            criar("div", "mot-vazio", "Nenhum motorista cadastrado")
        );

        return;
    }

    motoristas.forEach(motorista => {

        const linha = criar("div", "mot-linha");

        linha.appendChild(criar("span", "", motorista.nome));

        const botao = criar("button", "btn-secundario", "🗑️");

        botao.type = "button";

        botao.title = "Excluir motorista";

        botao.addEventListener(
            "click",
            () => excluirMotorista(motorista.id)
        );

        linha.appendChild(botao);

        lista.appendChild(linha);
    });
}


async function adicionarMotorista(){

    const transportadora =
        $("motTransportadora").value;

    const nome =
        $("motNome").value
            .trim()
            .replace(/\s+/g, " ");

    if(!transportadora){

        return mostrarToast("Cadastre uma transportadora primeiro", true);
    }

    if(!nome){

        return mostrarToast("Informe o nome do motorista", true);
    }

    const jaExiste =
        motoristasDe(transportadora).some(
            existente =>
                existente.toLowerCase() === nome.toLowerCase()
        );

    if(jaExiste){

        return mostrarToast("Esse motorista já está cadastrado", true);
    }

    const { data, error } =
        await supabaseClient
            .from(TABELA_MOTORISTAS)
            .insert({ transportadora: transportadora, nome: nome })
            .select("id, transportadora, nome")
            .single();

    if(error){

        console.error("[motoristas] Falha ao adicionar:", detalhesErro(error));

        // 23505 = já existe (alguém cadastrou ao mesmo tempo)
        return mostrarToast(
            error.code === "23505"
                ? "Esse motorista já está cadastrado"
                : "Erro ao adicionar o motorista",
            true
        );
    }

    motoristasCadastrados.push(data);

    $("motNome").value = "";

    desenharMotoristas();

    mostrarToast("Motorista adicionado");
}


// os agendamentos que já usam o motorista continuam com o nome
async function excluirMotorista(id){

    const motorista =
        motoristasCadastrados.find(item => item.id === id);

    if(!motorista) return;

    if(!confirm(`Excluir ${motorista.nome} (${motorista.transportadora})?`)) return;

    const { data, error } =
        await supabaseClient
            .from(TABELA_MOTORISTAS)
            .delete()
            .eq("id", id)
            .select();

    if(error){

        console.error("[motoristas] Falha ao excluir:", detalhesErro(error));

        return mostrarToast("Erro ao excluir o motorista", true);
    }

    motoristasCadastrados =
        motoristasCadastrados.filter(item => item.id !== id);

    desenharMotoristas();

    mostrarToast(
        data.length
            ? "Motorista excluído"
            : "Esse motorista já tinha sido excluído"
    );
}


// ======================================
// MODAL (novo / editar)
// ======================================

const CAMPOS_AGENDA = [
    ["data", "agData"],
    ["horario", "agHorario"],
    ["tipo", "agTipo"],
    ["status", "agStatus"],
    ["plataforma", "agPlataforma"],
    ["plataformaRecolha", "agPlataformaRecolha"],
    ["transportadora", "agTransportadora"],
    ["motorista", "agMotorista"],
    ["cliente", "agCliente"],
    ["proposta", "agProposta"],
    ["periodo", "agPeriodo"],
    ["origemNome", "agOrigemNome"],
    ["origemEndereco", "agOrigemEndereco"],
    ["linkOrigem", "agLinkOrigem"],
    ["destinoNome", "agDestinoNome"],
    ["destinoEndereco", "agDestinoEndereco"],
    ["linkDestino", "agLinkDestino"],
    ["frete", "agFrete"],
    ["freteConta", "agFreteConta"],
    ["obsExpedicao", "agObsExpedicao"],
    ["obsEntrega", "agObsEntrega"],
    ["referencia", "agReferencia"],
    ["contato", "agContato"],
    ["card", "agCard"],
    ["emails", "agEmails"]
];


function preencherSelect(id, valores, textoVazio){

    const select = $(id);

    select.innerHTML = "";

    if(textoVazio !== undefined){

        const vazio = criar("option", "", textoVazio);

        vazio.value = "";

        select.appendChild(vazio);
    }

    valores.forEach(valor => {

        const opcao = criar("option", "", valor);

        opcao.value = valor;

        select.appendChild(opcao);
    });
}


// ======================================
// CAMPOS DO FORMULÁRIO (máscaras e regras)
// ======================================

// maiúsculo enquanto digita, sem pular o cursor
function forcarMaiusculo(evento){

    const campo = evento.target;

    const maiusculo = campo.value.toUpperCase();

    if(campo.value === maiusculo) return;

    const inicio = campo.selectionStart;

    const fim = campo.selectionEnd;

    campo.value = maiusculo;

    try{

        campo.setSelectionRange(inicio, fim);

    }catch(erro){

        // alguns tipos de campo não aceitam seleção
    }
}


// Horário: número vira HH:MM sozinho (0800 -> 08:00, 830 -> 08:30).
// Começando com letra vale texto livre (CONFIRMAR / IMEDIATO).
function mascararHorario(texto){

    const bruto = String(texto || "").toUpperCase();

    if(/^\s*[^\d\s]/.test(bruto)){

        return bruto.replace(/[^A-Z]/g, "").slice(0, 9);
    }

    let digitos = bruto.replace(/\D/g, "").slice(0, 4);

    // primeiro dígito maior que 2 (ex: 8) é hora de um dígito: vira 08
    if(digitos.length && Number(digitos[0]) > 2){

        digitos = ("0" + digitos).slice(0, 4);
    }

    if(digitos.length <= 2) return digitos;

    return digitos.slice(0, 2) + ":" + digitos.slice(2);
}


function mascararCampoHorario(evento){

    const campo = evento.target;

    const mascarado = mascararHorario(campo.value);

    if(campo.value !== mascarado) campo.value = mascarado;
}


function horarioValido(valor){

    return (
        valor === "" ||
        valor === "CONFIRMAR" ||
        valor === "IMEDIATO" ||
        /^([01]\d|2[0-3]):[0-5]\d$/.test(valor)
    );
}


// Período: só 3 formatos. "16 dias", "3 períodos" ou "Anual".
// Só o número vale como dias.
function textoDias(numero){

    return numero === 1 ? "1 dia" : `${numero} dias`;
}


function textoPeriodos(numero){

    return numero === 1 ? "1 período" : `${numero} períodos`;
}


// devolve { valor } já no formato certo, ou { erro }
function normalizarPeriodo(texto){

    const valor =
        String(texto || "").trim().replace(/\s+/g, " ");

    if(!valor) return { valor: "" };

    if(/^anual$/i.test(valor)) return { valor: "Anual" };

    let partes =
        valor.match(/^(\d+)(?:\s*(?:d|dias?))?$/i);

    if(partes && Number(partes[1]) >= 1){

        return { valor: textoDias(Number(partes[1])) };
    }

    partes =
        valor.match(/^(\d+)\s*(?:p|per[ií]odos?)$/i);

    if(partes && Number(partes[1]) >= 1){

        return { valor: textoPeriodos(Number(partes[1])) };
    }

    return {
        erro: "Período inválido (use: 16 dias, 3 períodos ou Anual)"
    };
}


// sugestões enquanto digita: começou um número, oferece "N dias",
// "N períodos" e os dias de 1 a 30 que começam com o que foi digitado
function atualizarSugestoesPeriodo(){

    const lista = $("listaPeriodos");

    if(!lista) return;

    const texto =
        $("agPeriodo").value.trim();

    const opcoes = [];

    const partes = texto.match(/^(\d+)/);

    if(partes){

        const digitos = partes[1];

        const numero = Number(digitos);

        if(numero >= 1){

            opcoes.push(textoDias(numero));

            opcoes.push(textoPeriodos(numero));
        }

        for(let dia = 1; dia <= 30; dia++){

            if(String(dia).startsWith(digitos) && dia !== numero){

                opcoes.push(textoDias(dia));
            }
        }

    }else{

        opcoes.push("Anual");

        for(let dia = 1; dia <= 30; dia++){

            opcoes.push(textoDias(dia));
        }
    }

    lista.innerHTML = "";

    opcoes.forEach(opcao => {

        const item = criar("option");

        item.value = opcao;

        lista.appendChild(item);
    });
}


// troca técnica: aparece a máquina de recolha
function atualizarCamposTipo(){

    const troca =
        $("agTipo").value === "Troca técnica";

    $("blocoRecolha").style.display =
        troca ? "" : "none";

    $("rotuloPlataforma").innerText =
        troca ? "Máquina de entrega" : "Plataforma";
}


// mantém no select a transportadora do agendamento mesmo que ela não
// esteja mais no cadastro, pra não perder o dado ao salvar
function garantirOpcaoTransportadora(nome){

    preencherSelect("agTransportadora", TRANSPORTADORAS, "Sem transportadora");

    if(nome && !TRANSPORTADORAS.includes(nome)){

        const extra =
            criar("option", "", `${nome} (fora do cadastro)`);

        extra.value = nome;

        $("agTransportadora").appendChild(extra);
    }
}


// ======================================
// RASCUNHO DO FORMULÁRIO
// ======================================
// O que foi digitado e não foi salvo fica guardado neste navegador
// (um rascunho pro "novo" e um por agendamento em edição). Ao clicar
// fora, apertar Esc ou fechar sem querer, nada se perde: ao abrir de
// novo, o formulário volta de onde parou.

function chaveRascunho(){

    return idEmEdicao ? `edit:${idEmEdicao}` : "novo";
}


function lerRascunhos(){

    try{

        const salvo =
            localStorage.getItem(CHAVE_AGENDA_RASCUNHOS);

        const dados =
            salvo ? JSON.parse(salvo) : {};

        return (dados && typeof dados === "object") ? dados : {};

    }catch(erro){

        console.error("Rascunhos inválidos, ignorando:", erro);

        return {};
    }
}


function gravarRascunhos(dados){

    try{

        localStorage.setItem(
            CHAVE_AGENDA_RASCUNHOS,
            JSON.stringify(dados)
        );

    }catch(erro){

        console.error("Erro ao salvar rascunho:", erro);
    }
}


function removerRascunho(chave){

    const todos = lerRascunhos();

    if(!(chave in todos)) return;

    delete todos[chave];

    gravarRascunhos(todos);
}


function salvarRascunho(){

    const campos = {};

    CAMPOS_AGENDA.forEach(([campo, idCampo]) => {

        campos[campo] = $(idCampo).value;
    });

    const todos = lerRascunhos();

    todos[chaveRascunho()] = { campos: campos, salvoEm: Date.now() };

    gravarRascunhos(todos);
}


// chamado a cada digitação: guarda o rascunho (sem travar a digitação)
function agendarRascunho(){

    if(!$("modalAgenda").classList.contains("aberto")) return;

    formularioAlterado = true;

    clearTimeout(timerRascunho);

    timerRascunho = setTimeout(salvarRascunho, 400);
}


// botões do topo do formulário: novo = descartar rascunho;
// editando = descartar alterações + excluir o agendamento
function atualizarBotoesModal(editando, temRascunho){

    $("btnDescartarAgenda").innerText =
        editando ? "↩ Descartar alterações" : "🗑️ Descartar rascunho";

    $("btnExcluirAgenda").style.display =
        editando ? "" : "none";

    $("avisoRascunho").innerText =
        editando
            ? "📝 Alterações não salvas restauradas"
            : "📝 Rascunho restaurado";

    $("avisoRascunho").style.display =
        temRascunho ? "" : "none";
}


function abrirModalAgenda(id){

    idEmEdicao = id || null;

    const item =
        id
            ? agendamentos.find(ag => ag.id === id)
            : null;

    // pediu um agendamento que não existe mais: não abre
    if(id && !item){

        idEmEdicao = null;

        return;
    }

    // rascunho guardado de uma edição interrompida
    const rascunho =
        lerRascunhos()[chaveRascunho()];

    // de onde vêm os valores: rascunho, senão o agendamento salvo
    const origem =
        rascunho
            ? rascunho.campos
            : item;

    valoresOriginais = {
        horario: item ? (item.horario || "") : "",
        periodo: item ? (item.periodo || "") : ""
    };

    clearTimeout(timerRascunho);

    formularioAlterado = false;

    // transportadora e motorista: só os cadastrados na transportadora
    garantirOpcaoTransportadora(origem ? origem.transportadora : "");

    atualizarOpcoesMotorista(
        origem ? origem.transportadora : "",
        origem ? origem.motorista : ""
    );

    $("tituloModalAgenda").innerText =
        item ? "Editar agendamento" : "Novo agendamento";

    CAMPOS_AGENDA.forEach(([campo, idCampo]) => {

        $(idCampo).value = origem ? (origem[campo] || "") : "";
    });

    if(!origem){

        // data pode ser apagada depois, se ainda não está definida
        $("agData").value = dataISO(0);

        $("agHorario").value = HORARIO_PADRAO;

        $("agTipo").value = TIPOS[0];

        $("agStatus").value = STATUS_AGENDA[0];

        $("agTransportadora").value = "";
    }

    // agendamentos antigos (ou novos) sem valor ficam por nossa conta
    if(!$("agFreteConta").value){

        $("agFreteConta").value = "nossa";
    }

    atualizarCamposConta();

    atualizarCamposTipo();

    atualizarSugestoesPeriodo();

    atualizarBotoesModal(!!item, !!rascunho);

    $("modalAgenda").classList.add("aberto");

    // formulário comprido: sempre abre mostrando o topo
    const caixa = $("modalAgenda").querySelector(".modal-agenda");

    if(caixa) caixa.scrollTop = 0;

    $("agPlataforma").focus();
}


// por nossa conta aparece o Card; por conta do cliente, os e-mails
function atualizarCamposConta(){

    const porCliente =
        $("agFreteConta").value === "cliente";

    $("blocoCard").style.display =
        porCliente ? "none" : "";

    $("blocoEmails").style.display =
        porCliente ? "" : "none";
}


// fecha guardando onde parou (clique fora, Esc e ×)
function fecharModalAgenda(){

    clearTimeout(timerRascunho);

    if(formularioAlterado) salvarRascunho();

    encerrarModalAgenda();
}


// fecha de vez, sem guardar nada (depois de salvar, descartar ou excluir)
function encerrarModalAgenda(){

    clearTimeout(timerRascunho);

    formularioAlterado = false;

    $("modalAgenda").classList.remove("aberto");

    idEmEdicao = null;
}


async function salvarAgendamento(){

    if(salvandoAgendamento) return;

    const dados = {};

    CAMPOS_AGENDA.forEach(([campo, idCampo]) => {

        dados[campo] =
            $(idCampo).value
                .trim()
                .replace(/\s+/g, " ");
    });

    // plataforma e horário sempre em maiúsculas (como na planilha)
    dados.plataforma = dados.plataforma.toUpperCase();

    dados.plataformaRecolha = dados.plataformaRecolha.toUpperCase();

    dados.horario = dados.horario.toUpperCase();

    // data e transportadora são opcionais: máquina pode entrar na
    // agenda antes de ter data e transportador definidos
    if(!dados.plataforma){

        return mostrarToast("Informe a plataforma", true);
    }

    if(!dados.cliente){

        return mostrarToast("Informe o cliente", true);
    }

    if(
        dados.frete &&
        !Number.isFinite(brToNumber(dados.frete))
    ){
        return mostrarToast("Frete inválido", true);
    }

    // troca técnica precisa da máquina de recolha; nos outros tipos não vale
    if(dados.tipo === "Troca técnica"){

        if(!dados.plataformaRecolha){

            return mostrarToast("Informe a máquina de recolha da troca", true);
        }

    }else{

        dados.plataformaRecolha = "";
    }

    // horário: 08:00, CONFIRMAR ou IMEDIATO (valor antigo, sem mexer, passa)
    if(
        !horarioValido(dados.horario) &&
        dados.horario !== valoresOriginais.horario
    ){
        return mostrarToast(
            "Horário inválido (use 08:00, CONFIRMAR ou IMEDIATO)",
            true
        );
    }

    // período: 16 dias, 3 períodos ou Anual (valor antigo, sem mexer, passa)
    const periodo = normalizarPeriodo(dados.periodo);

    if(periodo.erro){

        if(dados.periodo !== valoresOriginais.periodo){

            return mostrarToast(periodo.erro, true);
        }

    }else{

        dados.periodo = periodo.valor;
    }

    const id = idEmEdicao;

    salvandoAgendamento = true;

    try{

        if(id){

            const atualizado =
                await atualizarAgendamento(id, dados);

            const item =
                agendamentos.find(ag => ag.id === id);

            if(item){

                Object.assign(item, atualizado);

            }else{

                agendamentos.push(atualizado);
            }

        }else{

            agendamentos.push(
                await inserirAgendamento(dados)
            );
        }

    }catch(erro){

        console.error("[agenda] Falha ao salvar:", detalhesErro(erro));

        salvandoAgendamento = false;

        // o formulário continua aberto pra não perder o que foi digitado
        return mostrarToast("Erro ao salvar o agendamento", true);
    }

    salvandoAgendamento = false;

    // salvou: o rascunho não serve mais
    removerRascunho(id ? `edit:${id}` : "novo");

    encerrarModalAgenda();

    renderizarAgenda();

    mostrarToast("Agendamento salvo");
}


// devolve true se o agendamento saiu da lista
async function excluirAgendamento(id){

    const item =
        agendamentos.find(ag => ag.id === id);

    if(!item) return false;

    if(!confirm(`Excluir ${item.plataforma} — ${item.cliente}?`)) return false;

    let excluiu = false;

    try{

        excluiu = await excluirAgendamentoBanco(id);

    }catch(erro){

        console.error("[agenda] Falha ao excluir:", detalhesErro(erro));

        mostrarToast("Erro ao excluir o agendamento", true);

        return false;
    }

    agendamentos =
        agendamentos.filter(ag => ag.id !== id);

    // sem agendamento, não sobra rascunho dele
    removerRascunho(`edit:${id}`);

    renderizarAgenda();

    mostrarToast(
        excluiu
            ? "Agendamento excluído"
            : "Esse agendamento já tinha sido excluído"
    );

    return true;
}


// botão do formulário: novo = descartar rascunho;
// editando = descartar as alterações (o agendamento salvo continua)
function descartarRascunho(){

    const editando = !!idEmEdicao;

    const temAlgo =
        formularioAlterado ||
        !!lerRascunhos()[chaveRascunho()];

    // só pergunta se tem algo a perder
    if(
        temAlgo &&
        !confirm(
            editando
                ? "Descartar as alterações não salvas deste agendamento?"
                : "Descartar este rascunho?"
        )
    ){
        return;
    }

    removerRascunho(chaveRascunho());

    encerrarModalAgenda();

    if(temAlgo){

        mostrarToast(
            editando
                ? "Alterações descartadas"
                : "Rascunho descartado"
        );
    }
}


// botão do formulário (só ao editar): exclui o agendamento aberto
async function excluirAgendamentoAberto(){

    const id = idEmEdicao;

    if(!id) return;

    const excluiu = await excluirAgendamento(id);

    if(excluiu) encerrarModalAgenda();
}


document.addEventListener("keydown", (evento) => {

    if(evento.key === "Escape"){

        fecharModalAgenda();

        fecharModalMotoristas();
    }
});


// ======================================
// INIT
// ======================================

(function init(){

    preencherSelect("filtroTipo", TIPOS, "Todos os tipos");

    preencherSelect("filtroStatus", STATUS_AGENDA, "Todos os status");

    preencherSelect("agTipo", TIPOS);

    preencherSelect("agStatus", STATUS_AGENDA);

    preencherSelect("agTransportadora", TRANSPORTADORAS, "Sem transportadora");

    preencherSelect("motTransportadora", TRANSPORTADORAS);

    ["filtroPeriodo", "filtroTipo", "filtroStatus"].forEach(id => {

        $(id).addEventListener(
            "change",
            renderizarAgenda
        );
    });

    // trocou a transportadora: o motorista antigo não vale mais
    $("agTransportadora").addEventListener(
        "change",
        () => atualizarOpcoesMotorista($("agTransportadora").value, "")
    );

    $("motTransportadora").addEventListener(
        "change",
        desenharMotoristas
    );

    $("motNome").addEventListener(
        "keydown",
        (evento) => {

            if(evento.key === "Enter") adicionarMotorista();
        }
    );

    $("agFreteConta").addEventListener(
        "change",
        atualizarCamposConta
    );

    $("agTipo").addEventListener(
        "change",
        atualizarCamposTipo
    );

    // plataformas sempre em maiúsculo enquanto digita
    $("agPlataforma").addEventListener("input", forcarMaiusculo);

    $("agPlataformaRecolha").addEventListener("input", forcarMaiusculo);

    // horário: números viram HH:MM sozinhos
    $("agHorario").addEventListener("input", mascararCampoHorario);

    // período: sugestões enquanto digita e formato certo ao sair do campo
    $("agPeriodo").addEventListener("input", atualizarSugestoesPeriodo);

    $("agPeriodo").addEventListener(
        "change",
        () => {

            const resultado =
                normalizarPeriodo($("agPeriodo").value);

            if(resultado.valor !== undefined){

                $("agPeriodo").value = resultado.valor;
            }
        }
    );

    // rascunho: guarda sozinho o que for digitado no formulário
    $("modalAgenda").addEventListener("input", agendarRascunho);

    $("modalAgenda").addEventListener("change", agendarRascunho);

    $("transNome").addEventListener(
        "keydown",
        (evento) => {

            if(evento.key === "Enter") adicionarTransportadora();
        }
    );

    $("ordemAgenda").addEventListener(
        "change",
        () => definirOrdem($("ordemAgenda").value)
    );

    try{

        if(localStorage.getItem(CHAVE_AGENDA_MODO) === "expedicao"){

            modoVisualizacao = "expedicao";
        }

        const ordemSalva =
            localStorage.getItem(CHAVE_AGENDA_ORDEM);

        if(ORDENS.some(ordem => ordem.valor === ordemSalva)){

            ordemAgenda = ordemSalva;
        }

    }catch(erro){

        console.error("Erro ao ler modo/ordem:", erro);
    }

    // mostra "Carregando..." e busca tudo no Supabase
    renderizarAgenda();

    recarregarAgenda(false);

    // várias pessoas usam: ao voltar pra aba, atualiza se passou um tempo
    document.addEventListener("visibilitychange", () => {

        if(document.visibilityState !== "visible") return;

        if(Date.now() - ultimoCarregamento < INTERVALO_RECARGA_MS) return;

        // com um formulário aberto não recarrega
        if(document.querySelector(".modal-overlay.aberto")) return;

        recarregarAgenda(false);
    });

})();
