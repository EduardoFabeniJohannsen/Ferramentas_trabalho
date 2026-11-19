// ======================================
// ANÁLISE DE FRETES - TELA
// ======================================
// Desenha tudo a partir dos agendamentos carregados e dos filtros (o resumo do topo fica em analise-resumo.js): a tabela por transportadora com a parte de cada uma, o gráfico de viagens (com os números em tabela), a comparação por cidade e o frete por modelo.

// ======================================
// TABELAS
// ======================================


// barrinha da parte de cada uma (o número fica do lado: não depende da cor)
function celulaParte(fracao){

    const td = criar("td", "col-parte");

    const trilho = criar("span", "trilho-parte");

    const preenchido = criar("span", "preenchido-parte");

    preenchido.style.width = `${Math.min(100, fracao * 100)}%`;

    trilho.appendChild(preenchido);

    td.append(trilho, criar("span", "numero-parte", porcento(fracao)));

    return td;
}


function desenharTabelaTransportadoras(lista){

    const corpo = $("corpoTransportadorasAnalise");

    const linhas = porTransportadora(lista);

    if(!linhas.length){

        linhaVaziaAnalise(corpo, 9, textoVazioAnalise("Nenhum frete no período"));

        return;
    }

    corpo.replaceChildren(...linhas.map(item => {

        const linha = criar("tr", item.nome === ROTULO_SEM_TRANSPORTADORA ? "sem-transportadora" : "");

        linha.append(
            celula(item.nome, "col-nome"),
            celula(numeroBR(item.fretes)),
            celulaParte(item.parteFretes),
            celula(dinheiro(item.valor)),
            celula(porcento(item.parteValor)),
            celula(dinheiro(item.nossoCusto)),
            celula(dinheiro(item.medio)),
            celula(dinheiro(item.medioPorMaquina)),
            celula(item.semValor ? numeroBR(item.semValor) : "", "col-sem-valor")
        );

        return linha;
    }));
}


function desenharViagensAnalise(lista){

    const { de, ate } = periodoAnalise();

    const dados = textoVazioAnalise("") ? null : barrasDeViagens(lista, de, ate);

    $("tituloViagens").innerText = dados?.porSemana ? "Viagens por semana" : "Viagens por dia";

    desenharGraficoViagens(dados, textoVazioAnalise("Nenhuma viagem no período"));

    const corpo = $("corpoViagensAnalise");

    if(!dados){

        linhaVaziaAnalise(corpo, 4, textoVazioAnalise(""));

        return;
    }

    corpo.replaceChildren(...dados.barras.filter(barra => barra.viagens).map(barra => {

        const linha = criar("tr");

        linha.append(
            celula(tituloDaFaixa(barra, dados.porSemana)),
            celula(numeroBR(barra.viagens)),
            celula(dinheiro(barra.valor)),
            celula(barra.transportadoras.map(item => `${item.nome}: ${item.viagens}`).join(" · "), "col-nome")
        );

        return linha;
    }));

    if(!corpo.children.length) linhaVaziaAnalise(corpo, 4, "Nenhuma viagem no período");
}


function textoAlertaCidade(alerta){

    const comparacao = alerta.porMaquina ? "por máquina" : "por frete";

    return `⚠️ ${alerta.maisUsada} é a mais usada e cobra ${porcento(alerta.diferenca)} a mais ${comparacao} que ${alerta.maisBarata}`;
}


function desenharComparacaoCidades(lista){

    const corpo = $("corpoCidadesAnalise");

    const cidades = comparacaoPorCidade(lista);

    if(!cidades.length){

        linhaVaziaAnalise(
            corpo,
            4,
            textoVazioAnalise("Nenhuma cidade feita por mais de uma transportadora no período (a cidade sai do endereço, com a UF)")
        );

        return;
    }

    const linhas = [];

    cidades.forEach(item => {

        const titulo = criar("tr", "titulo-cidade");

        const nome = celula("", "col-nome");

        nome.colSpan = 4;

        nome.append(criar("strong", "", item.cidade), ` · ${plural(item.fretes, "frete", "fretes")}`);

        if(item.alerta) nome.append(criar("span", "alerta-cidade", textoAlertaCidade(item.alerta)));

        titulo.appendChild(nome);

        linhas.push(titulo);

        item.transportadoras.forEach(transportadora => {

            const linha = criar("tr");

            linha.append(
                celula(transportadora.nome, "col-nome col-recuo"),
                celula(numeroBR(transportadora.fretes)),
                celula(dinheiro(transportadora.medio)),
                celula(dinheiro(transportadora.medioPorMaquina))
            );

            linhas.push(linha);
        });
    });

    corpo.replaceChildren(...linhas);
}


function desenharTabelaModelos(lista){

    const corpo = $("corpoModelosAnalise");

    const modelos = porModelo(lista);

    if(!modelos.length){

        linhaVaziaAnalise(corpo, 3, textoVazioAnalise("Nenhuma máquina nos agendamentos do período"));

        return;
    }

    corpo.replaceChildren(...modelos.map(item => {

        const linha = criar("tr");

        linha.append(
            celula(item.modelo, "col-nome"),
            celula(numeroBR(item.maquinas)),
            celula(dinheiro(item.medioPorMaquina))
        );

        return linha;
    }));
}


// carregando ou com falha, toda tabela diz isso; senão, o texto de vazio dela
function textoVazioAnalise(vazio){

    if(carregandoAnalise) return "Carregando...";

    if(falhaAnalise) return falhaAnalise;

    return vazio;
}


function desenharAnaliseFretes(){

    const filtro = filtroAnalise();

    const lista = carregandoAnalise || falhaAnalise ? [] : fretesDaAnalise(fretesAnalise, filtro);

    $("contagemAnalise").innerText =
        carregandoAnalise || falhaAnalise ? "" : plural(lista.length, "agendamento", "agendamentos");

    desenharResumoFretes(lista);

    desenharTabelaTransportadoras(lista);

    desenharViagensAnalise(lista);

    desenharComparacaoCidades(lista);

    desenharTabelaModelos(lista);
}
