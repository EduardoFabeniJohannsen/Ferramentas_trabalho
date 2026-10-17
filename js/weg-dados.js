// ======================================
// WEG - DADOS E FORMULÁRIO
// ======================================
// contratoWEG, lista de equipamentos, períodos, datas e grupos.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

// ======================================
// CONTRATO WEG
// ======================================

const contratoWEG = {

    // dias de cada período (1 período = 30 dias)
    periodoDias: 30,

    // a partir de quantos períodos o frete é bonificado
    periodosFreteBonificado: 4,

    // ordem dos grupos no documento (2ª e 3ª letra do modelo:
    // ME = mastro, TE = tesoura, AD = articulada diesel, AE = articulada elétrica)
    ordemGrupos: ["ME", "TE", "AD", "AE"],

    itens: [
        { modelo: "WME10", descricao: "MASTRO ELÉTRICO 10M", preco: 5820 },
        { modelo: "WAE12", descricao: "ARTICULADA ELÉTRICA 12M", preco: 8970 },
        { modelo: "WTE10", descricao: "TESOURA ELÉTRICA 10M", preco: 2900 },
        { modelo: "WTE12", descricao: "TESOURA ELÉTRICA 12M", preco: 3990 },
        { modelo: "WAD16", descricao: "ARTICULADA DIESEL 16M", preco: 11980 },
        { modelo: "WAE15", descricao: "ARTICULADA ELÉTRICA 15M", preco: 11100 }
    ]

};


// ======================================
// MONTAR LISTA DE EQUIPAMENTOS (formulário)
// ======================================

function montarListaEquipamentos() {

    const lista = $("listaEquipamentosWEG");

    let html = "";

    contratoWEG.itens.forEach((item) => {

        html += `
            <div class="agendamento-linha">
                <label>${item.modelo}</label>
                <span style="flex:1; color:#94a3b8;">
                    R$ ${formatarMoedaBR(item.preco)}
                </span>
                <input
                    type="number"
                    class="quantidadeEquipamento"
                    id="qtd-${item.modelo}"
                    value="0"
                    min="0"
                    style="width:60px; flex:none; text-align:center; margin:0;"
                >
            </div>
        `;
    });

    lista.innerHTML = html;
}


// ======================================
// QUANTIDADE POR MODELO
// ======================================

function obterQuantidade(modelo) {

    const input = $(`qtd-${modelo}`);

    return Number(input?.value || 0);
}


// ======================================
// PERÍODOS
// ======================================
// Quantidade de períodos de 30 dias (mínimo 1).

function obterPeriodos() {

    const numero = parseInt($("periodos")?.value, 10);

    if (!Number.isFinite(numero) || numero < 1) return 1;

    return numero;
}


// ======================================
// DATAS
// ======================================

function obterDatas() {

    const valor = $("dataInicio").value;

    if (!valor) return null;

    const [ano, mes, dia] = valor.split("-").map(Number);

    const inicio = new Date(ano, mes - 1, dia);

    const final = new Date(inicio);

    final.setDate(
        final.getDate() + (contratoWEG.periodoDias * obterPeriodos() - 1)
    );

    return {
        inicio: inicio,
        final: final
    };
}


// ======================================
// GRUPOS (tipo de equipamento)
// ======================================

function grupoDoModelo(modelo) {

    return modelo.slice(1, 3);
}


// modelo de grupo fora da lista vai pro final
function ordemDoGrupo(modelo) {

    const posicao =
        contratoWEG.ordemGrupos.indexOf(grupoDoModelo(modelo));

    return posicao === -1 ? 999 : posicao;
}
