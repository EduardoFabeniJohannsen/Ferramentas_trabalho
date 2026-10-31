// ======================================
// AGENDA - ATUALIZAÇÃO EM TEMPO REAL
// ======================================
// Quem grava avisa os outros navegadores pelo canal de avisos do Supabase e cada
// um recarrega a lista. O aviso não leva dado nenhum: cada um lê do banco o que
// pode ver. (O aviso direto do banco não serviria: quem não é admin não vê mais o
// agendamento que foi para a lixeira, então não seria avisado da exclusão.)
// Não recarrega enquanto a pessoa está mexendo na tela: espera ela terminar.
// Carregar antes de agenda-init.js.

// junta vários avisos seguidos numa recarga só
const ATRASO_RECARGA_VIVA_MS = 800;

// tela ocupada: tenta de novo depois disso
const RETENTAR_RECARGA_VIVA_MS = 2000;

// aviso perdido (sem internet, por exemplo) se resolve nesse tempo
const RECARGA_SEGURANCA_MS = 5 * 60 * 1000;

let timerRecargaViva = null;

let recargaVivaAndando = false;

// mudou algo durante a recarga ou com a aba escondida: falta recarregar
let recargaPendente = false;

let tempoRealJaConectou = false;


// formulário ou janela aberta, coluna sendo arrastada ou status sendo trocado:
// redesenhar agora atrapalharia
function agendaOcupada(){

    const emFoco = document.activeElement;

    return (
        !!document.querySelector(".modal-overlay.aberto") ||
        !!colunaArrastada ||
        !!document.querySelector(".ag-redimensiona.ativo") ||
        (
            !!emFoco &&
            emFoco.tagName === "SELECT" &&
            $("listaAgenda").contains(emFoco)
        )
    );
}


function agendarRecargaViva(atraso = ATRASO_RECARGA_VIVA_MS){

    if(timerRecargaViva) return;

    timerRecargaViva = setTimeout(executarRecargaViva, atraso);
}


async function executarRecargaViva(){

    timerRecargaViva = null;

    if(recargaVivaAndando || document.hidden){

        recargaPendente = true;

        return;
    }

    if(agendaOcupada()){

        agendarRecargaViva(RETENTAR_RECARGA_VIVA_MS);

        return;
    }

    recargaVivaAndando = true;

    recargaPendente = false;

    const lista = $("listaAgenda");

    const rolagemLista = lista.scrollLeft;

    const rolagemPagina = window.scrollY;

    try{

        await recarregarAgenda(false);

        lista.scrollLeft = rolagemLista;

        window.scrollTo(window.scrollX, rolagemPagina);

    }finally{

        recargaVivaAndando = false;
    }

    if(recargaPendente){

        recargaPendente = false;

        agendarRecargaViva();
    }
}


// chamada depois de gravar. A lista desta tela já foi atualizada na hora; se tinha
// uma recarga no meio do caminho, ela pode trazer dados de antes desta gravação.
function avisarMudancaNaAgenda(){

    if(recargaVivaAndando) recargaPendente = true;

    avisarAgendaMudou();
}


function iniciarTempoReal(){

    canalAgenda()
        .on(
            "broadcast",
            { event: EVENTO_AGENDA_MUDOU },
            () => agendarRecargaViva()
        )
        .subscribe(estado => {

            if(estado !== "SUBSCRIBED") return;

            // reconectou: pode ter perdido avisos enquanto estava fora
            if(tempoRealJaConectou) agendarRecargaViva();

            tempoRealJaConectou = true;
        });

    document.addEventListener("visibilitychange", () => {

        if(document.hidden || !recargaPendente) return;

        recargaPendente = false;

        agendarRecargaViva();
    });

    setInterval(
        () => {

            if(!document.hidden) agendarRecargaViva();
        },
        RECARGA_SEGURANCA_MS
    );
}
