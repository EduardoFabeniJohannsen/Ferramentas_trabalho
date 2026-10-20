// ======================================
// TRANSPORTADORAS - INIT
// ======================================
// Confere se é admin, liga os eventos e carrega os dados. Sempre o ÚLTIMO script da página.

(async function init(){

    // só admin: quem não for volta pra página inicial
    // (quem protege os dados de verdade é o RLS no Supabase)
    if(!(await ehAdmin())){

        window.location.href = "index.html";

        return;
    }

    $("conteudoTransp").style.display = "";

    $("selectTransportadora").addEventListener(
        "change",
        () => {

            transpAtual = $("selectTransportadora").value;

            try{

                localStorage.setItem(CHAVE_TRANSP_ULTIMA, transpAtual);

            }catch(erro){

                console.error("Erro ao salvar transportadora:", erro);
            }

            recarregarTransp();
        }
    );

    document.addEventListener("keydown", (evento) => {

        if(evento.key === "Escape") fecharModalTransp();
    });

    desenharListaTransp();

    try{

        await carregarListaTransportadoras();

    }catch(erro){

        console.error("[transportadoras] Falha ao carregar a lista:", detalhesErroTransp(erro));

        mostrarToast("Falha ao carregar as transportadoras", true);
    }

    let salva = "";

    try{

        salva = localStorage.getItem(CHAVE_TRANSP_ULTIMA) || "";

    }catch(erro){

        salva = "";
    }

    transpAtual =
        transpLista.includes(salva)
            ? salva
            : (transpLista[0] || "");

    desenharSelectTransportadora();

    await recarregarTransp();

})();
