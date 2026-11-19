// ======================================
// ANÁLISE DE MOVIMENTAÇÕES - INIT
// ======================================
// Monta os filtros (últimos 30 dias) e faz a primeira busca. Sempre o ÚLTIMO script da página. Quem não é admin já foi mandado embora pelo auth-guard.js.

(function init(){

    prepararFiltrosMovimentos();

    carregarAnaliseMovimentos();

})();
