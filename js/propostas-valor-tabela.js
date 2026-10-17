// ======================================
// PROPOSTAS - VALOR DE TABELA
// ======================================
// Busca o valor de tabela de cada equipamento para o período.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// PREENCHER VALOR TABELA
// ======================================

function preencherValorTabela() {

    const periodo =
        $("periodo")?.value.trim();

    const diasNumero = Number(periodo);

    let diasBusca = periodo;

    if (
        diasNumero > 30 &&
        diasNumero % 30 === 0
    ) {
        diasBusca = "30";
    }

    const diasValidos = [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "10",
        "14",
        "15",
        "21",
        "28",
        "30"
    ];

    const periodoValido =
        periodo &&
        diasValidos.includes(diasBusca);

    // Usa obterEquipamentos(), a mesma fonte usada por
    // gerarTextos() e mostrarFretes(), pra que TODA linha
    // de equipamento (fixa ou adicionada com "+") entre
    // no cálculo aqui também.

    const equipamentos =
        obterEquipamentos();

    const dadosPorEquipamento =
        equipamentos.map((equipamento) => {

            // tabela não carregou: mostra o motivo real
            if (erroTabelaPrecos) {

                return {
                    ...equipamento,
                    valorTabela: null,
                    erro: erroTabelaPrecos
                };
            }

            if (!periodoValido) {

                return {
                    ...equipamento,
                    valorTabela: null,
                    erro: "Informe um período válido"
                };
            }

            const tabelaModelo =
                tabelaPrecos[equipamento.modelo];

            if (!tabelaModelo) {

                return {
                    ...equipamento,
                    valorTabela: null,
                    erro: `Modelo ${equipamento.modelo} não encontrado`
                };
            }

            const valorUnitario =
                tabelaModelo[diasBusca];

            if (
                valorUnitario === undefined ||
                valorUnitario === null ||
                isNaN(valorUnitario)
            ) {

                return {
                    ...equipamento,
                    valorTabela: null,
                    erro: `Período ${diasBusca} dias não encontrado para ${equipamento.modelo}`
                };
            }

            return {
                ...equipamento,
                valorTabela: valorUnitario * equipamento.quantidade,
                erro: null
            };
        });

    renderizarDescontosPorEquipamento(
        dadosPorEquipamento
    );
}
