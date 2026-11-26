// ======================================
// AGENDA - LOCAIS DO CLIENTE
// ======================================
// Os locais que o cliente já usou (entrega e troca = local de entrega; coleta = local de retirada; transferência entre obras = os dois, cada um com o seu contato), um por endereço, o mais recente primeiro: botões com o nome do local e a cidade e a lista do campo de endereço. Na transferência há uma fileira de botões para cada lado (coleta em cima, entrega embaixo). Escolher um local troca endereço, nome, link e o contato daquele lado. Quem escolhe o cliente e preenche sozinho é o agenda-clientes.js. Carregar depois dele e antes de agenda-init.js.

const MAX_LOCAIS_CLIENTE = 15;


// os lados do cliente no agendamento (o lado da W Rental não conta), cada um
// com o contato que foi usado nele. Transferência entre obras: os dois (a
// entrega antes: é onde a máquina foi parar)
function locaisDoItem(item){

    const origem = { nome: item.origemNome, endereco: item.origemEndereco, link: item.linkOrigem };

    const destino = { nome: item.destinoNome, endereco: item.destinoEndereco, link: item.linkDestino };

    const lados =
        item.tipo === "Coleta"
            ? [{ ...origem, contato: item.contato }]
            : (item.tipo === "Entrega" || TIPOS_COM_RECOLHA.includes(item.tipo))
                ? [{ ...destino, contato: item.contato }]
                : item.tipo === TIPO_TRANSFERENCIA_OBRAS
                    ? [{ ...destino, contato: item.contato }, { ...origem, contato: item.contatoOrigem }]
                    : [];

    return lados.filter(lado => String(lado.endereco || "").trim() && !ehLocalWR(lado.nome));
}


// um por endereço, o mais recente primeiro (com o nome, link e contato da
// última vez que foi usado)
function locaisDoCliente(cliente){

    const locais = new Map();

    cliente.itens.forEach(item => {

        locaisDoItem(item).forEach(local => {

            const chave = chaveCliente(local.endereco);

            if(!locais.has(chave)) locais.set(chave, local);
        });
    });

    return [...locais.values()].slice(0, MAX_LOCAIS_CLIENTE);
}


// onde fica o local do cliente no formulário, pelo tipo escolhido: os campos
// e a fileira de botões de cada lado. Transferência entre obras: dois lados
// (coleta, com os botões de cima, e entrega, com os de baixo)
function ladosLocalCliente(){

    const tipo = $("agTipo").value;

    const retirada = { nome: "agOrigemNome", endereco: "agOrigemEndereco", link: "agLinkOrigem" };

    const entrega = { nome: "agDestinoNome", endereco: "agDestinoEndereco", link: "agLinkDestino" };

    const botoesCima = { bloco: "blocoLocaisCliente", titulo: "tituloLocaisCliente", chips: "chipsLocaisCliente" };

    const botoesEntrega = { bloco: "blocoLocaisEntrega", titulo: "tituloLocaisEntrega", chips: "chipsLocaisEntrega" };

    if(tipo === "Coleta") return [{ ...botoesCima, ...retirada, contato: "agContato" }];

    if(tipo === "Entrega" || TIPOS_COM_RECOLHA.includes(tipo)){

        return [{ ...botoesCima, ...entrega, contato: "agContato" }];
    }

    if(tipo === TIPO_TRANSFERENCIA_OBRAS){

        return [
            { ...botoesCima, ...retirada, contato: "agContatoOrigem", escolha: "o de coleta" },
            { ...botoesEntrega, ...entrega, contato: "agContato", escolha: "o de entrega" }
        ];
    }

    return [];
}


// "Obra Centro · Brusque/SC" (o que tiver dos dois; sem nenhum, o endereço)
function rotuloLocal(local){

    return [local.nome, cidadeDoEndereco(local.endereco)].filter(Boolean).join(" · ") ||
        local.endereco;
}


// botões com os locais do cliente, uma fileira por lado (e a lista do campo de
// endereço)
function desenharLocaisCliente(){

    const cliente = clienteDoFormulario();

    const lados = ladosLocalCliente();

    const locais = cliente && lados.length ? locaisDoCliente(cliente) : [];

    ["agOrigemEndereco", "agDestinoEndereco"].forEach(id => $(id).removeAttribute("list"));

    preencherOpcoes(
        "listaLocaisCliente",
        locais.map(local => [local.endereco, rotuloLocal(local)])
    );

    ["blocoLocaisCliente", "blocoLocaisEntrega"].forEach(id => { $(id).style.display = "none"; });

    ["chipsLocaisCliente", "chipsLocaisEntrega"].forEach(id => { $(id).innerHTML = ""; });

    if(!locais.length) return;

    lados.forEach(lado => {

        $(lado.endereco).setAttribute("list", "listaLocaisCliente");

        $(lado.bloco).style.display = "";

        $(lado.titulo).innerText =
            locais.length > 1
                ? `📍 ${cliente.nome} já usou ${locais.length} locais: escolha ${lado.escolha || "um"}`
                : `📍 Local já usado por ${cliente.nome}`;

        locais.forEach(local => {

            const botao = criar("button", "chip chip-local");

            botao.type = "button";

            botao.title = local.endereco;

            botao.dataset.endereco = chaveCliente(local.endereco);

            botao.append(
                criar("strong", "", local.nome || "(sem nome do local)"),
                criar("small", "", cidadeDoEndereco(local.endereco) || local.endereco)
            );

            botao.addEventListener("click", () => usarLocalCliente(local, lado));

            $(lado.chips).appendChild(botao);
        });
    });

    marcarLocalAtivo();
}


// destaca, em cada fileira, o botão do endereço que está no formulário
function marcarLocalAtivo(){

    ladosLocalCliente().forEach(lado => {

        const atual = chaveCliente($(lado.endereco).value);

        $(lado.chips).querySelectorAll(".chip-local").forEach(botao => {

            botao.classList.toggle("ativo", !!atual && botao.dataset.endereco === atual);
        });
    });
}


// escolheu um local para um lado: endereço, nome, link e o contato daquele
// lado passam a ser os dele, mesmo que já tivesse outro
function usarLocalCliente(local, lado){

    if(!lado) return;

    [
        [lado.endereco, local.endereco],
        [lado.nome, local.nome],
        [lado.link, local.link],
        [lado.contato, local.contato]
    ].forEach(([id, valor]) => {

        $(id).value = valor || "";

        preenchidosAuto[id] = $(id).value;
    });

    marcarLocalAtivo();

    atualizarRetirada();

    agendarRascunho();
}


// escolheu um endereço na lista do campo (vale para o lado daquele campo)
function aplicarLocalDaLista(evento){

    const lado = ladosLocalCliente().find(item => item.endereco === evento.target.id);

    const cliente = clienteDoFormulario();

    if(!lado || !cliente) return;

    const local =
        locaisDoCliente(cliente)
            .find(item => chaveCliente(item.endereco) === chaveCliente(evento.target.value));

    if(local) usarLocalCliente(local, lado);
}
