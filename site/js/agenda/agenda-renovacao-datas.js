// ======================================
// AGENDA - EMAIL DE RENOVAÇÃO: AS DATAS
// ======================================
// Só contas de datas, sem tela, para o ✉️ Email de renovação: o vencimento pela data da entrega e o período do agendamento (o dia da entrega conta como o 1º; depois renova por mais um período igual), feriados nacionais (os de data fixa e, pela Páscoa, Carnaval, Sexta-feira Santa e Corpus Christi), dia útil, prazo de resposta (dia útil: o próprio vencimento; fim de semana ou feriado: o dia útil anterior; já vencido: hoje; nunca antes de hoje) e o dia da semana por extenso. Os municipais ficam com a pessoa (caixinha Feriado da janela).

const DIAS_SEMANA_RENOVACAO = ["Domingo", "Segunda Feira", "Terça Feira", "Quarta Feira", "Quinta Feira", "Sexta Feira", "Sábado"];

// "3 períodos" = 90 dias (como nas Propostas: acima de 30 dias, em períodos de 30)
const DIAS_POR_PERIODO_RENOVACAO = 30;


// "2026-11-29" -> Date ao meio-dia (sem pular de dia por fuso)
function dataDoIso(iso){

    const [ano, mes, dia] = iso.split("-").map(Number);

    return new Date(ano, mes - 1, dia, 12);
}


function isoDoDiaRenovacao(data){

    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, "0"),
        String(data.getDate()).padStart(2, "0")
    ].join("-");
}


function somarDiasIso(iso, dias){

    const data = dataDoIso(iso);

    data.setDate(data.getDate() + dias);

    return isoDoDiaRenovacao(data);
}


// domingo de Páscoa (algoritmo de Meeus/Jones/Butcher)
function pascoa(ano){

    const a = ano % 19;
    const b = Math.floor(ano / 100);
    const c = ano % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;

    return isoDoDiaRenovacao(new Date(ano, mes - 1, dia, 12));
}


// feriados nacionais do ano: os de data fixa e, pela Páscoa, Carnaval (segunda e
// terça), Sexta-feira Santa e Corpus Christi. Os municipais ficam com a pessoa
// (caixinha "Feriado" da janela)
function feriadosNacionais(ano){

    const fixos = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"]
        .map(diaMes => `${ano}-${diaMes}`);

    const domingo = pascoa(ano);

    return new Set([
        ...fixos,
        somarDiasIso(domingo, -48),
        somarDiasIso(domingo, -47),
        somarDiasIso(domingo, -2),
        somarDiasIso(domingo, 60)
    ]);
}


function ehFeriadoNacional(iso){

    return feriadosNacionais(Number(iso.slice(0, 4))).has(iso);
}


function ehDiaUtil(iso){

    const semana = dataDoIso(iso).getDay();

    return semana !== 0 && semana !== 6 && !ehFeriadoNacional(iso);
}


// até quando o cliente responde: no dia útil, o próprio vencimento; no fim de
// semana ou feriado (feriadoNoVencimento: a caixinha, que vale também para os
// municipais), o dia útil anterior. Nunca antes de hoje; já vencido: hoje
function prazoRenovacao(vencimento, feriadoNoVencimento, hoje){

    if(vencimento < hoje) return hoje;

    let prazo = vencimento;

    while(prazo > hoje && (!ehDiaUtil(prazo) || (prazo === vencimento && feriadoNoVencimento))){

        prazo = somarDiasIso(prazo, -1);
    }

    return prazo;
}


function diaDaSemanaRenovacao(iso){

    return DIAS_SEMANA_RENOVACAO[dataDoIso(iso).getDay()];
}


// "2026-11-29" -> "29/11"
function diaMesRenovacao(iso){

    return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}


// ======================================
// VENCIMENTO PELA ENTREGA E O PERÍODO
// ======================================

// o campo Período do agendamento: { dias, passo } (quanto dura o 1º e de quanto
// em quanto renova) ou { anos: 1 } (Anual); não reconhecido: null.
// "16 dias" -> 16, renova de 16 em 16; "3 períodos" -> 90, renova de 30 em 30
function duracaoDoPeriodo(periodo){

    const texto = semAcento(String(periodo || "")).trim().toLowerCase().replace(/\s+/g, " ");

    if(texto === "anual") return { anos: 1 };

    if(texto === "diaria") return { dias: 1, passo: 1 };

    const dias = texto.match(/^(\d+) ?dias?$/);

    if(dias && Number(dias[1]) > 0) return { dias: Number(dias[1]), passo: Number(dias[1]) };

    const periodos = texto.match(/^(\d+) ?periodos?$/);

    if(periodos && Number(periodos[1]) > 0){

        return { dias: Number(periodos[1]) * DIAS_POR_PERIODO_RENOVACAO, passo: DIAS_POR_PERIODO_RENOVACAO };
    }

    return null;
}


function somarAnosIso(iso, anos){

    const data = dataDoIso(iso);

    data.setFullYear(data.getFullYear() + anos);

    return isoDoDiaRenovacao(data);
}


// o vencimento que vem (o de hoje também). O 1º conta o dia da entrega como o
// 1º dia (entrega 01/12 + 30 dias -> 30/12; Anual: 01/12/2026 -> 30/11/2027);
// sem resposta, renova por mais um período igual. { iso, numero, duracao } ou null
function proximoVencimento(entrega, periodo, hoje){

    const duracao = duracaoDoPeriodo(periodo);

    if(!entrega || !duracao) return null;

    let iso =
        duracao.anos
            ? somarDiasIso(somarAnosIso(entrega, duracao.anos), -1)
            : somarDiasIso(entrega, duracao.dias - 1);

    let numero = 1;

    // trava contra laço sem fim (diária há muitos anos)
    while(iso < hoje && numero < 5000){

        iso = duracao.anos ? somarAnosIso(iso, duracao.anos) : somarDiasIso(iso, duracao.passo);

        numero++;
    }

    return { iso, numero, duracao };
}


// "1º vencimento: entrega em 01/12/2026 + 30 dias" ou "3º vencimento: entrega
// em 01/09/2026 + 30 dias, renovando de 30 em 30 dias"
function textoOrigemVencimento(entrega, periodo, vencimento){

    const renova =
        vencimento.duracao.anos ? "renovando de ano em ano" : `renovando de ${vencimento.duracao.passo} em ${vencimento.duracao.passo} dias`;

    return `${vencimento.numero}º vencimento: entrega em ${dataBR(entrega)} + ${periodo} (o dia da entrega conta como o 1º)` +
        (vencimento.numero > 1 ? `, ${renova}.` : ".");
}
