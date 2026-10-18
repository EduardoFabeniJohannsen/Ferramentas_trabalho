// ======================================
// ADMIN - INIT
// ======================================
// Ligações iniciais. Sempre o ÚLTIMO script da página.
// Quem não é admin já foi mandado embora pelo auth-guard.js.

(async function init(){

    $("filtroUsuarios").addEventListener(
        "input",
        desenharPerfis
    );

    // Enter no e-mail ou na senha cria o usuário
    ["novoEmail", "novaSenha"].forEach(id => {

        $(id).addEventListener(
            "keydown",
            (evento) => {

                if(evento.key === "Enter") criarUsuario();
            }
        );
    });

    desenharPerfis();

    await carregarPerfisAdmin();

})();
