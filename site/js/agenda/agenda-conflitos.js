// ======================================
// AGENDA - ALERTA DE CONFLITO AO SALVAR
// ======================================
// Antes de gravar, avisa se o patrimônio já está em outra demanda. É só um
// aviso: a pessoa decide se salva mesmo assim. Ao editar, só olha os patrimônios
// novos no agendamento, pra não repetir o aviso a cada mudança.
// Carregar depois de agenda-estoque.js.

// patrimônios completos, em maiúsculo e sem repetir (só o modelo não conta:
// ainda não é uma máquina definida)
function patrimoniosDoAgendamento(item){

    return [
        ...new Set(
            separarPlataformas(item.plataforma)
                .map(parte => parte.patrimonio)
                .filter(patrimonio => !patrimonioIncompleto(patrimonio))
                .map(patrimonio => patrimonio.toUpperCase())
        )
    ];
}


// uma frase por conflito. id = agendamento em edição (null = novo).
function conflitosDoAgendamento(dados, id){

    if(!agendamentoReservaMaquina(dados)) return [];

    const original =
        id ? agendamentos.find(item => item.id === id) : null;

    // ele já reservava estas máquinas antes da edição (já foi avisado)
    const jaReservadas =
        original && agendamentoReservaMaquina(original)
            ? patrimoniosDoAgendamento(original)
            : [];

    const reservas = reservasDaAgenda(id);

    return patrimoniosDoAgendamento(dados)
        .filter(patrimonio =>
            !jaReservadas.includes(patrimonio) && reservas[patrimonio]
        )
        .map(patrimonio =>
            `${patrimonio} já está em demanda: ${descricaoDemanda(reservas[patrimonio])}`
        );
}


// true = pode salvar
function confirmarConflitos(dados, id){

    const conflitos = conflitosDoAgendamento(dados, id);

    if(!conflitos.length) return true;

    return confirm(
        `Atenção, conflito de patrimônio:\n\n${
            conflitos.map(frase => `• ${frase}`).join("\n")
        }\n\nSalvar mesmo assim?`
    );
}
