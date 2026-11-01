const fs = require("fs");
const vm = require("vm");
const path = require("path");
const raiz = path.resolve(__dirname, "..");

let falhas = 0;
const confere = (nome, ok, extra) => {
    if(!ok) falhas++;
    console.log(ok ? "ok   " : "FALHA", nome, extra !== undefined ? "-> " + JSON.stringify(extra) : "");
};

(async () => {

    const ctx = { document: { querySelectorAll: () => [] } };
    vm.createContext(ctx);
    for(const f of ["helpers.js", "estoque-config.js", "estoque-parser.js"]){
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
    confere("sem aviso com a coluna Marca", comMarca.avisos.length === 0, comMarca.avisos);
    confere("previsão continua", comMarca.status.locado.WTE14[0].r === "05/11/2026");

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

    console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exitCode = falhas ? 1 : 0;

})().catch(e => { console.error(e); process.exit(1); });
