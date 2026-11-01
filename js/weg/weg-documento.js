// ======================================
// WEG - DOCUMENTO
// ======================================
// gerarDocumento(): área para print.
// (Arquivo gerado da divisão dos arquivos grandes; ver ARQUIVOS.md.)

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

    // soma de 1 período (preço x quantidade) e total de unidades escolhidas
    let valorPorPeriodo = 0;

    let totalUnidades = 0;

    let linhasTabela = "";

    // Só os equipamentos com quantidade (0 não aparece no print).
    // Agrupa por tipo de equipamento e numera na ordem exibida (1, 2, 3...)
    const itensOrdenados =
        contratoWEG.itens
            .filter((item) => obterQuantidade(item.modelo) > 0)
            .sort((a, b) => ordemDoGrupo(a.modelo) - ordemDoGrupo(b.modelo));

    if (!itensOrdenados.length) {

        linhasTabela = `
            <tr>
                <td colspan="5" style="text-align:center; color:#64748b;">
                    Nenhum equipamento selecionado
                </td>
            </tr>
        `;
    }

    let grupoAnterior = null;

    itensOrdenados.forEach((item, posicao) => {

        const grupo = grupoDoModelo(item.modelo);

        // linha em branco entre um grupo e outro
        if (grupoAnterior !== null && grupo !== grupoAnterior) {

            linhasTabela += `
            <tr class="separador-grupo">
                <td colspan="5"></td>
            </tr>
            `;
        }

        grupoAnterior = grupo;

        const quantidade = obterQuantidade(item.modelo);

        const selecionado = quantidade > 0;

        if (selecionado) {

            valorLocacao += item.preco * quantidade * periodos;

            valorPorPeriodo += item.preco * quantidade;

            totalUnidades += quantidade;
        }

        linhasTabela += `
            <tr class="${selecionado ? "linha-selecionada" : ""}">
                <td>${posicao + 1}</td>
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

    // de qual filial é o frete: W Rental Itajaí x WEG <unidade>
    const rotuloFrete = `
            <span>
                Locação complementar (frete)
                <span class="rota-frete">${textoRotaFrete()}</span>
            </span>`;

    const linhaFrete = freteBonificado
        ? `
        <div class="resumo-linha bonificado">
            ${rotuloFrete}
            <span>BONIFICADO</span>
        </div>
        `
        : `
        <div class="resumo-linha">
            ${rotuloFrete}
            <span>${freteInvalido ? "Frete inválido" : "R$ " + formatarMoedaBR(complementar)}</span>
        </div>
        `;

    // 2+ equipamentos por mais de 1 período: mostra também o valor
    // de cada período, pra o total não parecer maior do que é
    const linhaValorPeriodo =
        (totalUnidades >= 2 && periodos > 1)
            ? `
        <div class="resumo-linha">
            <span>Valor por período (30 dias)</span>
            <span>R$ ${formatarMoedaBR(valorPorPeriodo)}</span>
        </div>
        `
            : "";

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

        ${linhaValorPeriodo}

        <div class="resumo-linha">
            <span>Valor locação</span>
            <span>R$ ${formatarMoedaBR(valorLocacao)}</span>
        </div>

        ${linhaFrete}

        <div class="resumo-linha total">
            <span>Total</span>
            <span>${freteInvalido ? "—" : "R$ " + formatarMoedaBR(total)}</span>
        </div>
    `;
}
