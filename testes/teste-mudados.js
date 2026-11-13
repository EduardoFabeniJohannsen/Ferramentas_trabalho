// npm test -- --mudados: confere quais testes de navegador cada arquivo mudado chama
// (testes/mudados.js). Não abre o navegador.
const fs = require("fs");
const path = require("path");
const { testesDosMudados } = require("./mudados.js");

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

// os que abrem o navegador (o mesmo critério do rodar.js)
const doNavegador =
    fs.readdirSync(__dirname)
        .filter(nome => /^teste-.*\.js$/.test(nome) && fs.readFileSync(path.join(__dirname, nome), "utf8").includes("chrom" + "ium"))
        .sort();

const escolhe = (...arquivos) => testesDosMudados(doNavegador, arquivos);

const tem = (lista, ...nomes) => Array.isArray(lista) && nomes.every(nome => lista.includes(nome));

const agenda = escolhe("site/js/agenda/agenda-utils.js");
confere("script da agenda: testes da agenda", tem(agenda, "teste-agenda.js", "teste-conflitos.js", "teste-usar.js", "teste-paginas.js"), agenda);
confere("script da agenda: sem os de outras páginas", !tem(agenda, "teste-leads.js") && !tem(agenda, "teste-propostas.js"), agenda);
confere("script da agenda: sem os gerais", !tem(agenda, "teste-versao.js") && !tem(agenda, "teste-armazenamento.js"), agenda);

confere("CSS da agenda (carregado pela agenda.html)", tem(escolhe("site/css/agenda-modal.css"), "teste-agenda.js"));

const erros = escolhe("site/js/admin/admin-erros.js");
confere("assunto no nome: admin-erros.js chama teste-erros", tem(erros, "teste-erros.js", "teste-paginas.js"), erros);
confere("assunto no nome: agenda-conflitos.js chama teste-conflitos", tem(escolhe("site/js/agenda/agenda-conflitos.js"), "teste-conflitos.js"));

confere("admin.css: também a página que carrega ele (Propostas Zap)", tem(escolhe("site/css/admin.css"), "teste-propostas-copiadas.js"));

const leads = escolhe("site/js/leads/leads-cards.js");
confere("script de leads: teste-leads e teste-paginas", tem(leads, "teste-leads.js", "teste-paginas.js") && !tem(leads, "teste-agenda.js"), leads);

confere("arquivo de todas as páginas: roda tudo", escolhe("site/js/helpers.js") === null);
confere("style.css: roda tudo", escolhe("site/css/style.css") === null);
confere("biblioteca de terceiros: roda tudo", escolhe("site/js/vendor/supabase-2.45.0.js") === null);
confere("rodar.js, package.json ou GitHub: roda tudo", ["testes/rodar.js", "package.json", ".github/workflows/testes.yml"].every(arquivo => escolhe(arquivo) === null));

confere("teste mudado: roda ele", JSON.stringify(escolhe("testes/teste-leads.js")) === '["teste-leads.js"]', escolhe("testes/teste-leads.js"));
confere("ARQUIVOS.md: nenhum de navegador (o teste-mapa é rápido)", JSON.stringify(escolhe("ARQUIVOS.md")) === "[]");
confere("caminho com barra invertida (Windows)", tem(escolhe("site\\js\\leads\\leads-cards.js"), "teste-leads.js"));

console.log(falhas ? `\n${falhas} falha(s)` : "\ntodos ok");
process.exit(falhas ? 1 : 0);
