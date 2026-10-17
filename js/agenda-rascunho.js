// ======================================
// AGENDA - RASCUNHO DO FORMULÁRIO
// ======================================
// Guarda no navegador o que foi digitado e não salvo.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// RASCUNHO DO FORMULÁRIO
// ======================================
// O que foi digitado e não foi salvo fica guardado neste navegador
// (um rascunho pro "novo" e um por agendamento em edição). Ao clicar
// fora, apertar Esc ou fechar sem querer, nada se perde: ao abrir de
// novo, o formulário volta de onde parou.

function chaveRascunho(){

    return idEmEdicao ? `edit:${idEmEdicao}` : "novo";
}


function lerRascunhos(){

    try{

        const salvo =
            localStorage.getItem(CHAVE_AGENDA_RASCUNHOS);

        const dados =
            salvo ? JSON.parse(salvo) : {};

        return (dados && typeof dados === "object") ? dados : {};

    }catch(erro){

        console.error("Rascunhos inválidos, ignorando:", erro);

        return {};
    }
}


function gravarRascunhos(dados){

    try{

        localStorage.setItem(
            CHAVE_AGENDA_RASCUNHOS,
            JSON.stringify(dados)
        );

    }catch(erro){

        console.error("Erro ao salvar rascunho:", erro);
    }
}


function removerRascunho(chave){

    const todos = lerRascunhos();

    if(!(chave in todos)) return;

    delete todos[chave];

    gravarRascunhos(todos);
}


function salvarRascunho(){

    const campos = {};

    CAMPOS_AGENDA.forEach(([campo, idCampo]) => {

        campos[campo] = $(idCampo).value;
    });

    const todos = lerRascunhos();

    todos[chaveRascunho()] = { campos: campos, salvoEm: Date.now() };

    gravarRascunhos(todos);
}


// chamado a cada digitação: guarda o rascunho (sem travar a digitação)
function agendarRascunho(){

    if(!$("modalAgenda").classList.contains("aberto")) return;

    formularioAlterado = true;

    clearTimeout(timerRascunho);

    timerRascunho = setTimeout(salvarRascunho, 400);
}


// botões do topo do formulário: novo = descartar rascunho;
// editando = descartar alterações + excluir o agendamento
function atualizarBotoesModal(editando, temRascunho){

    $("btnDescartarAgenda").innerText =
        editando ? "↩ Descartar alterações" : "🗑️ Descartar rascunho";

    $("btnExcluirAgenda").style.display =
        editando ? "" : "none";

    $("avisoRascunho").innerText =
        editando
            ? "📝 Alterações não salvas restauradas"
            : "📝 Rascunho restaurado";

    $("avisoRascunho").style.display =
        temRascunho ? "" : "none";
}
