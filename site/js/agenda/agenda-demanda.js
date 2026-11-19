// ======================================
// AGENDA - DEMANDA (botão 📦 Demanda)
// ======================================
// Janela com o total de máquinas de cada modelo que saem para os clientes num período (não é por entrega), para saber quantas comprar. Período em De/Até com atalhos (esta semana, próxima, este mês, próximo; abre na próxima semana), na agenda toda, sem os filtros da lista. Avisos (entrega sem data, período antes dos dias carregados, estoque fora do ar), a data de publicação do estoque e o 📋 Copiar para o Zap. A tabela fica em agenda-demanda-tabela.js e as contas em agenda-demanda-calculo.js. Carregar depois deles e de agenda-estoque-dados.js.

// as filiais do último estoque publicado; null = carregando
let estoqueDaDemanda = null;

let falhaEstoqueDemanda = "";

// conta as aberturas: o estoque que chega de uma abertura antiga é ignorado
let aberturaDemanda = 0;

// modelos com os agendamentos à vista
const modelosAbertosDemanda = new Set();


function abrirDemandaAgenda(){

    $("modalDemanda").classList.add("aberto");

    // da segunda vez, continua no período escolhido
    if(!$("demandaDe").value || !$("demandaAte").value){

        const { de, ate } = periodoDemanda("proxima-semana");

        $("demandaDe").value = de;

        $("demandaAte").value = ate;
    }

    desenharDemandaAgenda();

    carregarEstoqueDemanda();
}


function fecharDemandaAgenda(){

    $("modalDemanda").classList.remove("aberto");
}


async function carregarEstoqueDemanda(){

    const abertura = ++aberturaDemanda;

    estoqueDaDemanda = null;

    falhaEstoqueDemanda = "";

    try{

        const filiais = await carregarEstoqueDisponivel();

        if(abertura !== aberturaDemanda) return;

        estoqueDaDemanda = filiais;

    }catch(erro){

        if(abertura !== aberturaDemanda) return;

        console.error("[agenda] Demanda: falha ao consultar o estoque:", detalhesErro(erro));

        estoqueDaDemanda = [];

        falhaEstoqueDemanda =
            erro?.code === "PGRST202"
                ? "O estoque não aparece: falta criar a função estoque_disponiveis no Supabase."
                : "Não foi possível consultar o estoque (confira a conexão).";
    }

    desenharDemandaAgenda();
}


// data-clique dos atalhos
function escolherPeriodoDemanda(atalho){

    const { de, ate } = periodoDemanda(String(atalho));

    $("demandaDe").value = de;

    $("demandaAte").value = ate;

    desenharDemandaAgenda();
}


// o atalho que bate com as datas fica marcado
function marcarAtalhoDemanda(de, ate){

    document.querySelectorAll("#modalDemanda [data-clique='escolherPeriodoDemanda']").forEach(botao => {

        const periodo = periodoDemanda(String(botao.dataset.arg));

        botao.classList.toggle("ativo", periodo.de === de && periodo.ate === ate);
    });
}


function avisosDemanda(demanda, de, ate){

    const avisos = [];

    // a agenda só carrega os últimos DIAS_PASSADOS_AGENDA dias (agenda-banco.js)
    const inicioAgenda = dataISO(-DIAS_PASSADOS_AGENDA);

    if(de < inicioAgenda){

        avisos.push(`A agenda só tem os agendamentos a partir de ${dataBR(inicioAgenda)}: antes disso a conta fica incompleta.`);
    }

    if(demanda.semData){

        avisos.push(`${demanda.semData} entrega(s) sem data não entram na conta.`);
    }

    if(falhaEstoqueDemanda) avisos.push(falhaEstoqueDemanda);

    return avisos;
}


// a data de publicação de cada filial (destaque se antiga, como na 🔍)
function desenharDataEstoqueDemanda(){

    const area = $("estoqueDataDemanda");

    area.innerHTML = "";

    (estoqueDaDemanda || []).forEach(filial => {

        const linha = criar("div", "estoque-filial demanda-estoque-data");

        const data = criarDataEstoque(filial.atualizado_em);

        data.prepend(`${NOMES_FILIAIS_ESTOQUE[filial.filial_id] || "Filial " + filial.filial_id}: `);

        linha.appendChild(data);

        area.appendChild(linha);
    });
}


function desenharDemandaAgenda(){

    const de = $("demandaDe").value;

    const ate = $("demandaAte").value;

    const area = $("tabelaDemanda");

    const avisos = $("avisosDemanda");

    area.innerHTML = "";

    avisos.innerHTML = "";

    marcarAtalhoDemanda(de, ate);

    desenharDataEstoqueDemanda();

    if(!de || !ate || de > ate){

        $("resumoDemanda").textContent = "";

        area.appendChild(criar("p", "agenda-vazia", "Escolha o período: a data inicial não pode passar da final."));

        return;
    }

    const demanda = demandaPorModelo(agendamentos, de, ate);

    avisosDemanda(demanda, de, ate).forEach(texto => avisos.appendChild(criar("p", "aviso-demanda", "⚠️ " + texto)));

    $("resumoDemanda").textContent =
        `${demanda.total.saem} máquina(s) saem em ${demanda.total.entregas} entrega(s) · ${dataBR(de).slice(0, 5)} a ${dataBR(ate).slice(0, 5)}`;

    if(!demanda.modelos.length){

        area.appendChild(criar("p", "agenda-vazia", "Nenhuma entrega, troca técnica ou coleta no período."));

        return;
    }

    area.appendChild(tabelaDemanda(demanda));
}


function copiarDemandaAgenda(){

    const de = $("demandaDe").value;

    const ate = $("demandaAte").value;

    if(!de || !ate || de > ate) return mostrarToast("Escolha o período antes de copiar", true);

    copiar(textoDemanda(demandaPorModelo(agendamentos, de, ate), de, ate), "Demanda copiada");
}
