// Liga o .githooks/pre-commit neste clone: roda sozinho no `npm install` (script
// "prepare" do package.json). Fora de um repositório Git (projeto baixado em .zip)
// não faz nada.
const { execSync } = require("child_process");

try{
    execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
}catch(erro){
    // sem Git: segue sem o pre-commit
}
