// ======================================
// AGENDA - ETAPAS DO FORMULÁRIO (RECOLHER)
// ======================================
// Clicar no título de uma etapa (Demanda, Local e entrega, Faturamento)
// recolhe ou abre o conteúdo dela, pra ir direto ao que interessa. Só
// esconde: o que está preenchido continua sendo salvo. O que cada usuário
// deixou recolhido fica neste navegador. Carregar depois de agenda-utils.js
// e antes de agenda-modal.js.

function chaveEtapas(){

    return `${CHAVE_AGENDA_ETAPAS}:${usuarioAgenda || "local"}`;
}


// relê do navegador só quando o usuário muda
function lerEtapas(){

    const chave = chaveEtapas();

    if(chave === etapasChave) return;

    etapasChave = chave;

    etapasRecolhidas = {};

    try{

        const salvo = localStorage.getItem(chave);

        const dados = salvo ? JSON.parse(salvo) : {};

        if(dados && typeof dados === "object"){

            Object.entries(dados).forEach(([etapa, recolhida]) => {

                if(recolhida === true) etapasRecolhidas[etapa] = true;
            });
        }

    }catch(erro){

        console.error("Etapas recolhidas inválidas, ignorando:", erro);
    }
}


function salvarEtapas(){

    try{

        localStorage.setItem(
            chaveEtapas(),
            JSON.stringify(etapasRecolhidas)
        );

    }catch(erro){

        console.error("Erro ao salvar as etapas recolhidas:", erro);
    }
}


// mostra ou esconde uma etapa na tela (salvar = guarda a escolha)
function mostrarEtapa(etapa, aberta, salvar){

    const secao =
        document.querySelector(`.etapa[data-etapa="${etapa}"]`);

    if(!secao) return;

    secao.classList.toggle("recolhida", !aberta);

    const titulo = secao.querySelector(".etapa-titulo");

    if(titulo) titulo.setAttribute("aria-expanded", aberta ? "true" : "false");

    if(!salvar) return;

    lerEtapas();

    if(aberta){

        delete etapasRecolhidas[etapa];

    }else{

        etapasRecolhidas[etapa] = true;
    }

    salvarEtapas();
}


// ao abrir o formulário: cada etapa como o usuário deixou
function aplicarEtapasSalvas(){

    lerEtapas();

    document.querySelectorAll(".etapa[data-etapa]").forEach(secao => {

        mostrarEtapa(secao.dataset.etapa, !etapasRecolhidas[secao.dataset.etapa], false);
    });
}


// Erro de validação ao salvar: avisa e abre a etapa onde está o problema
// (só na tela, sem mudar o que o usuário deixou salvo).
function avisoFormulario(mensagem, etapa){

    if(etapa) mostrarEtapa(etapa, true, false);

    mostrarToast(mensagem, true);
}


(function iniciarEtapas(){

    document.querySelectorAll(".etapa[data-etapa]").forEach(secao => {

        const titulo = secao.querySelector(".etapa-titulo");

        if(!titulo) return;

        titulo.tabIndex = 0;

        titulo.setAttribute("role", "button");

        titulo.setAttribute("aria-expanded", "true");

        titulo.title = "Clique para recolher ou abrir esta etapa";

        titulo.appendChild(criar("span", "etapa-seta", "▾"));

        const alternar = () =>
            mostrarEtapa(
                secao.dataset.etapa,
                secao.classList.contains("recolhida"),
                true
            );

        titulo.addEventListener("click", alternar);

        titulo.addEventListener(
            "keydown",
            evento => {

                if(evento.key === "Enter" || evento.key === " "){

                    evento.preventDefault();

                    alternar();
                }
            }
        );
    });

})();
