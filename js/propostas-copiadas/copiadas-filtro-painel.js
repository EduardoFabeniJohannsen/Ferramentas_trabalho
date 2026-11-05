// ======================================
// PROPOSTAS ZAP COPIADAS - PAINEL DO FILTRO DA COLUNA
// ======================================
// O painel que abre embaixo do título da coluna: pesquisa, "(Selecionar tudo)" de cada grupo, as caixinhas com quantas propostas têm cada valor e "Limpar filtro"; no Total, a faixa de valor. Marcar ou desmarcar filtra na hora. Fecha com Esc, no ✖ ou clicando fora. As regras ficam em copiadas-filtro-colunas.js.

// coluna aberta agora (null = painel fechado) e o que foi digitado na pesquisa dele
let colunaFiltroAberta = null;

let buscaFiltroColuna = "";

// com mais opções que isso o painel ganha a pesquisa
const OPCOES_PARA_PESQUISA = 8;


function painelFiltroColuna(){

    let painel = $("painelFiltroColuna");

    if(!painel){

        painel = criar("div", "painel-filtro-coluna");

        painel.id = "painelFiltroColuna";

        // clicar dentro não conta como clicar fora
        painel.addEventListener("click", evento => evento.stopPropagation());

        document.body.appendChild(painel);
    }

    return painel;
}


function alternarPainelFiltroColuna(coluna, th){

    if(colunaFiltroAberta === coluna){

        fecharPainelFiltroColuna();

        return;
    }

    colunaFiltroAberta = coluna;

    buscaFiltroColuna = "";

    const painel = painelFiltroColuna();

    desenharPainelFiltroColuna();

    painel.classList.add("aberto");

    // embaixo do título, sem sair da tela
    const caixa = th.getBoundingClientRect();

    const esquerda =
        Math.max(8, Math.min(caixa.left, document.documentElement.clientWidth - painel.offsetWidth - 8));

    painel.style.left = `${esquerda + window.scrollX}px`;

    painel.style.top = `${caixa.bottom + window.scrollY + 4}px`;

    painel.querySelector("input")?.focus();
}


function fecharPainelFiltroColuna(){

    colunaFiltroAberta = null;

    $("painelFiltroColuna")?.classList.remove("aberto");
}


// depois de marcar/desmarcar: tabela, títulos e o próprio painel (contagens)
function aplicarFiltroColuna(){

    desenharPropostasAdmin();

    desenharPainelFiltroColuna();
}


// pesquisa: só esconde as opções que não combinam (sem redesenhar, o foco fica)
function filtrarOpcoesPainel(){

    const termos = normalizarBuscaAdmin(buscaFiltroColuna).split(/\s+/).filter(Boolean);

    painelFiltroColuna().querySelectorAll(".filtro-coluna-opcao").forEach(opcao => {

        const texto = normalizarBuscaAdmin(opcao.dataset.texto);

        opcao.style.display = termos.every(termo => texto.includes(termo)) ? "" : "none";
    });
}


function caixaFiltroColuna(texto, marcada, aoMudar, classe){

    const rotulo = criar("label", classe);

    const caixa = criar("input");

    caixa.type = "checkbox";

    caixa.checked = marcada;

    caixa.addEventListener("change", () => aoMudar(caixa.checked));

    rotulo.append(caixa, criar("span", "", texto));

    return { rotulo, caixa };
}


