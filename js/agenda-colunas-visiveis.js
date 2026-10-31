// ======================================
// AGENDA - MOSTRAR E OCULTAR COLUNAS
// ======================================
// Botão 👁️ Colunas (só na expedição): lista com caixinhas de todas as
// informações do modo. Fica salvo neste navegador, separado por usuário e
// por modo. Guarda só o que difere do padrão de COLUNAS_* (campo "oculta").

function colunaLigada(coluna){

    const escolha = colunasVisiveis[modoVisualizacao][coluna.id];

    return escolha === undefined ? !coluna.oculta : escolha;
}


function chaveColunasVisiveis(){

    return `${CHAVE_AGENDA_COLUNAS_VISIVEIS}:${usuarioAgenda || "local"}`;
}


function carregarColunasVisiveis(){

    colunasVisiveis = { expedicao: {}, transportador: {} };

    try{

        const salvo =
            localStorage.getItem(chaveColunasVisiveis());

        const dados =
            salvo ? JSON.parse(salvo) : {};

        ["expedicao", "transportador"].forEach(modo => {

            const lista = dados ? dados[modo] : null;

            if(!lista || typeof lista !== "object") return;

            Object.entries(lista).forEach(([id, valor]) => {

                if(typeof valor === "boolean") colunasVisiveis[modo][id] = valor;
            });
        });

    }catch(erro){

        console.error("Colunas visíveis inválidas, ignorando:", erro);
    }
}


function salvarColunasVisiveis(){

    try{

        localStorage.setItem(
            chaveColunasVisiveis(),
            JSON.stringify(colunasVisiveis)
        );

    }catch(erro){

        console.error("Erro ao salvar as colunas visíveis:", erro);
    }
}


function temColunasVisiveisPersonalizadas(){

    return Object.keys(colunasVisiveis[modoVisualizacao]).length > 0;
}


// usado pelo botão ↺ Colunas padrão (quem redesenha é ele)
function restaurarColunasVisiveis(){

    colunasVisiveis[modoVisualizacao] = {};

    salvarColunasVisiveis();
}


function ligarColuna(coluna, ligada){

    if(ligada === !coluna.oculta){

        delete colunasVisiveis[modoVisualizacao][coluna.id];

    }else{

        colunasVisiveis[modoVisualizacao][coluna.id] = ligada;
    }

    salvarColunasVisiveis();

    renderizarAgenda();

    desenharPainelColunas();
}


// texto do botão: quantas colunas aparecem, das que existem no modo
function atualizarBotaoColunas(){

    const todas = colunasDoModo();

    const ligadas = todas.filter(colunaLigada);

    $("filtroColunas").style.display =
        modoVisualizacao === "expedicao" ? "" : "none";

    $("btnColunas").innerText =
        `👁️ Colunas: ${ligadas.length} de ${todas.length} ▾`;
}


function desenharPainelColunas(){

    const lista = $("listaColunasVisiveis");

    lista.innerHTML = "";

    const ligadas = colunasDoModo().filter(colunaLigada);

    // na ordem da tabela, pra bater o olho e achar
    ordenarColunas(colunasDoModo()).forEach(coluna => {

        const rotulo = criar("label", "data-opcao");

        const caixa = criar("input");

        caixa.type = "checkbox";

        caixa.checked = colunaLigada(coluna);

        // a tabela precisa de pelo menos uma coluna
        caixa.disabled = caixa.checked && ligadas.length === 1;

        caixa.addEventListener(
            "change",
            () => ligarColuna(coluna, caixa.checked)
        );

        rotulo.appendChild(caixa);

        rotulo.appendChild(criar("span", "", coluna.titulo));

        lista.appendChild(rotulo);
    });
}


function alternarPainelColunas(){

    const painel = $("painelColunas");

    if(painel.classList.contains("aberto")){

        fecharPainelColunas();

        return;
    }

    desenharPainelColunas();

    encaixarPainelNaTela(painel);
}


// abre o painel. O botão pode estar no fim da barra: puxa o painel pra caber
// na tela (também usado pelo painel de agenda-botoes-linha.js)
function encaixarPainelNaTela(painel){

    painel.style.left = "";

    painel.classList.add("aberto");

    const sobra =
        document.documentElement.clientWidth -
        painel.getBoundingClientRect().right - 8;

    if(sobra < 0) painel.style.left = sobra + "px";
}


function fecharPainelColunas(){

    $("painelColunas").classList.remove("aberto");
}
