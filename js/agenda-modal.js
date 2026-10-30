// ======================================
// AGENDA - MODAL (abrir/fechar/descartar)
// ======================================
// Abrir e fechar o formulário, descartar rascunho, excluir pelo modal.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// valoresIniciais = formulário novo já preenchido (ex: coleta copiada de uma
// entrega); aviso = texto mostrado no topo do formulário.
function abrirModalAgenda(id, valoresIniciais, aviso){

    idEmEdicao = id || null;

    const item =
        id
            ? agendamentos.find(ag => ag.id === id)
            : null;

    // pediu um agendamento que não existe mais: não abre
    if(id && !item){

        idEmEdicao = null;

        return;
    }

    // rascunho guardado de uma edição interrompida (cópia não usa rascunho)
    const rascunho =
        valoresIniciais
            ? undefined
            : lerRascunhos()[chaveRascunho()];

    // de onde vêm os valores: rascunho, senão o agendamento salvo,
    // senão os valores iniciais da cópia
    const origem =
        rascunho
            ? rascunho.campos
            : (item || valoresIniciais || null);

    // valor antigo fora do padrão (ex: período "6 meses") copiado ou aberto
    // sem mexer continua podendo ser salvo
    const base = item || valoresIniciais;

    valoresOriginais = {
        horario: base ? (base.horario || "") : "",
        periodo: base ? (base.periodo || "") : ""
    };

    clearTimeout(timerRascunho);

    formularioAlterado = false;

    // transportadora e motorista: só os cadastrados na transportadora
    garantirOpcaoTransportadora(origem ? origem.transportadora : "");

    atualizarOpcoesMotorista(
        origem ? origem.transportadora : "",
        origem ? origem.motorista : ""
    );

    $("tituloModalAgenda").innerText =
        item ? "Editar agendamento" : "Novo agendamento";

    CAMPOS_AGENDA.forEach(([campo, idCampo]) => {

        $(idCampo).value = origem ? (origem[campo] || "") : "";
    });

    if(!origem){

        // data pode ser apagada depois, se ainda não está definida
        $("agData").value = dataISO(0);

        $("agHorario").value = HORARIO_PADRAO;

        $("agTipo").value = TIPOS[0];

        $("agStatus").value = STATUS_PADRAO;

        $("agTransportadora").value = "";
    }

    // uma linha por equipamento (vem do campo escondido agPlataforma)
    desenharPlataformas();

    // agendamentos antigos (ou novos) sem valor ficam por nossa conta
    if(!$("agFreteConta").value){

        $("agFreteConta").value = "nossa";
    }

    // faturamento (pagamento e pedido de compra): do agendamento ou do
    // rascunho. Vem de agenda-pagamento.js (cópia de coleta não leva nada)
    preencherFaturamento(item || valoresIniciais, rascunho);

    atualizarCamposConta();

    atualizarCamposTipo();

    atualizarSugestoesPeriodo();

    atualizarAvisoPatrimonio();

    // etapas recolhidas como o usuário deixou
    aplicarEtapasSalvas();

    atualizarBotoesModal(!!item, !!rascunho);

    if(aviso){

        $("avisoRascunho").innerText = aviso;

        $("avisoRascunho").style.display = "";
    }

    $("modalAgenda").classList.add("aberto");

    // formulário comprido: sempre abre mostrando o topo
    const caixa = $("modalAgenda").querySelector(".modal-agenda");

    if(caixa) caixa.scrollTop = 0;

    $("listaPlataformas").querySelector(".ag-plataforma-item").focus();
}


// por nossa conta aparece o Card. Os e-mails aparecem sempre (servem
// pro faturamento da locação), mas só vão no agendamento por conta do cliente.
function atualizarCamposConta(){

    const porCliente =
        $("agFreteConta").value === "cliente";

    $("blocoCard").style.display =
        porCliente ? "none" : "";
}


// fecha guardando onde parou (clique fora, Esc e ×)
function fecharModalAgenda(){

    clearTimeout(timerRascunho);

    if(formularioAlterado) salvarRascunho();

    encerrarModalAgenda();
}


// fecha de vez, sem guardar nada (depois de salvar, descartar ou excluir)
function encerrarModalAgenda(){

    clearTimeout(timerRascunho);

    formularioAlterado = false;

    $("modalAgenda").classList.remove("aberto");

    idEmEdicao = null;
}


// botão do formulário: novo = descartar rascunho;
// editando = descartar as alterações (o agendamento salvo continua)
function descartarRascunho(){

    const editando = !!idEmEdicao;

    const temAlgo =
        formularioAlterado ||
        !!lerRascunhos()[chaveRascunho()];

    // só pergunta se tem algo a perder
    if(
        temAlgo &&
        !confirm(
            editando
                ? "Descartar as alterações não salvas deste agendamento?"
                : "Descartar este rascunho?"
        )
    ){
        return;
    }

    removerRascunho(chaveRascunho());

    encerrarModalAgenda();

    if(temAlgo){

        mostrarToast(
            editando
                ? "Alterações descartadas"
                : "Rascunho descartado"
        );
    }
}


// botão do formulário (só ao editar): exclui o agendamento aberto
async function excluirAgendamentoAberto(){

    const id = idEmEdicao;

    if(!id) return;

    const excluiu = await excluirAgendamento(id);

    if(excluiu) encerrarModalAgenda();
}


document.addEventListener("keydown", (evento) => {

    if(evento.key === "Escape"){

        fecharModalAgenda();

        fecharPainelDatas();

        fecharPainelStatus();

        fecharLixeira();
    }
});
