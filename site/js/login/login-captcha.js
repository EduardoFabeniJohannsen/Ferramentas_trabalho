// ======================================
// LOGIN - CAPTCHA (Cloudflare Turnstile)
// ======================================
// Barra robôs que testam senhas em massa. Quase sempre invisível: só aparece
// a caixinha quando a Cloudflare desconfia. O Supabase confere o token no login
// (Authentication -> Attack Protection -> Captcha, com a chave secreta).
// Sem chave aqui (TURNSTILE_SITE_KEY vazia), o login funciona sem captcha.
// Ordem para ligar: 1) publicar o site com a chave; 2) ligar no Supabase.
// Ligar no Supabase antes faz o login parar de funcionar.

// chave do site (pública: pode ficar no repositório; a secreta fica só no Supabase)
const TURNSTILE_SITE_KEY = "";

const URL_TURNSTILE =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let tokenCaptcha = "";

let idCaptcha = null;

let captchaFalhou = false;


function captchaAtivo(){

    return !!TURNSTILE_SITE_KEY;
}


function desenharCaptcha(){

    idCaptcha = window.turnstile.render("#captchaLogin", {
        sitekey: TURNSTILE_SITE_KEY,
        appearance: "interaction-only",
        language: "pt-br",
        callback: (token) => {
            tokenCaptcha = token;
            captchaFalhou = false;
        },
        "expired-callback": () => { tokenCaptcha = ""; },
        "error-callback": () => {
            tokenCaptcha = "";
            captchaFalhou = true;
        }
    });
}


function carregarCaptcha(){

    if(!captchaAtivo()) return;

    const script = document.createElement("script");

    script.src = URL_TURNSTILE;

    script.async = true;

    script.onload = desenharCaptcha;

    // bloqueador de anúncio ou rede da empresa barrando a Cloudflare
    script.onerror = () => { captchaFalhou = true; };

    document.head.appendChild(script);
}


// o token vale uma tentativa só: depois de usar, pede outro
function renovarCaptcha(){

    tokenCaptcha = "";

    if(idCaptcha !== null && window.turnstile) window.turnstile.reset(idCaptcha);
}


// "" = pode tentar o login; senão, o aviso para a pessoa
function avisoCaptcha(){

    if(!captchaAtivo() || tokenCaptcha) return "";

    if(captchaFalhou){

        return "A verificação de segurança não carregou. Confira a internet (ou o bloqueador de anúncios) e recarregue a página.";
    }

    return "Aguarde a verificação de segurança e tente de novo.";
}


// opções do signInWithPassword (sem captcha: nada a mais)
function opcoesCaptcha(){

    return captchaAtivo() ? { captchaToken: tokenCaptcha } : {};
}


carregarCaptcha();
