// ======================================
// AGENDA - CONSULTA AO ESTOQUE (botão 🔍 da linha)
// ======================================
// Mostra os patrimônios disponíveis e em manutenção no último estoque publicado
// (patrimônio, marca, modelo, ano e situação), começando pelos do mesmo modelo do
// agendamento. Só consulta, não muda nada. Lê pela função estoque_disponiveis do
// banco, que libera só esses dois status, sem cliente, para quem tem acesso à
// agenda. Destaca a máquina que já está em alguma demanda (o estoque não sabe disso).
// Carregar depois de agenda-zap.js e agenda-lixeira.js.

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

    let semAno = true;

    estoqueFiliais.forEach(filial => {

        const maquinas =
            maquinasDaFilial(filial, mostrarTodos ? null : modelos);

        const emManutencao =
            maquinas.filter(maquina => maquina.situacao === "Manutenção").length;

        if(maquinas.some(maquina => maquina.m || maquina.e)) semMarca = false;

        if(maquinas.some(maquina => maquina.a)) semAno = false;

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

        secao.appendChild(criarDataEstoque(filial.atualizado_em));

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

    if(semAno){

        corpo.appendChild(
            criar(
                "p",
                "estoque-nada",
                "O ano aparece depois que o estoque for publicado de novo, com a coluna de ano de fabricação no relatório."
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
