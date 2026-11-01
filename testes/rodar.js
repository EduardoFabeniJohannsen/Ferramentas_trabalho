// Roda todos os testes, um de cada vez, e mostra só o resumo e o que falhou.
//   npm test              todos
//   npm test -- leads     só os que têm "leads" no nome
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const LIMITE_MS = 5 * 60 * 1000;

const filtro = process.argv[2] || "";

const testes =
    fs.readdirSync(__dirname)
        .filter(nome => /^teste-.*\.js$/.test(nome) && nome.includes(filtro))
        .sort();

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

(async () => {

    if(!testes.length){
        console.log(`Nenhum teste com "${filtro}" no nome.`);
        process.exit(1);
    }

    const resultados = [];

    for(const nome of testes){

        const r = await rodar(nome);

        resultados.push(r);

        console.log(`${r.passou ? "ok   " : "FALHA"} ${nome} (${r.verificacoes} verificações, ${r.segundos}s)`);

        if(!r.passou){

            r.linhas.filter(linha => linha.startsWith("FALHA")).forEach(linha => console.log("      " + linha));

            // sem o resumo final o teste quebrou no meio: mostra o fim da saída
            if(!r.linhas.some(linha => /^(todos ok|\d+ falha\(s\))$/.test(linha.trim()))){
                r.linhas.slice(-15).forEach(linha => console.log("      " + linha));
            }
        }
    }

    const reprovados = resultados.filter(r => !r.passou).length;
    const total = resultados.reduce((soma, r) => soma + r.verificacoes, 0);

    console.log(
        reprovados
            ? `\n${reprovados} de ${resultados.length} arquivos com falha.`
            : `\nTudo certo: ${resultados.length} arquivos, ${total} verificações.`
    );

    process.exit(reprovados ? 1 : 0);

})();
