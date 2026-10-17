// ======================================
// AGENDA - UTILITÁRIOS
// ======================================
// criar(), dataISO(), corDoDia(), tituloDoDia().
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// UTILITÁRIOS
// ======================================

function criar(tag, classe, texto){

    const elemento =
        document.createElement(tag);

    if(classe) elemento.className = classe;

    if(texto !== undefined && texto !== null){

        elemento.textContent = texto;
    }

    return elemento;
}


// data de hoje + deslocamento, no formato do input date (AAAA-MM-DD)
function dataISO(deslocamentoDias){

    const data = new Date();

    data.setDate(data.getDate() + deslocamentoDias);

    const ano = data.getFullYear();

    const mes =
        String(data.getMonth() + 1).padStart(2, "0");

    const dia =
        String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


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
