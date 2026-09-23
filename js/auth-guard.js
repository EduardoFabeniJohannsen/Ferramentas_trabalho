// ======================================
// AUTH GUARD
// ======================================
// Inclui esse script em toda página que precisa de login
// (depois de supabase-config.js). Se não tiver sessão ativa,
// manda pra login.html antes da página aparecer.

(async function protegerPagina(){

    const { data, error } =
        await supabaseClient.auth.getSession();

    if(error || !data.session){

        window.location.href = "login.html";
    }

})();


// ======================================
// LOGOUT
// ======================================
// Chamado pelo botão "Sair" na topbar.

async function fazerLogout(){

    await supabaseClient.auth.signOut();

    window.location.href = "login.html";
}
