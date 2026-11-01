// O ARQUIVOS.md precisa acompanhar o projeto. Se este teste falhar: `npm run mapa`.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { gerarMapa } = require("./gerar-mapa.js");

const raiz = path.resolve(__dirname, "..");

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

const mapa = fs.readFileSync(path.join(raiz, "ARQUIVOS.md"), "utf8").replace(/\r\n/g, "\n");

confere("o mapa está em dia (se não: npm run mapa)", gerarMapa(raiz, mapa) === mapa);
confere("nenhum arquivo sem descrição", !mapa.includes("(sem descrição)"));

// todo arquivo citado no texto existe
const noDisco = new Set(
    fs.readdirSync(raiz, { recursive: true })
        .filter(nome => !/^(node_modules|\.git)[\\/]/.test(nome))
        .map(nome => path.basename(nome))
);

const citados =
    [...mapa.matchAll(/`([\w./-]+\.(?:js|css|html))`/g)]
        .map(achou => path.basename(achou[1]));

const inexistentes = [...new Set(citados)].filter(nome => !noDisco.has(nome));

confere("todo arquivo citado existe", inexistentes.length === 0, inexistentes.length ? inexistentes : undefined);

// todo CSS tem a sua explicação (a seção é escrita à mão)
const semExplicacao =
    fs.readdirSync(path.join(raiz, "css"))
        .filter(nome => !mapa.includes("`" + nome + "`"));

confere("todo CSS está explicado", semExplicacao.length === 0, semExplicacao.length ? semExplicacao : undefined);

// o gerador, numa cópia pequena do projeto
const copia = fs.mkdtempSync(path.join(os.tmpdir(), "mapa-"));

try{

    fs.mkdirSync(path.join(copia, "js", "area"), { recursive: true });

    fs.writeFileSync(path.join(copia, "js", "comum.js"), "// ===\n// COMUM\n// ===\n// Texto do cabeçalho.\nfunction a(){}\nasync function b(){}\nconst c = (x) => x;\nconst d = async () => 1;\nconst E = 5;\n");
    fs.writeFileSync(path.join(copia, "js", "area", "grande.js"), "\n".repeat(400));
    fs.writeFileSync(path.join(copia, "pagina.html"), '<link rel="stylesheet" href="css/style.css">\n<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>\n<script src="js/comum.js"></script>\n<script src="js/area/grande.js"></script>\n');
    fs.writeFileSync(path.join(copia, "nova.html"), '<script src="js/comum.js"></script>\n');

    const antes = [
        "# Mapa", "",
        "**pagina.html** — Página", "- CSS: velho", "- JS: velho", "",
        "**apagada.html** — Sumiu", "- CSS: x", "- JS: y", "",
        "## Arquivos (responsabilidade e funções)", "",
        "- `comum.js` (1 linhas): Descrição à mão. ⚠️ passa de ~300 linhas (sugerir divisão)", "  - velha",
        "- `removido.js` (9 linhas): Não existe mais.", "",
        "## CSS", "",
        "## Atenções", "",
        "- Arquivos acima de ~300 linhas (sugerir divisão antes de crescerem): `removido.js` (999).", ""
    ].join("\n");

    const novo = gerarMapa(copia, antes);

    confere("gerador: ordem da página", novo.includes("**pagina.html** — Página\n- CSS: style\n- JS: [SheetJS 0.18.5/CDN] → comum → grande\n"));
    confere("gerador: página apagada sai", !novo.includes("apagada.html"));
    confere("gerador: página nova entra", novo.includes("**nova.html** — (sem descrição)"));
    confere("gerador: mantém a descrição escrita à mão", novo.includes("- `comum.js` (9 linhas): Descrição à mão.\n"));
    confere("gerador: lista só funções", novo.includes("  - a, b, c, d\n"));
    confere("gerador: arquivo novo usa o cabeçalho ou avisa", novo.includes("- `grande.js` (400 linhas): (sem descrição)"));
    confere("gerador: arquivo apagado sai", !novo.includes("removido.js"));
    confere("gerador: lista os grandes", novo.includes("crescerem): `grande.js` (400)."));
    confere("gerador: rodar de novo não muda nada", gerarMapa(copia, novo) === novo);
    confere("gerador: ignora fim de linha do Windows", gerarMapa(copia, novo.replace(/\n/g, "\r\n")) === novo);

}finally{

    fs.rmSync(copia, { recursive: true, force: true });
}

console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exit(falhas ? 1 : 0);
