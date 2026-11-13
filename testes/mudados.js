// Para `npm test -- --mudados`: escolhe os testes ligados aos arquivos que mudaram
// desde o último commit (git diff + arquivos novos). Os rápidos sempre entram (o
// rodar.js cuida disso); aqui só se decide quais dos que abrem o navegador rodam.
//
// Como liga arquivo e teste:
//   - testes/teste-x.js mudou: roda ele.
//   - arquivo do site: vê quais páginas carregam ele (pelo <link>/<script> do .html).
//     Usado em 5 páginas ou mais (helpers.js, style.css, supabase-js...): roda tudo.
//   - para cada página: os testes que citam "<página>.html" (menos os que citam
//     5 páginas ou mais, que são gerais) e os que têm o nome da página no nome.
//   - os testes que citam o nome do arquivo mudado (ex: agenda-utils.js) e os com
//     o assunto no nome dele (admin-erros.js -> teste-erros, agenda-conflitos.js
//     -> teste-conflitos).
//   - qualquer mudança no site: teste-paginas.
//   - outro arquivo de testes/, package.json, .github/ ou .githooks/: roda tudo.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..");
const site = path.join(raiz, "site");

// a partir de quantas páginas um arquivo (ou um teste) conta como geral
const PAGINAS_GERAL = 5;

const git = (...args) =>
    // stderr ignorado: o git avisa de fim de linha (CRLF) e isso só polui a saída
    execFileSync("git", args, { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
        .split(/\r?\n/)
        .filter(Boolean);

const arquivosMudados = () => [
    ...new Set([
        ...git("diff", "--name-only", "HEAD"),
        ...git("ls-files", "--others", "--exclude-standard")
    ])
];

// { agenda: "<html da agenda.html>", ... } com o nome da página em minúsculas
const paginasDoSite = () =>
    Object.fromEntries(
        fs.readdirSync(site)
            .filter(nome => nome.endsWith(".html"))
            .map(nome => [nome.slice(0, -5).toLowerCase(), fs.readFileSync(path.join(site, nome), "utf8")])
    );

const textoMinusculo = (nome) => fs.readFileSync(path.join(__dirname, nome), "utf8").toLowerCase();

// páginas citadas por um teste ("agenda.html", "WEG.html"...)
const paginasCitadas = (texto, paginas) =>
    Object.keys(paginas).filter(pagina => texto.includes(`${pagina}.html`));

// devolve null para "rode tudo" ou a lista de testes escolhidos
function testesDosMudados(testes, mudados = arquivosMudados()){

    const paginas = paginasDoSite();

    const escolhidos = new Set();

    const textos = Object.fromEntries(testes.map(nome => [nome, textoMinusculo(nome)]));

    const incluir = (filtro) => testes.filter(filtro).forEach(nome => escolhidos.add(nome));

    for(const arquivo of mudados){

        const caminho = arquivo.replace(/\\/g, "/");

        const nome = path.posix.basename(caminho).toLowerCase();

        if(/^testes\/teste-[^/]+\.js$/.test(caminho)){

            if(testes.includes(nome)) escolhidos.add(nome);

            continue;
        }

        if(/^(testes\/|\.github\/|\.githooks\/|package(-lock)?\.json$)/.test(caminho)) return null;

        if(!caminho.startsWith("site/")) continue;

        const noSite = caminho.slice("site/".length);

        if(noSite.startsWith("js/vendor/")) return null;

        // o assunto do teste no nome do arquivo: admin-erros.js -> teste-erros.js
        const partes = `-${nome.replace(/\.[a-z]+$/, "")}-`;

        incluir(teste =>
            teste === "teste-paginas.js" ||
            textos[teste].includes(nome) ||
            partes.includes(`-${teste.slice("teste-".length, -3)}-`)
        );

        // a própria página ou as páginas que carregam o arquivo
        const usadoEm =
            noSite.endsWith(".html")
                ? [nome.slice(0, -5)]
                : Object.keys(paginas).filter(pagina => paginas[pagina].includes(`"${noSite}"`));

        if(usadoEm.length >= PAGINAS_GERAL) return null;

        for(const pagina of usadoEm){

            incluir(teste => {

                const citadas = paginasCitadas(textos[teste], paginas);

                return (citadas.includes(pagina) && citadas.length < PAGINAS_GERAL) ||
                    teste.startsWith(`teste-${pagina}-`) ||
                    teste === `teste-${pagina}.js`;
            });
        }
    }

    return [...escolhidos].sort();
}

module.exports = { arquivosMudados, testesDosMudados };
