// ======================================
// AGENDA - UTILITÁRIOS
// ======================================
// criar(), dataISO(), corDoDia(), tituloDoDia(), cidadeDoEndereco().
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
