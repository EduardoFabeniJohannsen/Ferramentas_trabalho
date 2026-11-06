const fs = require("fs");
const path = require("path");
const vm = require("vm");
const raiz = path.resolve(__dirname, "..", "site");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(raiz + "/js/agenda/agenda-utils.js", "utf8"), ctx);

const casos = [
    ["Rua B, 200, Centro, Brusque/SC", "Brusque/SC"],
    ["Rua A, 100, Fazenda, Itajaí/SC", "Itajaí/SC"],
    ["Rua C, 10 - Centro, São Paulo - SP, 01234-567", "São Paulo/SP"],
    ["Rua C, 10 - Centro - Curitiba - PR", "Curitiba/PR"],
    ["Rua D 5, Embu-Guaçu/SP", "Embu-Guaçu/SP"],
    ["Rua D 5, Embu-Guaçu-SP", "Embu-Guaçu/SP"],
    ["Av. Brasil, 100, Balneário Camboriú, SC", "Balneário Camboriú/SC"],
    ["Rodovia SC-412, km 5, Itajaí/SC", "Itajaí/SC"],
    ["Rodovia BR-101, km 5", ""],
    ["Rodovia SC-412, km 5", ""],
    ["rua x, 1, joinville/sc", "joinville/SC"],
    ["Rua A, 100, SC", ""],
    ["Rua A, 100, Centro", ""],
    ["Rua Sergipe, 100, Itajaí - SC - Brasil", "Itajaí/SC"],
    ["", ""],
    [null, ""]
];

let falhas = 0;
casos.forEach(([entrada, esperado]) => {
    const obtido = ctx.cidadeDoEndereco(entrada);
    const ok = obtido === esperado;
    if(!ok) falhas++;
    console.log((ok ? "ok   " : "FALHA"), JSON.stringify(entrada), "->", JSON.stringify(obtido), ok ? "" : "esperado " + JSON.stringify(esperado));
});
console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exitCode = falhas ? 1 : 0;
