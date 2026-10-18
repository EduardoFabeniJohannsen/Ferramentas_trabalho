// ======================================
// TABELAS - MODO E INIT
// ======================================
// Alternar consulta/edição e início. Sempre o ÚLTIMO script da página.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// MODO CONSULTA / EDIÇÃO
// ======================================

function atualizarModo(){

    const tabela = document.querySelector(".tabela-editor");

    tabela.classList.toggle("tabela-matriz", !podeEditar);

    $("tituloTabelas").innerText =
        podeEditar ? "Editar tabelas" : "Consultar tabelas";

    $("avisoEdicao").innerText =
        podeEditar
            ? "A alteração é salva sozinha ao sair do campo."
            : (
                ehAdminLogado
                    ? "Clique em Editar para alterar os valores."
                    : "Somente consulta."
            );

    $("btnModoEdicao").innerText =
        podeEditar ? "👁 Consultar" : "✏️ Editar";

    desenharTabela();
}


function alternarModoEdicao(){

    if(!ehAdminLogado) return;

    podeEditar = !podeEditar;

    $("filtroTabela").value = "";

    atualizarModo();
}


// ======================================
// INIT
// ======================================

(async function init(){

    // todo mundo consulta; só o admin vê o botão de editar
    ehAdminLogado = await ehAdmin();

    await carregarPerfil();

    if(ehAdminLogado){

        $("btnModoEdicao").style.display = "";
    }

    const select = $("selectTabela");

    // só as tabelas que o usuário pode ver (fretes exigem a permissão)
    Object.keys(TABELAS)
        .filter(chave => !TABELAS[chave].recurso || temAcesso(TABELAS[chave].recurso))
        .forEach(chave => {

        const opcao = document.createElement("option");

        opcao.value = chave;

        opcao.innerText = TABELAS[chave].nome;

        select.appendChild(opcao);
    });

    select.addEventListener(
        "change",
        () => {

            tabelaAtual = select.value;

            $("filtroTabela").value = "";

            carregarLinhasTabela();
        }
    );

    $("filtroTabela").addEventListener(
        "input",
        desenharTabela
    );

    atualizarModo();

    carregarLinhasTabela();

})();
