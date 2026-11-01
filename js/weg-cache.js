// ======================================
// WEG - CACHE
// ======================================
// Salva/restaura o preenchimento no navegador.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// CACHE (salvo no navegador)
// ======================================
// Salva sozinho no localStorage pra não perder nada se a
// página recarregar (Ctrl+R) ou o navegador travar.

const CHAVE_CACHE_WEG = "wegCache";


function salvarCacheWEG() {

    const quantidades = {};

    contratoWEG.itens.forEach((item) => {

        quantidades[item.modelo] =
            $(`qtd-${item.modelo}`)?.value || "0";
    });

    const dados = {

        quantidades: quantidades,
        valorFrete: $("valorFrete")?.value || "",
        unidadeWEG: $("unidadeWEG")?.value || "",
        periodos: $("periodos")?.value || "1",
        dataInicio: $("dataInicio")?.value || ""
    };

    gravarLocalJSON(CHAVE_CACHE_WEG, dados);
}


function restaurarCacheWEG() {

    const dados = lerLocalJSON(CHAVE_CACHE_WEG);

    if (!dados || typeof dados !== "object") return;

    contratoWEG.itens.forEach((item) => {

        const campo = $(`qtd-${item.modelo}`);

        const quantidade =
            parseInt(dados.quantidades?.[item.modelo], 10);

        if (campo && Number.isFinite(quantidade) && quantidade > 0) {

            campo.value = quantidade;
        }
    });

    $("valorFrete").value = dados.valorFrete || "";

    // unidade que não existe mais na lista fica na primeira
    if (contratoWEG.unidadesWEG.includes(dados.unidadeWEG)) {

        $("unidadeWEG").value = dados.unidadeWEG;
    }

    $("periodos").value = dados.periodos || "1";

    $("periodos").value = obterPeriodos();

    $("dataInicio").value = dados.dataInicio || "";
}
