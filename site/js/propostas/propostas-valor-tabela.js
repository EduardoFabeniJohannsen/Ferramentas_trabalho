// ======================================
// PROPOSTAS - VALOR DE TABELA
// ======================================
// Período da proposta (campos Período e Períodos) e busca do valor de tabela de cada equipamento.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// PERÍODO DA PROPOSTA
// ======================================
// Lê os campos Período e Períodos e devolve tudo que os
// cálculos e textos precisam, num lugar só:
// - Períodos vazio (ou 1): acima de 30 e múltiplo de 30 vira
//   N períodos de 30 dias (60 = 2 períodos); o resto usa os
//   dias digitados.
// - Períodos 2 ou mais: o Período vale como os dias de cada
//   período (28 + 3 = 3 períodos de 28 dias) e precisa ser um
//   período da tabela.

const DIAS_VALIDOS_PROPOSTA = [
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


function obterPeriodoProposta(){

    const periodo =
        $("periodo")?.value.trim() || "";

    const periodosDigitado =
        parseInt($("periodos")?.value, 10);

    // vazio, 0 ou inválido = 1 período
    const periodosCampo =
        (
            Number.isFinite(periodosDigitado) &&
            periodosDigitado > 1
        )
            ? periodosDigitado
            : 1;

    const diasNumero = Number(periodo);

    // dias usados pra buscar o preço na tabela
    let diasBusca = periodo;

    let multiplicador = 1;

    let erro = "";

    if(periodosCampo > 1){

        multiplicador = periodosCampo;

        if(
            periodo &&
            !DIAS_VALIDOS_PROPOSTA.includes(periodo)
        ){

            erro =
                "Com Períodos, use um período da tabela (1 a 30 dias)";
        }

    }else if(
        diasNumero > 30 &&
        diasNumero % 30 === 0
    ){

        diasBusca = "30";

        multiplicador = diasNumero / 30;
    }

    const valido =
        !!periodo &&
        !erro &&
        DIAS_VALIDOS_PROPOSTA.includes(diasBusca);

    return {

        periodo: periodo,

        diasBusca: diasBusca,

        multiplicador: multiplicador,

        // quantidade digitada no campo Períodos (1 = vazio)
        periodosCampo: periodosCampo,

        // total de dias da locação (28 + 3 = 84; 60 = 60)
        diasTotal:
            periodosCampo > 1
                ? diasNumero * periodosCampo
                : diasNumero,

        valido: valido,

        erro: erro
    };
}


// ======================================
// PREENCHER VALOR TABELA
// ======================================

function preencherValorTabela() {

    const infoPeriodo =
        obterPeriodoProposta();

    const diasBusca =
        infoPeriodo.diasBusca;

    const periodoValido =
        infoPeriodo.valido;

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
                    erro: infoPeriodo.erro || "Informe um período válido"
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
