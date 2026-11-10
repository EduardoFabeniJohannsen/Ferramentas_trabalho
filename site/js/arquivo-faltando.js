// ======================================
// ARQUIVO QUE NÃO CARREGOU
// ======================================
// Uma falha de rede na abertura deixa a página sem um script (e sem as funções
// dele) ou sem o CSS, e ela fica quebrada até alguém recarregar. Aqui, se a página
// terminou de carregar com algum arquivo faltando, ela recarrega sozinha uma vez,
// depois de enviar o registro do erro. Não insiste: se faltar de novo logo depois,
// ou se o site não responder, mostra um aviso com "Recarregar"; sem internet,
// recarrega sozinha quando a conexão voltar. Usa a lista do registro-erros.js e
// não depende do helpers.js (ele pode ser justamente o que faltou). Carregar logo
// depois de registro-erros.js.

// recarregou sozinha há menos que isso e faltou de novo: o problema não passou
const JANELA_RECARGA_ARQUIVO_MS = 5 * 60 * 1000;

// renovar os arquivos e enviar o registro, cada um no máximo isso
const ESPERA_ANTES_DE_RECARREGAR_MS = 4000;

// quando esta aba recarregou sozinha por arquivo faltando
const CHAVE_RECARGA_ARQUIVO = "sistemaRecargaArquivoFaltando";

const TEXTO_RECARREGAR_ARQUIVO =
    "Parte do sistema não carregou. Confira a internet e clique em Recarregar.";

const TEXTO_SEM_INTERNET_ARQUIVO =
    "Sem internet: parte do sistema não carregou. A página recarrega sozinha quando a conexão voltar.";

let recarregandoPorArquivo = false;


function lerRecargaArquivo(){

    try{

        return Number(sessionStorage.getItem(CHAVE_RECARGA_ARQUIVO)) || 0;

    }catch(erro){

        return 0;
    }
}


// false = não deu para guardar: sem essa marca a página poderia recarregar sem parar
function gravarRecargaArquivo(momento){

    try{

        if(!momento){

            sessionStorage.removeItem(CHAVE_RECARGA_ARQUIVO);

            return true;
        }

        sessionStorage.setItem(CHAVE_RECARGA_ARQUIVO, String(momento));

        return lerRecargaArquivo() === momento;

    }catch(erro){

        return false;
    }
}


// o que o registro-erros.js anotou, mais a biblioteca do Supabase (js/vendor/): ela
// carrega antes do registro, então só dá para saber se ficou faltando
function listaArquivosFaltando(){

    const lista =
        typeof arquivosFaltando !== "undefined" ? [...arquivosFaltando] : [];

    const scriptSupabase =
        Array.from(document.scripts).find(script => script.src.includes("vendor/supabase"));

    if(scriptSupabase && typeof supabase === "undefined") lista.unshift(scriptSupabase.src);

    return lista;
}


function doProprioSite(endereco){

    try{

        return new URL(endereco, location.href).origin === location.origin;

    }catch(erro){

        return false;
    }
}


// undefined = passou do tempo
function esperarNoMaximo(promessa, ms){

    return Promise.race([
        promessa,
        new Promise(pronto => setTimeout(pronto, ms))
    ]);
}


// busca de novo a página e o que faltou, passando por cima do cache do navegador
// (que pode ter guardado a página velha). false = o site não respondeu: recarregar
// trocaria a página pela tela de erro do navegador
async function renovarArquivosFaltando(faltando){

    const enderecos =
        [location.href.split("#")[0], ...faltando.filter(doProprioSite)];

    const respostas =
        await esperarNoMaximo(
            Promise.all(
                enderecos.map(endereco =>
                    fetch(endereco, { cache: "reload" }).catch(() => null)
                )
            ),
            ESPERA_ANTES_DE_RECARREGAR_MS
        );

    return !!respostas?.[0]?.ok;
}


// o registro só sai depois de 2 s: recarregar antes perderia o aviso para o admin
async function enviarRegistroAntesDeRecarregar(){

    if(typeof enviarErrosPendentes !== "function") return;

    try{

        await esperarNoMaximo(enviarErrosPendentes(), ESPERA_ANTES_DE_RECARREGAR_MS);

    }catch(erro){

        // registrar nunca pode impedir a recarga
    }
}


// botão do aviso e volta da internet: a pessoa já sabe que a página vai recarregar
async function recarregarPorArquivo(faltando){

    if(recarregandoPorArquivo) return;

    recarregandoPorArquivo = true;

    await renovarArquivosFaltando(faltando);

    location.reload();
}


function mostrarAvisoArquivoFaltando(texto, faltando){

    document.getElementById("avisoArquivoFaltando")?.remove();

    const aviso = document.createElement("div");

    aviso.id = "avisoArquivoFaltando";

    aviso.className = "aviso-arquivo-faltando";

    // o auth-guard.js esconde a página até conferir o login, e o que faltou pode
    // ter impedido essa conferência: o aviso aparece mesmo assim
    aviso.style.visibility = "visible";

    const mensagem = document.createElement("span");

    mensagem.textContent = texto;

    const botao = document.createElement("button");

    botao.type = "button";

    botao.textContent = "Recarregar";

    botao.addEventListener("click", () => recarregarPorArquivo(faltando));

    aviso.append(mensagem, botao);

    document.body.appendChild(aviso);
}


async function recarregarSozinhaPorArquivo(faltando){

    recarregandoPorArquivo = true;

    const siteRespondeu = await renovarArquivosFaltando(faltando);

    if(!siteRespondeu || !gravarRecargaArquivo(Date.now())){

        recarregandoPorArquivo = false;

        console.error("[arquivos] Não carregou; a pessoa recebeu o aviso para recarregar:", faltando.join(", "));

        mostrarAvisoArquivoFaltando(TEXTO_RECARREGAR_ARQUIVO, faltando);

        return;
    }

    console.error("[arquivos] Não carregou; a página recarregou sozinha:", faltando.join(", "));

    await enviarRegistroAntesDeRecarregar();

    location.reload();
}


function conferirArquivosDaPagina(){

    const faltando = listaArquivosFaltando();

    if(!faltando.length){

        // abriu inteira: uma próxima falha pode recarregar sozinha de novo
        if(lerRecargaArquivo()) gravarRecargaArquivo(0);

        return;
    }

    if(navigator.onLine === false){

        mostrarAvisoArquivoFaltando(TEXTO_SEM_INTERNET_ARQUIVO, faltando);

        window.addEventListener("online", () => recarregarPorArquivo(faltando), { once: true });

        return;
    }

    if(Date.now() - lerRecargaArquivo() < JANELA_RECARGA_ARQUIVO_MS){

        console.error("[arquivos] Não carregou de novo depois de recarregar sozinha:", faltando.join(", "));

        mostrarAvisoArquivoFaltando(TEXTO_RECARREGAR_ARQUIVO, faltando);

        return;
    }

    recarregarSozinhaPorArquivo(faltando);
}


// o "load" vem depois de todos os arquivos (os que falharam também) e depois da
// conferência dos CSS do registro-erros.js, que entrou na fila antes
window.addEventListener("load", conferirArquivosDaPagina);
