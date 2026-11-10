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

async function fazerLogin(){

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

    const { error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: senha
        });

    if(error){

        erroEl.innerText =
            "E-mail ou senha inválidos";

        return;
    }

    window.location.href = "propostas.html";
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

