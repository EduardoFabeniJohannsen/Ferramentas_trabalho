// ======================================
// ADMIN - COPIAR ERROS
// ======================================
// Botões 📋 da seção "Erros do sistema": copia um erro (ou todos os da lista) com
// página, versão, usuário, horários, mensagem e detalhes, pronto para colar numa
// conversa. Carregar depois de admin-erros.js.

// texto pronto para colar numa conversa (com tudo o que ajuda a achar a causa).
// Recebe um grupo (agruparErros): com vários registros, lista todas as versões e
// pessoas; o detalhe é o do mais recente.
function textoErroParaCopiar(erro){

    const registros = erro.registros || [erro];

    const versoes = [...new Set(registros.map(r => r.versao))];

    const usuarios = [...new Set(registros.map(r => r.usuario_email || "não identificado"))];

    const linhas = [
        `Erro do sistema: ${nomePaginaOnline(erro.pagina)} (${erro.pagina}.html), ${versoes.length > 1 ? "versões" : "versão"} ${versoes.join(", ")}`,
        `Tipo: ${ROTULOS_TIPO_ERRO[erro.tipo] || erro.tipo}`,
        `${usuarios.length > 1 ? "Usuários" : "Usuário"}: ${usuarios.join(", ")}`,
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

    const visiveis = gruposVisiveis();

    if(!visiveis.length) return;

    copiar(
        visiveis.map(textoErroParaCopiar).join("\n\n---\n\n"),
        `${visiveis.length} erro(s) copiado(s)`
    );
}
