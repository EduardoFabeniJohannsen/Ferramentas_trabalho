// ======================================
// TRAVA DE APARELHOS
// ======================================
// Em toda página menos o login, antes do auth-guard: o auth-guard chama
// conferirDispositivo() depois de liberar a página. O banco (registrar_dispositivo)
// responde se este aparelho (a chave de supabase-config.js) está liberado:
// - liberado: segue normal (o admin sempre);
// - pendente: aparelho novo esperando o admin. A página fica escondida, aparece
//   só "Aguardando liberação" (e o Sair) e confere de novo sozinho a cada 15 s;
// - bloqueado: o admin desconectou este aparelho: sai do login.
// Quem protege de verdade é o banco (tem_acesso confere o aparelho); esta tela
// só explica o que está acontecendo. Sem a função no banco ou sem internet,
// segue normal.

const ESPERA_CONFERIR_PENDENTE_MS = 15000;

// com a página aberta: o admin pode desconectar a qualquer momento
const INTERVALO_CONFERIR_DISPOSITIVO_MS = 2 * 60 * 1000;

const TIPOS_DISPOSITIVO = { celular: "Celular", tablet: "Tablet", computador: "Computador" };

let conferenciaDispositivoLigada = false;


// os scripts da página terminaram de carregar (o presenca.js vem depois deste)
function esperarScriptsDaPagina(){

    if(document.readyState !== "loading") return Promise.resolve();

    return new Promise(pronto =>
        document.addEventListener("DOMContentLoaded", pronto, { once: true })
    );
}


// "Computador · Windows · Chrome" (descreverAparelho vem do presenca.js; a
// página de login não tem: vai o texto do navegador)
function descricaoDoDispositivo(){

    if(typeof descreverAparelho !== "function"){

        return String(navigator.userAgent || "").slice(0, 120);
    }

    const info = descreverAparelho(navigator.userAgent || "", "", navigator.maxTouchPoints || 0);

    return [TIPOS_DISPOSITIVO[info.tipo] || info.tipo, info.aparelho, info.navegador]
        .filter(Boolean)
        .join(" · ");
}


// 'liberado', 'pendente' ou 'bloqueado'; erro (função não existe, sem rede): 'liberado'
async function situacaoDoDispositivo(){

    try{

        await esperarScriptsDaPagina();

        const { data, error } =
            await supabaseClient.rpc("registrar_dispositivo", {
                p_chave: CHAVE_DISPOSITIVO,
                p_aparelho: descricaoDoDispositivo()
            });

        if(error){

            console.warn("[aparelho] Não deu para conferir o aparelho:", error.message || error);

            return "liberado";
        }

        return ["pendente", "bloqueado"].includes(data) ? data : "liberado";

    }catch(erro){

        console.warn("[aparelho] Não deu para conferir o aparelho:", erro);

        return "liberado";
    }
}


async function sairPorAparelhoBloqueado(){

    await sairDoSistema(
        "Este aparelho foi desconectado pelo administrador. Fale com ele para liberar de novo."
    );
}


// ======================================
// AVISO: AGUARDANDO LIBERAÇÃO
// ======================================
// Só o aviso e o "Sair" (para entrar com outro login). Não pede nada à pessoa:
// o admin vê o aparelho na lista e, se quiser, dá um nome pelo ✏️.

function mostrarAvisoPendente(){

    if(document.getElementById("avisoDispositivo")) return;

    const fundo = document.createElement("div");

    fundo.id = "avisoDispositivo";

    fundo.className = "aviso-dispositivo";

    const card = document.createElement("div");

    card.className = "aviso-dispositivo-card";

    const titulo = document.createElement("h2");

    titulo.textContent = "🔒 Aguardando liberação";

    const sair = document.createElement("button");

    sair.type = "button";

    sair.className = "btn-sair-dispositivo";

    sair.textContent = "Sair";

    sair.addEventListener("click", fazerLogout);

    card.append(titulo, sair);

    fundo.appendChild(card);

    document.body.appendChild(fundo);

    // a página continua escondida embaixo; quando o admin liberar, ela abre sozinha
    setInterval(async () => {

        const situacao = await situacaoDoDispositivo();

        if(situacao === "liberado") window.location.reload();

        if(situacao === "bloqueado") sairPorAparelhoBloqueado();

    }, ESPERA_CONFERIR_PENDENTE_MS);
}


// ======================================
// CONFERIR (chamado pelo auth-guard)
// ======================================

// true = pode mostrar a página
async function conferirDispositivo(){

    const situacao = await situacaoDoDispositivo();

    if(situacao === "liberado"){

        ligarConferenciaDispositivo();

        return true;
    }

    if(situacao === "bloqueado"){

        await sairPorAparelhoBloqueado();

        return false;
    }

    mostrarAvisoPendente();

    return false;
}


// página aberta: confere de tempos em tempos e ao voltar para a aba
function ligarConferenciaDispositivo(){

    if(conferenciaDispositivoLigada) return;

    conferenciaDispositivoLigada = true;

    const conferir = async () => {

        const situacao = await situacaoDoDispositivo();

        if(situacao === "bloqueado") return sairPorAparelhoBloqueado();

        // o admin voltou o aparelho para pendente: recarrega e cai no aviso
        if(situacao === "pendente") window.location.reload();
    };

    setInterval(conferir, INTERVALO_CONFERIR_DISPOSITIVO_MS);

    document.addEventListener("visibilitychange", () => {

        if(document.visibilityState === "visible") conferir();
    });
}
