// ======================================
// AGENDA - UTILITÁRIOS
// ======================================
// corDoDia(), tituloDoDia(), cidadeDoEndereco(), rotuloTipo() e partesFrete() (frete dividido entre o cliente e nossa conta).
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// UTILITÁRIOS
// ======================================

// "Transferência" aparece como "Transferência entre obras" (ROTULOS_TIPO)
function rotuloTipo(tipo){

    return ROTULOS_TIPO[tipo] || tipo;
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
