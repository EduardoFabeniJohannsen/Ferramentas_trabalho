// ======================================
// ADMIN - ERROS DO SISTEMA
// ======================================
// Lista o que o registro-erros.js guardou na tabela erros_site. Só o admin lê e
// apaga (quem protege é o RLS). As mensagens vêm do navegador de cada pessoa:
// nada entra na tela como HTML. O mesmo erro (página, tipo e mensagem) gravado por
// várias pessoas ou versões aparece numa linha só (agruparErros).

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


// O banco grava um registro por pessoa e por versão. Na tela, mesma página, tipo e
// mensagem viram uma linha só: soma as vezes, mostra a versão e a pessoa mais
// recentes e guarda os registros (Ver os N registros). A lista já vem do mais
// recente para o mais antigo, então o primeiro de cada grupo é o mais recente.
function agruparErros(lista){

    const grupos = new Map();

    lista.forEach(erro => {

        const chave = `${erro.pagina}|${erro.tipo}|${erro.mensagem}`;

        const grupo = grupos.get(chave);

        if(!grupo){

            grupos.set(chave, { ...erro, vezes: Number(erro.vezes || 0), registros: [erro] });

            return;
        }

        grupo.registros.push(erro);

        grupo.vezes += Number(erro.vezes || 0);

        if(erro.criado_em < grupo.criado_em) grupo.criado_em = erro.criado_em;
    });

    return [...grupos.values()];
}


function gruposVisiveis(){

    return agruparErros(errosVisiveis());
}


// versões ou pessoas diferentes do grupo, a mais recente primeiro
function valoresDoGrupo(grupo, campo, vazio){

    return [...new Set(grupo.registros.map(erro => erro[campo] || vazio))];
}


// "16.30.0" ou "16.30.0 (+2)", com todas no title
function criarCelulaVarios(grupo, campo, vazio, classe){

    const valores = valoresDoGrupo(grupo, campo, vazio);

    const celula =
        criar("td", classe, valores.length > 1 ? `${valores[0]} (+${valores.length - 1})` : valores[0]);

    if(valores.length > 1) celula.title = valores.join("\n");

    return celula;
}


// a lista dos registros juntados: quando, versão, quem e quantas vezes
function criarRegistrosDoGrupo(grupo){

    const detalhes = criar("details", "erro-registros");

    detalhes.appendChild(criar("summary", "", `Ver os ${grupo.registros.length} registros`));

    const lista = criar("ul");

    grupo.registros.forEach(erro => {

        lista.appendChild(
            criar(
                "li",
                "",
                `${dataHoraBR(erro.atualizado_em)} · ${erro.versao} · ${erro.usuario_email || "—"} · ${erro.vezes} vez(es)`
            )
        );
    });

    detalhes.appendChild(lista);

    return detalhes;
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

    // o detalhe (onde aconteceu) é o do registro mais recente
    if(erro.detalhe){

        const detalhes = criar("details");

        detalhes.appendChild(criar("summary", "", "Detalhes"));

        detalhes.appendChild(criar("pre", "", erro.detalhe));

        celula.appendChild(detalhes);
    }

    if(erro.registros?.length > 1) celula.appendChild(criarRegistrosDoGrupo(erro));

    return celula;
}


// recebe um grupo (agruparErros): com um registro só, fica igual ao registro
function criarLinhaErro(erro){

    const linha = criar("tr");

    const quando = criar("td", "col-quando", dataHoraBR(erro.atualizado_em));

    quando.title = `Primeira vez: ${dataHoraBR(erro.criado_em)}`;

    linha.append(
        quando,
        criar("td", "", nomePaginaOnline(erro.pagina)),
        criarCelulaVarios(erro, "versao", "—", ""),
        criarCelulaVarios(erro, "usuario_email", "—", "col-erro-usuario"),
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

    const visiveis = gruposVisiveis();

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

    const grupos = gruposVisiveis().length;

    const registros = grupos === ids.length ? "" : ` (${ids.length} registros)`;

    if(!confirm(`Apagar ${grupos} erro(s) da lista${registros}?`)) return;

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
