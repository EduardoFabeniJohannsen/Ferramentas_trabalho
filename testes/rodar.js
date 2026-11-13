// Roda os testes, vários ao mesmo tempo, e mostra só o resumo e o que falhou.
//   npm test                 todos
//   npm test -- leads        só os que têm "leads" no nome
//   npm test -- --rapidos    só os que não abrem o navegador (o pre-commit usa)
//   npm test -- --mudados    os rápidos e os ligados aos arquivos que mudaram desde
//                            o último commit (ver mudados.js)
//   npm test -- --juntos=1   um de cada vez (padrão: até JUNTOS_PADRAO ao mesmo tempo)
// Cada teste abre o próprio Chrome e o próprio servidor simulado (porta livre),
// então rodar junto não mistura os dados. Os mais demorados começam primeiro,
// pelo tempo da última rodada (capturas/tempos.json, fora do Git).
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { testesDosMudados } = require("./mudados.js");

const LIMITE_MS = 5 * 60 * 1000;

// o computador do GitHub tem 4 processadores; mais que isso, um Chrome atrasa o outro
const JUNTOS_PADRAO = Math.max(1, Math.min(4, os.cpus().length - 1));

const argumentos = process.argv.slice(2);

const rapidos = argumentos.includes("--rapidos");

const mudados = argumentos.includes("--mudados");

const juntos =
    Number((argumentos.find(arg => arg.startsWith("--juntos=")) || "").split("=")[1]) || JUNTOS_PADRAO;

const filtro = argumentos.find(arg => !arg.startsWith("--")) || "";

const ARQUIVO_TEMPOS = path.join(__dirname, "capturas", "tempos.json");

const abreNavegador = (nome) => fs.readFileSync(path.join(__dirname, nome), "utf8").includes("chromium");

const lerTempos = () => {
    try{ return JSON.parse(fs.readFileSync(ARQUIVO_TEMPOS, "utf8")); }
    catch{ return {}; }
};

const guardarTempos = (resultados) => {
    try{
        const tempos = { ...lerTempos() };
        resultados.forEach(r => { tempos[r.nome] = r.segundos; });
        fs.mkdirSync(path.dirname(ARQUIVO_TEMPOS), { recursive: true });
        fs.writeFileSync(ARQUIVO_TEMPOS, JSON.stringify(tempos, null, 2));
    }catch{
        // sem os tempos, só a ordem da próxima rodada fica pior
    }
};

const escolherTestes = () => {

    let testes =
        fs.readdirSync(__dirname)
            .filter(nome => /^teste-.*\.js$/.test(nome) && nome.includes(filtro))
            .sort();

    if(rapidos) testes = testes.filter(nome => !abreNavegador(nome));

    if(mudados && !rapidos){

        const ligados = testesDosMudados(testes.filter(abreNavegador));

        if(ligados === null){

            console.log("Mudou arquivo usado em todas as páginas (ou dos próprios testes): rodando todos.\n");

        }else{

            console.log(
                ligados.length
                    ? `Ligados ao que mudou: ${ligados.join(", ")} (e os rápidos).\n`
                    : "Nenhum teste de navegador ligado ao que mudou: só os rápidos.\n"
            );

            testes = testes.filter(nome => !abreNavegador(nome) || ligados.includes(nome));
        }
    }

    // os mais demorados primeiro (sem tempo guardado: no começo, por garantia)
    const tempos = lerTempos();

    return testes.sort((a, b) => (tempos[b] ?? Infinity) - (tempos[a] ?? Infinity) || a.localeCompare(b));
};

// no GitHub, a falha aparece na página da rodada, sem precisar abrir o registro
const anotarNoGitHub = (nome, linhas) => {

    if(!process.env.GITHUB_ACTIONS) return;

    const texto = linhas.map(linha => linha.replace(/%/g, "%25")).join("%0A");

    console.log(`::error title=${nome}::${texto}`);
};

const rodar = (nome) => new Promise(resolver => {

    const inicio = Date.now();
    const processo = spawn(process.execPath, [path.join(__dirname, nome)]);

    let saida = "";
    processo.stdout.on("data", parte => { saida += parte; });
    processo.stderr.on("data", parte => { saida += parte; });

    const limite = setTimeout(() => {
        saida += `\nFALHA passou de ${LIMITE_MS / 60000} minutos`;
        processo.kill();
    }, LIMITE_MS);

    processo.on("close", codigo => {
        clearTimeout(limite);
        const linhas = saida.split(/\r?\n/);
        resolver({
            nome,
            passou: codigo === 0 && !linhas.some(linha => linha.startsWith("FALHA")),
            verificacoes: linhas.filter(linha => linha.startsWith("ok ")).length,
            segundos: Math.round((Date.now() - inicio) / 1000),
            linhas
        });
    });
});

const mostrar = (r) => {

    console.log(`${r.passou ? "ok   " : "FALHA"} ${r.nome} (${r.verificacoes} verificações, ${r.segundos}s)`);

    if(r.passou) return;

    const falhas = r.linhas.filter(linha => linha.startsWith("FALHA"));

    falhas.forEach(linha => console.log("      " + linha));

    // sem o resumo final o teste quebrou no meio: mostra o fim da saída
    if(!r.linhas.some(linha => /^(todos ok|\d+ falha\(s\))$/.test(linha.trim()))){
        r.linhas.slice(-15).forEach(linha => console.log("      " + linha));
    }

    anotarNoGitHub(r.nome, falhas.length ? falhas : ["O teste parou antes do fim. Veja o registro da rodada."]);
};

(async () => {

    const testes = escolherTestes();

    if(!testes.length){
        console.log(`Nenhum teste com "${filtro}" no nome.`);
        process.exit(1);
    }

    const inicio = Date.now();

    const resultados = [];

    const fila = [...testes];

    // cada "trabalhador" pega o próximo da fila quando o dele termina
    const trabalhador = async () => {
        while(fila.length){
            const r = await rodar(fila.shift());
            resultados.push(r);
            mostrar(r);
        }
    };

    await Promise.all(Array.from({ length: Math.min(juntos, testes.length) }, trabalhador));

    guardarTempos(resultados);

    const reprovados = resultados.filter(r => !r.passou).length;
    const total = resultados.reduce((soma, r) => soma + r.verificacoes, 0);
    const segundos = Math.round((Date.now() - inicio) / 1000);
    const duracao = segundos >= 60 ? `${Math.floor(segundos / 60)} min ${segundos % 60} s` : `${segundos} s`;

    console.log(
        reprovados
            ? `\n${reprovados} de ${resultados.length} arquivos com falha (${duracao}).`
            : `\nTudo certo: ${resultados.length} arquivos, ${total} verificações em ${duracao}.`
    );

    process.exit(reprovados ? 1 : 0);

})();
