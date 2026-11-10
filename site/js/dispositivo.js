// ======================================
// TRAVA DE APARELHOS
// ======================================
// Em toda página menos o login, antes do auth-guard: o auth-guard chama
// conferirDispositivo() depois de liberar a página. O banco (registrar_dispositivo)
// responde se este aparelho (a chave de supabase-config.js) está liberado:
// - liberado: segue normal (o admin sempre);
// - pendente: aparelho novo esperando o admin. A página fica escondida, aparece
//   o aviso com o campo "quem é" e confere de novo sozinho a cada 15 s;
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

function elementoAvisoDispositivo(tag, classe, texto){

    const elemento = document.createElement(tag);

    if(classe) elemento.className = classe;

    if(texto) elemento.textContent = texto;

    return elemento;
}


async function enviarNomeDispositivo(campo, status){

    const nome = campo.value.trim();

    if(!nome){

        status.textContent = "Escreva quem está usando e onde.";

        return;
    }

    const { error } =
        await supabaseClient.rpc("nomear_dispositivo", {
            p_chave: CHAVE_DISPOSITIVO,
            p_nome: nome
        });

    status.textContent =
        error
            ? "Não deu para enviar. Tente de novo."
            : "Enviado. Avise o administrador para liberar este aparelho.";
}


async function conferirDeNovoPendente(status){

    status.textContent = "Conferindo...";

    const situacao = await situacaoDoDispositivo();

    if(situacao === "liberado") return window.location.reload();

    if(situacao === "bloqueado") return sairPorAparelhoBloqueado();

    status.textContent = "Ainda não foi liberado.";
}


function mostrarAvisoPendente(email){

    if(document.getElementById("avisoDispositivo")) return;

    const fundo = elementoAvisoDispositivo("div", "aviso-dispositivo");

    fundo.id = "avisoDispositivo";

    const card = elementoAvisoDispositivo("div", "aviso-dispositivo-card");

    card.appendChild(elementoAvisoDispositivo("h2", "", "🔒 Aparelho aguardando liberação"));

    card.appendChild(elementoAvisoDispositivo(
        "p", "",
        `O login ${email || ""} só entra por aparelhos liberados pelo administrador. ` +
        "O pedido deste aparelho já foi enviado para ele."
    ));

    card.appendChild(elementoAvisoDispositivo("p", "", "Para ele saber quem é, diga quem está usando e onde:"));

    const linha = elementoAvisoDispositivo("div", "aviso-dispositivo-linha");

    const campo = elementoAvisoDispositivo("input");

    campo.id = "nomeDispositivo";

    campo.type = "text";

    campo.maxLength = 80;

    campo.placeholder = "Ex.: Maria - PC da recepção de Itajaí";

    const enviar = elementoAvisoDispositivo("button", "", "Enviar");

    enviar.type = "button";

    linha.append(campo, enviar);

    card.appendChild(linha);

    const status = elementoAvisoDispositivo("p", "aviso-dispositivo-status");

    status.id = "statusDispositivo";

    card.appendChild(status);

    const botoes = elementoAvisoDispositivo("div", "aviso-dispositivo-linha");

    const deNovo = elementoAvisoDispositivo("button", "", "Já liberaram? Conferir");

    deNovo.type = "button";

    const sair = elementoAvisoDispositivo("button", "btn-sair-dispositivo", "Sair");

    sair.type = "button";

    botoes.append(deNovo, sair);

    card.appendChild(botoes);

    fundo.appendChild(card);

    enviar.addEventListener("click", () => enviarNomeDispositivo(campo, status));

    campo.addEventListener("keydown", evento => {

        if(evento.key === "Enter") enviarNomeDispositivo(campo, status);
    });

    deNovo.addEventListener("click", () => conferirDeNovoPendente(status));

    sair.addEventListener("click", fazerLogout);

    document.body.appendChild(fundo);

    // a página continua escondida embaixo; só o aviso aparece
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

    let email = "";

    try{

        email = (await supabaseClient.auth.getSession()).data?.session?.user?.email || "";

    }catch(erro){}

    mostrarAvisoPendente(email);

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
