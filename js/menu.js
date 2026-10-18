// ======================================
// MENU (TOPBAR)
// ======================================
// Links entre TODAS as páginas, montados aqui, num lugar só.
// Em cada página aparecem todos, menos o dela mesma.
// Os links digitados na mão em cada HTML são trocados por estes.
// Página nova? É só somar uma linha na lista abaixo.
// Cada usuário vê só as páginas que tem liberadas (tabela "perfis",
// ver auth-guard.js); o link do Admin aparece só pra admin.
// Carregar depois de helpers.js, em toda página que tem a topbar.

(async function montarMenuTopbar(){

    const PAGINAS_MENU = [

        { arquivo: "index.html", rotulo: "🏠 Página inicial" },

        { arquivo: "propostas.html", rotulo: "📄 Propostas" },

        { arquivo: "agenda.html", rotulo: "📅 Agenda" },

        { arquivo: "estoque.html", rotulo: "📦 Estoque" },

        { arquivo: "tabelas.html", rotulo: "🛠️ Tabelas" },

        { arquivo: "WEG.html", rotulo: "🏢 WEG" },

        { arquivo: "admin.html", rotulo: "🔐 Admin" }
    ];


    const topbar =
        document.querySelector(".topbar");

    // login.html e outras páginas sem topbar ficam como estão
    if(!topbar) return;


    // nome do arquivo desta página (endereço sem nome = index.html)
    let atual = "";

    try{

        atual =
            decodeURIComponent(
                window.location.pathname.split("/").pop() || ""
            );

    }catch(erro){

        atual = "";
    }

    atual = (atual || "index.html").toLowerCase();


    // tira os links antigos (digitados na mão em cada página)
    topbar
        .querySelectorAll("a.botao-topbar")
        .forEach(link => link.remove());


    // os links entram antes do botão Sair (ou da versão)
    let referencia =
        topbar.querySelector('button[onclick*="fazerLogout"]') ||
        topbar.querySelector(".versao");

    if(referencia && referencia.parentNode !== topbar){

        referencia = null;
    }


    // só as páginas liberadas pro usuário
    await carregarPerfil();

    PAGINAS_MENU
        .filter(pagina => pagina.arquivo.toLowerCase() !== atual)
        .filter(pagina => temAcesso(recursoDaPagina(pagina.arquivo)))
        .forEach(pagina => {

            const link =
                document.createElement("a");

            link.href = pagina.arquivo;

            link.className = "botao-topbar";

            link.innerText = pagina.rotulo;

            topbar.insertBefore(link, referencia);
        });

})();
