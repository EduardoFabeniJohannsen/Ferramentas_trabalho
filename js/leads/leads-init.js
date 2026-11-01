// ======================================
// LEADS - INIT
// ======================================
// Descobre quem está logado, liga os eventos e carrega. Sempre o ÚLTIMO script da página.

// ======================================
// INIT
// ======================================

(async function iniciarLeads(){

    preencherSelectLeads(
        "filtroPorte",
        "Todos os portes",
        PORTES_LEADS.map(porte => [porte.valor, porte.rotulo])
    );

    preencherSelectLeads(
        "filtroStatus",
        "Todos os status",
        STATUS_LEADS.map(status => [status.valor, status.rotulo])
    );

    $("filtroStatus").value = "novo";

    desenharPortesConfig();

    ["filtroCidade", "filtroSegmento", "filtroPorte", "filtroStatus"].forEach(id => {

        $(id).addEventListener("change", desenharLeads);
    });

    $("buscaLeads").addEventListener("input", desenharLeads);

    desenharLeads();

    document.addEventListener("keydown", (evento) => {

        if(evento.key === "Escape") fecharConfigBusca();
    });

    const { data } = await supabaseClient.auth.getSession();

    const usuario = data?.session?.user;

    usuarioLeads = {
        id: usuario?.id || "",
        email: usuario?.email || ""
    };

    adminLeads = await ehAdmin();

    // o nome sai do e-mail até a pessoa corrigir
    const campoVendedor = $("nomeVendedor");

    campoVendedor.value =
        lerLocal(`${CHAVE_VENDEDOR_LEADS}:${usuarioLeads.id}`) ||
        nomeDoEmail(usuarioLeads.email);

    campoVendedor.addEventListener(
        "input",
        () => gravarLocal(
            `${CHAVE_VENDEDOR_LEADS}:${usuarioLeads.id}`,
            campoVendedor.value
        )
    );

    await recarregarLeads(false);

    // voltou pra aba depois de um tempo: atualiza. Observação sendo digitada
    // ou janela aberta não são interrompidas.
    document.addEventListener("visibilitychange", () => {

        if(document.hidden) return;

        if(Date.now() - ultimaCargaLeads < INTERVALO_RECARGA_LEADS_MS) return;

        if(document.querySelector(".modal-overlay.aberto")) return;

        if(document.activeElement?.closest?.(".lead-obs")) return;

        recarregarLeads(false);
    });

})();
