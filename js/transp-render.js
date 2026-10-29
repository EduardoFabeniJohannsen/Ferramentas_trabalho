// ======================================
// TRANSPORTADORAS - DESENHO DA LISTA
// ======================================
// Seleção da transportadora, abas, cartões de veículos e motoristas e recarga.

function criarElemento(tag, classe, texto){

    const elemento =
        document.createElement(tag);

    if(classe) elemento.className = classe;

    if(texto !== undefined && texto !== null){

        elemento.textContent = texto;
    }

    return elemento;
}


function criarBotao(texto, titulo, classe, aoClicar){

    const botao = criarElemento("button", classe, texto);

    botao.type = "button";

    if(titulo) botao.title = titulo;

    botao.addEventListener("click", aoClicar);

    return botao;
}


// 2.6 -> "2,6" / 30000 -> "30.000"
function numeroBR(valor){

    if(valor === null || valor === undefined || valor === "") return "";

    return Number(valor).toLocaleString(
        "pt-BR",
        { maximumFractionDigits: 2 }
    );
}


// 2000-05-31 -> 31/05/2000 (sem passar por Date, pra não mudar o dia por fuso)
function dataBR(iso){

    if(!iso) return "";

    const [ano, mes, dia] = String(iso).slice(0, 10).split("-");

    return `${dia}/${mes}/${ano}`;
}


function placasDoVeiculo(veiculo){

    return veiculo.placa2
        ? `${veiculo.placa} + ${veiculo.placa2}`
        : veiculo.placa;
}


// em "Todas": de qual transportadora é o item
function adicionarNomeTransp(titulo, item){

    if(!emTodasTransp()) return;

    titulo.appendChild(
        criarElemento("span", "tag-transp empresa", item.transportadora)
    );
}


function desenharSelectTransportadora(){

    const select = $("selectTransportadora");

    select.innerHTML = "";

    if(!transpLista.length){

        const vazio =
            criarElemento("option", "", "Nenhuma transportadora cadastrada");

        vazio.value = "";

        select.appendChild(vazio);

        return;
    }

    const todas = criarElemento("option", "", "Todas as transportadoras");

    todas.value = TRANSP_TODAS;

    select.appendChild(todas);

    transpLista.forEach(nome => {

        const opcao = criarElemento("option", "", nome);

        opcao.value = nome;

        select.appendChild(opcao);
    });

    select.value = transpAtual;
}


function definirAbaTransp(aba){

    abaTransp =
        aba === "motoristas"
            ? "motoristas"
            : "veiculos";

    desenharListaTransp();
}


function abrirNovoItemTransp(){

    if(!transpAtual || emTodasTransp() || transpSoLeitura) return;

    if(abaTransp === "veiculos"){

        abrirModalVeiculo(null);

    }else{

        abrirModalMotorista(null);
    }
}


function desenharListaTransp(){

    const emVeiculos = abaTransp === "veiculos";

    $("abaVeiculos").classList.toggle("ativo", emVeiculos);

    $("abaMotoristas").classList.toggle("ativo", !emVeiculos);

    $("btnNovoItem").innerText =
        emVeiculos ? "+ Novo veículo" : "+ Novo motorista";

    // cadastrar e excluir pedem uma transportadora (não vale em "Todas")
    const semUma = !transpAtual || emTodasTransp();

    $("btnNovoItem").disabled = semUma;

    $("btnNovoItem").title =
        emTodasTransp() ? "Escolha uma transportadora para cadastrar" : "";

    $("btnExcluirTransportadora").disabled = semUma;

    const lista = $("listaTransp");

    lista.innerHTML = "";

    const itens =
        emVeiculos ? veiculosTransp : motoristasTransp;

    $("contagemTransp").innerText =
        (transpAtual && !carregandoTransp)
            ? `${itens.length} ${emVeiculos ? "veículo(s)" : "motorista(s)"}`
            : "";

    if(!itens.length){

        lista.appendChild(
            criarElemento(
                "div",
                "vazio-transp",
                carregandoTransp
                    ? "Carregando..."
                    : (
                        erroTransp ||
                        (
                            transpAtual
                                ? `Nenhum ${emVeiculos ? "veículo" : "motorista"} cadastrado`
                                : (
                                    transpSoLeitura
                                        ? "Nenhuma transportadora cadastrada"
                                        : "Cadastre uma transportadora em \"+ Nova transportadora\""
                                )
                        )
                    )
            )
        );

        return;
    }

    itens.forEach(item => {

        lista.appendChild(
            emVeiculos
                ? criarItemVeiculo(item)
                : criarItemMotorista(item)
        );
    });
}


