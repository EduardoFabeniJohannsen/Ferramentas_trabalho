// ======================================
// ANÁLISE DE FRETES - INIT
// ======================================
// Monta os filtros (últimos 30 dias) e faz a primeira busca. Sempre o ÚLTIMO script da página. Quem não tem o acesso já foi mandado embora pelo auth-guard.js.

(function init(){

    prepararFiltrosAnalise();

    carregarAnaliseFretes();

})();
