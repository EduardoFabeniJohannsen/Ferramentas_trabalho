// ======================================
// LOGIN
// ======================================
// Tela de login: se já tem sessão vai direto para as propostas; senão entra com
// e-mail e senha do Supabase (Enter no campo de senha também entra).
// Fica em arquivo (não dentro do HTML) por causa da política de segurança (CSP).

// pequeno helper local (helpers.js não é carregado aqui)
const $ = (id) => document.getElementById(id);


// ======================================
// SE JÁ ESTIVER LOGADO, PULA DIRETO
// ======================================

(async function verificarSessaoExistente(){

    const { data } =
        await supabaseClient.auth.getSession();

    if(data.session){

        window.location.href = "propostas.html";
    }

})();


// ======================================
// LOGIN
// ======================================

// muitas tentativas: o Supabase bloqueia o IP por um tempo (Authentication -> Rate Limits)
function textoErroLogin(error){

    if(error.status === 429){

        return "Muitas tentativas de login. Espere alguns minutos e tente de novo.";
    }

    if(/captcha/i.test(error.message || "")){

        return "A verificação de segurança falhou. Tente de novo.";
    }

    return "E-mail ou senha inválidos";
}


// clique duplo ou Enter enquanto já está entrando
let entrandoLogin = false;


// "Verificando..." / "Entrando..." no botão enquanto espera
function marcarBotaoEntrar(texto){

    const botao = $("btnEntrar");

    botao.disabled = !!texto;

    botao.innerText = texto || "Entrar";
}


async function fazerLogin(){

    if(entrandoLogin) return;

    const email =
        $("loginEmail").value.trim();

    const senha =
        $("loginSenha").value;

    const erroEl =
        $("loginErro");

    erroEl.innerText = "";

    if(!email || !senha){

        erroEl.innerText =
            "Preencha e-mail e senha";

        return;
    }

    entrandoLogin = true;

    try{

        // captcha (login-captcha.js): sem o token o Supabase recusa. No celular
        // a verificação pode levar uns segundos: espera em vez de recusar
        if(!(await esperarTokenCaptchaComAviso())) return;

        marcarBotaoEntrar("Entrando...");

        const { error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: senha,
                options: opcoesCaptcha()
            });

        if(error){

            // o token vale uma tentativa só
            renovarCaptcha();

            erroEl.innerText = textoErroLogin(error);

            return;
        }

        window.location.href = "propostas.html";

    }finally{

        entrandoLogin = false;

        marcarBotaoEntrar("");
    }
}


// true = tem o token (ou não precisa). Senão já mostrou o aviso e a caixinha.
async function esperarTokenCaptchaComAviso(){

    if(captchaAtivo() && !tokenCaptcha) marcarBotaoEntrar("Verificando...");

    await esperarTokenCaptcha();

    const aviso = avisoCaptcha();

    if(!aviso) return true;

    $("loginErro").innerText = aviso;

    // a caixinha da Cloudflare aparece, com o que ela está fazendo
    mostrarCaptcha();

    return false;
}


// permite dar Enter no campo de senha pra logar
document.addEventListener("DOMContentLoaded", () => {

    const campoSenha =
        $("loginSenha");

    if(campoSenha){

        campoSenha.addEventListener(
            "keydown",
            (evento) => {

                if(evento.key === "Enter"){
                    fazerLogin();
                }
            }
        );
    }
});

