// ======================================
// LOGIN - CAPTCHA (Cloudflare Turnstile)
// ======================================
// Barra robôs que testam senhas em massa. Quase sempre invisível: só aparece
// a caixinha quando a Cloudflare desconfia. O Supabase confere o token no login
// (Authentication -> Attack Protection -> Captcha, com a chave secreta).
// Sem chave aqui (TURNSTILE_SITE_KEY vazia), o login funciona sem captcha.
// Ordem para ligar: 1) publicar o site com a chave; 2) ligar no Supabase.
// Ligar no Supabase antes faz o login parar de funcionar.
// No celular a verificação pode levar uns segundos (ou recomeçar quando a aba
// volta do segundo plano): o Entrar espera o token em vez de recusar. Se não
// vier, a caixinha da Cloudflare aparece com o que está acontecendo.

// chave do site (pública: pode ficar no repositório; a secreta fica só no Supabase)
const TURNSTILE_SITE_KEY = "0x4AAAAAAF7o1C052yDOJo06";

const URL_TURNSTILE =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// quanto o Entrar espera o token antes de mostrar a caixinha da Cloudflare
const ESPERA_TOKEN_CAPTCHA_MS = 12000;

let tokenCaptcha = "";

let idCaptcha = null;

// o script da Cloudflare não carregou (bloqueador, rede da empresa)
let captchaFalhou = false;

// erro que a Cloudflare informou: o código dela ou "nao-suportado"
let erroCaptcha = "";

// a caixinha já está à mostra (appearance "always")
let captchaVisivel = false;

// quem está esperando o token (o Entrar): recebe o token ou ""
const esperasCaptcha = new Set();


function captchaAtivo(){

    return !!TURNSTILE_SITE_KEY;
}


// acorda quem está esperando: veio o token ou deu erro
function avisarEsperasCaptcha(){

    esperasCaptcha.forEach(terminar => terminar(tokenCaptcha));
}


// aparencia: "interaction-only" (só aparece se a Cloudflare pedir) ou "always"
function desenharCaptcha(aparencia = "interaction-only"){

    idCaptcha = window.turnstile.render("#captchaLogin", {
        sitekey: TURNSTILE_SITE_KEY,
        appearance: aparencia,
        language: "pt-br",
        callback: (token) => {
            tokenCaptcha = token;
            captchaFalhou = false;
            erroCaptcha = "";
            avisarEsperasCaptcha();
        },
        // o token vence em 5 min; a Cloudflare pede outro sozinha
        "expired-callback": () => { tokenCaptcha = ""; },
        // a caixinha pediu um toque e ninguém tocou a tempo: começa de novo
        "timeout-callback": () => {
            tokenCaptcha = "";
            window.turnstile.reset(idCaptcha);
        },
        "unsupported-callback": () => {
            tokenCaptcha = "";
            erroCaptcha = "nao-suportado";
            avisarEsperasCaptcha();
        },
        // a Cloudflare tenta de novo sozinha; dando certo, o callback limpa o erro
        "error-callback": (codigo) => {
            tokenCaptcha = "";
            erroCaptcha = String(codigo || "desconhecido");
            avisarEsperasCaptcha();
        }
    });
}


function carregarCaptcha(){

    if(!captchaAtivo()) return;

    const script = document.createElement("script");

    script.src = URL_TURNSTILE;

    script.async = true;

    script.onload = () => desenharCaptcha();

    // bloqueador de anúncio ou rede da empresa barrando a Cloudflare
    script.onerror = () => {
        captchaFalhou = true;
        avisarEsperasCaptcha();
    };

    document.head.appendChild(script);
}


// o token vale uma tentativa só: depois de usar, pede outro
function renovarCaptcha(){

    tokenCaptcha = "";

    if(idCaptcha !== null && window.turnstile) window.turnstile.reset(idCaptcha);
}


// espera o token (no máximo ESPERA_TOKEN_CAPTCHA_MS). Responde o token ou ""
// (não veio a tempo ou deu erro: avisoCaptcha diz o motivo)
function esperarTokenCaptcha(){

    if(!captchaAtivo() || tokenCaptcha) return Promise.resolve(tokenCaptcha);

    if(captchaFalhou || erroCaptcha) return Promise.resolve("");

    return new Promise(pronto => {

        const terminar = (token) => {

            clearTimeout(limite);

            esperasCaptcha.delete(terminar);

            pronto(token || "");
        };

        const limite = setTimeout(() => terminar(""), ESPERA_TOKEN_CAPTCHA_MS);

        esperasCaptcha.add(terminar);
    });
}


// sem token: mostra a caixinha da Cloudflare (com o que ela está fazendo ou o
// erro dela) e recomeça a verificação. Uma vez só.
function mostrarCaptcha(){

    if(captchaVisivel || idCaptcha === null || !window.turnstile) return;

    captchaVisivel = true;

    erroCaptcha = "";

    window.turnstile.remove(idCaptcha);

    desenharCaptcha("always");
}


// "" = pode tentar o login; senão, o aviso para a pessoa
function avisoCaptcha(){

    if(!captchaAtivo() || tokenCaptcha) return "";

    if(captchaFalhou){

        return "A verificação de segurança não carregou. Confira a internet (ou o bloqueador de anúncios) e recarregue a página.";
    }

    if(erroCaptcha === "nao-suportado"){

        return "Este navegador não consegue fazer a verificação de segurança. Atualize o navegador ou entre pelo Chrome.";
    }

    if(erroCaptcha){

        return `A verificação de segurança deu erro (código ${erroCaptcha}). Toque em Entrar de novo; se continuar, recarregue a página.`;
    }

    // o script da Cloudflare ainda nem chegou (internet lenta)
    if(!window.turnstile){

        return "A verificação de segurança ainda não carregou. Confira a internet e toque em Entrar de novo.";
    }

    return "A verificação de segurança está demorando. Se a caixinha acima pedir, toque nela; depois toque em Entrar de novo.";
}


// opções do signInWithPassword (sem captcha: nada a mais)
function opcoesCaptcha(){

    return captchaAtivo() ? { captchaToken: tokenCaptcha } : {};
}


carregarCaptcha();
