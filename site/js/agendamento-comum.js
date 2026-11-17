// ======================================
// AGENDAMENTO - O QUE É COMUM
// ======================================
// O que a Agenda e a Análise de fretes usam do agendamento: os tipos (e o nome na tela), o status Concluído, a cidade do endereço e as máquinas da plataforma (vários equipamentos e o modelo de cada um). Carregar antes de agenda-config.js.

// ======================================
// TIPOS E STATUS
// ======================================

// de uma unidade da W Rental para outra (agenda-unidades.js): vai pra
// expedição como uma entrega, mas sem faturamento
const TIPO_TRANSFERENCIA_UNIDADES = "Transferência entre unidades";

const TIPOS = ["Entrega", "Coleta", "Transferência", TIPO_TRANSFERENCIA_UNIDADES, "Troca técnica"];

// como o tipo aparece na tela ("Transferência" é a entre obras: o valor salvo
// continua o de sempre, então os agendamentos antigos não mudam)
const ROTULOS_TIPO = { "Transferência": "Transferência entre obras" };

// o botão ✅ da linha marca este (agenda-salvar.js)
const STATUS_CONCLUIDO = "Concluído";


// "Transferência" aparece como "Transferência entre obras" (ROTULOS_TIPO)
function rotuloTipo(tipo){

    return ROTULOS_TIPO[tipo] || tipo;
}


// ======================================
// CIDADE DO ENDEREÇO
// ======================================

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


// ======================================
// MÁQUINAS DA PLATAFORMA
// ======================================

// "2x WAD16 + WTE12" -> [{ quantidade: 2, patrimonio: "WAD16" }, { quantidade: 1, patrimonio: "WTE12" }]
function separarPlataformas(texto){

    return String(texto || "")
        .split(/\s*[+,;\/]\s*|\s+e\s+/i)
        .map(parte => parte.trim())
        .filter(Boolean)
        .map(parte => {

            const partes =
                parte.match(/^(\d+)\s*x\s+(.+)$/i);

            if(!partes) return { quantidade: 1, patrimonio: parte };

            return {
                quantidade: Math.max(1, Number(partes[1])),
                patrimonio: partes[2].trim()
            };
        });
}


// Modelo a partir do patrimônio: 3 letras + altura (WAE18R001 -> WAE18,
// WTE14L076 -> WTE14, WAD16060 -> WAD16). Mesma regra do estoque.
function modeloDaPlataforma(plataforma){

    const texto =
        String(plataforma || "").trim().toUpperCase();

    const partes =
        texto.match(/^([A-Z]+?)(\d+)/);

    if(!partes) return texto;

    const digitos = partes[2];

    return partes[1] + (
        digitos.length > 2
            ? digitos.slice(0, 2)
            : digitos
    );
}
