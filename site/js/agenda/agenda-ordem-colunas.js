// ======================================
// AGENDA - ORDENAR CLICANDO NO TÍTULO (só no transportador)
// ======================================
// Como no Excel: clicar no título de uma coluna ordena por ela (▲), de novo
// inverte (▼) e na terceira volta para a ordem normal (por data e horário).
// Horário ▼ = dias mais recentes primeiro, ainda separados por dia. Qualquer
// outra coluna ordena a lista inteira (sem a separação por dia; a data aparece
// junto do horário). Vazio fica sempre no fim. O empate segue a ordem normal.
// Fica salvo por usuário. Carregar depois de agenda-ordem.js e antes de agenda-init.js.

const CHAVE_AGENDA_ORDEM_COLUNA = "agendaOrdemColuna";

// { id: "" (ordem normal) ou o id da coluna, direcao: 1 (▲) ou -1 (▼) }
let ordemColuna = { id: "", direcao: 1 };


const ROTULOS_FRETE_CONTA = {
    nossa: "Nossa conta",
    cliente: "Conta do cliente",
    dividido: "Dividido"
};

// valor de cada coluna para ordenar: texto, número ou vazio ("" / null)
const CHAVES_ORDEM_COLUNA = {
    tipo: (item) => rotuloTipo(item.tipo),
    titulo: (item) => [item.plataforma, item.cliente].filter(Boolean).join(" — "),
    transportadora: (item) => item.transportadora,
    motorista: (item) => item.motorista,
    periodo: (item) => item.periodo,
    // na ordem do seletor (A confirmar, Confirmado, Em rota...), não alfabética
    status: (item) => {
        const posicao = STATUS_AGENDA.indexOf(item.status);
        return posicao === -1 ? null : posicao;
    },
    retirada: (item) => origemNomeDaTela(item) || item.origemEndereco,
    entrega: (item) => destinoNomeDaTela(item) || item.destinoEndereco,
    cidade: (item) => cidadeDoEndereco(item.destinoEndereco),
    // no transportador a Observação é a de entrega
    obs: (item) => item.obsEntrega,
    contato: (item) => item.contato,
    obsEntrega: (item) => item.obsEntrega,
    referencia: (item) => item.referencia,
    frete: (item) => {
        const valor = brToNumber(item.frete);
        return Number.isFinite(valor) && valor > 0 ? valor : null;
    },
    freteConta: (item) => ROTULOS_FRETE_CONTA[item.freteConta] || ROTULOS_FRETE_CONTA.nossa,
    card: (item) => item.card,
    emails: (item) => item.emails,
    pagamento: (item) => item.formaPagamento,
    pedido: (item) => item.pedidoCompra ? (item.pedidoNumero || "Sim") : "",
    vendedor: (item) => item.vendedor,
    proposta: (item) => item.proposta
};


function chaveOrdemColuna(){

    return `${CHAVE_AGENDA_ORDEM_COLUNA}:${usuarioAgenda || "local"}`;
}


function carregarOrdemColuna(){

    const salva = lerLocalJSON(chaveOrdemColuna(), null);

    const valida =
        salva &&
        typeof salva === "object" &&
        (salva.id === "horario" || Object.hasOwn(CHAVES_ORDEM_COLUNA, salva.id)) &&
        (salva.direcao === 1 || salva.direcao === -1);

    ordemColuna = valida ? { id: salva.id, direcao: salva.direcao } : { id: "", direcao: 1 };
}


function salvarOrdemColuna(){

    gravarLocalJSON(chaveOrdemColuna(), ordemColuna);
}


// a ordem escolhida, se vale agora: só no transportador e com a coluna à mostra
function ordemColunaAtiva(){

    if(modoVisualizacao !== "transportador" || !ordemColuna.id) return null;

    if(!colunasAtuais().some(coluna => coluna.id === ordemColuna.id)) return null;

    // Horário ▲ é a própria ordem normal
    if(ordemColuna.id === "horario" && ordemColuna.direcao === 1) return null;

    return ordemColuna;
}


// separa por dia (cabeçalho de cada data) na ordem normal e no Horário ▼
function agrupaPorDia(){

    const ativa = ordemColunaAtiva();

    return !ativa || ativa.id === "horario";
}


