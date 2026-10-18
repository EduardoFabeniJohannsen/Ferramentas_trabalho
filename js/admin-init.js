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

    desenharPerfis();

    await carregarPerfisAdmin();

})();
