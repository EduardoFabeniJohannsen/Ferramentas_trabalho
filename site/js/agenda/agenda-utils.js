// ======================================
// AGENDA - UTILITÁRIOS
// ======================================
// corDoDia(), tituloDoDia() e partesFrete() (frete dividido entre o cliente e nossa conta). rotuloTipo() e cidadeDoEndereco() ficam em js/agendamento-comum.js (a Análise de fretes também usa).
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// UTILITÁRIOS
// ======================================

function corDoDia(iso){

    if(!iso) return COR_SEM_DATA;

    return CORES_DIAS[
        new Date(iso + "T00:00:00").getDay()
    ];
}


function tituloDoDia(iso){

    const data =
        new Date(iso + "T00:00:00");

    const diaSemana =
        data.toLocaleDateString(
            "pt-BR",
            { weekday: "long" }
        );

    let sufixo = "";

    if(iso === dataISO(0)) sufixo = " — hoje";

    if(iso === dataISO(1)) sufixo = " — amanhã";

    return `${diaSemana}, ${formatarData(data)}${sufixo}`;
}


// Frete dividido ("Frete por conta de: Cliente e nossa conta"): o cliente
// paga o frete menos a parte por nossa conta. { cliente, nossa } em número,
// ou null se o frete não for dividido. Ex: frete 500 e nossa 200 = cliente 300.
function partesFrete(item){

    if(item.freteConta !== "dividido") return null;

    const frete = brToNumber(item.frete);

    const nossa = brToNumber(item.freteNossa);

    return { cliente: frete - nossa, nossa };
}


// a parte por nossa conta precisa ser maior que zero e menor que o frete
function freteDivididoValido(partes){

    return !!partes && partes.nossa > 0 && partes.cliente > 0;
}
