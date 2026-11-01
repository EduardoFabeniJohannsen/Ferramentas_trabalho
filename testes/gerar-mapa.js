// Atualiza o ARQUIVOS.md a partir dos arquivos do projeto: `npm run mapa`.
// Gera a ordem dos scripts de cada página, as linhas e funções de cada arquivo e a
// lista dos arquivos grandes. As descrições e as outras seções são escritas à mão.
const fs = require("fs");
const path = require("path");

const LIMITE_LINHAS = 300;

const contarLinhas = (texto) => texto.split(/\r?\n/).length - (texto.endsWith("\n") ? 1 : 0);


const lerScripts = (raiz) =>
    fs.readdirSync(path.join(raiz, "js"), { recursive: true })
        .filter(nome => nome.endsWith(".js"))
        .map(nome => {
            const texto = fs.readFileSync(path.join(raiz, "js", nome), "utf8");
            return { nome: path.basename(nome), texto };
        })
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));


// funções de primeiro nível, na ordem do arquivo
const funcoesDoScript = (texto) =>
    [...texto.matchAll(/^(?:async\s+function\s+|function\s+|const\s+)([A-Za-z_$][\w$]*)(\s*=\s*(?:async\s*)?\(|\s*\()/gm)]
        .map(achou => achou[1]);


// primeiro comentário depois do título do arquivo: descrição de arquivo novo
const descricaoDoCabecalho = (texto) => {
    const linhas = texto.split(/\r?\n/);
    const titulo = linhas.findIndex((linha, i) => i > 0 && linha.startsWith("// ==="));
    const proxima = linhas[titulo + 1] || "";
    return proxima.startsWith("//") ? proxima.replace(/^\/\/\s*/, "") : "(sem descrição)";
};


const ordemDaPagina = (html, jsAtual) => {

    const css = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="css\/([^"]+)\.css"/g)].map(a => a[1]);

    const js = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
        .map(a => a[1])
        .filter(src => !src.includes("supabase-js"))
        .map(src => {
            if(src.startsWith("js/")) return path.basename(src, ".js");
            const xlsx = src.match(/xlsx\/([\d.]+)/);
            return xlsx ? `[SheetJS ${xlsx[1]}/CDN]` : `[${new URL(src).hostname}/CDN]`;
        });

    return { css: css.join(" → "), js: js.join(" → ") || jsAtual };
};


function gerarMapa(raiz, atual){

    const scripts = lerScripts(raiz);

    let mapa = atual.replace(/\r\n/g, "\n");

    // ---------- ordem por página ----------
    mapa = mapa.replace(
        /(\*\*([^*\n]+\.html)\*\*[^\n]*\n)- CSS:[^\n]*\n- JS:[^\n]*(\n)/g,
        (tudo, titulo, pagina, fim) => {
            const arquivo = path.join(raiz, pagina);
            if(!fs.existsSync(arquivo)) return "";
            const ordem = ordemDaPagina(fs.readFileSync(arquivo, "utf8"), "");
            return `${titulo}- CSS: ${ordem.css}\n- JS: ${ordem.js}${fim}`;
        }
    );

    // página nova entra na lista para alguém descrever
    const novasPaginas =
        fs.readdirSync(raiz)
            .filter(nome => nome.endsWith(".html") && !mapa.includes(`**${nome}**`));

    novasPaginas.forEach(pagina => {
        const ordem = ordemDaPagina(fs.readFileSync(path.join(raiz, pagina), "utf8"), "");
        mapa = mapa.replace(
            "\n## Arquivos (responsabilidade e funções)",
            () => `\n**${pagina}** — (sem descrição)\n- CSS: ${ordem.css}\n- JS: ${ordem.js}\n\n## Arquivos (responsabilidade e funções)`
        );
    });

    // ---------- arquivos ----------
    const marcaInicio = "## Arquivos (responsabilidade e funções)\n";
    const inicio = mapa.indexOf(marcaInicio) + marcaInicio.length;
    const fim = mapa.indexOf("\n## CSS");

    const descricoes = {};

    for(const achou of mapa.slice(inicio, fim).matchAll(/^- `([^`]+\.js)` \(\d+ linhas\): ([^\n]*)$/gm)){
        descricoes[achou[1]] = achou[2].replace(/\s*⚠️ passa de ~300 linhas( \(sugerir divisão\))?/, "");
    }

    const entradas = scripts.map(({ nome, texto }) => {
        const funcoes = funcoesDoScript(texto);
        const descricao = descricoes[nome] || descricaoDoCabecalho(texto);
        return `- \`${nome}\` (${contarLinhas(texto)} linhas): ${descricao}` + (funcoes.length ? `\n  - ${funcoes.join(", ")}` : "");
    });

    mapa = mapa.slice(0, inicio) + "\n" + entradas.join("\n") + "\n" + mapa.slice(fim);

    // ---------- arquivos grandes ----------
    const grandes =
        scripts
            .map(({ nome, texto }) => ({ nome, linhas: contarLinhas(texto) }))
            .filter(item => item.linhas > LIMITE_LINHAS)
            .sort((a, b) => b.linhas - a.linhas)
            .map(item => `\`${item.nome}\` (${item.linhas})`);

    mapa = mapa.replace(
        /^- Arquivos acima de ~300 linhas[^\n]*$/m,
        () => `- Arquivos acima de ~300 linhas (sugerir divisão antes de crescerem): ${grandes.join(", ")}.`
    );

    return mapa;
}


module.exports = { gerarMapa, lerScripts };


if(require.main === module){

    const raiz = path.resolve(__dirname, "..");
    const caminho = path.join(raiz, "ARQUIVOS.md");
    const atual = fs.readFileSync(caminho, "utf8");
    const novo = gerarMapa(raiz, atual);
    const final = atual.includes("\r\n") ? novo.replace(/\n/g, "\r\n") : novo;

    if(final === atual){

        console.log("ARQUIVOS.md já estava em dia.");

    }else{

        fs.writeFileSync(caminho, final);

        console.log("ARQUIVOS.md atualizado.");
    }

    const semDescricao = (novo.match(/\(sem descrição\)/g) || []).length;

    if(semDescricao) console.log(`Falta escrever ${semDescricao} descrição(ões): procure "(sem descrição)".`);
}
