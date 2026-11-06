// ======================================
// AGENDA - CONSULTA AO ESTOQUE: DADOS
// ======================================
// Lê o estoque publicado e descobre quais máquinas já estão em alguma demanda.

// cada filial é uma linha da tabela resumo_estoque (ver FILIAIS em estoque-config.js)
const NOMES_FILIAIS_ESTOQUE = { 1: "Itajaí", 2: "Joinville" };

// tipos em que a máquina sai do pátio (coleta é a máquina voltando)
const TIPOS_RESERVAM_MAQUINA = ["Entrega", "Troca técnica", "Transferência", TIPO_TRANSFERENCIA_UNIDADES];

// passou disso sem publicar: a data do estoque fica em destaque
const LIMITE_ESTOQUE_ANTIGO_MS = 12 * 60 * 60 * 1000;

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
