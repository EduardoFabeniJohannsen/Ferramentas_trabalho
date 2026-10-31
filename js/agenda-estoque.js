// ======================================
// AGENDA - CONSULTA AO ESTOQUE (botão 🔍 da linha)
// ======================================
// Mostra os patrimônios disponíveis e em manutenção no último estoque publicado
// (patrimônio, marca, modelo e situação), começando pelos do mesmo modelo do
// agendamento. Só consulta, não muda nada. Lê pela função estoque_disponiveis do
// banco, que libera só esses dois status, sem cliente, para quem tem acesso à
// agenda. Destaca a máquina que já está em alguma demanda (o estoque não sabe disso).
// Carregar depois de agenda-zap.js e agenda-lixeira.js.

// cada filial é uma linha da tabela resumo_estoque (ver FILIAIS em estoque-config.js)
const NOMES_FILIAIS_ESTOQUE = { 1: "Itajaí", 2: "Joinville" };

// tipos em que a máquina sai do pátio (coleta é a máquina voltando)
const TIPOS_RESERVAM_MAQUINA = ["Entrega", "Troca técnica", "Transferência"];

// o que está aberto na janela
let estoqueItemAberto = null;

let estoqueFiliais = [];

let estoqueVerTodos = false;


async function carregarEstoqueDisponivel(){

    const { data, error } =
        await supabaseClient.rpc("estoque_disponiveis");

    if(error) throw error;

    return (data || [])
        .slice()
        .sort((a, b) => a.filial_id - b.filial_id);
}


// modelos do agendamento ("2x WAD16 + WTE12046" -> ["WAD16", "WTE12"])
function modelosDoAgendamento(item){

    return [
        ...new Set(
            separarPlataformas(item.plataforma)
                .map(parte => modeloDaPlataforma(parte.patrimonio))
        )
    ];
}


// esse agendamento tira uma máquina do pátio?
function agendamentoReservaMaquina(item){

    return (
        TIPOS_RESERVAM_MAQUINA.includes(item.tipo) &&
        item.status !== "Concluído" &&
        item.status !== "Cancelado"
    );
}


// { "WAE18R001": agendamento } com o próximo agendamento de cada máquina.
// Maiúsculo porque na agenda o O depois dos números fica minúsculo.
// idIgnorado = não conta esse agendamento (o que está sendo salvo).
function reservasDaAgenda(idIgnorado){

    const hoje = dataISO(0);

    const reservas = {};

    agendamentos.forEach(item => {

        if(item.antigo || item.id === idIgnorado) return;

        if(!agendamentoReservaMaquina(item)) return;

        if(item.data && item.data < hoje) return;

        separarPlataformas(item.plataforma).forEach(parte => {

            const patrimonio = parte.patrimonio.toUpperCase();

            const atual = reservas[patrimonio];

            // sem data fica por último: as com data saem antes
            if(!atual || (item.data && (!atual.data || item.data < atual.data))){

                reservas[patrimonio] = item;
            }
        });
    });

    return reservas;
}


function textoReserva(reserva){

    if(reserva.id === estoqueItemAberto.id) return "neste agendamento";

    return `já em demanda: ${descricaoDemanda(reserva)}`;
}


// "31/10/2026 — Cliente Três" (também usado no alerta ao salvar)
function descricaoDemanda(reserva){

    const quem = reserva.cliente ? ` — ${reserva.cliente}` : "";

    return `${reserva.data ? dataLixeira(reserva.data) : "sem data"}${quem}`;
}


// máquinas da filial nos dois status da consulta; modelos = null mostra todas
function maquinasDaFilial(filial, modelos){

    return [
        ["disponiveis", "Disponível"],
        ["manutencao", "Manutenção"]
    ]
        .flatMap(([campo, situacao]) =>
            Object.entries(filial[campo] || {})
                .filter(([modelo]) => !modelos || modelos.includes(modelo))
                .flatMap(([modelo, lista]) =>
                    lista.map(maquina => ({ ...maquina, modelo, situacao }))
                )
        )
        .sort((a, b) =>
            a.p.localeCompare(b.p, "pt-BR", { numeric: true })
        );
}


function criarTabelaEstoque(maquinas, reservas){

    const tabela = criar("table", "estoque-tabela");

    const cabecalho = criar("tr");

    ["Patrimônio", "Marca", "Modelo", "Situação", ""].forEach(titulo => {

        cabecalho.appendChild(criar("th", "", titulo));
    });

    const topo = criar("thead");

    topo.appendChild(cabecalho);

    tabela.appendChild(topo);

    const corpo = criar("tbody");

    maquinas.forEach(maquina => {

        const linha = criar("tr");

        linha.appendChild(criar("td", "estoque-patrimonio", maquina.p));

        // relatório sem a coluna Marca: o nome do equipamento ajuda no lugar
        linha.appendChild(criar("td", "", maquina.m || maquina.e || "—"));

        linha.appendChild(criar("td", "", maquina.f || maquina.modelo));

        linha.appendChild(
            criar(
                "td",
                maquina.situacao === "Manutenção" ? "estoque-em-manutencao" : "",
                maquina.situacao
            )
        );

        const reserva = reservas[maquina.p.toUpperCase()];

        // já está em demanda: a linha inteira fica em destaque
        if(reserva){

            linha.classList.add(
                reserva.id === estoqueItemAberto.id
                    ? "estoque-neste-agendamento"
                    : "estoque-em-demanda"
            );
        }

        linha.appendChild(
            criar("td", "estoque-reserva", reserva ? textoReserva(reserva) : "")
        );

        corpo.appendChild(linha);
    });

    tabela.appendChild(corpo);

    return tabela;
}


