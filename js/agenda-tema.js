// ======================================
// AGENDA - TEMA CLARO/ESCURO
// ======================================
// aplicarTema() e alternarTema().
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// fundo claro (opcional): "claro" ou "escuro" (padrão)
function aplicarTema(tema){

    const claro = tema === "claro";

    document.body.classList.toggle("tema-claro", claro);

    $("btnTema").innerText =
        claro ? "🌙 Fundo escuro" : "☀️ Fundo claro";
}


function alternarTema(){

    const claro =
        !document.body.classList.contains("tema-claro");

    try{

        localStorage.setItem(
            CHAVE_AGENDA_TEMA,
            claro ? "claro" : "escuro"
        );

    }catch(erro){

        console.error("Erro ao salvar tema:", erro);
    }

    aplicarTema(claro ? "claro" : "escuro");
}
