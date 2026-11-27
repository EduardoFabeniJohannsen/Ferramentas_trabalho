// ======================================
// MINHAS ENTREGAS - DADOS
// ======================================
// Lê as entregas do motorista do login pela função entregas_motorista (o motorista não lê a tabela agendamentos: a função devolve só os agendamentos com o nome dele, dos últimos 7 dias em diante, sem frete, card, e-mails, pagamento nem proposta). O admin escolhe de qual motorista ver (lista da tabela motoristas, guardada no aparelho). Recarrega quando a agenda avisa que mudou (o mesmo canal da agenda-tempo-real.js), ao voltar para a aba e a cada 5 min. Falhou com uma lista na tela: ela fica e aparece o aviso.


const FUNCAO_ENTREGAS_MOTORISTA = "entregas_motorista";

// o motorista escolhido pelo admin no "Ver como" (localStorage)
const CHAVE_VER_COMO_MOTORISTA = "motoristaVerComo";

// junta vários avisos seguidos da agenda numa recarga só
const ATRASO_RECARGA_MOTORISTA_MS = 800;

// ao voltar para a aba, recarrega se passou mais que isso
const INTERVALO_VOLTA_MOTORISTA_MS = 30000;

// com a aba à vista, recarrega sozinho (aviso perdido, sem internet)
const RECARGA_PERIODICA_MOTORISTA_MS = 5 * 60 * 1000;


// { motorista: { id, nome, transportadora } | null, entregas: [...] } da última carga boa
let dadosMotorista = null;

// "" | "carregando" | "erro" | "sem-sql"
let situacaoMotorista = "carregando";

let ultimaCargaMotorista = 0;

let cargaMotoristaAndando = null;

let recargaMotoristaPendente = false;

let timerRecargaMotorista = null;

// admin: [{ id, transportadora, nome }] para o "Ver como"
let motoristasVerComo = [];

let adminNaPaginaMotorista = false;


// a função ainda não existe no banco (SQL do login de motorista não aplicado)
function faltaFuncaoMotorista(erro){

    return ["PGRST202", "42883"].includes(erro?.code) ||
        /could not find the function|entregas_motorista/i.test(String(erro?.message || ""));
}


function verComoMotorista(){

    const id = Number(lerLocal(CHAVE_VER_COMO_MOTORISTA));

    return Number.isFinite(id) && id > 0 ? id : null;
}


async function carregarEntregasMotorista(){

    // já está carregando: carrega de novo quando esta terminar (a agenda pode
    // ter mudado depois de a consulta sair)
    if(cargaMotoristaAndando){

        recargaMotoristaPendente = true;

        return cargaMotoristaAndando;
    }

    cargaMotoristaAndando = (async () => {

        situacaoMotorista = "carregando";

        $("btnAtualizarMotorista").disabled = true;

        desenharMotorista();

        try{

            // admin sem motorista escolhido: nada para pedir ao banco
            if(adminNaPaginaMotorista && !verComoMotorista()){

                dadosMotorista = { motorista: null, entregas: [] };

            }else{

                const { data, error } =
                    await supabaseClient.rpc(
                        FUNCAO_ENTREGAS_MOTORISTA,
                        adminNaPaginaMotorista ? { p_motorista_id: verComoMotorista() } : {}
                    );

                if(error) throw error;

                dadosMotorista = {
                    motorista: data?.motorista || null,
                    entregas: Array.isArray(data?.entregas) ? data.entregas : []
                };
            }

            situacaoMotorista = "";

            ultimaCargaMotorista = Date.now();

        }catch(erro){

            situacaoMotorista = faltaFuncaoMotorista(erro) ? "sem-sql" : "erro";

            console.error("[motorista] Falha ao carregar as entregas:", erro);

            if(dadosMotorista) mostrarToast("Não deu para atualizar as entregas: confira a internet", true);

        }finally{

            $("btnAtualizarMotorista").disabled = false;

            desenharMotorista();
        }
    })();

    try{

        await cargaMotoristaAndando;

    }finally{

        cargaMotoristaAndando = null;
    }

    if(recargaMotoristaPendente){

        recargaMotoristaPendente = false;

        await carregarEntregasMotorista();
    }
}


// ======================================
// ADMIN: VER COMO O MOTORISTA
// ======================================

async function prepararVerComoMotorista(){

    $("motoristaVerComo").hidden = false;

    try{

        const { data, error } =
            await supabaseClient
                .from("motoristas")
                .select("id, transportadora, nome")
                .order("nome");

        if(error) throw error;

        motoristasVerComo = data || [];

    }catch(erro){

        console.error("[motorista] Falha ao carregar os motoristas:", erro);

        motoristasVerComo = [];

        mostrarToast("Falha ao carregar os motoristas", true);
    }

    const select = $("motoristaVerComoSelect");

    const nenhum = criar("option", "", "Escolha o motorista");

    nenhum.value = "";

    select.replaceChildren(
        nenhum,
        ...motoristasVerComo.map(motorista => {

            const opcao = criar("option", "", [motorista.nome, motorista.transportadora].filter(Boolean).join(" · "));

            opcao.value = String(motorista.id);

            return opcao;
        })
    );

    const escolhido = verComoMotorista();

    select.value = escolhido && motoristasVerComo.some(motorista => motorista.id === escolhido) ? String(escolhido) : "";

    if(!select.value) removerLocal(CHAVE_VER_COMO_MOTORISTA);
}


function trocarVerComoMotorista(){

    const valor = $("motoristaVerComoSelect").value;

    if(valor) gravarLocal(CHAVE_VER_COMO_MOTORISTA, valor);

    else removerLocal(CHAVE_VER_COMO_MOTORISTA);

    dadosMotorista = null;

    carregarEntregasMotorista();
}


// ======================================
// RECARGA SOZINHA
// ======================================

function agendarRecargaMotorista(atraso = ATRASO_RECARGA_MOTORISTA_MS){

    clearTimeout(timerRecargaMotorista);

    timerRecargaMotorista = setTimeout(() => {

        timerRecargaMotorista = null;

        if(!document.hidden) carregarEntregasMotorista();

    }, atraso);
}


function iniciarRecargaMotorista(){

    // o aviso não leva dado nenhum: cada um lê do banco o que pode ver
    canalAgenda()
        .on("broadcast", { event: EVENTO_AGENDA_MUDOU }, () => agendarRecargaMotorista())
        .subscribe();

    document.addEventListener("visibilitychange", () => {

        if(!document.hidden && Date.now() - ultimaCargaMotorista > INTERVALO_VOLTA_MOTORISTA_MS){

            agendarRecargaMotorista(0);
        }
    });

    setInterval(() => {

        if(!document.hidden) carregarEntregasMotorista();

    }, RECARGA_PERIODICA_MOTORISTA_MS);
}