function desenharEstoqueAgenda(){

    const corpo = $("listaEstoqueAgenda");

    corpo.innerHTML = "";

    const item = estoqueItemAberto;

    const modelos = modelosDoAgendamento(item);

    const mostrarTodos = estoqueVerTodos || !modelos.length;

    const topo = criar("div", "estoque-topo");

    topo.appendChild(
        criar(
            "strong",
            "",
            (item.plataforma || "Sem equipamento") +
            (item.cliente ? ` — ${item.cliente}` : "")
        )
    );

    if(modelos.length){

        const alternar =
            criar(
                "button",
                "btn-secundario",
                estoqueVerTodos
                    ? `Só ${modelos.join(", ")}`
                    : "Ver todos os modelos"
            );

        alternar.type = "button";

        alternar.addEventListener(
            "click",
            () => {

                estoqueVerTodos = !estoqueVerTodos;

                desenharEstoqueAgenda();
            }
        );

        topo.appendChild(alternar);
    }

    corpo.appendChild(topo);

    if(!estoqueFiliais.length){

        corpo.appendChild(
            criar("p", "agenda-vazia", "Nenhum estoque publicado ainda.")
        );

        return;
    }

    const reservas = reservasDaAgenda();

    let semMarca = true;

    estoqueFiliais.forEach(filial => {

        const maquinas =
            maquinasDaFilial(filial, mostrarTodos ? null : modelos);

        const emManutencao =
            maquinas.filter(maquina => maquina.situacao === "Manutenção").length;

        if(maquinas.some(maquina => maquina.m || maquina.e)) semMarca = false;

        const secao = criar("div", "estoque-filial");

        const nome =
            NOMES_FILIAIS_ESTOQUE[filial.filial_id] || `Filial ${filial.filial_id}`;

        secao.appendChild(
            criar(
                "h4",
                "",
                `${nome}: ${maquinas.length - emManutencao} disponível(is), ${emManutencao} em manutenção`
            )
        );

        secao.appendChild(
            criar("small", "", `Estoque publicado em ${quandoExcluido(filial.atualizado_em)}`)
        );

        secao.appendChild(
            maquinas.length
                ? criarTabelaEstoque(maquinas, reservas)
                : criar(
                    "p",
                    "estoque-nada",
                    mostrarTodos
                        ? "Nenhuma máquina disponível ou em manutenção."
                        : "Nenhuma máquina disponível ou em manutenção deste modelo."
                )
        );

        corpo.appendChild(secao);
    });

    // função antiga no banco: só devolve as disponíveis
    if(estoqueFiliais.some(filial => !("manutencao" in filial))){

        corpo.appendChild(
            criar(
                "p",
                "estoque-nada",
                "As máquinas em manutenção não aparecem: falta atualizar a função estoque_disponiveis no Supabase."
            )
        );
    }

    if(semMarca){

        corpo.appendChild(
            criar(
                "p",
                "estoque-nada",
                "A marca aparece depois que o estoque for publicado de novo."
            )
        );
    }
}


async function abrirEstoqueAgenda(item){

    estoqueItemAberto = item;

    estoqueVerTodos = false;

    $("modalEstoque").classList.add("aberto");

    $("listaEstoqueAgenda").innerHTML = "";

    $("listaEstoqueAgenda").appendChild(
        criar("p", "agenda-vazia", "Carregando...")
    );

    let filiais;

    try{

        filiais = await carregarEstoqueDisponivel();

    }catch(erro){

        console.error("[agenda] Falha ao consultar o estoque:", detalhesErro(erro));

        if(estoqueItemAberto !== item) return;

        $("listaEstoqueAgenda").innerHTML = "";

        $("listaEstoqueAgenda").appendChild(
            criar(
                "p",
                "agenda-vazia",
                erro?.code === "PGRST202"
                    ? "A consulta ainda não foi ativada no banco: falta criar a função estoque_disponiveis no Supabase."
                    : "Não foi possível consultar o estoque. Confira a conexão e tente de novo."
            )
        );

        return;
    }

    // fechou ou abriu outro agendamento enquanto carregava
    if(estoqueItemAberto !== item) return;

    estoqueFiliais = filiais;

    desenharEstoqueAgenda();
}


function fecharEstoqueAgenda(){

    estoqueItemAberto = null;

    $("modalEstoque").classList.remove("aberto");
}
