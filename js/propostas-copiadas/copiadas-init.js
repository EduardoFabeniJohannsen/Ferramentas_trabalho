// ======================================
// PROPOSTAS ZAP COPIADAS - INIT
// ======================================
// Ligações iniciais e a primeira carga. Sempre o ÚLTIMO script da página. Quem não tem o acesso "propostas-copiadas" (marcado no Admin) já foi mandado embora pelo auth-guard.js.

(function init(){

    // busca, selects, desconto e datas: todos avisam pelo "input"
    IDS_FILTROS_PROPOSTAS.forEach(id => {

        $(id).addEventListener("input", desenharPropostasAdmin);
    });

    carregarPropostasAdmin();

})();
