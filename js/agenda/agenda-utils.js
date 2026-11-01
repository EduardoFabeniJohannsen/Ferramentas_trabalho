// ======================================
// AGENDA - UTILITÁRIOS
// ======================================
// corDoDia(), tituloDoDia(), cidadeDoEndereco().
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


// O endereço é texto livre: a cidade é o trecho antes da UF, no último par
// que aparecer ("Rua B, 200, Centro, Brusque/SC" -> "Brusque/SC";
// "Rua C, 10 - Centro, São Paulo - SP, 01234-567" -> "São Paulo/SP").
// Sem UF no texto não dá pra saber a cidade: volta vazio.
function cidadeDoEndereco(endereco){

    const pares =
        String(endereco || "").matchAll(
            /([^,;\/]+?)\s*[\/,;–-]\s*(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)(?![\p{L}\d-])/giu
        );

    const ultimo = [...pares].pop();

    if(!ultimo) return "";

    // "123 - Centro - Brusque": a cidade é só o último pedaço
    const cidade =
        ultimo[1].split(/\s[–-]\s/).pop().trim();

    // "Rua A, 100, SC": antes da UF veio o número, não a cidade
    if(!/^\p{L}/u.test(cidade)) return "";

    return `${cidade}/${ultimo[2].toUpperCase()}`;
}
