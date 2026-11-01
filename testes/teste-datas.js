// Datas do helpers.js, no fuso de São Paulo: o dia não pode mudar por causa do fuso.
process.env.TZ = "America/Sao_Paulo";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const raiz = path.resolve(__dirname, "..");

const ctx = { document: { querySelectorAll: () => [] } };
vm.createContext(ctx);

vm.runInContext(fs.readFileSync(path.join(raiz, "js/helpers.js"), "utf8"), ctx);

let falhas = 0;

const confere = (expressao, esperado) => {

    const obtido = vm.runInContext(expressao, ctx);
    const ok = obtido === esperado;

    if(!ok) falhas++;

    console.log(ok ? "ok   " : "FALHA", expressao, "->", JSON.stringify(obtido), ok ? "" : "esperado " + JSON.stringify(esperado));
};

// dataBR: texto para texto, sem passar por Date
confere(`dataBR("2026-10-31")`, "31/10/2026");
confere(`dataBR("2026-01-01")`, "01/01/2026");
confere(`dataBR("2000-05-31T23:00:00")`, "31/05/2000");
confere(`dataBR("")`, "");
confere(`dataBR(null)`, "");
confere(`dataBR(undefined)`, "");
confere(`dataBR("sem traços")`, "");

// dataHoraBR: o banco grava em UTC e a tela mostra no horário local
confere(`dataHoraBR("2026-10-31T17:30:00Z")`, "31/10/2026 14:30");
confere(`dataHoraBR("2026-11-01T02:30:00Z")`, "31/10/2026 23:30");
confere(`dataHoraBR("2026-01-05T11:05:00-03:00")`, "05/01/2026 11:05");
confere(`dataHoraBR("inválida")`, "");
confere(`dataHoraBR(undefined)`, "");

// formatarData, usada para o dia e o mês no Zap
confere(`formatarData(new Date(2026, 0, 5))`, "05/01/2026");
confere(`formatarData(new Date(2026, 0, 5)).slice(0, 5)`, "05/01");

// dataISO: com o relógio parado nas horas em que o fuso muda o dia
const relogio = (...agora) => vm.runInContext(`
    Date = class extends DataVerdadeira {
        constructor(...a){ if(a.length){ super(...a); }else{ super(${agora.join(", ")}); } }
    };
`, ctx);

vm.runInContext("const DataVerdadeira = Date;", ctx);

relogio(2026, 9, 31, 23, 30);
confere(`dataISO(0)`, "2026-10-31");
confere(`dataISO(1)`, "2026-11-01");
confere(`dataISO(-31)`, "2026-09-30");

relogio(2026, 11, 31, 22, 0);
confere(`dataISO(1)`, "2027-01-01");

relogio(2028, 1, 28, 12, 0);
confere(`dataISO(1)`, "2028-02-29");

relogio(2026, 2, 1, 0, 5);
confere(`dataISO(0)`, "2026-03-01");
confere(`dataISO(-1)`, "2026-02-28");

console.log(falhas ? `${falhas} falha(s)` : "todos ok");
process.exit(falhas ? 1 : 0);
