// ======================================
// MENU (TOPBAR)
// ======================================
// Links entre TODAS as páginas, montados aqui, num lugar só.
// Em cada página aparecem os das páginas que a pessoa pode abrir (admin ou
// acesso liberado no Admin), menos o dela mesma: sem o acesso, o auth-guard.js
// mandaria embora (o motorista só vê a dele). Sem nenhum link, o ☰ Menu some.
// Os links digitados na mão em cada HTML são trocados por estes.
// Página nova? É só somar uma linha na lista abaixo.
// Carregar depois de helpers.js, em toda página que tem a topbar.

(function montarMenuTopbar(){

    const PAGINAS_MENU = [

        { arquivo: "index.html", rotulo: "🏠 Página inicial" },

        { arquivo: "propostas.html", rotulo: "📄 Propostas" },

        { arquivo: "agenda.html", rotulo: "📅 Agenda" },

        { arquivo: "estoque.html", rotulo: "📦 Estoque" },

        { arquivo: "tabelas.html", rotulo: "🛠️ Tabelas" },

        { arquivo: "WEG.html", rotulo: "🏢 WEG" },

        { arquivo: "transportadoras.html", rotulo: "🚚 Transportadoras" },

        { arquivo: "leads.html", rotulo: "🎯 Leads" },

        { arquivo: "propostas-copiadas.html", rotulo: "📊 Propostas Zap" },

        { arquivo: "analise-fretes.html", rotulo: "📈 Análise de fretes" },

        { arquivo: "analise-movimentacoes.html", rotulo: "🔄 Análise de movimentações" },

        // a página do login de motorista (só as entregas dele)
        { arquivo: "motorista.html", rotulo: "🚛 Minhas entregas" },

        // soAdmin: o link só aparece para admin (as outras: para quem tem o
        // acesso da página, admin ou liberado na página Admin)

        { arquivo: "admin.html", rotulo: "👤 Admin", soAdmin: true }
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
        topbar.querySelector('button[data-clique="fazerLogout"]') ||
        topbar.querySelector(".versao");

    if(referencia && referencia.parentNode !== topbar){

        referencia = null;
    }


    PAGINAS_MENU
        .filter(pagina => pagina.arquivo.toLowerCase() !== atual)
        .forEach(pagina => {

            const link =
                document.createElement("a");

            link.href = pagina.arquivo;

            link.className = "botao-topbar";

            link.innerText = pagina.rotulo;

            // escondido até saber se a pessoa pode abrir a página (o papel de
            // admin, ou o perfil; a página também fica escondida até lá, pelo
            // auth-guard.js)
            link.style.display = "none";

            const liberada =
                pagina.soAdmin
                    ? ehAdmin()
                    : carregarPerfil().then(() => temAcesso(recursoDaPagina(pagina.arquivo)));

            liberada.then(pode => {

                if(pode) link.style.display = "";

                mostrarBotaoMenu();
            });

            topbar.insertBefore(link, referencia);
        });


    // Celular: os links ficam atrás do ☰ Menu (style.css esconde e mostra),
    // pra barra ocupar uma linha só. No computador o botão nem aparece.
    const botaoMenu =
        document.createElement("button");

    botaoMenu.type = "button";

    botaoMenu.className = "btn-menu-celular";

    const abrirMenuCelular = (abrir) => {

        topbar.classList.toggle("menu-aberto", abrir);

        botaoMenu.innerText = abrir ? "✕ Fechar" : "☰ Menu";

        botaoMenu.setAttribute("aria-expanded", String(abrir));
    };

    abrirMenuCelular(false);

    // sem link nenhum (o motorista, na página dele), o ☰ não abriria nada
    function mostrarBotaoMenu(){

        const algumLink =
            [...topbar.querySelectorAll("a.botao-topbar")]
                .some(link => link.style.display !== "none");

        // no style (e não no hidden): o style.css mostra o botão no celular
        botaoMenu.style.display = algumLink ? "" : "none";
    }

    botaoMenu.addEventListener("click", () =>
        abrirMenuCelular(!topbar.classList.contains("menu-aberto"))
    );

    // tocar fora da barra ou Esc fecha
    document.addEventListener("click", evento => {

        if(!topbar.contains(evento.target)) abrirMenuCelular(false);
    });

    document.addEventListener("keydown", evento => {

        if(evento.key === "Escape") abrirMenuCelular(false);
    });

    topbar.prepend(botaoMenu);


    // A topbar é fixa e quebra em mais linhas conforme a largura e os links
    // (os de acesso só aparecem depois de ler o perfil). O conteúdo (.container,
    // em style.css) desce a altura real dela, guardada em --altura-topbar, pra
    // nunca ficar nada escondido embaixo.
    const atualizarAlturaTopbar = () => {

        document.documentElement.style.setProperty(
            "--altura-topbar",
            `${topbar.offsetHeight}px`
        );
    };

    atualizarAlturaTopbar();

    if(typeof ResizeObserver === "function"){

        new ResizeObserver(atualizarAlturaTopbar).observe(topbar);

    }else{

        window.addEventListener("resize", atualizarAlturaTopbar);
    }

})();
