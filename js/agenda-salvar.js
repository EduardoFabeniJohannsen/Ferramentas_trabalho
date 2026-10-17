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

    // plataforma e horário sempre em maiúsculas (como na planilha)
    dados.plataforma = dados.plataforma.toUpperCase();

    dados.plataformaRecolha = dados.plataformaRecolha.toUpperCase();

    dados.horario = dados.horario.toUpperCase();

    // data e transportadora são opcionais: máquina pode entrar na
    // agenda antes de ter data e transportador definidos
    if(!dados.plataforma){

        return mostrarToast("Informe a plataforma", true);
    }

    if(!dados.cliente){

        return mostrarToast("Informe o cliente", true);
    }

    if(
        dados.frete &&
        !Number.isFinite(brToNumber(dados.frete))
    ){
        return mostrarToast("Frete inválido", true);
    }

    // troca técnica precisa da máquina de recolha; nos outros tipos não vale
    if(dados.tipo === "Troca técnica"){

        if(!dados.plataformaRecolha){

            return mostrarToast("Informe a máquina de recolha da troca", true);
        }

    }else{

        dados.plataformaRecolha = "";
    }

    // horário: 08:00, CONFIRMAR ou IMEDIATO (valor antigo, sem mexer, passa)
    if(
        !horarioValido(dados.horario) &&
        dados.horario !== valoresOriginais.horario
    ){
        return mostrarToast(
            "Horário inválido (use 08:00, CONFIRMAR ou IMEDIATO)",
            true
        );
    }

    // período: 16 dias, 3 períodos ou Anual (valor antigo, sem mexer, passa)
    const periodo = normalizarPeriodo(dados.periodo);

    if(periodo.erro){

        if(dados.periodo !== valoresOriginais.periodo){

            return mostrarToast(periodo.erro, true);
        }

    }else{

        dados.periodo = periodo.valor;
    }

    const id = idEmEdicao;

    salvandoAgendamento = true;

    try{

        if(id){

            const atualizado =
                await atualizarAgendamento(id, dados);

            const item =
                agendamentos.find(ag => ag.id === id);

            if(item){

                Object.assign(item, atualizado);

            }else{

                agendamentos.push(atualizado);
            }

        }else{

            agendamentos.push(
                await inserirAgendamento(dados)
            );
        }

    }catch(erro){

        console.error("[agenda] Falha ao salvar:", detalhesErro(erro));

        salvandoAgendamento = false;

        // o formulário continua aberto pra não perder o que foi digitado
        return mostrarToast("Erro ao salvar o agendamento", true);
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

    // sem agendamento, não sobra rascunho dele
    removerRascunho(`edit:${id}`);

    renderizarAgenda();

    mostrarToast(
        excluiu
            ? "Agendamento excluído"
            : "Esse agendamento já tinha sido excluído"
    );

    return true;
}
