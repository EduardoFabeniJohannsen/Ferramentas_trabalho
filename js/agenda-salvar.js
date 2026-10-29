// ======================================
// AGENDA - SALVAR E EXCLUIR
// ======================================
// salvarAgendamento() e excluirAgendamento().
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

async function salvarAgendamento(){

    if(salvandoAgendamento) return;

    const dados = {};

    CAMPOS_AGENDA.forEach(([campo, idCampo]) => {

        dados[campo] =
            $(idCampo).value
                .trim()
                .replace(/\s+/g, " ");
    });

    // plataforma e horário sempre em maiúsculas (como na planilha); no
    // patrimônio a letra O depois dos números fica minúscula
    dados.plataforma = patrimonioFormatado(dados.plataforma);

    dados.plataformaRecolha = patrimonioFormatado(dados.plataformaRecolha);

    dados.horario = dados.horario.toUpperCase();

    // data e transportadora são opcionais: máquina pode entrar na
    // agenda antes de ter data e transportador definidos
    if(!dados.plataforma){

        return avisoFormulario("Informe a plataforma", "demanda");
    }

    if(!dados.cliente){

        return avisoFormulario("Informe o cliente", "demanda");
    }

    if(
        dados.frete &&
        !Number.isFinite(brToNumber(dados.frete))
    ){
        return avisoFormulario("Frete inválido", "local");
    }

    // troca técnica precisa da máquina de recolha; nos outros tipos não vale
    if(dados.tipo === "Troca técnica"){

        if(!dados.plataformaRecolha){

            return avisoFormulario("Informe a máquina de recolha da troca", "demanda");
        }

    }else{

        dados.plataformaRecolha = "";
    }

    // horário: 08:00, CONFIRMAR ou IMEDIATO (valor antigo, sem mexer, passa)
    if(
        !horarioValido(dados.horario) &&
        dados.horario !== valoresOriginais.horario
    ){
        return avisoFormulario(
            "Horário inválido (use 08:00, CONFIRMAR ou IMEDIATO)",
            "demanda"
        );
    }

    // período: 16 dias, 3 períodos ou Anual (valor antigo, sem mexer, passa)
    const periodo = normalizarPeriodo(dados.periodo);

    if(periodo.erro){

        if(dados.periodo !== valoresOriginais.periodo){

            return avisoFormulario(periodo.erro, "demanda");
        }

    }else{

        dados.periodo = periodo.valor;
    }

    // faturamento: pagamento e pedido de compra (só entregas)
    const faturamento = coletarFaturamento(dados.tipo);

    if(faturamento.cancelado) return;

    if(faturamento.erro){

        return avisoFormulario(faturamento.erro, "faturamento");
    }

    Object.assign(dados, faturamento.dados);

    const id = idEmEdicao;

    salvandoAgendamento = true;

    let salvo = null;

    try{

        if(id){

            const atualizado =
                await atualizarAgendamento(id, dados);

            const item =
                agendamentos.find(ag => ag.id === id);

            if(item){

                Object.assign(item, atualizado);

                salvo = item;

            }else{

                agendamentos.push(atualizado);

                salvo = atualizado;
            }

        }else{

            salvo = await inserirAgendamento(dados);

            agendamentos.push(salvo);
        }

    }catch(erro){

        console.error("[agenda] Falha ao salvar:", detalhesErro(erro));

        salvandoAgendamento = false;

        // o formulário continua aberto pra não perder o que foi digitado
        return mostrarToast(mensagemErroSalvar(erro), true);
    }

    // PDF do pedido de compra: envia/apaga depois de gravar (o caminho usa o id)
    const pdf = await sincronizarPdfPedido(salvo);

    if(pdf.erro){

        salvandoAgendamento = false;

        // o agendamento já foi gravado: o formulário passa a editar ele,
        // pra anexar o PDF de novo sem criar outro
        if(!id){

            removerRascunho("novo");

            idEmEdicao = salvo.id;

            $("tituloModalAgenda").innerText = "Editar agendamento";

            atualizarBotoesModal(true, false);
        }

        renderizarAgenda();

        return avisoFormulario(pdf.erro, "faturamento");
    }

    salvandoAgendamento = false;

    // salvou: o rascunho não serve mais
    removerRascunho(id ? `edit:${id}` : "novo");

    // a data e o status do agendamento salvo precisam aparecer
    // (se estavam desmarcados, voltam)
    datasOcultas.delete(dados.data || "");

    statusOcultos.delete(dados.status);

    encerrarModalAgenda();

    renderizarAgenda();

    mostrarToast("Agendamento salvo");
}


// devolve true se o agendamento saiu da lista
async function excluirAgendamento(id){

    const item =
        agendamentos.find(ag => ag.id === id);

    if(!item) return false;

    if(!confirm(`Excluir ${item.plataforma} — ${item.cliente}?`)) return false;

    let excluiu = false;

    try{

        excluiu = await excluirAgendamentoBanco(id);

    }catch(erro){

        console.error("[agenda] Falha ao excluir:", detalhesErro(erro));

        mostrarToast("Erro ao excluir o agendamento", true);

        return false;
    }

    agendamentos =
        agendamentos.filter(ag => ag.id !== id);

    // sem agendamento, não sobra rascunho nem PDF dele
    removerRascunho(`edit:${id}`);

    await removerPedidoPdfStorage(item.pedidoPdfCaminho);

    renderizarAgenda();

    mostrarToast(
        excluiu
            ? "Agendamento excluído"
            : "Esse agendamento já tinha sido excluído"
    );

    return true;
}
