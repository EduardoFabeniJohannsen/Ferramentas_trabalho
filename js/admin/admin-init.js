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

    $("filtroErrosPagina").addEventListener(
        "change",
        desenharErrosSite
    );

    $("filtroPropostasUsuario").addEventListener("change", desenharPropostasAdmin);

    $("buscaPropostas").addEventListener("input", desenharPropostasAdmin);

    desenharPerfis();

    carregarErrosSite();

    carregarPropostasAdmin();

    // o tempo de "parado há 12 min" continua contando sem ninguém avisar
    setInterval(desenharUsuariosOnline, 30000);

    await carregarPerfisAdmin();

})();
