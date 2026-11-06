// ======================================
// ATUALIZAÇÃO AUTOMÁTICA DO SISTEMA
// ======================================
// Publicou versão nova: cada página aberta percebe sozinha, renova os arquivos
// guardados no navegador (o GitHub Pages manda guardar por 10 minutos, é por isso
// que era preciso CTRL+SHIFT+R) e recarrega. Se a pessoa estiver no meio de algo,
// avisa e espera ela terminar. A versão publicada é lida do próprio helpers.js,
// então trocar VERSAO_SISTEMA continua sendo o único passo. Carregar depois de
// helpers.js.

const INTERVALO_VERIFICAR_VERSAO_MS = 2 * 60 * 1000;

// estava ocupada: olha de novo depois disso
const RETENTAR_ATUALIZACAO_MS = 15000;

// sem mexer na página por esse tempo, pode recarregar
const TEMPO_PARADO_PARA_ATUALIZAR_MS = 60000;

// versão que esta aba já tentou carregar (evita recarregar sem parar)
const CHAVE_TENTATIVA_ATUALIZACAO = "sistemaTentativaAtualizacao";

// versão nova encontrada ("" = está em dia)
let versaoNoServidor = "";

let atualizandoSistema = false;

let timerAtualizacao = null;

let ultimaAtividadeUsuario = 0;


function lerTentativaAtualizacao(){

    try{

        return sessionStorage.getItem(CHAVE_TENTATIVA_ATUALIZACAO) || "";

    }catch(erro){

        return "";
    }
}


function gravarTentativaAtualizacao(versao){

    try{

        if(versao){

            sessionStorage.setItem(CHAVE_TENTATIVA_ATUALIZACAO, versao);

        }else{

            sessionStorage.removeItem(CHAVE_TENTATIVA_ATUALIZACAO);
        }

    }catch(erro){

        console.error("[versão] Erro ao guardar a tentativa:", erro);
    }
}


// "" = não deu pra saber (sem internet, por exemplo): fica como está
async function lerVersaoPublicada(endereco, modoCache){

    const resposta = await fetch(endereco, { cache: modoCache });

    if(!resposta.ok) return "";

    const achou =
        (await resposta.text()).match(/VERSAO_SISTEMA\s*=\s*"([^"]+)"/);

    return achou ? achou[1] : "";
}


// recarregar agora perderia algo que ainda não foi salvo?
function temTrabalhoAberto(){

    return (
        // formulários e janelas (a agenda guarda rascunho, mas a pessoa está ali)
        !!document.querySelector(".modal-overlay.aberto") ||
        // estoque: prévia ainda não publicada
        (typeof previaAtual !== "undefined" && !!previaAtual) ||
        // agenda gravando
        (typeof salvandoAgendamento !== "undefined" && salvandoAgendamento) ||
        // página inicial: texto no conversor
        (!!$("texto") && !!$("texto").value.trim()) ||
        // tabelas: linha nova digitada e ainda não adicionada
        Array.from(document.querySelectorAll(".linha-nova input"))
            .some(campo => campo.value.trim())
    );
}


function paginaOcupada(){

    return (
        temTrabalhoAberto() ||
        (
            !document.hidden &&
            Date.now() - ultimaAtividadeUsuario < TEMPO_PARADO_PARA_ATUALIZAR_MS
        )
    );
}


function esconderAvisoNovaVersao(){

    const aviso = $("avisoNovaVersao");

    if(aviso) aviso.remove();
}


function mostrarAvisoNovaVersao(texto, comBotao){

    esconderAvisoNovaVersao();

    const aviso = document.createElement("div");

    aviso.id = "avisoNovaVersao";

    aviso.className = "aviso-nova-versao";

    const mensagem = document.createElement("span");

    mensagem.textContent = texto;

    aviso.appendChild(mensagem);

    if(comBotao){

        const botao = document.createElement("button");

        botao.type = "button";

        botao.textContent = "Atualizar agora";

        botao.addEventListener("click", aplicarAtualizacao);

        aviso.appendChild(botao);
    }

    document.body.appendChild(aviso);
}


async function aplicarAtualizacao(){

    if(atualizandoSistema || !versaoNoServidor) return;

    // já recarregou por esta versão e o navegador não pegou os arquivos novos:
    // tentar de novo só faria a página recarregar sem parar
    if(lerTentativaAtualizacao() === versaoNoServidor){

        mostrarAvisoNovaVersao(
            `Nova versão do sistema (v${versaoNoServidor}). Aperte CTRL+SHIFT+R para atualizar.`,
            false
        );

        return;
    }

    atualizandoSistema = true;

    try{

        // o arquivo novo pode demorar a chegar em todos os servidores do
        // GitHub: só recarrega quando ele vier mesmo (senão tenta na próxima)
        const renovada = await lerVersaoPublicada("js/helpers.js", "reload");

        if(renovada !== versaoNoServidor) return;

        const arquivos =
            [
                location.href.split("#")[0],
                ...Array.from(document.scripts).map(script => script.src),
                ...Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
                    .map(link => link.href)
            ]
                .filter(endereco =>
                    endereco && new URL(endereco).origin === location.origin
                );

        await Promise.all(
            [...new Set(arquivos)].map(endereco =>
                fetch(endereco, { cache: "reload" }).catch(() => null)
            )
        );

        gravarTentativaAtualizacao(versaoNoServidor);

        location.reload();

    }catch(erro){

        console.error("[versão] Falha ao atualizar:", erro);

    }finally{

        atualizandoSistema = false;
    }
}


function tentarAtualizar(){

    clearTimeout(timerAtualizacao);

    if(!versaoNoServidor) return;

    if(paginaOcupada()){

        mostrarAvisoNovaVersao(
            `Nova versão do sistema (v${versaoNoServidor}). A página atualiza sozinha quando você terminar o que está fazendo.`,
            true
        );

        timerAtualizacao = setTimeout(tentarAtualizar, RETENTAR_ATUALIZACAO_MS);

        return;
    }

    aplicarAtualizacao();
}


async function verificarVersaoSistema(){

    let publicada = "";

    try{

        // o ?v= fura também o cache dos servidores do GitHub
        publicada =
            await lerVersaoPublicada(`js/helpers.js?v=${Date.now()}`, "no-store");

    }catch(erro){

        return;
    }

    if(!publicada) return;

    if(publicada === VERSAO_SISTEMA){

        versaoNoServidor = "";

        clearTimeout(timerAtualizacao);

        esconderAvisoNovaVersao();

        return;
    }

    versaoNoServidor = publicada;

    tentarAtualizar();
}


(function iniciarAtualizacaoSistema(){

    // acabou de recarregar pela versão nova
    if(lerTentativaAtualizacao() === VERSAO_SISTEMA){

        gravarTentativaAtualizacao("");

        mostrarToast(`Sistema atualizado para v${VERSAO_SISTEMA}`);
    }

    ["keydown", "pointerdown", "input", "wheel"].forEach(evento => {

        document.addEventListener(
            evento,
            () => { ultimaAtividadeUsuario = Date.now(); },
            { capture: true, passive: true }
        );
    });

    document.addEventListener("visibilitychange", () => {

        if(!document.hidden) verificarVersaoSistema();
    });

    setInterval(verificarVersaoSistema, INTERVALO_VERIFICAR_VERSAO_MS);

    verificarVersaoSistema();

})();
