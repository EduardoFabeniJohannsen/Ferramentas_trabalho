// ======================================
// AGENDA - COLUNAS
// ======================================
// Colunas por modo e ordem das colunas (arrastar o título).
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// colunas do modo atual, na ordem padrão
function colunasDoModo(){

    return modoVisualizacao === "expedicao"
        ? COLUNAS_EXPEDICAO
        : COLUNAS_TRANSPORTADOR;
}


// aplica a ordem escolhida pelo usuário. Coluna que não está na ordem
// salva (ex: coluna nova) vai pro fim, na ordem padrão.
function ordenarColunas(lista){

    const salva = ordemColunas[modoVisualizacao] || [];

    if(!salva.length) return lista;

    const posicao = (id) => {

        const indice = salva.indexOf(id);

        return indice === -1 ? salva.length : indice;
    };

    return lista
        .map((coluna, padrao) => ({ coluna, padrao }))
        .sort((a, b) =>
            (posicao(a.coluna.id) - posicao(b.coluna.id)) ||
            (a.padrao - b.padrao)
        )
        .map(item => item.coluna);
}


// colunas visíveis agora, na ordem do usuário, sem as que ele desligou
// (agenda-colunas-visiveis.js). No transportador a coluna da transportadora
// some quando já tem uma transportadora filtrada (ou "sem transportadora").
function colunasAtuais(){

    const lista =
        ordenarColunas(colunasDoModo()).filter(colunaLigada);

    if(modoVisualizacao === "expedicao") return lista;

    return lista.filter(coluna =>
        !(
            coluna.id === "transportadora" &&
            filtroTransportadora !== ""
        )
    );
}


// ======================================
// ORDEM DAS COLUNAS (arrastar o título)
// ======================================
// Cada usuário arruma as colunas como quiser; fica salvo neste navegador
// (separado por usuário e por modo). Só os botões ficam sempre à direita.

async function obterUsuarioAgenda(){

    try{

        const { data } =
            await supabaseClient.auth.getSession();

        return data?.session?.user?.id || "";

    }catch(erro){

        return "";
    }
}


function chaveOrdemColunas(){

    return `${CHAVE_AGENDA_COLUNAS}:${usuarioAgenda || "local"}`;
}


function carregarOrdemColunas(){

    const limpa = (lista) =>
        Array.isArray(lista)
            ? lista.filter(id => typeof id === "string")
            : [];

    try{

        const salvo =
            localStorage.getItem(chaveOrdemColunas());

        const dados =
            salvo ? JSON.parse(salvo) : {};

        ordemColunas = {
            expedicao: limpa(dados?.expedicao),
            transportador: limpa(dados?.transportador)
        };

    }catch(erro){

        console.error("Ordem das colunas inválida, ignorando:", erro);

        ordemColunas = { expedicao: [], transportador: [] };
    }
}


function salvarOrdemColunas(){

    try{

        localStorage.setItem(
            chaveOrdemColunas(),
            JSON.stringify(ordemColunas)
        );

    }catch(erro){

        console.error("Erro ao salvar a ordem das colunas:", erro);
    }
}


// move a coluna "origem" pra antes/depois da coluna "destino". Mexe na lista
// completa do modo (inclusive coluna escondida, como a da transportadora
// quando filtrada), pra ela voltar no lugar certo depois.
function moverColuna(idOrigem, idDestino, depois){

    if(idOrigem === idDestino) return;

    const ids =
        ordenarColunas(colunasDoModo()).map(coluna => coluna.id);

    if(!ids.includes(idOrigem) || !ids.includes(idDestino)) return;

    ids.splice(ids.indexOf(idOrigem), 1);

    ids.splice(ids.indexOf(idDestino) + (depois ? 1 : 0), 0, idOrigem);

    ordemColunas[modoVisualizacao] = ids;

    salvarOrdemColunas();

    renderizarAgenda();
}


function ordemColunasPersonalizada(){

    const atual =
        ordenarColunas(colunasDoModo()).map(coluna => coluna.id).join();

    const padrao =
        colunasDoModo().map(coluna => coluna.id).join();

    return atual !== padrao;
}


function restaurarOrdemColunas(){

    ordemColunas[modoVisualizacao] = [];

    salvarOrdemColunas();

    renderizarAgenda();

    mostrarToast("Colunas no padrão");
}


// tira os traços azuis de "solta aqui" de todos os títulos
function limparIndicadoresColunas(){

    document
        .querySelectorAll(".ag-cab-coluna")
        .forEach(titulo => {

            titulo.classList.remove("solta-antes", "solta-depois", "arrastando");
        });
}


// metade esquerda do título = solta antes; direita = solta depois
function soltaDepois(evento, titulo){

    const retangulo = titulo.getBoundingClientRect();

    return evento.clientX > retangulo.left + retangulo.width / 2;
}


function criarTituloColuna(coluna){

    const titulo =
        criar(
            "th",
            `ag-cab-coluna ag-cab-${coluna.id}`,
            coluna.titulo
        );

    titulo.draggable = true;

    titulo.title = "Arraste para mudar a ordem da coluna";

    titulo.addEventListener(
        "dragstart",
        (evento) => {

            colunaArrastada = coluna.id;

            titulo.classList.add("arrastando");

            evento.dataTransfer.effectAllowed = "move";

            // o Firefox só começa a arrastar se tiver algum dado
            evento.dataTransfer.setData("text/plain", coluna.id);
        }
    );

    titulo.addEventListener(
        "dragend",
        () => {

            colunaArrastada = null;

            limparIndicadoresColunas();
        }
    );

    titulo.addEventListener(
        "dragover",
        (evento) => {

            if(!colunaArrastada || colunaArrastada === coluna.id) return;

            // sem isso o navegador não deixa soltar aqui
            evento.preventDefault();

            const depois = soltaDepois(evento, titulo);

            titulo.classList.toggle("solta-antes", !depois);

            titulo.classList.toggle("solta-depois", depois);
        }
    );

    titulo.addEventListener(
        "dragleave",
        () => {

            titulo.classList.remove("solta-antes", "solta-depois");
        }
    );

    titulo.addEventListener(
        "drop",
        (evento) => {

            evento.preventDefault();

            const origem = colunaArrastada;

            const depois = soltaDepois(evento, titulo);

            colunaArrastada = null;

            limparIndicadoresColunas();

            if(origem) moverColuna(origem, coluna.id, depois);
        }
    );

    return titulo;
}
