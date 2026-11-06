// ======================================
// AGENDA - USAR PATRIMÔNIO DA LUPA
// ======================================
// Botão "Usar" em cada máquina da lupa (agenda-estoque.js): grava o patrimônio
// no agendamento com um clique. Só o modelo (WAE18) é preenchido direto; um
// patrimônio já definido pergunta antes de trocar; com vários equipamentos a
// pessoa escolhe qual trocar; máquina em outra demanda passa pelo alerta de
// agenda-conflitos.js. Carregar depois de agenda-conflitos.js.

// evita gravar duas vezes com clique duplo
let usandoPatrimonio = false;


// Qual equipamento recebe a máquina. Um do mesmo modelo ainda sem patrimônio
// recebe direto. Fora isso, com vários equipamentos só a pessoa sabe qual trocar.
// Devolve { indice, direto } ou { escolher: true }.
function destinoDoPatrimonio(partes, maquina){

    const indice =
        partes.findIndex(parte =>
            modeloDaPlataforma(parte.patrimonio) === maquina.modelo &&
            patrimonioIncompleto(parte.patrimonio)
        );

    if(indice >= 0) return { indice, direto: true };

    if(partes.length > 1) return { escolher: true };

    return { indice: 0, direto: patrimonioIncompleto(partes[0].patrimonio) };
}


// troca o equipamento do índice pela máquina. "2x WAD16": uma máquina vira o
// patrimônio e a outra segue como estava.
function plataformaTrocando(partes, indice, maquina){

    const alvo = partes[indice];

    return plataformasFormatadas(
        juntarPlataformas([
            ...partes.slice(0, indice),
            { quantidade: 1, patrimonio: maquina.p },
            ...(alvo.quantidade > 1
                ? [{ quantidade: alvo.quantidade - 1, patrimonio: alvo.patrimonio }]
                : []),
            ...partes.slice(indice + 1)
        ])
    );
}


// rascunho aberto deste agendamento: leva o patrimônio junto, senão ao abrir
// o formulário o valor antigo voltaria e seria salvo por cima
function atualizarPlataformaDoRascunho(id, plataforma){

    const todos = lerRascunhos();

    const rascunho = todos[`edit:${id}`];

    if(!rascunho || !rascunho.campos) return;

    rascunho.campos.plataforma = plataforma;

    gravarRascunhos(todos);
}


function fecharEscolhaTroca(){

    const painel = $("escolhaTroca");

    if(painel) painel.remove();
}


// "Qual equipamento trocar?": um botão por equipamento, no topo da janela
function mostrarEscolhaTroca(item, partes, maquina){

    fecharEscolhaTroca();

    const painel = criar("div", "estoque-escolha");

    painel.id = "escolhaTroca";

    painel.appendChild(
        criar("p", "", `Qual equipamento trocar por ${maquina.p}?`)
    );

    const botoes = criar("div", "estoque-escolha-botoes");

    partes.forEach((parte, indice) => {

        const botao =
            criar(
                "button",
                "",
                parte.quantidade > 1
                    ? `${parte.patrimonio} (1 de ${parte.quantidade})`
                    : parte.patrimonio
            );

        botao.type = "button";

        botao.addEventListener(
            "click",
            () => {

                fecharEscolhaTroca();

                gravarPatrimonio(item, partes, indice, maquina);
            }
        );

        botoes.appendChild(botao);
    });

    const cancelar = criar("button", "btn-secundario", "Cancelar");

    cancelar.type = "button";

    cancelar.addEventListener("click", fecharEscolhaTroca);

    botoes.appendChild(cancelar);

    painel.appendChild(botoes);

    const corpo = $("listaEstoqueAgenda");

    corpo.insertBefore(painel, corpo.firstChild);

    painel.scrollIntoView({ block: "nearest" });
}


async function usarPatrimonio(maquina){

    if(usandoPatrimonio) return;

    fecharEscolhaTroca();

    // a agenda pode ter recarregado com a janela aberta
    const item =
        agendamentos.find(ag => ag.id === estoqueItemAberto.id) || estoqueItemAberto;

    if(patrimoniosDoAgendamento(item).includes(maquina.p.toUpperCase())){

        return mostrarToast(`${maquina.p} já está neste agendamento`, true);
    }

    const partes = separarPlataformas(item.plataforma);

    const destino = destinoDoPatrimonio(partes, maquina);

    if(destino.escolher) return mostrarEscolhaTroca(item, partes, maquina);

    if(
        !destino.direto &&
        !confirm(`Trocar ${partes[destino.indice].patrimonio} por ${maquina.p} em ${item.cliente || "este agendamento"}?`)
    ) return;

    await gravarPatrimonio(item, partes, destino.indice, maquina);
}


async function gravarPatrimonio(item, partes, indice, maquina){

    if(usandoPatrimonio) return;

    const plataforma = plataformaTrocando(partes, indice, maquina);

    if(!confirmarConflitos({ ...item, plataforma }, item.id)) return;

    usandoPatrimonio = true;

    try{

        Object.assign(
            item,
            await atualizarAgendamento(item.id, { plataforma })
        );

    }catch(erro){

        console.error("[agenda] Falha ao usar o patrimônio:", detalhesErro(erro));

        return mostrarToast(mensagemErroSalvar(erro), true);

    }finally{

        usandoPatrimonio = false;
    }

    atualizarPlataformaDoRascunho(item.id, item.plataforma);

    renderizarAgenda();

    mostrarToast(`${maquina.p} definido em ${item.cliente || "este agendamento"}`);

    // fechou a janela enquanto gravava
    if(!estoqueItemAberto || estoqueItemAberto.id !== item.id) return;

    // ainda falta máquina (ex: 2x WAD16): deixa a janela aberta pra escolher
    if(patrimonioIncompleto(item.plataforma)){

        estoqueItemAberto = item;

        desenharEstoqueAgenda();

        return;
    }

    fecharEstoqueAgenda();
}
