// ======================================
// AÇÕES DOS BOTÕES (no lugar do onclick)
// ======================================
// A política de segurança das páginas (CSP, no <head>) não deixa rodar código
// escrito dentro do HTML: onclick="..." e <script> sem arquivo ficam bloqueados.
// Assim, se um dia entrar código estranho num texto salvo, ele não roda.
// Os botões dizem só o NOME da função, e este arquivo chama:
//   data-clique="abrirConfiguracoes"               -> abrirConfiguracoes()
//   data-clique="gerarStatus" data-arg="ICMS"      -> gerarStatus("ICMS")
//   data-clique="selecionarProximosDias" data-arg="7" -> número (true/false também)
//   data-clique="removerEquipamento" data-elemento -> removerEquipamento(o botão)
//   data-clique-fora="fecharConfiguracoes"         -> só no clique no fundo do
//                                                    modal, não no que está dentro
//   data-mudanca="trocarFormaPagamento"            -> no change (select)
//   data-entrada="salvarCache"                     -> no input (enquanto digita)
// A função precisa ser uma "function" dos scripts da página (fica em window).

function argumentoDaAcao(elemento){

    if(elemento.hasAttribute("data-elemento")) return [elemento];

    if(!elemento.hasAttribute("data-arg")) return [];

    const texto = elemento.getAttribute("data-arg");

    // "7", "0", "true": número e verdadeiro/falso como no onclick antigo
    if(/^(true|false|-?\d+(\.\d+)?)$/.test(texto)) return [JSON.parse(texto)];

    return [texto];
}


function rodarAcao(elemento, atributo){

    const nome = elemento.getAttribute(atributo);

    const funcao = window[nome];

    if(typeof funcao !== "function"){

        console.error(`[acoes] função não encontrada: ${nome}`);

        return;
    }

    return funcao.apply(elemento, argumentoDaAcao(elemento));
}


// registrado antes dos outros cliques da página (este script vem primeiro),
// como o onclick, que rodava antes de quem escuta no document
document.addEventListener("click", (evento) => {

    const alvo = evento.target;

    if(!(alvo instanceof Element)) return;

    // fundo do modal: o próprio elemento, não um botão dentro dele
    if(alvo.hasAttribute("data-clique-fora")){

        rodarAcao(alvo, "data-clique-fora");
    }

    const botao = alvo.closest("[data-clique]");

    if(botao && !botao.disabled) rodarAcao(botao, "data-clique");
});


// change (select) e input (enquanto digita) no próprio campo
[["change", "data-mudanca"], ["input", "data-entrada"]].forEach(([tipo, atributo]) => {

    document.addEventListener(tipo, (evento) => {

        const alvo = evento.target;

        if(alvo instanceof Element && alvo.hasAttribute(atributo)){

            rodarAcao(alvo, atributo);
        }
    });
});
