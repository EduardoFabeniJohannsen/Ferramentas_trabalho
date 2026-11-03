// ======================================
// ADMIN - ERROS DO SISTEMA
// ======================================
// Lista o que o registro-erros.js guardou na tabela erros_site. Só o admin lê e
// apaga (quem protege é o RLS). As mensagens vêm do navegador de cada pessoa:
// nada entra na tela como HTML.

const TABELA_ERROS_SITE = "erros_site";

// o banco apaga os mais antigos quando chega um erro novo
const DIAS_ERROS_SITE = 30;

const LIMITE_ERROS_SITE = 200;

const ROTULOS_TIPO_ERRO = {
    codigo: "Código",
    arquivo: "Arquivo",
    tratado: "Falha tratada"
};

let errosSite = [];

let carregandoErrosSite = true;

let falhaErrosSite = "";


function mensagemFalhaErros(erro){

    const codigo = erro?.code || "";

    if(codigo === "42P01" || codigo === "PGRST205"){

        return "A tabela de erros ainda não existe: rode o SQL no Supabase.";
    }

    if(codigo === "42501"){

        return "Sem permissão para ver os erros. Confira o SQL no Supabase.";
    }

    return "Não foi possível carregar os erros (verifique a conexão).";
}


async function carregarErrosSite(){

    carregandoErrosSite = true;

    falhaErrosSite = "";

    desenharErrosSite();

    const limite =
        new Date(Date.now() - DIAS_ERROS_SITE * 86400000).toISOString();

    try{

        const { data, error } =
            await supabaseClient
                .from(TABELA_ERROS_SITE)
                .select("id, criado_em, atualizado_em, pagina, versao, tipo, mensagem, detalhe, usuario_email, vezes")
                .gte("atualizado_em", limite)
                .order("atualizado_em", { ascending: false })
                .limit(LIMITE_ERROS_SITE);

        if(error) throw error;

        errosSite = data || [];

    }catch(erro){

        console.error("[admin] Falha ao carregar os erros:", erro);

        errosSite = [];

        falhaErrosSite = mensagemFalhaErros(erro);
    }

    carregandoErrosSite = false;

    desenharErrosSite();
}


function errosVisiveis(){

    const pagina = $("filtroErrosPagina").value;

    return pagina
        ? errosSite.filter(erro => erro.pagina === pagina)
        : errosSite;
}


function desenharFiltroErros(){

    const select = $("filtroErrosPagina");

    const escolhida = select.value;

    const paginas = [...new Set(errosSite.map(erro => erro.pagina))];

    select.innerHTML = "";

    select.appendChild(criar("option", "", "Todas as páginas"));

    select.firstChild.value = "";

    paginas
        .sort((a, b) => nomePaginaOnline(a).localeCompare(nomePaginaOnline(b)))
        .forEach(pagina => {

            const opcao = criar("option", "", nomePaginaOnline(pagina));

            opcao.value = pagina;

            select.appendChild(opcao);
        });

    select.value = paginas.includes(escolhida) ? escolhida : "";
}


function criarCelulaMensagemErro(erro){

    const celula = criar("td", "col-erro");

    celula.appendChild(
        criar("span", `tag-erro tag-erro-${erro.tipo}`, ROTULOS_TIPO_ERRO[erro.tipo] || erro.tipo)
    );

    const botaoCopiar = criar("button", "btn-copiar-erro", "📋 Copiar");

    botaoCopiar.type = "button";

    botaoCopiar.title = "Copiar o erro com os detalhes, para colar numa conversa";

    botaoCopiar.addEventListener("click", () => copiarErroSite(erro));

    celula.appendChild(botaoCopiar);

    celula.appendChild(criar("div", "erro-mensagem", erro.mensagem));

    if(erro.detalhe){

        const detalhes = criar("details");

        detalhes.appendChild(criar("summary", "", "Detalhes"));

        detalhes.appendChild(criar("pre", "", erro.detalhe));

        celula.appendChild(detalhes);
    }

    return celula;
}


function criarLinhaErro(erro){

    const linha = criar("tr");

    const quando = criar("td", "col-quando", dataHoraBR(erro.atualizado_em));

    quando.title = `Primeira vez: ${dataHoraBR(erro.criado_em)}`;

    linha.append(
        quando,
        criar("td", "", nomePaginaOnline(erro.pagina)),
        criar("td", "", erro.versao),
        criar("td", "col-erro-usuario", erro.usuario_email || "—"),
        criarCelulaMensagemErro(erro),
        criar("td", "", erro.vezes)
    );

    return linha;
}


function criarLinhaAvisoErros(texto){

    const linha = criar("tr");

    const celula = criar("td", "erros-vazio", texto);

    celula.colSpan = 6;

    linha.appendChild(celula);

    return linha;
}


function desenharErrosSite(){

    desenharFiltroErros();

    const visiveis = errosVisiveis();

    const corpo = $("corpoErros");

    corpo.innerHTML = "";

    if(visiveis.length){

        visiveis.forEach(erro => corpo.appendChild(criarLinhaErro(erro)));

    }else{

        corpo.appendChild(
            criarLinhaAvisoErros(
                carregandoErrosSite
                    ? "Carregando..."
                    : (falhaErrosSite || `Nenhum erro nos últimos ${DIAS_ERROS_SITE} dias`)
            )
        );
    }

    const ocorrencias =
        visiveis.reduce((soma, erro) => soma + Number(erro.vezes || 0), 0);

    const noLimite = errosSite.length >= LIMITE_ERROS_SITE;

    $("contagemErros").innerText =
        visiveis.length
            ? `${visiveis.length} erro(s), ${ocorrencias} ocorrência(s)${noLimite ? ` (só os ${LIMITE_ERROS_SITE} mais recentes)` : ""}`
            : "";

    $("btnLimparErros").disabled = !visiveis.length;

    $("btnCopiarErros").disabled = !visiveis.length;
}


// apaga só o que está na lista: com o filtro, só os daquela página
async function limparErrosSite(){

    const ids = errosVisiveis().map(erro => erro.id);

    if(!ids.length) return;

    if(!confirm(`Apagar ${ids.length} erro(s) da lista?`)) return;

    try{

        const { error } =
            await supabaseClient
                .from(TABELA_ERROS_SITE)
                .delete()
                .in("id", ids);

        if(error) throw error;

        mostrarToast("Lista de erros limpa");

    }catch(erro){

        console.error("[admin] Falha ao apagar os erros:", erro);

        mostrarToast("Não foi possível apagar os erros", true);
    }

    await carregarErrosSite();
}


// confere o caminho inteiro, do navegador até esta lista
async function testarRegistroErros(){

    const botao = $("btnTestarErros");

    botao.disabled = true;

    const gravou =
        await enviarLoteErros([{
            tipo: "tratado",
            mensagem: "Teste do registro de erros (botão do Admin)",
            detalhe: "",
            vezes: 1
        }]);

    botao.disabled = false;

    mostrarToast(
        gravou
            ? "Teste registrado: ele aparece na lista"
            : "O teste não foi registrado: confira o SQL no Supabase",
        !gravou
    );

    if(gravou) await carregarErrosSite();
}
