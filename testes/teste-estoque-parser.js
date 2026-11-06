const fs = require("fs");
const vm = require("vm");
const path = require("path");
const raiz = path.resolve(__dirname, "..", "site");

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

(async () => {

    const ctx = { document: { querySelectorAll: () => [] } };
    vm.createContext(ctx);
    for(const f of ["helpers.js", "estoque/estoque-config.js", "estoque/estoque-parser.js"]){
        vm.runInContext(fs.readFileSync(path.join(raiz, "js", f), "utf8"), ctx);
    }
    const resumir = (linhas) => { ctx.__l = linhas; return vm.runInContext("resumirEstoque(__l, 'x.xlsx')", ctx); };

    const comMarca = resumir([
        ["Patrimônio", "Status", "Localização", "Equipamento", "Marca", "Modelo", "Previsão Retorno"],
        ["WAE18R001", "Disponível", "Pátio", "ARTICULADA 18M", "GENIE", "Z45", ""],
        ["WTE14046", "Locado - Locação", "Cliente X", "TESOURA 14M", "JLG", "4069LE", "2026-11-05"]
    ]);
    const a = comMarca.status.disponivel.WAE18[0];
    confere("guarda marca, modelo e equipamento", a.m === "GENIE" && a.f === "Z45" && a.e === "ARTICULADA 18M", a);
    confere("continua guardando o resto", a.p === "WAE18R001" && a.c === "Pátio", a);
    confere("sem aviso com a coluna Marca", !comMarca.avisos.some(t => t.includes("Marca")), comMarca.avisos);
    confere("previsão continua", comMarca.status.locado.WTE14[0].r === "05/11/2026");

    const anos = resumir([
        ["Patrimônio", "Status", "Anotações", "Ano de Fabricação"],
        ["WAE18R001", "Disponível", "1999", 2019],
        ["WAE18R002", "Disponível", "", "2020"],
        ["WAE18R003", "Disponível", "", 43555],
        ["WAE18R004", "Disponível", "", "15/03/2018"],
        ["WAE18R005", "Disponível", "", "sem informação"],
        ["WAE18R006", "Disponível", "", ""]
    ]);
    confere(
        "ano: número, texto, data e vazio",
        anos.status.disponivel.WAE18.map(m => m.a || "").join() === "2019,2020,2019,2018,,",
        anos.status.disponivel.WAE18.map(m => m.a)
    );
    confere("com a coluna de ano não avisa", !anos.avisos.some(t => t.includes("ano de fabricação")), anos.avisos);
    confere("sem a coluna de ano: avisa e não guarda", comMarca.avisos.some(t => t.includes("ano de fabricação")) && !("a" in a), comMarca.avisos);
    const soAno = resumir([["Patrimônio", "Status", "Ano"], ["WAE18R001", "Disponível", 2021]]);
    confere("aceita coluna Ano", soAno.status.disponivel.WAE18[0].a === "2021");
    const fabricacao = resumir([["Patrimônio", "Status", "Fabricação"], ["WAE18R001", "Disponível", 2017]]);
    confere("aceita coluna Fabricação", fabricacao.status.disponivel.WAE18[0].a === "2017");
    const modeloFab = resumir([["Patrimônio", "Status", "Modelo de Fabricação"], ["WAE18R001", "Disponível", "Z45 2015"]]);
    confere("modelo de fabricação não vira ano", modeloFab.status.disponivel.WAE18[0].f === "Z45 2015" && !("a" in modeloFab.status.disponivel.WAE18[0]));

    const fabricante = resumir([
        ["PATRIMONIO", "STATUS", "Fabricante"],
        ["WAE18R001", "Disponível", "HAULOTTE"]
    ]);
    confere("aceita coluna Fabricante", fabricante.status.disponivel.WAE18[0].m === "HAULOTTE");

    const semMarca = resumir([
        ["Patrimônio", "Status", "Equipamento"],
        ["WAE18R001", "Disponível", "ARTICULADA 18M GENIE"]
    ]);
    confere("sem coluna Marca: guarda equipamento e avisa", semMarca.status.disponivel.WAE18[0].e === "ARTICULADA 18M GENIE" && semMarca.avisos.some(t => t.includes("Marca")), semMarca.avisos);

    const quebrada = resumir([
        ["Patrimônio", "Status", "Localização", "Equipamento", "Marca"],
        ["WAE18R001", "", "Cliente Y", "", ""],
        ["", "x", "Disponível", "ARTICULADA 18M", ""]
    ]);
    confere("linha quebrada ainda funciona", quebrada.status.disponivel.WAE18[0].e === "ARTICULADA 18M", quebrada.status.disponivel);

    const repetidos = resumir([
        ["Patrimônio", "Status"],
        ["WAE18R001", "Disponível"],
        ["WTE14046", "Disponível"],
        ["WAE18R001", "Disponível"],
        ["WTE14046", "Disponível"],
        ["WTE14046", "Disponível"]
    ]);
    const avisoRepetidos = repetidos.avisos.find(t => t.includes("repetido")) || "";
    confere("repetidos contados uma vez", repetidos.totais.disponivel === 2, repetidos.totais);
    confere("aviso diz quais e em que linhas", avisoRepetidos.includes("2 patrimônio(s)") && avisoRepetidos.includes("WAE18R001 (linhas 2 e 4)") && avisoRepetidos.includes("WTE14046 (linhas 3, 5 e 6)"), avisoRepetidos);

    ctx.__l = [["Patrimônio", "Status"], ["WAE18R001", "Disponível"], ["WAE18R001", "Disponível"]];
    const deslocado = vm.runInContext("resumirEstoque(__l, 'x.xlsx', 4)", ctx);
    confere("planilha que começa mais abaixo aponta a linha do Excel", deslocado.avisos.some(t => t.includes("WAE18R001 (linhas 5 e 6)")), deslocado.avisos);

    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exitCode = falhas ? 1 : 0;

})().catch(e => { console.error(e); process.exit(1); });
