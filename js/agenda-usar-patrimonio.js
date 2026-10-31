// ======================================
// AGENDA - USAR PATRIMÔNIO DA LUPA
// ======================================
// Botão "Usar" em cada máquina da lupa (agenda-estoque.js): grava o patrimônio
// no agendamento com um clique. Só o modelo (WAE18) é preenchido direto; patrimônio
// já definido pergunta antes de trocar; máquina em outra demanda passa pelo alerta
// de agenda-conflitos.js. Carregar depois de agenda-conflitos.js.

// evita gravar duas vezes com clique duplo
let usandoPatrimonio = false;


// Qual equipamento do agendamento recebe a máquina: primeiro um do mesmo modelo
// ainda sem patrimônio; depois um do mesmo modelo já definido (troca). Modelo
// diferente só com um equipamento, senão não dá pra saber qual seria trocado.
// Devolve { plataforma, trocado } ou { erro }.
function plataformaComPatrimonio(item, maquina){

    const partes = separarPlataformas(item.plataforma);

    const mesmoModelo = (parte) =>
        modeloDaPlataforma(parte.patrimonio) === maquina.modelo;

    let indice =
        partes.findIndex(parte =>
            mesmoModelo(parte) && patrimonioIncompleto(parte.patrimonio)
        );

    const preenche = indice >= 0;

    if(!preenche) indice = partes.findIndex(mesmoModelo);

    if(indice < 0 && partes.length === 1) indice = 0;

    if(indice < 0){

        return {
            erro: "Modelo diferente dos equipamentos deste agendamento: use ✏️ Editar para escolher qual trocar"
        };
    }

    const alvo = partes[indice];

    // "2x WAD16": uma máquina vira o patrimônio e a outra segue como modelo
    const novas = [
        ...partes.slice(0, indice),
        { quantidade: 1, patrimonio: maquina.p },
        ...(alvo.quantidade > 1
            ? [{ quantidade: alvo.quantidade - 1, patrimonio: alvo.patrimonio }]
            : []),
        ...partes.slice(indice + 1)
    ];

    return {
        plataforma: plataformasFormatadas(juntarPlataformas(novas)),
        trocado:
            preenche || patrimonioIncompleto(alvo.patrimonio)
                ? ""
                : alvo.patrimonio
    };
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


async function usarPatrimonio(maquina){

    if(usandoPatrimonio) return;

    // a agenda pode ter recarregado com a janela aberta
    const item =
        agendamentos.find(ag => ag.id === estoqueItemAberto.id) || estoqueItemAberto;

    if(patrimoniosDoAgendamento(item).includes(maquina.p.toUpperCase())){

        return mostrarToast(`${maquina.p} já está neste agendamento`, true);
    }

    const destino = plataformaComPatrimonio(item, maquina);

    if(destino.erro) return mostrarToast(destino.erro, true);

    if(
        destino.trocado &&
        !confirm(`Trocar ${destino.trocado} por ${maquina.p} em ${item.cliente || "este agendamento"}?`)
    ) return;

    if(!confirmarConflitos({ ...item, plataforma: destino.plataforma }, item.id)) return;

    usandoPatrimonio = true;

    try{

        Object.assign(
            item,
            await atualizarAgendamento(item.id, { plataforma: destino.plataforma })
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
