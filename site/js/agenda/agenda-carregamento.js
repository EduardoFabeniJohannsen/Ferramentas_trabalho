// ======================================
// AGENDA - CARREGAR EM OUTRO DIA
// ======================================
// A máquina carrega num dia e é entregue em outro (ex: carrega dia 10 às
// 17:00 e entrega dia 11 às 08:00). Vale para os tipos da expedição
// (entrega, troca e transferência entre unidades): colunas data_carregamento
// e horario_carregamento. A data e o horário de sempre continuam sendo os da
// entrega.
// - Expedição: o agendamento aparece no dia e no horário do carregamento
//   (é quando a expedição trabalha), com a entrega embaixo do horário.
// - Transportador: fica no dia da entrega, com o carregamento embaixo.
// - Zap: "Data coleta" / "Data entrega" (agenda-zap.js).
// Carregar depois de agenda-utils.js e antes de agenda-init.js.


// o agendamento carrega antes do dia da entrega
function carregaEmOutroDia(item){

    return !!item.dataCarregamento && TIPOS_EXPEDICAO.includes(item.tipo);
}


// expedição: conta o carregamento
function usaCarregamentoNaTela(item){

    return modoVisualizacao === "expedicao" && carregaEmOutroDia(item);
}


// data em que o agendamento aparece na tela (grupos do dia, ordem, filtro de datas)
function dataDaTela(item){

    return usaCarregamentoNaTela(item) ? item.dataCarregamento : (item.data || "");
}


function horarioDaTela(item){

    return usaCarregamentoNaTela(item) ? (item.horarioCarregamento || "") : (item.horario || "");
}


// "10/11 17:00" (sem horário: só a data)
function textoDiaHora(iso, horario){

    return `${formatarData(new Date(iso + "T00:00:00")).slice(0, 5)} ${horario || ""}`.trim();
}


// embaixo do horário na linha: na expedição a entrega, no transportador o carregamento
function textoOutroDiaDaLinha(item){

    if(!carregaEmOutroDia(item)) return "";

    if(usaCarregamentoNaTela(item)){

        return item.data ? `entrega ${textoDiaHora(item.data, item.horario)}` : "";
    }

    return `📦 carrega ${textoDiaHora(item.dataCarregamento, item.horarioCarregamento)}`;
}


// ======================================
// FORMULÁRIO
// ======================================

// mostra os campos do carregamento e troca "Data" por "Data da entrega"
function mostrarCamposCarregamento(){

    const vale = TIPOS_EXPEDICAO.includes($("agTipo").value);

    const aberto = vale && $("agCarregarAntes").checked;

    $("blocoCarregarAntes").style.display = vale ? "" : "none";

    $("blocoDataCarregamento").style.display = aberto ? "" : "none";

    $("blocoHorarioCarregamento").style.display = aberto ? "" : "none";

    $("rotuloData").innerText = aberto ? "Data da entrega" : "Data";

    $("rotuloHorario").innerText = aberto ? "Horário da entrega" : "Horário";
}


// ao abrir o formulário: marcado se o agendamento já carrega em outro dia
function prepararCamposCarregamento(){

    $("agCarregarAntes").checked =
        !!($("agDataCarregamento").value || $("agHorarioCarregamento").value);

    mostrarCamposCarregamento();
}


function alternarCarregarAntes(){

    // desmarcou: o carregamento sai (volta a ser no dia da entrega)
    if(!$("agCarregarAntes").checked){

        $("agDataCarregamento").value = "";

        $("agHorarioCarregamento").value = "";
    }

    mostrarCamposCarregamento();

    if($("agCarregarAntes").checked) $("agDataCarregamento").focus();
}


// confere e arruma dados.dataCarregamento e dados.horarioCarregamento antes
// de salvar. Devolve o texto do erro ou "".
// original = o que o agendamento tinha (sem carregamento antes e sem agora,
// as colunas nem vão para o banco: salvar funciona mesmo sem o SQL novo).
function conferirCarregamento(dados, original){

    const vale =
        TIPOS_EXPEDICAO.includes(dados.tipo) && $("agCarregarAntes").checked;

    if(!vale){

        dados.dataCarregamento = "";

        dados.horarioCarregamento = "";

    }else{

        dados.horarioCarregamento = dados.horarioCarregamento.toUpperCase();

        if(!dados.dataCarregamento) return "Informe a data do carregamento";

        if(!dados.data) return "Informe a data da entrega";

        if(dados.dataCarregamento > dados.data) return "O carregamento precisa ser antes da entrega";

        if(!horarioValido(dados.horarioCarregamento)){

            return "Horário do carregamento inválido (use 17:00, CONFIRMAR ou IMEDIATO)";
        }
    }

    if(!dados.dataCarregamento && !(original && original.dataCarregamento)){

        delete dados.dataCarregamento;

        delete dados.horarioCarregamento;
    }

    return "";
}


function ligarCamposCarregamento(){

    $("agCarregarAntes").addEventListener("change", alternarCarregarAntes);

    $("agTipo").addEventListener("change", mostrarCamposCarregamento);

    // números viram HH:MM sozinhos, como no horário da entrega
    $("agHorarioCarregamento").addEventListener("input", mascararCampoHorario);
}
