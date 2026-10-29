// ======================================
// AGENDA - LARGURA DAS COLUNAS
// ======================================
// Arrastar a borda do título da coluna muda a largura, como no Excel.
// Duplo clique na borda ajusta a coluna ao conteúdo. A largura fica salva
// neste navegador (separada por usuário e por modo). Sem largura salva a
// tabela segue automática. A ordem das colunas (arrastar o título) fica
// em agenda-colunas.js.

const LARGURA_MINIMA_COLUNA = 40;

// coluna que volta a aparecer sem ter largura salva
const LARGURA_PADRAO_COLUNA = 140;


// ======================================
// LER E SALVAR
// ======================================

function chaveLarguras(){

    return `${CHAVE_AGENDA_LARGURAS}:${usuarioAgenda || "local"}`;
}


// relê do navegador só quando o usuário muda
function lerLarguras(){

    const chave = chaveLarguras();

    if(chave === larguraColunasChave) return;

    larguraColunasChave = chave;

    larguraColunas = { expedicao: {}, transportador: {} };

    try{

        const salvo = localStorage.getItem(chave);

        const dados = salvo ? JSON.parse(salvo) : {};

        ["expedicao", "transportador"].forEach(modo => {

            const lista = dados ? dados[modo] : null;

            if(!lista || typeof lista !== "object") return;

            Object.entries(lista).forEach(([id, valor]) => {

                if(
                    Number.isFinite(valor) &&
                    valor >= LARGURA_MINIMA_COLUNA
                ){
                    larguraColunas[modo][id] = Math.round(valor);
                }
            });
        });

    }catch(erro){

        console.error("Larguras das colunas inválidas, ignorando:", erro);
    }
}


function salvarLarguras(){

    try{

        localStorage.setItem(
            chaveLarguras(),
            JSON.stringify(larguraColunas)
        );

    }catch(erro){

        console.error("Erro ao salvar a largura das colunas:", erro);
    }
}


function temLarguraPersonalizada(){

    lerLarguras();

    return Object.keys(larguraColunas[modoVisualizacao]).length > 0;
}


// botão ↺ Colunas padrão: ordem e largura voltam ao padrão
function restaurarColunasPadrao(){

    lerLarguras();

    larguraColunas[modoVisualizacao] = {};

    salvarLarguras();

    restaurarOrdemColunas();
}


// ======================================
// APLICAR NA TABELA
// ======================================

// ids na ordem do que aparece: colunas, proposta e botões
function idsDaTabela(){

    return [...colunasAtuais().map(coluna => coluna.id), "proposta", "lado"];
}


function titulosDaTabela(tabela){

    return Array.from(tabela.querySelectorAll("thead tr th"));
}


// Com alguma largura salva a tabela vira "fixa" (colgroup com a largura de
// cada coluna). Pode ser chamada de novo durante o arrasto.
function aplicarLarguras(tabela){

    lerLarguras();

    const larguras = larguraColunas[modoVisualizacao];

    const antigo = tabela.querySelector("colgroup");

    if(antigo) antigo.remove();

    if(Object.keys(larguras).length){

        const grupo = criar("colgroup");

        let total = 0;

        idsDaTabela().forEach(id => {

            const largura = larguras[id] || LARGURA_PADRAO_COLUNA;

            const coluna = criar("col");

            coluna.style.width = largura + "px";

            grupo.appendChild(coluna);

            total += largura;
        });

        tabela.insertBefore(grupo, tabela.firstChild);

        tabela.style.width = total + "px";

        tabela.classList.add("largura-fixa");

    }else{

        tabela.style.width = "";

        tabela.classList.remove("largura-fixa");
    }

    // as alças entram uma vez só em cada tabela desenhada
    if(!tabela.querySelector(".ag-redimensiona")){

        colunasAtuais().forEach((coluna, indice) => {

            const titulo = titulosDaTabela(tabela)[indice];

            if(titulo) titulo.appendChild(criarAlcaLargura(tabela, coluna.id, indice));
        });
    }
}