// 1 = dias em ordem; -1 = mais recentes primeiro (Horário ▼)
function sentidoDasDatas(){

    const ativa = ordemColunaAtiva();

    return ativa && ativa.id === "horario" ? -1 : 1;
}


const vazioNaOrdem = (valor) => valor === null || valor === undefined || valor === "";


function compararValoresOrdem(a, b){

    if(typeof a === "number" && typeof b === "number") return a - b;

    return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
}


// recebe a lista já na ordem normal: o sort é estável, então o empate fica nela
function ordenarPorColuna(lista){

    const ativa = ordemColunaAtiva();

    if(!ativa || ativa.id === "horario") return lista;

    const chave = CHAVES_ORDEM_COLUNA[ativa.id];

    const valores = new Map(lista.map(item => [item, chave(item)]));

    return lista.sort((a, b) => {

        const valorA = valores.get(a);

        const valorB = valores.get(b);

        const vazioA = vazioNaOrdem(valorA);

        const vazioB = vazioNaOrdem(valorB);

        // vazio sempre no fim, nos dois sentidos (como no Excel)
        if(vazioA || vazioB) return vazioA === vazioB ? 0 : (vazioA ? 1 : -1);

        return compararValoresOrdem(valorA, valorB) * ativa.direcao;
    });
}


// clique no título: ▲ -> ▼ -> ordem normal. No Horário a ordem normal já é
// o ▲, então vai direto para o ▼.
function alternarOrdemColuna(id){

    if(modoVisualizacao !== "transportador") return;

    const atual = ordemColunaAtiva();

    if(!atual || atual.id !== id){

        ordemColuna = { id, direcao: id === "horario" ? -1 : 1 };

    }else if(atual.direcao === 1){

        ordemColuna = { id, direcao: -1 };

    }else{

        ordemColuna = { id: "", direcao: 1 };
    }

    salvarOrdemColuna();

    renderizarAgenda();
}


function voltarOrdemNormal(){

    ordemColuna = { id: "", direcao: 1 };

    salvarOrdemColuna();

    renderizarAgenda();
}


// "▲" / "▼" no título da coluna ordenada (vazio nas outras)
function setaOrdemColuna(id){

    const ativa = ordemColunaAtiva();

    if(!ativa || ativa.id !== id) return "";

    return ativa.direcao === 1 ? "▲" : "▼";
}


// "Frete (maior primeiro)", "Transportadora (Z → A)", "Horário (mais recentes primeiro)"
function textoOrdemColuna(){

    const ativa = ordemColunaAtiva();

    if(!ativa) return "";

    const coluna = colunasAtuais().find(item => item.id === ativa.id);

    let sentido;

    if(ativa.id === "horario"){

        sentido = "dias mais recentes primeiro";

    }else if(ativa.id === "frete"){

        sentido = ativa.direcao === 1 ? "menor primeiro" : "maior primeiro";

    }else if(ativa.id === "status"){

        sentido = ativa.direcao === 1 ? "na ordem do status" : "na ordem inversa do status";

    }else{

        sentido = ativa.direcao === 1 ? "A → Z" : "Z → A";
    }

    return `${coluna ? coluna.titulo : ativa.id} (${sentido})`;
}


// linha da contagem: "· Ordenado por Frete (maior primeiro)" e o botão de voltar;
// o select "ordem dentro de cada data" não vale sem a separação por dia
function atualizarAvisoOrdemColuna(){

    const texto = textoOrdemColuna();

    $("resumoOrdem").innerText = texto ? `· Ordenado por ${texto}` : "";

    $("btnOrdemNormal").style.display = texto ? "" : "none";

    const select = $("ordemAgenda");

    select.disabled = !agrupaPorDia();

    select.title =
        select.disabled
            ? "A lista está ordenada pela coluna. Para voltar, clique no título dela até sumir a seta, ou em ↺ Ordem normal."
            : "Ordem dentro de cada data";
}


// sem a separação por dia, a data vai junto do horário: "seg 13/11"
function textoDataNaLinha(iso){

    if(!iso) return "";

    const data = new Date(iso + "T00:00:00");

    const semana =
        data.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

    return `${semana} ${formatarData(data).slice(0, 5)}`;
}
