// ======================================
// ADMIN - COPIAR ERROS
// ======================================
// Botões 📋 da seção "Erros do sistema": copia um erro (ou todos os da lista) com
// página, versão, usuário, horários, mensagem e detalhes, pronto para colar numa
// conversa. Carregar depois de admin-erros.js.

// texto pronto para colar numa conversa (com tudo o que ajuda a achar a causa)
function textoErroParaCopiar(erro){

    const linhas = [
        `Erro do sistema: ${nomePaginaOnline(erro.pagina)} (${erro.pagina}.html), versão ${erro.versao}`,
        `Tipo: ${ROTULOS_TIPO_ERRO[erro.tipo] || erro.tipo}`,
        `Usuário: ${erro.usuario_email || "não identificado"}`,
        `Vezes: ${erro.vezes} · primeira: ${dataHoraBR(erro.criado_em)} · última: ${dataHoraBR(erro.atualizado_em)}`,
        "Mensagem:",
        erro.mensagem
    ];

    if(erro.detalhe) linhas.push("Detalhes:", erro.detalhe);

    return linhas.join("\n");
}


function copiarErroSite(erro){

    copiar(textoErroParaCopiar(erro), "Erro copiado");
}


// todos os da lista (com o filtro, só os daquela página)
function copiarErrosVisiveis(){

    const visiveis = errosVisiveis();

    if(!visiveis.length) return;

    copiar(
        visiveis.map(textoErroParaCopiar).join("\n\n---\n\n"),
        `${visiveis.length} erro(s) copiado(s)`
    );
}
