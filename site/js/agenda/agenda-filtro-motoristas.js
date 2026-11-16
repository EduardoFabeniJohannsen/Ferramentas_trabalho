// ======================================
// AGENDA - FILTRO DE MOTORISTA
// ======================================
// Igual aos de status e tipo: no botão "Motoristas" vem a lista com caixinhas
// dos motoristas que aparecem na agenda (e "Sem motorista") e dá para marcar
// os que quiser ver (ex: João + Pedro). Vale nos dois modos.
// Guarda os MARCADOS, não os desmarcados: um motorista que aparece depois não
// entra num filtro já feito ("só o João" continua só o João). Fica salvo por
// usuário e por modo neste navegador (agendaMotoristas), como o status.


function chaveMotoristasFiltro(){

    return `${CHAVE_AGENDA_MOTORISTAS}:${usuarioAgenda || "local"}`;
}


// o motorista do agendamento como entra no filtro ("" = sem motorista)
function nomeMotoristaFiltro(item){

    return String(item.motorista || "").trim();
}


function rotuloMotoristaFiltro(nome){

    return nome || "(Sem motorista)";
}


// põe em motoristasMarcados o que está salvo para o modo atual (ao abrir e ao trocar de modo)
function carregarMotoristasFiltro(){

    const dados = lerLocalJSON(chaveMotoristasFiltro(), {});

    const lista =
        dados && typeof dados === "object" && !Array.isArray(dados)
            ? dados[modoVisualizacao]
            : null;

    // salvo estragado (não é uma lista de nomes): todos os motoristas
    const valida =
        Array.isArray(lista) && lista.every(nome => typeof nome === "string");

    motoristasMarcados =
        valida ? new Set(lista.map(nome => nome.trim())) : null;
}


function salvarMotoristasFiltro(){

    const dados = lerLocalJSON(chaveMotoristasFiltro(), {});

    const salvo =
        dados && typeof dados === "object" && !Array.isArray(dados)
            ? dados
            : {};

    salvo[modoVisualizacao] = motoristasMarcados ? [...motoristasMarcados] : null;

    gravarLocalJSON(chaveMotoristasFiltro(), salvo);
}


function filtrandoMotoristas(){

    return motoristasMarcados !== null;
}


function motoristaAparece(item){

    return !motoristasMarcados || motoristasMarcados.has(nomeMotoristaFiltro(item));
}


// motoristas da lista: os dos agendamentos que aparecem (respeitando os
// outros filtros) e os marcados, para dar para desmarcar. Em ordem
// alfabética, "Sem motorista" no fim.
function motoristasDoFiltro(){

    const nomes = new Set();

    filtrarAgendamentos("motorista").forEach(item => nomes.add(nomeMotoristaFiltro(item)));

    if(motoristasMarcados) motoristasMarcados.forEach(nome => nomes.add(nome));

    const lista =
        [...nomes]
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

    if(nomes.has("")) lista.push("");

    return lista;
}


// quantos agendamentos tem cada motorista (sem aplicar o próprio filtro de motorista)
function contagemPorMotorista(){

    const contagem = {};

    filtrarAgendamentos("motorista").forEach(item => {

        const nome = nomeMotoristaFiltro(item);

        contagem[nome] = (contagem[nome] || 0) + 1;
    });

    return contagem;
}


// "João + Pedro" (até dois o nome cabe; mais que isso, "3 de 7")
function nomesMotoristasMarcados(){

    const lista = motoristasDoFiltro();

    const marcados = lista.filter(nome => motoristasMarcados.has(nome));

    if(!marcados.length) return "nenhum";

    if(marcados.length > 2) return `${marcados.length} de ${lista.length}`;

    return marcados.map(rotuloMotoristaFiltro).join(" + ");
}


// para o aviso da linha da contagem: "motorista João + Pedro"
function textoMotoristasFiltro(){

    const quantos = motoristasMarcados.size;

    if(!quantos) return "nenhum motorista";

    if(quantos > 2) return `${nomesMotoristasMarcados()} motoristas`;

    return `motorista ${nomesMotoristasMarcados()}`;
}


// texto do botão: todos, os nomes ou "N de M"
function atualizarBotaoMotoristas(){

    const botao = $("btnMotoristas");

    const filtrando = filtrandoMotoristas();

    const plural = filtrando && motoristasMarcados.size === 1 ? "Motorista" : "Motoristas";

    botao.innerText =
        filtrando
            ? `👤 ${plural}: ${nomesMotoristasMarcados()} ▾`
            : "👤 Todos os motoristas ▾";

    botao.classList.toggle("filtrando", filtrando);

    // lista aberta: a contagem acompanha os outros filtros (ex: trocou a transportadora)
    if($("painelMotoristas").classList.contains("aberto")) desenharPainelMotoristas();
}


// marcou ou desmarcou um motorista. Se todos da lista ficaram marcados, o
// filtro sai (volta a "Todos os motoristas").
function marcarMotoristaFiltro(nome, marcado){

    const lista = motoristasDoFiltro();

    const marcados = new Set(motoristasMarcados || lista);

    if(marcado){

        marcados.add(nome);

    }else{

        marcados.delete(nome);
    }

    motoristasMarcados =
        lista.every(item => marcados.has(item)) ? null : marcados;

    salvarMotoristasFiltro();

    // redesenha a lista junto (atualizarBotaoMotoristas)
    renderizarAgenda();
}


function desenharPainelMotoristas(){

    const lista = $("listaMotoristasFiltro");

    const rolagem = lista.scrollTop;

    lista.innerHTML = "";

    const nomes = motoristasDoFiltro();

    const contagem = contagemPorMotorista();

    marcarCaixaTodos(
        "marcarTodosMotoristas",
        nomes.filter(nome => !motoristasMarcados || motoristasMarcados.has(nome)).length,
        nomes.length
    );

    // a busca só esconde da lista; não muda o filtro
    const busca = semAcentoMinusculo($("buscaMotoristas").value.trim());

    nomes.forEach(nome => {

        const texto = rotuloMotoristaFiltro(nome);

        if(busca && !semAcentoMinusculo(texto).includes(busca)) return;

        lista.appendChild(
            criarOpcaoFiltro(
                criar("span", nome ? "" : "sem-motorista", texto),
                !motoristasMarcados || motoristasMarcados.has(nome),
                contagem[nome],
                (marcado) => marcarMotoristaFiltro(nome, marcado)
            )
        );
    });

    if(!lista.children.length){

        lista.appendChild(
            criar("p", "lista-vazia", nomes.length ? "Nenhum motorista com esse nome" : "Nenhum motorista na agenda")
        );
    }

    lista.scrollTop = rolagem;
}


function alternarPainelMotoristas(){

    const painel = $("painelMotoristas");

    if(painel.classList.contains("aberto")){

        fecharPainelMotoristas();

        return;
    }

    $("buscaMotoristas").value = "";

    // um painel de cada vez
    fecharListasFiltro();

    desenharPainelMotoristas();

    painel.classList.add("aberto");
}


function fecharPainelMotoristas(){

    $("painelMotoristas").classList.remove("aberto");
}


// "(Selecionar tudo)": todos os motoristas ou nenhum
function alternarTodosMotoristas(){

    motoristasMarcados =
        $("marcarTodosMotoristas").checked ? null : new Set();

    salvarMotoristasFiltro();

    // redesenha a lista junto (atualizarBotaoMotoristas)
    renderizarAgenda();
}
