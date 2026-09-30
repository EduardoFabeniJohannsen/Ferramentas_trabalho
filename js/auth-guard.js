// ======================================
// AUTH GUARD
// ======================================
// Inclui esse script em toda página que precisa de login
// (depois de supabase-config.js). Se não tiver sessão ativa,
// manda pra login.html antes da página aparecer.

(async function protegerPagina(){

    // Esconde a página até a sessão ser confirmada, pra quem
    // não está logado não ver a tela antes do redirect.
    document.documentElement.style.visibility = "hidden";

    try{

        const { data, error } =
            await supabaseClient.auth.getSession();

        if(error || !data.session){

            // Sem internet o token pode não renovar. Se esse navegador
            // já fez login antes, deixa entrar (os dados continuam
            // protegidos pelo Supabase, não por esta tela).
            const semRede =
                !navigator.onLine ||
                error?.name === "AuthRetryableFetchError";

            if(semRede && existeLoginSalvo()){

                console.warn(
                    "[auth] Sem conexão: usando o login salvo no navegador"
                );

            }else{

                window.location.href = "login.html";

                return;
            }
        }

    }catch(erro){

        console.error("[auth] Erro ao verificar sessão:", erro);
    }

    document.documentElement.style.visibility = "";

})();


// ======================================
// LOGIN SALVO NO NAVEGADOR
// ======================================
// O Supabase guarda a sessão no localStorage numa chave
// "sb-...-auth-token". O logout apaga essa chave.

function existeLoginSalvo(){

    try{

        return Object.keys(localStorage).some(
            chave =>
                chave.startsWith("sb-") &&
                chave.endsWith("-auth-token")
        );

    }catch(erro){

        return false;
    }
}


// ======================================
// LOGOUT
// ======================================
// Chamado pelo botão "Sair" na topbar.

async function fazerLogout(){

    await supabaseClient.auth.signOut();

    window.location.href = "login.html";
}
