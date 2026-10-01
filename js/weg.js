// ======================================
// CONTRATO WEG
// ======================================

const contratoWEG = {

    // dias de cada período (1 período = 30 dias)
    periodoDias: 30,

    // a partir de quantos períodos o frete é bonificado
    periodosFreteBonificado: 4,

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
// GERAR DOCUMENTO (área pra print)
// ======================================

function gerarDocumento() {

    const datas = obterDatas();

    const frete = brToNumber($("valorFrete").value);

    const periodos = obterPeriodos();

    const diasTotal = contratoWEG.periodoDias * periodos;

    // 4 períodos ou mais: frete bonificado (não entra no total)
    const freteBonificado =
        periodos >= contratoWEG.periodosFreteBonificado;

    // frete digitado errado (ex: letras): avisa em vez de mostrar R$ NaN
    // (bonificado ignora o frete, então não precisa validar)
    const freteInvalido =
        !freteBonificado && !Number.isFinite(frete);

    $("valorFrete").style.borderColor =
        freteInvalido ? "#ef4444" : "";

    const complementar =
        (freteBonificado || freteInvalido) ? 0 : frete * 2 * 1.2;

    let valorLocacao = 0;

    let linhasTabela = "";

    contratoWEG.itens.forEach((item, index) => {

        const quantidade = obterQuantidade(item.modelo);

        const selecionado = quantidade > 0;

        if (selecionado) {

            valorLocacao += item.preco * quantidade * periodos;
        }

        linhasTabela += `
            <tr class="${selecionado ? "linha-selecionada" : ""}">
                <td>${index + 1}</td>
                <td>${item.descricao}</td>
                <td><strong>${item.modelo}</strong></td>
                <td>${selecionado ? quantidade + "x" : ""}</td>
                <td>R$ ${formatarMoedaBR(item.preco)}</td>
            </tr>
        `;
    });

    const total = valorLocacao + complementar;

    const periodoTexto =
        periodos > 1
            ? `${periodos} períodos = ${diasTotal} dias`
            : `${diasTotal} dias`;

    const periodoHtml = datas
        ? `${formatarData(datas.inicio)} a ${formatarData(datas.final)} (${periodoTexto})`
        : "—";

    const linhaFrete = freteBonificado
        ? `
        <div class="resumo-linha bonificado">
            <span>Locação complementar (frete)</span>
            <span>BONIFICADO</span>
        </div>
        `
        : `
        <div class="resumo-linha">
            <span>Locação complementar (frete)</span>
            <span>${freteInvalido ? "Frete inválido" : "R$ " + formatarMoedaBR(complementar)}</span>
        </div>
        `;

    $("documentoProposta").innerHTML = `

        <h3>Locação de Equipamentos</h3>
        <div class="subtitulo">Lista de Preços Unitários</div>

        <table>
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Descrição</th>
                    <th>COD</th>
                    <th>Qtd</th>
                    <th>Valor Unitário</th>
                </tr>
            </thead>
            <tbody>
                ${linhasTabela}
            </tbody>
        </table>

        <div class="resumo-linha">
            <span>Período</span>
            <span>${periodoHtml}</span>
        </div>

        <div class="resumo-linha">
            <span>Valor locação</span>
            <span>R$ ${formatarMoedaBR(valorLocacao)}</span>
        </div>

        ${linhaFrete}

        <div class="resumo-linha total">
            <span>Total</span>
            <span>${freteInvalido ? "—" : "R$ " + formatarMoedaBR(total)}</span>
        </div>

        <div class="perguntas">
            <strong>Para confirmação de Locação enviar:</strong>
            CNPJ DE FATURAMENTO:<br>
            DATA DA NECESSIDADE:<br>
            PRÉDIO E SETOR QUE A MAQUINA VAI FICAR:<br>
            RESPONSAVEL PELO RECEBIMENTO:
        </div>
    `;
}


// ======================================
// INIT
// ======================================

(function init() {

    montarListaEquipamentos();

    gerarDocumento();

    document
        .querySelectorAll(".quantidadeEquipamento")
        .forEach((input) => {

            input.addEventListener(
                "input",
                gerarDocumento
            );
        });

    $("dataInicio").addEventListener(
        "input",
        gerarDocumento
    );

    $("valorFrete").addEventListener(
        "input",
        gerarDocumento
    );

    $("periodos").addEventListener(
        "input",
        gerarDocumento
    );

    // períodos inválido (vazio, 0, negativo) volta pra 1 ao sair do campo
    $("periodos").addEventListener(
        "blur",
        () => {

            $("periodos").value = obterPeriodos();

            gerarDocumento();
        }
    );

})();