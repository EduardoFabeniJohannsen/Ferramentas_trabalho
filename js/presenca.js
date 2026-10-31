// ======================================
// PRESENÇA - QUEM ESTÁ USANDO O SISTEMA
// ======================================
// Cada página aberta informa em qual página a pessoa está e se está usando,
// parada ou com a aba em segundo plano. O painel do admin (admin-online.js) lê
// isso. Não fica nada gravado: fechou a página, some. Só vai o id do usuário, a
// página e o estado (o e-mail o admin busca na tabela perfis).
// Carregar depois de helpers.js e auth-guard.js.

// sem mexer na página por esse tempo conta como parado
const LIMITE_PARADO_MS = 2 * 60 * 1000;

const INTERVALO_CONFERIR_PRESENCA_MS = 20000;

let canalPresenca = null;

// "usando", "parado" ou "oculto"
let estadoPresenca = "";

let estadoPresencaDesde = 0;

let ultimoUsoPresenca = Date.now();


function calcularEstadoPresenca(){

    if(document.hidden) return "oculto";

    return Date.now() - ultimoUsoPresenca >= LIMITE_PARADO_MS
        ? "parado"
        : "usando";
}


// só avisa quando muda (forcar = acabou de conectar ou reconectar)
function enviarPresenca(forcar){

    const estado = calcularEstadoPresenca();

    if(estado !== estadoPresenca){

        estadoPresenca = estado;

        estadoPresencaDesde = Date.now();

    }else if(!forcar){

        return;
    }

    if(!canalPresenca) return;

    canalPresenca.track({
        pagina: recursoDaPagina(nomeArquivoAtual()) || "index",
        estado,
        desde: estadoPresencaDesde
    });
}


async function iniciarPresenca(){

    const { data } = await supabaseClient.auth.getSession();

    const usuario = data?.session?.user?.id;

    if(!usuario) return;

    canalPresenca =
        supabaseClient.channel(
            "usuarios-online",
            { config: { presence: { key: usuario } } }
        );

    canalPresenca
        .on(
            "presence",
            { event: "sync" },
            () => {

                // só existe na página do admin
                if(typeof desenharUsuariosOnline === "function"){

                    desenharUsuariosOnline();
                }
            }
        )
        .subscribe(estado => {

            if(estado === "SUBSCRIBED") enviarPresenca(true);
        });

    ["keydown", "pointerdown", "pointermove", "input", "wheel"].forEach(evento => {

        document.addEventListener(
            evento,
            () => {

                ultimoUsoPresenca = Date.now();

                if(estadoPresenca === "parado") enviarPresenca();
            },
            { capture: true, passive: true }
        );
    });

    document.addEventListener("visibilitychange", () => {

        if(!document.hidden) ultimoUsoPresenca = Date.now();

        enviarPresenca();
    });

    setInterval(() => enviarPresenca(), INTERVALO_CONFERIR_PRESENCA_MS);
}


iniciarPresenca().catch(erro => {

    console.error("[presença] Falha ao iniciar:", erro);
});
