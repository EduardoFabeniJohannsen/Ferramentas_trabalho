// ======================================
// REGISTRO DE ERROS
// ======================================
// Manda para a tabela erros_site o que dá errado no navegador de cada pessoa, e o
// admin vê na página de Admin (admin-erros.js). Pega três coisas: erro de código,
// arquivo que não carregou e falha que o site já trata (o que passa por
// console.error). Não atrapalha quem está usando: o que não der para enviar é
// descartado, sem aviso. Sem login ou sem internet não registra.
// Carregar logo depois de supabase-config.js, antes dos scripts que ele vigia.

// junta o que acontecer nesse tempo num envio só
const ESPERA_ENVIO_ERROS_MS = 2000;

// por página aberta: erros diferentes e envios ao banco (erro em repetição só
// soma em "vezes")
const LIMITE_ERROS_DIFERENTES = 20;

const LIMITE_ENVIOS_ERROS = 50;

const TAMANHO_MENSAGEM_ERRO = 500;

const TAMANHO_DETALHE_ERRO = 1000;

// sem informação nenhuma (script de outro site) ou aviso inofensivo do navegador
const ERROS_IGNORADOS = [
    /^(Uncaught )?Script error\.?$/i,
    /ResizeObserver loop/i
];

const errosPendentes = new Map();

const errosConhecidos = new Set();

const arquivosFaltando = new Set();

let enviosErros = 0;

let timerEnvioErros = null;

// um envio de cada vez
let filaEnvioErros = Promise.resolve(true);

let saindoDaPagina = false;


function limparTextoErro(texto, tamanho){

    return String(texto ?? "")
        // token de login nunca sai do navegador
        .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[token]")
        .split(location.origin).join("")
        .trim()
        .slice(0, tamanho);
}


function anotarErro(tipo, mensagem, detalhe){

    // trocar de página cancela o que estava em andamento: isso não é erro
    if(saindoDaPagina || navigator.onLine === false) return;

    const texto = limparTextoErro(mensagem, TAMANHO_MENSAGEM_ERRO);

    if(!texto || ERROS_IGNORADOS.some(padrao => padrao.test(texto))) return;

    const chave = `${tipo}|${texto}`;

    if(!errosConhecidos.has(chave)){

        if(errosConhecidos.size >= LIMITE_ERROS_DIFERENTES) return;

        errosConhecidos.add(chave);
    }

    const pendente =
        errosPendentes.get(chave) ||
        {
            tipo,
            mensagem: texto,
            detalhe: limparTextoErro(detalhe, TAMANHO_DETALHE_ERRO),
            vezes: 0
        };

    pendente.vezes++;

    errosPendentes.set(chave, pendente);

    if(!timerEnvioErros){

        timerEnvioErros =
            setTimeout(enviarErrosPendentes, ESPERA_ENVIO_ERROS_MS);
    }
}


function anotarArquivoFaltando(endereco){

    const arquivo = String(endereco).split("?")[0];

    // o CSS pode avisar duas vezes: pelo evento e pela conferência no fim da carga
    if(arquivosFaltando.has(arquivo)) return;

    arquivosFaltando.add(arquivo);

    anotarErro("arquivo", `Arquivo não carregou: ${arquivo}`, "");
}


// o navegador mantém o sheet de um CSS que falhou: vazio (404) ou inacessível (sem
// rede). Todos os CSS do site têm regras e são do próprio site.
function cssCarregou(link){

    try{

        return !!link.sheet && link.sheet.cssRules.length > 0;

    }catch(erro){

        return false;
    }
}


function paginaDoErro(){

    const arquivo = location.pathname.split("/").pop() || "index";

    return arquivo.replace(/\.html$/i, "").toLowerCase();
}


function versaoDoErro(){

    // helpers.js carrega depois deste arquivo e pode ter falhado
    try{

        return VERSAO_SISTEMA;

    }catch(erro){

        return "?";
    }
}


// true = o banco recebeu tudo. Nada aqui passa por console.error: uma falha ao
// registrar viraria outro erro para registrar.
async function enviarLoteErros(lote){

    try{

        const { data } = await supabaseClient.auth.getSession();

        if(!data?.session) return false;

        let tudoEnviado = true;

        for(const erro of lote){

            if(enviosErros >= LIMITE_ENVIOS_ERROS) return false;

            enviosErros++;

            const { error } =
                await supabaseClient.rpc("registrar_erro_site", {
                    p_pagina: paginaDoErro(),
                    p_versao: versaoDoErro(),
                    p_tipo: erro.tipo,
                    p_mensagem: erro.mensagem,
                    p_detalhe: erro.detalhe,
                    p_vezes: erro.vezes
                });

            if(error) tudoEnviado = false;
        }

        return tudoEnviado;

    }catch(erro){

        return false;
    }
}


function enviarErrosPendentes(){

    clearTimeout(timerEnvioErros);

    timerEnvioErros = null;

    const lote = [...errosPendentes.values()];

    errosPendentes.clear();

    filaEnvioErros = filaEnvioErros.then(() => enviarLoteErros(lote));

    return filaEnvioErros;
}


function textoDoConsole(valor){

    if(valor instanceof Error) return valor.message;

    if(typeof valor === "object" && valor !== null){

        try{

            return JSON.stringify(valor);

        }catch(erro){

            return String(valor);
        }
    }

    return String(valor);
}


// onde o erro aconteceu, sem as linhas deste arquivo
function pilhaDoConsole(argumentos){

    const comPilha = argumentos.find(valor => valor instanceof Error) || new Error();

    return String(comPilha.stack || "")
        .split("\n")
        .filter(linha => !linha.includes("registro-erros"))
        .join("\n");
}


(function vigiarErros(){

    // o arquivo que não carrega avisa só no próprio elemento, e isso só chega
    // aqui na fase de captura (o "true" no fim)
    window.addEventListener(
        "error",
        (evento) => {

            const alvo = evento.target;

            if(alvo instanceof HTMLScriptElement || alvo instanceof HTMLLinkElement){

                anotarArquivoFaltando(alvo.src || alvo.href);

                return;
            }

            if(!evento.message) return;

            // extensão instalada no navegador da pessoa: não é erro do site
            if(/^[a-z-]+-extension:/i.test(evento.filename || "")) return;

            anotarErro(
                "codigo",
                evento.message,
                evento.error?.stack || `${evento.filename}:${evento.lineno}`
            );
        },
        true
    );

    window.addEventListener("unhandledrejection", (evento) => {

        const motivo = evento.reason;

        anotarErro(
            "codigo",
            motivo?.message || textoDoConsole(motivo),
            motivo?.stack || ""
        );
    });

    // o CSS fica no <head>, antes deste arquivo: o aviso dele pode já ter passado
    window.addEventListener("load", () => {

        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {

            if(!cssCarregou(link)) anotarArquivoFaltando(link.href);
        });
    });

    window.addEventListener("pagehide", () => { saindoDaPagina = true; });

    // voltou pela seta do navegador: a página continua de onde estava
    window.addEventListener("pageshow", () => { saindoDaPagina = false; });

    const consoleErrorOriginal = console.error;

    console.error = (...argumentos) => {

        consoleErrorOriginal.apply(console, argumentos);

        try{

            anotarErro(
                "tratado",
                argumentos.map(textoDoConsole).join(" "),
                pilhaDoConsole(argumentos)
            );

        }catch(erro){

            // registrar nunca pode atrapalhar quem chamou
        }
    };

})();