// primeira vez que mexe: guarda a largura de TODAS as colunas como estão
// na tela agora, pra só a que for arrastada mudar
function congelarLarguras(tabela){

    const larguras = larguraColunas[modoVisualizacao];

    const titulos = titulosDaTabela(tabela);

    idsDaTabela().forEach((id, indice) => {

        if(larguras[id] || !titulos[indice]) return;

        larguras[id] = Math.max(
            LARGURA_MINIMA_COLUNA,
            Math.round(titulos[indice].getBoundingClientRect().width)
        );
    });
}


// duplo clique: a coluna volta a caber o conteúdo (tamanho automático)
function ajustarLarguraAoConteudo(tabela, id, indice){

    const antes = { ...larguraColunas[modoVisualizacao] };

    // mede como a tabela ficaria sem larguras fixas
    const grupo = tabela.querySelector("colgroup");

    if(grupo) grupo.remove();

    tabela.style.width = "";

    tabela.classList.remove("largura-fixa");

    const titulos = titulosDaTabela(tabela);

    const novas = {};

    idsDaTabela().forEach((outro, posicao) => {

        const medida =
            titulos[posicao]
                ? Math.round(titulos[posicao].getBoundingClientRect().width)
                : LARGURA_PADRAO_COLUNA;

        novas[outro] =
            (outro === id || !antes[outro])
                ? Math.max(LARGURA_MINIMA_COLUNA, medida)
                : antes[outro];
    });

    larguraColunas[modoVisualizacao] = novas;

    salvarLarguras();

    aplicarLarguras(tabela);

    atualizarBotaoColunasPadrao();
}


// só aparece quando a ordem ou a largura saiu do padrão
function atualizarBotaoColunasPadrao(){

    $("btnColunasPadrao").style.display =
        (ordemColunasPersonalizada() || temLarguraPersonalizada())
            ? ""
            : "none";
}


// ======================================
// ALÇA DE ARRASTAR (borda direita do título)
// ======================================

function criarAlcaLargura(tabela, id, indice){

    const alca = criar("div", "ag-redimensiona");

    alca.title = "Arraste para mudar a largura (duplo clique ajusta ao conteúdo)";

    alca.draggable = false;

    let inicioX = 0;

    let larguraInicial = 0;

    let arrastando = false;

    let titulo = null;

    // a alça fica dentro do título, que é arrastável (muda a ordem):
    // sem isso o navegador começaria a arrastar o título
    alca.addEventListener("dragstart", evento => evento.preventDefault());

    alca.addEventListener("click", evento => evento.stopPropagation());

    // sem isso o clique na alça selecionaria texto ou começaria a arrastar
    alca.addEventListener(
        "mousedown",
        evento => {

            evento.preventDefault();

            evento.stopPropagation();
        }
    );

    alca.addEventListener(
        "dblclick",
        evento => {

            evento.stopPropagation();

            ajustarLarguraAoConteudo(tabela, id, indice);
        }
    );

    alca.addEventListener(
        "pointerdown",
        evento => {

            evento.stopPropagation();

            arrastando = true;

            alca.setPointerCapture(evento.pointerId);

            alca.classList.add("ativo");

            titulo = alca.parentElement;

            if(titulo) titulo.draggable = false;

            congelarLarguras(tabela);

            aplicarLarguras(tabela);

            inicioX = evento.clientX;

            larguraInicial = larguraColunas[modoVisualizacao][id];
        }
    );

    alca.addEventListener(
        "pointermove",
        evento => {

            if(!arrastando) return;

            larguraColunas[modoVisualizacao][id] =
                Math.max(
                    LARGURA_MINIMA_COLUNA,
                    Math.round(larguraInicial + evento.clientX - inicioX)
                );

            aplicarLarguras(tabela);
        }
    );

    const terminar = () => {

        if(!arrastando) return;

        arrastando = false;

        alca.classList.remove("ativo");

        if(titulo) titulo.draggable = true;

        salvarLarguras();

        atualizarBotaoColunasPadrao();
    };

    alca.addEventListener("pointerup", terminar);

    alca.addEventListener("pointercancel", terminar);

    return alca;
}
