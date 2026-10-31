// ======================================
// AGENDA - BOTÕES DA LINHA
// ======================================
// Botão 🔘 Botões da barra: cada usuário escolhe quais botões aparecem em
// cada agendamento. Vale nos dois modos e fica salvo neste navegador,
// separado por usuário. Os botões em si são montados em criarItemAgenda.

function botaoLigado(id){

    return !botoesOcultos.includes(id);
}


function chaveBotoesLinha(){

    return `${CHAVE_AGENDA_BOTOES}:${usuarioAgenda || "local"}`;
}


function carregarBotoesLinha(){

    botoesOcultos = [];

    try{

        const salvo =
            localStorage.getItem(chaveBotoesLinha());

        const dados =
            salvo ? JSON.parse(salvo) : [];

        if(Array.isArray(dados)){

            botoesOcultos =
                BOTOES_LINHA
                    .map(botao => botao.id)
                    .filter(id => dados.includes(id));
        }

    }catch(erro){

        console.error("Botões da linha inválidos, ignorando:", erro);
    }
}


function salvarBotoesLinha(){

    try{

        localStorage.setItem(
            chaveBotoesLinha(),
            JSON.stringify(botoesOcultos)
        );

    }catch(erro){

        console.error("Erro ao salvar os botões da linha:", erro);
    }
}


function ligarBotaoLinha(id, ligado){

    botoesOcultos = botoesOcultos.filter(oculto => oculto !== id);

    if(!ligado) botoesOcultos.push(id);

    salvarBotoesLinha();

    renderizarAgenda();

    desenharPainelBotoes();
}


// A coluna dos botões não tem alça: com larguras fixas, a largura dela sai
// do que está na linha agora, pra caber quando o usuário liga mais botões.
function larguraColunaBotoes(tabela){

    const celula = tabela.querySelector("td.ag-lado");

    const botoes = celula ? celula.querySelectorAll(".ag-botoes button") : [];

    if(!botoes.length) return LARGURA_PADRAO_COLUNA;

    const estilo = getComputedStyle(celula);

    const sobra =
        ["paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"]
            .reduce((soma, medida) => soma + parseFloat(estilo[medida]), 0);

    const inicio = botoes[0].getBoundingClientRect().left;

    const fim = botoes[botoes.length - 1].getBoundingClientRect().right;

    return Math.ceil(fim - inicio + sobra);
}


function atualizarBotaoBotoesLinha(){

    const ligados = BOTOES_LINHA.filter(botao => botaoLigado(botao.id));

    $("btnBotoes").innerText =
        `🔘 Botões: ${ligados.length} de ${BOTOES_LINHA.length} ▾`;
}


function desenharPainelBotoes(){

    const lista = $("listaBotoesLinha");

    lista.innerHTML = "";

    const ligados = BOTOES_LINHA.filter(botao => botaoLigado(botao.id));

    BOTOES_LINHA.forEach(botao => {

        const rotulo = criar("label", "data-opcao");

        const caixa = criar("input");

        caixa.type = "checkbox";

        caixa.checked = botaoLigado(botao.id);

        // a linha precisa de pelo menos um botão
        caixa.disabled = caixa.checked && ligados.length === 1;

        caixa.addEventListener(
            "change",
            () => ligarBotaoLinha(botao.id, caixa.checked)
        );

        rotulo.appendChild(caixa);

        rotulo.appendChild(criar("span", "", botao.rotulo));

        lista.appendChild(rotulo);
    });
}


function alternarPainelBotoes(){

    const painel = $("painelBotoes");

    if(painel.classList.contains("aberto")){

        fecharPainelBotoes();

        return;
    }

    desenharPainelBotoes();

    encaixarPainelNaTela(painel);
}


function fecharPainelBotoes(){

    $("painelBotoes").classList.remove("aberto");
}
