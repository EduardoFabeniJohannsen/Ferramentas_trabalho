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

    desenharPerfis();

    carregarErrosSite();

    // o tempo de "parado há 12 min" continua contando sem ninguém avisar
    setInterval(desenharUsuariosOnline, 30000);

    await carregarPerfisAdmin();

    // aparelhos depois dos perfis: a lista mostra o e-mail de cada login
    await carregarAparelhos();

    // pedido novo aparece sozinho (só com a aba à vista)
    setInterval(() => {

        if(document.visibilityState === "visible") carregarAparelhos();

    }, 30000);

})();