function textoQuantidadeDocs(dono){

    const quantidade = docsDoDono(dono).length;

    return quantidade
        ? `📎 ${quantidade} documento(s)`
        : "📎 Sem documentos";
}


function criarItemVeiculo(veiculo){

    const item = criarElemento("div", "item-transp");

    const info = criarElemento("div", "item-transp-info");

    const titulo =
        criarElemento("div", "item-transp-titulo", placasDoVeiculo(veiculo));

    titulo.appendChild(
        criarElemento(
            "span",
            "tag-transp" + (veiculo.tipo === "Carreta" ? " carreta" : ""),
            veiculo.tipo
        )
    );

    adicionarNomeTransp(titulo, veiculo);

    info.appendChild(titulo);

    const medidas =
        MEDIDAS_VEICULO
            .filter(medida =>
                veiculo[medida.campo] !== null &&
                veiculo[medida.campo] !== undefined
            )
            .map(medida =>
                `${medida.rotulo}: ${numeroBR(veiculo[medida.campo])}`
            );

    info.appendChild(
        criarElemento(
            "div",
            "item-transp-detalhe",
            medidas.length
                ? medidas.join(" · ")
                : "Sem medidas cadastradas"
        )
    );

    info.appendChild(
        criarElemento(
            "div",
            "item-transp-docs",
            textoQuantidadeDocs({ tipo: "veiculo", id: veiculo.id })
        )
    );

    item.appendChild(info);

    item.appendChild(
        criarAcoesItemTransp(
            () => abrirModalVeiculo(veiculo.id),
            () => excluirVeiculoTransp(veiculo.id)
        )
    );

    return item;
}


// admin: editar e excluir; quem só vê: abrir (dados e PDFs)
function criarAcoesItemTransp(abrir, excluir){

    const acoes = criarElemento("div", "item-transp-acoes");

    if(transpSoLeitura){

        acoes.appendChild(criarBotao("👁", "Ver dados e documentos", "", abrir));

        return acoes;
    }

    acoes.appendChild(criarBotao("✏️", "Editar", "", abrir));

    acoes.appendChild(criarBotao("🗑️", "Excluir", "btn-secundario", excluir));

    return acoes;
}


function criarItemMotorista(motorista){

    const item = criarElemento("div", "item-transp");

    const info = criarElemento("div", "item-transp-info");

    const titulo =
        criarElemento("div", "item-transp-titulo", motorista.nome);

    adicionarNomeTransp(titulo, motorista);

    info.appendChild(titulo);

    const partes = [];

    if(motorista.cpf) partes.push(`CPF: ${motorista.cpf}`);

    if(motorista.data_nascimento){

        partes.push(`Nascimento: ${dataBR(motorista.data_nascimento)}`);
    }

    if(motorista.cnh) partes.push(`CNH: ${motorista.cnh}`);

    info.appendChild(
        criarElemento(
            "div",
            "item-transp-detalhe",
            partes.length
                ? partes.join(" · ")
                : "Sem dados cadastrados"
        )
    );

    info.appendChild(
        criarElemento(
            "div",
            "item-transp-docs",
            textoQuantidadeDocs({ tipo: "motorista", id: motorista.id })
        )
    );

    item.appendChild(info);

    item.appendChild(
        criarAcoesItemTransp(
            () => abrirModalMotorista(motorista.id),
            () => excluirMotoristaTransp(motorista.id)
        )
    );

    return item;
}


// busca de novo os dados da transportadora escolhida e redesenha
async function recarregarTransp(){

    const token = ++cargaTransp;

    carregandoTransp = true;

    erroTransp = "";

    veiculosTransp = [];

    motoristasTransp = [];

    docsTransp = [];

    desenharListaTransp();

    let dados = null;

    try{

        dados = await carregarDadosTransportadora(transpAtual);

    }catch(erro){

        console.error("[transportadoras] Falha ao carregar:", detalhesErroTransp(erro));

        if(token === cargaTransp){

            erroTransp = "Não foi possível carregar (verifique conexão/login)";

            mostrarToast("Falha ao carregar os dados", true);
        }
    }

    // trocou de transportadora enquanto carregava: descarta esta resposta
    if(token !== cargaTransp) return;

    carregandoTransp = false;

    if(dados){

        veiculosTransp = dados.veiculos;

        motoristasTransp = dados.motoristas;

        docsTransp = dados.docs;
    }

    desenharListaTransp();
}
