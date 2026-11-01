// ======================================
// ESTOQUE - BUSCA POR MODELO
// ======================================
// Barra de pesquisa: mostra só o modelo digitado, num card.
// (Usa compararMaquinas, escaparHtml e STATUS_COM_PREVISAO do estoque-render.js.)

// ======================================
// BUSCA POR MODELO
// ======================================
// Digitou um modelo (ex: WAD26): mostra só ele, num card, com todos
// os patrimônios na ordem dos status. WTE16L é o mesmo que WTE16.

function textoBusca(){

    const campo = $("buscaModelo");

    return campo
        ? campo.value.toUpperCase().replace(/\s+/g, "")
        : "";
}


function modelosDaBusca(dados, busca){

    const base =
        busca.replace(/^([A-Z]+\d+)[A-Z]+$/, "$1");

    const todos = new Set();

    STATUS_ESTOQUE.forEach(status => {

        Object.keys(dados.status?.[status.chave] || {})
            .forEach(modelo => todos.add(modelo));
    });

    const lista = [...todos];

    // modelo exato primeiro; senão os que começam com o que foi digitado
    const exatos = lista.filter(modelo => modelo === base);

    return (
        exatos.length
            ? exatos
            : lista.filter(modelo => modelo.startsWith(base))
    ).sort(ordenarModelos);
}


function htmlCardBusca(modelo, dados){

    const linhas = [];

    const chips = [];

    STATUS_ESTOQUE.forEach(status => {

        const lista =
            (dados.status?.[status.chave]?.[modelo] || [])
                .slice()
                .sort((a, b) => compararMaquinas(a, b, status.chave));

        if(!lista.length) return;

        chips.push(
            `<span class="tag-status ${status.chave}">${status.nome}: ${lista.length}</span>`
        );

        lista.forEach(maquina => {

            linhas.push(`
                <li>
                    <span class="pat">${escaparHtml(maquina.p)}</span>
                    <span class="tag-status ${status.chave}">${status.nome}</span>${
                    maquina.c
                        ? `<span class="cli">${escaparHtml(maquina.c)}</span>`
                        : ""
                }${
                    maquina.r && STATUS_COM_PREVISAO.includes(status.chave)
                        ? `<span class="ret">Retorno: ${escaparHtml(maquina.r)}</span>`
                        : ""
                }
                </li>
            `);
        });
    });

    return `
        <div class="card-status busca">
            <div class="card-status-topo">
                <h3>${escaparHtml(ROTULO_MODELO[modelo] || modelo)}</h3>
                <span class="total">${linhas.length}</span>
            </div>
            <div class="busca-chips">${chips.join("")}</div>
            <ul class="lista-maquinas lista-busca">${linhas.join("")}</ul>
        </div>
    `;
}


function htmlBusca(dados, busca){

    const modelos = modelosDaBusca(dados, busca);

    if(!modelos.length){

        return `
            <div class="card-status busca">
                <p class="vazio-estoque">Nenhum modelo encontrado para "${escaparHtml(busca)}"</p>
            </div>
        `;
    }

    return modelos.map(modelo => htmlCardBusca(modelo, dados)).join("");
}
