// ======================================
// MINHAS ENTREGAS - INIT
// ======================================
// Sempre o ÚLTIMO script da página. Quem não tem o acesso "motorista" (nem é admin) já foi mandado embora pelo auth-guard.js. O admin ganha o "Ver como o motorista".

(async function init(){

    desenharMotorista();

    adminNaPaginaMotorista = await ehAdmin();

    if(adminNaPaginaMotorista) await prepararVerComoMotorista();

    iniciarRecargaMotorista();

    await carregarEntregasMotorista();

})();
