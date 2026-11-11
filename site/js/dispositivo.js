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
// a página abre normal; já na tela de espera, sem internet continua esperando.

const ESPERA_CONFERIR_PENDENTE_MS = 15000;

// com a página aberta: o admin pode desconectar a qualquer momento
const INTERVALO_CONFERIR_DISPOSITIVO_MS = 2 * 60 * 1000;

const TIPOS_DISPOSITIVO = { celular: "Celular", tablet: "Tablet", computador: "Computador" };

let conferenciaDispositivoLigada = false;


// os scripts da página terminaram de carregar (o presenca.js vem depois deste).
// Os scripts são defer: enquanto rodam, o readyState já é "interactive"; quem
// diz que todos rodaram é o DOMContentLoaded (dispara depois do último).
let scriptsDaPaginaProntos = document.readyState === "complete";

document.addEventListener("DOMContentLoaded", () => { scriptsDaPaginaProntos = true; }, { once: true });

function esperarScriptsDaPagina(){

    if(scriptsDaPaginaProntos || document.readyState === "complete") return Promise.resolve();

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


// a cidade só espera um pouco: sem resposta, o aparelho vai sem ela
const ESPERA_CIDADE_DISPOSITIVO_MS = 2000;


// "Itajaí/Santa Catarina" pelo IP (cidadeDoIP do presenca.js, guardada por 6 h).
// O admin vê antes de liberar; o IP o banco grava sozinho.
async function cidadeDoDispositivo(){

    if(typeof cidadeDoIP !== "function") return "";

    try{

        const cidade =
            await Promise.race([
                cidadeDoIP(),
                new Promise(pronto => setTimeout(() => pronto(""), ESPERA_CIDADE_DISPOSITIVO_MS))
            ]);

        return String(cidade || "");

    }catch(erro){

        return "";
    }
}


// 'liberado', 'pendente', 'bloqueado' ou 'erro' (função não existe, sem rede).
// Quem chama decide o que fazer com 'erro': ao abrir a página, segue normal;
// na tela de espera, continua esperando.
async function situacaoDoDispositivo(){

    try{

        await esperarScriptsDaPagina();

        const { data, error } =
            await supabaseClient.rpc("registrar_dispositivo", {
                p_chave: CHAVE_DISPOSITIVO,
                p_aparelho: descricaoDoDispositivo(),
                p_cidade: await cidadeDoDispositivo()
            });

        if(error){

            console.warn("[aparelho] Não deu para conferir o aparelho:", error.message || error);

            return "erro";
        }

        return ["pendente", "bloqueado"].includes(data) ? data : "liberado";

    }catch(erro){

        console.warn("[aparelho] Não deu para conferir o aparelho:", erro);

        return "erro";
    }
}


async function sairPorAparelhoBloqueado(){

    await sairDoSistema(
        "Este aparelho foi desconectado pelo administrador. Fale com ele para liberar de novo."
    );
}


// ======================================
// CÓDIGO DO APARELHO
// ======================================
// 6 letras do sha256 da chave: o mesmo que o admin vê na lista de aparelhos
// (o banco guarda esse sha256). Mesmo login em dois PCs da mesma rede: o
// admin pergunta "qual código aparece aí?" e sabe qual linha é qual.
// O código não abre nada: a chave em si nunca aparece.

async function codigoDoDispositivo(){

    try{

        // crypto.subtle só existe em https (o site publicado sempre é)
        if(!window.crypto?.subtle) return "";

        const resumo =
            await crypto.subtle.digest("SHA-256", new TextEncoder().encode(CHAVE_DISPOSITIVO));

        return Array.from(new Uint8Array(resumo), byte => byte.toString(16).padStart(2, "0"))
            .join("")
            .slice(0, 6)
            .toUpperCase();

    }catch(erro){

        return "";
    }
}


// no topo, ao lado da versão: "Aparelho A3F9C2"
async function mostrarCodigoNaTopbar(){

    const versao = document.querySelector(".topbar .versao");

    if(!versao || document.querySelector(".codigo-aparelho")) return;

    const codigo = await codigoDoDispositivo();

    if(!codigo) return;

    const marca = document.createElement("span");

    marca.className = "codigo-aparelho";

    marca.title = "Código deste aparelho (o admin vê o mesmo na lista de aparelhos)";

    marca.textContent = `Aparelho ${codigo}`;

    versao.insertAdjacentElement("afterend", marca);
}


// ======================================
// AVISO: AGUARDANDO LIBERAÇÃO
// ======================================
// Só o aviso, o código do aparelho (para o admin saber qual é) e o "Sair"
// (para entrar com outro login). Não pede nada à pessoa.

async function mostrarAvisoPendente(){

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

    card.appendChild(titulo);

    const codigo = await codigoDoDispositivo();

    if(codigo){

        const linhaCodigo = document.createElement("p");

        linhaCodigo.className = "aviso-dispositivo-codigo";

        linhaCodigo.textContent = `Código deste aparelho: ${codigo}`;

        card.appendChild(linhaCodigo);
    }

    card.appendChild(sair);

    fundo.appendChild(card);

    document.body.appendChild(fundo);

    // a página continua escondida embaixo; quando o admin liberar, ela abre sozinha.
    // 'erro' (internet caiu) não abre: continua esperando a próxima conferência
    setInterval(async () => {

        const situacao = await situacaoDoDispositivo();

        if(situacao === "liberado") window.location.reload();

        if(situacao === "bloqueado") sairPorAparelhoBloqueado();

    }, ESPERA_CONFERIR_PENDENTE_MS);
}


// ======================================
// CONFERIR (chamado pelo auth-guard)
// ======================================

// true = pode mostrar a página. situacaoJaPedida: o auth-guard já pediu a
// situação ao banco junto com o perfil (a página abre mais rápido).
// 'erro' segue normal: quem protege os dados é o banco.
async function conferirDispositivo(situacaoJaPedida){

    const situacao = await (situacaoJaPedida || situacaoDoDispositivo());

    if(situacao === "liberado" || situacao === "erro"){

        ligarConferenciaDispositivo();

        mostrarCodigoNaTopbar();

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