function grupoPainelFiltro(grupo, comTitulo){

    const bloco = criar("div", "filtro-coluna-grupo");

    if(comTitulo) bloco.appendChild(criar("p", "filtro-coluna-titulo-grupo", grupo.rotulo));

    const opcoes = opcoesDoGrupo(grupo);

    const ocultos = ocultosColunaPropostas[grupo.id] || new Set();

    const marcadas = opcoes.filter(opcao => !ocultos.has(opcao.valor)).length;

    // "(Selecionar tudo)": marcado, desmarcado ou meio-termo
    const todos =
        caixaFiltroColuna(
            "(Selecionar tudo)",
            opcoes.length > 0 && marcadas === opcoes.length,
            (marcada) => { marcarValorColuna(grupo, null, marcada); aplicarFiltroColuna(); },
            "filtro-coluna-todos"
        );

    todos.caixa.indeterminate = marcadas > 0 && marcadas < opcoes.length;

    bloco.appendChild(todos.rotulo);

    opcoes.forEach(opcao => {

        const { rotulo } =
            caixaFiltroColuna(
                opcao.texto,
                !ocultos.has(opcao.valor),
                (marcada) => { marcarValorColuna(grupo, opcao.valor, marcada); aplicarFiltroColuna(); },
                "filtro-coluna-opcao"
            );

        rotulo.dataset.texto = opcao.texto;

        rotulo.dataset.valor = opcao.valor;

        rotulo.appendChild(criar("span", "filtro-coluna-quantos", `(${opcao.quantos})`));

        bloco.appendChild(rotulo);
    });

    return { bloco, quantas: opcoes.length };
}


// Total: de / até em R$ (só redesenha a tabela, pra não perder o foco)
function faixaPainelFiltro(){

    const bloco = criar("div", "filtro-coluna-faixa");

    [["minimo", "De R$"], ["maximo", "Até R$"]].forEach(([campo, texto]) => {

        const rotulo = criar("label", "", texto);

        const entrada = criar("input");

        entrada.type = "number";

        entrada.min = "0";

        entrada.step = "any";

        entrada.dataset.campo = campo;

        entrada.value = faixaTotalPropostas[campo] ?? "";

        entrada.addEventListener("input", () => {

            const valor = entrada.value.trim();

            faixaTotalPropostas[campo] =
                valor === "" || !Number.isFinite(Number(valor)) ? null : Number(valor);

            desenharPropostasAdmin();

            const limpar = painelFiltroColuna().querySelector(".btn-limpar-filtro-coluna");

            if(limpar) limpar.disabled = !colunaFiltrando("total");
        });

        rotulo.appendChild(entrada);

        bloco.appendChild(rotulo);
    });

    return bloco;
}


function desenharPainelFiltroColuna(){

    const coluna = COLUNAS_FILTRO_PROPOSTAS[colunaFiltroAberta];

    if(!coluna) return;

    const painel = painelFiltroColuna();

    // ao redesenhar (depois de marcar), a lista continua onde estava
    const rolagem = painel.querySelector(".filtro-coluna-lista")?.scrollTop || 0;

    painel.replaceChildren();

    const topo = criar("div", "filtro-coluna-topo");

    const fechar = criar("button", "btn-fechar-filtro-coluna", "✖");

    fechar.type = "button";

    fechar.title = "Fechar";

    fechar.addEventListener("click", fecharPainelFiltroColuna);

    topo.append(criar("strong", "", `Filtrar: ${coluna.titulo}`), fechar);

    painel.appendChild(topo);

    if(coluna.faixa){

        painel.appendChild(faixaPainelFiltro());

    }else{

        const grupos = coluna.grupos.map(grupo => grupoPainelFiltro(grupo, coluna.grupos.length > 1));

        if(grupos.reduce((soma, grupo) => soma + grupo.quantas, 0) > OPCOES_PARA_PESQUISA){

            const busca = criar("input", "filtro-coluna-busca");

            busca.type = "search";

            busca.placeholder = "Pesquisar";

            busca.value = buscaFiltroColuna;

            busca.addEventListener("input", () => { buscaFiltroColuna = busca.value; filtrarOpcoesPainel(); });

            painel.appendChild(busca);
        }

        const lista = criar("div", "filtro-coluna-lista");

        grupos.forEach(grupo => lista.appendChild(grupo.bloco));

        painel.appendChild(lista);

        lista.scrollTop = rolagem;

        filtrarOpcoesPainel();
    }

    const limpar = criar("button", "btn-limpar-filtro-coluna", "Limpar filtro da coluna");

    limpar.type = "button";

    limpar.disabled = !colunaFiltrando(colunaFiltroAberta);

    limpar.addEventListener("click", () => { limparFiltrosColuna(colunaFiltroAberta); aplicarFiltroColuna(); });

    painel.appendChild(limpar);
}
